import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { linkReferrer } from '@/lib/referral'
import { prisma } from '@/lib/db/prisma'
import { recordCounter } from '@/lib/metrics/index'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// New-signup window: the referral cookie is consumed only if this account was
// created very recently. Stops an *existing* user from being retro-linked (and
// minting credits) just by clicking a friend's link.
const NEW_USER_WINDOW_MS = 24 * 60 * 60 * 1000

// POST: 친구가 추천 링크(?ref=코드)로 들어와 처음 로그인하면, 저장된 추천
// 코드(dp_ref 쿠키)를 읽어 추천인에게 보상 크레딧을 지급한다.
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const code = req.cookies.get('dp_ref')?.value?.trim()
      if (!code) {
        return apiSuccess({ linked: false, reason: 'no_code' as string })
      }

      const userId = context.userId!
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { referrerId: true, createdAt: true },
      })
      if (!user) {
        return apiError(ErrorCodes.NOT_FOUND, 'User not found')
      }
      if (user.referrerId) {
        return apiSuccess({ linked: false, reason: 'already_linked' as string })
      }
      // Only brand-new signups count as a referral.
      if (Date.now() - user.createdAt.getTime() > NEW_USER_WINDOW_MS) {
        return apiSuccess({ linked: false, reason: 'not_new_user' as string })
      }

      const result = await linkReferrer(userId, code)
      // 퍼널 — 추천 링크로 들어와 실제로 신규 가입 연결까지 성공한 시점.
      if (result.success) recordCounter('referral.signup', 1)
      return apiSuccess({
        linked: result.success,
        reason: result.error as string | undefined,
      })
    } catch (err) {
      logger.error('[Referral link error]', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal Server Error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/referral/link',
    limit: 20,
    windowSeconds: 60,
  })
)
