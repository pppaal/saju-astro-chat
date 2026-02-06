// src/app/api/dream/chat/route.ts
// Dream Follow-up Chat API - Enhanced with RAG, Celestial, and Saju context

import { NextRequest } from 'next/server'
import { initializeApiContext, createPublicStreamGuard, extractLocale } from '@/lib/api/middleware'
import { createSSEStreamProxy } from '@/lib/streaming'
import { apiClient } from '@/lib/api/ApiClient'
import { enforceBodySize } from '@/lib/http'
import { logger } from '@/lib/logger'
import { dreamChatRequestSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'

import { BODY_LIMITS } from '@/lib/constants/api-limits'
const MAX_CHAT_BODY = BODY_LIMITS.LARGE

export async function POST(req: NextRequest) {
  try {
    // Apply middleware: rate limiting + public token auth + credit consumption
    const guardOptions = createPublicStreamGuard({
      route: 'dream-chat',
      limit: 20,
      windowSeconds: 60,
      requireCredits: true,
      creditType: 'followUp', // 꿈 해몽 후속 질문은 followUp 타입 사용
      creditAmount: 1,
    })

    const { context, error } = await initializeApiContext(req, guardOptions)
    if (error) {
      return error
    }

    const oversized = enforceBodySize(req, MAX_CHAT_BODY)
    if (oversized) {
      return oversized
    }

    const rawBody = await req.json()
    const validationResult = dreamChatRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[dream/chat] validation failed', { errors: validationResult.error.issues })
      return createValidationErrorResponse(validationResult.error, {
        locale: extractLocale(req),
        route: 'dream/chat',
      })
    }

    const { messages, dreamContext, locale: bodyLocale } = validationResult.data
    const locale = bodyLocale || (context.locale as 'ko' | 'en') || 'ko'

    // Credits already consumed by middleware

    // Build backend request with all context
    const backendPayload = {
      messages: messages,
      dream_context: {
        dream_text: dreamContext.dreamText,
        summary: dreamContext.summary,
        symbols: dreamContext.symbols,
        emotions: dreamContext.emotions,
        themes: dreamContext.themes,
        recommendations: dreamContext.recommendations,
        // Enhanced context for RAG + Saju + Celestial
        cultural_notes: dreamContext.cultural_notes,
        celestial: dreamContext.celestial,
        saju: dreamContext.saju,
        // Previous consultations for memory/continuity
        previous_consultations: dreamContext.previous_consultations,
        persona_memory: dreamContext.persona_memory,
      },
      language: locale,
    }

    logger.info('[DreamChat] Sending enhanced context to backend:', {
      hasContext: !!dreamContext,
      hasCultural: !!dreamContext.cultural_notes,
      hasCelestial: !!dreamContext.celestial,
      hasSaju: !!dreamContext.saju,
      hasPreviousConsultations: !!dreamContext.previous_consultations?.length,
      hasPersonaMemory: !!dreamContext.persona_memory,
      symbolCount: dreamContext.symbols?.length || 0,
    })

    // Call backend streaming endpoint using apiClient (extended timeout for RAG)
    const streamResult = await apiClient.postSSEStream('/api/dream/chat-stream', backendPayload, {
      timeout: 45000,
    })

    if (!streamResult.ok) {
      logger.error('[DreamChat] Backend error:', {
        status: streamResult.status,
        error: streamResult.error,
      })
      return createErrorResponse({
        code: ErrorCodes.BACKEND_ERROR,
        message: streamResult.error || 'Backend service error',
        locale: extractLocale(req),
        route: 'dream/chat',
      })
    }

    // Proxy the SSE stream from backend to client
    return createSSEStreamProxy({
      source: streamResult.response,
      route: 'DreamChat',
    })
  } catch (err: unknown) {
    logger.error('Dream chat error:', err)
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      route: 'dream/chat',
      originalError: err instanceof Error ? err : new Error(String(err)),
    })
  }
}
