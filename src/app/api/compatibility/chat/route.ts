import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  extractLocale,
  type ApiContext,
} from '@/lib/api/middleware'
import { createFallbackSSEStream } from '@/lib/streaming'
import { askClaude } from '@/lib/llm/askClaude'
import { guardText, containsForbidden, safetyMessage } from '@/lib/textGuards'
import { logger } from '@/lib/logger'
import { type ChatMessage } from '@/lib/api'
import {
  compatibilityChatRequestSchema,
  createValidationErrorResponse,
} from '@/lib/api/zodValidation'
import { performExtendedSajuAnalysis } from '@/lib/compatibility/saju/comprehensive'
import { performExtendedAstrologyAnalysis } from '@/lib/compatibility/astrology/comprehensive'
import {
  buildPersonSeed,
  buildAutoSajuContext,
  buildAutoAstroContext,
  buildSajuProfile,
  buildExtendedAstroProfile,
  getAgeFromBirthDate,
} from '@/app/api/compatibility/counselor/routeSupport'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function clampMessages(messages: ChatMessage[], max = 6) {
  return messages.slice(-max)
}

function stringifyForPrompt(value: unknown): string {
  try {
    const seen = new WeakSet<object>()
    return JSON.stringify(
      value,
      (_key, nested) => {
        if (nested && typeof nested === 'object') {
          if (seen.has(nested as object)) return '[Circular]'
          seen.add(nested as object)
        }
        return nested
      },
      2
    )
  } catch {
    return ''
  }
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
    const {
      persons,
      compatibilityResult = '',
      theme = 'general',
      lang = context.locale,
      messages,
    } = body

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

    // Compute extended saju/astro analyses for the pair so the LLM has
    // the same depth of evidence the counselor route gets — best effort,
    // never fails the chat (lighter completeness than counselor).
    let extendedSajuBlock = ''
    let extendedAstroBlock = ''
    try {
      const seed1 = buildPersonSeed((persons?.[0] as Record<string, unknown>) || null)
      const seed2 = buildPersonSeed((persons?.[1] as Record<string, unknown>) || null)
      const now = new Date()
      const [auto1Saju, auto2Saju, auto1Astro, auto2Astro] = await Promise.all([
        buildAutoSajuContext(seed1, now),
        buildAutoSajuContext(seed2, now),
        buildAutoAstroContext(seed1, now),
        buildAutoAstroContext(seed2, now),
      ])
      const p1Saju = buildSajuProfile(auto1Saju)
      const p2Saju = buildSajuProfile(auto2Saju)
      const p1ExtAstro = buildExtendedAstroProfile(auto1Astro)
      const p2ExtAstro = buildExtendedAstroProfile(auto2Astro)
      const p1Age = getAgeFromBirthDate(persons?.[0]?.date)
      const p2Age = getAgeFromBirthDate(persons?.[1]?.date)

      if (p1Saju && p2Saju) {
        const sajuAnalysis = performExtendedSajuAnalysis(
          p1Saju,
          p2Saju,
          p1Age,
          p2Age,
          now.getFullYear()
        )
        extendedSajuBlock = `\n== 사주 심화 분석 ==\n${stringifyForPrompt(sajuAnalysis).slice(0, 3500)}`
      }
      if (p1ExtAstro && p2ExtAstro) {
        const astroAnalysis = performExtendedAstrologyAnalysis(
          p1ExtAstro,
          p2ExtAstro,
          Math.abs(p1Age - p2Age)
        )
        extendedAstroBlock = `\n== 점성 심화 분석 ==\n${stringifyForPrompt(astroAnalysis).slice(0, 3500)}`
      }
    } catch (enrichErr) {
      logger.warn('[Compatibility chat] enrichment failed (non-fatal):', enrichErr)
    }

    // Build prompt for compatibility chat
    const chatPrompt = [
      `== 궁합 상담 ==`,
      personsInfo,
      compatibilityResult ? `\n== 이전 분석 결과 ==\n${guardText(compatibilityResult, 2000)}` : '',
      extendedSajuBlock,
      extendedAstroBlock,
      historyText ? `\n== 대화 ==\n${historyText}` : '',
      `\n== 질문 ==\n${userQuestion}`,
    ]
      .filter(Boolean)
      .join('\n')

    // Call backend AI
    try {
      const response = await askClaude(chatPrompt, {
        theme: theme || 'compatibility',
        maxTokens: 2000,
        timeoutMs: 60000,
        label: 'compatibility-chat',
      })

      if (!response.ok) {
        throw new Error(`Claude returned error: ${response.error || response.status}`)
      }

      const answer = String(
        response.data?.data?.report ||
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
