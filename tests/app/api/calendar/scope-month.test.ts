import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { GET as calendarGet } from '@/app/api/calendar/route'

/**
 * 지연 빌드 — scope=month 는 "지금 보는 달" 한 달만 빌드해 빠르게 응답하고,
 * scope 없는 기본 요청은 365일 풀 연도를 빌드한다. 첫 화면 속도 최적화 가드.
 */
const asNextRequest = (request: Request) => request as unknown as NextRequest

const BASE =
  'http://localhost:3000/api/calendar?birthDate=1995-02-09&birthTime=06:40' +
  '&birthPlace=Seoul&gender=male&year=2026&locale=ko'

async function call(url: string) {
  const res = await calendarGet(
    asNextRequest(new Request(url, { headers: { 'x-api-token': 'public-token' } }))
  )
  expect(res.status).toBe(200)
  return (await res.json()) as {
    success?: boolean
    allDates?: Array<{ date: string }>
    monthlyInterpretation?: unknown
  }
}

describe('calendar 지연 빌드 (scope=month)', () => {
  const original = process.env.PUBLIC_API_TOKEN
  beforeEach(() => {
    process.env.PUBLIC_API_TOKEN = 'public-token'
  })
  afterEach(() => {
    if (original === undefined) delete process.env.PUBLIC_API_TOKEN
    else process.env.PUBLIC_API_TOKEN = original
  })

  it(
    'scope=month 는 한 달만, 기본은 풀 연도를 반환한다',
    async () => {
      const month = await call(`${BASE}&month=2026-06&scope=month`)
      const full = await call(`${BASE}&month=2026-06`)

      expect(month.success).not.toBe(false)
      expect(full.success).not.toBe(false)

      const monthCount = month.allDates?.length ?? 0
      const fullCount = full.allDates?.length ?? 0

      // 한 달 ≈ 28~31일, 풀 연도 ≈ 365일
      expect(monthCount).toBeGreaterThan(0)
      expect(monthCount).toBeLessThanOrEqual(31)
      expect(fullCount).toBeGreaterThan(300)

      // 두 응답 모두 그 달 날짜를 담고, 해석(narrative)도 채워진다
      expect((month.allDates ?? []).every((d) => d.date.startsWith('2026-06'))).toBe(true)
      expect(month.monthlyInterpretation).toBeTruthy()
    },
    60_000
  )
})
