import { NextRequest } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, extractLocale, type ApiContext } from '@/lib/api/middleware'
import { createFallbackSSEStream } from '@/lib/streaming'
import { apiClient } from '@/lib/api/ApiClient'
import { guardText, containsForbidden, safetyMessage } from '@/lib/textGuards'
import { logger } from '@/lib/logger'
import { type ChatMessage } from '@/lib/api'
import { compatibilityChatRequestSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function clampMessages(messages: ChatMessage[], max = 6) {
  return messages.slice(-max)
}

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const rawBody = await req.json()

    // Validate with Zod
    const validationResult = compatibilityChatRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Compatibility chat] validation failed', {
        errors: validationResult.error.issues,
      })
      return createValidationErrorResponse(validationResult.error, {
        locale: extractLocale(req),
        route: 'compatibility/chat',
      })
    }

    const body = validationResult.data
    const { persons, compatibilityResult = '', lang = context.locale, messages } = body

    const trimmedHistory = clampMessages(messages)

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

    // Format persons info
    const personsInfo = persons
      .map(
        (p: { name?: string; date?: string; time?: string; relation?: string }, i: number) =>
          `Person ${i + 1}: ${p.name || `Person ${i + 1}`} (${p.date} ${p.time})${i > 0 ? ` - ${p.relation || 'partner'}` : ''}`
      )
      .join('\n')

    // Build prompt for compatibility chat
    const chatPrompt = [
      `== 궁합 상담 ==`,
      personsInfo,
      compatibilityResult ? `\n== 이전 분석 결과 ==\n${guardText(compatibilityResult, 2000)}` : '',
      historyText ? `\n== 대화 ==\n${historyText}` : '',
      `\n== 질문 ==\n${userQuestion}`,
    ]
      .filter(Boolean)
      .join('\n')

    // Call backend AI
    try {
      const response = await apiClient.post(
        '/api/compatibility/chat',
        {
          persons,
          prompt: chatPrompt,
          question: userQuestion,
          history: trimmedHistory,
          locale: lang,
          compatibility_context: compatibilityResult,
        },
        { timeout: 60000 }
      )

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`)
      }

      const aiData = response.data as Record<string, unknown>
      const answer = String(
        (aiData?.data as Record<string, unknown>)?.response ||
          aiData?.response ||
          aiData?.interpretation ||
          (lang === 'ko'
            ? '죄송합니다. 응답을 생성할 수 없습니다. 다시 시도해 주세요.'
            : 'Sorry, unable to generate a response. Please try again.')
      )

      // Stream response in chunks for better UX
      const encoder = new TextEncoder()
      return new Response(
        new ReadableStream({
          start(controller) {
            const chunks = answer.match(/.{1,50}/g) || [answer]
            chunks.forEach((chunk: string, index: number) => {
              setTimeout(() => {
                controller.enqueue(encoder.encode(`data: ${chunk}\n\n`))
                if (index === chunks.length - 1) {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  controller.close()
                }
              }, index * 20)
            })
          },
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      )
    } catch (fetchError) {
      logger.error('[Compatibility Chat] Backend error:', fetchError)

      const fallback =
        lang === 'ko'
          ? 'AI 서버 연결에 문제가 있습니다. 잠시 후 다시 시도해 주세요.'
          : 'AI server connection issue. Please try again later.'

      return createFallbackSSEStream({
        content: fallback,
        done: true,
      })
    }
  },
  createAuthenticatedGuard({
    route: 'compatibility-chat',
    limit: 60,
    windowSeconds: 60,
    requireCredits: true,
    creditType: 'compatibility',
    creditAmount: 1,
  })
)
