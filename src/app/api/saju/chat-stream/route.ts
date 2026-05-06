import { NextResponse } from 'next/server'
import { createStreamRoute, createFallbackSSEStream } from '@/lib/streaming'
import { createAuthenticatedGuard } from '@/lib/api/middleware'
import { sajuChatStreamSchema, type SajuChatStreamValidated } from '@/lib/api/zodValidation'
import { guardText, containsForbidden, safetyMessage } from '@/lib/textGuards'
import { sanitizeLocaleText, maskTextWithName } from '@/lib/destiny-map/sanitize'
import { HTTP_STATUS } from '@/lib/constants/http'
import { buildThemeDepthGuide, buildEvidenceGroundingGuide } from '@/lib/prompts/fortuneWithIcp'
import { counselorVoiceBase, type CounselorLang } from '@/lib/ai/counselorVoiceBase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function clampMessages(messages: { role: string; content: string }[], max = 6) {
  return messages.slice(-max)
}

/**
 * 사주 단독 카운슬러 시스템 프롬프트.
 *
 * 공통 voice (counselorVoiceBase) + 사주에만 해당하는 도메인 규칙
 * (점성 섞지 마, 사주 용어 자연스럽게, 제공된 운세 데이터만).
 */
function sajuCounselorSystemPrompt(lang: string) {
  const l: CounselorLang = lang === 'ko' ? 'ko' : 'en'
  const base = counselorVoiceBase(l)

  if (l === 'ko') {
    return [
      base,
      '',
      '[사주 카운슬러 도메인 규칙]',
      '- 이 화면은 *사주 단독 상담*. 서양 점성술(별자리·하우스·트랜짓 등) 섞지 말 것.',
      '- 제공된 대운·세운·일간·용신 데이터만 사용. 차트 밖 정보 만들지 마.',
      '- 사주 용어는 자연스럽게 풀어서: "일간 庚金입니다" X / "기준이 또렷하고 잘 안 휘는 결" O.',
      '- 사용자가 "내 일간이 뭐야?" 처럼 사실을 직접 물으면 그때만 단답으로 노출.',
      '- 천간충·지지합·신살이 caution 신호일 땐 비가역 행동 즉시 권하지 않음.',
    ].join('\n')
  }

  return [
    base,
    '',
    '[Saju-only counselor domain rules]',
    '- This is a *Saju-only* surface. Do not mix with Western astrology (signs, houses, transits).',
    '- Use only the provided daeun / seun / day-master / yongsin data. Do not invent periods.',
    '- Render saju terms as flow, not labels: "Your day master is 庚 metal" X / "There is a clear, hard-to-bend edge here" O.',
    '- Only expose raw saju facts when the user asks for one directly (e.g. "what is my day master?").',
    '- When stem/branch clashes or shinsal flag caution, do not recommend irreversible actions.',
  ].join('\n')
}

export const POST = createStreamRoute<SajuChatStreamValidated>({
  route: 'SajuChatStream',
  guard: createAuthenticatedGuard({
    route: 'saju-chat-stream',
    limit: 60,
    windowSeconds: 60,
    requireCredits: true,
    creditType: 'reading',
    creditAmount: 1,
  }),
  schema: sajuChatStreamSchema,
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
    const birthDate = typeof rawBody.birthDate === 'string' ? rawBody.birthDate.trim() : ''
    const birthTime = typeof rawBody.birthTime === 'string' ? rawBody.birthTime.trim() : ''
    const gender = typeof rawBody.gender === 'string' ? rawBody.gender : 'male'
    const theme = typeof rawBody.theme === 'string' ? rawBody.theme.trim().slice(0, 100) : 'life'
    const lang = validated.locale || (context.locale as string)
    const userContext =
      typeof rawBody.userContext === 'string' ? rawBody.userContext.slice(0, 1000) : undefined

    if (!birthDate || !birthTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
      sajuCounselorSystemPrompt(lang),
      themeDepthGuide,
      evidenceGuide,
      `Name: ${name || 'User'}`,
      `Birth: ${birthDate} ${birthTime}`,
      `Gender: ${gender}`,
      `Theme: ${theme}`,
      historyText ? `\nConversation:\n${historyText}` : '',
      `\nQuestion: ${userQuestion}`,
    ]
      .filter(Boolean)
      .join('\n')

    const sessionId = req.headers.get('x-session-id') || undefined

    return {
      endpoint: '/saju/ask-stream',
      body: {
        theme,
        prompt: chatPrompt,
        locale: lang,
        saju: validated.saju || undefined,
        birth: { date: birthDate, time: birthTime, gender },
        history: trimmedHistory.filter((m) => m.role !== 'system'),
        session_id: sessionId,
        user_context: userContext || undefined,
        counselor_type: 'saju',
      },
    }
  },
})
