/**
 * /api/cron/threads-refresh-token — Threads 토큰 자동 갱신 cron 테스트.
 *
 * 보안(429/401), 토큰 없음(503), 갱신 성공(200), 갱신 실패(502)를 검증.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

const refreshThreadsToken = vi.fn()
vi.mock('@/lib/social/publish/threadsToken', () => ({
  refreshThreadsToken: () => refreshThreadsToken(),
}))

import { GET, POST } from '@/app/api/cron/threads-refresh-token/route'
import { rateLimit } from '@/lib/rateLimit'

const SECRET = 'cron-secret-for-test'

function makeRequest(auth?: string) {
  return new Request('http://localhost:3000/api/cron/threads-refresh-token', {
    method: 'GET',
    headers: auth ? { authorization: auth } : {},
  })
}

describe('/api/cron/threads-refresh-token', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, CRON_SECRET: SECRET }
    refreshThreadsToken.mockResolvedValue({ ok: true, expiresIn: 5_184_000 })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('IP 한도 초과면 429', async () => {
    vi.mocked(rateLimit).mockResolvedValueOnce({ allowed: false } as never)
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    expect(res.status).toBe(429)
    expect(refreshThreadsToken).not.toHaveBeenCalled()
  })

  it('잘못된 시크릿은 401', async () => {
    const res = await GET(makeRequest('Bearer wrong'))
    expect(res.status).toBe(401)
    expect(refreshThreadsToken).not.toHaveBeenCalled()
  })

  it('토큰이 없으면 503 not_configured', async () => {
    refreshThreadsToken.mockResolvedValueOnce({ ok: false, error: 'no_token' })
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    expect(res.status).toBe(503)
  })

  it('갱신 성공이면 200 + expiresIn', async () => {
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toMatchObject({ success: true, expiresIn: 5_184_000 })
  })

  it('갱신 실패(토큰은 있음)면 502', async () => {
    refreshThreadsToken.mockResolvedValueOnce({ ok: false, error: '400 bad' })
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    const json = await res.json()
    expect(res.status).toBe(502)
    expect(json).toMatchObject({ success: false, error: '400 bad' })
  })

  it('POST 도 GET 과 동일', async () => {
    const res = await POST(makeRequest(`Bearer ${SECRET}`))
    expect(res.status).toBe(200)
  })
})
