/**
 * 궁합 상담사(유료) — 출생시각을 모르는 사람이 있어도 LLM 페이로드에 사주 블록이 실린다.
 *
 * 재감사 CS-1: 시간 미상이면 compatSajuFacts 가 시주를 빼고 3기둥(삼주)을 넘기는데,
 * formatSajuSynastry 가드가 4기둥을 요구해 블록이 통째로 '' 였다. 그래서 시간 모르는
 * 커플은 일간·십성·합충형·대운·용신 cross 가 하나도 없는 컨텍스트로 과금됐다.
 * 결정 9(OD-5): 시간 미상 → 년·월·일 삼주 분석, 시주는 어디에도 없음.
 *
 * 이 테스트는 사주 엔진·포매터를 *실제로* 돌린다(포매터 스텁 없음). 결제·멱등·스트림만
 * 막아 라우트가 streamClaudeAsSSE 까지 가게 하고, 그 인자(cachedUserContext)를 검사한다.
 * 차감/환불 코드는 건드리지 않는다.
 *
 * 입력 쌍(재감사 repro와 동일): A = 1990-05-15 08:30 New York 여 → 庚午 辛巳 庚辰 (+시주),
 * B = 1988-11-02 London 남 → 戊辰 壬戌 辛酉. 일간 庚=Metal ↔ 辛=Metal, 서로 겁재.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/api/middleware', () => ({
  initializeApiContext: vi.fn(),
  createAuthenticatedGuard: vi.fn(() => ({
    requireAuth: true,
    rateLimit: { limit: 30, windowSeconds: 60 },
    credits: { type: 'compatibility', amount: 1 },
  })),
  extractLocale: vi.fn(() => 'en'),
  apiSuccess: vi.fn((data: unknown) => ({ data })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

const { mockConsumeCredits, mockClaim, mockRelease, mockCacheGet, mockCacheSet } = vi.hoisted(
  () => ({
    mockConsumeCredits: vi.fn(),
    mockClaim: vi.fn(),
    mockRelease: vi.fn(),
    mockCacheGet: vi.fn(),
    mockCacheSet: vi.fn(),
  })
)
vi.mock('@/lib/cache/redis-cache', () => ({
  cacheGet: (...a: unknown[]) => mockCacheGet(...a),
  cacheSet: (...a: unknown[]) => mockCacheSet(...a),
}))
vi.mock('@/lib/credits/creditService', () => ({
  consumeCredits: (...a: unknown[]) => mockConsumeCredits(...a),
}))
vi.mock('@/lib/credits/creditRefund', () => ({
  refundCredits: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/lib/api/idempotency', () => ({
  createIdempotencyStore: vi.fn(() => ({
    keyFor: vi.fn(() => 'test-idem-key'),
    claim: (...a: unknown[]) => mockClaim(...a),
    release: (...a: unknown[]) => mockRelease(...a),
  })),
  idemContentTag: (t: string) => `tag:${t.length}`,
}))
vi.mock('@/lib/user/displayName', () => ({
  getUserDisplayName: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/api/errorHandler', () => ({
  createErrorResponse: vi.fn((opts: { code: string; message?: string }) =>
    NextResponse.json({ error: opts.code, message: opts.message }, { status: 400 })
  ),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
    PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))
vi.mock('@/lib/auth/session', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock('@/lib/streaming', () => ({ createFallbackSSEStream: vi.fn() }))
vi.mock('@/lib/llm/claudeSSE', () => ({ streamClaudeAsSSE: vi.fn() }))

import { POST } from '@/app/api/compatibility/counselor/route'
import { initializeApiContext } from '@/lib/api/middleware'
import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'

const ANN = {
  name: 'Ann',
  date: '1990-05-15',
  time: '08:30',
  gender: 'female',
  timeZone: 'America/New_York',
  latitude: 40.7,
  longitude: -74.0,
}
const BOB_NO_TIME = {
  name: 'Bob',
  date: '1988-11-02',
  gender: 'male',
  timeZone: 'Europe/London',
  latitude: 51.5,
  longitude: -0.13,
  timeUnknown: true,
  relation: 'partner',
}

function request(persons: unknown[], lang: 'en' | 'ko'): NextRequest {
  return new NextRequest('http://localhost/api/compatibility/counselor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      persons,
      lang,
      sources: { saju: true, astro: false },
      messages: [{ role: 'user', content: 'How is our compatibility?' }],
    }),
  })
}

async function payloadFor(persons: unknown[], lang: 'en' | 'ko'): Promise<string> {
  const res = await POST(request(persons, lang))
  expect(res.headers.get('Content-Type')).toBe('text/event-stream')
  expect(streamClaudeAsSSE).toHaveBeenCalledTimes(1)
  const arg = vi.mocked(streamClaudeAsSSE).mock.calls[0][0] as { cachedUserContext?: string }
  return arg.cachedUserContext ?? ''
}

/** 사주 시너스트리 블록 — 헤더부터 다음 빈 블록 경계 전까지(점성은 sources 로 꺼 둠). */
function sajuBlock(ctx: string, header: string): string {
  const at = ctx.indexOf(header)
  return at < 0 ? '' : ctx.slice(at)
}

describe('compat counselor route — saju block reaches the LLM when a birth time is unknown (CS-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConsumeCredits.mockResolvedValue({ success: true, remaining: 99 })
    mockClaim.mockResolvedValue(true)
    mockRelease.mockResolvedValue(undefined)
    mockCacheGet.mockResolvedValue(null)
    mockCacheSet.mockResolvedValue(true)
    vi.mocked(initializeApiContext).mockResolvedValue({
      context: {
        userId: 'user-123',
        session: { user: { id: 'user-123' } },
        ip: '127.0.0.1',
        locale: 'en',
        isAuthenticated: true,
        isPremium: true,
      },
      error: undefined,
    } as never)
    vi.mocked(streamClaudeAsSSE).mockResolvedValue(
      new Response('data: {"content":"ok","done":false}\n\n', {
        headers: { 'Content-Type': 'text/event-stream' },
      }) as never
    )
  })

  it('EN, B time unknown: the 삼주 synastry block is in the payload, with no hour pillar for B', async () => {
    const ctx = await payloadFor([ANN, BOB_NO_TIME], 'en')
    expect(ctx).toContain('[Meta] B: timeUnknown=true')
    const block = sajuBlock(ctx, '== Synastry ==')
    expect(block.length).toBeGreaterThan(500)
    // 일간 cross — 庚=Metal ↔ 辛=Metal, 서로 겁재.
    expect(block).toContain('day-master 庚=Metal')
    expect(block).toContain('day-master 辛=Metal')
    expect(block).toContain('Rob Wealth')
    // 년·월·일 3×3 지지 관계 — A 일지 辰 ↔ B 년지 辰 자형, ↔ B 월지 戌 충.
    expect(block).toContain('A D-branch 辰 ↔ B Y-branch 辰')
    expect(block).toContain('A D-branch 辰 ↔ B M-branch 戌')
    // B 의 시주는 어디에도 없다(정오 앵커 날조 금지). A 는 시각을 알아 시주가 남는다.
    expect(block).not.toMatch(/B H-(stem|branch)/)
    expect(block).not.toMatch(/B·Bob [^\n]*H-pillar/)
    expect(block).toMatch(/A H-(stem|branch)/)
  })

  it('EN, both times unknown: the block is non-empty and carries no hour pillar at all', async () => {
    const annNoTime = { ...ANN, time: undefined, timeUnknown: true }
    const ctx = await payloadFor([annNoTime, BOB_NO_TIME], 'en')
    const block = sajuBlock(ctx, '== Synastry ==')
    expect(block.length).toBeGreaterThan(500)
    expect(block).toContain('day-master 庚=Metal')
    expect(block).not.toMatch(/\bH-(stem|branch|pillar)\b/)
  })

  it('EN, a stale time string with timeUnknown=true still yields the 삼주 block (noon anchor, no hour)', async () => {
    const bobStale = { ...BOB_NO_TIME, time: '03:00' }
    const ctx = await payloadFor([ANN, bobStale], 'en')
    const block = sajuBlock(ctx, '== Synastry ==')
    expect(block.length).toBeGreaterThan(500)
    expect(block).not.toMatch(/B H-(stem|branch)/)
  })

  it('KO, B time unknown: the Korean synastry block is in the payload', async () => {
    const ctx = await payloadFor([ANN, BOB_NO_TIME], 'ko')
    const block = sajuBlock(ctx, '== 시너스트리')
    expect(block.length).toBeGreaterThan(300)
    expect(block).toContain('일간')
    expect(block).toContain('겁재')
    // B 시주 cross 없음 — KO 라벨은 'B 시지' / 'B 시천간'.
    expect(block).not.toMatch(/B 시(지|천간)/)
  })

  it('control: both times known still sends the full block (B hour pillar present)', async () => {
    const bobKnown = { ...BOB_NO_TIME, time: '09:10', timeUnknown: false }
    const ctx = await payloadFor([ANN, bobKnown], 'en')
    const block = sajuBlock(ctx, '== Synastry ==')
    expect(block.length).toBeGreaterThan(500)
    expect(block).toMatch(/B H-(stem|branch)|B·Bob [^\n]*H-/)
  })
})
