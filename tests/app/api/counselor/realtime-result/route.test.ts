/**
 * /api/counselor/realtime/result — ownership 검증 회귀.
 *
 * 옛 버그: 인증/소유권 체크 없이 turnId 만 받아 cacheGet 으로 결과 반환.
 *         turnId 알면 다른 사용자 사주 결과까지 조회 가능 (PII 노출).
 * 수정: getServerSession 으로 userId 확보, 캐시 키에 userId 포함.
 *       다른 사용자 turnId 로 조회해도 본인 userId 의 키로만 검색되어 못 찾음.
 *       비로그인은 401.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetServerSession = vi.fn()
const mockCacheGet = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: (...args: any[]) => mockGetServerSession(...args),
}))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/cache/redis-cache', () => ({
  cacheGet: (...args: any[]) => mockCacheGet(...args),
}))

async function importRoute() {
  return await import('@/app/api/counselor/realtime/result/route')
}

const makeReq = (turnId: string) =>
  new NextRequest(`http://localhost/api/counselor/realtime/result?turnId=${turnId}`)

describe('/api/counselor/realtime/result GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('비로그인 → 401', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const { GET } = await importRoute()
    const res = await GET(makeReq('abc-123'))
    expect(res.status).toBe(401)
  })

  it('로그인 + turnId 누락 → 400', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-A' } })
    const { GET } = await importRoute()
    const res = await GET(new NextRequest('http://localhost/api/counselor/realtime/result'))
    expect(res.status).toBe(400)
  })

  it('로그인 + 자기 캐시 hit → ready=true + content 반환', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-A' } })
    mockCacheGet.mockResolvedValue('my saju result')
    const { GET } = await importRoute()
    const res = await GET(makeReq('turn-1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({ ready: true, content: 'my saju result' })
    // 캐시 lookup 키에 userId 가 들어가야 함 (다른 사용자가 같은 turnId 로 조회 불가).
    expect(mockCacheGet).toHaveBeenCalledWith(expect.stringContaining('user-A'))
    expect(mockCacheGet).toHaveBeenCalledWith(expect.stringContaining('turn-1'))
  })

  it('다른 사용자의 turnId 로 조회 → 본인 userId 의 키만 lookup (miss)', async () => {
    // user-B 가 user-A 의 turnId 알아도, 본인(user-B)의 userId 가 키에 들어가므로 못 찾음.
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-B' } })
    mockCacheGet.mockResolvedValue(null) // user-B 의 키로 조회 → miss
    const { GET } = await importRoute()
    const res = await GET(makeReq('turn-1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({ ready: false })
    expect(mockCacheGet).toHaveBeenCalledWith(expect.stringContaining('user-B'))
    expect(mockCacheGet).not.toHaveBeenCalledWith(expect.stringContaining('user-A'))
  })
})
