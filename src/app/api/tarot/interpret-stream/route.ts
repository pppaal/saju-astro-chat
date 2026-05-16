// src/app/api/tarot/interpret-stream/route.ts
// Tarot streaming interpretation — Claude Haiku 4.5 (single-chunk emit) with OpenAI streaming fallback.

import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { initializeApiContext, createPublicStreamGuard, extractLocale } from '@/lib/api/middleware'
import { createSSEEvent, createSSEDoneEvent } from '@/lib/streaming'
import { enforceBodySize } from '@/lib/http'
import { logger } from '@/lib/logger'
import { recordExternalCall } from '@/lib/metrics/index'
import { tarotInterpretStreamSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { callClaude as callSharedClaude, isClaudeAvailable } from '@/lib/llm/claude'
import { TAROT_RULES_KO, TAROT_RULES_EN } from '@/lib/tarot/promptShared'
import { getZodiacSign } from '@/lib/tarot/zodiacSign'
import {
  applyCreditResultCookies,
  checkAndConsumeCredits,
  creditErrorResponse,
} from '@/lib/credits/withCredits'

interface CardInput {
  name: string
  nameKo?: string
  isReversed: boolean
  position: string
  positionKo?: string
  positionMeaning?: string
  positionMeaningKo?: string
  keywords?: string[]
  keywordsKo?: string[]
}

const OPENAI_TIMEOUT_MS = 30000

function withCreditCookies(
  response: Response,
  creditResult: Awaited<ReturnType<typeof checkAndConsumeCredits>> | null
): Response {
  if (!creditResult?.guestReadingAccess) {
    return response
  }

  const nextResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })

  return applyCreditResultCookies(nextResponse, creditResult)
}

// Use centralized sanitizeString from @/lib/api/sanitizers

function buildFallbackPayload(
  cards: CardInput[],
  language: 'ko' | 'en'
): { overall: string; cards: { position: string; interpretation: string }[]; advice: string } {
  const isKorean = language === 'ko'
  const overall = isKorean
    ? '\uCE74\uB4DC\uC5D0\uC11C \uC804\uD574\uC9C0\uB294 \uD575\uC2EC \uBA54\uC2DC\uC9C0\uB97C \uC815\uB9AC\uD588\uC2B5\uB2C8\uB2E4.'
    : 'Here is the core message the cards are pointing to.'
  const advice = isKorean
    ? '\uC624\uB298 \uD560 \uC218 \uC788\uB294 \uC791\uC740 \uD589\uB3D9\uBD80\uD130 \uC2DC\uC791\uD574 \uBCF4\uC138\uC694.'
    : 'Start with one small, concrete step you can take today.'

  const cardsPayload = cards.map((card, index) => {
    const position =
      (isKorean && card.positionKo ? card.positionKo : card.position) || `Card ${index + 1}`
    const name = (isKorean && card.nameKo ? card.nameKo : card.name) || `Card ${index + 1}`
    const orientation = card.isReversed
      ? isKorean
        ? '\uC5ED\uBC29\uD5A5'
        : 'reversed'
      : isKorean
        ? '\uC815\uBC29\uD5A5'
        : 'upright'
    const interpretation = isKorean
      ? `${name} (${orientation}) \uCE74\uB4DC\uB294 \uD604\uC7AC \uC0C1\uD669\uC5D0\uC11C \uC911\uC694\uD55C \uD3EC\uC778\uD2B8\uB97C \uC9DA\uC5B4 \uC90D\uB2C8\uB2E4.`
      : `${name} (${orientation}) highlights a key point in your current situation.`
    return { position, interpretation }
  })

  return { overall, cards: cardsPayload, advice }
}

function streamJsonPayload(
  payload: {
    overall: string
    cards: { position: string; interpretation: string }[]
    advice: string
  },
  extraHeaders?: Record<string, string>
): Response {
  const encoder = new TextEncoder()
  const jsonText = JSON.stringify(payload)
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(createSSEEvent({ content: jsonText })))
      controller.enqueue(encoder.encode(createSSEDoneEvent()))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...(extraHeaders || {}),
    },
  })
}

// 별자리 계산 함수
// getZodiacSign / parseBirthMonthDay 는 @/lib/tarot/zodiacSign 으로 이전 (테스트 + 재사용).

// 옛 analyzeQuestionMood / previousReadings 는 system prompt 의 Step 0 가 이미
// subject/object/timeframe/intent 를 추출하므로 중복 noise — 제거됨.

export async function POST(req: NextRequest) {
  let creditResult: Awaited<ReturnType<typeof checkAndConsumeCredits>> | null = null

  try {
    // Apply middleware: rate limiting + public token auth
    const guardOptions = createPublicStreamGuard({
      route: 'tarot-interpret-stream',
      limit: 10,
      windowSeconds: 60,
    })

    const { context, error } = await initializeApiContext(req, guardOptions)
    if (error) {
      return error
    }

    logger.info('Tarot stream request', { ip: context.ip })

    creditResult = await checkAndConsumeCredits('reading', 1, req)
    if (!creditResult.allowed) {
      return creditErrorResponse(creditResult)
    }

    const oversized = enforceBodySize(req, 256 * 1024)
    if (oversized) {
      return withCreditCookies(oversized, creditResult)
    }

    const rawBody = await req.json()

    // Validate with Zod
    const validationResult = tarotInterpretStreamSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Tarot interpret-stream] validation failed', {
        errors: validationResult.error.issues,
      })
      return createValidationErrorResponse(validationResult.error, {
        locale: extractLocale(req),
        route: 'tarot/interpret-stream',
      })
    }

    const body = validationResult.data
    const categoryId = body.categoryId
    const spreadId = body.spreadId || ''
    const spreadTitle = body.spreadTitle || ''
    // Prefer body.language, fallback to context.locale, default to 'ko'
    const language: 'ko' | 'en' =
      body.language === 'en'
        ? 'en'
        : body.language === 'ko'
          ? 'ko'
          : context.locale === 'en'
            ? 'en'
            : 'ko'
    const rawCards = body.cards
    const userQuestion = (body.userQuestion || '').trim()
    const effectiveUserQuestion = userQuestion
    const includeAstrology = body.includeAstrology !== false
    const includeSaju = body.includeSaju !== false
    const birthdate = includeAstrology ? body.birthdate || '' : ''
    const sajuContext = includeSaju ? (body.sajuContext || '').trim() : ''
    const astroContext = includeAstrology ? (body.astroContext || '').trim() : ''

    logger.info('Tarot stream payload', {
      categoryId,
      spreadId,
      language,
      cards: rawCards.length,
      hasQuestion: Boolean(effectiveUserQuestion),
      hasBirthdate: Boolean(birthdate),
      includeAstrology,
      includeSaju,
      hasSajuContext: Boolean(sajuContext),
      hasAstroContext: Boolean(astroContext),
    })

    const isKorean = language === 'ko'
    // 자리 이름 + 자리 의미(있으면) 를 같이 LLM 에 보낸다 — interpret/route.ts 와 동일 포맷.
    const cardListText = rawCards
      .map((c, i) => {
        const name = isKorean && c.nameKo ? c.nameKo : c.name
        const pos = isKorean && c.positionKo ? c.positionKo : c.position
        const posMeaning = isKorean
          ? c.positionMeaningKo || c.positionMeaning
          : c.positionMeaning
        const keywords = (isKorean && c.keywordsKo ? c.keywordsKo : c.keywords) || []
        const seat = posMeaning ? `${pos} — ${posMeaning}` : pos
        return `${i + 1}. [${seat}] ${name}${c.isReversed ? '(역방향)' : ''} - ${keywords.slice(0, 3).join(', ')}`
      })
      .join('\n')

    const q = effectiveUserQuestion || (isKorean ? '일반 운세' : 'general reading')

    // 개인화 컨텍스트 — 사주/점성 등록 안 한 게스트라도 birthdate 만 있으면 별자리는 anchor 로 활용.
    // mood/previousReadings 는 LLM Step 0 가 더 잘 처리해서 제거됨.
    const zodiac = birthdate ? getZodiacSign(birthdate) : null
    const sections: string[] = []
    if (zodiac) {
      sections.push(
        isKorean
          ? `\n## 질문자 정보\n- 별자리: ${zodiac.signKo} (${zodiac.elementKo} 원소)\n`
          : `\n## Querent Info\n- Zodiac: ${zodiac.sign} (${zodiac.element} element)\n`
      )
    }
    if (astroContext) {
      sections.push(
        isKorean ? `\n## 점성 맥락\n${astroContext}\n` : `\n## Astrology Context\n${astroContext}\n`
      )
    }
    if (sajuContext) {
      sections.push(
        isKorean ? `\n## 사주 맥락\n${sajuContext}\n` : `\n## Saju Context\n${sajuContext}\n`
      )
    }
    const personalizationContext = sections.join('')

    // 시스템 프롬프트 — 100% 정적 (페르소나 + 4단계 + 스키마).
    // ${rawCards.length} 같은 인터폴레이션 *금지* — Anthropic prompt caching prefix 안정화.
    // 카드 수·자리명 등 동적 부분은 모두 user prompt 에서 명시.
    const systemPrompt = isKorean
      ? `${TAROT_RULES_KO}

출력 — 정확히 이 JSON 스키마 (코드펜스/주석/머리말 X):
{
  "overall": "오프닝 + 시너지, 400-600자, 첫 문장에 사용자 질문 직접 언급",
  "cards": [
    { "position": "자리명", "interpretation": "자리 × 카드 × 정/역 × 질문 4중 cross, 300-500자, 시간 앵커 포함" }
  ],
  "advice": "구체 행동 1-3개, 100-150자"
}`
      : `${TAROT_RULES_EN}

Output — exactly this JSON schema (no code fences, no preamble, no comments):
{
  "overall": "Opening + synergy, 250-350 words, first sentence references the question",
  "cards": [
    { "position": "seat name", "interpretation": "seat × card × orientation × question cross, 180-280 words, with a time anchor" }
  ],
  "advice": "1-3 concrete actions, 60-90 words"
}`


    // 유저 프롬프트 — 질문을 맨 위, 가장 눈에 띄게 배치
    const userPrompt = isKorean
      ? `# 사용자의 질문
"${q}"

# 스프레드
${spreadTitle} (${rawCards.length}장)

# 펼친 카드 (자리명 — 자리 의미)
${cardListText}
${personalizationContext}
# 작성 지시
- 모든 ${rawCards.length}장의 카드에 대해 cards[] 항목을 만드세요.
- 각 카드는 위 질문 맥락 안에서 해석합니다. 카드를 보고 사전식 정의를 쓰지 마세요.
- overall 의 첫 문장은 사용자의 질문을 직접 언급하면서 시작.${zodiac ? `\n- 별자리(${zodiac.signKo}, ${zodiac.elementKo} 원소) 자연스럽게 한 번만 연결.` : ''}${astroContext ? '\n- 점성 맥락도 해석에 cross.' : ''}${sajuContext ? '\n- 사주 맥락도 해석에 cross — 모든 카드에 anchor 1회 이상.' : ''}`
      : `# User's Question
"${q}"

# Spread
${spreadTitle} (${rawCards.length} cards)

# Cards Drawn (seat name — seat meaning)
${cardListText}
${personalizationContext}
# Instructions
- Produce cards[] entries for all ${rawCards.length} cards.
- Interpret each card *inside the user's question above*. No textbook definitions.
- The first sentence of overall must reference the user's question directly.${zodiac ? `\n- Mention ${zodiac.sign}'s ${zodiac.element} element naturally once.` : ''}${astroContext ? '\n- Cross with the astrology context.' : ''}${sajuContext ? '\n- Cross with the saju context — anchor in every card at least once.' : ''}`

    // Claude 우선.
    //  - <8장: 단일 호출, 응답 전체를 SSE 단일 청크로 emit (기존 흐름)
    //  - >=8장: 카드를 둘로 나눠 병렬 2회 호출 후 JSON 머지 → 단일 청크 emit
    //          token 한계로 후반 카드 잘리던 문제 해결 + 같은 system prompt 재사용해 cache hit
    const LARGE_SPREAD_THRESHOLD = 8
    if (isClaudeAvailable()) {
      const claudeStartTime = Date.now()
      const isLargeSpread = rawCards.length >= LARGE_SPREAD_THRESHOLD
      try {
        if (!isLargeSpread) {
          // 소형 스프레드 — 단일 호출
          logger.info('Tarot stream Claude request (single)', {
            cards: rawCards.length,
            systemLen: systemPrompt.length,
            userLen: userPrompt.length,
          })
          const claudeResult = await callSharedClaude({
            systemPrompt,
            userPrompt,
            maxTokens: 4000,
            temperature: 0.7,
            timeoutMs: OPENAI_TIMEOUT_MS,
            label: 'tarot-stream',
          })
          recordExternalCall(
            'anthropic',
            'claude-haiku-4-5',
            'success',
            Date.now() - claudeStartTime
          )
          const encoder = new TextEncoder()
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(createSSEEvent({ content: claudeResult.text })))
              controller.enqueue(encoder.encode(createSSEDoneEvent()))
              controller.close()
            },
          })
          return withCreditCookies(
            new NextResponse(stream, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
                'X-Accel-Buffering': 'no',
                'X-Provider': 'claude',
              },
            }),
            creditResult
          )
        }

        // 대형 스프레드 — chunk A (앞 절반 + overall + advice) || chunk B (뒤 절반 cards 만)
        const mid = Math.ceil(rawCards.length / 2)
        const buildChunkUserPrompt = (
          startIdx: number,
          endIdx: number,
          includeMeta: boolean
        ): string => {
          const chunkInfo = isKorean
            ? `(전체 ${rawCards.length}장 중 ${startIdx + 1}~${endIdx}번 카드만 해석)`
            : `(interpret only cards ${startIdx + 1}-${endIdx} of ${rawCards.length})`
          const task = includeMeta
            ? isKorean
              ? `# 작성 지시\n- 전체 카드 흐름을 보고 overall + advice 작성하고, ${chunkInfo} 의 카드별 cards[] 항목을 채우세요.\n- cards 배열 길이 정확히 ${endIdx - startIdx} 개.`
              : `# Instructions\n- Read the full ${rawCards.length}-card flow; write overall + advice, fill cards[] with per-card interpretations ${chunkInfo}.\n- cards[] length must be exactly ${endIdx - startIdx}.`
            : isKorean
              ? `# 작성 지시\n- 전체 카드 흐름은 컨텍스트로만 참고. ${chunkInfo} 의 카드별 해석만 cards[] 에 채우세요. overall/advice 는 출력하지 마세요.\n- cards 배열 길이 정확히 ${endIdx - startIdx} 개.`
              : `# Instructions\n- Use the full ${rawCards.length}-card flow as context only. Output ONLY per-card interpretations ${chunkInfo} in cards[]. Do NOT include overall/advice.\n- cards[] length must be exactly ${endIdx - startIdx}.`
          const personalizationLine = `${zodiac ? (isKorean ? `\n- 별자리(${zodiac.signKo}, ${zodiac.elementKo} 원소) 자연스럽게 한 번만 연결.` : `\n- Mention ${zodiac.sign}'s ${zodiac.element} element naturally once.`) : ''}${astroContext ? (isKorean ? '\n- 점성 맥락도 해석에 cross.' : '\n- Cross with the astrology context.') : ''}${sajuContext ? (isKorean ? '\n- 사주 맥락도 해석에 cross — 모든 카드에 anchor 1회 이상.' : '\n- Cross with the saju context — anchor in every card at least once.') : ''}`
          if (isKorean) {
            return `# 사용자의 질문\n"${q}"\n\n# 스프레드\n${spreadTitle} (${rawCards.length}장)\n\n# 펼친 카드 — 전체 (자리명 — 자리 의미)\n${cardListText}\n${personalizationContext}\n${task}${personalizationLine}`
          }
          return `# User's Question\n"${q}"\n\n# Spread\n${spreadTitle} (${rawCards.length} cards)\n\n# Cards Drawn — full list (seat — meaning)\n${cardListText}\n${personalizationContext}\n${task}${personalizationLine}`
        }

        logger.info('Tarot stream Claude request (parallel chunks)', {
          cards: rawCards.length,
          chunkA: `0-${mid}`,
          chunkB: `${mid}-${rawCards.length}`,
        })
        const [chunkA, chunkB] = await Promise.all([
          callSharedClaude({
            systemPrompt,
            userPrompt: buildChunkUserPrompt(0, mid, true),
            maxTokens: 2400,
            temperature: 0.7,
            timeoutMs: OPENAI_TIMEOUT_MS,
            label: 'tarot-stream-chunkA',
          }),
          callSharedClaude({
            systemPrompt,
            userPrompt: buildChunkUserPrompt(mid, rawCards.length, false),
            maxTokens: 2400,
            temperature: 0.7,
            timeoutMs: OPENAI_TIMEOUT_MS,
            label: 'tarot-stream-chunkB',
          }),
        ])
        recordExternalCall(
          'anthropic',
          'claude-haiku-4-5',
          'success',
          Date.now() - claudeStartTime
        )

        // JSON 머지 — chunk A 의 overall/advice + chunk A.cards + chunk B.cards 를 합쳐 단일 JSON.
        const safeParse = (raw: string): Record<string, unknown> | null => {
          const match = raw.match(/\{[\s\S]*\}/)
          if (!match) return null
          try {
            return JSON.parse(match[0]) as Record<string, unknown>
          } catch {
            return null
          }
        }
        const parsedA = safeParse(chunkA.text)
        const parsedB = safeParse(chunkB.text)
        const cardsA = Array.isArray(parsedA?.cards) ? (parsedA!.cards as unknown[]) : []
        const cardsB = Array.isArray(parsedB?.cards) ? (parsedB!.cards as unknown[]) : []
        const mergedJson = {
          overall: parsedA?.overall ?? '',
          cards: [...cardsA, ...cardsB],
          advice: parsedA?.advice ?? '',
        }
        // 만약 chunk B 파싱 실패 → mergedJson.cards 가 절반만 남음.
        // buildFallbackPayload 가 길이 맞춰 부족분 채우도록 클라이언트 측 parseStreamedInterpretation 이 처리함.
        const mergedText = JSON.stringify(mergedJson)
        logger.info('Tarot stream parallel chunks merged', {
          cards: rawCards.length,
          aCards: cardsA.length,
          bCards: cardsB.length,
          aParsed: parsedA !== null,
          bParsed: parsedB !== null,
        })

        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(createSSEEvent({ content: mergedText })))
            controller.enqueue(encoder.encode(createSSEDoneEvent()))
            controller.close()
          },
        })
        return withCreditCookies(
          new NextResponse(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache, no-transform',
              Connection: 'keep-alive',
              'X-Accel-Buffering': 'no',
              'X-Provider': 'claude',
              'X-Tarot-Strategy': 'parallel-chunks',
            },
          }),
          creditResult
        )
      } catch (claudeErr) {
        recordExternalCall('anthropic', 'claude-haiku-4-5', 'error', Date.now() - claudeStartTime)
        logger.warn('Tarot stream Claude failed, falling back to OpenAI', {
          error: claudeErr instanceof Error ? claudeErr.message : String(claudeErr),
          isLargeSpread,
        })
        // fall through to OpenAI streaming
      }
    }

    // OpenAI Streaming (fallback when Claude unavailable or failed)
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('Tarot stream missing both ANTHROPIC_API_KEY and OPENAI_API_KEY, using fallback')
      const fallback = buildFallbackPayload(rawCards, language)
      return withCreditCookies(streamJsonPayload(fallback, { 'X-Fallback': '1' }), creditResult)
    }

    const openaiController = new AbortController()
    const openaiTimeoutId = setTimeout(() => openaiController.abort(), OPENAI_TIMEOUT_MS)
    const openaiStartTime = Date.now()
    let openaiResponse: Response
    try {
      logger.info('Tarot stream OpenAI request', {
        model: 'gpt-4o-mini',
        systemLen: systemPrompt.length,
        userLen: userPrompt.length,
      })
      openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 8000,
          temperature: 0.75,
          stream: true,
          response_format: { type: 'json_object' },
        }),
        signal: openaiController.signal,
      })
    } catch (error) {
      clearTimeout(openaiTimeoutId)
      recordExternalCall('openai', 'gpt-4o-mini', 'error', Date.now() - openaiStartTime)
      logger.error('OpenAI stream fetch error:', { error })
      logger.warn('Tarot stream emergency fallback')
      const fallback = buildFallbackPayload(rawCards, language)
      return withCreditCookies(streamJsonPayload(fallback, { 'X-Fallback': '1' }), creditResult)
    }
    clearTimeout(openaiTimeoutId)

    if (!openaiResponse.ok) {
      recordExternalCall('openai', 'gpt-4o-mini', 'error', Date.now() - openaiStartTime)
      const errorText = await openaiResponse.text()
      logger.error('OpenAI stream error:', { status: openaiResponse.status, error: errorText })
      logger.warn('Tarot stream emergency fallback')
      const fallback = buildFallbackPayload(rawCards, language)
      return withCreditCookies(streamJsonPayload(fallback, { 'X-Fallback': '1' }), creditResult)
    }

    // SSE - 성공 메트릭스 기록 (스트리밍 시작 시점)
    recordExternalCall('openai', 'gpt-4o-mini', 'success', Date.now() - openaiStartTime)

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        const reader = openaiResponse.body?.getReader()
        logger.info('Tarot stream SSE start', { hasReader: Boolean(reader) })
        if (!reader) {
          const fallback = buildFallbackPayload(rawCards, language)
          controller.enqueue(encoder.encode(createSSEEvent({ content: JSON.stringify(fallback) })))
          controller.enqueue(encoder.encode(createSSEDoneEvent()))
          controller.close()
          return
        }

        let buffer = ''

        const handleLine = (line: string) => {
          if (!line.startsWith('data: ')) {
            return
          }
          const data = line.slice(6)
          if (data === '[DONE]') {
            controller.enqueue(encoder.encode(createSSEDoneEvent()))
            return
          }
          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              controller.enqueue(encoder.encode(createSSEEvent({ content })))
            }
          } catch (_parseErr) {
            logger.warn('[Tarot stream] Invalid JSON chunk skipped', {
              data: data.substring(0, 100),
            })
          }
        }

        let sawContent = false
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              break
            }

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!sawContent && line.startsWith('data: ')) {
                sawContent = true
                logger.info('Tarot stream first chunk')
              }
              handleLine(line)
            }
          }

          if (buffer.trim()) {
            handleLine(buffer)
          }
        } catch (error) {
          logger.error('Stream error:', { error: error })
          try {
            controller.enqueue(encoder.encode(createSSEEvent({ error: 'Stream interrupted' })))
          } catch {
            /* stream may already be closed */
          }
        } finally {
          logger.info('Tarot stream SSE finished', { sawContent })
          try {
            controller.close()
          } catch {
            /* already closed */
          }
        }
      },
    })

    return withCreditCookies(
      new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }),
      creditResult
    )
  } catch (err) {
    logger.error('Tarot stream error:', { error: err })
    return withCreditCookies(
      createErrorResponse({
        code: ErrorCodes.INTERNAL_ERROR,
        route: 'tarot/interpret-stream',
        originalError: err instanceof Error ? err : new Error(String(err)),
      }),
      creditResult
    )
  }
}
