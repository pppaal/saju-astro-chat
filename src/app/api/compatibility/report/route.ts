// src/app/api/compatibility/report/route.ts
//
// 궁합 차트 리포트 — 시너스트리·사주 cross·점수 계산을 서버에서만 수행하고
// 결과(JSON)만 내려준다. 계산 로직을 클라 번들에서 빼서 엣지(IP)를 보호한다.
// 입력(natal/pillars)은 차트 시각화용으로 클라가 이미 들고 있는 *데이터*다.

import { NextRequest } from 'next/server'
import { buildCompatReport } from '@/lib/compatibility/compatReport'
import type { SajuPillarInput } from '@/lib/compatibility/sajuSynastryFormatter'
import {
  withApiMiddleware,
  createAstrologyGuard,
  apiError,
  apiSuccess,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { HTTP_STATUS } from '@/lib/constants/http'

type Body = {
  astroA?: unknown
  astroB?: unknown
  pillarsA?: SajuPillarInput[] | null
  pillarsB?: SajuPillarInput[] | null
  timeUnknownA?: boolean
  timeUnknownB?: boolean
  lang?: 'ko' | 'en'
}

// 클라가 보낸 pillars 배열을 신뢰 전 정규화 — 각 칸 {stem,branch} 문자열만 취함.
function sanitizePillars(v: unknown): SajuPillarInput[] | null {
  if (!Array.isArray(v)) return null
  const out = v.slice(0, 4).map((p) => {
    const o = (p ?? {}) as Record<string, unknown>
    return { stem: String(o.stem ?? ''), branch: String(o.branch ?? '') }
  })
  // 일주(index 2)에 간지가 있어야 사주측 계산 의미가 있음
  if (out.length < 3 || !out[2].stem || !out[2].branch) return null
  return out
}

// 시너스트리 엔진은 planetsA×planetsB 를 이중 루프(O(n×m))로 도는데, astro 입력엔
// pillars 의 4칸 캡 같은 상한이 없었다. 공개 토큰(번들 노출)만 있으면 수만 개
// planets 를 실은 본문으로 2차식 CPU 를 유발할 수 있다. 실제 차트는 행성 ~14개·
// 하우스 12개라, 넉넉한 상한(행성 40·하우스 24)은 정상 입력을 절대 자르지 않으면서
// n² 를 확실히 묶는다. 다른 필드(ascendant/mc 등)는 그대로 보존한다.
const MAX_ASTRO_PLANETS = 40
const MAX_ASTRO_HOUSES = 24
export function sanitizeAstro(v: unknown): unknown {
  if (!v || typeof v !== 'object') return v ?? null
  const o = v as Record<string, unknown>
  if (!Array.isArray(o.planets) && !Array.isArray(o.houses)) return v
  return {
    ...o,
    ...(Array.isArray(o.planets) ? { planets: o.planets.slice(0, MAX_ASTRO_PLANETS) } : {}),
    ...(Array.isArray(o.houses) ? { houses: o.houses.slice(0, MAX_ASTRO_HOUSES) } : {}),
  }
}

export const POST = withApiMiddleware(async (req: NextRequest, _context: ApiContext) => {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body')
  }

  const report = buildCompatReport({
    astroA: sanitizeAstro(body.astroA ?? null),
    astroB: sanitizeAstro(body.astroB ?? null),
    pillarsA: sanitizePillars(body.pillarsA),
    pillarsB: sanitizePillars(body.pillarsB),
    timeUnknownA: body.timeUnknownA === true,
    timeUnknownB: body.timeUnknownB === true,
    lang: body.lang === 'en' ? 'en' : 'ko',
  })

  return apiSuccess(report, { status: HTTP_STATUS.OK })
}, createAstrologyGuard())
