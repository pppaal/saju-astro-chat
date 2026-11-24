// src/app/api/compatibility/share/invite/route.ts
//
// 초대 링크 궁합 — 받은 사람이 공유 토큰 + 자기 출생정보만 보내면, 서버가 공유
// 레코드(Redis)에서 공유자(초대자) 출생정보를 꺼내 두 사람 궁합을 계산하고 결과만
// 돌려준다. 공유자의 생년월일·시각·성별·도시·좌표·타임존은 응답에 싣지 않는다 —
// 토큰은 /r 페이지 CTA 에 실린 공개값이라 단톡방·게시글로 퍼져도 출생정보가
// 새지 않아야 한다. 무료·무로그인(크레딧 0). 사주·차트 계산 두 사람분이라
// 점성 계산 프리셋 레이트리밋(IP)을 건다.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiMiddleware,
  createAstrologyGuard,
  apiError,
  apiSuccess,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import {
  dateSchema,
  timeSchema,
  timezoneSchema,
  latitudeSchema,
  longitudeSchema,
} from '@/lib/api/zodValidation'
import { getShareLink, isCompatShare } from '@/lib/share/shareLink'
import { computeInvitePairReport } from '@/lib/compatibility/invitePairing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 받은 사람 본인의 출생정보 — 무료 궁합 폼(BirthInfoFields)이 만드는 값 그대로.
const personSchema = z.object({
  birthDate: dateSchema,
  // 시간 모름이면 빈 값 — 서버가 정오 앵커로 계산한다(birthTimeAnchor SSOT).
  birthTime: z.union([z.literal(''), timeSchema]).optional(),
  timeUnknown: z.boolean().optional(),
  gender: z.enum(['male', 'female']).optional(),
  lat: latitudeSchema.optional(),
  lon: longitudeSchema.optional(),
  tz: timezoneSchema.optional(),
})

const bodySchema = z.object({
  token: z.string().trim().min(1).max(64),
  person: personSchema,
  lang: z.enum(['ko', 'en']).optional(),
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
      return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_invite_payload')
    }

    // 만료(90일 TTL)·궁합 공유 아님·공유자 미동의(inviter 없음)는 모두 같은 404 —
    // 어떤 토큰이 옵트인 했는지 구분해 알려주지 않는다.
    const share = await getShareLink(parsed.data.token)
    if (!share || !isCompatShare(share) || !share.inviter) {
      return apiError(ErrorCodes.NOT_FOUND, 'invite_not_found')
    }

    const { report, timeUnknownA } = await computeInvitePairReport({
      inviter: share.inviter,
      invitee: parsed.data.person,
      lang: parsed.data.lang === 'en' ? 'en' : 'ko',
    })

    // 공유자 쪽은 표시용 이름과 "시간 미상" 여부(추정 안내문용)만 — 출생정보 원본은 없다.
    return apiSuccess({
      inviter: { name: share.inviter.name || share.nameA, timeUnknown: timeUnknownA },
      report,
    })
  },
  createAstrologyGuard({ route: '/api/compatibility/share/invite' })
)
