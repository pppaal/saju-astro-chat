// Fix C — the draw-route pre-credit gate uses the correct per-spread cost
// (tarotCreditCostFor(cardCount)) instead of a flat 1, so it matches the
// actual charge at interpret time. ≥5-card spread = 2, smaller = 1.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: (handler: (req: NextRequest, ctx: unknown) => unknown) => handler,
  createPublicStreamGuard: (opts: unknown) => opts,
  extractLocale: vi.fn(() => 'ko'),
}))

const mockCheckCreditsOnly = vi.fn()
vi.mock('@/lib/credits/withCredits', () => ({
  checkCreditsOnly: (...a: unknown[]) => mockCheckCreditsOnly(...a),
  creditErrorResponse: () =>
    new Response(JSON.stringify({ error: 'insufficient' }), { status: 402 }),
}))

// draw-nonce store — issue 는 no-op mock.
vi.mock('@/lib/api/idempotency', () => ({
  createDrawNonceStore: () => ({ issue: vi.fn().mockResolvedValue(undefined), consume: vi.fn() }),
  drawNonceOwnerKey: () => 'user:user-1',
}))

vi.mock('@/lib/api/requestParser', () => ({
  parseRequestBody: async (req: NextRequest) => req.json(),
}))
vi.mock('@/lib/metrics/index', () => ({ recordApiRequest: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('@/lib/api/errorHandler', () => ({
  ErrorCodes: { BAD_REQUEST: 'BAD_REQUEST', NOT_FOUND: 'NOT_FOUND' },
  createErrorResponse: () => new Response('err', { status: 404 }),
}))

import { POST } from '@/app/api/tarot/route'

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/tarot', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('draw route — per-spread credit gate (Fix C)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckCreditsOnly.mockResolvedValue({ allowed: true, userId: 'user-1' })
  })

  it('gates a 1-card spread with cost 1', async () => {
    await POST(makeReq({ categoryId: 'general-insight', spreadId: 'quick-reading' }))
    expect(mockCheckCreditsOnly).toHaveBeenCalledWith('reading', 1)
  })

  it('gates a 3-card spread with cost 1', async () => {
    await POST(makeReq({ categoryId: 'general-insight', spreadId: 'past-present-future' }))
    expect(mockCheckCreditsOnly).toHaveBeenCalledWith('reading', 1)
  })

  it('gates a 5-card spread with cost 2 (matches interpret-stream charge)', async () => {
    await POST(makeReq({ categoryId: 'general-insight', spreadId: 'general-cross' }))
    expect(mockCheckCreditsOnly).toHaveBeenCalledWith('reading', 2)
  })

  it('gates a 7-card spread with cost 2', async () => {
    await POST(makeReq({ categoryId: 'general-insight', spreadId: 'celtic-cross' }))
    expect(mockCheckCreditsOnly).toHaveBeenCalledWith('reading', 2)
  })

  it('returns a server-issued drawNonce in the response', async () => {
    const res = await POST(makeReq({ categoryId: 'general-insight', spreadId: 'quick-reading' }))
    const data = await res.json()
    expect(typeof data.drawNonce).toBe('string')
    expect(data.drawNonce.length).toBeGreaterThan(0)
  })
})
