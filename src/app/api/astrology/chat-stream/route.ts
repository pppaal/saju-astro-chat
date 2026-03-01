import { NextResponse } from 'next/server'
import { createStreamRoute, createFallbackSSEStream } from '@/lib/streaming'
import { createAuthenticatedGuard } from '@/lib/api/middleware'
import {
  astrologyChatStreamSchema,
  type AstrologyChatStreamValidated,
} from '@/lib/api/zodValidation'
import { guardText, containsForbidden, safetyMessage } from '@/lib/textGuards'
import { sanitizeLocaleText, maskTextWithName } from '@/lib/destiny-map/sanitize'
import { HTTP_STATUS } from '@/lib/constants/http'
import { DATE_RE, TIME_RE } from '@/lib/validation/patterns'
import { buildThemeDepthGuide } from '@/lib/prompts/fortuneWithIcp'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function clampMessages(messages: { role: string; content: string }[], max = 6) {
  return messages.slice(-max)
}

function astrologyCounselorSystemPrompt(lang: string) {
  const base = [
    'You are a Western Astrology counselor specializing in birth chart analysis and planetary transits.',
    '',
    'ABSOLUTE RULES:',
    "1. NO GREETING - Start directly with analysis. Never say 'welcome', 'hello', etc.",
    '2. Focus ONLY on Western Astrology - do NOT mix with Eastern fortune-telling like Saju',
    '3. Use proper astrological terminology (signs, houses, aspects, transits)',
    '4. Include specific planetary positions and aspects when relevant',
    '',
    'Response format (START IMMEDIATELY, no greeting):',
    '【Sun/Moon】 Core personality from Sun and Moon signs',
    '【Rising】 Ascendant influence on outer persona',
    '【Transits】 Current planetary transits and their effects',
    '【Houses】 Relevant house placements for the question',
    '【Guidance】 2-3 practical actions based on chart reading',
    '',
    'Length: 200-300 words.',
  ]
  return lang === 'ko'
    ? [
        '너는 서양 점성술 전문 상담사다. 출생 차트 분석과 행성 트랜짓 전문가야.',
        '',
        '절대 규칙:',
        "1. 인사 금지 - '안녕하세요', '반가워요' 등 인사 없이 바로 분석 시작. 첫 문장부터 【태양/달】으로 시작해.",
        '2. 서양 점성술에만 집중 - 사주 같은 동양 역술과 섞지 마.',
        '3. 점성술 용어를 적절히 사용해 (별자리, 하우스, 애스펙트, 트랜짓 등)',
        '4. 관련된 행성 위치와 각도를 구체적으로 언급해.',
        '',
        '응답 형식 (인사 없이 바로):',
        '【태양/달】 태양과 달 별자리의 핵심 성격',
        '【상승궁】 어센던트가 외적 페르소나에 미치는 영향',
        '【트랜짓】 현재 행성 트랜짓과 그 영향',
        '【하우스】 질문과 관련된 하우스 배치',
        '【조언】 차트 분석 기반 2-3개 실천 조언',
        '',
        '길이: 200-300단어.',
      ].join('\n')
    : base.join('\n')
}

export const POST = createStreamRoute<AstrologyChatStreamValidated>({
  route: 'AstrologyChatStream',
  guard: createAuthenticatedGuard({
    route: 'astrology-chat-stream',
    limit: 60,
    windowSeconds: 60,
    requireCredits: true,
    creditType: 'reading',
    creditAmount: 1,
  }),
  schema: astrologyChatStreamSchema,
  fallbackMessage: {
    ko: 'AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
    en: 'Could not connect to AI service. Please try again.',
  },
  transform(chunk, validated) {
    const lang = validated.locale || 'ko'
    return maskTextWithName(sanitizeLocaleText(chunk, lang), undefined)
  },
  async buildPayload(validated, context, req, rawBody) {
    const name = typeof rawBody.name === 'string' ? rawBody.name.trim().slice(0, 100) : undefined
    const birthDate =
      typeof rawBody.birthDate === 'string' ? rawBody.birthDate.trim().slice(0, 10) : ''
    const birthTime =
      typeof rawBody.birthTime === 'string' ? rawBody.birthTime.trim().slice(0, 5) : ''
    const gender = typeof rawBody.gender === 'string' ? rawBody.gender : 'male'
    const latitude =
      typeof rawBody.latitude === 'number' ? rawBody.latitude : Number(rawBody.latitude)
    const longitude =
      typeof rawBody.longitude === 'number' ? rawBody.longitude : Number(rawBody.longitude)
    const theme = typeof rawBody.theme === 'string' ? rawBody.theme.trim().slice(0, 100) : 'life'
    const lang = validated.locale || (context.locale as string)
    const astro =
      typeof rawBody.astro === 'object' && rawBody.astro !== null ? rawBody.astro : undefined
    const userContext =
      typeof rawBody.userContext === 'string' ? rawBody.userContext.slice(0, 1000) : undefined

    if (!birthDate || !birthTime || !DATE_RE.test(birthDate) || !TIME_RE.test(birthTime)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const trimmedHistory = clampMessages(validated.messages)

    // Safety check
    const lastUser = [...trimmedHistory].reverse().find((m) => m.role === 'user')
    if (lastUser && containsForbidden(lastUser.content)) {
      return createFallbackSSEStream({
        content: safetyMessage(lang),
        done: true,
      })
    }

    // Build conversation context
    const historyText = trimmedHistory
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${guardText(m.content, 300)}`)
      .join('\n')
      .slice(0, 1500)

    const userQuestion = lastUser ? guardText(lastUser.content, 500) : ''
    const normalizedLang = lang === 'ko' ? 'ko' : 'en'
    const themeDepthGuide = buildThemeDepthGuide(theme, normalizedLang)

    const chatPrompt = [
      astrologyCounselorSystemPrompt(lang),
      themeDepthGuide,
      `Name: ${name || 'User'}`,
      `Birth: ${birthDate} ${birthTime}`,
      `Gender: ${gender}`,
      `Location: lat=${latitude}, lon=${longitude}`,
      `Theme: ${theme}`,
      historyText ? `\nConversation:\n${historyText}` : '',
      `\nQuestion: ${userQuestion}`,
    ]
      .filter(Boolean)
      .join('\n')

    const sessionId = req.headers.get('x-session-id') || undefined

    return {
      endpoint: '/astrology/ask-stream',
      body: {
        theme,
        prompt: chatPrompt,
        locale: lang,
        astro: astro || undefined,
        birth: { date: birthDate, time: birthTime, gender, lat: latitude, lon: longitude },
        history: trimmedHistory.filter((m) => m.role !== 'system'),
        session_id: sessionId,
        user_context: userContext || undefined,
        counselor_type: 'astrology',
      },
    }
  },
})
