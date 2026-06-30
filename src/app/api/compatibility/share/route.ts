// src/app/api/compatibility/share/route.ts
//
// 무료 궁합 결과 공유 링크 생성 — verdict 한 줄 + 두 사람 이름을 추측 불가
// 토큰으로 Redis 에 저장하고 공개 URL(/r/{token})을 돌려준다. 타로 공유와
// 동일한 저장소(shareLink)·동일한 공개 페이지(/r)를 kind 로 분기해 재사용한다.
//
// 무로그인 — 게스트가 무료 궁합을 보고 바로 공유 → 받은 사람이 또 무료로
// 해보고 다시 공유하는 바이럴 루프. 남용은 IP 레이트리밋 + zod 검증으로 가둔다.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  withApiMiddleware,
  createPublicStreamGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import {
  createShareLink,
  getShareLink,
  isCompatShare,
  siteBaseUrl,
  type CompatShareLinkPayload,
} from '@/lib/tarot/shareLink'
import { recordCounter } from '@/lib/metrics/index'
import { bumpShareCreated } from '@/lib/metrics/shareCounts'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 옵트인 시에만 실리는 공유자 출생정보 — 받은 사람의 2-player 프리필용.
const inviterSchema = z
  .object({
    name: z.string().trim().max(40).default(''),
    birthDate: z.string().trim().min(1).max(20),
    birthTime: z.string().trim().max(10).optional(),
    timeUnknown: z.boolean().optional(),
    gender: z.enum(['male', 'female']),
    city: z.string().trim().max(120).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lon: z.number().min(-180).max(180).optional(),
    tz: z.string().trim().max(64).optional(),
  })
  .optional()

const bodySchema = z.object({
  isKo: z.boolean(),
  // 표시용 이름 — 사용자가 공유하려고 직접 넣은 값. 빈 값이면 A/B 폴백.
  nameA: z.string().trim().max(40).default(''),
  nameB: z.string().trim().max(40).default(''),
  verdict: z.string().trim().min(1).max(280),
  verdictTone: z.enum(['aligned', 'mixed', 'tension', 'neutral']),
  headline: z.string().trim().max(280).optional(),
  inviter: inviterSchema,
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
      // 옵트인 했을 때만 저장 — 미동의면 생일이 링크에 남지 않는다(프라이버시).
      ...(parsed.data.inviter ? { inviter: parsed.data.inviter } : {}),
    }

    const token = await createShareLink(payload)
    if (!token) {
      logger.error('[compatibility/share] failed to persist share link')
      return apiError(ErrorCodes.INTERNAL_ERROR, 'share_create_failed')
    }

    recordCounter('compatibility.share.created', 1, {
      source: context.userId ? 'user' : 'guest',
    })
    await bumpShareCreated('compatibility')

    const path = `/r/${token}`
    return apiSuccess({ token, path, url: `${siteBaseUrl()}${path}` })
  },
  createPublicStreamGuard({ route: '/api/compatibility/share', limit: 12, windowSeconds: 60 })
)

// 2-player 프리필 — 받은 사람이 ?token= 로 공유자(초대자) 출생정보만 받아 personA
// 를 채운다. 옵트인 안 한 공유(inviter 없음)면 invite:null 로, 친구는 평소대로
// 둘 다 입력. ID 스캔 방지용 IP 레이트리밋. verdict 등 민감하지 않은 표시값은
// /r 페이지가 따로 보여주므로 여기선 inviter 만 노출(최소 권한).
export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers)
  const rl = await rateLimit(`compat:share:invite:${ip}`, { limit: 60, windowSeconds: 60 })
  if (!rl.allowed) {
    return apiError(ErrorCodes.RATE_LIMITED, 'rate_limited')
  }
  const token = (new URL(req.url).searchParams.get('token') || '').trim()
  if (!token) {
    return apiError(ErrorCodes.VALIDATION_ERROR, 'missing_token')
  }
  const reading = await getShareLink(token)
  if (!reading || !isCompatShare(reading)) {
    return NextResponse.json({ invite: null })
  }
  return NextResponse.json({
    invite: reading.inviter ? { nameA: reading.nameA, inviter: reading.inviter } : null,
  })
}
