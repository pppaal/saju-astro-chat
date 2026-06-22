// src/app/api/admin/social/generate/route.ts
//
// 소셜 초안 생성 — 어드민이 "오늘 초안 만들기"를 누르거나 크론이 호출.
// 이미 그 날짜 초안이 있으면 중복 생성하지 않고 기존 걸 돌려준다(멱등).

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAdminGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { ensureDrafts } from '@/lib/social/draftStore'
import { generateDailyDrafts, todayKeyKST } from '@/lib/social/generateDrafts'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    let date = todayKeyKST()
    try {
      const body = (await req.json().catch(() => null)) as { date?: string } | null
      if (body?.date && DATE_RE.test(body.date)) date = body.date
    } catch {
      /* body 없음 — 오늘 날짜로 */
    }

    try {
      const { drafts, created } = await ensureDrafts(date, () => generateDailyDrafts(date))
      if (drafts.length === 0) {
        return apiError(ErrorCodes.SERVICE_UNAVAILABLE, 'generation_unavailable')
      }
      return apiSuccess({ date, created, drafts })
    } catch (error) {
      logger.error('[admin/social/generate] failed', { date, error })
      return apiError(ErrorCodes.INTERNAL_ERROR, 'generation_failed')
    }
  },
  createAdminGuard({ route: 'admin/social/generate' })
)
