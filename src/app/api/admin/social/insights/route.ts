// src/app/api/admin/social/insights/route.ts
//
// 소셜 성과 — GET: 전체(인덱스된 날짜) 요약 집계(저장된 metrics 만, 외부 호출
// 없음). POST { date }: 그 날짜의 발행된 Threads 게시물 insights 를 API 로
// 재수집해 저장 후 갱신된 초안을 돌려준다.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiMiddleware,
  createAdminGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { getDrafts, listDraftDates } from '@/lib/social/draftStore'
import { insightsConfigured, refreshMetricsForDate, summarizeDrafts } from '@/lib/social/insights'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export const GET = withApiMiddleware(
  async (_req: NextRequest, _context: ApiContext) => {
    const dates = await listDraftDates()
    const all = await Promise.all(
      dates.map(async (date) => ({ date, drafts: await getDrafts(date) }))
    )
    const summary = summarizeDrafts(all)
    return apiSuccess({ summary, insightsConfigured: insightsConfigured() })
  },
  createAdminGuard({ route: 'admin/social/insights' })
)

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    if (!insightsConfigured()) {
      return apiError(ErrorCodes.SERVICE_UNAVAILABLE, 'threads_not_configured')
    }
    let json: unknown
    try {
      json = await req.json()
    } catch {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_json')
    }
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_payload')

    const { drafts, updated, firstError } = await refreshMetricsForDate(parsed.data.date)
    logger.info('[admin/social/insights] refreshed', {
      date: parsed.data.date,
      updated,
      firstError,
    })
    return apiSuccess({ drafts, updated, firstError })
  },
  createAdminGuard({ route: 'admin/social/insights-refresh' })
)
