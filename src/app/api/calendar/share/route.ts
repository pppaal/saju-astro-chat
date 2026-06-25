// src/app/api/calendar/share/route.ts
//
// 운흐름 캘린더 공유 링크 생성 — 이달의 흐름 한 줄 + 큰 날 몇 개를 추측 불가
// 토큰으로 Redis 에 저장하고 공개 URL(/r/{token})을 돌려준다. 타로·궁합 공유와
// 동일 저장소(shareLink)·동일 공개 페이지(/r)를 kind 로 분기해 재사용한다.
//
// 사용자가 직접 자기 흐름 한 줄을 공유 → 받은 사람이 무료 도구로 유입되는
// 바이럴 루프. 개인 생년월일/원국은 저장하지 않는다(요약 텍스트만).

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiMiddleware,
  createPublicStreamGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { createShareLink, siteBaseUrl, type CalendarShareLinkPayload } from '@/lib/tarot/shareLink'
import { recordCounter } from '@/lib/metrics/index'
import { bumpShareCreated } from '@/lib/metrics/shareCounts'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  isKo: z.boolean(),
  periodLabel: z.string().trim().min(1).max(60),
  headline: z.string().trim().min(1).max(280),
  highlights: z.array(z.string().trim().min(1).max(160)).max(5).optional(),
})

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    let json: unknown
    try {
      json = await req.json()
    } catch {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_json')
    }

    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_share_payload')
    }

    const payload: CalendarShareLinkPayload = {
      v: 1,
      kind: 'calendar',
      isKo: parsed.data.isKo,
      periodLabel: parsed.data.periodLabel,
      headline: parsed.data.headline,
      highlights: parsed.data.highlights?.length ? parsed.data.highlights : undefined,
    }

    const token = await createShareLink(payload)
    if (!token) {
      logger.error('[calendar/share] failed to persist share link')
      return apiError(ErrorCodes.INTERNAL_ERROR, 'share_create_failed')
    }

    recordCounter('calendar.share.created', 1, { source: context.userId ? 'user' : 'guest' })
    await bumpShareCreated('calendar')

    const path = `/r/${token}`
    return apiSuccess({ token, path, url: `${siteBaseUrl()}${path}` })
  },
  createPublicStreamGuard({ route: '/api/calendar/share', limit: 12, windowSeconds: 60 })
)
