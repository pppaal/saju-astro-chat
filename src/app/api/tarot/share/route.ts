// src/app/api/tarot/share/route.ts
//
// 공유 링크 생성 — 결과(라이브/데일리/히스토리)의 공유 카드 데이터를 받아
// 추측 불가 토큰으로 Redis 에 저장하고 공개 URL(/r/{token})을 돌려준다.
//
// 생성·조회 모두 로그인 불필요(게스트가 무료 카드를 다시 공유 → 바이럴 루프
// 자가증식). 남용은 IP 레이트리밋 + zod 검증(길이·개수·same-origin 이미지)로
// 가둔다. 로그인 사용자면 본문에서 계정 실명을 redact 한다.

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
import { createShareLink, siteBaseUrl, type ShareLinkPayload } from '@/lib/tarot/shareLink'
import { getUserDisplayName } from '@/lib/user/displayName'
import { recordCounter } from '@/lib/metrics/index'
import { bumpShareCreated } from '@/lib/metrics/shareCounts'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 카드 이미지는 same-origin 타로 에셋만 허용. startsWith 만으로는
// "/images/tarot/../../x" 같은 경로 탈출이 통과하므로, 슬래시·".."·쿼리·프래그
// 먼트가 끼지 않은 단순 파일명만 받는 엄격한 패턴으로 검증한다.
const TAROT_IMAGE_RE = /^\/images\/tarot\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:webp|png|jpe?g)$/
const cardSchema = z.object({
  name: z.string().trim().min(1).max(80),
  image: z
    .string()
    .trim()
    .max(200)
    .refine((s) => TAROT_IMAGE_RE.test(s), 'image must be a same-origin tarot asset'),
  isReversed: z.boolean(),
})

// 공개 페이지(/r)에 박힐 텍스트에서 공유자의 실명(계정 표시명)을 지운다.
// 해석 프롬프트가 "{이름}님" 으로 호명하므로 body/keyMessage 에 계정 이름이
// 섞여 들어올 수 있다 — 공유 카드(pickKeyMessage)와 동일한 개인정보 보호를
// 공개 페이지에도 적용한다.
function redactName(text: string | undefined, name: string | null): string | undefined {
  if (!text) return text
  let s = text
  if (name && name.length >= 2) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // "이준영님," · "이준영 님께서" · "Hi Alice," 의 이름 토큰을 통째로 제거.
    s = s.replace(
      new RegExp(`${esc}\\s*님?(?:께서|에게|한테|은|는|이|가|을|를|의|,|，|!)?`, 'g'),
      ''
    )
  }
  // 이름을 못 찾았을 때를 위한 방어 — 앞머리 일반 호명("OOO님,")도 제거.
  s = s.replace(/^[가-힣A-Za-z·\s]{1,12}님(?:께서|은|는|이|가|,|，|!|\s)+/, '')
  return s.replace(/\s{2,}/g, ' ').trim()
}

const bodySchema = z.object({
  isKo: z.boolean(),
  question: z.string().trim().min(1).max(200),
  spreadTitle: z.string().trim().min(1).max(120),
  cards: z.array(cardSchema).min(1).max(10),
  keyMessage: z.string().trim().max(240).default(''),
  body: z.string().trim().max(6000).optional(),
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

    // 공유자의 계정 실명을 공개 페이지 텍스트에서 제거(개인정보 보호).
    const callerName = await getUserDisplayName(context.userId)
    const payload: ShareLinkPayload = {
      v: 1,
      ...parsed.data,
      keyMessage: redactName(parsed.data.keyMessage, callerName) ?? '',
      body: redactName(parsed.data.body, callerName),
    }

    const token = await createShareLink(payload)
    if (!token) {
      logger.error('[tarot/share] failed to persist share link')
      return apiError(ErrorCodes.INTERNAL_ERROR, 'share_create_failed')
    }

    // 퍼널 측정 — 공유 링크 생성(게스트/유저 구분). 자가증식 여부의 핵심 지표.
    recordCounter('tarot.share.created', 1, { source: context.userId ? 'user' : 'guest' })
    await bumpShareCreated('tarot')

    const path = `/r/${token}`
    return apiSuccess({ token, path, url: `${siteBaseUrl()}${path}` })
  },
  // 게스트도 공유 링크를 만들 수 있어야 바이럴 루프가 자가증식한다(받은 사람이
  // 무료 카드 뽑고 다시 공유). 로그인 사용자는 실명 redact 그대로. 남용은 IP
  // 레이트리밋(12/분)이 가둠 — 토큰은 작고 noindex·추측 불가.
  createPublicStreamGuard({ route: '/api/tarot/share', limit: 12, windowSeconds: 60 })
)
