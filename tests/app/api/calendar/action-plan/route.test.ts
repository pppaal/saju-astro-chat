import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

let mockContext: { locale: 'ko' | 'en'; isPremium: boolean; userId: string | null } = {
  locale: 'ko',
  isPremium: true,
  userId: null,
}

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => async (req: any) => handler(req, mockContext)),
  createPublicStreamGuard: vi.fn(() => ({})),
  extractLocale: vi.fn(() => 'ko'),
  apiSuccess: vi.fn((data: unknown) => NextResponse.json({ success: true, data })),
  apiError: vi.fn((code: string, message: string) =>
    NextResponse.json({ success: false, error: { code, message } }, { status: 400 })
  ),
  ErrorCodes: { BAD_REQUEST: 'BAD_REQUEST' },
}))

vi.mock('@/lib/prediction/ultra-precision-daily', () => ({
  calculateDailyPillar: vi.fn(() => ({ stem: '갑', branch: '자' })),
  generateHourlyAdvice: vi.fn(() =>
    Array.from({ length: 24 }, () => ({
      quality: 'normal',
    }))
  ),
}))

vi.mock('@/lib/destiny-map/calendar/specialDays-analysis', () => ({
  getHourlyRecommendation: vi.fn(() => ({
    bestActivities: ['집중 작업'],
    avoidActivities: ['무리한 결정'],
  })),
}))

vi.mock('@/app/api/calendar/lib', () => ({
  getFactorTranslation: vi.fn(() => '시간대 가이드'),
}))

vi.mock('@/lib/stripe/premiumCache', () => ({
  checkPremiumFromDatabase: vi.fn().mockResolvedValue({ isPremium: false }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { POST } from '@/app/api/calendar/action-plan/route'

function createRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/calendar/action-plan', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('calendar action-plan route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a rule-based hourly timeline (no AI)', async () => {
    mockContext = { locale: 'ko', isPremium: true, userId: null }
    const request = createRequest({
      date: '2025-03-15',
      locale: 'ko',
      intervalMinutes: 60,
      calendar: {
        grade: 1,
        bestTimes: ['09-10'],
        recommendations: ['추천 행동'],
        warnings: [],
        sajuFactors: ['사주 근거'],
        astroFactors: ['점성 근거'],
      },
    })

    const response = await POST(request as any)
    const json = await response.json()
    expect(json.success).toBe(true)
    const timeline = json.data.timeline as Array<{ hour: number; minute: number; note: string }>
    expect(timeline.length).toBeGreaterThan(0)
    expect(timeline.every((slot) => slot.minute === 0)).toBe(true)
    expect(json.data.precisionMode).toBe('rule')
  })

  it('produces 30-minute slots when intervalMinutes=30', async () => {
    mockContext = { locale: 'ko', isPremium: true, userId: null }
    const request = createRequest({
      date: '2025-03-15',
      locale: 'en',
      intervalMinutes: 30,
      calendar: {
        grade: 1,
        bestTimes: ['10-11'],
        recommendations: ['Do one key action'],
        warnings: [],
        sajuFactors: ['Saju baseline'],
        astroFactors: ['Astro baseline'],
      },
    })

    const response = await POST(request as any)
    const json = await response.json()
    const timeline = json.data.timeline as Array<{ hour: number; minute: number; note: string }>
    const minutes = new Set(timeline.map((slot) => slot.minute))
    expect(minutes.has(0)).toBe(true)
    expect(minutes.has(30)).toBe(true)
  })

  it('exposes a peak/best time on or near the calendar bestTimes window', async () => {
    mockContext = { locale: 'ko', isPremium: true, userId: null }
    const request = createRequest({
      date: '2025-03-15',
      locale: 'ko',
      intervalMinutes: 60,
      calendar: {
        grade: 1,
        bestTimes: ['09-10'],
        recommendations: ['핵심 업무 1건 처리'],
        warnings: [],
        sajuFactors: ['사주 근거'],
        astroFactors: ['점성 근거'],
      },
    })
    const response = await POST(request as any)
    const json = await response.json()
    const timeline = json.data.timeline as Array<{
      hour: number
      tone?: string
      note: string
    }>
    const slot9 = timeline.find((slot) => slot.hour === 9)
    expect(slot9).toBeDefined()
    expect(slot9?.tone).toBe('best')
  })
})
