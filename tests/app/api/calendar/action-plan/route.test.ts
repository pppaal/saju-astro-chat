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

vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        rag_context: {
          sipsin: '사주 근거',
          timing: '타이밍 근거',
          query_result: '검색 근거',
          insights: ['인사이트1'],
        },
      },
    }),
  },
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
    process.env.OPENAI_API_KEY = 'test-key'
    global.fetch = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  timeline: [
                    {
                      hour: 9,
                      minute: 0,
                      note: '핵심 슬롯 보정',
                      tone: 'best',
                      evidenceSummary: ['matrix 근거', '교차 근거'],
                    },
                    {
                      hour: 5,
                      minute: 0,
                      note: '비핵심 슬롯 보정',
                      tone: 'best',
                      evidenceSummary: ['무시'],
                    },
                  ],
                  summary: '요약',
                }),
              },
            },
          ],
        }),
      } as any
    }) as any
  })

  it('applies AI only to selected core slots', async () => {
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
    const timeline = json.data.timeline as Array<{ hour: number; note: string }>

    const h9 = timeline.find((slot) => slot.hour === 9)
    const h5 = timeline.find((slot) => slot.hour === 5)
    expect(h9?.note).toContain('핵심 슬롯 보정')
    expect(h5?.note).not.toContain('비핵심 슬롯 보정')
  })
  it('strips control characters from AI timeline notes', async () => {
    ;(global.fetch as any) = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                timeline: [
                  {
                    hour: 10,
                    minute: 0,
                    note: 'Check\u0001 your high-priority prep before the meeting',
                    tone: 'best',
                    evidenceSummary: ['Cross\u0001 evidence summary'],
                  },
                ],
                summary: 'Summary',
              }),
            },
          },
        ],
      }),
    }))

    const request = createRequest({
      date: '2025-03-15',
      locale: 'ko',
      intervalMinutes: 60,
      calendar: {
        grade: 1,
        bestTimes: ['10-11'],
        recommendations: ['Review key documents'],
        warnings: [],
        sajuFactors: ['Saju baseline'],
        astroFactors: ['Astro baseline'],
      },
    })

    const response = await POST(request as any)
    const json = await response.json()
    const timeline = json.data.timeline as Array<{
      hour: number
      note: string
      evidenceSummary?: string[]
    }>
    const target = timeline.find((slot) => slot.hour === 10)

    expect(target).toBeDefined()
    expect(target?.note.includes('\u0001')).toBe(false)
    expect((target?.evidenceSummary || []).join(' ')).not.toContain('\u0001')
  })

  it('keeps AI slot when minute=30 in 60-minute mode by normalizing to :00', async () => {
    ;(global.fetch as any) = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                timeline: [
                  {
                    hour: 10,
                    minute: 30,
                    note: 'Normalized minute slot should still apply',
                    tone: 'best',
                    evidenceSummary: ['Evidence line'],
                  },
                ],
                summary: 'Summary',
              }),
            },
          },
        ],
      }),
    }))

    const request = createRequest({
      date: '2025-03-15',
      locale: 'en',
      intervalMinutes: 60,
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
    const timeline = json.data.timeline as Array<{ hour: number; note: string }>
    const target = timeline.find((slot) => slot.hour === 10)

    expect(target).toBeDefined()
    expect(target?.note).toContain('Normalized minute slot')
  })
})
