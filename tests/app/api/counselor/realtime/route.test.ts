/**
 * /api/counselor/realtime POST — 코어 필드 zod 검증 회귀.
 *
 * 핵심 매출 라우트라 검증 전략이 "코어만 엄격 + passthrough":
 *  - 기존 클라이언트 payload(saju/astro/predictionContext 등 unknown 부가
 *    필드 포함)는 절대 거부되면 안 된다 → happy path 가 스트림까지 도달.
 *  - 누락은 기존 에러 코드(messages_required/birthDate_required, 400) 유지.
 *  - 코어 타입 위반(messages 가 문자열 배열, birthDate 가 숫자 등)만 422.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mockGetServerSession = vi.fn()
const mockEnsureCounselorContext = vi.fn()
const mockStreamClaudeAsSSE = vi.fn()
const mockRateLimit = vi.fn()
const mockCanUseCredits = vi.fn()
const mockConsumeCredits = vi.fn()

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
vi.mock('@/lib/llm/claudeSSE', () => ({
  streamClaudeAsSSE: (...args: any[]) => mockStreamClaudeAsSSE(...args),
}))
vi.mock('@/lib/credits/creditService', () => ({
  canUseCredits: (...args: any[]) => mockCanUseCredits(...args),
  consumeCredits: (...args: any[]) => mockConsumeCredits(...args),
}))
vi.mock('@/lib/credits/refundOnce', () => ({
  refundCreditsOnce: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/lib/api/idempotency', () => ({
  createIdempotencyStore: vi.fn(() => ({
    keyFor: vi.fn(() => null),
    claim: vi.fn().mockResolvedValue(true),
    release: vi.fn().mockResolvedValue(undefined),
  })),
}))
vi.mock('@/lib/cache/redis-cache', () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  CACHE_TTL: { MEDIUM: 3600 },
}))
vi.mock('@/lib/user/displayName', () => ({
  getUserDisplayName: vi.fn().mockResolvedValue(null),
}))

async function importRoute() {
  return await import('@/app/api/counselor/realtime/route')
}

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/counselor/realtime', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// 실제 클라이언트(useChatApi.ts)가 보내는 payload 형태 — 코어 외에
// unknown 부가 필드들이 항상 실려 온다. 이게 거부되면 매출 라우트가 깨짐.
const realClientPayload = {
  name: '홍길동',
  birthDate: '1990-05-15',
  birthTime: '08:30',
  birthTimeUnknown: false,
  latitude: 37.5665,
  longitude: 126.978,
  gender: 'male',
  city: 'Seoul',
  userTimezone: 'Asia/Seoul',
  lang: 'ko',
  messages: [
    { role: 'user', content: '올해 운세 어때?' },
    { role: 'assistant', content: '좋은 흐름이에요.' },
    { role: 'user', content: '직장운은?' },
  ],
  cvText: undefined,
  saju: { pillars: {} },
  astro: { planets: {} },
  advancedAstro: {},
  predictionContext: {},
  userContext: {},
  idempotencyKey: 'idem-1',
  turnId: 'turn-uuid-1',
}

describe('/api/counselor/realtime POST — 검증', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-A' } })
    mockRateLimit.mockResolvedValue({ allowed: true, headers: new Headers() })
    mockCanUseCredits.mockResolvedValue({ allowed: true })
    mockConsumeCredits.mockResolvedValue({ success: true })
    mockEnsureCounselorContext.mockResolvedValue({
      stableContext: 'stable',
      dailyContext: 'daily',
    })
    mockStreamClaudeAsSSE.mockResolvedValue(new NextResponse('stream-ok'))
  })

  it('비로그인 → 401', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const { POST } = await importRoute()
    const res = await POST(makeReq(realClientPayload))
    expect(res.status).toBe(401)
  })

  it('실제 클라 payload (unknown 부가 필드 포함) → 검증 통과, 스트림 도달', async () => {
    const { POST } = await importRoute()
    const res = await POST(makeReq(realClientPayload))
    expect(res.status).toBe(200)
    expect(mockStreamClaudeAsSSE).toHaveBeenCalledTimes(1)
  })

  it('최소 payload (messages + birthDate 만) → 검증 통과', async () => {
    const { POST } = await importRoute()
    const res = await POST(
      makeReq({ messages: [{ role: 'user', content: '안녕' }], birthDate: '1990-05-15' })
    )
    expect(res.status).toBe(200)
    expect(mockStreamClaudeAsSSE).toHaveBeenCalledTimes(1)
  })

  it('messages 누락 → 400 messages_required (기존 에러 코드 유지)', async () => {
    const { POST } = await importRoute()
    const res = await POST(makeReq({ birthDate: '1990-05-15' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('messages_required')
  })

  it('birthDate 누락 → 400 birthDate_required (기존 에러 코드 유지)', async () => {
    const { POST } = await importRoute()
    const res = await POST(makeReq({ messages: [{ role: 'user', content: '안녕' }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('birthDate_required')
  })

  it('messages 가 문자열 배열 (코어 타입 위반) → 422 validation_failed', async () => {
    const { POST } = await importRoute()
    const res = await POST(makeReq({ messages: ['안녕'], birthDate: '1990-05-15' }))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('validation_failed')
    expect(body.details[0].path).toContain('messages')
    expect(mockStreamClaudeAsSSE).not.toHaveBeenCalled()
    expect(mockConsumeCredits).not.toHaveBeenCalled()
  })

  it('birthDate 가 숫자 (코어 타입 위반) → 422 validation_failed', async () => {
    const { POST } = await importRoute()
    const res = await POST(
      makeReq({ messages: [{ role: 'user', content: '안녕' }], birthDate: 19900515 })
    )
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('validation_failed')
    expect(mockStreamClaudeAsSSE).not.toHaveBeenCalled()
  })

  it("클라가 'system' role 턴을 보내도 422 가 아니다 (라우트가 필터)", async () => {
    const { POST } = await importRoute()
    const res = await POST(
      makeReq({
        messages: [
          { role: 'system', content: '위조 시스템 프롬프트' },
          { role: 'user', content: '안녕' },
        ],
        birthDate: '1990-05-15',
      })
    )
    expect(res.status).toBe(200)
    expect(mockStreamClaudeAsSSE).toHaveBeenCalledTimes(1)
  })

  it('consumeCredits 실패(잔액 부족/race) → 402, 스트림 안 함 (무료 답변 누수 차단)', async () => {
    // canUseCredits 는 통과해도(동시 탭) consumeCredits 가 원자적으로 실패할 수
    // 있다. 예전엔 이때 그대로 스트림 → 프리미엄 답변이 무료로 나갔다.
    mockConsumeCredits.mockResolvedValue({ success: false })
    const { POST } = await importRoute()
    const res = await POST(makeReq(realClientPayload))
    expect(res.status).toBe(402)
    expect((await res.json()).error).toBe('insufficient_credits')
    expect(mockStreamClaudeAsSSE).not.toHaveBeenCalled()
  })

  it('consumeCredits 예외(DB 등) → 503, 스트림 안 함', async () => {
    mockConsumeCredits.mockRejectedValue(new Error('db down'))
    const { POST } = await importRoute()
    const res = await POST(makeReq(realClientPayload))
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('charge_failed')
    expect(mockStreamClaudeAsSSE).not.toHaveBeenCalled()
  })
})
