/**
 * Tests for POST /api/saju — 사주(four-pillars) 계산 핸들러.
 *
 * 무거운 결정론 엔진(calculateSajuData / unse / shinsal / relations / services)
 * 은 전부 mock 해서 라우트의 분기·조립 로직만 검증한다(네트워크/DB/엔진 미접근).
 *
 * 커버:
 *  - zod 검증 실패 → VALIDATION_ERROR
 *  - 로그인 사용자(무료 플랜) 성공 → isPremium:false / isLoggedIn:true
 *  - 로그인 사용자(유료 플랜) 성공 → isPremium:true
 *  - 비로그인 + Stripe 프리미엄 → isPremium:true
 *  - 비로그인(게스트) → isPremium:false
 *  - longitude 가 캐시 키 segment 로 들어가는지
 *  - calendarType='solar' 인데 lunarLeap=true → 무시(false 로 정규화)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const STATUS_MAP: Record<string, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
}

// 핸들러에 주입할 context 를 테스트가 제어할 수 있게 하는 가변 핸들.
const ctxOverride: {
  userId: string | null
  email: string | null
  isAuthenticated: boolean
} = { userId: null, email: null, isAuthenticated: false }

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => {
    return async (req: any, ...args: any[]) => {
      const context = {
        userId: ctxOverride.userId,
        session: ctxOverride.email ? { user: { email: ctxOverride.email } } : null,
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: ctxOverride.isAuthenticated,
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
  createSajuGuard: vi.fn(() => ({})),
  parseJsonBody: vi.fn(async (req: any) => req.json()),
  apiSuccess: vi.fn((data: any, options?: any) => ({ data, status: options?.status })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

// 결정론 엔진 — 캐시 콜백을 실행하지 않고 고정 결과를 돌려준다.
const fakeSajuResult = {
  yearPillar: {
    heavenlyStem: { name: '갑' },
    earthlyBranch: { name: '자' },
    jijanggan: [],
  },
  monthPillar: {
    heavenlyStem: { name: '병' },
    earthlyBranch: { name: '인' },
    jijanggan: [],
  },
  dayPillar: {
    heavenlyStem: { name: '무' },
    earthlyBranch: { name: '진' },
    jijanggan: [],
  },
  timePillar: {
    heavenlyStem: { name: '경' },
    earthlyBranch: { name: '오' },
    jijanggan: [],
  },
  fiveElements: { wood: 1, fire: 1, earth: 1, metal: 1, water: 1 },
  dayMaster: '무',
  daeWoon: {
    startAge: 5,
    isForward: true,
    current: { age: 35, stem: '신', branch: '미' },
    list: [
      { age: 5, stem: '정', branch: '묘' },
      { age: 15, stem: '무', branch: '진' },
      { age: 25, stem: '기', branch: '사' },
      { age: 35, stem: '경', branch: '오' },
      { age: 45, stem: '신', branch: '미' },
    ],
  },
}

vi.mock('@/lib/saju/saju', () => ({
  calculateSajuData: vi.fn(() => fakeSajuResult),
}))

vi.mock('@/lib/utils/gender', () => ({
  normalizeGender: vi.fn((g: string) =>
    String(g).toLowerCase().startsWith('f') ? 'female' : 'male'
  ),
}))

// cacheOrCalculate 는 콜백을 실행해 결과를 그대로 반환(캐시 미스 흉내).
const cacheOrCalculate = vi.fn(async (_key: string, fn: () => any) => fn())
vi.mock('@/lib/cache/redis-cache', () => ({
  cacheOrCalculate: (...a: any[]) => (cacheOrCalculate as any)(...a),
  CacheKeys: {
    saju: (...parts: any[]) => `saju:${parts.join(':')}`,
  },
  CACHE_TTL: { NATAL_CHART: 2592000 },
}))

const getCreditBalance = vi.fn(async () => ({ plan: 'free', balance: 0 }))
vi.mock('@/lib/credits/creditService', () => ({
  getCreditBalance: (...a: any[]) => (getCreditBalance as any)(...a),
}))

vi.mock('@/lib/datetime', () => ({
  getNowInTimezone: vi.fn(() => ({ year: 2026, month: 6, day: 21 })),
}))

vi.mock('@/lib/saju/unse', () => ({
  getAnnualCycles: vi.fn(() => [{ year: 2026, stem: '병', branch: '오' }]),
  getMonthlyCycles: vi.fn(() => [{ month: 6, stem: '갑', branch: '오' }]),
  getIljinCalendar: vi.fn(() => [{ day: 21, stem: '을', branch: '미' }]),
}))

vi.mock('@/lib/saju/shinsal', () => ({
  getShinsalHits: vi.fn(() => []),
  getTwelveStagesForPillars: vi.fn(() => ({
    year: '제왕',
    month: '건록',
    day: '관대',
    time: '목욕',
  })),
  getTwelveShinsalSingleByPillar: vi.fn(() => ({
    year: '장성',
    month: '역마',
    day: '도화',
    time: '화개',
  })),
}))

vi.mock('@/lib/saju/relations', () => ({
  analyzeRelations: vi.fn(() => ({ hits: [] })),
  toAnalyzeInputFromSaju: vi.fn(() => ({})),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/telemetry', () => ({
  withSpan: vi.fn(async (_name: string, _kind: string, fn: () => any) => fn()),
}))

const checkPremiumStatus = vi.fn(async () => false)
vi.mock('@/app/api/saju/services', () => ({
  checkPremiumStatus: (...a: any[]) => (checkPremiumStatus as any)(...a),
  withYY: vi.fn((s: any) => s),
  toBranch: vi.fn((b: any) => b),
  pickLucky: vi.fn(() => []),
  coerceJijanggan: vi.fn((j: any) => j),
  enrichSibsin: vi.fn(() => ({ chogi: {}, junggi: {}, jeonggi: {} })),
  buildJijangganRaw: vi.fn(() => ({ raw: '', list: [] })),
  performAnalyses: vi.fn(() => ({ summary: 'ok' })),
}))

import { POST } from '@/app/api/saju/route'
import { calculateSajuData } from '@/lib/saju/saju'

function makeReq(body: unknown) {
  return new NextRequest('http://localhost:3000/api/saju', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  birthDate: '1990-05-15',
  birthTime: '14:30',
  gender: 'female',
  calendarType: 'solar' as const,
  timezone: 'Asia/Seoul',
}

beforeEach(() => {
  vi.clearAllMocks()
  ctxOverride.userId = null
  ctxOverride.email = null
  ctxOverride.isAuthenticated = false
  getCreditBalance.mockResolvedValue({ plan: 'free', balance: 0 })
  checkPremiumStatus.mockResolvedValue(false)
  cacheOrCalculate.mockImplementation(async (_key: string, fn: () => any) => fn())
  vi.mocked(calculateSajuData).mockReturnValue(fakeSajuResult as any)
})

describe('POST /api/saju', () => {
  it('검증 실패(필수 필드 누락)면 VALIDATION_ERROR', async () => {
    const res = await POST(makeReq({ birthDate: 'not-a-date' }))
    const data = await res.json()
    expect(res.status).toBe(422)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(calculateSajuData).not.toHaveBeenCalled()
  })

  it('게스트(비로그인) 정상 계산 → isPremium:false, isLoggedIn:false', async () => {
    const res = await POST(makeReq(validBody))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.isPremium).toBe(false)
    expect(data.data.isLoggedIn).toBe(false)
    expect(data.data.birthDate).toBe('1990-05-15')
    expect(data.data.birthYear).toBe(1990)
    expect(data.data.dayMaster).toBe('무')
    expect(data.data.daeun.list).toHaveLength(5)
    expect(calculateSajuData).toHaveBeenCalledOnce()
  })

  it('로그인 무료 사용자 → 크레딧 조회, isPremium:false', async () => {
    ctxOverride.userId = 'user_1'
    ctxOverride.isAuthenticated = true
    getCreditBalance.mockResolvedValue({ plan: 'free', balance: 0 })

    const res = await POST(makeReq(validBody))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.isPremium).toBe(false)
    expect(data.data.isLoggedIn).toBe(true)
    expect(getCreditBalance).toHaveBeenCalledWith('user_1')
  })

  it('로그인 유료 사용자(plan!=free) → isPremium:true', async () => {
    ctxOverride.userId = 'user_2'
    ctxOverride.isAuthenticated = true
    getCreditBalance.mockResolvedValue({ plan: 'paid', balance: 100 })

    const res = await POST(makeReq(validBody))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.isPremium).toBe(true)
  })

  it('비로그인이지만 session.email 있고 Stripe 프리미엄이면 isPremium:true', async () => {
    ctxOverride.userId = null
    ctxOverride.email = 'guest@example.com'
    checkPremiumStatus.mockResolvedValue(true)

    const res = await POST(makeReq(validBody))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.isPremium).toBe(true)
    expect(checkPremiumStatus).toHaveBeenCalled()
    expect(getCreditBalance).not.toHaveBeenCalled()
  })

  it('longitude 가 있으면 캐시 키에 lon segment 가 들어간다', async () => {
    await POST(makeReq({ ...validBody, longitude: 126.978 }))
    const key = cacheOrCalculate.mock.calls[0][0] as string
    expect(key).toContain(':lon=126.9780')
  })

  it('longitude 없으면 캐시 키에 lon segment 없음', async () => {
    await POST(makeReq(validBody))
    const key = cacheOrCalculate.mock.calls[0][0] as string
    expect(key).not.toContain(':lon=')
  })

  it("calendarType='solar' 인데 lunarLeap=true → false 로 정규화돼 엔진에 전달", async () => {
    await POST(makeReq({ ...validBody, calendarType: 'solar', lunarLeap: true }))
    // calculateSajuData 6번째 인자 = lunarLeap
    const args = vi.mocked(calculateSajuData).mock.calls[0]
    expect(args[5]).toBe(false)
  })

  it("calendarType='lunar' + lunarLeap=true → true 로 엔진에 전달", async () => {
    await POST(makeReq({ ...validBody, calendarType: 'lunar', lunarLeap: true }))
    const args = vi.mocked(calculateSajuData).mock.calls[0]
    expect(args[5]).toBe(true)
  })

  it('여성 입력은 sajuGender=female 로 엔진에 전달', async () => {
    await POST(makeReq({ ...validBody, gender: 'female' }))
    const args = vi.mocked(calculateSajuData).mock.calls[0]
    expect(args[2]).toBe('female')
  })

  it('응답에 yeonun/wolun/iljin/table/relations/analyses 가 조립돼 있다', async () => {
    const res = await POST(makeReq(validBody))
    const data = await res.json()
    expect(data.data.yeonun).toBeDefined()
    expect(data.data.wolun).toBeDefined()
    expect(data.data.iljin).toBeDefined()
    expect(data.data.table.byPillar.year).toBeDefined()
    expect(data.data.relations).toBeDefined()
    expect(data.data.analyses).toBeDefined()
    expect(data.data.analysisDate).toBe('2026-06-21')
  })
})
