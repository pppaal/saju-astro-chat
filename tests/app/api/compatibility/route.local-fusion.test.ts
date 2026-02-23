import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => {
    return async (req: NextRequest, ...args: unknown[]) => handler(req, {} as any, ...args)
  }),
  createPublicStreamGuard: vi.fn(() => ({
    route: 'compatibility',
    limit: 30,
    windowSeconds: 60,
  })),
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    reading: {
      create: vi.fn().mockResolvedValue({ id: 'mock-id' }),
    },
  },
}))

import { POST } from '@/app/api/compatibility/route'

function makePerson(base: {
  name: string
  date: string
  time: string
  latitude: number
  longitude: number
  timeZone: string
}) {
  return {
    ...base,
    city: 'Seoul',
  }
}

function createRequest(persons: unknown[]) {
  return new NextRequest('http://localhost:3000/api/compatibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      persons,
      locale: 'ko',
    }),
  })
}

describe('POST /api/compatibility local fusion', () => {
  it('returns detailed interpretation for 2 people', async () => {
    const personA = makePerson({
      name: 'Alice',
      date: '1993-02-10',
      time: '08:30',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })

    const personB = {
      ...makePerson({
        name: 'Bob',
        date: '1992-11-03',
        time: '21:10',
        latitude: 35.1796,
        longitude: 129.0756,
        timeZone: 'Asia/Seoul',
      }),
      relationToP1: 'lover',
    }

    const req = createRequest([personA, personB])
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(typeof data.overall_score).toBe('number')
    expect(Array.isArray(data.pairs)).toBe(true)
    expect(data.pairs.length).toBe(1)
    expect(data.is_group).toBe(false)
    expect(data.group_analysis).toBeNull()
    expect(data.synergy_breakdown).toBeNull()
    expect(Array.isArray(data.action_items)).toBe(true)
    expect(typeof data.interpretation).toBe('string')
    expect(data.interpretation).toContain('## 종합 점수')
    expect(data.interpretation).toContain('## 사주 분석')
    expect(data.interpretation).toContain('## 점성 분석')
    expect(data.interpretation).toContain('## 교차 시스템 분석')
  })

  it('returns group analysis for 3 people', async () => {
    const personA = makePerson({
      name: 'Alice',
      date: '1993-02-10',
      time: '08:30',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })

    const personB = {
      ...makePerson({
        name: 'Bob',
        date: '1992-11-03',
        time: '21:10',
        latitude: 35.1796,
        longitude: 129.0756,
        timeZone: 'Asia/Seoul',
      }),
      relationToP1: 'lover',
    }

    const personC = {
      ...makePerson({
        name: 'Chris',
        date: '1994-06-27',
        time: '13:40',
        latitude: 37.4563,
        longitude: 126.7052,
        timeZone: 'Asia/Seoul',
      }),
      relationToP1: 'friend',
    }

    const req = createRequest([personA, personB, personC])
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.is_group).toBe(true)
    expect(data.group_analysis).toBeTruthy()
    expect(data.synergy_breakdown).toBeTruthy()
    expect(Array.isArray(data.pairs)).toBe(true)
    expect(data.pairs.length).toBe(3)
    expect(typeof data.interpretation).toBe('string')
    expect(data.interpretation).toContain('## 상세 점수')
  })
})
