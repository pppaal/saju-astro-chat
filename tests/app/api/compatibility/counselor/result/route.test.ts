/**
 * /api/compatibility/counselor/result — turnId 검증 + ownership 회귀.
 *
 * counselor/realtime/result 와 동일 패턴: 로그인 필수, 자기 userId 의
 * 캐시 키로만 lookup. turnId 는 zod 로 검증 — 누락은 400(기존 클라 복구
 * 경로 호환), 형식 위반(200자 초과 등)은 422.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetServerSession = vi.fn()
const mockCacheGet = vi.fn()

vi.mock('@/lib/auth/session', () => ({
  getServerSession: (...args: any[]) => mockGetServerSession(...args),
}))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/cache/redis-cache', () => ({
  cacheGet: (...args: any[]) => mockCacheGet(...args),
  cacheSet: vi.fn(),
  CACHE_TTL: { MEDIUM: 3600 },
}))

async function importRoute() {
  return await import('@/app/api/compatibility/counselor/result/route')
}

const makeReq = (turnId: string) =>
  new NextRequest(`http://localhost/api/compatibility/counselor/result?turnId=${turnId}`)

describe('/api/compatibility/counselor/result GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('비로그인 → 401', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const { GET } = await importRoute()
    const res = await GET(makeReq('abc-123'))
    expect(res.status).toBe(401)
  })

  it('로그인 + turnId 누락 → 400 (기존 에러 shape 유지)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-A' } })
    const { GET } = await importRoute()
    const res = await GET(new NextRequest('http://localhost/api/compatibility/counselor/result'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('turnId_required')
  })

  it('로그인 + 잘못된 turnId(200자 초과) → 422 (zod 검증)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-A' } })
    const { GET } = await importRoute()
    const res = await GET(makeReq('x'.repeat(201)))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('turnId_invalid')
    expect(mockCacheGet).not.toHaveBeenCalled()
  })

  it('로그인 + 자기 캐시 hit → ready=true + content 반환', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-A' } })
    mockCacheGet.mockResolvedValue('my compat result')
    const { GET } = await importRoute()
    const res = await GET(makeReq('turn-1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({ ready: true, content: 'my compat result' })
    // 캐시 lookup 키에 userId 포함 (다른 사용자가 같은 turnId 로 조회 불가).
    expect(mockCacheGet).toHaveBeenCalledWith(expect.stringContaining('user-A'))
    expect(mockCacheGet).toHaveBeenCalledWith(expect.stringContaining('turn-1'))
  })

  it('캐시 miss → ready=false', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-B' } })
    mockCacheGet.mockResolvedValue(null)
    const { GET } = await importRoute()
    const res = await GET(makeReq('turn-1'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ready: false })
  })
})
