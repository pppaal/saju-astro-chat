/**
 * /api/counselor/warm POST — 컨텍스트 워밍 라우트 검증 회귀.
 *
 * fire-and-forget 워밍 경로라 실패가 무해하지만, 입력 검증은 realtime 과
 * 같은 규약을 따른다: birthDate 누락 → 400(기존), 코어 타입 위반 → 422(zod).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetServerSession = vi.fn()
const mockEnsureCounselorContext = vi.fn()
const mockRateLimit = vi.fn()

vi.mock('@/lib/auth/session', () => ({
  getServerSession: (...args: any[]) => mockGetServerSession(...args),
}))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/security/csrf', () => ({ csrfGuard: vi.fn(() => null) }))
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: (...args: any[]) => mockRateLimit(...args),
}))
vi.mock('@/lib/destiny/counselorContextCache', () => ({
  ensureCounselorContext: (...args: any[]) => mockEnsureCounselorContext(...args),
}))

async function importRoute() {
  return await import('@/app/api/counselor/warm/route')
}

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/counselor/warm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('/api/counselor/warm POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-A' } })
    mockRateLimit.mockResolvedValue({ allowed: true, headers: new Headers() })
    mockEnsureCounselorContext.mockResolvedValue({ stableContext: 's', dailyContext: 'd' })
  })

  it('비로그인 → 401', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const { POST } = await importRoute()
    const res = await POST(makeReq({ birthDate: '1990-05-15' }))
    expect(res.status).toBe(401)
  })

  it('정상 payload (부가 필드 포함) → 200 + 워밍 호출', async () => {
    const { POST } = await importRoute()
    const res = await POST(
      makeReq({
        birthDate: '1990-05-15',
        birthTime: '08:30',
        gender: 'male',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
        lang: 'ko',
        extraUnknownField: true,
      })
    )
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
    expect(mockEnsureCounselorContext).toHaveBeenCalledTimes(1)
  })

  it('birthDate 누락 → 400 (기존 동작 유지)', async () => {
    const { POST } = await importRoute()
    const res = await POST(makeReq({ birthTime: '08:30' }))
    expect(res.status).toBe(400)
  })

  it('birthDate 가 숫자 (코어 타입 위반) → 422 (zod 검증)', async () => {
    const { POST } = await importRoute()
    const res = await POST(makeReq({ birthDate: 19900515 }))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('validation_failed')
    expect(mockEnsureCounselorContext).not.toHaveBeenCalled()
  })

  it('워밍 실패해도 200 (fire-and-forget, 답변 경로가 재빌드)', async () => {
    mockEnsureCounselorContext.mockRejectedValue(new Error('ephemeris down'))
    const { POST } = await importRoute()
    const res = await POST(makeReq({ birthDate: '1990-05-15' }))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(false)
  })
})
