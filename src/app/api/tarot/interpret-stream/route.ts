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
import {
  callClaude as callSharedClaude,
  isClaudeAvailable,
  DEFAULT_CLAUDE_MODEL,
} from '@/lib/llm/claude'
import {
  buildFallbackPayload,
  buildInterpretStreamPrompts,
  buildChunkUserPrompt as buildChunkUserPromptShared,
} from '@/lib/tarot/promptBuild'
import { isDangerousQuestion, buildCrisisPayload } from '@/lib/tarot/safety'
import {
  applyCreditResultCookies,
  checkAndConsumeCredits,
  creditErrorResponse,
} from '@/lib/credits/withCredits'
import { refundCredits } from '@/lib/credits/creditRefund'

// Bumped 30→60s after Haiku→Sonnet 4.5 (PR #559): Sonnet generating the full
// tarot JSON for 3–5 cards regularly exceeded 30s under normal load, aborting
// the stream and surfacing the "예상보다 오래 걸리고 있어요" loop on the client.
const OPENAI_TIMEOUT_MS = 60000

// Spreads with >= this many cards fan out to two parallel Claude calls
// (chunk A + chunk B), so they cost ~2x compute and are charged 2 credits.
const LARGE_SPREAD_THRESHOLD = 8

// Credit cost for a reading: large spreads cost 2, everything else 1.
// Guests use a free cookie counter where this amount is ignored.
function readingCreditCost(cardCount: number): number {
  return cardCount >= LARGE_SPREAD_THRESHOLD ? 2 : 1
}

// 두 LLM (Claude → OpenAI) 모두 실패해서 generic fallback 으로 떨어질 때 호출.
// 로그인 사용자의 차감된 크레딧을 같은 counter (chargedAs) 로 복구한다.
// guest (userId 없음) 는 cookie 카운터라 환불 대상에서 제외 — 별도 정책 필요 시 후속.
async function refundOnAllLlmFailure(
  creditResult: Awaited<ReturnType<typeof checkAndConsumeCredits>> | null,
  reason: string,
  amount: number,
  errorMessage?: string
) {
  if (!creditResult?.userId || !creditResult.chargedAs) return
  try {
    await refundCredits({
      userId: creditResult.userId,
      creditType: creditResult.chargedAs,
      amount,
      reason,
      apiRoute: '/api/tarot/interpret-stream',
      errorMessage,
    })
  } catch (refundErr) {
    // 환불 실패가 응답을 막아선 안 된다. 로그로만 남기고 사용자에게는 fallback 응답.
    logger.error('[interpret-stream] refund failed', {
      refundErr: refundErr instanceof Error ? refundErr.message : String(refundErr),
      reason,
      userId: creditResult.userId,
    })
  }
}

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

// 옛 analyzeQuestionMood / previousReadings 는 system prompt 의 Step 0 가 이미
// subject/object/timeframe/intent 를 추출하므로 중복 noise — 제거됨.

export async function POST(req: NextRequest) {
  let creditResult: Awaited<ReturnType<typeof checkAndConsumeCredits>> | null = null
  let creditCost = 1

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

    // Parse and validate the body BEFORE charging credits so the credit
    // cost can reflect the spread size (and so invalid/oversized requests
    // never consume credits).
    const oversized = enforceBodySize(req, 256 * 1024)
    if (oversized) {
      return oversized
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

    // 안전 가드 — 자살/자해 등 위험 질문이 들어오면 AI 호출 없이 위기 페이로드만
    // 즉시 응답하고 크레딧도 차감하지 않는다. questionEngineV2 추천 단계의
    // 가드와 동일 키워드 셋을 공유 (src/lib/tarot/safety.ts).
    // 추천 흐름을 건너뛰고 바로 interpret-stream 으로 진입하는 케이스 보강.
    const safetyQuestion = (body.userQuestion || '').trim()
    const safetyLanguage: 'ko' | 'en' = body.language === 'en' ? 'en' : 'ko'
    if (safetyQuestion && isDangerousQuestion(safetyQuestion)) {
      logger.info('Tarot stream blocked by safety guard', {
        route: 'interpret-stream',
        cards: Array.isArray(body.cards) ? body.cards.length : 0,
      })
      const crisisPayload = buildCrisisPayload({
        language: safetyLanguage,
        cardCount: Array.isArray(body.cards) ? body.cards.length : 1,
      })
      return streamJsonPayload(crisisPayload, { 'X-Tarot-Safety': '1' })
    }

    creditCost = readingCreditCost(Array.isArray(body.cards) ? body.cards.length : 0)
    creditResult = await checkAndConsumeCredits('reading', creditCost, req)
    if (!creditResult.allowed) {
      return creditErrorResponse(creditResult)
    }

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

    logger.info('Tarot stream payload', {
      categoryId,
      spreadId,
      language,
      cards: rawCards.length,
      hasQuestion: Boolean(effectiveUserQuestion),
    })

    // 프롬프트 — 시스템 (rules + position naming + JSON schema) + 유저 (질문 +
    // 카드 리스트 + 지시) 모두 promptBuild 의 pure 빌더로 위임. 라우트 안에서는
    // I/O 만 다루고, 프롬프트 shape 는 단위 테스트로 lock.
    const { systemPrompt, userPrompt } = buildInterpretStreamPrompts({
      language,
      spreadTitle,
      cards: rawCards,
      userQuestion: effectiveUserQuestion,
    })

    // Claude 우선.
    //  - <8장: 단일 호출, 응답 전체를 SSE 단일 청크로 emit (기존 흐름)
    //  - >=8장: 카드를 둘로 나눠 병렬 2회 호출 후 JSON 머지 → 단일 청크 emit
    //          token 한계로 후반 카드 잘리던 문제 해결 + 같은 system prompt 재사용해 cache hit
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
            model: DEFAULT_CLAUDE_MODEL,
            maxTokens: 4000,
            temperature: 0.7,
            timeoutMs: OPENAI_TIMEOUT_MS,
            label: 'tarot-stream',
          })
          recordExternalCall(
            'anthropic',
            DEFAULT_CLAUDE_MODEL,
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
        ): string =>
          buildChunkUserPromptShared({
            language,
            spreadTitle,
            cards: rawCards,
            userQuestion: effectiveUserQuestion,
            startIdx,
            endIdx,
            includeMeta,
          })

        // Per-card token budget — 500 tokens / card + 500 base for chunks
        // carrying overall/advice. Previous 2400-flat ceiling left 15-card
        // spreads at ~244 tok/card on chunk A; Sonnet 4.5 supports much
        // more headroom so cap at 6000 per chunk.
        const chunkAcards = mid
        const chunkBcards = rawCards.length - mid
        const chunkAmaxTokens = Math.min(6000, 500 + chunkAcards * 500)
        const chunkBmaxTokens = Math.min(6000, chunkBcards * 500 + 200)

        const safeParse = (raw: string): Record<string, unknown> | null => {
          const match = raw.match(/\{[\s\S]*\}/)
          if (!match) return null
          try {
            return JSON.parse(match[0]) as Record<string, unknown>
          } catch {
            return null
          }
        }

        // Run one chunk; if the JSON doesn't parse, retry once. Chunk B's
        // failure used to silently drop half the cards into a static
        // fallback. Single retry keeps the same LLM path symmetric with
        // chunk A and avoids the "second half is canned text" surprise.
        const runChunkWithRetry = async (
          startIdx: number,
          endIdx: number,
          includeMeta: boolean,
          maxTokens: number,
          label: 'tarot-stream-chunkA' | 'tarot-stream-chunkB'
        ): Promise<{ text: string; parsed: Record<string, unknown> | null; retried: boolean }> => {
          const callOnce = () =>
            callSharedClaude({
              systemPrompt,
              userPrompt: buildChunkUserPrompt(startIdx, endIdx, includeMeta),
              model: DEFAULT_CLAUDE_MODEL,
              maxTokens,
              temperature: 0.7,
              timeoutMs: OPENAI_TIMEOUT_MS,
              label,
            })
          const first = await callOnce()
          const parsedFirst = safeParse(first.text)
          if (parsedFirst && (!includeMeta || Array.isArray(parsedFirst.cards))) {
            return { text: first.text, parsed: parsedFirst, retried: false }
          }
          logger.warn('Tarot stream chunk parse failed, retrying once', { label })
          const second = await callOnce()
          return { text: second.text, parsed: safeParse(second.text), retried: true }
        }

        logger.info('Tarot stream Claude request (parallel chunks)', {
          cards: rawCards.length,
          chunkA: `0-${mid}`,
          chunkB: `${mid}-${rawCards.length}`,
          chunkAmaxTokens,
          chunkBmaxTokens,
        })
        const [chunkA, chunkB] = await Promise.all([
          runChunkWithRetry(0, mid, true, chunkAmaxTokens, 'tarot-stream-chunkA'),
          runChunkWithRetry(mid, rawCards.length, false, chunkBmaxTokens, 'tarot-stream-chunkB'),
        ])
        recordExternalCall('anthropic', DEFAULT_CLAUDE_MODEL, 'success', Date.now() - claudeStartTime)

        // JSON 머지 — chunk A 의 overall/advice + chunk A.cards + chunk B.cards 를 합쳐 단일 JSON.
        const cardsA = Array.isArray(chunkA.parsed?.cards)
          ? (chunkA.parsed!.cards as unknown[])
          : []
        const cardsB = Array.isArray(chunkB.parsed?.cards)
          ? (chunkB.parsed!.cards as unknown[])
          : []
        const mergedCards = [...cardsA, ...cardsB]
        // 카드 수 부족 (chunk retry 까지 실패) 시 서버 측에서 fallback 으로 채운다.
        // 옛 흐름은 클라 parseStreamedInterpretation 이 부족분을 흡수했지만
        // 카드 절반만 보여 주고 "성공" 으로 보이는 케이스가 생겼다.
        let padded = false
        if (mergedCards.length < rawCards.length) {
          const fallback = buildFallbackPayload(rawCards, language)
          while (mergedCards.length < rawCards.length) {
            mergedCards.push(fallback.cards[mergedCards.length])
          }
          padded = true
        }
        const mergedJson = {
          overall:
            chunkA.parsed?.overall || buildFallbackPayload(rawCards, language).overall,
          cards: mergedCards,
          advice:
            chunkA.parsed?.advice || buildFallbackPayload(rawCards, language).advice,
        }
        const mergedText = JSON.stringify(mergedJson)
        logger.info('Tarot stream parallel chunks merged', {
          cards: rawCards.length,
          aCards: cardsA.length,
          bCards: cardsB.length,
          aParsed: chunkA.parsed !== null,
          bParsed: chunkB.parsed !== null,
          aRetried: chunkA.retried,
          bRetried: chunkB.retried,
          padded,
        })

        // padded === true 이면 한 청크가 retry 까지 실패해 절반 이상이
        // 결정론적 fallback 텍스트로 채워졌다는 뜻 — 사용자가 받은 가치는
        // 1 크레딧 미만이므로 charge 한 creditCost 를 전액 환불한다.
        // (응답 자체는 그대로 내려 클라이언트 UI 가 끊기지 않게 함.)
        if (padded) {
          await refundOnAllLlmFailure(
            creditResult,
            'tarot_partial_chunk_fallback',
            creditCost,
            'Chunk retry failed; deterministic fallback padded ≥1 card'
          )
        }

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
      await refundOnAllLlmFailure(
        creditResult,
        'tarot_llm_unavailable',
        creditCost,
        'Both Claude and OpenAI keys missing'
      )
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
      await refundOnAllLlmFailure(
        creditResult,
        'tarot_llm_unavailable',
        creditCost,
        `OpenAI fetch error: ${error instanceof Error ? error.message : String(error)}`
      )
      const fallback = buildFallbackPayload(rawCards, language)
      return withCreditCookies(streamJsonPayload(fallback, { 'X-Fallback': '1' }), creditResult)
    }
    clearTimeout(openaiTimeoutId)

    if (!openaiResponse.ok) {
      recordExternalCall('openai', 'gpt-4o-mini', 'error', Date.now() - openaiStartTime)
      const errorText = await openaiResponse.text()
      logger.error('OpenAI stream error:', { status: openaiResponse.status, error: errorText })
      logger.warn('Tarot stream emergency fallback')
      await refundOnAllLlmFailure(
        creditResult,
        'tarot_llm_unavailable',
        creditCost,
        `OpenAI ${openaiResponse.status}: ${errorText.substring(0, 200)}`
      )
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
