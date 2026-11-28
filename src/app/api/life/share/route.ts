// src/app/api/life/share/route.ts
//
// 인생 흐름 공유 링크 생성(v2) — 사주 타입 이름과 인생 모양 이름만 추측 불가 토큰으로 Redis 에
// 저장하고 공개 URL(/r/{token})을 돌려준다. 캘린더 공유와 동일 저장소(shareLink)·공개
// 페이지(/r)를 kind='life' 로 분기.
//
// 개인정보(오너 결정): 생년월일 · 연도 · 범위 라벨 · 곡선 · 기둥은 받지도 저장하지도 않는다.
// 스키마는 strict — 그런 필드(birthDate · birthYear · rangeLabel · curve …)가 하나라도 오면 거절.
// 이름 칸에 숫자(연도 · 날짜 같은 것)가 들어와도 거절한다 — 타입 · 모양 이름엔 숫자가 없다.
// 옛 v1 링크(곡선 · 연도 축)는 /r/[token] 이 90일 TTL 안에서 계속 그린다(새로 만들지는 않음).

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
import { createShareLink, type LifeShareLinkPayloadV2 } from '@/lib/share/shareLink'
import { siteBaseUrl } from '@/lib/share/site'
import { recordCounter } from '@/lib/metrics'
import { bumpShareCreated } from '@/lib/metrics/shareCounts'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** 타입 · 모양 이름 — 숫자 없음(날짜 · 연도 차단), 짧은 한 줄. */
const nameSchema = z
  .string()
  .trim()
  .min(1)
  .max(48)
  .refine((v) => !/\d/.test(v), { message: 'date_like' })

const bodySchema = z
  .object({
    v: z.literal(2),
    isKo: z.boolean(),
    crossType: nameSchema,
    lifeShape: nameSchema.optional(),
  })
  .strict()

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
    const payload: LifeShareLinkPayloadV2 = {
      v: 2,
      kind: 'life',
      isKo: d.isKo,
      crossType: d.crossType,
      ...(d.lifeShape ? { lifeShape: d.lifeShape } : {}),
    }

    const token = await createShareLink(payload)
    if (!token) {
      logger.error('[life/share] failed to persist share link')
      return apiError(ErrorCodes.INTERNAL_ERROR, 'share_create_failed')
    }

    recordCounter('life.share.created', 1, { source: context.userId ? 'user' : 'guest' })
    await bumpShareCreated('life')

    const path = `/r/${token}`
    return apiSuccess({ token, path, url: `${siteBaseUrl()}${path}` })
  },
  createPublicStreamGuard({ route: '/api/life/share', limit: 12, windowSeconds: 60 })
)
