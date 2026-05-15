import { NextRequest } from 'next/server'
import {
  initializeApiContext,
  createAuthenticatedGuard,
  extractLocale,
  type MiddlewareOptions,
} from '@/lib/api/middleware'
import { createFallbackSSEStream } from '@/lib/streaming'
import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'
import { counselorSystemPrompt } from '@/app/api/destiny-map/chat-stream/lib/helpers'
import { containsForbidden, safetyMessage } from '@/lib/textGuards'
import { sanitizeLocaleText } from '@/lib/destiny-map/sanitize'
import { maskTextWithName } from '@/lib/security'
import { enforceBodySize } from '@/lib/http'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { logger } from '@/lib/logger'
import { parseRequestBody } from '@/lib/api/requestParser'
import { createValidationErrorResponse } from '@/lib/api/zodValidation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { normalizeCounselorResponse } from '@/lib/counselor/responseContract'
import { applyCounselorBrandVoice } from '@/lib/counselor/brandVoice'

import { clampMessages } from './lib/helpers'
import { validateDestinyMapRequest } from './lib/validation'
import { prepareCounselorExecution, resolveEffectiveCounselorInputs } from './routeExecution'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

const GUEST_CHAT_RATE_LIMIT = {
  limit: 12,
  windowSeconds: 60,
} as const

// 게스트 카운슬러 무료 체험: 2턴까지 허용 후 로그인 유도
const GUEST_COUNSELOR_TURN_LIMIT = 2
const GUEST_COUNSELOR_TURN_COOKIE = 'guest_counselor_turns'
const GUEST_COUNSELOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30일

function readGuestCounselorTurns(req: NextRequest): number {
  const raw = req.cookies.get(GUEST_COUNSELOR_TURN_COOKIE)?.value
  if (!raw) return 0
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function buildGuestTurnCookie(nextTurnCount: number): string {
  const parts = [
    `${GUEST_COUNSELOR_TURN_COOKIE}=${nextTurnCount}`,
    'Path=/',
    `Max-Age=${GUEST_COUNSELOR_COOKIE_MAX_AGE}`,
    'SameSite=Lax',
    'HttpOnly',
  ]
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure')
  }
  return parts.join('; ')
}

function buildCounselorFallbackContent(lang: 'ko' | 'en', genericFallback: string): string {
  return applyCounselorBrandVoice(normalizeCounselorResponse(genericFallback, lang), lang)
}

function finalizeCounselorContent(params: { rawText: string; lang: 'ko' | 'en' }): string {
  const { rawText, lang } = params
  const genericFallback =
    lang === 'ko'
      ? '지금은 성급한 확정보다 조건을 다시 확인한 뒤 움직이는 편이 맞습니다.'
      : 'Move with verification first and delay irreversible commitments.'
  const normalized = applyCounselorBrandVoice(normalizeCounselorResponse(rawText, lang), lang)
  if (!normalized.trim()) {
    return buildCounselorFallbackContent(lang, genericFallback)
  }
  return normalized
}

export async function POST(req: NextRequest) {
  let context: Awaited<ReturnType<typeof initializeApiContext>>['context'] | null = null
  let isGuestMode = true

  try {
    const oversized = enforceBodySize(req, 256 * 1024)
    if (oversized) {
      return oversized
    }

    const authedGuardOptions = createAuthenticatedGuard({
      route: 'destiny-map-chat-stream',
      limit: 60,
      windowSeconds: 60,
      requireCredits: true,
      creditType: 'reading',
      creditAmount: 1,
    })

    const guestGuardOptions: MiddlewareOptions = {
      route: 'destiny-map-chat-stream-guest',
      rateLimit: {
        limit: GUEST_CHAT_RATE_LIMIT.limit,
        windowSeconds: GUEST_CHAT_RATE_LIMIT.windowSeconds,
      },
    }

    let prefersAuthedGuard = false
    try {
      const session = await getServerSession(authOptions)
      prefersAuthedGuard = Boolean(session?.user)
    } catch {
      prefersAuthedGuard = false
    }

    let initialized = await initializeApiContext(
      req,
      prefersAuthedGuard ? authedGuardOptions : guestGuardOptions
    )

    if (prefersAuthedGuard && initialized.error && initialized.error.status === 401) {
      initialized = await initializeApiContext(req, guestGuardOptions)
    }

    const { context: ctx, error } = initialized
    context = ctx
    if (error) {
      return error
    }
    isGuestMode = !context.userId

    // 게스트 무료 체험 한도 (2턴) 체크
    let guestTurnsUsed = 0
    if (isGuestMode) {
      guestTurnsUsed = readGuestCounselorTurns(req)
      if (guestTurnsUsed >= GUEST_COUNSELOR_TURN_LIMIT) {
        return createErrorResponse({
          code: ErrorCodes.UNAUTHORIZED,
          message: '무료 체험 2회를 모두 사용했어요. 로그인하면 가입 보너스 2 크레딧으로 계속 이용할 수 있어요.',
          locale: extractLocale(req),
          route: 'destiny-map/chat-stream',
          headers: { 'X-Guest-Limit-Reached': '1' },
        })
      }
    }

    const userId = context.userId
    const body = await parseRequestBody<Record<string, unknown>>(req, {
      context: 'Destiny-map Chat-stream',
    })
    if (!body) {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
      })
    }

    const validation = validateDestinyMapRequest(body)
    if (!validation.success) {
      logger.warn('[chat-stream] Validation failed', { errors: validation.error.issues })
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
      })
    }

    const validated = validation.data
    const trimmedHistory = clampMessages(validated.messages)
    const lastUser = [...trimmedHistory].reverse().find((m) => m.role === 'user')

    const resolvedInputs = await resolveEffectiveCounselorInputs({
      validated,
      userId,
    })
    if (resolvedInputs.error) {
      return createErrorResponse({
        code: resolvedInputs.error.code,
        message: resolvedInputs.error.message,
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
      })
    }
    const preparedInputs = resolvedInputs.data!

    if (lastUser && containsForbidden(lastUser.content)) {
      const encoder = new TextEncoder()
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${safetyMessage(validated.lang)}\n\n`))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          },
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Guest-Mode': isGuestMode ? '1' : '0',
          },
        }
      )
    }

    const preparedExecution = await prepareCounselorExecution({
      userId,
      inputs: preparedInputs,
    })

    try {
      return await streamClaudeAsSSE({
        systemPrompt: counselorSystemPrompt(preparedInputs.lang),
        cachedUserContext: preparedExecution.chatPromptCachedContext,
        userPrompt: preparedExecution.chatPromptDynamicTail,
        // 3500 picked so deep "내 인생 큰 그림" type answers don't cut
        // mid-sentence. Previous 2500 was hitting the ceiling when the
        // LLM bloated output with markdown structure; even after the
        // strict no-markdown prompt + post-render strip, leave the
        // ceiling generous so prose replies are never truncated.
        maxTokens: 3500,
        temperature: 0.7,
        timeoutMs: 60000,
        label: 'counselor-chat-stream',
        transform: (chunk) =>
          maskTextWithName(sanitizeLocaleText(chunk, preparedInputs.lang), preparedInputs.name),
        finalize: (fullText) => {
          const finalized = finalizeCounselorContent({
            rawText: fullText,
            lang: preparedInputs.lang,
          })
          return finalized && finalized !== fullText ? finalized.slice(fullText.length) : null
        },
        additionalHeaders: {
          'X-Fallback': '0',
          'X-Guest-Mode': isGuestMode ? '1' : '0',
          ...(isGuestMode
            ? {
                'Set-Cookie': buildGuestTurnCookie(guestTurnsUsed + 1),
                'X-Guest-Turns-Remaining': String(
                  Math.max(0, GUEST_COUNSELOR_TURN_LIMIT - (guestTurnsUsed + 1))
                ),
              }
            : {}),
        },
      })
    } catch (claudeErr) {
      logger.error('[DestinyMapChatStream] Claude error:', {
        error: claudeErr instanceof Error ? claudeErr.message : String(claudeErr),
      })

      if (context.refundCreditsOnError) {
        await context.refundCreditsOnError(`Claude error: ${claudeErr instanceof Error ? claudeErr.message : 'unknown'}`, {
          route: 'destiny-map-chat-stream',
        })
      }

      const fallback =
        preparedInputs.lang === 'ko'
          ? 'AI 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.'
          : 'Could not connect to AI service. Please try again.'

      return createFallbackSSEStream({
        content: buildCounselorFallbackContent(preparedInputs.lang, fallback),
        done: true,
        'X-Fallback': '1',
        'X-Guest-Mode': isGuestMode ? '1' : '0',
      })
    }

  } catch (err: unknown) {
    logger.error('[Chat-Stream API error]', err)

    if (context?.refundCreditsOnError) {
      await context.refundCreditsOnError(err instanceof Error ? err.message : 'Unknown error', {
        route: 'destiny-map-chat-stream',
      })
    }

    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      route: 'destiny-map/chat-stream',
      originalError: err instanceof Error ? err : new Error(String(err)),
    })
  }
}
