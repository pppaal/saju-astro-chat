/**
 * POST /api/admin/social/test-post — 어드민 수동 Threads 게시 트리거.
 *
 * cron 을 기다리지 않고 즉시 동작 확인용. 쿼리:
 *   - ?dryRun=1 : 실제 게시 없이 "올릴 글/문구" 미리보기만
 *   - ?force=1  : 이미 게시한 글도 후보에 포함(테스트 강제 재게시)
 *
 * 어드민 가드(createAdminGuard)로 보호. 게시 동작은 cron 과 동일한
 * runBlogThreadsAutopost 코어를 공유한다.
 */

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAdminGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { logger } from '@/lib/logger'
import { logAdminAction } from '@/lib/auth/adminAudit'
import { runBlogThreadsAutopost } from '@/lib/social/autopost'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const params = new URL(req.url).searchParams
      const dryRun = params.get('dryRun') === '1'
      const force = params.get('force') === '1'

      const result = await runBlogThreadsAutopost({ dryRun, force })

      // 실제 게시한 경우에만 감사 로그 (미리보기는 부수효과 없음).
      if (result.posted) {
        await logAdminAction({
          adminEmail: context.session?.user?.email || '',
          adminUserId: context.userId ?? undefined,
          action: 'social.test_post',
          targetType: 'social',
          targetId: result.slug,
          metadata: { platform: 'threads', externalId: result.externalId, force },
          ipAddress: context.ip,
        }).catch((err) => logger.warn('[admin/social/test-post] audit log skipped', { err }))
      }

      return apiSuccess(result as unknown as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/social/test-post] error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAdminGuard({ route: '/api/admin/social/test-post', limit: 10, windowSeconds: 60 })
)
