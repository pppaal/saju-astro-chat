/**
 * Tests for /api/compatibility/report — 궁합 차트 리포트 (서버 전용 계산).
 *
 * 라우트는 body(astroA/astroB/pillarsA/pillarsB/lang)를 받아 정규화 후
 * buildCompatReport 로 넘기고 결과 JSON 을 내려준다.
 *
 * 커버:
 *  - 정상: 200 + report data, buildCompatReport 호출 인자(정규화 결과) 검증
 *  - JSON 파싱 실패: 422 VALIDATION_ERROR
 *  - sanitizePillars 분기:
 *      · 배열 아님 → null
 *      · 일주(index 2) 간지 누락 → null
 *      · 4개 초과 → 4개로 슬라이스, stem/branch 문자열화
 *  - lang 기본값 ko, 'en' 만 en
 *  - astroA/astroB 누락 시 null 로 전달
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const STATUS_MAP: Record<string, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
}

// withApiMiddleware mock — 핸들러를 context 와 호출하고 결과를 HTTP 응답으로
// 매핑한다. (tarotDaily.route.test.ts 와 동일한 패턴)
const ctxOverride: { userId: string | null; locale: string } = { userId: null, locale: 'ko' }

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => {
    return async (req: any, ...args: any[]) => {
      const context = {
        userId: ctxOverride.userId,
        session: ctxOverride.userId ? { user: { id: ctxOverride.userId } } : null,
        ip: '127.0.0.1',
        locale: ctxOverride.locale,
        isAuthenticated: Boolean(ctxOverride.userId),
        isPremium: false,
      }
      try {
        const result = await handler(req, context, ...args)
        if (result instanceof Response) return result
        if (result?.error) {
          const status = STATUS_MAP[result.error.code] || 500
          return NextResponse.json(
            { success: false, error: { ...result.error, status } },
            { status }
          )
        }
        return NextResponse.json(
          { success: true, data: result.data },
          { status: result.status || 200 }
        )
      } catch {
        return NextResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', status: 500 } },
          { status: 500 }
        )
      }
    }
  }),
  createAstrologyGuard: vi.fn((opts: any) => ({ ...opts })),
  apiSuccess: vi.fn((data: any, options?: any) => ({ data, status: options?.status })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

vi.mock('@/lib/compatibility/compatReport', () => ({
  buildCompatReport: vi.fn(() => ({
    synView: null,
    dayMaster: null,
    spouseStars: [],
    pillarRelations: [],
    band: undefined,
    crossVerdict: undefined,
  })),
}))

import { POST } from '@/app/api/compatibility/report/route'
import { buildCompatReport } from '@/lib/compatibility/compatReport'

function makeReq(body: unknown | string, opts: { raw?: boolean } = {}) {
  return new NextRequest('http://localhost:3000/api/compatibility/report', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: opts.raw ? (body as string) : JSON.stringify(body),
  })
}

const VALID_PILLARS = [
  { stem: '갑', branch: '자' },
  { stem: '을', branch: '축' },
  { stem: '병', branch: '인' }, // 일주(index 2) — 간지 둘 다 있어야 통과
  { stem: '정', branch: '묘' },
]

beforeEach(() => {
  vi.clearAllMocks()
  ctxOverride.userId = null
  ctxOverride.locale = 'ko'
  vi.mocked(buildCompatReport).mockReturnValue({
    synView: null,
    dayMaster: null,
    spouseStars: [],
    pillarRelations: [],
    band: undefined,
    crossVerdict: undefined,
  } as any)
})

describe('POST /api/compatibility/report — 정상', () => {
  it('유효한 body → 200 + report data', async () => {
    const res = await POST(
      makeReq({
        astroA: { planets: [] },
        astroB: { planets: [] },
        pillarsA: VALID_PILLARS,
        pillarsB: VALID_PILLARS,
        lang: 'ko',
      })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toHaveProperty('synView')
    expect(buildCompatReport).toHaveBeenCalledTimes(1)
  })

  it('astroA/astroB 를 그대로 전달하고 pillars 를 정규화해 넘긴다', async () => {
    await POST(
      makeReq({
        astroA: { planets: [{ name: 'Sun' }] },
        astroB: { planets: [{ name: 'Moon' }] },
        pillarsA: VALID_PILLARS,
        pillarsB: VALID_PILLARS,
        lang: 'ko',
      })
    )

    const arg = vi.mocked(buildCompatReport).mock.calls[0][0]
    expect(arg.astroA).toEqual({ planets: [{ name: 'Sun' }] })
    expect(arg.astroB).toEqual({ planets: [{ name: 'Moon' }] })
    expect(arg.pillarsA).toEqual(VALID_PILLARS)
    expect(arg.pillarsB).toEqual(VALID_PILLARS)
    expect(arg.lang).toBe('ko')
  })

  it('astroA/astroB 누락 시 null 로 전달', async () => {
    await POST(makeReq({ pillarsA: VALID_PILLARS, pillarsB: VALID_PILLARS }))

    const arg = vi.mocked(buildCompatReport).mock.calls[0][0]
    expect(arg.astroA).toBeNull()
    expect(arg.astroB).toBeNull()
  })
})

describe('POST /api/compatibility/report — JSON 파싱 실패', () => {
  it('깨진 JSON → 422 VALIDATION_ERROR, buildCompatReport 미호출', async () => {
    const res = await POST(makeReq('{ not valid json', { raw: true }))
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('VALIDATION_ERROR')
    expect(buildCompatReport).not.toHaveBeenCalled()
  })
})

describe('POST /api/compatibility/report — sanitizePillars 분기', () => {
  it('pillars 가 배열이 아니면 null 로 전달', async () => {
    await POST(makeReq({ astroA: {}, astroB: {}, pillarsA: 'nope', pillarsB: null }))

    const arg = vi.mocked(buildCompatReport).mock.calls[0][0]
    expect(arg.pillarsA).toBeNull()
    expect(arg.pillarsB).toBeNull()
  })

  it('일주(index 2)에 stem/branch 가 없으면 null', async () => {
    const noDayPillar = [
      { stem: '갑', branch: '자' },
      { stem: '을', branch: '축' },
      { stem: '', branch: '' }, // 일주 비어있음
      { stem: '정', branch: '묘' },
    ]
    await POST(makeReq({ pillarsA: noDayPillar, pillarsB: VALID_PILLARS }))

    const arg = vi.mocked(buildCompatReport).mock.calls[0][0]
    expect(arg.pillarsA).toBeNull()
    expect(arg.pillarsB).toEqual(VALID_PILLARS)
  })

  it('3개 미만(length<3)이면 null', async () => {
    const tooShort = [
      { stem: '갑', branch: '자' },
      { stem: '을', branch: '축' },
    ]
    await POST(makeReq({ pillarsA: tooShort, pillarsB: VALID_PILLARS }))

    const arg = vi.mocked(buildCompatReport).mock.calls[0][0]
    expect(arg.pillarsA).toBeNull()
  })

  it('4개 초과는 4개로 슬라이스', async () => {
    const fivePillars = [
      ...VALID_PILLARS,
      { stem: '무', branch: '진' }, // 5번째 → 잘림
    ]
    await POST(makeReq({ pillarsA: fivePillars, pillarsB: VALID_PILLARS }))

    const arg = vi.mocked(buildCompatReport).mock.calls[0][0]
    expect(arg.pillarsA).toHaveLength(4)
    expect(arg.pillarsA).toEqual(VALID_PILLARS)
  })

  it('stem/branch 가 비문자열이면 String() 으로 강제 변환', async () => {
    const numeric = [
      { stem: 1, branch: 2 },
      { stem: 3, branch: 4 },
      { stem: 5, branch: 6 }, // 일주 — 0 이 아니므로 truthy
      { stem: 7, branch: 8 },
    ]
    await POST(makeReq({ pillarsA: numeric, pillarsB: VALID_PILLARS }))

    const arg = vi.mocked(buildCompatReport).mock.calls[0][0] as any
    expect(arg.pillarsA[2]).toEqual({ stem: '5', branch: '6' })
  })

  it('null 칸은 빈 문자열로 채운다 (일주만 있으면 통과)', async () => {
    const withNulls = [null, null, { stem: '병', branch: '인' }, null]
    await POST(makeReq({ pillarsA: withNulls, pillarsB: VALID_PILLARS }))

    const arg = vi.mocked(buildCompatReport).mock.calls[0][0] as any
    expect(arg.pillarsA).toHaveLength(4)
    expect(arg.pillarsA[0]).toEqual({ stem: '', branch: '' })
    expect(arg.pillarsA[2]).toEqual({ stem: '병', branch: '인' })
  })
})

describe('POST /api/compatibility/report — lang 분기', () => {
  it('lang 미지정 시 기본 ko', async () => {
    await POST(makeReq({ pillarsA: VALID_PILLARS, pillarsB: VALID_PILLARS }))
    expect(vi.mocked(buildCompatReport).mock.calls[0][0].lang).toBe('ko')
  })

  it("lang 'en' 이면 en", async () => {
    await POST(makeReq({ pillarsA: VALID_PILLARS, pillarsB: VALID_PILLARS, lang: 'en' }))
    expect(vi.mocked(buildCompatReport).mock.calls[0][0].lang).toBe('en')
  })

  it('lang 이 알 수 없는 값이면 ko 로 폴백', async () => {
    await POST(makeReq({ pillarsA: VALID_PILLARS, pillarsB: VALID_PILLARS, lang: 'fr' }))
    expect(vi.mocked(buildCompatReport).mock.calls[0][0].lang).toBe('ko')
  })
})

describe('POST /api/compatibility/report — buildCompatReport 결과 전달', () => {
  it('빌더가 반환한 report 가 data 로 그대로 내려간다', async () => {
    const report = {
      synView: { aspects: [], overlaysAtoB: [], overlaysBtoA: [], harmony: 3, tension: 1 },
      dayMaster: null,
      spouseStars: [],
      pillarRelations: [],
      band: { synastry_harmonic: 60 },
      crossVerdict: { tone: 'aligned', text: 'x' },
    }
    vi.mocked(buildCompatReport).mockReturnValue(report as any)

    const res = await POST(makeReq({ pillarsA: VALID_PILLARS, pillarsB: VALID_PILLARS }))
    const json = await res.json()

    expect(json.data).toEqual(report)
  })
})
