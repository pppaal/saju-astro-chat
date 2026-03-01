// src/app/api/tarot/interpret/route.ts
// Premium Tarot Interpretation API using Hybrid RAG

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard } from '@/lib/api/middleware'
import { apiClient } from '@/lib/api/ApiClient'
import { prisma } from '@/lib/db/prisma'
import { captureServerError } from '@/lib/telemetry'
import { enforceBodySize, fetchWithRetry } from '@/lib/http'
import { checkAndConsumeCredits, creditErrorResponse } from '@/lib/credits/withCredits'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { tarotInterpretRequestSchema } from '@/lib/api/zodValidation'

interface CardInput {
  name: string
  nameKo?: string
  isReversed: boolean
  position: string
  positionKo?: string
  meaning?: string
  meaningKo?: string
  keywords?: string[]
  keywordsKo?: string[]
}

type ParsedTarotJson = {
  overall?: unknown
  cards?: unknown
  advice?: unknown
  combinations?: unknown
}

const MAX_CARD_MEANING_LENGTH = 500

function truncateToMax(value: unknown, maxLength: number): string | unknown {
  if (typeof value !== 'string') return value
  if (value.length <= maxLength) return value
  return value.slice(0, maxLength)
}

function normalizeInterpretRequestBody(rawBody: unknown): {
  body: unknown
  truncatedCount: number
} {
  if (!rawBody || typeof rawBody !== 'object') {
    return { body: rawBody, truncatedCount: 0 }
  }

  const source = rawBody as Record<string, unknown>
  if (!Array.isArray(source.cards)) {
    return { body: rawBody, truncatedCount: 0 }
  }

  let truncatedCount = 0
  const normalizedCards = source.cards.map((card) => {
    if (!card || typeof card !== 'object') {
      return card
    }

    const cardRecord = card as Record<string, unknown>
    const nextMeaning = truncateToMax(cardRecord.meaning, MAX_CARD_MEANING_LENGTH)
    const nextMeaningKo = truncateToMax(cardRecord.meaningKo, MAX_CARD_MEANING_LENGTH)

    if (typeof cardRecord.meaning === 'string' && cardRecord.meaning !== nextMeaning) {
      truncatedCount += 1
    }
    if (typeof cardRecord.meaningKo === 'string' && cardRecord.meaningKo !== nextMeaningKo) {
      truncatedCount += 1
    }

    return {
      ...cardRecord,
      meaning: nextMeaning,
      meaningKo: nextMeaningKo,
    }
  })

  return {
    body: {
      ...source,
      cards: normalizedCards,
    },
    truncatedCount,
  }
}

function stripMarkdownCodeFence(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return (fenceMatch?.[1] || raw).trim()
}

function extractJsonObjectSlice(raw: string): string | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) {
    return null
  }
  return raw.slice(start, end + 1)
}

function sanitizeJsonLikeText(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\/\/[^\n\r]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,\s*([}\]])/g, '$1')
}

function normalizeSingleQuoteJson(raw: string): string {
  return raw
    .replace(/([{,]\s*)'([^']+?)'\s*:/g, '$1"$2":')
    .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'(?=\s*[,}])/g, (_match, value: string) => {
      const normalized = value.replace(/"/g, '\\"')
      return `: "${normalized}"`
    })
}

function normalizeUnquotedKeysJson(raw: string): string {
  return raw.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*:)/g, '$1"$2"$3')
}

function tryParseJsonCandidate(raw: string): ParsedTarotJson | null {
  const attempts: string[] = []
  const fenced = stripMarkdownCodeFence(raw)
  const directSlice = extractJsonObjectSlice(raw)
  const fencedSlice = extractJsonObjectSlice(fenced)

  attempts.push(raw, fenced)
  if (directSlice) attempts.push(directSlice)
  if (fencedSlice) attempts.push(fencedSlice)

  const uniqueAttempts = Array.from(new Set(attempts.map((item) => item.trim()).filter(Boolean)))
  for (const candidate of uniqueAttempts) {
    try {
      const parsed = JSON.parse(candidate) as unknown
      if (parsed && typeof parsed === 'object') {
        return parsed as ParsedTarotJson
      }
    } catch {
      // continue
    }

    try {
      const sanitized = sanitizeJsonLikeText(candidate)
      const parsed = JSON.parse(sanitized) as unknown
      if (parsed && typeof parsed === 'object') {
        return parsed as ParsedTarotJson
      }
    } catch {
      // continue
    }

    try {
      const normalizedSingleQuote = normalizeSingleQuoteJson(sanitizeJsonLikeText(candidate))
      const parsed = JSON.parse(normalizedSingleQuote) as unknown
      if (parsed && typeof parsed === 'object') {
        return parsed as ParsedTarotJson
      }
    } catch {
      // continue
    }

    try {
      const normalizedUnquotedKeys = normalizeUnquotedKeysJson(
        normalizeSingleQuoteJson(sanitizeJsonLikeText(candidate))
      )
      const parsed = JSON.parse(normalizedUnquotedKeys) as unknown
      if (parsed && typeof parsed === 'object') {
        return parsed as ParsedTarotJson
      }
    } catch {
      // continue
    }
  }

  return null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

export const POST = withApiMiddleware(
  async (req: NextRequest, context) => {
    try {
      const oversized = enforceBodySize(req, 256 * 1024)
      if (oversized) {
        return oversized
      }

      let rawBody: unknown
      try {
        rawBody = await req.json()
      } catch (parseErr) {
        logger.warn('[Tarot interpret] invalid JSON request body', {
          error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        })
        return NextResponse.json(
          { error: 'invalid_json_body' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }
      const { body: normalizedBody, truncatedCount } = normalizeInterpretRequestBody(rawBody)
      if (truncatedCount > 0) {
        logger.info('[Tarot interpret] truncated oversized card meaning fields', {
          truncatedCount,
          max: MAX_CARD_MEANING_LENGTH,
        })
      }

      // Validate with Zod
      const validationResult = tarotInterpretRequestSchema.safeParse(normalizedBody)
      if (!validationResult.success) {
        logger.warn('[Tarot interpret] validation failed', {
          errors: validationResult.error.issues,
        })
        return NextResponse.json(
          {
            error: 'validation_failed',
            details: validationResult.error.issues.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      const {
        categoryId,
        spreadId,
        spreadTitle,
        cards: validatedCards,
        userQuestion,
        language = 'ko',
        birthdate,
        moonPhase,
        includeAstrology = true,
        includeSaju = true,
        sajuContext,
        astroContext,
      } = validationResult.data

      const creditResult = await checkAndConsumeCredits('reading', 1)
      if (!creditResult.allowed) {
        return creditErrorResponse(creditResult)
      }

      // Call Python backend for Hybrid RAG interpretation (with fallback on connection failure)
      let interpretation = null
      try {
        const response = await apiClient.post(
          '/api/tarot/interpret',
          {
            category: categoryId,
            spread_id: spreadId,
            spread_title: spreadTitle,
            cards: validatedCards.map((c) => ({
              name: c.name,
              is_reversed: c.isReversed,
              position: c.position,
            })),
            user_question: userQuestion,
            language,
            birthdate: includeAstrology ? birthdate : undefined,
            moon_phase: moonPhase,
            saju_context: includeSaju ? sajuContext : undefined,
            astro_context: includeAstrology ? astroContext : undefined,
          },
          { timeout: 20000 }
        )

        if (response.ok) {
          interpretation = response.data
        }
      } catch (fetchError) {
        logger.warn('Backend connection failed, using fallback:', fetchError)
      }

      // Use backend response or GPT fallback
      let result
      if (interpretation && !(interpretation as Record<string, unknown>).error) {
        result = interpretation
      } else {
        logger.warn('Backend unavailable, using GPT interpretation')
        result = await generateGPTInterpretation(
          validatedCards,
          spreadTitle,
          language,
          userQuestion,
          includeSaju ? sajuContext : undefined,
          includeAstrology ? astroContext : undefined
        )
      }

      // ======== 기록 저장 (로그인 사용자만) ========
      const session = context.session
      if (session?.user?.id) {
        try {
          await prisma.reading.create({
            data: {
              userId: session.user.id,
              type: 'tarot',
              title: `${spreadTitle} - ${validatedCards.map((c: CardInput) => c.nameKo || c.name).join(', ')}`,
              content: JSON.stringify({
                categoryId,
                spreadId,
                spreadTitle,
                cards: validatedCards.map((c: CardInput) => ({
                  name: c.name,
                  nameKo: c.nameKo,
                  isReversed: c.isReversed,
                  position: c.position,
                })),
                userQuestion,
              }),
            },
          })
        } catch (saveErr) {
          logger.warn('[Tarot API] Failed to save reading:', saveErr)
        }
      }

      return NextResponse.json(result)
    } catch (err: unknown) {
      captureServerError(err as Error, { route: '/api/tarot/interpret' })

      // Return fallback even on error
      logger.error('Tarot interpretation error:', err)
      return NextResponse.json(
        { error: 'Server error', fallback: true },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createPublicStreamGuard({
    route: 'tarot/interpret',
    limit: 10,
    windowSeconds: 60,
  })
)

// GPT-4o-mini API 호출 헬퍼 (속도 최적화)
async function callGPT(prompt: string, maxTokens = 400): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set')
  }

  const response = await fetchWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.75,
      }),
    },
    {
      maxRetries: 2,
      initialDelayMs: 700,
      maxDelayMs: 4000,
      timeoutMs: 30000,
      retryStatusCodes: [408, 409, 425, 429, 500, 502, 503, 504],
      onRetry: (attempt, error, delayMs) => {
        logger.warn('[Tarot interpret] OpenAI retry scheduled', {
          attempt,
          delayMs,
          reason: error.message,
        })
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`OpenAI API error: ${response.status} ${errorText.slice(0, 280)}`)
  }

  let data: { choices?: Array<{ message?: { content?: string } }> } | null = null
  try {
    data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  } catch (parseErr) {
    const rawText = await response.text().catch(() => '')
    try {
      data = JSON.parse(rawText) as { choices?: Array<{ message?: { content?: string } }> }
    } catch {
      logger.warn('[Tarot interpret] OpenAI JSON parse failed', {
        error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        preview: rawText.slice(0, 280),
      })
      throw new Error('OpenAI response parse failed')
    }
  }

  return data?.choices?.[0]?.message?.content || ''
}

// GPT를 사용한 해석 생성 (백엔드 없이 직접 호출) - 통합 프롬프트로 속도 최적화
async function generateGPTInterpretation(
  cards: CardInput[],
  spreadTitle: string,
  language: string,
  userQuestion?: string,
  sajuContext?: string,
  astroContext?: string
) {
  const isKorean = language === 'ko'

  // 위치별 카드 정보
  const cardListText = cards
    .map((c, i) => {
      const name = isKorean && c.nameKo ? c.nameKo : c.name
      const pos = isKorean && c.positionKo ? c.positionKo : c.position
      const keywords = (isKorean && c.keywordsKo ? c.keywordsKo : c.keywords) || []
      return `${i + 1}. [${pos}] ${name}${c.isReversed ? '(역방향)' : ''} - ${keywords.slice(0, 3).join(', ')}`
    })
    .join('\n')

  let q = userQuestion || (isKorean ? '일반 운세' : 'general reading')
  const contextBlock = [sajuContext, astroContext].filter(Boolean).join('\n')
  if (contextBlock) {
    q = `${q}\n${contextBlock}`
  }

  // 카드 개수에 맞춘 JSON 예시 생성
  const cardExamples = cards
    .map((c, i) => {
      const pos = isKorean && c.positionKo ? c.positionKo : c.position
      const ordinal = isKorean
        ? `${i + 1}번째`
        : i === 0
          ? 'First'
          : i === 1
            ? 'Second'
            : i === 2
              ? 'Third'
              : `${i + 1}th`
      return isKorean
        ? `    {
      "position": "${pos}",
      "interpretation": "${ordinal} 카드 해석 (700-1000자, 위와 동일한 형식)"
    }`
        : `    {
      "position": "${pos}",
      "interpretation": "${ordinal} card interpretation (450-600 words, same format as above)"
    }`
    })
    .join(',\n')

  // 통합 프롬프트 (전체 해석 + 카드별 해석 + 조언)
  const unifiedPrompt = isKorean
    ? `당신은 20년 경력의 직관적인 타로 리더예요. 유튜브에서 수백만 뷰를 받는 타로 채널처럼, 깊이 있고 섬세하게 해석해주세요.

## 스프레드: ${spreadTitle}
## 질문: "${q}"

## 뽑힌 카드
${cardListText}

## 중요: 반드시 모든 ${cards.length}개 카드에 대해 해석을 작성하세요!
각 카드마다 최소 700자 이상의 풍부한 해석을 제공해야 합니다.

## 출력 형식 (JSON)
다음 형식으로 정확히 JSON 응답:
{
  "overall": "전체 메시지 (800-1200자). 질문자의 현재 상황에 공감하며 따뜻하게 시작해요. 카드들이 전체적으로 그리는 큰 그림을 먼저 보여주고, 질문자의 현재 에너지와 앞으로의 흐름을 자연스럽게 풀어주세요. 마지막엔 '결론:'으로 핵심 메시지 정리.",
  "cards": [
${cardExamples}
  ],
  "advice": "실용적이고 구체적인 행동 지침 (180-250자). '오늘부터 이렇게 해보세요' 식의 단계별 조언. 추상적이지 않고 실천 가능한 것만."
}

## 카드 해석 작성 가이드
각 카드 해석은 반드시 다음 구조를 포함해야 합니다 (700-1000자):

1) **카드 비주얼 묘사** (2-3줄): '이 카드를 보면요~' 하며 색감, 인물의 표정, 배경 상징물을 생생하게 그려내요.

2) **위치별 의미** (3-4줄): 이 위치에서 이 카드가 나온 게 왜 의미 있는지, 질문자의 상황과 어떻게 맞아떨어지는지 구체적으로 연결해요.

3) **감정적 레이어** (2-3줄): 이 카드가 전하는 감정, 에너지, 분위기를 섬세하게 전달해요.

4) **실용적 메시지** (3-4줄): 이 카드가 말하는 구체적인 조언.

5) **숨은 의미** (1-2줄): 역방향이나 카드 조합에서만 보이는 깊은 통찰.

## 해석 원칙 (매우 중요!)
1. **질문에 직접 답변**: "${q}"를 항상 염두에 두고, 이 질문에 대한 답을 카드에서 찾아요
2. **스토리텔링**: 각 카드를 따로따로 보지 말고, 전체가 하나의 이야기를 만들도록 연결해요
3. **디테일 묘사**: "좋은 카드네요" 같은 뻔한 말 대신, 카드 속 구체적인 이미지를 언급하며 설명해요
4. **공감과 솔직함**: 듣기 좋은 말만 하지 않고, 필요하면 경고도 따뜻하게 전달해요
5. **역방향 의미**: 역방향 카드는 단순히 "반대"가 아니라, 에너지의 차단/과잉/내면화를 섬세하게 구분해요

## 말투 (절대 규칙!)
✅ 사용: "~해요", "~네요", "~거든요", "~죠", "~ㄹ 거예요"
❌ 금지: "~것입니다", "~하겠습니다", "~합니다", "~하옵니다" (딱딱한 격식체/고어체)
✅ 예시: "지금 좀 힘드시죠? 이 카드가 말해주고 있어요."
❌ 나쁜 예: "현재 어려움을 겪고 계실 것입니다."

## 금지 사항
- AI 티 나는 표현: "제 생각에는", "저는 믿습니다", "추천드립니다" ❌
- 뻔한 일반론: "긍정적인 마음가짐이 중요합니다" ❌
- 짧은 해석: 각 카드는 최소 700자 이상, 풍성하게!`
    : `You are a 20-year veteran intuitive tarot reader. Read like a million-view YouTube tarot channel - deep, detailed, and insightful.

## Spread: ${spreadTitle}
## Question: "${q}"

## Cards Drawn
${cardListText}

## IMPORTANT: You MUST provide interpretation for ALL ${cards.length} cards!
Each card must have at least 450 words of rich interpretation.

## Output Format (JSON)
Respond in this exact JSON format:
{
  "overall": "Overall message (500-700 words). Start with warm empathy for the querent's current situation. Show the big picture these cards paint together, the querent's current energy, and the flow ahead. End with 'Conclusion:' summarizing the core message.",
  "cards": [
${cardExamples}
  ],
  "advice": "Practical, specific action steps (120-150 words). 'Starting today, try this...' style step-by-step guidance. Nothing abstract, only actionable."
}

## Card Interpretation Guide
Each card interpretation MUST include the following structure (450-600 words):

1) **Visual Description** (2-3 lines): 'When I look at this card...' Paint colors, facial expressions, background symbols vividly.

2) **Position Meaning** (3-4 lines): Why this card appearing in this position matters, how it connects to the querent's situation.

3) **Emotional Layer** (2-3 lines): The feelings, energy, atmosphere this card conveys.

4) **Practical Message** (3-4 lines): Specific advice from this card.

5) **Hidden Meaning** (1-2 lines): Deep insights from reversals or card combinations.

## Reading Principles (Critical!)
1. **Answer the Question**: Always keep "${q}" in mind, find answers in the cards
2. **Storytelling**: Connect all cards into one cohesive narrative, not separate readings
3. **Detail Description**: Instead of generic "good card", mention specific imagery from the card
4. **Empathy & Honesty**: Don't just say nice things - give warnings warmly when needed
5. **Reversal Nuance**: Reversed cards aren't just "opposite" - distinguish blocked/excess/internalized energy

## Tone Rules (Absolute!)
✅ Use: Natural, conversational, warm but honest
❌ Avoid: "I believe", "I think", "I suggest", "In my opinion" (AI-like phrases)
✅ Example: "You're going through a tough time, aren't you? This card is telling you..."
❌ Bad: "I believe you may be experiencing difficulties."

## Prohibited
- AI-sounding: "I believe", "I suggest", "I recommend" ❌
- Generic platitudes: "Positive mindset is important" ❌
- Short readings: Each card minimum 450 words, make it rich!`

  try {
    const result = await callGPT(unifiedPrompt, 8000)

    const parsed = tryParseJsonCandidate(result)
    if (parsed) {
      const parsedCards = Array.isArray(parsed.cards) ? parsed.cards : []

      // 카드별 해석이 비어있거나 너무 짧으면 기본 meaning 사용
      const card_insights = cards.map((card, i) => {
        const cardData = asRecord(parsedCards[i])
        let interpretation =
          typeof cardData.interpretation === 'string' ? cardData.interpretation : ''

        // 해석이 너무 짧거나 없으면 카드의 기본 meaning 사용
        if (!interpretation || interpretation.length < 50) {
          interpretation = isKorean && card.meaningKo ? card.meaningKo : card.meaning || ''
        }

        return {
          position: card.position,
          card_name: card.name,
          is_reversed: card.isReversed,
          interpretation,
          spirit_animal: null,
          chakra: null,
          element: null,
          shadow: null,
        }
      })

      return {
        overall_message: typeof parsed.overall === 'string' ? parsed.overall : '',
        card_insights,
        guidance:
          (typeof parsed.advice === 'string' && parsed.advice) ||
          (isKorean ? '카드의 메시지에 귀 기울여보세요.' : 'Listen to the cards.'),
        affirmation: isKorean ? '오늘 하루도 나답게 가면 돼요.' : 'Just be yourself today.',
        combinations:
          Array.isArray(parsed.combinations) && parsed.combinations.length > 0
            ? parsed.combinations
            : buildLocalCombinationHints(cards, language),
        followup_questions: [],
        fallback: false,
      }
    }

    logger.warn('[Tarot interpret] GPT returned non-JSON content; using text fallback payload', {
      preview: result.slice(0, 280),
    })

    // JSON 파싱 실패 시 전체 텍스트를 overall로 사용
    return {
      overall_message: result,
      card_insights: cards.map((card) => ({
        position: card.position,
        card_name: card.name,
        is_reversed: card.isReversed,
        interpretation: '',
        spirit_animal: null,
        chakra: null,
        element: null,
        shadow: null,
      })),
      guidance: isKorean ? '카드의 메시지에 귀 기울여보세요.' : 'Listen to the cards.',
      affirmation: isKorean ? '오늘도 화이팅!' : 'You got this!',
      combinations: buildLocalCombinationHints(cards, language),
      followup_questions: [],
      fallback: false,
    }
  } catch (error) {
    logger.error('GPT interpretation failed:', error)
    return generateSimpleFallback(cards, spreadTitle, language, userQuestion)
  }
}

function buildLocalCombinationHints(cards: CardInput[], language: string, limit = 6) {
  const isKorean = language === 'ko'
  const hints: Array<{ title: string; summary: string }> = []

  for (let i = 0; i < cards.length; i += 1) {
    for (let j = i + 1; j < cards.length; j += 1) {
      const cardA = cards[i]
      const cardB = cards[j]
      const nameA = isKorean ? cardA.nameKo || cardA.name : cardA.name
      const nameB = isKorean ? cardB.nameKo || cardB.name : cardB.name
      const orientationA = cardA.isReversed
        ? isKorean
          ? '역방향'
          : 'reversed'
        : isKorean
          ? '정방향'
          : 'upright'
      const orientationB = cardB.isReversed
        ? isKorean
          ? '역방향'
          : 'reversed'
        : isKorean
          ? '정방향'
          : 'upright'

      const summary = isKorean
        ? `${nameA}(${orientationA})와 ${nameB}(${orientationB}) 조합은 같은 주제에서 보완 또는 긴장 흐름을 만듭니다.`
        : `${nameA} (${orientationA}) with ${nameB} (${orientationB}) creates either reinforcement or tension in the same theme.`

      hints.push({
        title: `${nameA} + ${nameB}`,
        summary,
      })

      if (hints.length >= limit) {
        return hints
      }
    }
  }

  return hints
}

// 간단한 fallback (GPT도 실패한 경우)
function generateSimpleFallback(
  cards: CardInput[],
  spreadTitle: string,
  language: string,
  _userQuestion?: string
) {
  const isKorean = language === 'ko'

  return {
    overall_message: isKorean
      ? `${cards.map((c) => c.nameKo || c.name).join(', ')} 카드가 나왔습니다.`
      : `You drew: ${cards.map((c) => c.name).join(', ')}.`,
    card_insights: cards.map((card) => ({
      position: card.position,
      card_name: card.name,
      is_reversed: card.isReversed,
      interpretation: isKorean && card.meaningKo ? card.meaningKo : card.meaning || '',
      spirit_animal: null,
      chakra: null,
      element: null,
      shadow: null,
    })),
    guidance: isKorean ? '카드의 메시지에 귀 기울여보세요.' : 'Listen to the cards.',
    affirmation: isKorean ? '오늘도 화이팅!' : 'You got this!',
    combinations: buildLocalCombinationHints(cards, language),
    followup_questions: [],
    fallback: true,
  }
}
