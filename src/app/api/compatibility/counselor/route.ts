import { NextRequest, NextResponse } from 'next/server'
import { initializeApiContext, createAuthenticatedGuard } from '@/lib/api/middleware'
import { createFallbackSSEStream } from '@/lib/streaming'
import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'
import { PREMIUM_CLAUDE_MODEL } from '@/lib/llm/claude'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { containsForbidden, safetyMessage } from '@/lib/textGuards'
import { isSelfHarm, crisisMessage } from '@/lib/safety/crisis'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { compatibilityCounselorRequestSchema } from '@/lib/api/zodValidation'
import { consumeCredits } from '@/lib/credits/creditService'
import { refundCreditsOnce } from '@/lib/credits/refundOnce'
import { createIdempotencyStore } from '@/lib/api/idempotency'
import { cacheSet } from '@/lib/cache/redis-cache'
import { getUserDisplayName } from '@/lib/user/displayName'
import { buildCompatibilityCounselorContext } from '@/lib/compatibility/counselor/buildCounselorContext'

// 끊긴 턴 복원용 캐시 키 — userId 를 포함해 ownership 검증 (다른 사용자가
// turnId 알아도 조회 불가). 게스트는 끊김 복구 미지원 (turnId 보관 안 함).
export const compatTurnResultKey = (userId: string, turnId: string) =>
  `compat:turn-result:${userId}:${turnId}`

// 30분 — 크레딧 충전하러 갔다 오는 왕복도 복구되게 (10→30분).
export const COMPAT_TURN_RESULT_TTL_SEC = 1800

// 새로고침/뒤로가기/다른 탭 등으로 같은 user turn 이 재진입할 때 크레딧
// 중복 차감 방지. 클라이언트가 매 메시지에 UUID 를 x-idempotency-key 헤더로
// 보냄. 같은 키 재진입 시 차감만 스킵.
const idemStore = createIdempotencyStore('compatibility-counselor')

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 90

import { clampMessages } from './routeSupport'

export async function POST(req: NextRequest) {
  // Hoisted to function scope so the outer catch can refund a credit that was
  // charged before a failure (e.g. a throw during chart building, which the
  // stream's own onFailure/claudeErr refunds never reach). refundKey is the
  // shared per-turn idempotency key so inner + outer refunds never double-pay.
  let chargedUserId: string | null = null
  let refundKey: string | null = null
  try {
    // Apply middleware: authenticated guard — 로그인 필수. 비로그인은 401.
    // requireCredits 는 false — 새로고침 idempotent replay 일 때 차감을
    // 스킵해야 하는데 middleware 가 먼저 차감하면 늦음. 핸들러 안에서
    // idempotency 체크 후 consumeCredits 명시 호출.
    const authedGuardOptions = createAuthenticatedGuard({
      route: 'compatibility-counselor',
      limit: 30,
      windowSeconds: 60,
      requireCredits: false,
    })

    const { context, error } = await initializeApiContext(req, authedGuardOptions)
    if (error) {
      return error
    }

    const rawBody = await req.json()
    const validationResult = compatibilityCounselorRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[compatibility/counselor] validation failed', {
        errors: validationResult.error.issues,
      })
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: validationResult.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const {
      persons,
      lang: bodyLang,
      messages = [],
      cvText,
      turnId: rawTurnId,
    } = validationResult.data
    // person*Saju / person*Astro / fullContext 는 옛 client 가 보내던
    // legacy 필드 (Phase E 에 제거). 입력 validation 에서는 optional 로
    // 유지해 옛 client request 가 400 으로 막히지 않게 하되, 라우트에서는
    // 무시한다.

    // 끊김 복구용 턴 식별자. 로그인 사용자만 캐시 → 게스트는 turnId 가 있어도
    // 복원 대상에서 제외(아래 onComplete 가 recoverUserId 가드).
    const turnId = typeof rawTurnId === 'string' ? rawTurnId.slice(0, 80) : ''
    const recoverUserId = context.userId // string | null — 로그인 사용자만 복구 캐시

    const trimmedHistory = clampMessages(messages)

    // Safety check
    const lastUser = [...trimmedHistory].reverse().find((m) => m.role === 'user')
    // Answer language follows the app i18n setting: the client sends it as
    // body.lang and the I18nProvider mirrors it into the `locale` cookie
    // (auto-sent), so the toggle is honored. Accept-Language is last resort.
    const cookieLocale = req.cookies.get('locale')?.value
    const lang: 'ko' | 'en' =
      bodyLang === 'en' || bodyLang === 'ko'
        ? bodyLang
        : cookieLocale === 'en' || cookieLocale === 'ko'
          ? cookieLocale
          : context.locale === 'ko'
            ? 'ko'
            : 'en'
    // Self-harm / suicidal intent → crisis hotline, before the dry "restricted
    // topic" refusal and before any credit charge. containsForbidden is
    // English-only for self-harm, so this also covers Korean distress.
    // Screen EVERY user turn in the request, not just the latest: the client
    // replays prior user turns to the model via priorTurns, so a self-harm
    // expression in an earlier turn must still route to crisis even if the
    // current message looks benign. Messages are already in memory — cheap.
    const anyUserSelfHarm = trimmedHistory.some(
      (m) => m.role === 'user' && isSelfHarm(m.content ?? '')
    )
    if (anyUserSelfHarm) {
      return createFallbackSSEStream(
        { content: crisisMessage(lang), done: true },
        { 'X-Counselor-Fallback': '1' }
      )
    }
    if (lastUser && containsForbidden(lastUser.content)) {
      // X-Counselor-Fallback: 1 — 클라이언트가 "스트림이 잘림" 으로 잘못
      // 인식해 retry 칩을 띄우지 않도록. fallback / 안전 응답은 ||FOLLOWUP||
      // 마커가 없는 *완결된* 메시지다.
      return createFallbackSSEStream(
        { content: safetyMessage(lang), done: true },
        { 'X-Counselor-Fallback': '1' }
      )
    }

    // 크레딧 차감 — 새로고침/탭 복제 idempotent replay 시 차감 스킵.
    // middleware 의 requireCredits 가 false 라서 여기서 명시 처리.
    // chargedUserId 는 함수 스코프에 hoist 됨 (외부 catch 환불용).
    if (context.userId) {
      const scopedIdemKey = idemStore.keyFor(req, `user:${context.userId}`)
      // 원자적 선점 — 동시 요청 중 하나만 첫 진입으로 차감(이중 차감 방지).
      const claimed = scopedIdemKey ? await idemStore.claim(scopedIdemKey) : true
      if (scopedIdemKey && !claimed) {
        logger.info('[compat/counselor] idempotent replay, skip credit consume', {
          userId: context.userId,
        })
      } else {
        const res = await consumeCredits(context.userId, 'compatibility', 1)
        if (!res.success) {
          // 차감 실패 → 선점 해제 후 결제 요구 응답(재시도가 다시 차감 가능).
          if (scopedIdemKey) await idemStore.release(scopedIdemKey)
          return createErrorResponse({
            code: ErrorCodes.PAYMENT_REQUIRED,
            message:
              lang === 'ko'
                ? '크레딧이 부족해요. 충전 후 다시 시도해주세요.'
                : 'Insufficient credits. Please top up and try again.',
            locale: lang,
            route: 'compatibility/counselor',
          })
        }
        chargedUserId = context.userId
        refundKey = turnId ? `compat:${chargedUserId}:${turnId}` : null
      }
    }

    // Claude 호출 실패 시 차감된 1 크레딧 환불 (인증 사용자 + 이번 turn 에
    // 실제 차감한 경우만). idempotent replay 일 땐 chargedUserId === null
    // 이므로 no-op.
    const refundChargedCredit = async (reason: string) => {
      if (!chargedUserId) return
      try {
        await refundCreditsOnce(refundKey, {
          userId: chargedUserId,
          creditType: 'compatibility',
          amount: 1,
          reason: 'api_error',
          apiRoute: 'compatibility/counselor',
          errorMessage: reason,
        })
        logger.info('[compat/counselor] credit refunded on failure', {
          userId: chargedUserId,
          reason,
        })
      } catch (err) {
        logger.error('[compat/counselor] refund failed', { err })
      }
    }

    // Assemble the LLM prompts (system + cached chart context + user prompt +
    // prior turns). All deterministic context building — person seeds, saju/
    // astro synastry, composite chart, personal shinsal, meta flags — lives in
    // buildCompatibilityCounselorContext so this route stays a thin orchestrator
    // (middleware → validate → safety → credits → build → stream). The caller
    // name is resolved here (DB) and passed in to keep the builder IO-free.
    const callerName = await getUserDisplayName(context.userId)
    const { systemPrompt, cachedUserContext, userPrompt, priorTurns } =
      await buildCompatibilityCounselorContext({
        persons: persons as Array<Record<string, unknown>>,
        lang,
        trimmedHistory,
        cvText,
        callerName,
      })

    try {
      return await streamClaudeAsSSE({
        // req.signal 은 여전히 넘기지만, keepGeneratingOnDisconnect 가 true 라
        // 클라가 끊겨도 업스트림을 중단하지 않고 끝까지 생성한다 (아래 onComplete
        // 로 캐시 저장 → 사용자가 돌아오면 result 엔드포인트로 복원).
        abortSignal: req.signal,
        keepGeneratingOnDisconnect: true,
        // 생성이 끝나면(클라 연결 여부 무관) 완성 답안을 캐시에 저장. 끊겼다가
        // 돌아온 사용자가 /api/compatibility/counselor/result?turnId=… 로 받아간다.
        // 게스트(recoverUserId 없음) 는 끊김 복구 미지원 — turnId 가 있어도 캐시 안 함.
        onComplete:
          turnId && recoverUserId
            ? async (full) => {
                try {
                  await cacheSet(
                    compatTurnResultKey(recoverUserId, turnId),
                    full,
                    COMPAT_TURN_RESULT_TTL_SEC
                  )
                } catch {
                  /* 캐시 실패는 무시 — 단순히 복원이 안 될 뿐, 스트림엔 영향 없음 */
                }
              }
            : undefined,
        systemPrompt,
        cachedUserContext,
        userPrompt,
        priorTurns,
        // Haiku → Sonnet 4.5 통일. 운명 상담사와 같은 깊이·톤. 캐싱(1h)
        // 으로 cachedUserContext 비용 회수.
        model: PREMIUM_CLAUDE_MODEL,
        // maxTokens 5000 + continuation hook — 5000 도달해도 자동으로 이어
        // 써서 답이 절대 중간에 안 잘림 (최대 2회 continuation, 누적 24000
        // chars 절대 cap). claudeWithContinuation 참고.
        maxTokens: 5000,
        enableContinuation: true,
        temperature: 0.7,
        timeoutMs: 80000,
        label: 'compatibility-counselor',
        // Mid-stream failures (empty completion / backend error) surface
        // inside the SSE body, not as a thrown error, so the catch below
        // never sees them. Refund the consumed credit here too.
        onFailure: chargedUserId
          ? async () => {
              await refundChargedCredit('compatibility-counselor stream delivered no content')
            }
          : undefined,
      })
    } catch (claudeErr) {
      logger.error('[Compatibility Counselor] Claude error:', {
        error: claudeErr instanceof Error ? claudeErr.message : String(claudeErr),
      })

      // Refund credit if Claude failed (authed users only, this turn 차감 후)
      await refundChargedCredit(
        `Claude error: ${claudeErr instanceof Error ? claudeErr.message : 'unknown'}`
      )

      const fallback =
        lang === 'ko'
          ? 'AI \uC11C\uBC84 \uC5F0\uACB0\uC5D0 \uBB38\uC81C\uAC00 \uC788\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.'
          : 'AI server connection issue. Please try again later.'

      return createFallbackSSEStream(
        { content: fallback, done: true },
        { 'X-Counselor-Fallback': '1' }
      )
    }
  } catch (error) {
    // Charge-without-delivery guard: if a credit was consumed before the
    // failure (e.g. chart building threw before the stream started), refund it
    // here. The inner claudeErr catch returns instead of rethrowing, so this
    // only runs for pre-stream failures → no double refund.
    if (chargedUserId) {
      try {
        // Idempotent: same key as refundChargedCredit, so if an inner path
        // already refunded this turn, this is a no-op (no double refund).
        await refundCreditsOnce(refundKey, {
          userId: chargedUserId,
          creditType: 'compatibility',
          amount: 1,
          reason: 'api_error',
          apiRoute: 'compatibility/counselor',
          errorMessage: `handler error: ${error instanceof Error ? error.name : 'Unknown'}`,
        })
        logger.info('[compat/counselor] credit refunded in outer catch', { userId: chargedUserId })
      } catch (refundErr) {
        logger.error('[compat/counselor] outer-catch refund failed', { refundErr })
      }
    }
    logger.error('[Compatibility Counselor] Error:', { error: error })
    // Never reflect raw internal/DB error text to the client (project policy:
    // "don't reflect raw errors"). The detail is captured server-side via the
    // logger.error above. In non-production only, attach a *short* error tag
    // (name + first 120 chars of message) as a debug aid — the prod response
    // stays generic.
    const body: { error: string; errorTag?: string } = { error: 'Internal server error' }
    if (process.env.NODE_ENV !== 'production') {
      const errName = error instanceof Error ? error.name : 'UnknownError'
      const errMsg =
        error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120)
      body.errorTag = `${errName}: ${errMsg}`
    }
    return NextResponse.json(body, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
