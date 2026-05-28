import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { isAdminUser } from '@/lib/auth/admin'
import { logAdminAction } from '@/lib/auth/adminAudit'
import { addBonusCredits, getUserCredits } from '@/lib/credits/creditService'

export const dynamic = 'force-dynamic'

interface GrantResult {
  success: boolean
  userId: string
  email: string | null
  name: string | null
  granted: number
  bonusBalanceAfter: number
  source: 'gift' | 'promotion'
  note: string | null
}

// 어드민 크레딧 충전 — 본인/타 유저에게 즉시 보너스 크레딧 지급.
// 테스트/사과 보상/프로모션 용도. source 는 추적용으로 gift|promotion 둘 중.
// 만료일은 기존 addBonusCredits 정책(3개월) 따른다.
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    if (!context.userId) {
      return apiError(ErrorCodes.UNAUTHORIZED, 'unauthorized')
    }
    const isAdmin = await isAdminUser(context.userId)
    if (!isAdmin) {
      return apiError(ErrorCodes.FORBIDDEN, 'forbidden')
    }

    const body = await req.json().catch(() => ({}))
    const userIdOrEmail: string | undefined = body?.userIdOrEmail?.trim()
    const rawAmount = body?.amount
    const amount = typeof rawAmount === 'number' ? rawAmount : parseInt(String(rawAmount), 10)
    const source: 'gift' | 'promotion' = body?.source === 'promotion' ? 'promotion' : 'gift'
    const note: string | null =
      typeof body?.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 500) : null

    if (!userIdOrEmail) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'userIdOrEmail is required')
    }
    if (!Number.isInteger(amount) || amount < 1 || amount > 10000) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'amount must be integer 1..10000')
    }

    // 이메일 형식이면 email 로 조회, 아니면 id 로 조회.
    const isEmail = userIdOrEmail.includes('@')
    const targetUser = await prisma.user.findFirst({
      where: isEmail ? { email: userIdOrEmail.toLowerCase() } : { id: userIdOrEmail },
      select: { id: true, email: true, name: true },
    })
    if (!targetUser) {
      return apiError(ErrorCodes.NOT_FOUND, 'user_not_found')
    }

    const adminEmail = context.session?.user?.email || ''
    const userAgent = req.headers.get('user-agent') || undefined

    try {
      await addBonusCredits(targetUser.id, amount, source)
      const credits = await getUserCredits(targetUser.id)

      logger.info('[admin/grant-credits] success', {
        adminUserId: context.userId,
        targetUserId: targetUser.id,
        targetEmail: targetUser.email,
        amount,
        source,
        note,
        bonusBalanceAfter: credits?.bonusCredits ?? null,
      })

      // Persistent audit trail. logAdminAction swallows its own DB errors,
      // so a failure here can't undo the credit grant or block the response.
      await logAdminAction({
        adminEmail,
        adminUserId: context.userId,
        action: 'grant_credits',
        targetType: 'user',
        targetId: targetUser.id,
        metadata: {
          targetEmail: targetUser.email,
          amount,
          source,
          note,
          bonusBalanceAfter: credits?.bonusCredits ?? null,
        },
        success: true,
        ipAddress: context.ip,
        userAgent,
      })

      const result: GrantResult = {
        success: true,
        userId: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        granted: amount,
        bonusBalanceAfter: credits?.bonusCredits ?? amount,
        source,
        note,
      }
      return apiSuccess(result as unknown as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/grant-credits] failed', {
        adminUserId: context.userId,
        targetUserId: targetUser.id,
        amount,
        err,
      })
      await logAdminAction({
        adminEmail,
        adminUserId: context.userId,
        action: 'grant_credits',
        targetType: 'user',
        targetId: targetUser.id,
        metadata: { targetEmail: targetUser.email, amount, source, note },
        success: false,
        errorMessage: err instanceof Error ? err.message : String(err),
        ipAddress: context.ip,
        userAgent,
      })
      return apiError(ErrorCodes.INTERNAL_ERROR, 'grant_failed')
    }
  },
  createAuthenticatedGuard({
    route: '/api/admin/grant-credits',
    limit: 30,
    windowSeconds: 60,
  })
)
