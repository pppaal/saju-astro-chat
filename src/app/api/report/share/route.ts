// src/app/api/report/share/route.ts
//
// 무료 통합 리포트 결과 공유 링크 생성 — 사주 "유형 별명" + 소름 한 줄을 추측
// 불가 토큰으로 Redis 에 저장하고 공개 URL(/r/{token})을 돌려준다. 타로·궁합
// 공유와 동일한 저장소(shareLink)·동일한 공개 페이지(/r)를 kind='report' 로
// 분기해 재사용한다.
//
// 무로그인 — 간판 무료 상품(통합 리포트)이 이미지뿐 아니라 클릭 가능한 링크로도
// 퍼지게 해 바이럴 루프를 닫는다. 저장값은 PII 가 아닌 유형 사전(명식 도출)뿐.
// 남용은 IP 레이트리밋 + zod 검증으로 가둔다.

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
import { createShareLink, siteBaseUrl, type ReportShareLinkPayload } from '@/lib/tarot/shareLink'
import { recordCounter } from '@/lib/metrics/index'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  isKo: z.boolean(),
  emoji: z.string().trim().max(8).default('🔮'),
  typeName: z.string().trim().min(1).max(60),
  oneLiner: z.string().trim().min(1).max(280),
  resonant: z.array(z.string().trim().max(120)).max(3).optional(),
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

    const payload: ReportShareLinkPayload = {
      v: 1,
      kind: 'report',
      isKo: parsed.data.isKo,
      emoji: parsed.data.emoji || '🔮',
      typeName: parsed.data.typeName,
      oneLiner: parsed.data.oneLiner,
      resonant: parsed.data.resonant?.filter(Boolean),
    }

    const token = await createShareLink(payload)
    if (!token) {
      logger.error('[report/share] failed to persist share link')
      return apiError(ErrorCodes.INTERNAL_ERROR, 'share_create_failed')
    }

    recordCounter('report.share.created', 1, {
      source: context.userId ? 'user' : 'guest',
    })

    const path = `/r/${token}`
    return apiSuccess({ token, path, url: `${siteBaseUrl()}${path}` })
  },
  createPublicStreamGuard({ route: '/api/report/share', limit: 12, windowSeconds: 60 })
)
