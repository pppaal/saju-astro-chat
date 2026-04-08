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
import { normalizeCounselorResponse } from '@/lib/counselor/responseContract'
import { applyCounselorBrandVoice } from '@/lib/counselor/brandVoice'
import type { InterpretedAnswerQualityResult } from '@/lib/destiny-matrix/interpretedAnswer'

import { clampMessages } from './lib/helpers'
import { validateDestinyMapRequest } from './lib/validation'
import { analyzeCounselorQuestion, mapFocusDomainToTheme } from './lib/focusDomain'
import { prepareCounselorExecution, resolveEffectiveCounselorInputs } from './routeExecution'

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

function isCounselorCostOptimized(): boolean {
  const explicit = process.env.COUNSELOR_COST_OPTIMIZED?.trim().toLowerCase()
  if (explicit) return explicit === 'true' || explicit === '1' || explicit === 'yes'
  const shared = process.env.AI_BACKEND_COST_OPTIMIZED?.trim().toLowerCase()
  return shared === 'true' || shared === '1' || shared === 'yes'
}

function getCounselorBackendProviderHint(): string | undefined {
  const forced = process.env.COUNSELOR_BACKEND_PROVIDER?.trim().toLowerCase()
  if (forced) return forced
  const shared = process.env.AI_BACKEND_PROVIDER?.trim().toLowerCase()
  return shared || undefined
}

function getCounselorBackendModelHint(): string | undefined {
  const forced = process.env.COUNSELOR_BACKEND_MODEL?.trim()
  if (forced) return forced
  if (isCounselorCostOptimized()) {
    return process.env.CLAUDE_FAST_MODEL?.trim() || 'claude-3-haiku-20240307'
  }
  return process.env.CLAUDE_MODEL?.trim() || undefined
}

function extractCounselorTextFromSSEChunk(chunk: string): string {
  const lines = String(chunk || '').split(/\r?\n/)
  const parts: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim()
    if (!payload || payload === '[DONE]') continue

    try {
      const parsed = JSON.parse(payload) as
        | { content?: unknown; delta?: { content?: unknown }; message?: unknown }
        | string
      if (typeof parsed === 'string') {
        parts.push(parsed)
        continue
      }
      const value =
        typeof parsed.content === 'string'
          ? parsed.content
          : typeof parsed.delta?.content === 'string'
            ? parsed.delta.content
            : typeof parsed.message === 'string'
              ? parsed.message
              : ''
      if (value) parts.push(value)
    } catch {
      parts.push(payload)
    }
  }

  return parts.join('')
}

type CounselorUiEvidencePayload = {
  title?: string
  summary?: string
  bullets?: string[]
}

function decodeCounselorUiEvidence(
  encoded: string | null | undefined
): CounselorUiEvidencePayload | null {
  const value = String(encoded || '').trim()
  if (!value) return null
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
    const json = Buffer.from(normalized + padding, 'base64').toString('utf8')
    const parsed = JSON.parse(json) as CounselorUiEvidencePayload
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function buildCounselorFallbackContent(
  lang: 'ko' | 'en',
  uiEvidence: string | null | undefined,
  genericFallback: string
): string {
  const payload = decodeCounselorUiEvidence(uiEvidence)
  if (!payload) {
    return applyCounselorBrandVoice(normalizeCounselorResponse(genericFallback, lang), lang)
  }

  const summary = String(payload.summary || '').trim()
  const bullets = Array.isArray(payload.bullets)
    ? payload.bullets.map((item) => String(item || '').trim()).filter(Boolean)
    : []

  if (lang === 'ko') {
    const evidence = bullets
      .slice(0, 2)
      .map((line) => `- ${line}`)
      .join('\n')
    const action = bullets
      .filter((line) => /행동|타이밍|들어갈 조건|실행 감각|Action read|Timing read/i.test(line))
      .slice(0, 3)
      .map(
        (line) => `- ${line.replace(/^(행동 해석:|타이밍 해석:|들어갈 조건:|실행 감각:)\s*/u, '')}`
      )
      .join('\n')
    const caution = bullets
      .filter((line) => /리스크|주의|느출|Slow-down|Caution/i.test(line))
      .slice(0, 2)
      .map((line) => `- ${line.replace(/^(리스크 해석:|주의 신호:|느출 신호:)\s*/u, '')}`)
      .join('\n')

    return applyCounselorBrandVoice(
      normalizeCounselorResponse(
        [
          '## 한 줄 결론',
          summary || '지금은 성급한 확정보다 조건을 다시 확인한 뒤 움직이는 편이 맞습니다.',
          '',
          '## 근거',
          evidence ||
            '- 현재 구조와 타이밍을 함께 보면, 지금은 확정보다 검토가 더 유리한 구간으로 읽힙니다.',
          '',
          '## 실행 계획',
          action ||
            '- 오늘 가장 중요한 한 가지를 먼저 정하세요.\n- 들어가기 전 조건과 책임 범위를 먼저 확인하세요.\n- 최종 확정은 한 박자 늦게 가져가세요.',
          '',
          '## 주의/재확인',
          caution ||
            '- 서명, 결제, 확정처럼 되돌리기 어려운 행동은 한 번 더 확인한 뒤 진행하세요.\n- 상대와 핵심 조건을 한 문장으로 다시 맞춰보세요.',
        ].join('\n'),
        lang
      ),
      lang
    )
  }

  return applyCounselorBrandVoice(
    normalizeCounselorResponse(
      [
        '## Direct Answer',
        summary || 'Move with verification first and delay irreversible commitments.',
        '',
        '## Evidence',
        bullets
          .slice(0, 2)
          .map((line) => `- ${line}`)
          .join('\n') || '- Current structure and timing both favor review before commitment.',
        '',
        '## Action Plan',
        bullets
          .slice(2, 5)
          .map((line) => `- ${line}`)
          .join('\n') ||
          '- Lock one priority.\n- Confirm conditions before entry.\n- Delay final commitment until the checklist is complete.',
        '',
        '## Avoid / Recheck',
        bullets
          .slice(5, 7)
          .map((line) => `- ${line}`)
          .join('\n') || '- Recheck any irreversible action before signing, sending, or paying.',
      ].join('\n'),
      lang
    ),
    lang
  )
}

const COUNSELOR_INTERNAL_LEAK_REGEX =
  /(action axis|risk axis|structure axis|questionframe=|primary_domain=|why_\d+=|next_move=|frame=|timing_best=|timing_now=|_window\b|scenario id)/i

function hasRequiredCounselorSections(text: string, lang: 'ko' | 'en'): boolean {
  if (lang === 'ko') {
    return (
      text.includes('## 한 줄 결론') &&
      text.includes('## 근거') &&
      text.includes('## 실행 계획') &&
      text.includes('## 주의/재확인')
    )
  }
  return (
    text.includes('## Direct Answer') &&
    text.includes('## Evidence') &&
    text.includes('## Action Plan') &&
    text.includes('## Avoid / Recheck')
  )
}

function finalizeCounselorContent(params: {
  rawText: string
  lang: 'ko' | 'en'
  uiEvidence: string | null | undefined
  interpretedAnswerQuality?: InterpretedAnswerQualityResult | null
}): string {
  const { rawText, lang, uiEvidence, interpretedAnswerQuality } = params
  const genericFallback =
    lang === 'ko'
      ? '지금은 성급한 확정보다 조건을 다시 확인한 뒤 움직이는 편이 맞습니다.'
      : 'Move with verification first and delay irreversible commitments.'
  const normalized = applyCounselorBrandVoice(normalizeCounselorResponse(rawText, lang), lang)

  if (!normalized.trim()) {
    return buildCounselorFallbackContent(lang, uiEvidence, genericFallback)
  }

  const warnings: string[] = []
  if (interpretedAnswerQuality && !interpretedAnswerQuality.pass) {
    warnings.push(...interpretedAnswerQuality.warnings.map((item) => `contract:${item}`))
  }
  if (COUNSELOR_INTERNAL_LEAK_REGEX.test(normalized)) {
    warnings.push('text:internal_leak')
  }
  if (!hasRequiredCounselorSections(normalized, lang)) {
    warnings.push('text:missing_required_sections')
  }

  if (warnings.length > 0) {
    logger.warn('[chat-stream] Counselor style gate fallback', {
      lang,
      warnings,
    })
    return buildCounselorFallbackContent(lang, uiEvidence, genericFallback)
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
        provider_hint: getCounselorBackendProviderHint(),
        model_hint: getCounselorBackendModelHint(),
        quality_tier: isCounselorCostOptimized() ? 'fast' : 'quality',
        cost_optimized: isCounselorCostOptimized(),
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

      const fallbackContent = buildCounselorFallbackContent(
        preparedInputs.lang,
        preparedExecution.counselorUiEvidence,
        fallback
      )

      return createFallbackSSEStream({
        content: fallbackContent,
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
      extractText: (chunk) =>
        maskTextWithName(
          sanitizeLocaleText(extractCounselorTextFromSSEChunk(chunk), preparedInputs.lang),
          preparedInputs.name
        ),
      finalizeText: (fullText) =>
        finalizeCounselorContent({
          rawText: fullText,
          lang: preparedInputs.lang,
          uiEvidence: preparedExecution.counselorUiEvidence,
          interpretedAnswerQuality: preparedExecution.interpretedAnswerQuality,
        }),
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
