// src/app/api/tarot/share/route.ts
//
// 공유 링크 생성 — 결과(라이브/데일리/히스토리)의 공유 카드 데이터를 받아
// 추측 불가 토큰으로 Redis 에 저장하고 공개 URL(/r/{token})을 돌려준다.
//
// 생성은 로그인 필요(남용 방지 + 레이트리밋). 조회(/r/[token])는 공개.
// 외부 이미지/장문 주입을 막으려 길이·개수·이미지 경로(same-origin)를 검증한다.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { createShareLink, siteBaseUrl, type ShareLinkPayload } from '@/lib/tarot/shareLink'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 카드 이미지는 same-origin 정적 에셋만 허용 — OG/페이지에 외부 URL 주입 차단.
const cardSchema = z.object({
  name: z.string().trim().min(1).max(80),
  image: z
    .string()
    .trim()
    .max(200)
    .refine((s) => s.startsWith('/images/tarot/'), 'image must be a same-origin tarot asset'),
  isReversed: z.boolean(),
})

const bodySchema = z.object({
  isKo: z.boolean(),
  question: z.string().trim().min(1).max(200),
  spreadTitle: z.string().trim().min(1).max(120),
  cards: z.array(cardSchema).min(1).max(10),
  keyMessage: z.string().trim().max(240).default(''),
  body: z.string().trim().max(6000).optional(),
})

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
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

    const payload: ShareLinkPayload = { v: 1, ...parsed.data }

    const token = await createShareLink(payload)
    if (!token) {
      logger.error('[tarot/share] failed to persist share link')
      return apiError(ErrorCodes.INTERNAL_ERROR, 'share_create_failed')
    }

    const path = `/r/${token}`
    return apiSuccess({ token, path, url: `${siteBaseUrl()}${path}` })
  },
  createAuthenticatedGuard({ route: '/api/tarot/share', limit: 20, windowSeconds: 60 })
)
