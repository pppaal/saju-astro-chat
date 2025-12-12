import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { randomUUID } from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'

export const runtime = 'nodejs'

let stripeInstance: Stripe | null = null
function getStripe(): Stripe | null {
  if (stripeInstance) return stripeInstance
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  stripeInstance = new Stripe(key)
  return stripeInstance
}

function isValidEmail(email?: string | null) {
  if (!email) return false
  if (email.length > 254) return false
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)

  try {
    // Rate limit to reduce checkout abuse
    const limit = await rateLimit(`checkout:${ip}`, { limit: 8, windowSeconds: 60 })
    const rateHeaders = new Headers(limit.headers)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: rateHeaders })
    }

    // Authentication required
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401, headers: rateHeaders })
    }

    const price = process.env.NEXT_PUBLIC_PRICE_MONTHLY // price_xxx
    const base = process.env.NEXT_PUBLIC_BASE_URL // e.g., https://your-domain.com
    if (!price) {
      console.error('ERR: NEXT_PUBLIC_PRICE_MONTHLY missing')
      return NextResponse.json({ error: 'missing_price' }, { status: 500, headers: rateHeaders })
    }
    if (!base) {
      console.error('ERR: NEXT_PUBLIC_BASE_URL missing')
      return NextResponse.json({ error: 'missing_base_url' }, { status: 500, headers: rateHeaders })
    }

    const stripe = getStripe()
    if (!stripe) {
      console.error('ERR: STRIPE_SECRET_KEY missing')
      return NextResponse.json({ error: 'missing_secret' }, { status: 500, headers: rateHeaders })
    }

    const email = session.user.email ?? ''
    if (!isValidEmail(email)) {
      console.warn('[checkout] invalid email for session user', { userId: (session.user as any)?.id })
      return NextResponse.json({ error: 'invalid_email' }, { status: 400, headers: rateHeaders })
    }

    // Idempotency: use client-provided key when reasonable, otherwise generate
    const clientIdemKey = req.headers.get('x-idempotency-key')
    const idempotencyKey = clientIdemKey && clientIdemKey.length < 128 ? clientIdemKey : randomUUID()

    const checkout = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        line_items: [{ price, quantity: 1 }],
        success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/pricing`,
        allow_promotion_codes: true,
        customer_email: email,
        metadata: {
          productId: 'monthly-premium',
          userId: (session.user as any)?.id || '',
          source: 'web',
        },
      },
      { idempotencyKey }
    )

    if (!checkout.url) {
      return NextResponse.json({ error: 'no_checkout_url' }, { status: 500, headers: rateHeaders })
    }

    console.info('[checkout] session created', {
      userId: (session.user as any)?.id,
      email,
      ip,
      checkoutId: checkout.id,
    })

    return NextResponse.json({ url: checkout.url }, { status: 200, headers: rateHeaders })
  } catch (e: any) {
    console.error('Stripe error:', e?.raw?.message || e?.message || e)
    return NextResponse.json(
      { error: 'stripe_error', message: e?.raw?.message || e?.message || 'unknown' },
      { status: 400 }
    )
  }
}
