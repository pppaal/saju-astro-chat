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

vi.mock('@/lib/credits/creditRefund', () => ({ refundCredits: mockRefund }))

// draw-nonce store mock — consume() 반환값을 테스트마다 제어.
// vi.hoisted: mock factory 가 hoist 되어 module-scope createDrawNonceStore()
// 가 실행될 때 mockConsume 가 이미 초기화돼 있어야 한다.
const { mockConsume, mockIssue, mockRefund } = vi.hoisted(() => ({
  mockConsume: vi.fn(),
  mockIssue: vi.fn(),
  mockRefund: vi.fn(),
}))
vi.mock('@/lib/api/idempotency', () => ({
  createDrawNonceStore: () => ({ consume: mockConsume, issue: mockIssue }),
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
    expect(mockCheckAndConsumeCredits).toHaveBeenCalledWith('reading', 1)
  })

  it('does NOT net-double-charge a genuine replay (charges then refunds the SAME nonce)', async () => {
    mockConsume.mockResolvedValue('replay')
    await POST(makeReq(BODY_3CARD, 'valid-nonce'))
    // T1 fix(route): credit 를 먼저 차감하고(크레딧 부족 재시도 시 nonce 가
    // 미리 burn 돼 무료 reading 누수되던 버그 차단), replay 로 판정되면 방금
    // 차감한 금액을 즉시 환불한다 → 순 이중과금 0. 옛 테스트는 "차감 자체를
    // skip" 하는 이전 설계를 기대해 실패했으므로, 환불로 상쇄됨을 검증한다.
    expect(mockCheckAndConsumeCredits).toHaveBeenCalledTimes(1)
    expect(mockRefund).toHaveBeenCalledTimes(1)
    expect(mockRefund).toHaveBeenCalledWith(
      expect.objectContaining({ creditType: 'reading', amount: 1, reason: 'tarot_nonce_replay' })
    )
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
    expect(mockCheckAndConsumeCredits).toHaveBeenCalledWith('reading', 2)
  })
})
