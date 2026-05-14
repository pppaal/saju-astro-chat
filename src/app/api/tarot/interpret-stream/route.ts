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
import {
  buildQuestionContextPrompt,
  type TarotQuestionAnalysisSnapshot,
} from '@/lib/tarot/questionFlow'
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

function normalizeQuestionContext(value: unknown): TarotQuestionAnalysisSnapshot | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as TarotQuestionAnalysisSnapshot
}

function buildFallbackPayload(
  cards: CardInput[],
  language: 'ko' | 'en'
): { overall: string; cards: { position: string; interpretation: string; actionTip?: string }[]; advice: string } {
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

function normalizeAdvice(advice: unknown): string {
  if (typeof advice === 'string') {
    return advice
  }
  if (Array.isArray(advice)) {
    const lines = advice
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return ''
        }
        const record = entry as Record<string, unknown>
        const title = typeof record.title === 'string' ? record.title.trim() : ''
        const detail = typeof record.detail === 'string' ? record.detail.trim() : ''
        if (title && detail) {
          return `${title}: ${detail}`
        }
        return title || detail
      })
      .filter(Boolean)
    return lines.join('\n')
  }
  return ''
}

function normalizeBackendPayload(
  data: unknown,
  fallback: {
    overall: string
    cards: { position: string; interpretation: string; actionTip?: string }[]
    advice: string
  }
): {
  overall: string
  cards: { position: string; interpretation: string; actionTip?: string }[]
  advice: string
} | null {
  if (!data || typeof data !== 'object') {
    return null
  }
  const record = data as Record<string, unknown>
  const overall =
    typeof record.overall_message === 'string' && record.overall_message.trim()
      ? record.overall_message
      : fallback.overall
  const advice = normalizeAdvice(record.guidance) || fallback.advice

  const insights = Array.isArray(record.card_insights) ? record.card_insights : []
  const cards =
    insights.length > 0
      ? insights.map((entry, index) => {
          const cardRecord = entry as Record<string, unknown>
          const position =
            typeof cardRecord.position === 'string' && cardRecord.position.trim()
              ? cardRecord.position
              : fallback.cards[index]?.position || `Card ${index + 1}`
          const interpretation =
            typeof cardRecord.interpretation === 'string' && cardRecord.interpretation.trim()
              ? cardRecord.interpretation
              : fallback.cards[index]?.interpretation || ''
          // backend RAG 응답 — 보통 action_tip 으로 옴 (interpret/route.ts 와 동일)
          const actionTipRaw =
            typeof cardRecord.action_tip === 'string' && cardRecord.action_tip.trim()
              ? cardRecord.action_tip
              : typeof cardRecord.actionTip === 'string' && cardRecord.actionTip.trim()
                ? cardRecord.actionTip
                : undefined
          return { position, interpretation, actionTip: actionTipRaw }
        })
      : fallback.cards

  return { overall, cards, advice }
}

function streamJsonPayload(
  payload: {
    overall: string
    cards: { position: string; interpretation: string; actionTip?: string }[]
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

async function fetchBackendFallback(_payload: {
  categoryId: string
  spreadId: string
  spreadTitle: string
  cards: CardInput[]
  userQuestion: string
  language: 'ko' | 'en'
  birthdate: string
  includeAstrology: boolean
  includeSaju: boolean
  sajuContext?: string
  astroContext?: string
}): Promise<unknown | null> {
  // Python backend 제거 — 항상 null 반환해 Claude/OpenAI 직접 streaming 흐름으로.
  return null
}

// 별자리 계산 함수
function parseBirthMonthDay(birthdate: string): { month: number; day: number } | null {
  // Handle YYYY-MM-DD explicitly to avoid timezone shifts.
  const directDateMatch = birthdate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (directDateMatch) {
    const year = Number(directDateMatch[1])
    const month = Number(directDateMatch[2])
    const day = Number(directDateMatch[3])
    const utcDate = new Date(Date.UTC(year, month - 1, day))

    if (
      utcDate.getUTCFullYear() === year &&
      utcDate.getUTCMonth() + 1 === month &&
      utcDate.getUTCDate() === day
    ) {
      return { month, day }
    }
    return null
  }

  // Fallback for other ISO-like inputs. Use UTC fields for determinism.
  const parsed = new Date(birthdate)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return { month: parsed.getUTCMonth() + 1, day: parsed.getUTCDate() }
}

function getZodiacSign(
  birthdate: string
): { sign: string; signKo: string; element: string } | null {
  const parts = parseBirthMonthDay(birthdate)
  if (!parts) {
    return null
  }

  const { month, day } = parts

  const zodiacData = [
    { sign: 'Capricorn', signKo: '염소자리', element: '흙', start: [12, 22], end: [1, 19] },
    { sign: 'Aquarius', signKo: '물병자리', element: '공기', start: [1, 20], end: [2, 18] },
    { sign: 'Pisces', signKo: '물고기자리', element: '물', start: [2, 19], end: [3, 20] },
    { sign: 'Aries', signKo: '양자리', element: '불', start: [3, 21], end: [4, 19] },
    { sign: 'Taurus', signKo: '황소자리', element: '흙', start: [4, 20], end: [5, 20] },
    { sign: 'Gemini', signKo: '쌍둥이자리', element: '공기', start: [5, 21], end: [6, 20] },
    { sign: 'Cancer', signKo: '게자리', element: '물', start: [6, 21], end: [7, 22] },
    { sign: 'Leo', signKo: '사자자리', element: '불', start: [7, 23], end: [8, 22] },
    { sign: 'Virgo', signKo: '처녀자리', element: '흙', start: [8, 23], end: [9, 22] },
    { sign: 'Libra', signKo: '천칭자리', element: '공기', start: [9, 23], end: [10, 22] },
    { sign: 'Scorpio', signKo: '전갈자리', element: '물', start: [10, 23], end: [11, 21] },
    { sign: 'Sagittarius', signKo: '사수자리', element: '불', start: [11, 22], end: [12, 21] },
  ]

  for (const z of zodiacData) {
    const [startM, startD] = z.start
    const [endM, endD] = z.end

    if (startM > endM) {
      // 염소자리 같이 연도를 걸치는 경우
      if ((month === startM && day >= startD) || (month === endM && day <= endD)) {
        return { sign: z.sign, signKo: z.signKo, element: z.element }
      }
    } else {
      if (
        (month === startM && day >= startD) ||
        (month === endM && day <= endD) ||
        (month > startM && month < endM)
      ) {
        return { sign: z.sign, signKo: z.signKo, element: z.element }
      }
    }
  }
  return null
}

// 감정 분석 함수
function analyzeQuestionMood(
  question: string
): 'worried' | 'curious' | 'hopeful' | 'urgent' | 'neutral' {
  const lowerQ = question.toLowerCase()
  const koreanQ = question

  // 걱정/불안 패턴
  if (
    /걱정|불안|두렵|힘들|무서|어떡|망하|실패|잃|끝|포기/i.test(koreanQ) ||
    /worried|anxious|scared|afraid|fail|lose|end/i.test(lowerQ)
  ) {
    return 'worried'
  }

  // 긴급 패턴
  if (
    /급해|빨리|당장|지금|바로|언제|오늘/i.test(koreanQ) ||
    /urgent|asap|now|immediately|today|when/i.test(lowerQ)
  ) {
    return 'urgent'
  }

  // 희망/긍정 패턴
  if (
    /잘될|좋아질|성공|행복|사랑|만날|이룰|희망/i.test(koreanQ) ||
    /hope|success|love|happy|better|achieve/i.test(lowerQ)
  ) {
    return 'hopeful'
  }

  // 호기심 패턴
  if (
    /어떨까|궁금|알고싶|보여줘|뭘까|왜/i.test(koreanQ) ||
    /what|how|why|curious|wonder/i.test(lowerQ)
  ) {
    return 'curious'
  }

  return 'neutral'
}

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
    const userQuestion = body.userQuestion || ''
    const questionContext = normalizeQuestionContext(body.questionContext)
    const effectiveUserQuestion = buildQuestionContextPrompt(
      userQuestion,
      questionContext,
      language
    )
    const includeAstrology = body.includeAstrology !== false
    const includeSaju = body.includeSaju !== false
    const birthdate = includeAstrology ? body.birthdate || '' : ''
    const sajuContext = includeSaju ? (body.sajuContext || '').trim() : ''
    const astroContext = includeAstrology ? (body.astroContext || '').trim() : ''
    const previousReadings = body.previousReadings || []

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
      previousReadings: previousReadings.length,
    })

    // Always prefer backend Hybrid RAG (Evidence + tarot rules) first.
    // This ensures question-aware interpretation quality for all questions.
    const backendPrimaryBase = buildFallbackPayload(rawCards, language)
    const backendPrimary = await fetchBackendFallback({
      categoryId,
      spreadId,
      spreadTitle,
      cards: rawCards,
      userQuestion: effectiveUserQuestion,
      language,
      birthdate,
      includeAstrology,
      includeSaju,
      sajuContext,
      astroContext,
    })
    const backendPrimaryPayload = normalizeBackendPayload(backendPrimary, backendPrimaryBase)
    if (backendPrimaryPayload) {
      logger.info('Tarot stream served by backend Hybrid RAG')
      return withCreditCookies(
        streamJsonPayload(backendPrimaryPayload, { 'X-RAG-Source': 'backend' }),
        creditResult
      )
    }

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

    // 개인화 정보 구성
    const zodiac = birthdate ? getZodiacSign(birthdate) : null
    const mood = analyzeQuestionMood(q)

    // 개인화 컨텍스트 생성
    let personalizationContext = ''
    if (isKorean) {
      if (zodiac) {
        personalizationContext += `\n## 질문자 정보\n- 별자리: ${zodiac.signKo} (${zodiac.element} 원소)\n`
      }
      if (astroContext) {
        personalizationContext += `\n## 점성 맥락\n${astroContext}\n`
      }
      if (sajuContext) {
        personalizationContext += `\n## 사주 맥락\n${sajuContext}\n`
      }
      if (previousReadings.length > 0) {
        personalizationContext += `\n## 이전 상담 요약 (맥락 참고용)\n${previousReadings.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n`
      }
      const moodGuide: Record<typeof mood, string> = {
        worried: '질문자가 걱정하고 있어요. 안심시키면서도 현실적인 조언을 해주세요.',
        urgent: '질문자가 급한 상황이에요. 핵심을 먼저 말하고 구체적인 행동 지침을 주세요.',
        hopeful: '질문자가 희망적이에요. 긍정적인 에너지를 유지하면서 균형 잡힌 조언을 해주세요.',
        curious: '질문자가 호기심이 많아요. 흥미롭게 설명하면서 깊이 있는 통찰을 주세요.',
        neutral: '',
      }
      if (moodGuide[mood]) {
        personalizationContext += `\n## 말투 힌트\n${moodGuide[mood]}\n`
      }
    } else {
      if (zodiac) {
        personalizationContext += `\n## Querent Info\n- Zodiac: ${zodiac.sign} (${zodiac.element} element)\n`
      }
      if (astroContext) {
        personalizationContext += `\n## Astrology Context\n${astroContext}\n`
      }
      if (sajuContext) {
        personalizationContext += `\n## Saju Context\n${sajuContext}\n`
      }
      if (previousReadings.length > 0) {
        personalizationContext += `\n## Previous Readings Summary (for context)\n${previousReadings.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n`
      }
    }

    // 카드 수에 맞는 JSON 예시 생성 — actionTip 도 함께 요구 (카드+자리+질문 cross 실천 조언)
    const cardExamplesKo = rawCards
      .map((c, i) => {
        const pos = isKorean && c.positionKo ? c.positionKo : c.position
        return `    {"position": "${pos || `카드 ${i + 1}`}", "interpretation": "이 위치에서 이 카드가 의미하는 바를 구체적으로 설명 (300-500자)", "actionTip": "이 카드 + 자리 + 질문에 딱 맞춘 실천 행동 1-2문장 (80-140자) — 시간 앵커 + 구체 행동 1개"}`
      })
      .join(',\n')
    const cardExamplesEn = rawCards
      .map((c, i) => {
        return `    {"position": "${c.position || `Card ${i + 1}`}", "interpretation": "What this card means in this position specifically (180-280 words)", "actionTip": "Concrete action for this card+seat+question (50-90 words) — time anchor + one specific step"}`
      })
      .join(',\n')

    // 시스템 프롬프트 — 페르소나 + 4단계 메서드 + 질문 앵커링 강제 (caching 친화 정적 prefix)
    const systemPrompt = isKorean
      ? `당신은 15년차 한국인 타로 리더입니다. 길에서 만난 친구처럼 따뜻하고, 사촌언니처럼 직설적이며, 구체적인 행동까지 짚어줍니다.

# 절대 규칙
- **사용자의 질문을 항상 카드 해석의 중심에 두세요.** 카드의 일반 의미를 나열하지 말고, *그 카드가 이 질문 안에서 무엇을 말하는지* 풀어쓰세요.
- 예: 질문="내일 뭐 먹지?" + 컵5(역방향, 현재 자리) → "내일 메뉴를 정하는 자리에서 컵5 역방향은 '예전에 끌리던 그 메뉴에 시선 묶이지 말고 지금 식탁에 남은 옵션을 보라'는 신호예요." (X) "컵5는 상실을 의미합니다." (사전식 금지)
- 사전식 정의 절대 금지. 카드 이름·역방향 키워드 베끼지 말고 *이 질문 안에서의 의미* 로 풀어쓰세요.
- 자리 의미(seat meaning)가 입력에 포함되면 *반드시* 그 의미에 카드를 매핑하세요.

# 4단계 메서드 (반드시 이 순서로 사고)
1) **오프닝**: 카드를 펼친 첫 인상을 사용자 질문에 직접 묶어서 1-2문장.
2) **카드별 해석**: 각 카드 = 위치 의미 × 카드 × 정/역 × 질문 4중 cross. 마무리에 시간 앵커(오늘/이번 주/14일 안).
3) **시너지**: 카드들이 *함께* 말하는 한 줄 — overall 안에 자연스럽게 녹임.
4) **클로징 (advice + 카드별 actionTip)**: 구체 행동, 두루뭉술 금지.

# 중요: 반드시 모든 ${rawCards.length}개 카드에 대해 cards[] 에 항목을 작성하세요. 하나도 빠뜨리지 마세요.
# 중요: 각 카드의 actionTip 필드는 *반드시* 채우세요. 카드+자리+질문 cross 의 구체 행동 1-2문장 (80-140자) + 시간 앵커.

# 출력 형식 (JSON 만, 코드펜스 금지)
{
  "overall": "오프닝 + 시너지 (400-600자). 첫 문장에 사용자의 질문을 직접 언급.",
  "cards": [
${cardExamplesKo}
  ],
  "advice": "전체 차원의 실행 지침 (100-150자). 구체 행동 1-3개."
}

# 말투
✅ "~해요", "~네요", "~거든요", "~죠" — 친근, 따뜻, 직설
❌ "~것입니다", "~하겠습니다", "~당신은 반드시…" — 딱딱하거나 점쟁이 톤
❌ 운명론 금지. 가능성과 변수, 사용자가 움직일 여지 포함.`
      : `You are a 15-year veteran tarot reader. Warm like a friend, direct like an older sister, concrete with action.

# Hard Rules
- **The user's question is ALWAYS the center of every card interpretation.** Never recite generic card meanings; unpack *what this card says inside this question*.
- Example: question "What should I eat tomorrow?" + Five of Cups reversed (Present seat) → "On the seat of tomorrow's meal, Five of Cups reversed says stop staring at the dish you miss and look at what's actually on the table tonight." NOT "Five of Cups means loss."
- No textbook definitions. Re-read each card *inside the user's situation*.
- If a seat meaning is provided in the input, map the card onto that meaning explicitly.

# 4-Step Method
1) **Opening**: First 1-2 sentences must reference the user's question directly.
2) **Per card**: Cross position × card × upright/reversed × question. End with a time anchor (today / this week / within 14 days).
3) **Synergy**: One line on what the cards say together — folded into overall.
4) **Closing**: Practical advice + per-card actionTip. Specific, no fluff.

# IMPORTANT
- The cards[] array must contain exactly ${rawCards.length} entries.
- Each card's actionTip MUST be filled: 1-2 sentences (50-90 words) — one concrete action tied to card+seat+question, with a time anchor.

# Output Format (JSON only, no code fences)
{
  "overall": "Opening + synergy (250-350 words). First sentence references the question.",
  "cards": [
${cardExamplesEn}
  ],
  "advice": "Practical actions across the whole spread (60-90 words)."
}

# Tone
- Calm, warm, trustworthy. No fortune-teller theatrics.
- Show possibility and what the user can move, not fate.`

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
- 각 카드의 actionTip 은 *질문에 직접 적용 가능한* 1-2문장 행동 + 시간 앵커.
- overall 의 첫 문장은 사용자의 질문을 직접 언급하면서 시작.${zodiac ? `\n- 별자리(${zodiac.signKo}, ${zodiac.element} 원소) 자연스럽게 한 번만 연결.` : ''}${astroContext ? '\n- 점성 맥락도 해석에 cross.' : ''}${sajuContext ? '\n- 사주 맥락도 해석에 cross — 모든 카드에 anchor 1회 이상.' : ''}${previousReadings.length > 0 ? '\n- 이전 상담과의 연결점 있으면 언급.' : ''}`
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
- Each card's actionTip is 1-2 sentences of action directly applicable to the question, with a time anchor.
- The first sentence of overall must reference the user's question directly.${zodiac ? `\n- Mention ${zodiac.sign}'s ${zodiac.element} element naturally once.` : ''}${astroContext ? '\n- Cross with the astrology context.' : ''}${sajuContext ? '\n- Cross with the saju context — anchor in every card at least once.' : ''}${previousReadings.length > 0 ? '\n- Reference previous readings if relevant.' : ''}`

    // Claude 우선: 비스트리밍 단일 청크 emit (페르소나/메서드 system 자동 캐싱)
    if (isClaudeAvailable()) {
      const claudeStartTime = Date.now()
      try {
        logger.info('Tarot stream Claude request', {
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
        recordExternalCall('anthropic', 'claude-haiku-4-5', 'success', Date.now() - claudeStartTime)
        // 응답을 SSE 단일 청크로 emit — 클라이언트는 동일 컨트랙트 유지
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
      } catch (claudeErr) {
        recordExternalCall('anthropic', 'claude-haiku-4-5', 'error', Date.now() - claudeStartTime)
        logger.warn('Tarot stream Claude failed, falling back to OpenAI', {
          error: claudeErr instanceof Error ? claudeErr.message : String(claudeErr),
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
      logger.warn('Tarot stream fallback to backend')
      const fallbackBase = buildFallbackPayload(rawCards, language)
      const backendFallback = await fetchBackendFallback({
        categoryId,
        spreadId,
        spreadTitle,
        cards: rawCards,
        userQuestion: effectiveUserQuestion,
        language,
        birthdate,
        includeAstrology,
        includeSaju,
        sajuContext,
        astroContext,
      })
      const fallback = normalizeBackendPayload(backendFallback, fallbackBase) || fallbackBase
      return withCreditCookies(streamJsonPayload(fallback, { 'X-Fallback': '1' }), creditResult)
    }
    clearTimeout(openaiTimeoutId)

    if (!openaiResponse.ok) {
      recordExternalCall('openai', 'gpt-4o-mini', 'error', Date.now() - openaiStartTime)
      const errorText = await openaiResponse.text()
      logger.error('OpenAI stream error:', { status: openaiResponse.status, error: errorText })
      logger.warn('Tarot stream fallback to backend')
      const fallbackBase = buildFallbackPayload(rawCards, language)
      const backendFallback = await fetchBackendFallback({
        categoryId,
        spreadId,
        spreadTitle,
        cards: rawCards,
        userQuestion: effectiveUserQuestion,
        language,
        birthdate,
        includeAstrology,
        includeSaju,
        sajuContext,
        astroContext,
      })
      const fallback = normalizeBackendPayload(backendFallback, fallbackBase) || fallbackBase
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
          const fallbackBase = buildFallbackPayload(rawCards, language)
          const backendFallback = await fetchBackendFallback({
            categoryId,
            spreadId,
            spreadTitle,
            cards: rawCards,
            userQuestion: effectiveUserQuestion,
            language,
            birthdate,
            includeAstrology,
            includeSaju,
            sajuContext,
            astroContext,
          })
          const fallback = normalizeBackendPayload(backendFallback, fallbackBase) || fallbackBase
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
