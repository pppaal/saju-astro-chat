// Refund-on-LLM-failure 회귀 테스트.
// followup 은 차감 후 LLM 호출이 실패해도 옛 코드는 환불을 안 해
// 사용자 크레딧을 잃었다. 새 동작: 503 / catch 양쪽에서 refundCredits 호출.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ---------- Mocks (must come before route import) ----------

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: (handler: any, _opts: any) => handler,
  createPublicStreamGuard: (opts: any) => opts,
}))

vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}))

vi.mock('@/lib/http', () => ({
  enforceBodySize: vi.fn().mockReturnValue(null),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

const mockCheckAndConsumeCredits = vi.fn()
const mockApplyCreditResultCookies = vi.fn((res: any) => res)
const mockCreditErrorResponse = vi.fn(
  () => new Response(JSON.stringify({ error: 'insufficient' }), { status: 402 })
)

vi.mock('@/lib/credits/withCredits', () => ({
  checkAndConsumeCredits: (...args: any[]) => mockCheckAndConsumeCredits(...args),
  applyCreditResultCookies: (...args: any[]) => mockApplyCreditResultCookies(...args),
  creditErrorResponse: (...args: any[]) => mockCreditErrorResponse(...args),
}))

const mockRefundCredits = vi.fn().mockResolvedValue(true)
vi.mock('@/lib/credits/creditRefund', () => ({
  refundCredits: (...args: any[]) => mockRefundCredits(...args),
}))

const mockCallClaude = vi.fn()
const mockIsClaudeAvailable = vi.fn().mockReturnValue(true)
vi.mock('@/lib/llm/claude', () => ({
  callClaude: (...args: any[]) => mockCallClaude(...args),
  isClaudeAvailable: (...args: any[]) => mockIsClaudeAvailable(...args),
}))

vi.mock('@/lib/tarot/promptShared', () => ({
  pickTarotFollowupRules: vi.fn().mockReturnValue('system prompt'),
}))

// ---------- Helpers ----------

const VALID_BODY = {
  spreadTitle: 'Past-Present-Future',
  originalQuestion: '내 미래는?',
  cards: [{ position: 'past', name: 'The Fool', isReversed: false }],
  question: '직장은 어떻게 될까?',
  language: 'ko' as const,
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/tarot/followup', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

// ---------- Tests ----------

describe('POST /api/tarot/followup — refund on LLM failure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckAndConsumeCredits.mockResolvedValue({
      allowed: true,
      userId: 'user-123',
      chargedAs: 'reading',
    })
    mockIsClaudeAvailable.mockReturnValue(true)
    mockCallClaude.mockResolvedValue({ text: 'happy answer' })
  })

  it('should NOT refund on the happy path (LLM succeeds)', async () => {
    const { POST } = await import('@/app/api/tarot/followup/route')
    const response = await POST(makePostRequest(VALID_BODY))

    expect(response.status).toBe(200)
    expect(mockRefundCredits).not.toHaveBeenCalled()
  })

  it('should refund 1 reading credit when Claude is unavailable (503)', async () => {
    mockIsClaudeAvailable.mockReturnValue(false)

    const { POST } = await import('@/app/api/tarot/followup/route')
    const response = await POST(makePostRequest(VALID_BODY))

    expect(response.status).toBe(503)
    expect(mockRefundCredits).toHaveBeenCalledTimes(1)
    expect(mockRefundCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        creditType: 'reading',
        amount: 1,
        apiRoute: '/api/tarot/followup',
        reason: 'tarot_llm_unavailable',
      })
    )
  })

  it('should refund when callClaude throws', async () => {
    mockCallClaude.mockRejectedValueOnce(new Error('upstream 503'))

    const { POST } = await import('@/app/api/tarot/followup/route')
    const response = await POST(makePostRequest(VALID_BODY))

    expect(response.status).toBe(500)
    expect(mockRefundCredits).toHaveBeenCalledTimes(1)
    expect(mockRefundCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        creditType: 'reading',
        amount: 1,
        apiRoute: '/api/tarot/followup',
        reason: 'tarot_followup_error',
        errorMessage: expect.stringContaining('upstream 503'),
      })
    )
  })

  it('should NOT refund when validation fails (deduction did not happen)', async () => {
    const { POST } = await import('@/app/api/tarot/followup/route')
    const response = await POST(makePostRequest({ ...VALID_BODY, cards: [] }))

    expect(response.status).toBe(400)
    expect(mockCheckAndConsumeCredits).not.toHaveBeenCalled()
    expect(mockRefundCredits).not.toHaveBeenCalled()
  })

  it('should NOT refund for guest users (no userId in creditResult)', async () => {
    // guest cookie 카운터는 환불 헬퍼가 처리하지 않는다 — 정책상 분리.
    mockCheckAndConsumeCredits.mockResolvedValue({
      allowed: true,
      // userId 없음 = guest
    })
    mockIsClaudeAvailable.mockReturnValue(false)

    const { POST } = await import('@/app/api/tarot/followup/route')
    const response = await POST(makePostRequest(VALID_BODY))

    expect(response.status).toBe(503)
    expect(mockRefundCredits).not.toHaveBeenCalled()
  })

  it('should swallow refund errors (must not block the user response)', async () => {
    mockRefundCredits.mockRejectedValueOnce(new Error('db down'))
    mockIsClaudeAvailable.mockReturnValue(false)

    const { POST } = await import('@/app/api/tarot/followup/route')
    const response = await POST(makePostRequest(VALID_BODY))

    // 환불 실패가 503 응답 자체를 막아선 안 된다.
    expect(response.status).toBe(503)
  })
})
