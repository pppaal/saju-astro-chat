// src/app/api/compatibility/share/route.ts
//
// 무료 궁합 결과 공유 링크 생성 — verdict 한 줄 + 두 사람 이름을 추측 불가
// 토큰으로 Redis 에 저장하고 공개 URL(/r/{token})을 돌려준다. 타로 공유와
// 동일한 저장소(shareLink)·동일한 공개 페이지(/r)를 kind 로 분기해 재사용한다.
//
// 무로그인 — 게스트가 무료 궁합을 보고 바로 공유 → 받은 사람이 또 무료로
// 해보고 다시 공유하는 바이럴 루프. 남용은 IP 레이트리밋 + zod 검증으로 가둔다.

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
import { createShareLink, siteBaseUrl, type CompatShareLinkPayload } from '@/lib/tarot/shareLink'
import { recordCounter } from '@/lib/metrics/index'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  isKo: z.boolean(),
  // 표시용 이름 — 사용자가 공유하려고 직접 넣은 값. 빈 값이면 A/B 폴백.
  nameA: z.string().trim().max(40).default(''),
  nameB: z.string().trim().max(40).default(''),
  verdict: z.string().trim().min(1).max(280),
  verdictTone: z.enum(['aligned', 'mixed', 'tension', 'neutral']),
  headline: z.string().trim().max(280).optional(),
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

    const payload: CompatShareLinkPayload = {
      v: 1,
      kind: 'compatibility',
      isKo: parsed.data.isKo,
      nameA: parsed.data.nameA || (parsed.data.isKo ? 'A' : 'A'),
      nameB: parsed.data.nameB || (parsed.data.isKo ? 'B' : 'B'),
      verdict: parsed.data.verdict,
      verdictTone: parsed.data.verdictTone,
      headline: parsed.data.headline,
    }

    const token = await createShareLink(payload)
    if (!token) {
      logger.error('[compatibility/share] failed to persist share link')
      return apiError(ErrorCodes.INTERNAL_ERROR, 'share_create_failed')
    }

    recordCounter('compatibility.share.created', 1, {
      source: context.userId ? 'user' : 'guest',
    })

    const path = `/r/${token}`
    return apiSuccess({ token, path, url: `${siteBaseUrl()}${path}` })
  },
  createPublicStreamGuard({ route: '/api/compatibility/share', limit: 12, windowSeconds: 60 })
)
