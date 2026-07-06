import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Mocks - must be before route import
// ============================================================

// Mock middleware with initializeApiContext
vi.mock('@/lib/api/middleware', () => ({
  initializeApiContext: vi.fn(),
  createAuthenticatedGuard: vi.fn(() => ({
    requireAuth: true,
    rateLimit: { limit: 30, windowSeconds: 60 },
    credits: { type: 'compatibility', amount: 1 },
  })),
  // Route imports extractLocale to build error responses with the caller's
  // locale. Returning 'ko' is fine for all test branches since safetyMessage
  // and createErrorResponse are themselves mocked below.
  extractLocale: vi.fn(() => 'ko'),
  apiSuccess: vi.fn((data: any) => ({ data })),
  apiError: vi.fn((code: string, message?: string) => ({
    error: { code, message },
  })),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

// Credit / idempotency / refund subsystem — the route now consumes 1 credit
// per authed turn (with idempotent replay skip on refresh) and refunds it
// if Claude fails mid-stream. Tests focus on the routing logic; these are
// black-boxed as always-succeeding so the flow reaches streamClaudeAsSSE.
vi.mock('@/lib/credits/creditService', () => ({
  consumeCredits: vi.fn().mockResolvedValue({ success: true, remaining: 99 }),
}))
vi.mock('@/lib/credits/creditRefund', () => ({
  refundCredits: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/lib/api/idempotency', () => ({
  createIdempotencyStore: vi.fn(() => ({
    keyFor: vi.fn(() => 'test-idem-key'),
    claim: vi.fn().mockResolvedValue(true),
    release: vi.fn().mockResolvedValue(undefined),
  })),
  idemContentTag: (t: string) => `tag:${t.length}`,
}))

// Synastry / chart formatters — pure string builders. Stubbed so the route
// reaches the prompt assembly + streamClaudeAsSSE without depending on the
// real saju / astrology engines, which the unit tests don't exercise.
vi.mock('@/lib/compatibility/sajuSynastryFormatter', () => ({
  formatSajuSynastry: vi.fn(() => '== 사주 시너스트리 == (stub)'),
}))
vi.mock('@/lib/compatibility/astroSynastryFormatter', () => ({
  formatAstroSynastry: vi.fn(() => '== 점성 시너스트리 == (stub)'),
}))
vi.mock('@/lib/compatibility/compositeChartFormatter', () => ({
  formatCompositeChart: vi.fn(() => '== 컴포지트 차트 == (stub)'),
}))

// Natal chart math — tests don't validate planetary positions; just need
// the call chain to not throw. toChart returns a minimal object that the
// formatters' stubs accept (they're stubbed too).
vi.mock('@/lib/astrology/foundation/astrologyService', () => ({
  calculateNatalChart: vi.fn().mockResolvedValue({}),
  toChart: vi.fn(() => ({ planets: {}, houses: [], aspects: [] })),
}))

vi.mock('@/lib/user/displayName', () => ({
  getUserDisplayName: vi.fn().mockResolvedValue(null),
}))

// Error response helper — route uses this for 401 guest limit + 402 credit
// exhaustion. Echoes the status so tests on those paths see the expected
// code without us re-implementing the helper's body.
vi.mock('@/lib/api/errorHandler', () => ({
  createErrorResponse: vi.fn(
    (opts: { code: string; message?: string; headers?: Record<string, string> }) => {
      const status =
        opts.code === 'PAYMENT_REQUIRED' ? 402 : opts.code === 'UNAUTHORIZED' ? 401 : 400
      return NextResponse.json(
        { error: opts.code, message: opts.message },
        { status, headers: opts.headers }
      )
    }
  ),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
    PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

// Mock next-auth
vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock streaming
vi.mock('@/lib/streaming', () => ({
  createFallbackSSEStream: vi.fn(),
}))

// Mock Claude SSE — the route streams the answer directly via streamClaudeAsSSE
// (it no longer proxies to a backend /api/compatibility/chat endpoint).
vi.mock('@/lib/llm/claudeSSE', () => ({
  streamClaudeAsSSE: vi.fn(),
}))

// Mock text guards
vi.mock('@/lib/textGuards', () => ({
  guardText: vi.fn((value: string, _max?: number) => value),
  containsForbidden: vi.fn().mockReturnValue(false),
  safetyMessage: vi.fn((lang: string) =>
    lang === 'ko'
      ? '규제/민감 주제로 답변이 제한됩니다.'
      : 'Response restricted due to sensitive topics.'
  ),
}))

// Mock Zod validation
vi.mock('@/lib/api/zodValidation', () => ({
  compatibilityCounselorRequestSchema: {
    safeParse: vi.fn((data: any) => {
      if (!data || typeof data !== 'object') {
        return { success: false, error: { issues: [{ path: [], message: 'Expected object' }] } }
      }
      if (!data.persons || !Array.isArray(data.persons) || data.persons.length < 2) {
        return {
          success: false,
          error: { issues: [{ path: ['persons'], message: 'At least 2 persons required' }] },
        }
      }
      if (data.persons.length > 4) {
        return {
          success: false,
          error: { issues: [{ path: ['persons'], message: 'Max 4 persons' }] },
        }
      }
      if (data.lang && !['ko', 'en'].includes(data.lang)) {
        return {
          success: false,
          error: { issues: [{ path: ['lang'], message: 'Invalid language' }] },
        }
      }
      if (data.theme && !['general', 'love', 'business', 'family'].includes(data.theme)) {
        return {
          success: false,
          error: { issues: [{ path: ['theme'], message: 'Invalid theme' }] },
        }
      }
      return {
        success: true,
        data: {
          persons: data.persons,
          person1Saju: data.person1Saju ?? null,
          person2Saju: data.person2Saju ?? null,
          person1Astro: data.person1Astro ?? null,
          person2Astro: data.person2Astro ?? null,
          lang: data.lang,
          // 사주/점성 시너스트리 토글 — 라우트가 resolveCounselorSources 로 읽어
          // 컨텍스트·프롬프트를 게이팅한다. 누락 시 라우트가 둘 다로 폴백.
          sources: data.sources,
          messages: data.messages ?? [],
          theme: data.theme ?? 'general',
        },
      }
    }),
  },
}))

// Mock HTTP constants
vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
  },
}))

// ============================================================
// Import route and mocked modules AFTER all mocks
// ============================================================
import { POST } from '@/app/api/compatibility/counselor/route'
import { initializeApiContext } from '@/lib/api/middleware'
import { createFallbackSSEStream } from '@/lib/streaming'
import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'
import { containsForbidden, safetyMessage } from '@/lib/textGuards'

// ============================================================
// Helpers
// ============================================================
const defaultContext = {
  userId: 'user-123',
  session: { user: { id: 'user-123', email: 'test@example.com' } },
  ip: '127.0.0.1',
  locale: 'ko',
  isAuthenticated: true,
  isPremium: true,
}

const validPersons = [
  { name: 'Person 1', date: '1990-01-15', time: '10:30' },
  { name: 'Person 2', date: '1992-05-20', time: '14:00', relation: 'partner' },
]

const validSajuProfile = {
  dayMaster: { name: '갑', element: '목', yin_yang: '양' },
  pillars: {
    year: { heavenlyStem: '甲', earthlyBranch: '子' },
    month: { heavenlyStem: '丙', earthlyBranch: '寅' },
    day: { heavenlyStem: '甲', earthlyBranch: '午' },
    time: { heavenlyStem: '庚', earthlyBranch: '申' },
  },
  fiveElements: { wood: 30, fire: 20, earth: 15, metal: 20, water: 15 },
}

const validAstroProfile = {
  planets: {
    sun: { sign: 'Capricorn' },
    moon: { sign: 'Aries' },
    venus: { sign: 'Pisces' },
    mars: { sign: 'Leo' },
    ascendant: { sign: 'Gemini' },
  },
}

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/compatibility/counselor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ============================================================
// Tests
// ============================================================
describe('Compatibility Counselor API - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: authenticated user with no errors
    vi.mocked(initializeApiContext).mockResolvedValue({
      context: defaultContext,
      error: undefined,
    } as any)

    // Default: Claude SSE streams a successful answer. Mirrors the real
    // streamClaudeAsSSE Response (text/event-stream + no-cache headers).
    vi.mocked(streamClaudeAsSSE).mockResolvedValue(
      new Response('data: {"content":"AI generated compatibility analysis.","done":false}\n\n', {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      }) as any
    )

    // Default: fallback stream returns a Response
    vi.mocked(createFallbackSSEStream).mockReturnValue(
      new Response('data: fallback\n\ndata: [DONE]\n\n', {
        headers: { 'Content-Type': 'text/event-stream' },
      }) as any
    )

    // Default: no forbidden content
    vi.mocked(containsForbidden).mockReturnValue(false)
  })

  // ----------------------------------------------------------
  // Authentication & Middleware
  // ----------------------------------------------------------
  describe('Authentication', () => {
    it('should return middleware error when not authenticated', async () => {
      const errorResponse = NextResponse.json({ error: 'unauthorized' }, { status: 401 })
      vi.mocked(initializeApiContext).mockResolvedValue({
        context: { ...defaultContext, userId: null, isAuthenticated: false },
        error: errorResponse,
      } as any)

      const req = createRequest({ persons: validPersons })
      const response = await POST(req)

      expect(response.status).toBe(401)
    })

    it('should return middleware error when rate limited', async () => {
      const rateLimitResponse = NextResponse.json({ error: 'rate_limited' }, { status: 429 })
      vi.mocked(initializeApiContext).mockResolvedValue({
        context: defaultContext,
        error: rateLimitResponse,
      } as any)

      const req = createRequest({ persons: validPersons })
      const response = await POST(req)

      expect(response.status).toBe(429)
    })

    it('should return middleware error when insufficient credits', async () => {
      const creditError = NextResponse.json({ error: 'insufficient_credits' }, { status: 402 })
      vi.mocked(initializeApiContext).mockResolvedValue({
        context: defaultContext,
        error: creditError,
      } as any)

      const req = createRequest({ persons: validPersons })
      const response = await POST(req)

      expect(response.status).toBe(402)
    })

    it('should proceed when context has no error', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'How is our compatibility?' }],
      })
      const response = await POST(req)

      // Should return an SSE stream response
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })
  })

  // ----------------------------------------------------------
  // Input Validation
  // ----------------------------------------------------------
  describe('Input Validation', () => {
    it('should return 400 when persons array is missing', async () => {
      const req = createRequest({ messages: [] })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when persons has fewer than 2 entries', async () => {
      const req = createRequest({
        persons: [{ name: 'Only One', date: '1990-01-01' }],
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when persons has more than 4 entries', async () => {
      const tooMany = Array.from({ length: 5 }, (_, i) => ({
        name: `Person ${i}`,
        date: '1990-01-01',
      }))
      const req = createRequest({ persons: tooMany })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid language value', async () => {
      const req = createRequest({
        persons: validPersons,
        lang: 'fr',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid theme value', async () => {
      const req = createRequest({
        persons: validPersons,
        theme: 'invalid-theme',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should accept valid theme values', async () => {
      for (const theme of ['general', 'love', 'business', 'family']) {
        vi.clearAllMocks()
        vi.mocked(initializeApiContext).mockResolvedValue({
          context: defaultContext,
          error: undefined,
        } as any)
        vi.mocked(streamClaudeAsSSE).mockResolvedValue(
          new Response('data: {"content":"OK","done":false}\n\n', {
            headers: { 'Content-Type': 'text/event-stream' },
          }) as any
        )
        vi.mocked(containsForbidden).mockReturnValue(false)

        const req = createRequest({
          persons: validPersons,
          theme,
          messages: [{ role: 'user', content: 'Tell me about our compatibility' }],
        })
        const response = await POST(req)

        expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      }
    })
  })

  // ----------------------------------------------------------
  // Safety Check
  // ----------------------------------------------------------
  describe('Safety Check', () => {
    it('should return safety message when forbidden content is detected', async () => {
      vi.mocked(containsForbidden).mockReturnValue(true)

      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'some forbidden content' }],
        lang: 'ko',
      })
      await POST(req)

      expect(createFallbackSSEStream).toHaveBeenCalledWith(
        expect.objectContaining({ done: true }),
        // Route now tags fallback streams so the client doesn't mistake them
        // for a mid-stream cutoff (which would surface a misleading "retry" chip).
        expect.objectContaining({ 'X-Counselor-Fallback': '1' })
      )
    })

    it('should call safetyMessage with the correct locale', async () => {
      vi.mocked(containsForbidden).mockReturnValue(true)

      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'forbidden stuff' }],
        lang: 'en',
      })
      await POST(req)

      expect(safetyMessage).toHaveBeenCalled()
    })

    it('should NOT trigger safety check for safe content', async () => {
      vi.mocked(containsForbidden).mockReturnValue(false)

      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'Normal question about our relationship' }],
      })
      await POST(req)

      // Should proceed to stream the AI answer (no safety fallback)
      expect(streamClaudeAsSSE).toHaveBeenCalled()
    })
  })

  // ----------------------------------------------------------
  // AI Streaming Call (streamClaudeAsSSE)
  // ----------------------------------------------------------
  describe('AI Streaming Call', () => {
    it('should stream the answer with the compatibility-counselor label and prompts', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'How is our compatibility?' }],
        lang: 'ko',
        theme: 'love',
      })
      await POST(req)

      expect(streamClaudeAsSSE).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'compatibility-counselor',
          systemPrompt: expect.any(String),
          userPrompt: expect.any(String),
          // Route caps Claude output at 5000 + auto-continuation hook so
          // long answers don't get truncated mid-sentence (see route.ts).
          maxTokens: 5000,
          timeoutMs: 80000,
        })
      )
    })

    it('should pass the latest user question through to the user prompt', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'How is our compatibility?' }],
      })
      await POST(req)

      const callArg = vi.mocked(streamClaudeAsSSE).mock.calls[0][0]
      expect(callArg.userPrompt).toContain('How is our compatibility?')
    })

    it('should return SSE stream response on successful AI call', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'Tell me about us' }],
      })
      const response = await POST(req)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform')
    })

    it('should clamp prior conversation turns to at most 8', async () => {
      const messages = Array.from({ length: 15 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }))

      const req = createRequest({
        persons: validPersons,
        messages,
      })
      await POST(req)

      // clampMessages caps history at 8; priorTurns excludes the final
      // user turn (it becomes userPrompt), so it must stay <= 8.
      const callArg = vi.mocked(streamClaudeAsSSE).mock.calls[0][0]
      expect(Array.isArray(callArg.priorTurns)).toBe(true)
      expect((callArg.priorTurns as unknown[]).length).toBeLessThanOrEqual(8)
    })
  })

  // ----------------------------------------------------------
  // AI Streaming Failure / Fallback
  // ----------------------------------------------------------
  describe('AI Streaming Failure', () => {
    it('should return Korean fallback SSE stream when Claude streaming throws', async () => {
      vi.mocked(streamClaudeAsSSE).mockRejectedValue(new Error('Claude down'))

      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'How are we?' }],
        lang: 'ko',
      })
      await POST(req)

      expect(createFallbackSSEStream).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('AI 서버'),
          done: true,
        }),
        expect.objectContaining({ 'X-Counselor-Fallback': '1' })
      )
    })

    it('should return English fallback message when language is en', async () => {
      vi.mocked(streamClaudeAsSSE).mockRejectedValue(new Error('Claude down'))

      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'Check compatibility' }],
        lang: 'en',
      })
      await POST(req)

      expect(createFallbackSSEStream).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('AI server'),
          done: true,
        }),
        expect.objectContaining({ 'X-Counselor-Fallback': '1' })
      )
    })

    it('should return fallback SSE stream when Claude streaming rejects', async () => {
      vi.mocked(streamClaudeAsSSE).mockRejectedValue(new Error('Network error'))

      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'Connection check' }],
      })
      await POST(req)

      expect(createFallbackSSEStream).toHaveBeenCalled()
    })
  })

  // ----------------------------------------------------------
  // Error Handling
  // ----------------------------------------------------------
  describe('Error Handling', () => {
    it('should return 500 on unexpected errors', async () => {
      // Force initializeApiContext to throw
      vi.mocked(initializeApiContext).mockRejectedValue(new Error('Unexpected crash'))

      const req = createRequest({ persons: validPersons })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should return 500 when request.json() throws', async () => {
      const req = new NextRequest('http://localhost/api/compatibility/counselor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json{{{',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
    })
  })

  // ----------------------------------------------------------
  // Edge Cases
  // ----------------------------------------------------------
  describe('Edge Cases', () => {
    it('should handle empty messages array', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: [],
      })
      await POST(req)

      // Should proceed (no safety check since no user message)
      expect(streamClaudeAsSSE).toHaveBeenCalled()
    })

    it('should use context locale (en) to pick the English system prompt when lang is not provided', async () => {
      vi.mocked(initializeApiContext).mockResolvedValue({
        context: { ...defaultContext, locale: 'en' },
        error: undefined,
      } as any)

      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'Compatibility check' }],
      })
      await POST(req)

      // lang defaults to context.locale -> English system prompt
      const callArg = vi.mocked(streamClaudeAsSSE).mock.calls[0][0]
      expect(callArg.systemPrompt).toContain(
        'Answer the user directly from the saju and astrology synastry data'
      )
    })

    it('should use the Korean system prompt when lang is ko', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: '우리 잘 맞아?' }],
        lang: 'ko',
      })
      await POST(req)

      const callArg = vi.mocked(streamClaudeAsSSE).mock.calls[0][0]
      expect(callArg.systemPrompt).toContain('사용자의 질문에 직접 답변한다')
    })

    // ----------------------------------------------------------
    // Data-source toggles (사주/점성 시너스트리 체크박스) — mirrors the
    // destiny counselor's `sources`. Unselected domain is dropped from the
    // cached context AND the system prompt switches to a single-source scope
    // (no dangling references to absent data). Note: astro facts are always
    // null in test env (NODE_ENV gate), so we assert on the saju block +
    // the deterministic scope/rule text in the system prompt.
    // ----------------------------------------------------------
    describe('Data source toggles (sources)', () => {
      it('saju-only → saju-only scope in prompt; astrology composite rule dropped', async () => {
        const req = createRequest({
          persons: validPersons,
          messages: [{ role: 'user', content: 'are we good?' }],
          lang: 'en',
          sources: { saju: true, astro: false },
        })
        await POST(req)

        const callArg = vi.mocked(streamClaudeAsSSE).mock.calls[0][0]
        expect(callArg.systemPrompt).toContain('Saju (four pillars) synastry only')
        // Composite/House-overlay are astrology rules — must not dangle when astro is off.
        expect(callArg.systemPrompt).not.toContain('Composite (relationship entity) usage')
        // Saju synastry block still flows into the cached context.
        expect(callArg.cachedUserContext).toContain('== 사주 시너스트리 == (stub)')
      })

      it('astro-only → astro-only scope; saju synastry block dropped from context', async () => {
        const req = createRequest({
          persons: validPersons,
          messages: [{ role: 'user', content: 'are we good?' }],
          lang: 'en',
          sources: { saju: false, astro: true },
        })
        await POST(req)

        const callArg = vi.mocked(streamClaudeAsSSE).mock.calls[0][0]
        expect(callArg.systemPrompt).toContain('Western astrology synastry only')
        // Saju is off → no saju synastry block, and the saju-only hidden-stems
        // rule is dropped (the phrase is unique to the SAJU_RULES bullet; the
        // always-on DESCRIBE doctrine mentions "hidden-stems cross" separately).
        expect(callArg.cachedUserContext).not.toContain('== 사주 시너스트리 == (stub)')
        expect(callArg.systemPrompt).not.toContain('hidden stems inside earthly branches')
      })

      it('no sources field → both domains; fusion rule present, no single-source scope', async () => {
        const req = createRequest({
          persons: validPersons,
          messages: [{ role: 'user', content: 'are we good?' }],
          lang: 'en',
        })
        await POST(req)

        const callArg = vi.mocked(streamClaudeAsSSE).mock.calls[0][0]
        expect(callArg.systemPrompt).not.toContain('synastry only')
        expect(callArg.systemPrompt).toContain('Fuse saju and astrology in one flow')
      })

      it('both sources false → falls back to both (never an empty context)', async () => {
        const req = createRequest({
          persons: validPersons,
          messages: [{ role: 'user', content: 'are we good?' }],
          lang: 'en',
          sources: { saju: false, astro: false },
        })
        await POST(req)

        const callArg = vi.mocked(streamClaudeAsSSE).mock.calls[0][0]
        expect(callArg.systemPrompt).not.toContain('synastry only')
        expect(callArg.cachedUserContext).toContain('== 사주 시너스트리 == (stub)')
      })
    })

    it('should still stream when saju data has missing fields', async () => {
      const incompleteSaju = {
        dayMaster: { name: '갑' },
        // Missing pillars and elements
      }

      const req = createRequest({
        persons: validPersons,
        person1Saju: incompleteSaju,
        person2Saju: incompleteSaju,
        person1Astro: validAstroProfile,
        person2Astro: validAstroProfile,
        messages: [{ role: 'user', content: 'Compatibility?' }],
      })
      const response = await POST(req)

      expect(streamClaudeAsSSE).toHaveBeenCalled()
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should still stream when astro data uses direct planet format', async () => {
      const directAstro = {
        sun: { sign: 'Aries' },
        moon: { sign: 'Taurus' },
        venus: { sign: 'Gemini' },
        mars: { sign: 'Cancer' },
        ascendant: { sign: 'Leo' },
      }

      const req = createRequest({
        persons: validPersons,
        person1Saju: validSajuProfile,
        person2Saju: validSajuProfile,
        person1Astro: directAstro,
        person2Astro: directAstro,
        messages: [{ role: 'user', content: 'Are we compatible?' }],
      })
      const response = await POST(req)

      expect(streamClaudeAsSSE).toHaveBeenCalled()
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should only check the last user message for safety', async () => {
      vi.mocked(containsForbidden).mockReturnValue(false)

      const messages = [
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'Response' },
        { role: 'user', content: 'Second question' },
      ]

      const req = createRequest({
        persons: validPersons,
        messages,
      })
      await POST(req)

      // containsForbidden should have been called with the last user message
      expect(containsForbidden).toHaveBeenCalledWith('Second question')
    })

    it('should handle 3 persons', async () => {
      const threePersons = [
        { name: 'A', date: '1990-01-01', time: '10:00' },
        { name: 'B', date: '1992-02-02', time: '12:00', relation: 'partner' },
        { name: 'C', date: '1995-03-03', time: '14:00', relation: 'friend' },
      ]

      const req = createRequest({
        persons: threePersons,
        messages: [{ role: 'user', content: 'Group compatibility?' }],
      })
      await POST(req)

      expect(streamClaudeAsSSE).toHaveBeenCalled()
    })
  })
})
