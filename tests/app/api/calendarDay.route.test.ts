/**
 * GET /api/calendar/day — 생일 override 쿼리 검증(QA PMS-4).
 *
 * override 쿼리는 페이지와 같은 zod 검사(parseBirthOverrideQuery: 공용 dateSchema 1900..올해 ·
 * latitude/longitude 범위 · IANA 타임존 · 길이 제한)를 거친다. 검사에 걸리면 422 이고 엔진은
 * 부르지 않는다 — 예전엔 date=1850-01-01 이 절입표 RangeError 로 500 이 됐다.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const STATUS_MAP: Record<string, number> = {
  UNAUTHORIZED: 401,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
}

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => {
    return async (req: any, ...args: any[]) => {
      try {
        const result = await handler(req, { userId: null, ip: '127.0.0.1' }, ...args)
        if (result?.error) {
          const status = STATUS_MAP[result.error.code] || 500
          return NextResponse.json(
            { success: false, error: { ...result.error, status } },
            { status }
          )
        }
        return NextResponse.json({ success: true, data: result.data }, { status: 200 })
      } catch {
        return NextResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', status: 500 } },
          { status: 500 }
        )
      }
    }
  }),
  createSimpleGuard: vi.fn((opts: any) => ({ ...opts })),
  apiSuccess: vi.fn((data: any) => ({ data })),
  apiError: vi.fn((code: string, message?: string, details?: unknown) => ({
    error: { code, message, details },
  })),
  ErrorCodes: {
    UNAUTHORIZED: 'UNAUTHORIZED',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

vi.mock('@/i18n/server', () => ({ detectServerLocale: vi.fn(async () => 'en') }))

const getOrBuildNatalContext = vi.fn(async (_birth: unknown) => ({ natal: true }))
vi.mock('@/lib/calendar-engine/persistence', () => ({
  getOrBuildNatalContext: (b: unknown) => getOrBuildNatalContext(b),
  getOrBuildMonthCells: vi.fn(async () => []),
  getFocusDayCell: vi.fn(async () => null),
}))
vi.mock('@/app/calendar/assembleDayTier', () => ({
  assembleDayTier: vi.fn(async () => ({ date: '11-24' })),
}))
vi.mock('@/lib/calendar-view/dayViewModel', () => ({
  buildDayViewModel: vi.fn(() => ({ iso: 'vm' })),
}))
vi.mock('@/app/calendar/loadTierData', async (orig) => ({
  ...(await orig<typeof import('@/app/calendar/loadTierData')>()),
  loadSessionBirth: vi.fn(async () => ({ kind: 'anonymous' })),
}))

import { GET } from '@/app/api/calendar/day/route'

/** 오늘(UTC) — 라우트는 오늘 ±370일만 받는다. */
const TODAY = new Date().toISOString().slice(0, 10)
const BASE = { day: TODAY, date: '1997-03-21', time: '14:30', gender: 'female' }

async function call(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString()
  const res = await (GET as any)(new NextRequest(`http://localhost/api/calendar/day?${qs}`))
  return { status: res.status as number, body: await res.json() }
}

describe('GET /api/calendar/day — override 쿼리 zod 검증(422, 500 아님)', () => {
  beforeEach(() => {
    getOrBuildNatalContext.mockClear()
  })

  it.each([
    ['1850 출생(절입표 범위 밖)', { date: '1850-01-01' }],
    ['미래 연도', { date: '2999-01-01' }],
    ['없는 날짜', { date: '1997-02-30' }],
    ['깨진 날짜 형식', { date: 'nope' }],
    ['위도 범위 밖', { lat: '999', lng: '126.978' }],
    ['경도 범위 밖', { lat: '37.5', lng: '-181' }],
    ['숫자가 아닌 좌표', { lat: 'abc', lng: '126.978' }],
    ['없는 타임존', { tz: 'Mars/Olympus_Mons' }],
    ['깨진 시각', { time: '25:99' }],
    ['너무 긴 이름', { name: 'x'.repeat(41) }],
    ['너무 긴 장소', { place: 'y'.repeat(81) }],
  ])('%s → 422 invalid_birth_override, 엔진 미호출', async (_label, patch) => {
    const { status, body } = await call({ ...BASE, ...patch })
    expect(status).toBe(422)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.message).toBe('invalid_birth_override')
    expect(Array.isArray(body.error.details)).toBe(true)
    expect(getOrBuildNatalContext).not.toHaveBeenCalled()
  })

  it('잘못된 day 는 그대로 422 invalid_day', async () => {
    const { status, body } = await call({ ...BASE, day: '2026-02-31' })
    expect(status).toBe(422)
    expect(body.error.message).toBe('invalid_day')
  })

  it('정상 override(빈 좌표 = 출생지 미상 포함) → 200, 엔진에 검사된 본명이 간다', async () => {
    const ok = await call({
      ...BASE,
      lat: '37.5665',
      lng: '126.978',
      tz: 'Asia/Seoul',
      name: 'Sam',
      place: 'Seoul',
    })
    expect(ok.status).toBe(200)
    expect(ok.body.data.vm).toEqual({ iso: 'vm' })
    expect(getOrBuildNatalContext).toHaveBeenLastCalledWith(
      expect.objectContaining({
        birthDate: '1997-03-21',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.978,
        timeZone: 'Asia/Seoul',
        birthCityUnknown: false,
      })
    )

    const blank = await call({ ...BASE, lat: '', lng: '' })
    expect(blank.status).toBe(200)
    expect(getOrBuildNatalContext).toHaveBeenLastCalledWith(
      expect.objectContaining({ birthCityUnknown: true })
    )
  })

  it('override 가 없으면 세션 본명 — 익명은 401', async () => {
    const { status } = await call({ day: TODAY })
    expect(status).toBe(401)
    expect(getOrBuildNatalContext).not.toHaveBeenCalled()
  })

  it('today= 가 있으면 isToday 의 기준 — 서버 시계 대신 화면의 오늘(QA CODE-4)', async () => {
    const { buildDayViewModel } = await import('@/lib/calendar-view/dayViewModel')
    const vmMock = vi.mocked(buildDayViewModel)
    vmMock.mockClear()
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    // day = 오늘(서버), today = 내일 — 화면의 오늘이 아니므로 isToday false.
    let r = await call({ ...BASE, day: TODAY, today: tomorrow })
    expect(r.status).toBe(200)
    expect(vmMock.mock.calls.at(-1)?.[1]).toMatchObject({ isToday: false })
    // day 와 today 가 같으면 true.
    r = await call({ ...BASE, day: tomorrow, today: tomorrow })
    expect(r.status).toBe(200)
    expect(vmMock.mock.calls.at(-1)?.[1]).toMatchObject({ isToday: true })
  })

  it('today= 가 잘못되면 422 invalid_today, 엔진은 부르지 않는다', async () => {
    for (const bad of ['2026-02-31', '1850-01-01', 'yesterday']) {
      getOrBuildNatalContext.mockClear()
      const r = await call({ ...BASE, today: bad })
      expect(r.status).toBe(422)
      expect(r.body.error.message).toBe('invalid_today')
      expect(getOrBuildNatalContext).not.toHaveBeenCalled()
    }
  })
})
