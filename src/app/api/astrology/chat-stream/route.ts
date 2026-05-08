import { NextResponse } from 'next/server'
import { createStreamRoute, createFallbackSSEStream } from '@/lib/streaming'
import { createAuthenticatedGuard } from '@/lib/api/middleware'
import {
  astrologyChatStreamSchema,
  type AstrologyChatStreamValidated,
} from '@/lib/api/zodValidation'
import { guardText, containsForbidden, safetyMessage } from '@/lib/textGuards'
import { sanitizeLocaleText, maskTextWithName } from '@/lib/counselor/sanitize'
import { HTTP_STATUS } from '@/lib/constants/http'
import { DATE_RE, TIME_RE } from '@/lib/validation/patterns'
import { buildThemeDepthGuide, buildEvidenceGroundingGuide } from '@/lib/prompts/fortuneWithIcp'
import { counselorVoiceBase, type CounselorLang } from '@/lib/ai/counselorVoiceBase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function clampMessages(messages: { role: string; content: string }[], max = 6) {
  return messages.slice(-max)
}

/**
 * 점성술 단독 카운슬러 시스템 프롬프트.
 *
 * 공통 voice (counselorVoiceBase) + 점성술에만 해당하는 도메인 규칙
 * (사주 섞지 마, 점성 용어 자연스럽게, 차트 데이터만).
 */
function astrologyCounselorSystemPrompt(lang: string) {
  const l: CounselorLang = lang === 'ko' ? 'ko' : 'en'
  const base = counselorVoiceBase(l)

  if (l === 'ko') {
    return [
      base,
      '',
      '[점성 카운슬러 도메인 규칙]',
      '- 이 화면은 *점성술 단독 상담*. 사주(일간·대운·오행·신살 등) 섞지 말 것.',
      '- 제공된 출생 차트·행성 위치·트랜짓·아스펙트 데이터만 사용. 차트 밖 정보 만들지 마.',
      '- 점성 용어는 자연스럽게 풀어서: "Sun이 Gemini입니다" X / "호기심으로 자기를 비추는 결" O.',
      '- 사용자가 "내 라이징 뭐야?" 처럼 사실을 직접 물으면 그때만 단답으로 노출.',
      '- 하드 아스펙트(스퀘어/오포지션) + 역행이 caution 신호일 땐 비가역 행동 즉시 권하지 않음.',
    ].join('\n')
  }

  return [
    base,
    '',
    '[Astrology-only counselor domain rules]',
    '- This is a *Western astrology only* surface. Do not mix with Eastern fortune-telling (saju, day master, shinsal).',
    '- Use only the provided birth chart, planetary positions, transits, and aspects. Do not invent.',
    '- Render astro terms as flow, not labels: "Your Sun is in Gemini" X / "A curious quality lights up the self" O.',
    '- Only expose raw astro facts when the user asks for one directly (e.g. "what is my Rising?").',
    '- When hard aspects (square / opposition) or retrogrades flag caution, do not recommend irreversible actions.',
  ].join('\n')
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
    const evidenceGuide = buildEvidenceGroundingGuide(normalizedLang)

    const chatPrompt = [
      astrologyCounselorSystemPrompt(lang),
      themeDepthGuide,
      evidenceGuide,
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
