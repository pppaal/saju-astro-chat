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

// DELETE /api/me/account — permanently delete the signed-in user and all
// related data. Nearly every user relation in the schema is onDelete: Cascade,
// so a single user.delete() removes accounts, sessions, readings, circle,
// matches, etc. The only non-cascade link is the self "Referrals" relation
// (onDelete: SetNull), which simply detaches referees.
//
// Requires a confirmation in the body matching the account email (or the
// literal "DELETE" for accounts without an email) so a stray request can't
// wipe an account.
export const DELETE = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    let body: { confirm?: unknown } = {}
    try {
      body = await req.json()
    } catch {
      // empty/invalid body — treated as a failed confirmation below
    }
    const provided = typeof body.confirm === 'string' ? body.confirm.trim().toLowerCase() : ''

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      })
      if (!user) {
        return apiError(ErrorCodes.NOT_FOUND, 'Account not found')
      }

      const expected = (user.email || '').trim().toLowerCase() || 'delete'
      if (!provided || provided !== expected) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Confirmation does not match')
      }

      // 개인정보성 로그(이메일 발송 로그·공유 링크)는 함께 삭제한다. 이 둘은
      // userId 를 FK 관계 없이 들고 있어 user.delete() 의 cascade 대상이 아니다.
      // 반면 BonusCreditPurchase·CreditRefundLog·SecurityAuditLog 는 회계/보안
      // 목적으로 보존한다(userId 만 남는 고아 행). 나머지 연관 테이블은 모두
      // onDelete: Cascade 로 user.delete() 한 번에 연쇄 삭제된다.
      await prisma.$transaction([
        prisma.emailLog.deleteMany({ where: { userId } }),
        prisma.sharedResult.deleteMany({ where: { userId } }),
        prisma.user.delete({ where: { id: userId } }),
      ])

      logger.info('[me/account] account deleted', { userId })
      return apiSuccess({ deleted: true })
    } catch (err) {
      logger.error('Error deleting account:', err)
      return apiError(ErrorCodes.DATABASE_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/account',
    limit: 5,
    windowSeconds: 60,
  })
)
