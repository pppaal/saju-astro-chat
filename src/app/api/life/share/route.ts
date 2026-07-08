// src/app/api/life/share/route.ts
//
// 인생/대운 곡선 공유 링크 생성 — 한 줄 + 인생 흐름 곡선(숫자 배열 + 연도
// 라벨)을 추측 불가 토큰으로 Redis 에 저장하고 공개 URL(/r/{token})을 돌려준다.
// 캘린더 공유와 동일 저장소(shareLink)·공개 페이지(/r)를 kind='life' 로 분기.
//
// 개인 생년월일/원국은 저장하지 않는다 — 요약 텍스트·곡선 숫자·연도 라벨만.

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
import { createShareLink, siteBaseUrl, type LifeShareLinkPayload } from '@/lib/tarot/shareLink'
import { recordCounter } from '@/lib/metrics/index'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  isKo: z.boolean(),
  typeName: z.string().trim().min(1).max(40).optional(),
  rangeLabel: z.string().trim().min(1).max(40).optional(),
  headline: z.string().trim().min(1).max(160),
  subline: z.string().trim().min(1).max(160).optional(),
  curve: z.array(z.number().min(0).max(100)).min(2).max(120),
  axisLabels: z.array(z.string().trim().min(1).max(16)).max(4).optional(),
  markerIndex: z.number().int().min(0).max(119).optional(),
  peakIndex: z.number().int().min(0).max(119).optional(),
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
    const payload: LifeShareLinkPayload = {
      v: 1,
      kind: 'life',
      isKo: d.isKo,
      typeName: d.typeName,
      rangeLabel: d.rangeLabel,
      headline: d.headline,
      subline: d.subline,
      curve: d.curve.map((n) => Math.round(n)),
      axisLabels: d.axisLabels?.length ? d.axisLabels : undefined,
      markerIndex: d.markerIndex,
      peakIndex: d.peakIndex,
    }

    const token = await createShareLink(payload)
    if (!token) {
      logger.error('[life/share] failed to persist share link')
      return apiError(ErrorCodes.INTERNAL_ERROR, 'share_create_failed')
    }

    recordCounter('life.share.created', 1, { source: context.userId ? 'user' : 'guest' })

    const path = `/r/${token}`
    return apiSuccess({ token, path, url: `${siteBaseUrl()}${path}` })
  },
  createPublicStreamGuard({ route: '/api/life/share', limit: 12, windowSeconds: 60 })
)
