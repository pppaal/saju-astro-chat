// src/app/api/admin/social/drafts/route.ts
//
// 소셜 초안 목록 — 한 날짜의 초안 배열 + 초안이 있는 최근 날짜 인덱스를 돌려준다.

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAdminGuard,
  apiSuccess,
  type ApiContext,
} from '@/lib/api/middleware'
import { getDrafts, listDraftDates } from '@/lib/social/draftStore'
import { todayKeyKST } from '@/lib/social/generateDrafts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const GET = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    const qsDate = new URL(req.url).searchParams.get('date') || ''
    const date = DATE_RE.test(qsDate) ? qsDate : todayKeyKST()
    const [drafts, dates] = await Promise.all([getDrafts(date), listDraftDates()])
    return apiSuccess({ date, drafts, dates })
  },
  createAdminGuard({ route: 'admin/social/drafts' })
)
