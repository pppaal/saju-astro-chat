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
import { ensureDrafts, regenerateDrafts } from '@/lib/social/draftStore'
import { generateDailyDrafts, todayKeyKST } from '@/lib/social/generateDrafts'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    let date = todayKeyKST()
    let force = false
    try {
      const body = (await req.json().catch(() => null)) as {
        date?: string
        force?: boolean
      } | null
      if (body?.date && DATE_RE.test(body.date)) date = body.date
      force = body?.force === true
    } catch {
      /* body 없음 — 오늘 날짜로 */
    }

    try {
      // force: 프롬프트 수정 직후 "지금 다시" 보기용 — 발행분은 보존하고 나머지만
      // 새로 생성해 교체(regenerateDrafts). 기본은 기존 초안 있으면 그대로(ensure).
      const { drafts, created } = force
        ? await regenerateDrafts(date, () => generateDailyDrafts(date))
        : await ensureDrafts(date, () => generateDailyDrafts(date))
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
