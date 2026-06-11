/**
 * scripts/reconcile-stripe-purchases.ts
 *
 * Stripe → DB 재동기화. Stripe 엔 결제(checkout.session, payment_status=paid)가
 * 있는데 우리 DB 엔 BonusCreditPurchase 행이 없는 "웹훅 누락" 결제를 찾아,
 * 웹훅과 동일한 로직으로 크레딧을 지급(backfill)한다. 결제는 됐는데 크레딧을
 * 못 받았고 어드민 결제 목록에도 안 뜨던 유저를 복구한다.
 *
 * 멱등성: addBonusCredits 가 stripePaymentId(@unique)로 중복 지급을 막는다.
 * 여러 번 돌려도 안전하다. 환불(부분 포함)된 결제는 재지급하지 않고 건너뛴다
 * (잘못 다시 지급하는 것을 막기 위함 — 필요하면 수동 검토).
 *
 * 실행 (기본 dry-run, 아무것도 바꾸지 않음):
 *   tsx scripts/reconcile-stripe-purchases.ts --days=60
 *   tsx scripts/reconcile-stripe-purchases.ts --email=someone@example.com
 *   tsx scripts/reconcile-stripe-purchases.ts --pi=pi_123            # 단건
 *
 * 실제 적용:
 *   tsx scripts/reconcile-stripe-purchases.ts --days=60 --apply
 *
 * 필요 env: DATABASE_URL, STRIPE_SECRET_KEY
 */

import type Stripe from 'stripe'
import { prisma } from '../src/lib/db/prisma'
import { getStripeOrThrow } from '../src/lib/stripe/client'
import { CREDIT_PACKS, type CreditPackType } from '../src/lib/config/pricing'
import { addBonusCredits } from '../src/lib/credits/creditService'

interface Args {
  days: number
  apply: boolean
  email: string | null
  pi: string | null
}

function parseArgs(argv: string[]): Args {
  const get = (name: string) =>
    argv
      .find((a) => a.startsWith(`--${name}=`))
      ?.split('=')
      .slice(1)
      .join('=') ?? null
  const daysRaw = get('days')
  const days = daysRaw ? Math.max(1, Math.min(365, parseInt(daysRaw, 10) || 30)) : 30
  return {
    days,
    apply: argv.includes('--apply'),
    email: get('email'),
    pi: get('pi'),
  }
}

function paymentIntentId(pi: string | Stripe.PaymentIntent | null | undefined): string | null {
  if (!pi) return null
  return typeof pi === 'string' ? pi : pi.id
}

// 환불 여부 — payment_intent 의 latest_charge 가 (부분이라도) 환불됐는지.
function isRefunded(pi: Stripe.PaymentIntent | string | null | undefined): boolean {
  if (!pi || typeof pi === 'string') return false
  const charge = pi.latest_charge as Stripe.Charge | null
  if (!charge || typeof charge === 'string') return false
  return charge.refunded === true || (charge.amount_refunded ?? 0) > 0
}

type Verdict =
  | { kind: 'ok' } // 이미 DB 에 있음
  | { kind: 'not_credit_pack' }
  | { kind: 'unpaid' }
  | { kind: 'refunded' }
  | { kind: 'bad_metadata' }
  | { kind: 'user_missing'; userId: string }
  | { kind: 'missing'; userId: string; pack: CreditPackType; credits: number; pi: string }

async function classify(session: Stripe.Checkout.Session): Promise<Verdict> {
  const meta = session.metadata || {}
  if (meta.type !== 'credit_pack') return { kind: 'not_credit_pack' }

  const pi = paymentIntentId(session.payment_intent)
  if (session.payment_status !== 'paid' || !pi) return { kind: 'unpaid' }

  const packKey = meta.creditPack as CreditPackType | undefined
  const userId = meta.userId
  const pack = packKey ? CREDIT_PACKS[packKey] : undefined
  if (!packKey || !userId || !pack) return { kind: 'bad_metadata' }

  // 이미 우리 DB 에 있으면 OK (웹훅이 정상 처리함).
  const existing = await prisma.bonusCreditPurchase.findFirst({
    where: { stripePaymentId: pi },
    select: { id: true },
  })
  if (existing) return { kind: 'ok' }

  if (isRefunded(session.payment_intent)) return { kind: 'refunded' }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) return { kind: 'user_missing', userId }

  return { kind: 'missing', userId, pack: packKey, credits: pack.credits, pi }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const stripe = getStripeOrThrow()

  console.log(
    `[reconcile] mode=${args.apply ? 'APPLY' : 'DRY-RUN'} ` +
      (args.pi ? `pi=${args.pi}` : `days=${args.days}${args.email ? ` email=${args.email}` : ''}`)
  )

  // 대상 checkout.session 수집. latest_charge 까지 확장해 환불 여부를 본다.
  const sessions: Stripe.Checkout.Session[] = []
  if (args.pi) {
    const list = await stripe.checkout.sessions.list({
      payment_intent: args.pi,
      limit: 10,
      expand: ['data.payment_intent.latest_charge'],
    })
    sessions.push(...list.data)
  } else {
    const gte = Math.floor((Date.now() - args.days * 24 * 60 * 60 * 1000) / 1000)
    const emailLower = args.email?.toLowerCase() ?? null
    for await (const s of stripe.checkout.sessions.list({
      created: { gte },
      limit: 100,
      expand: ['data.payment_intent.latest_charge'],
    })) {
      if (emailLower && s.customer_details?.email?.toLowerCase() !== emailLower) continue
      sessions.push(s)
    }
  }

  console.log(`[reconcile] fetched ${sessions.length} checkout session(s) from Stripe`)

  const counters = {
    ok: 0,
    missing: 0,
    granted: 0,
    refunded: 0,
    unpaid: 0,
    not_credit_pack: 0,
    bad_metadata: 0,
    user_missing: 0,
    grant_failed: 0,
  }

  for (const session of sessions) {
    const v = await classify(session)
    switch (v.kind) {
      case 'ok':
        counters.ok++
        break
      case 'not_credit_pack':
        counters.not_credit_pack++
        break
      case 'unpaid':
        counters.unpaid++
        break
      case 'refunded':
        counters.refunded++
        console.log(`  [refunded] session=${session.id} — skipped (refunded in Stripe)`)
        break
      case 'bad_metadata':
        counters.bad_metadata++
        console.log(`  [bad-metadata] session=${session.id} — missing creditPack/userId`)
        break
      case 'user_missing':
        counters.user_missing++
        console.log(`  [user-missing] session=${session.id} userId=${v.userId} — user not in DB`)
        break
      case 'missing': {
        counters.missing++
        const tag = `user=${v.userId} pack=${v.pack} credits=${v.credits} pi=${v.pi}`
        if (!args.apply) {
          console.log(`  [MISSING] ${tag} — would grant (dry-run)`)
          break
        }
        try {
          // 웹훅과 동일: source='purchase' + stripePaymentId. 멱등(P2002 = 이미 지급).
          await addBonusCredits(v.userId, v.credits, 'purchase', v.pi)
          counters.granted++
          console.log(`  [GRANTED] ${tag}`)
        } catch (err) {
          const code = (err as { code?: string })?.code
          if (code === 'P2002') {
            counters.ok++
            console.log(`  [already] ${tag} — credited concurrently (P2002)`)
          } else {
            counters.grant_failed++
            console.error(`  [FAILED] ${tag} —`, err)
          }
        }
        break
      }
    }
  }

  console.log('\n[reconcile] summary:', JSON.stringify(counters, null, 2))
  if (!args.apply && counters.missing > 0) {
    console.log(
      `\n${counters.missing} missing purchase(s) found. Re-run with --apply to grant the credits.`
    )
  }
}

main()
  .catch((err) => {
    console.error('[reconcile] fatal:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
