import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import {
  getCreditBalance,
  canUseCredits,
  canUseFeature,
  PLAN_CONFIG,
  type FeatureType,
} from '@/lib/credits/creditService'
import { enforceBodySize } from '@/lib/http'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const ALLOWED_CREDIT_TYPES = new Set<'reading' | 'compatibility' | 'followUp'>([
  'reading',
  'compatibility',
  'followUp',
])
const ALLOWED_FEATURES = new Set<FeatureType>(
  Object.keys(PLAN_CONFIG.free.features) as FeatureType[]
)
import { LIMITS } from '@/lib/validation/patterns'
import { HTTP_STATUS } from '@/lib/constants/http'
import { creditCheckRequestSchema } from '@/lib/api/zodValidation'
const MAX_CREDIT_AMOUNT = LIMITS.CREDIT_AMOUNT
type CreditType = 'reading' | 'compatibility' | 'followUp'
const isCreditType = (value: string): value is CreditType =>
  ALLOWED_CREDIT_TYPES.has(value as CreditType)
const isFeatureType = (value: string): value is FeatureType =>
  ALLOWED_FEATURES.has(value as FeatureType)

// GET: 현재 크레딧 상태 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      // 비로그인 유저는 free 플랜 정보 반환
      return NextResponse.json({
        isLoggedIn: false,
        plan: 'free',
        ...PLAN_CONFIG.free,
        remainingCredits: 0,
        compatibility: { used: 0, limit: 0, remaining: 0 },
        followUp: { used: 0, limit: 0, remaining: 0 },
      })
    }

    const balance = await getCreditBalance(session.user.id)
    const planConfig = PLAN_CONFIG[balance.plan]

    return NextResponse.json({
      isLoggedIn: true,
      plan: balance.plan,
      features: planConfig.features,
      credits: {
        monthly: balance.monthlyCredits,
        used: balance.usedCredits,
        bonus: balance.bonusCredits,
        remaining: balance.remainingCredits,
        total: balance.totalCredits,
      },
      compatibility: balance.compatibility,
      followUp: balance.followUp,
      historyRetention: balance.historyRetention,
      periodEnd: balance.periodEnd,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    logger.error('[Credits GET error]', err)
    return NextResponse.json({ error: message }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}

// POST: 크레딧 사용 가능 여부 확인 (pre-check)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'not_authenticated', allowed: false },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    const oversized = enforceBodySize(request, 4 * 1024)
    if (oversized) {
      return oversized
    }

    const rawBody = await request.json().catch(() => null)
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json(
        { error: 'invalid_body', allowed: false },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Validate with Zod
    const validationResult = creditCheckRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Credits check] validation failed', { errors: validationResult.error.issues })
      return NextResponse.json(
        {
          error: 'validation_failed',
          allowed: false,
          details: validationResult.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const { type = 'reading', amount = 1, feature } = validationResult.data

    // 기능 체크
    if (feature) {
      const canUse = await canUseFeature(session.user.id, feature as FeatureType)
      return NextResponse.json({
        feature,
        allowed: canUse,
        reason: canUse ? undefined : 'feature_not_available',
      })
    }

    // 크레딧 체크
    const result = await canUseCredits(session.user.id, type, amount)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    logger.error('[Credits POST error]', err)
    return NextResponse.json({ error: message }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
