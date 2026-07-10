// Fix A — interpret-stream charges based on a server-issued single-use draw
// nonce, NOT on a client-controlled idempotency key.
//
// 시나리오:
//   - 유효한 미사용 nonce ('first')        → 정상 차감.
//   - 같은 nonce 진짜 재진입 ('replay')    → 차감 skip (이중 차감 방지).
//   - 위조/미발급 nonce 또는 없음 ('unknown') → free pass 없음, 정상 차감.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockInitializeApiContext = vi.fn()
const mockCreatePublicStreamGuard = vi.fn(() => ({ route: 'tarot-interpret-stream' }))

vi.mock('@/lib/api/middleware', () => ({
  initializeApiContext: (...a: unknown[]) => mockInitializeApiContext(...a),
  createPublicStreamGuard: (...a: unknown[]) => mockCreatePublicStreamGuard(...a),
  extractLocale: vi.fn(() => 'ko'),
}))

const mockCheckAndConsumeCredits = vi.fn()
vi.mock('@/lib/credits/withCredits', () => ({
  checkAndConsumeCredits: (...a: unknown[]) => mockCheckAndConsumeCredits(...a),
  creditErrorResponse: () =>
    new Response(JSON.stringify({ error: 'insufficient' }), { status: 402 }),
}))

// replay 환불은 멱등 래퍼(refundCreditsOnce)를 쓴다 — (key, params) 시그니처.
vi.mock('@/lib/credits/refundOnce', () => ({ refundCreditsOnce: mockRefund }))

// draw-nonce store mock — consume() 반환값을 테스트마다 제어.
// vi.hoisted: mock factory 가 hoist 되어 module-scope createDrawNonceStore()
// 가 실행될 때 mockConsume 가 이미 초기화돼 있어야 한다.
const { mockConsume, mockIssue, mockRelease, mockRefund } = vi.hoisted(() => ({
  mockConsume: vi.fn(),
  mockIssue: vi.fn(),
  mockRelease: vi.fn(),
  mockRefund: vi.fn(),
}))
vi.mock('@/lib/api/idempotency', () => ({
  createDrawNonceStore: () => ({ consume: mockConsume, issue: mockIssue, release: mockRelease }),
  drawNonceOwnerKey: () => 'user:user-123',
}))

vi.mock('@/lib/streaming', () => ({
  createSSEEvent: (d: unknown) => `data: ${JSON.stringify(d)}\n\n`,
  createSSEDoneEvent: () => 'data: [DONE]\n\n',
}))

vi.mock('@/lib/http', () => ({ enforceBodySize: vi.fn(() => null) }))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))
vi.mock('@/lib/metrics/index', () => ({ recordExternalCall: vi.fn() }))
vi.mock('@/lib/user/displayName', () => ({ getUserDisplayName: vi.fn().mockResolvedValue(null) }))

const mockSafeParse = vi.fn()
vi.mock('@/lib/api/zodValidation', () => ({
  tarotInterpretStreamSchema: { safeParse: (...a: unknown[]) => mockSafeParse(...a) },
  createValidationErrorResponse: () => new Response('bad', { status: 400 }),
}))

vi.mock('@/lib/api/errorHandler', () => ({
  ErrorCodes: { INTERNAL_ERROR: 'INTERNAL_ERROR' },
  createErrorResponse: () => new Response('err', { status: 500 }),
}))

// Claude unavailable → 정적 fallback 즉시 응답 (스트림 mock 불필요).
vi.mock('@/lib/llm/claude', () => ({
  isClaudeAvailable: () => false,
  PREMIUM_CLAUDE_MODEL: 'test-model',
}))
vi.mock('@/lib/llm/claudeWithContinuation', () => ({
  streamClaudeWithContinuation: vi.fn(),
}))
vi.mock('@/lib/llm/promptSafety', () => ({
  sanitizeForXmlTagBoundary: (s: string) => s,
}))
vi.mock('@/lib/tarot/promptBuild', () => ({
  buildFallbackPayload: () => ({ overall: 'fallback', cards: [], advice: '' }),
  buildInterpretStreamPrompts: () => ({ systemPrompt: 'sys', userPrompt: 'usr' }),
}))
vi.mock('@/lib/tarot/safety', () => ({
  isDangerousQuestion: () => false,
  buildCrisisPayload: () => ({ overall: '', cards: [], advice: '' }),
}))

import { POST } from '@/app/api/tarot/interpret-stream/route'

const BODY_3CARD = {
  categoryId: 'general-insight',
  spreadId: 'past-present-future',
  spreadTitle: '3장 리딩',
  cards: [
    { name: 'The Fool', isReversed: false },
    { name: 'The Magician', isReversed: false },
    { name: 'The Sun', isReversed: false },
  ],
  language: 'ko',
}

function makeReq(body: unknown, nonce?: string): NextRequest {
  return new NextRequest('http://localhost/api/tarot/interpret-stream', {
    method: 'POST',
    body: JSON.stringify({ ...(body as object), ...(nonce ? { drawNonce: nonce } : {}) }),
    headers: { 'content-type': 'application/json' },
  })
}

describe('interpret-stream — single-use draw nonce gating (Fix A)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInitializeApiContext.mockResolvedValue({
      context: { ip: '127.0.0.1', locale: 'ko', userId: 'user-123' },
      error: undefined,
    })
    mockCheckAndConsumeCredits.mockResolvedValue({ allowed: true, userId: 'user-123' })
    mockSafeParse.mockImplementation((b: { drawNonce?: string }) => ({
      success: true,
      data: { ...BODY_3CARD, drawNonce: b?.drawNonce },
    }))
  })

  it('charges on first consumption of a valid issued nonce', async () => {
    mockConsume.mockResolvedValue('first')
    await POST(makeReq(BODY_3CARD, 'valid-nonce'))
    expect(mockConsume).toHaveBeenCalledWith('valid-nonce', 'user:user-123')
    expect(mockCheckAndConsumeCredits).toHaveBeenCalledTimes(1)
    expect(mockCheckAndConsumeCredits).toHaveBeenCalledWith(
      'reading',
      1,
      expect.objectContaining({ apiRoute: 'tarot/interpret-stream', activityType: 'tarot_reading' })
    )
  })

  it('does NOT charge a genuine replay at all (no charge → no refund needed)', async () => {
    mockConsume.mockResolvedValue('replay')
    await POST(makeReq(BODY_3CARD, 'valid-nonce'))
    // replay 는 첫 호출에서 이미 과금된 재진입 — 아예 차감하지 않는다.
    // 옛 설계(차감→환불)는 환불 멱등키가 nonce 당 고정이라 3번째 재진입부터
    // 환불이 dedupe 로 skip 돼 재과금이 남는 버그가 있었다. 무과금이면 환불
    // 왕복 자체가 없어 몇 번을 재진입해도 추가 차감이 없다.
    expect(mockCheckAndConsumeCredits).not.toHaveBeenCalled()
    expect(mockRefund).not.toHaveBeenCalled()
  })

  it('replays repeatedly without any additional charge (3rd+ refresh regression)', async () => {
    mockConsume.mockResolvedValue('replay')
    await POST(makeReq(BODY_3CARD, 'valid-nonce'))
    await POST(makeReq(BODY_3CARD, 'valid-nonce'))
    await POST(makeReq(BODY_3CARD, 'valid-nonce'))
    expect(mockCheckAndConsumeCredits).not.toHaveBeenCalled()
    expect(mockRefund).not.toHaveBeenCalled()
  })

  it("releases the nonce when the charge fails after a 'first' consume (T1 leak guard)", async () => {
    mockConsume.mockResolvedValue('first')
    mockCheckAndConsumeCredits.mockResolvedValue({ allowed: false, userId: 'user-123' })
    const res = await POST(makeReq(BODY_3CARD, 'valid-nonce'))
    // 잔액 부족 402 — 이번 요청이 태운 nonce 를 복구해, 충전 후 재시도가
    // 'replay' 무료 리딩이 아니라 정상 과금('first')으로 들어오게 한다.
    expect(res.status).toBe(402)
    expect(mockRelease).toHaveBeenCalledWith('valid-nonce', 'user:user-123')
  })

  it("does not release anything when charge fails on an 'unknown' nonce", async () => {
    mockConsume.mockResolvedValue('unknown')
    mockCheckAndConsumeCredits.mockResolvedValue({ allowed: false, userId: 'user-123' })
    const res = await POST(makeReq(BODY_3CARD, 'forged-nonce'))
    expect(res.status).toBe(402)
    // 이번 요청이 consumed 마커를 만든 게 아니므로 release 대상이 없다.
    expect(mockRelease).not.toHaveBeenCalled()
  })

  it('charges normally for a forged/unknown nonce (no free pass)', async () => {
    mockConsume.mockResolvedValue('unknown')
    await POST(makeReq(BODY_3CARD, 'forged-nonce'))
    expect(mockCheckAndConsumeCredits).toHaveBeenCalledTimes(1)
  })

  it('charges normally when no nonce is supplied (cannot self-declare free replay)', async () => {
    await POST(makeReq(BODY_3CARD))
    // nonce 없으면 consume 자체를 안 부르고 정상 차감.
    expect(mockConsume).not.toHaveBeenCalled()
    expect(mockCheckAndConsumeCredits).toHaveBeenCalledTimes(1)
  })

  it('charges 2 credits for a >= 5-card spread', async () => {
    mockConsume.mockResolvedValue('first')
    const big = {
      ...BODY_3CARD,
      cards: Array.from({ length: 5 }, (_, i) => ({ name: `Card ${i}`, isReversed: false })),
    }
    mockSafeParse.mockReturnValue({ success: true, data: { ...big, drawNonce: 'n5' } })
    await POST(makeReq(big, 'n5'))
    expect(mockCheckAndConsumeCredits).toHaveBeenCalledWith(
      'reading',
      2,
      expect.objectContaining({ apiRoute: 'tarot/interpret-stream', activityType: 'tarot_reading' })
    )
  })
})
