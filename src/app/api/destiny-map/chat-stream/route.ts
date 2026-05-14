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
import type { InterpretedAnswerQualityResult } from '@/lib/destiny-matrix/interpretedAnswer'

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

function isCounselorStrictMatrixEnabled(): boolean {
  const raw = process.env.COUNSELOR_STRICT_MATRIX?.trim().toLowerCase()
  if (raw === 'true') return true
  if (raw === 'false') return false
  return process.env.NODE_ENV !== 'test'
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

// Style gate runs only on real failures: empty model output, internal-prompt
// leak, or interpreted-answer-quality contract violation. The previous gate
// also fired on "missing required sections" which clobbered legitimate
// short / conversational replies — those are explicitly allowed by the
// system prompt (it labels the 4-section format as "참고용 — 강제 형식 아님").
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
      req,
      userId,
      inputs: preparedInputs,
      strictMatrixEnabled: isCounselorStrictMatrixEnabled(),
    })

    if (preparedExecution.isStrictMatrixFailure) {
      logger.error('[chat-stream] Matrix snapshot unavailable (strict mode)', {
        userId: userId || 'guest',
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
            ? '공유된 매트릭스 스냅샷이 없어 상담을 중단합니다. 잠시 후 다시 시도해주세요.'
            : 'Counseling stopped because the shared matrix snapshot is unavailable. Please try again.',
        locale: extractLocale(req),
        route: 'destiny-map/chat-stream',
        headers: {
          'X-Matrix-Strict': '1',
          'X-Matrix-Snapshot': 'missing',
        },
      })
    }

    // Claude 직접 호출 (Python backend `/ask-stream` 대체)
    try {
      // Multi-turn caching: cachedUserContext = system + 차트/sections (안정),
      // userPrompt = 이번 턴의 history + 새 질문 (변동). 같은 유저의 다음 턴이
      // 5분 안에 들어오면 cached block은 cache_read 단가($0.10/1M, 90% 할인).
      return await streamClaudeAsSSE({
        systemPrompt: counselorSystemPrompt(preparedInputs.lang),
        cachedUserContext: preparedExecution.chatPromptCachedContext,
        userPrompt: preparedExecution.chatPromptDynamicTail,
        maxTokens: 2500,
        temperature: 0.7,
        timeoutMs: 60000,
        label: 'counselor-chat-stream',
        transform: (chunk) =>
          maskTextWithName(sanitizeLocaleText(chunk, preparedInputs.lang), preparedInputs.name),
        finalize: (fullText) => {
          const finalized = finalizeCounselorContent({
            rawText: fullText,
            lang: preparedInputs.lang,
            uiEvidence: preparedExecution.counselorUiEvidence,
            interpretedAnswerQuality: preparedExecution.interpretedAnswerQuality,
          })
          // finalize는 *전체 보강 문자열* 반환. 토큰으로 흘리고 끝에 한 번 더 송출.
          return finalized && finalized !== fullText ? finalized.slice(fullText.length) : null
        },
        additionalHeaders: {
          'X-Fallback': '0',
          ...(preparedExecution.counselorUiEvidence
            ? { 'X-Counselor-Evidence': preparedExecution.counselorUiEvidence }
            : {}),
          ...(preparedExecution.predictionId
            ? { 'X-Destiny-Prediction-Id': preparedExecution.predictionId }
            : {}),
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
