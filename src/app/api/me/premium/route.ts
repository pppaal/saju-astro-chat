import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createSimpleGuard, type ApiContext } from '@/lib/api/middleware'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'
import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'

export const dynamic = 'force-dynamic'

const STRIPE_API_VERSION = '2025-10-29.clover' as Stripe.LatestApiVersion
const PREMIUM_CACHE_TTL = 60 * 5 // 5 minutes cache

const guard = createSimpleGuard({ route: 'me-premium', limit: 30, windowSeconds: 60 })

// 이메일 형식 검증 (Stripe 쿼리 인젝션 방지)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email) && email.length <= 254
}

// Stripe 구독 확인 (프리미엄 체크) with Redis caching
async function checkStripeActive(email?: string): Promise<boolean> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || !email || !isValidEmail(email)) {
    return false
  }

  const cacheKey = `premium:${email.toLowerCase()}`

  // Check cache first
  const cached = await cacheGet<{ isPremium: boolean }>(cacheKey)
  if (cached !== null) {
    return cached.isPremium
  }

  const stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION })
  // Use parameterized API to prevent query injection
  const customers = await stripe.customers.list({
    email: email.toLowerCase(),
    limit: 3,
  })

  let isPremium = false
  for (const c of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: c.id,
      status: 'all',
      limit: 5,
    })
    const active = subs.data.find((s) => ['active', 'trialing', 'past_due'].includes(s.status))
    if (active) {
      isPremium = true
      break
    }
  }

  // Cache the result
  await cacheSet(cacheKey, { isPremium }, PREMIUM_CACHE_TTL);

  return isPremium
}

// GET: 현재 사용자의 프리미엄 상태 확인
export const GET = withApiMiddleware(async (_req: NextRequest, context: ApiContext) => {
  // 로그인 안 됨
  if (!context.userId || !context.session?.user?.email) {
    return NextResponse.json({
      isLoggedIn: false,
      isPremium: false,
    })
  }

  const userEmail = context.session.user.email

  // 프리미엄 체크
  const isPremium = await checkStripeActive(userEmail);

  return NextResponse.json({
    isLoggedIn: true,
    isPremium,
  })
}, guard)
