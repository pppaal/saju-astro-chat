/**
 * POST /api/saju — 실제 엔진으로 도는 라우트 테스트 (엔진 감사 E14 · SAJU-5 · SAJU-7 · SAJU-8).
 *
 * 미들웨어·크레딧·Redis 만 mock 하고 calculateSajuData·zod·운세·신살은 실제로 돈다.
 *  - 1900–1939 출생(SAJU-5, OD-4): 1935-05-05 가 500 이 아니라 200 이고, 네 기둥이 독립
 *    참조(astronomy-engine 節 instant + JDN 일주 + 평균태양시 시주)와 같다. 1899-12-31 은 zod
 *    검증 에러(4xx)로 막히고 엔진까지 가지 않는다.
 *  - 캐시 hit + 시계 주입(SAJU-8): Redis 에 계산 시점의 결과가 남아 있어도 daeun.current 는
 *    요청 시각으로 다시 고른다 — 대운 경계 생일을 넘기면 바뀐다. 첫 대운 전(OD-12)이면
 *    current = null + preDaeun.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import * as Astronomy from 'astronomy-engine'
import golden from '../../golden/engine-golden.json'

const STATUS_MAP: Record<string, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422, // errorHandler.ts 와 같은 매핑
  INTERNAL_ERROR: 500,
}

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => {
    return async (req: any, ...args: any[]) => {
      const context = {
        userId: null,
        session: null,
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: false,
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
        return NextResponse.json({ success: true, data: result.data }, { status: 200 })
      } catch (e) {
        return NextResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', message: String(e), status: 500 } },
          { status: 500 }
        )
      }
    }
  }),
  createSajuGuard: vi.fn(() => ({})),
  parseJsonBody: vi.fn(async (req: any) => req.json()),
  apiSuccess: vi.fn((data: any) => ({ data })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: { VALIDATION_ERROR: 'VALIDATION_ERROR', INTERNAL_ERROR: 'INTERNAL_ERROR' },
}))

// Redis 흉내 — JSON 직렬화 왕복(Upstash 와 같은 의미론). computeCount = 캐시 미스 횟수.
const store = new Map<string, string>()
let computeCount = 0
vi.mock('@/lib/cache/redis-cache', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/cache/redis-cache')>('@/lib/cache/redis-cache')
  return {
    CacheKeys: actual.CacheKeys,
    CACHE_TTL: actual.CACHE_TTL,
    cacheOrCalculate: async (key: string, fn: () => Promise<unknown>) => {
      const hit = store.get(key)
      if (hit) return JSON.parse(hit)
      computeCount++
      const v = await fn()
      store.set(key, JSON.stringify(v))
      return v
    },
  }
})

vi.mock('@/lib/credits/creditService', () => ({
  getCreditBalance: vi.fn(async () => ({ plan: 'free', balance: 0 })),
}))
vi.mock('@/app/api/saju/services/premiumCheck', () => ({
  checkPremiumStatus: vi.fn(async () => false),
}))
vi.mock('@/lib/telemetry', () => ({
  withSpan: vi.fn(async (_n: string, _k: string, fn: () => unknown) => fn()),
}))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { POST } from '@/app/api/saju/route'

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest('http://localhost:3000/api/saju', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
}

type Pillar = { heavenlyStem: { name: string }; earthlyBranch: { name: string } }
const gz = (p: Pillar) => p.heavenlyStem.name + p.earthlyBranch.name
const dgz = (d: { heavenlyStem: string; earthlyBranch: string } | null) =>
  d ? d.heavenlyStem + d.earthlyBranch : null

// ── 독립 참조(엔진 코드 미사용) — scripts/golden/build-engine-golden.mts 와 같은 정의 ──────
const STEMS = '甲乙丙丁戊己庚辛壬癸'.split('')
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'.split('')
const DAY_MS = 86_400_000
const n360 = (x: number) => ((x % 360) + 360) % 360
const pillarName = (s: number, b: number) =>
  STEMS[((s % 10) + 10) % 10] + BRANCHES[((b % 12) + 12) % 12]

/** 출생지 벽시계 → UT ms (시각이 공백·겹침이 아닌 경우). */
function wallToUt(date: string, time: string, tz: string): number {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const naive = Date.UTC(y, mo - 1, d, h, mi)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(naive))
  const p: Record<string, number> = {}
  for (const x of parts) if (x.type !== 'literal') p[x.type] = Number(x.value)
  const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - naive
  return naive - offset
}

/** astronomy-engine 節 + JDN 일주 + 평균태양시 시주 (CONVENTIONS §1, OD-1). */
function referencePillars(date: string, time: string, tz: string, lon: number): string[] {
  const X = wallToUt(date, time, tz)
  const yU = new Date(X).getUTCFullYear()
  const lichun = Astronomy.SearchSunLongitude(315, new Date(Date.UTC(yU, 0, 25)), 20)!.date
  const Y = X >= lichun.getTime() ? yU : yU - 1
  const ys = (((Y - 4) % 10) + 10) % 10
  const k = Math.floor(n360(Astronomy.SunPosition(new Date(X)).elon - 315) / 30)
  const month = pillarName((ys % 5) * 2 + 2 + k, 2 + k)
  const [y, mo, d] = date.split('-').map(Number)
  const jdn = Math.floor(Date.UTC(y, mo - 1, d) / DAY_MS)
  const anchor = Math.floor(Date.UTC(2000, 0, 1) / DAY_MS) // 2000-01-01 = 戊午 (index 54)
  const dayIdx = (((jdn - anchor + 54) % 60) + 60) % 60
  const lmtMin = X / 60_000 + lon * 4
  const hb = Math.floor(((((lmtMin + 60) % 1440) + 1440) % 1440) / 120)
  return [
    pillarName(ys, Y - 4),
    month,
    pillarName(dayIdx % 10, dayIdx % 12),
    pillarName(((dayIdx % 10) % 5) * 2 + hb, hb),
  ]
}

type GoldenCase = {
  id: string
  input: { date: string; time: string; tz: string; lon: number; gender: 'male' | 'female' }
  proposed: { daeun: { first3: string[]; current: { pillar: string; age: number } | null } }
}
const goldenCase = (id: string) =>
  (golden.saju.cases as unknown as GoldenCase[]).find((c) => c.id === id)!

beforeEach(() => {
  store.clear()
  computeCount = 0
})
afterEach(() => {
  vi.useRealTimers()
})

describe('POST /api/saju — 1900–1939 출생 (SAJU-5, OD-4)', () => {
  it('1935-05-05 10:00 M 서울 → 200, 네 기둥 = astronomy-engine 참조', async () => {
    const body = {
      birthDate: '1935-05-05',
      birthTime: '10:00',
      gender: 'male',
      calendarType: 'solar',
      timezone: 'Asia/Seoul',
      longitude: 126.978,
    }
    const res = await post(body)
    const json = await res.json()
    expect(res.status, JSON.stringify(json.error)).toBe(200)
    const d = json.data
    const served = [d.yearPillar, d.monthPillar, d.dayPillar, d.timePillar].map(gz)
    const ref = referencePillars('1935-05-05', '10:00', 'Asia/Seoul', 126.978)
    expect(served).toEqual(ref)
    expect(d.daeun.list).toHaveLength(10)
  })

  it('1900-01-03 (소한 이전, 1899 경계행 lookup) → 200, 참조와 같은 기둥', async () => {
    const res = await post({
      birthDate: '1900-01-03',
      birthTime: '12:00',
      gender: 'female',
      calendarType: 'solar',
      timezone: 'Asia/Seoul',
      longitude: 126.978,
    })
    const json = await res.json()
    expect(res.status, JSON.stringify(json.error)).toBe(200)
    const d = json.data
    expect([d.yearPillar, d.monthPillar, d.dayPillar, d.timePillar].map(gz)).toEqual(
      referencePillars('1900-01-03', '12:00', 'Asia/Seoul', 126.978)
    )
  })

  it('1899-12-31 → zod 검증 에러(4xx), 엔진 미호출 — 500 아님', async () => {
    const res = await post({
      birthDate: '1899-12-31',
      birthTime: '10:00',
      gender: 'male',
      calendarType: 'solar',
      timezone: 'Asia/Seoul',
    })
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.error.code).toBe('VALIDATION_ERROR')
    expect(computeCount).toBe(0)
  })
})

describe('POST /api/saju — 캐시 hit 이어도 현재 대운은 요청 시각으로 (SAJU-8)', () => {
  it('G21: 대운 경계 생일(36세, 2026-05-17 서울)을 넘기면 캐시된 결과에서도 甲申 → 乙酉', async () => {
    const c = goldenCase('G21')
    const body = {
      birthDate: c.input.date,
      birthTime: c.input.time,
      gender: c.input.gender,
      calendarType: 'solar',
      timezone: c.input.tz,
      longitude: c.input.lon,
    }
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-05-16T03:00:00Z')) // 서울 5/16 — 생일 전날
    const first = (await (await post(body)).json()).data
    expect(computeCount).toBe(1)
    expect(dgz(first.daeun.current)).toBe(c.proposed.daeun.current!.pillar) // 甲申 (골든)
    expect(first.daeun.current.age).toBe(c.proposed.daeun.current!.age)

    vi.setSystemTime(new Date('2026-05-17T03:00:00Z')) // 서울 5/17 — 36번째 생일
    const second = (await (await post(body)).json()).data
    expect(computeCount).toBe(1) // 캐시 hit — 재계산 없음
    // 골든 first3 = 壬午·癸未·甲申 (순행) → 다음 대운 乙酉@36.
    expect(c.proposed.daeun.first3).toEqual(['壬午', '癸未', '甲申'])
    expect(dgz(second.daeun.current)).toBe('乙酉')
    expect(second.daeun.current.age).toBe(36)
    expect(second.daeun.list).toEqual(first.daeun.list)
  })

  it('G22: 2026-11-24 첫 대운 전(current null, preDaeun 7) → 캐시 hit 인 2029-07-01 에 丁未@7', async () => {
    const c = goldenCase('G22')
    const body = {
      birthDate: c.input.date,
      birthTime: c.input.time,
      gender: c.input.gender,
      calendarType: 'solar',
      timezone: c.input.tz,
      longitude: c.input.lon,
    }
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-24T03:00:00Z'))
    const before = (await (await post(body)).json()).data
    expect(before.daeun.current).toBeNull()
    expect(before.daeun.preDaeun).toEqual({ startsAtAge: 7 })

    vi.setSystemTime(new Date('2029-07-01T03:00:00Z'))
    const after = (await (await post(body)).json()).data
    expect(computeCount).toBe(1)
    expect(dgz(after.daeun.current)).toBe(c.proposed.daeun.first3[0]) // 丁未
    expect(after.daeun.current.age).toBe(7)
    expect(after.daeun.preDaeun).toBeNull()
  })
})
