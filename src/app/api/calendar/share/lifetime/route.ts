// src/app/api/calendar/share/lifetime/route.ts
//
// "내 인생 그래프" 공유 링크 생성 — 인생 곡선(다운샘플) + 전성기/후크 한 줄을
// 추측 불가 토큰으로 Redis 에 저장하고 공개 URL(/r/{token})을 돌려준다.
// 운흐름 캘린더 공유와 동일 저장소(shareLink)·공개 페이지(/r)를 kind='lifetime'
// 으로 재사용한다. 정체성 강한 공유 자산 → 바이럴 루프.
//
// 개인 생년월일/원국은 저장하지 않는다(곡선 0..100 숫자 + 요약 텍스트만).

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
import { createShareLink, siteBaseUrl, type LifetimeShareLinkPayload } from '@/lib/tarot/shareLink'
import { recordCounter } from '@/lib/metrics/index'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  isKo: z.boolean(),
  patternLabel: z.string().trim().min(1).max(60),
  hook: z.string().trim().min(1).max(200),
  peakLabel: z.string().trim().min(1).max(40),
  // 곡선 — 0..100 정수, 8~64점. 생일·원국은 받지 않는다.
  curve: z.array(z.number().min(0).max(100)).min(8).max(64),
  nowAge: z.number().min(0).max(120),
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

    const payload: LifetimeShareLinkPayload = {
      v: 1,
      kind: 'lifetime',
      isKo: parsed.data.isKo,
      patternLabel: parsed.data.patternLabel,
      hook: parsed.data.hook,
      peakLabel: parsed.data.peakLabel,
      curve: parsed.data.curve.map((n) => Math.round(n)),
      nowAge: Math.round(parsed.data.nowAge),
    }

    const token = await createShareLink(payload)
    if (!token) {
      logger.error('[calendar/share/lifetime] failed to persist share link')
      return apiError(ErrorCodes.INTERNAL_ERROR, 'share_create_failed')
    }

    recordCounter('lifetime.share.created', 1, { source: context.userId ? 'user' : 'guest' })

    const path = `/r/${token}`
    return apiSuccess({ token, path, url: `${siteBaseUrl()}${path}` })
  },
  createPublicStreamGuard({ route: '/api/calendar/share/lifetime', limit: 12, windowSeconds: 60 })
)
