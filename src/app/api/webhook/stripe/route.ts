import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware } from '@/lib/api/middleware'
import Stripe from 'stripe'
import { prisma } from '@/lib/db/prisma'
import { captureServerError } from '@/lib/telemetry'
import { recordCounter } from '@/lib/metrics'
import { addBonusCredits, revokeBonusCreditPurchase } from '@/lib/credits/creditService'
import { grantReferralRewardOnFirstPurchase } from '@/lib/referral'
import { CREDIT_PACKS } from '@/lib/config/pricing'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { HTTP_STATUS as _HTTP_STATUS } from '@/lib/constants/http'
import { getStripeOrThrow } from '@/lib/stripe/client'

export const dynamic = 'force-dynamic'

const getWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET

export const POST = withApiMiddleware(
  async (request: NextRequest, context) => {
    const webhookSecret = getWebhookSecret()
    if (!webhookSecret) {
      logger.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured')
      captureServerError(new Error('STRIPE_WEBHOOK_SECRET missing'), {
        route: '/api/webhook/stripe',
        stage: 'config',
      })
      recordCounter('stripe_webhook_config_error', 1, { reason: 'missing_secret' })
      return createErrorResponse({
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Webhook secret not configured',
        route: 'webhook/stripe',
      })
    }
    const stripe = getStripeOrThrow()

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')
    const ip = context.ip || 'unknown'

    if (!signature) {
      recordCounter('stripe_webhook_auth_error', 1, { reason: 'missing_signature' })
      captureServerError(new Error('stripe-signature header missing'), {
        route: '/api/webhook/stripe',
        ip,
      })
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Missing stripe-signature header',
        route: 'webhook/stripe',
      })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: unknown) {
      const internalMessage = err instanceof Error ? err.message : 'Unknown error'
      logger.error('[Stripe Webhook] Signature verification failed:', { message: internalMessage })
      recordCounter('stripe_webhook_auth_error', 1, { reason: 'verify_failed' })
      captureServerError(err, { route: '/api/webhook/stripe', stage: 'verify', ip })
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Webhook signature verification failed',
        route: 'webhook/stripe',
      })
    }

    logger.info(`[Stripe Webhook] Event: ${event.type}`, { eventId: event.id, ip })

    // 🔒 livemode 검증: 운영(prod)에서는 test-mode 이벤트를 절대 처리하지 않는다.
    // test webhook secret 이 prod 엔드포인트에 잘못 걸리면 가짜(test) 결제로
    // 실제 크레딧이 지급되는 사고를 막는다. (비-prod 는 staging 의 test/live
    // 혼용을 허용하기 위해 거부하지 않는다.)
    if (process.env.NODE_ENV === 'production' && !event.livemode) {
      logger.error('[Stripe Webhook] test-mode event rejected in production', {
        eventId: event.id,
        type: event.type,
      })
      recordCounter('stripe_webhook_livemode_mismatch', 1, { event: event.type })
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Webhook environment mismatch',
        route: 'webhook/stripe',
      })
    }

    // Replay 방어는 constructEvent 의 *서명 타임스탬프*(Stripe-Signature 의 t=,
    // 기본 tolerance 300s) + 아래 eventId 멱등 dedupe 가 담당한다. Stripe 는 매
    // 재배달마다 t= 를 새로 스탬프하므로 정상 재시도는 통과하고, 캡처된 옛
    // 페이로드 replay 는 (a) 서명 tolerance 초과로 constructEvent 가 throw 하거나
    // (b) 같은 eventId 라 StripeEventLog unique 로 deduped 된다.
    //
    // 이전엔 여기서 event.created(불변)가 300s 보다 오래되면 거부했는데, Stripe
    // 재시도는 *원본 event.created* 를 그대로 들고 수 분~수 시간 뒤 오므로 항상
    // "stale" 로 거부됐다 → "transient DB 에러 → throw → Stripe 재시도" 설계와
    // 아래 B1 재처리 분기가 무력화돼, 일시 실패한 charge.refunded 의 크레딧 회수가
    // 영구 소실됐다(고객이 환불도 받고 크레딧도 유지). 그래서 제거한다.

    // 🔒 멱등성 체크: 원자적으로 처리 시도 (Race Condition 방지)
    try {
      // 먼저 이벤트 레코드를 생성하여 락을 획득 (unique constraint)
      await prisma.stripeEventLog.create({
        data: {
          eventId: event.id,
          type: event.type,
          success: false, // 처리 시작 전 상태
          metadata: {
            livemode: event.livemode,
            apiVersion: event.api_version,
          },
        },
      })
    } catch (err: unknown) {
      // P2002: Unique constraint violation (이미 처리 중이거나 완료)
      if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
        const existingEvent = await prisma.stripeEventLog.findUnique({
          where: { eventId: event.id },
        })

        if (existingEvent?.success) {
          logger.info(`[Stripe Webhook] Event already processed: ${event.id}`, {
            type: event.type,
            processedAt: existingEvent.processedAt,
          })
          recordCounter('stripe_webhook_duplicate', 1, { event: event.type })
          return NextResponse.json({ received: true, duplicate: true })
        }

        // B1 fix: 이전 시도가 처리 도중 죽어 success=false 로 남은 행은
        // 재처리 허용 (fall-through). 이전엔 여기서 duplicate 로 종료해
        // Stripe 재시도가 영원히 short-circuit → 부분 처리된 이벤트가 영구
        // 방치됐다. 하위 핸들러 작업(addBonusCredits, revokeBonusCreditPurchase
        // 등)은 모두 멱등(BonusCreditPurchase.stripePaymentId @unique 가
        // 더블 지급 차단, charge.refunded 핸들러도 already-revoked 멱등 분기
        // 보유) 이므로 안전.
        logger.warn(
          `[Stripe Webhook] Reprocessing previously-failed event: ${event.id} (type=${event.type})`
        )
        recordCounter('stripe_webhook_retry_failed_event', 1, { event: event.type })
        // fall through to handler
      } else {
        throw err
      }
    }

    try {
      // 이벤트 처리
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          await handleCheckoutCompleted(session)
          break
        }
        case 'checkout.session.async_payment_succeeded': {
          // 비동기 결제(계좌이체/바우처 등)는 최초 checkout.session.completed 가
          // payment_status='unpaid' 로 와서 grant 가 보류되고(아래 handleCheckoutCompleted
          // 의 unpaid skip), 결제 확정이 이 이벤트로 도착한다. 같은 세션을 다시
          // 처리해 크레딧을 지급한다. addBonusCredits 는 stripePaymentId @unique 로
          // 멱등이라 completed 와 이 이벤트가 둘 다 paid 로 와도 이중 지급되지 않는다.
          const session = event.data.object as Stripe.Checkout.Session
          await handleCheckoutCompleted(session)
          break
        }
        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge
          await handleChargeRefunded(charge)
          break
        }
        default:
          // 구독 폐지 — 크레딧팩 일회성 결제(checkout.session.completed)와
          // 환불(charge.refunded)만 처리한다.
          logger.warn(`[Stripe Webhook] Unhandled event type: ${event.type}`)
      }

      // ✅ 성공: 이벤트 처리 완료 기록
      await prisma.stripeEventLog.update({
        where: { eventId: event.id },
        data: {
          success: true,
          errorMsg: null,
          processedAt: new Date(),
        },
      })

      return NextResponse.json({ received: true })
    } catch (err: unknown) {
      const internalMessage = err instanceof Error ? err.message : 'Unknown error'
      logger.error(`[Stripe Webhook] Error handling ${event.type}:`, err)
      recordCounter('stripe_webhook_handler_error', 1, { event: event.type })
      captureServerError(err, { route: '/api/webhook/stripe', event: event.type })

      // ❌ 실패: 이벤트 처리 실패 기록 (재처리 가능하도록)
      try {
        const existingAfter = await prisma.stripeEventLog.findUnique({
          where: { eventId: event.id },
        })
        if (existingAfter?.success) {
          logger.info(`[Stripe Webhook] Event succeeded elsewhere: ${event.id}`, {
            type: event.type,
            processedAt: existingAfter.processedAt,
          })
          return NextResponse.json({ received: true, duplicate: true })
        }

        await prisma.stripeEventLog.upsert({
          where: { eventId: event.id },
          update: {
            success: false,
            errorMsg: internalMessage,
            processedAt: new Date(),
            metadata: {
              livemode: event.livemode,
              apiVersion: event.api_version,
              error: internalMessage,
            },
          },
          create: {
            eventId: event.id,
            type: event.type,
            success: false,
            errorMsg: internalMessage,
            metadata: {
              livemode: event.livemode,
              apiVersion: event.api_version,
              error: internalMessage,
            },
          },
        })
      } catch (logErr) {
        logger.error('[Stripe Webhook] Failed to log error event:', logErr)
      }

      return createErrorResponse({
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Internal Server Error',
        route: 'webhook/stripe',
        originalError: err instanceof Error ? err : new Error(String(err)),
      })
    }
  },
  { route: 'webhook/stripe', skipCsrf: true }
)

// 크레딧팩 구매 완료 처리 (일회성 결제)
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // 크레딧팩 구매인지 확인
  const metadata = session.metadata
  if (metadata?.type !== 'credit_pack') {
    logger.debug('[Stripe Webhook] Not a credit pack purchase, skipping')
    return
  }

  const creditPack = metadata.creditPack as
    | 'starter'
    | 'mini'
    | 'standard'
    | 'plus'
    | 'mega'
    | 'ultimate'
    | undefined
  const userId = metadata.userId

  if (!creditPack || !userId) {
    logger.error('[Stripe Webhook] Missing creditPack or userId in metadata')
    return
  }

  // 크레딧 수량 — 단일 진실원(CREDIT_PACKS)에서 파생. webhook 에 별도
  // 하드코딩하면 가격표와 어긋나 잘못된 크레딧이 지급될 수 있음.
  const pack = CREDIT_PACKS[creditPack]
  if (!pack) {
    logger.error(`[Stripe Webhook] Unknown credit pack: ${creditPack}`)
    return
  }
  const creditAmount = pack.credits

  // 사용자 확인
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    logger.error(`[Stripe Webhook] User not found: ${userId}`)
    return
  }

  // Stripe 결제 ID — 환불(charge.refunded) 시 BonusCreditPurchase 를
  // 찾아 잔여 크레딧을 회수하는 매칭 키. 저장 안 하면 환불 보호 불가.
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id

  // B3 fix: 비동기 결제 (bank transfer 등) 의 경우 payment_status 가
  // 'unpaid' / 'no_payment_required' 이고 payment_intent 가 아직 null 일 수
  // 있다. 이 상태에서 addBonusCredits 를 부르면 stripePaymentId=null 로
  // 저장되는데, Postgres 는 NULL 끼리 unique 비교를 안 하므로 dedup 이
  // 무력화돼 Stripe 재시도마다 새 row 가 만들어진다(반복 지급 leak).
  // 결제 확정 webhook (checkout.session.async_payment_succeeded /
  // 후속 checkout.session.completed with payment_status=paid) 이 도착할
  // 때까지 grant 보류.
  if (session.payment_status !== 'paid' || !paymentIntentId) {
    logger.info(
      `[Stripe Webhook] Skipping unpaid/pending checkout session (no credit grant yet): session=${session.id} payment_status=${session.payment_status ?? 'unknown'} payment_intent=${paymentIntentId ?? 'null'}`
    )
    recordCounter('stripe_webhook_unpaid_checkout_skipped', 1, {
      pack: creditPack,
      status: session.payment_status ?? 'unknown',
    })
    return
  }

  // 보너스 크레딧 추가 — addBonusCredits 는 BonusCreditPurchase +
  // UserCredits update 를 한 transaction 으로 처리(데이터 일관성 보장)하고,
  // stripePaymentId 에 DB 레벨 unique 가 걸려있어 같은 결제로 두 번째
  // 호출이 오면 P2002 가 발생한다. 그 경우 이미 1차에서 크레딧이 들어갔다는
  // 뜻이므로 silent skip (멱등성). 그 외 에러만 상위로 던져 webhook 이
  // 재시도되도록 한다.
  let creditGrantWasDuplicate = false
  try {
    await addBonusCredits(userId, creditAmount, 'purchase', paymentIntentId)
    logger.info(
      `[Stripe Webhook] Added ${creditAmount} bonus credits to user ${userId} (${creditPack} pack)`
    )
  } catch (err) {
    const isDuplicate =
      err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'P2002'
    if (isDuplicate) {
      logger.info(
        `[Stripe Webhook] Duplicate purchase webhook (already credited): payment=${paymentIntentId} — checking pending revocation queue`
      )
      recordCounter('stripe_webhook_purchase_duplicate', 1, { pack: creditPack })
      creditGrantWasDuplicate = true
      // B2 fix: P2002 라도 PendingCreditRevocation 체크는 계속 실행해야
      // 한다. 이전엔 여기서 early return 해서, 1차 시도가 grant 직후
      // revocation 체크 전에 죽었을 때 retry 가 P2002 로 끊겨 queued
      // revocation 이 영원히 적용 안 됨(환불됐는데 크레딧 유지 leak).
      // → return 제거. 아래 revocation 체크로 fall-through.
    } else {
      logger.error('[Stripe Webhook] Failed to add bonus credits:', err)
      throw err
    }
  }

  // out-of-order webhook race 처리 — charge.refunded 가 이 webhook 전에
  // 도착해서 PendingCreditRevocation 에 기록돼 있다면 즉시 회수 + 정리.
  // 어느 순서로 도착해도 최종 상태 동일.
  // B2 fix: 이 블록은 grant 가 새로 일어났든(첫 시도) duplicate (P2002,
  // retry 시도) 든 항상 실행돼야 queued revocation 이 안전하게 적용된다.
  try {
    const pending = await prisma.pendingCreditRevocation.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    })
    if (pending) {
      const revokeResult = await revokeBonusCreditPurchase(paymentIntentId)
      if (revokeResult.error) {
        // 회수가 transient DB 오류로 실패 — pending 을 *지우지 않고* throw 해서
        // 이벤트를 재시도시킨다. 지워버리면 큐가 사라져 환불 회수가 영영 누락된다.
        throw new Error(
          `[Stripe Webhook] queued revocation failed (DB error), will retry: payment=${paymentIntentId}`
        )
      }
      await prisma.pendingCreditRevocation.delete({ where: { id: pending.id } })
      logger.warn(
        `[Stripe Webhook] Applied queued refund after late purchase webhook: payment=${paymentIntentId} reclaimed=${revokeResult.reclaimed} (duplicateRetry=${creditGrantWasDuplicate})`
      )
      recordCounter('stripe_webhook_late_purchase_revocation_applied', 1, {
        duplicateRetry: creditGrantWasDuplicate ? '1' : '0',
      })
    }
  } catch (err) {
    logger.error('[Stripe Webhook] Failed to apply queued refund revocation:', err)
    // 회수 실패는 이벤트 실패로 전파 → Stripe 재시도(멱등 보장됨). 옛 코드는
    // 여기서 삼켜 success 로 처리 → 환불 회수 누락. grant 자체는 멱등이라 안전.
    throw err
  }

  // B2 fix: duplicate retry 인 경우 receipt 이메일과 referral 보상은
  // 1차 시도 때 이미 실행됐다(또는 시도됐다). 다시 실행하면 이메일 중복
  // 발송 / referral 멱등 가드에 의존하게 되므로 여기서 종료.
  if (creditGrantWasDuplicate) {
    return
  }

  // 구매 기록 저장 (선택사항) - CreditPurchase 모델이 스키마에 없음
  // await prisma.creditPurchase.create({
  //   data: {
  //     userId,
  //     pack: creditPack,
  //     credits: creditAmount,
  //     amount: session.amount_total || 0,
  //     currency: session.currency || 'krw',
  //     stripeSessionId: session.id,
  //     status: 'completed',
  //   },
  // }).catch((err) => {
  //   logger.warn('[Stripe Webhook] Could not save credit purchase record:', err.message)
  // })

  logger.info(
    `[Stripe Webhook] Credit pack purchase completed: ${userId} bought ${creditPack} (${creditAmount} credits)`
  )

  // 추천 보상은 피추천자의 '첫 결제' 시점에만 지급(멀티 계정 파밍 방지).
  // pending 보상이 있으면 추천인에게 1회 지급된다.
  try {
    const reward = await grantReferralRewardOnFirstPurchase(userId)
    if (reward.granted) {
      logger.info(
        `[Stripe Webhook] Referral reward granted to ${reward.referrerId} (+${reward.creditsAwarded}) for first purchase by ${userId}` +
          (reward.refereeBonusGranted
            ? ` — referee bonus +${reward.refereeBonusCredits} granted`
            : '')
      )
    }
  } catch (err) {
    logger.error('[Stripe Webhook] Failed to grant referral reward:', err)
  }
}

// 환불 처리 — Stripe 가 환불(전체/부분)을 처리한 charge 가 들어오면 매칭된
// 크레딧팩 구매의 잔여 크레딧을 회수해 사용자가 환불받은 돈으로 계속
// 쓰지 못하게 막는다. 부분 환불도 안전하게 보수적으로(잔여 전부 회수)
// 처리한다 — 부분 환불은 통상 어드민 수동 처리뿐이고, 회수가 과해도
// 다시 발급하면 됨.
async function handleChargeRefunded(charge: Stripe.Charge) {
  // amount_refunded === 0 인 경우(이벤트 노이즈) 스킵.
  if (!charge.amount_refunded || charge.amount_refunded <= 0) {
    return
  }

  const paymentIntentId =
    typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id

  if (!paymentIntentId) {
    logger.warn('[Stripe Webhook] charge.refunded without payment_intent', { chargeId: charge.id })
    return
  }

  const result = await revokeBonusCreditPurchase(paymentIntentId)
  if (result.revoked) {
    logger.info(
      `[Stripe Webhook] Revoked refunded purchase: payment=${paymentIntentId} reclaimed=${result.reclaimed} alreadyUsed=${result.alreadyUsed}`
    )
    return
  }

  // 진짜 DB 오류로 회수 실패 → throw 해서 이벤트를 실패(retryable)로 기록하고
  // Stripe 가 재시도하게 한다. 아래 "already-revoked 멱등" 분기로 떨어지면
  // 환불됐는데 크레딧이 남는다. (not-found/already-revoked 는 error 없음)
  if (result.error) {
    throw new Error(
      `[Stripe Webhook] revoke failed (DB error), will retry: payment=${paymentIntentId}`
    )
  }

  // revoked:false 케이스 — 두 가지:
  //   (a) 매칭 BonusCreditPurchase 가 아직 없음 (Stripe 가 webhook 순서를
  //       못 지켜서 charge.refunded 가 checkout.session.completed 보다
  //       먼저 도착) → PendingCreditRevocation 에 기록해서 purchase webhook
  //       이 도착할 때 즉시 회수되게 함.
  //   (b) 이미 만료/회수된 purchase (중복 webhook). 멱등 — 아무 액션 X.
  // 구분: purchase 존재 여부.
  const existingPurchase = await prisma.bonusCreditPurchase.findFirst({
    where: { stripePaymentId: paymentIntentId },
    select: { id: true },
  })

  if (existingPurchase) {
    // (b) 이미 처리됨 — 멱등.
    logger.info(
      `[Stripe Webhook] Refund webhook for already-revoked purchase: payment=${paymentIntentId}`
    )
    return
  }

  // (a) Purchase webhook 이 늦게 도착할 케이스 — 24h 만료로 큐.
  try {
    await prisma.pendingCreditRevocation.upsert({
      where: { stripePaymentIntentId: paymentIntentId },
      create: {
        stripePaymentIntentId: paymentIntentId,
        refundAmountCents: charge.amount_refunded,
        currency: charge.currency || null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      update: {},
    })
    logger.warn(
      `[Stripe Webhook] Refund arrived before purchase — queued PendingCreditRevocation: payment=${paymentIntentId}`
    )
    recordCounter('stripe_webhook_refund_before_purchase', 1)
  } catch (err) {
    // 큐 기록이 transient DB 오류로 실패하면 *반드시 throw* 해서 이벤트를
    // 실패(retryable)로 기록하고 Stripe 가 재시도하게 한다. 여기서 삼키면
    // success 로 처리돼 재시도가 끊기고, 늦게 도착할 purchase webhook 이
    // 회수할 큐가 사라져 환불 회수가 영영 누락된다(환불받고도 크레딧 유지).
    // upsert(unique stripePaymentIntentId, update:{}) 는 멱등이라 재시도 안전.
    // 형제 경로(handleCheckoutCompleted 의 queued revocation, handleChargeRefunded
    // 의 revoke 실패)와 동일하게 throw 로 통일.
    logger.error('[Stripe Webhook] Failed to queue PendingCreditRevocation:', err)
    recordCounter('stripe_webhook_queue_revocation_error', 1)
    throw err
  }
}
