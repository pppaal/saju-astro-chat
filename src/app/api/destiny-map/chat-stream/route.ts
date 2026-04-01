import { NextRequest } from 'next/server'
import {
  initializeApiContext,
  createAuthenticatedGuard,
  extractLocale,
  type MiddlewareOptions,
} from '@/lib/api/middleware'
import { createTransformedSSEStream, createFallbackSSEStream } from '@/lib/streaming'
import { apiClient } from '@/lib/api/ApiClient'
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

import { clampMessages } from './lib/helpers'
import { validateDestinyMapRequest } from './lib/validation'
import { analyzeCounselorQuestion, mapFocusDomainToTheme } from './lib/focusDomain'
import {
  prepareCounselorExecution,
  resolveEffectiveCounselorInputs,
} from './routeExecution'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

const GUEST_CHAT_RATE_LIMIT = {
  limit: 12,
  windowSeconds: 60,
} as const

function isCounselorStrictMatrixEnabled(): boolean {
  const raw = process.env.COUNSELOR_STRICT_MATRIX?.trim().toLowerCase()
  if (raw === 'true') return true
  if (raw === 'false') return false
  return process.env.NODE_ENV !== 'test'
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
    const questionAnalysis = analyzeCounselorQuestion({
      lastUserMessage: lastUser?.content,
      theme: validated.theme,
    })
    const inferredTheme = mapFocusDomainToTheme(questionAnalysis.primaryDomain)
    const effectiveTheme = validated.theme === 'chat' ? inferredTheme : validated.theme

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
      req,
      userId,
      inputs: preparedInputs,
      strictMatrixEnabled: isCounselorStrictMatrixEnabled(),
    })

    if (preparedExecution.isStrictMatrixFailure) {
      logger.error('[chat-stream] Matrix snapshot unavailable (strict mode)', {
        userId: userId || 'guest',
        theme: effectiveTheme,
        lang: validated.lang,
      })
      if (context?.refundCreditsOnError) {
        await context.refundCreditsOnError('Matrix snapshot unavailable in strict mode', {
          route: 'destiny-map-chat-stream',
          stage: 'matrix-snapshot',
          strictMode: true,
        })
      }
      return createErrorResponse({
        code: ErrorCodes.INTERNAL_ERROR,
        message:
          validated.lang === 'ko'
            ? '??? ?? ???? ???? ???? ?????. ?? ? ?? ??????.'
            : 'Counseling stopped because the shared matrix snapshot is unavailable. Please try again.',
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
        headers: {
          'X-Matrix-Strict': '1',
          'X-Matrix-Snapshot': 'missing',
        },
      })
    }

    const streamResult = await apiClient.postSSEStream(
      '/ask-stream',
      {
        theme: preparedExecution.promptTheme,
        prompt: preparedExecution.chatPrompt,
        locale: preparedInputs.lang,
        saju: preparedExecution.backendSaju || preparedInputs.effectiveSaju || undefined,
        astro: preparedExecution.backendAstro || preparedInputs.effectiveAstro || undefined,
        birth: {
          date: preparedInputs.effectiveBirthDate,
          time: preparedInputs.effectiveBirthTime,
          gender: preparedInputs.effectiveGender,
          lat: preparedInputs.effectiveLatitude,
          lon: preparedInputs.effectiveLongitude,
        },
        history: preparedInputs.trimmedHistory.filter((m) => m.role !== 'system'),
        session_id: req.headers.get('x-session-id') || undefined,
        user_context: preparedInputs.userContext || undefined,
        cv_text: preparedInputs.cvText || undefined,
      },
      { timeout: 60000 }
    )

    if (!streamResult.ok) {
      logger.error('[DestinyMapChatStream] Backend error:', {
        status: streamResult.status,
        error: streamResult.error,
      })

      if (context.refundCreditsOnError) {
        await context.refundCreditsOnError(`Backend stream error: ${streamResult.status}`, {
          route: 'destiny-map-chat-stream',
          status: streamResult.status,
        })
      }

      const fallback =
        preparedInputs.lang === 'ko'
          ? 'AI ???? ???? ?????. ?? ? ?? ??????.'
          : 'Could not connect to AI service. Please try again.'

      return createFallbackSSEStream({
        content: fallback,
        done: true,
        'X-Fallback': '1',
        ...(preparedExecution.counselorUiEvidence
          ? { 'X-Counselor-Evidence': preparedExecution.counselorUiEvidence }
          : {}),
        ...(preparedExecution.predictionId
          ? { 'X-Destiny-Prediction-Id': preparedExecution.predictionId }
          : {}),
        'X-Guest-Mode': isGuestMode ? '1' : '0',
      })
    }

    return createTransformedSSEStream({
      source: streamResult.response,
      transform: (chunk) => {
        return maskTextWithName(sanitizeLocaleText(chunk, preparedInputs.lang), preparedInputs.name)
      },
      route: 'DestinyMapChatStream',
      additionalHeaders: {
        'X-Fallback': streamResult.response.headers.get('x-fallback') || '0',
        ...(preparedExecution.counselorUiEvidence
          ? { 'X-Counselor-Evidence': preparedExecution.counselorUiEvidence }
          : {}),
        ...(preparedExecution.predictionId
          ? { 'X-Destiny-Prediction-Id': preparedExecution.predictionId }
          : {}),
        'X-Guest-Mode': isGuestMode ? '1' : '0',
      },
    })
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
