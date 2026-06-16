// Fix B — followup route (the clarifier "draw one more card" path goes through
// this route, charging 1 reading credit per call). The free-replay leak: a
// client reusing ONE x-idempotency-key across DIFFERENT questions/clarifier
// draws would get every call after the first for free.
//
// Fix: the scoped idempotency key now mixes in a content hash (question +
// cards), so a reused key only counts as a replay when the content is truly
// identical (genuine refresh/resend). A reused key with new content charges.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: (handler: (req: NextRequest) => unknown) => handler,
  createPublicStreamGuard: (opts: unknown) => opts,
}))
vi.mock('@/lib/telemetry', () => ({ captureServerError: vi.fn() }))
vi.mock('@/lib/http', () => ({ enforceBodySize: vi.fn(() => null) }))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

const mockCheckAndConsumeCredits = vi.fn()
vi.mock('@/lib/credits/withCredits', () => ({
  checkAndConsumeCredits: (...a: unknown[]) => mockCheckAndConsumeCredits(...a),
  creditErrorResponse: () =>
    new Response(JSON.stringify({ error: 'insufficient' }), { status: 402 }),
}))
vi.mock('@/lib/credits/creditRefund', () => ({ refundCredits: vi.fn().mockResolvedValue(true) }))

const mockCallClaude = vi.fn()
vi.mock('@/lib/llm/claude', () => ({
  callClaude: (...a: unknown[]) => mockCallClaude(...a),
  isClaudeAvailable: () => true,
  PREMIUM_CLAUDE_MODEL: 'test-model',
}))
vi.mock('@/lib/tarot/promptShared', () => ({ pickTarotFollowupRules: () => 'sys' }))
vi.mock('@/lib/llm/promptSafety', () => ({
  sanitizeForXmlTagBoundary: (s: string) => s,
  sanitizePriorTurns: (t: unknown) => t,
}))
vi.mock('@/lib/user/displayName', () => ({ getUserDisplayName: vi.fn().mockResolvedValue(null) }))

// 실제 idempotency store 를 쓰되 DB 는 in-memory mock 으로 — content tag 가
// scopedKey 에 정말 섞여 free-replay 가 막히는지 end-to-end 로 검증.
const rows = new Map<string, { scopedKey: string; expiresAt: Date }>()
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    requestIdempotencyLog: {
      findUnique: vi.fn(
        async ({ where }: { where: { scopedKey: string } }) => rows.get(where.scopedKey) ?? null
      ),
      // claim 의 create-as-lock 을 충실히 시뮬레이션 — 같은 scopedKey 두 번째
      // 삽입은 unique 충돌(P2002)을 던져 replay 로 잡히게 한다.
      create: vi.fn(async ({ data }: { data: { scopedKey: string; expiresAt: Date } }) => {
        if (rows.has(data.scopedKey)) {
          const err = new Error('Unique constraint failed') as Error & { code?: string }
          err.code = 'P2002'
          throw err
        }
        rows.set(data.scopedKey, data)
        return data
      }),
      delete: vi.fn(async ({ where }: { where: { scopedKey: string } }) => {
        rows.delete(where.scopedKey)
        return { scopedKey: where.scopedKey }
      }),
    },
  },
}))

import { POST } from '@/app/api/tarot/followup/route'

const CARDS = [{ position: 'past', name: 'The Fool', isReversed: false }]

function makeReq(body: object, idemKey: string): NextRequest {
  return new NextRequest('http://localhost/api/tarot/followup', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-idempotency-key': idemKey },
  })
}

const BASE = {
  spreadTitle: 'Past-Present-Future',
  cards: CARDS,
  language: 'ko' as const,
}

describe('followup — free-replay hardening (Fix B)', () => {
  beforeEach(() => {
    rows.clear()
    vi.clearAllMocks()
    mockCheckAndConsumeCredits.mockResolvedValue({
      allowed: true,
      userId: 'user-1',
      chargedAs: 'reading',
    })
    mockCallClaude.mockResolvedValue({ text: 'answer' })
  })

  it('a genuine replay (same key + same content) is NOT double-charged', async () => {
    await POST(makeReq({ ...BASE, question: 'Q1' }, 'key-A'))
    await POST(makeReq({ ...BASE, question: 'Q1' }, 'key-A'))
    expect(mockCheckAndConsumeCredits).toHaveBeenCalledTimes(1)
  })

  it('reusing ONE key for DIFFERENT questions charges each (no free replay)', async () => {
    await POST(makeReq({ ...BASE, question: 'Q1' }, 'reused-key'))
    await POST(makeReq({ ...BASE, question: 'Q2 totally different' }, 'reused-key'))
    await POST(makeReq({ ...BASE, question: 'Q3 also different' }, 'reused-key'))
    expect(mockCheckAndConsumeCredits).toHaveBeenCalledTimes(3)
  })

  it('clarifier-style distinct draws (same key, different cards) each charge 1 credit', async () => {
    // 클래리파이어가 매번 다른 카드를 뽑아 보내는 상황 — 키를 재사용해도
    // 카드 구성이 달라 content tag 가 달라지므로 매 호출 과금.
    await POST(
      makeReq(
        {
          ...BASE,
          question: 'clarify',
          cards: [{ position: 'x', name: 'The Sun', isReversed: false }],
        },
        'clar-key'
      )
    )
    await POST(
      makeReq(
        {
          ...BASE,
          question: 'clarify',
          cards: [{ position: 'x', name: 'The Moon', isReversed: true }],
        },
        'clar-key'
      )
    )
    expect(mockCheckAndConsumeCredits).toHaveBeenCalledTimes(2)
    expect(mockCheckAndConsumeCredits).toHaveBeenCalledWith('reading', 1)
  })
})
