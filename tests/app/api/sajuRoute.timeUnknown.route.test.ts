/**
 * POST /api/saju — 출생시각 미상 = 삼주 분석 (엔진 감사 F1, OD-5, CONVENTIONS §5).
 *
 * 미들웨어·크레딧·Redis 만 mock 하고 zod·calculateSajuData·신살·관계·고급 분석은 실제로 돈다.
 *  - 명시 플래그(birthTimeUnknown: true) 또는 빈 시각('')이면 미상: 정오 앵커로 년·월·일주만
 *    고정하고 응답의 timePillar·table.byPillar.time 은 null, 오행은 6글자, 관계·신살·12운성·
 *    격국·용신·형충·통근·십신은 세 기둥으로 계산한다(정오 앵커 시주를 지어내지 않는다).
 *  - 실제 정오 출생('12:00', 플래그 없음)과 캐시 키가 갈린다(:tu).
 *  - 플래그가 없으면 '00:00' 도 실제 자정 출생 — 레거시 휴리스틱을 라우트에서 다시 쓰지 않는다.
 *
 * 1990-01-15 서울 여: 己巳 丁丑 庚辰, 정오면 시주 壬午 — 시주가 있으면 丑午 원진·午 관련
 * 관계가 더 붙는 날이라 3주/4주 결과가 실제로 갈린다(판별력 있는 픽스처).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { calculateSajuData } from '@/lib/saju/saju'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/saju/relations'
import { performAnalyses } from '@/lib/saju/analyses'

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
const sum = (fe: Record<string, number>) => Object.values(fe).reduce((a, b) => a + b, 0)

const BASE = {
  birthDate: '1990-01-15',
  gender: 'female',
  calendarType: 'solar',
  timezone: 'Asia/Seoul',
  longitude: 126.978,
}

/** 엔진 직접 호출로 만든 기대값 — 삼주(time null) / 사주(정오 시주). */
function engineExpectations() {
  const r = calculateSajuData(
    BASE.birthDate,
    '12:00',
    'female',
    'solar',
    'Asia/Seoul',
    false,
    126.978,
    new Date('2026-11-25T00:00:00Z'),
    { timeUnknown: true }
  )
  const simple = (p: Pillar) => ({ stem: p.heavenlyStem.name, branch: p.earthlyBranch.name })
  const y = simple(r.yearPillar)
  const m = simple(r.monthPillar)
  const d = simple(r.dayPillar)
  const t = simple(r.timePillar)
  const dm = r.dayPillar.heavenlyStem.name
  const mb = r.monthPillar.earthlyBranch.name
  const P = { year: r.yearPillar, month: r.monthPillar, day: r.dayPillar }
  return {
    analyses3: performAnalyses(
      { year: y, month: m, day: d, time: null, hour: null },
      { year: y, month: m, day: d, hour: null },
      dm,
      mb
    ),
    analyses4: performAnalyses(
      { year: y, month: m, day: d, time: t, hour: t },
      { year: y, month: m, day: d, hour: t },
      dm,
      mb
    ),
    relations3: analyzeRelations(toAnalyzeInputFromSaju({ ...P, time: null }, dm)),
    relations4: analyzeRelations(toAnalyzeInputFromSaju({ ...P, time: r.timePillar }, dm)),
  }
}

const roundTrip = <T>(v: T): T => JSON.parse(JSON.stringify(v))

beforeEach(() => {
  store.clear()
  computeCount = 0
})

describe('POST /api/saju — 출생시각 미상 = 삼주 (F1, OD-5)', () => {
  it('birthTimeUnknown: true → 시주 null, 오행 6글자, 관계·신살·12운성·고급 분석 모두 세 기둥', async () => {
    const res = await post({ ...BASE, birthTime: '09:30', birthTimeUnknown: true })
    const json = await res.json()
    expect(res.status, JSON.stringify(json.error)).toBe(200)
    const d = json.data
    expect(d.timeUnknown).toBe(true)
    expect(d.timePillar).toBeNull()
    expect([d.yearPillar, d.monthPillar, d.dayPillar].map(gz)).toEqual(['己巳', '丁丑', '庚辰'])
    expect(sum(d.fiveElements)).toBe(6)

    // 기둥별 표: 시주 칸 없음, 년·월·일 12운성은 그대로
    expect(d.table.byPillar.time).toBeNull()
    for (const k of ['year', 'month', 'day'] as const) {
      expect(d.table.byPillar[k].twelveStage).toBeTruthy()
    }
    // 신살: 시주 범위 hit 없음
    expect(d.shinsal.some((s: { scope: string }) => s.scope === '시주')).toBe(false)

    const exp = engineExpectations()
    // 관계: 삼주 계산과 같고, 시주가 끼면 결과가 갈리는 날이다(판별력)
    expect(d.relations).toEqual(roundTrip(exp.relations3))
    expect(roundTrip(exp.relations4)).not.toEqual(roundTrip(exp.relations3))
    expect(
      d.relations.some((h: { pillars?: string[] }) => (h.pillars ?? []).includes('time'))
    ).toBe(false)
    // 고급 분석(격국·용신·형충·통근·득령·십신): 삼주 계산과 같고 정오 시주 4주와는 다르다
    expect(d.analyses).toEqual(roundTrip(exp.analyses3))
    expect(roundTrip(exp.analyses4)).not.toEqual(roundTrip(exp.analyses3))
  })

  it('빈 시각 "" 도 미상 — 플래그 요청과 같은 응답, 같은 캐시 키(정오 앵커 + :tu)', async () => {
    const flagged = (await (await post({ ...BASE, birthTime: '', birthTimeUnknown: true })).json())
      .data
    expect(computeCount).toBe(1)
    const res = await post({ ...BASE, birthTime: '' })
    const json = await res.json()
    expect(res.status, JSON.stringify(json.error)).toBe(200)
    const blank = json.data
    expect(computeCount).toBe(1) // 같은 키 → 캐시 hit
    expect(blank.timeUnknown).toBe(true)
    expect(blank.timePillar).toBeNull()
    expect(blank.fiveElements).toEqual(flagged.fiveElements)
    expect(blank.relations).toEqual(flagged.relations)
    expect(blank.analyses).toEqual(flagged.analyses)
    expect(blank.table).toEqual(flagged.table)
  })

  it('실제 정오 출생(12:00, 플래그 없음)은 네 기둥 — 미상과 캐시 키가 갈린다', async () => {
    await post({ ...BASE, birthTime: '12:00', birthTimeUnknown: true })
    expect(computeCount).toBe(1)
    const res = await post({ ...BASE, birthTime: '12:00' })
    const d = (await res.json()).data
    expect(computeCount).toBe(2) // :tu 없는 별도 키 → 재계산
    expect(d.timeUnknown).toBe(false)
    expect(gz(d.timePillar)).toBe('壬午')
    expect(sum(d.fiveElements)).toBe(8)
    expect(d.table.byPillar.time).not.toBeNull()
    const exp = engineExpectations()
    expect(d.relations).toEqual(roundTrip(exp.relations4))
    expect(d.analyses).toEqual(roundTrip(exp.analyses4))
  })

  it("플래그 없는 '00:00' 은 실제 자정 출생 — 레거시 '00:00'=미상 휴리스틱을 라우트에서 쓰지 않는다", async () => {
    const d = (await (await post({ ...BASE, birthTime: '00:00' })).json()).data
    expect(d.timeUnknown).toBe(false)
    expect(d.timePillar).not.toBeNull()
    expect(sum(d.fiveElements)).toBe(8)
  })

  it('birthTimeUnknown: false / null 은 앎 — 입력 시각 그대로 네 기둥', async () => {
    for (const flag of [false, null]) {
      const res = await post({ ...BASE, birthTime: '12:00', birthTimeUnknown: flag })
      const json = await res.json()
      expect(res.status, JSON.stringify(json.error)).toBe(200)
      expect(json.data.timeUnknown).toBe(false)
      expect(gz(json.data.timePillar)).toBe('壬午')
    }
  })
})
