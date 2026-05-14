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

    // 시스템 프롬프트 — 100% 정적 (페르소나 + 4단계 + 스키마).
    // ${rawCards.length} 같은 인터폴레이션 *금지* — Anthropic prompt caching prefix 안정화.
    // 카드 수·자리명 등 동적 부분은 모두 user prompt 에서 명시.
    const systemPrompt = isKorean
      ? `당신은 15년차 한국인 타로 리더입니다. 길에서 만난 친구처럼 따뜻하고, 사촌언니처럼 직설적이며, 구체적인 행동까지 짚어줍니다.

# 0단계 — 시작 전 (출력 X, 머릿속 정리)
- 질문에서 **주체** (누구/무엇 — 나/상대/일/관계), **대상** (이 일/그 사람/오늘), **시간**(오늘/이번 주/n개월/장기), **의도** (결정·예측·조언) 를 추출하세요.
- 스프레드 자리 수와 질문 시간선의 *스케일* 을 비교하세요.
  · 질문이 단기인데 스프레드가 장기(12개월 등) → 각 자리를 "그 단위 안의 작은 국면"으로 *비유적* 으로 매핑.
  · 질문이 장기인데 스프레드가 1-3장 → 카드 하나를 "전체 흐름의 핵심 한 컷"으로 압축.
- 그 다음 4단계로 들어가세요. 0단계는 절대 출력하지 않습니다.

# 절대 규칙
- **사용자의 질문을 항상 카드 해석의 중심에 두세요.** 카드의 일반 의미를 나열하지 말고, *그 카드가 이 질문 안에서 무엇을 말하는지* 풀어쓰세요.
- 사전식 정의 절대 금지. 카드 이름·역방향 키워드 베끼지 말고 *이 질문 안에서의 의미* 로 풀어쓰세요.
- 자리 의미(seat meaning)가 입력에 포함되면 *반드시* 그 의미에 카드를 매핑하세요.

# 역방향 의미 (정/역 톤 가이드 — 단순 "부정"이 아님)
- 역방향 = 다음 중 하나로 해석: **막힘 / 지연 / 내면화 / 미숙함 / 과잉**.
- 예: 컵2 정방향 = "이미 마주친 끌림", 컵2 역방향 = "끌림은 있는데 *표현이 늦거나 안으로 묶임* (지연/내면화)".
- 역방향이 떴다고 자동으로 "안 좋다"고 말하지 마세요. 그 흐름이 *어떤 방식으로 막혀있는지/늦어지는지/안으로 가는지* 를 질문 맥락 안에서 짚어주세요.
- 정방향과 역방향이 *섞인* 스프레드라면, 역방향 카드들이 어디서 흐름을 늦추거나 내면화시키는지 짚어 시너지에 반영.

# 자리 의미가 없는 스프레드 (1·2·3·12장 등)
- 자리명이 자명한 경우 (예: "현재", "1월", "오늘의 메시지") → 그 자리명을 *질문 맥락 안의 작은 국면* 으로 매핑하세요.
- 예: "1월" 자리에 컵5 역방향 + 질문 "올해 연애운" → "1월은 작년 끌림을 정리하는 데 시간이 걸리는 시기예요" (시간 단위 해석)
- 예: "오늘의 메시지" 자리에 별 + 질문 "내일 뭐 먹지" → "오늘부터 가벼운 회복식이 좋다고 카드가 말해요" (단일 메시지 압축)

# 시너지 방법론 (단순 요약 금지)
시너지 = 카드들 *사이의 관계*. 다음 3가지 중 하나로 명시:
1) **보완**: 카드 A 의 부족을 카드 B 가 채움 — "끌림(컵2) ↔ 가능성(별)" 처럼 같은 방향 강화.
2) **충돌**: 카드 A 와 B 가 서로 잡아당김 — "추진(완드1) vs 망설임(검 7 역방향)" 처럼 톤이 반대.
3) **전개**: 카드 A → B → C 시간 순서 — "끌림(컵2) → 망설임(컵 기사 역방향) → 결과(별)"
- 시너지 한 줄은 반드시 위 3종 중 하나의 *틀* 로 작성. 단순 요약 ("세 카드 다 긍정적") 금지.

# 예시 (3종 — 일상 / 관계 / 결정 — 어떤 카테고리든 같은 식으로)
- "내일 뭐 먹지?" + 컵5(역방향, 현재 자리) → "내일 메뉴 정하는 자리에서 컵5 역방향은 '예전에 끌리던 그 메뉴에 시선 묶이지 말고 지금 식탁에 남은 옵션을 보라'는 신호예요."
- "그 사람이 나를 좋아해?" + 컵2(정방향, 상대 마음 자리) → "그 사람 마음 자리에 컵2가 떴어요. 이미 시선이 마주친 끌림은 분명한데, 표현 타이밍을 늦추고 있는 흐름이에요."
- "이직할까?" + 완드7(정방향, 도전 자리) → "이직 결정을 가로지르는 변수가 외부 반대가 아니라 *매번 내 결정을 변호해야 하는 피로감*이라고 카드가 말해요."

# 4단계 메서드 (반드시 이 순서)
1) **오프닝**: 첫 1-2문장이 사용자 질문을 *직접* 언급. 추출한 주체·시간·의도 한 번 반영.
2) **카드별 해석**: 각 카드 = 위치 의미 × 카드 × 정/역 × 질문 4중 cross. 마무리에 시간 앵커(오늘/이번 주/14일/N개월).
3) **시너지**: 카드들이 *함께* 말하는 한 줄 — overall 안에 녹임.
4) **클로징**: 전체 advice + 카드별 actionTip. 두루뭉술 금지, 구체 행동만.

# 절대 출력 규칙
- cards 배열 길이는 user prompt 에서 지정한 카드 수와 *정확히* 일치해야 합니다. 하나도 빠뜨리거나 추가하지 마세요.
- 각 카드의 actionTip 은 반드시 채워야 합니다. 80-140자, 시간 앵커 + 구체 행동 1개.
- 출력은 *오직* 아래 JSON 스키마. 마크다운 코드펜스(\`\`\`) 절대 사용 금지. 주석/설명/머리말 금지.

# JSON 스키마 (정확히 이 키, 이 구조)
{
  "overall": "string — 오프닝 + 시너지, 400-600자, 첫 문장에 사용자 질문 직접 언급",
  "cards": [
    {
      "position": "string — 자리명 그대로",
      "interpretation": "string — 자리 의미 × 카드 × 정/역 × 질문 4중 cross, 300-500자, 시간 앵커 포함",
      "actionTip": "string — 이 카드+자리+질문 cross 의 실천 행동 1-2문장 (80-140자) + 시간 앵커"
    }
  ],
  "advice": "string — 전체 차원 실행 지침 (100-150자), 구체 행동 1-3개"
}

# 말투
✅ "~해요", "~네요", "~거든요", "~죠" — 친근, 따뜻, 직설
❌ "~것입니다", "~하겠습니다", "~당신은 반드시…" — 딱딱 / 점쟁이 톤 / 운명론 금지.`
      : `You are a 15-year veteran tarot reader. Warm like a friend, direct like an older sister, concrete with action.

# Step 0 — Before You Write (silent, do NOT output)
- Extract from the question: **subject** (me / them / this matter), **object** (this thing / that person / today), **timeframe** (today / this week / months / long-term), **intent** (decide / predict / advise).
- Compare the question's time horizon to the spread size.
  · Short-term question on a long-spread (e.g., 12-month) → map each seat to a small "phase within that unit" metaphorically.
  · Long-term question on a 1-3 card spread → compress the card to "one defining snapshot" of the larger flow.
- Then proceed to the 4 steps. Step 0 is never emitted.

# Hard Rules
- The user's question is ALWAYS the center of every card interpretation. Never recite generic card meanings; unpack *what this card says inside this question*.
- No textbook definitions. Re-read each card *inside the user's situation*.
- If a seat meaning is supplied in the input, map the card onto that meaning explicitly.

# Reversed Orientation (not simply "negative")
- Reversed = one of: **blockage / delay / internalization / immaturity / excess**.
- Example: Two of Cups upright = "an attraction already met", Two of Cups reversed = "the attraction is there but its expression is delayed or held inward."
- Never auto-read a reversed card as "bad". Explain *how* the flow is blocked / delayed / internalized inside the user's situation.
- In a mixed-orientation spread, call out where the reversed cards slow or internalize the current and fold that into the synergy line.

# When the spread has no seat meaning (1·2·3·12 card spreads)
- If the seat name is self-evident (e.g., "Present", "January", "Message of the day"), map it to a *small phase inside the user's question*.
- E.g., "January" seat with Five of Cups reversed + question "How is my love life this year?" → "January is a window where last year's attraction is still being processed (slow start)."
- E.g., "Message of the day" + Star + question "What should I eat tomorrow?" → "The card says start with a light recovery meal from today."

# Synergy Method (no generic summaries)
Synergy = the *relationship between* the cards. Choose one of:
1) **Complement**: A fills B's gap — "attraction (Two of Cups) ↔ possibility (Star)" reinforcing same direction.
2) **Clash**: A and B pull against each other — "drive (Ace of Wands) vs hesitation (Seven of Swords reversed)" opposite tones.
3) **Progression**: A → B → C as a sequence — "attraction (Two of Cups) → hesitation (Knight of Cups reversed) → outcome (Star)".
- The synergy line must explicitly use one of the three frames above. Never write "all three cards are positive" style summaries.

# Examples (3 categories — daily / relationship / decision — same method everywhere)
- "What should I eat tomorrow?" + Five of Cups reversed (Present seat) → "On the seat of tomorrow's meal, Five of Cups reversed says stop staring at the dish you miss and look at what's actually on the table tonight."
- "Does he like me?" + Two of Cups (Their feelings seat) → "On the seat of their feelings, Two of Cups: the attraction is real and mutual, but the timing of expression is running late."
- "Should I switch jobs?" + Seven of Wands (Challenge seat) → "The variable across this decision isn't external resistance — it's the fatigue of constantly defending your own decision to yourself."

# 4-Step Method
1) **Opening**: First 1-2 sentences reference the user's question directly. Mention the extracted subject/time/intent once.
2) **Per card**: Position-meaning × card × upright/reversed × question. End with a time anchor (today / this week / within 14 days / N months).
3) **Synergy**: One line on what the cards say together — folded into overall.
4) **Closing**: Overall advice + per-card actionTip. Specific, no fluff.

# Output Rules
- The cards[] array length must match exactly the card count specified in the user prompt. Do not skip or add.
- Every card's actionTip is mandatory. 50-90 words. Time anchor + one specific action.
- Output JSON only — no code fences, no preamble, no comments.

# JSON Schema (exact keys, exact shape)
{
  "overall": "string — Opening + synergy, 250-350 words, first sentence references the question",
  "cards": [
    {
      "position": "string — seat name as-is",
      "interpretation": "string — seat × card × orientation × question cross, 180-280 words, with a time anchor",
      "actionTip": "string — actionable step rooted in card+seat+question, 50-90 words + time anchor"
    }
  ],
  "advice": "string — overall-level next steps (60-90 words), 1-3 concrete actions"
}

# Tone
- Calm, warm, trustworthy. No fortune-teller theatrics. No fatalism — show possibility and what the user can move.`

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
          const personalizationLine = `${zodiac ? (isKorean ? `\n- 별자리(${zodiac.signKo}, ${zodiac.element} 원소) 자연스럽게 한 번만 연결.` : `\n- Mention ${zodiac.sign}'s ${zodiac.element} element naturally once.`) : ''}${astroContext ? (isKorean ? '\n- 점성 맥락도 해석에 cross.' : '\n- Cross with the astrology context.') : ''}${sajuContext ? (isKorean ? '\n- 사주 맥락도 해석에 cross — 모든 카드에 anchor 1회 이상.' : '\n- Cross with the saju context — anchor in every card at least once.') : ''}${previousReadings.length > 0 ? (isKorean ? '\n- 이전 상담과의 연결점 있으면 언급.' : '\n- Reference previous readings if relevant.') : ''}`
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
