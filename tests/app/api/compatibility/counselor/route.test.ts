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

// Mock next-auth
vi.mock('next-auth', () => ({
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

// Mock ApiClient
vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
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

// Mock compatibility fusion
vi.mock('@/lib/compatibility/compatibilityFusion', () => ({
  calculateFusionCompatibility: vi.fn(),
  interpretCompatibilityScore: vi.fn(),
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
import { apiClient } from '@/lib/api/ApiClient'
import { containsForbidden, safetyMessage } from '@/lib/textGuards'
import {
  calculateFusionCompatibility,
  interpretCompatibilityScore,
} from '@/lib/compatibility/compatibilityFusion'

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

const mockFusionResult = {
  overallScore: 78,
  aiInsights: {
    deepAnalysis: 'Strong complementary energy between the two',
    hiddenPatterns: ['Pattern 1'],
    synergySources: ['Synergy 1'],
    growthOpportunities: ['Growth 1'],
  },
  relationshipDynamics: {
    emotionalIntensity: 75,
    intellectualAlignment: 80,
    spiritualConnection: 70,
    conflictResolutionStyle: 'Collaborative',
  },
  futureGuidance: {
    shortTerm: 'Focus on communication',
    mediumTerm: 'Strengthen trust',
    longTerm: 'Build together',
  },
  recommendedActions: [
    {
      priority: 'high',
      category: 'communication',
      action: 'Have weekly date nights',
      reasoning: 'Strengthens emotional bond',
    },
  ],
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

    // Default: fusion calculation succeeds
    vi.mocked(calculateFusionCompatibility).mockReturnValue(mockFusionResult as any)
    vi.mocked(interpretCompatibilityScore).mockReturnValue({
      grade: 'A',
      emoji: '💕',
      title: 'Excellent Match',
    } as any)

    // Default: backend AI responds successfully
    vi.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        data: {
          response: 'AI generated compatibility analysis response.',
        },
      },
    } as any)

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
        vi.mocked(apiClient.post).mockResolvedValue({
          ok: true,
          status: 200,
          data: { data: { response: 'OK' } },
        } as any)
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

      expect(createFallbackSSEStream).toHaveBeenCalledWith(expect.objectContaining({ done: true }))
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

      // Should proceed to backend AI call
      expect(apiClient.post).toHaveBeenCalled()
    })
  })

  // ----------------------------------------------------------
  // Fusion Compatibility Analysis
  // ----------------------------------------------------------
  describe('Fusion Compatibility Analysis', () => {
    it('should calculate fusion when all saju and astro profiles provided', async () => {
      const req = createRequest({
        persons: validPersons,
        person1Saju: validSajuProfile,
        person2Saju: validSajuProfile,
        person1Astro: validAstroProfile,
        person2Astro: validAstroProfile,
        messages: [{ role: 'user', content: 'How compatible are we?' }],
      })
      await POST(req)

      expect(calculateFusionCompatibility).toHaveBeenCalled()
      expect(interpretCompatibilityScore).toHaveBeenCalledWith(78)
    })

    it('should skip fusion when person1Saju is null', async () => {
      const req = createRequest({
        persons: validPersons,
        person1Saju: null,
        person2Saju: validSajuProfile,
        person1Astro: validAstroProfile,
        person2Astro: validAstroProfile,
        messages: [{ role: 'user', content: 'Check compatibility' }],
      })
      await POST(req)

      expect(calculateFusionCompatibility).not.toHaveBeenCalled()
    })

    it('should skip fusion when person2Astro is null', async () => {
      const req = createRequest({
        persons: validPersons,
        person1Saju: validSajuProfile,
        person2Saju: validSajuProfile,
        person1Astro: validAstroProfile,
        person2Astro: null,
        messages: [{ role: 'user', content: 'Check compatibility' }],
      })
      await POST(req)

      expect(calculateFusionCompatibility).not.toHaveBeenCalled()
    })

    it('should handle fusion calculation errors gracefully', async () => {
      vi.mocked(calculateFusionCompatibility).mockImplementation(() => {
        throw new Error('Fusion calculation failed')
      })

      const req = createRequest({
        persons: validPersons,
        person1Saju: validSajuProfile,
        person2Saju: validSajuProfile,
        person1Astro: validAstroProfile,
        person2Astro: validAstroProfile,
        messages: [{ role: 'user', content: 'Compatibility check' }],
      })
      const response = await POST(req)

      // Should still proceed to backend AI call, just without fusion context
      expect(apiClient.post).toHaveBeenCalled()
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should not run fusion when no saju/astro data is provided', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'General compatibility question' }],
      })
      await POST(req)

      expect(calculateFusionCompatibility).not.toHaveBeenCalled()
    })
  })

  // ----------------------------------------------------------
  // Backend AI Call
  // ----------------------------------------------------------
  describe('Backend AI Call', () => {
    it('should send correct parameters to backend', async () => {
      const messages = [{ role: 'user', content: 'How is our compatibility?' }]

      const req = createRequest({
        persons: validPersons,
        messages,
        lang: 'ko',
        theme: 'love',
      })
      await POST(req)

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/compatibility/chat',
        expect.objectContaining({
          persons: validPersons,
          locale: 'ko',
          theme: 'love',
          is_premium: true,
        }),
        expect.objectContaining({ timeout: 80000 })
      )
    })

    it('should return SSE stream response on successful AI call', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'Tell me about us' }],
      })
      const response = await POST(req)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
    })

    it('should handle AI response with various data shapes', async () => {
      // Test fallback when data.response is missing but aiData.interpretation exists
      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          interpretation: 'Interpretation text here',
        },
      } as any)

      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'Compatibility?' }],
      })
      const response = await POST(req)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should clamp messages to maximum of 8', async () => {
      const messages = Array.from({ length: 15 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }))

      const req = createRequest({
        persons: validPersons,
        messages,
      })
      await POST(req)

      // The handler uses clampMessages(messages, 8), passing at most 8 to the backend
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/compatibility/chat',
        expect.objectContaining({
          history: expect.any(Array),
        }),
        expect.anything()
      )
      const callArgs = vi.mocked(apiClient.post).mock.calls[0][1] as any
      expect(callArgs.history.length).toBeLessThanOrEqual(8)
    })
  })

  // ----------------------------------------------------------
  // Backend AI Failure / Fallback
  // ----------------------------------------------------------
  describe('Backend AI Failure', () => {
    it('should return fallback SSE stream when backend returns non-ok status', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        ok: false,
        status: 502,
        data: null,
      } as any)

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
        })
      )
    })

    it('should return English fallback message when language is en', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        ok: false,
        status: 500,
        data: null,
      } as any)

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
        })
      )
    })

    it('should return fallback SSE stream when fetch throws', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'))

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
      expect(apiClient.post).toHaveBeenCalled()
    })

    it('should use context locale when lang is not provided', async () => {
      vi.mocked(initializeApiContext).mockResolvedValue({
        context: { ...defaultContext, locale: 'en' },
        error: undefined,
      } as any)

      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'Compatibility check' }],
      })
      await POST(req)

      // lang defaults to context.locale
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/compatibility/chat',
        expect.objectContaining({
          locale: 'en',
        }),
        expect.anything()
      )
    })

    it('should default theme to general', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'Check' }],
      })
      await POST(req)

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/compatibility/chat',
        expect.objectContaining({
          theme: 'general',
        }),
        expect.anything()
      )
    })

    it('should handle saju data with missing fields gracefully', async () => {
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
      await POST(req)

      // Should still work - buildSajuProfile fills defaults
      expect(calculateFusionCompatibility).toHaveBeenCalled()
    })

    it('should handle astro data with direct planet format', async () => {
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
      await POST(req)

      expect(calculateFusionCompatibility).toHaveBeenCalled()
    })

    it('should handle AI response with empty response field', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          data: { response: '' },
        },
      } as any)

      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'Compatibility' }],
        lang: 'ko',
      })
      const response = await POST(req)

      // The handler falls back to a default message when response is falsy
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

      expect(apiClient.post).toHaveBeenCalled()
    })
  })
})
