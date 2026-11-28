/**
 * Tests for POST /api/track/funnel — 무료 퍼널 경량 비콘.
 *
 * 화이트리스트된 이벤트만 `funnel.<event>` 카운터로 집계. 허용 외/형식 불일치는
 * 422 대신 조용히 흡수(best-effort 비콘 → 사용자 페이지 영향 0).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => {
    return async (req: any, ...args: any[]) => {
      const context = { userId: null, ip: '127.0.0.1', locale: 'ko', isAuthenticated: false }
      const result = await handler(req, context, ...args)
      if (result instanceof Response) return result
      return NextResponse.json(
        { success: true, data: result.data },
        { status: result.status || 200 }
      )
    }
  }),
  createSimpleGuard: vi.fn((opts: any) => ({ ...opts })),
  apiSuccess: vi.fn((data: any, options?: any) => ({ data, status: options?.status })),
}))

const recordCounter = vi.fn()
vi.mock('@/lib/metrics', () => ({
  recordCounter: (...a: any[]) => (recordCounter as any)(...a),
}))

import { POST } from '@/app/api/track/funnel/route'
import { FUNNEL_EVENTS, type FunnelEvent } from '@/lib/metrics/funnelEvents'
import type { FunnelEvent as BeaconEvent } from '@/lib/metrics/trackFunnel'

function makeReq(body: unknown, raw = false) {
  return new NextRequest('http://localhost:3000/api/track/funnel', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/track/funnel', () => {
  it('허용 이벤트면 funnel.<event> 집계 + ok', async () => {
    const res = await POST(makeReq({ event: 'integrated_report.viewed' }))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.ok).toBe(true)
    expect(recordCounter).toHaveBeenCalledWith('funnel.integrated_report.viewed', 1)
  })

  it('허용 외 이벤트는 조용히 skipped (집계 안 함)', async () => {
    const res = await POST(makeReq({ event: 'evil.event' }))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.skipped).toBe(true)
    expect(recordCounter).not.toHaveBeenCalled()
  })

  it('JSON 깨져도 흡수 → skipped', async () => {
    const res = await POST(makeReq('{broken', true))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.skipped).toBe(true)
  })

  it('v9 홈·인생 흐름·캘린더 이벤트를 모두 받는다', async () => {
    const v9 = [
      'home.cta_clicked',
      'home.birth_saved',
      'home.signin_clicked',
      'home.explore.life',
      'home.explore.calendar',
      'home.explore.tarot',
      'home.explore.compat',
      'home.explore.report',
      'home.explore.counselor',
      'home.counselor_cta',
      'destiny.counselor_cta',
      'calendar.counselor_cta',
    ] as const satisfies readonly FunnelEvent[]
    for (const event of v9) {
      recordCounter.mockClear()
      const res = await POST(makeReq({ event }))
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.data.ok).toBe(true)
      expect(recordCounter).toHaveBeenCalledWith(`funnel.${event}`, 1)
    }
  })

  it('allowlist 의 모든 이벤트를 집계한다 (라우트 = FUNNEL_EVENTS)', async () => {
    for (const event of FUNNEL_EVENTS) {
      const res = await POST(makeReq({ event }))
      expect((await res.json()).data.ok).toBe(true)
    }
    expect(recordCounter).toHaveBeenCalledTimes(FUNNEL_EVENTS.length)
    expect(new Set(FUNNEL_EVENTS).size).toBe(FUNNEL_EVENTS.length)
  })

  it('비콘 타입과 라우트 allowlist 가 같은 출처', () => {
    const fromBeacon: BeaconEvent = 'home.cta_clicked'
    const fromList: FunnelEvent = fromBeacon
    expect(FUNNEL_EVENTS).toContain(fromList)
  })
})
