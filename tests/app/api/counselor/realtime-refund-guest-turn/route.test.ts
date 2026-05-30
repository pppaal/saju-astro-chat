/**
 * /api/counselor/realtime/refund-guest-turn 회귀.
 *
 * 게스트 카운터 mid-stream rollback 우회 경로:
 *  - realtime POST 가 SSE 시작 전 cookie +1 — 응답 실패해도 차감
 *  - 실패 시 realtime 의 onFailure 가 redis 에 guestRefundMarkerKey(turnId) 저장
 *  - 클라가 이 endpoint POST → marker 검증 + cookie -1 + marker 삭제
 *
 * Abuse 방지: marker 없으면 410. 정상 답변 turn 엔 marker 없음.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockCacheGet = vi.fn()
const mockCacheDel = vi.fn()

vi.mock('@/lib/cache/redis-cache', () => ({
  cacheGet: (...args: unknown[]) => mockCacheGet(...args),
  cacheDel: (...args: unknown[]) => mockCacheDel(...args),
}))

async function loadRoute() {
  return await import('@/app/api/counselor/realtime/refund-guest-turn/route')
}

const makeReq = (body: unknown, cookieValue?: string) => {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }
  if (cookieValue !== undefined) {
    headers.cookie = `guest_destiny_counselor_turns=${cookieValue}`
  }
  return new NextRequest('http://localhost/api/counselor/realtime/refund-guest-turn', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('/api/counselor/realtime/refund-guest-turn POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('turnId 누락 → 400', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeReq({}))
    expect(res.status).toBe(400)
  })

  it('marker 없는 turnId → 410 (abuse 차단)', async () => {
    mockCacheGet.mockResolvedValue(null)
    const { POST } = await loadRoute()
    const res = await POST(makeReq({ turnId: 'never-failed' }))
    expect(res.status).toBe(410)
    expect(mockCacheDel).not.toHaveBeenCalled()
  })

  it('marker 있는 turnId + cookie=1 → cookie -1 (=0) + marker 삭제', async () => {
    mockCacheGet.mockResolvedValue('1')
    mockCacheDel.mockResolvedValue(true)
    const { POST } = await loadRoute()
    const res = await POST(makeReq({ turnId: 'failed-turn' }, '1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true, refunded: true, current: 0 })
    expect(mockCacheDel).toHaveBeenCalledTimes(1)
    // Set-Cookie 헤더에 카운터=0
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toContain('guest_destiny_counselor_turns=0')
  })

  it('cookie=0 일 때도 음수로 안 내려감 (clamp)', async () => {
    mockCacheGet.mockResolvedValue('1')
    const { POST } = await loadRoute()
    const res = await POST(makeReq({ turnId: 't1' }, '0'))
    const body = await res.json()
    expect(body.current).toBe(0)
  })

  it('marker 삭제 실패해도 200 (TTL 60s 로 자동 소멸)', async () => {
    mockCacheGet.mockResolvedValue('1')
    mockCacheDel.mockRejectedValue(new Error('redis down'))
    const { POST } = await loadRoute()
    const res = await POST(makeReq({ turnId: 't2' }, '2'))
    expect(res.status).toBe(200)
  })
})
