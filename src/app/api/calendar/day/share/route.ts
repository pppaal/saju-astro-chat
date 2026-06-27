// src/app/api/calendar/day/share/route.ts
//
// 하루(일진) 공유 링크 생성 — 점수 + 한 줄 + 이달 흐름 곡선(숫자 배열)을
// 추측 불가 토큰으로 Redis 에 저장하고 공개 URL(/r/{token})을 돌려준다.
// 캘린더 공유와 동일 저장소(shareLink)·공개 페이지(/r)를 kind='day' 로 분기.
//
// 개인 생년월일/원국은 저장하지 않는다 — 점수·요약 텍스트·곡선 숫자만.

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
import { createShareLink, siteBaseUrl, type DayShareLinkPayload } from '@/lib/tarot/shareLink'
import { recordCounter } from '@/lib/metrics/index'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  isKo: z.boolean(),
  dateLabel: z.string().trim().min(1).max(40),
  score: z.number().int().min(0).max(100),
  tone: z.enum(['positive', 'mixed', 'caution']),
  headline: z.string().trim().min(1).max(160),
  subline: z.string().trim().min(1).max(160).optional(),
  curve: z.array(z.number().min(0).max(100)).min(2).max(31).optional(),
  markerIndex: z.number().int().min(0).max(30).optional(),
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

    const d = parsed.data
    const payload: DayShareLinkPayload = {
      v: 1,
      kind: 'day',
      isKo: d.isKo,
      dateLabel: d.dateLabel,
      score: d.score,
      tone: d.tone,
      headline: d.headline,
      subline: d.subline,
      curve: d.curve?.length ? d.curve.map((n) => Math.round(n)) : undefined,
      markerIndex: d.markerIndex,
    }

    const token = await createShareLink(payload)
    if (!token) {
      logger.error('[calendar/day/share] failed to persist share link')
      return apiError(ErrorCodes.INTERNAL_ERROR, 'share_create_failed')
    }

    recordCounter('calendar.dayShare.created', 1, { source: context.userId ? 'user' : 'guest' })

    const path = `/r/${token}`
    return apiSuccess({ token, path, url: `${siteBaseUrl()}${path}` })
  },
  createPublicStreamGuard({ route: '/api/calendar/day/share', limit: 12, windowSeconds: 60 })
)
