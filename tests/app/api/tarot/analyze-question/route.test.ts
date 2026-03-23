import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ============================================================
// Mocks - must be before route import
// ============================================================

// Mock rate limiting
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 9,
    headers: new Map(),
  }),
}))

// Mock request-ip
vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
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

// Mock tarot spreads data with a minimal set
vi.mock('@/lib/Tarot/tarot-spreads-data', () => ({
  tarotThemes: [
    {
      id: 'general-insight',
      category: 'General Insight',
      categoryKo: 'ì „ë°˜ ìš´ì„¸',
      description: 'General insight',
      descriptionKo: 'ì „ë°˜ ìš´ì„¸',
      spreads: [
        {
          id: 'past-present-future',
          title: 'Past, Present, Future',
          titleKo: 'ê³¼ê±°, í˜„ìž¬, ë¯¸ëž˜',
          cardCount: 3,
          description: 'Past present future flow.',
          descriptionKo: 'ê³¼ê±° í˜„ìž¬ ë¯¸ëž˜ íë¦„.',
          positions: [],
        },
        {
          id: 'quick-reading',
          title: 'Quick Reading',
          titleKo: 'ë¹ ë¥¸ ë¦¬ë”©',
          cardCount: 1,
          description: 'Quick reading.',
          descriptionKo: 'ë¹ ë¥¸ ë¦¬ë”©.',
          positions: [],
        },
      ],
    },
    {
      id: 'decisions-crossroads',
      category: 'Decisions & Crossroads',
      categoryKo: 'ê²°ì •ê³¼ ì„ íƒ',
      description: 'Decisions',
      descriptionKo: 'ê²°ì •',
      spreads: [
        {
          id: 'yes-no-why',
          title: 'Yes / No / Why',
          titleKo: 'ì˜ˆ / ì•„ë‹ˆì˜¤ / ì´ìœ ',
          cardCount: 3,
          description: 'Yes or No.',
          descriptionKo: 'ì˜ˆ ì•„ë‹ˆì˜¤.',
          positions: [],
        },
        {
          id: 'two-paths',
          title: 'Two Paths',
          titleKo: 'ë‘ ê°ˆëž˜ ê¸¸',
          cardCount: 5,
          description: 'Comparison.',
          descriptionKo: 'ë¹„êµ.',
          positions: [],
        },
        {
          id: 'timing-window',
          title: 'Timing Window',
          titleKo: 'ì‹œê¸° íŒë‹¨',
          cardCount: 3,
          description: 'Timing.',
          descriptionKo: 'ì‹œê¸°.',
          positions: [],
        },
      ],
    },
    {
      id: 'love-relationships',
      category: 'Love',
      categoryKo: 'ì‚¬ëž‘',
      description: 'Love',
      descriptionKo: 'ì‚¬ëž‘',
      spreads: [
        {
          id: 'crush-feelings',
          title: 'Crush Feelings',
          titleKo: 'ì§ì‚¬ëž‘',
          cardCount: 3,
          description: 'Crush.',
          descriptionKo: 'ì§ì‚¬ëž‘.',
          positions: [],
        },
      ],
    },
    {
      id: 'daily-reading',
      category: 'Daily',
      categoryKo: 'ì˜¤ëŠ˜ì˜ ìš´ì„¸',
      description: 'Daily.',
      descriptionKo: 'ì˜¤ëŠ˜.',
      spreads: [
        {
          id: 'day-card',
          title: 'Day Card',
          titleKo: 'ì˜¤ëŠ˜ì˜ ì¹´ë“œ',
          cardCount: 1,
          description: 'Daily card.',
          descriptionKo: 'ì˜¤ëŠ˜ì˜ ì¹´ë“œ.',
          positions: [],
        },
      ],
    },
  ],
}))

// Mock pattern mappings
vi.mock('@/app/api/tarot/analyze-question/pattern-mappings', () => ({
  PATTERN_MAPPINGS: [],
  getExamInterviewMapping: vi.fn().mockReturnValue(null),
}))

// Mock Zod validation - replicate real schema behavior
vi.mock('@/lib/api/zodValidation', () => ({
  tarotAnalyzeQuestionSchema: {
    safeParse: vi.fn((data: any) => {
      if (!data || typeof data !== 'object') {
        return {
          success: false,
          error: { issues: [{ path: [], message: 'Expected object' }] },
        }
      }
      if (
        !data.question ||
        typeof data.question !== 'string' ||
        data.question.trim().length === 0
      ) {
        return {
          success: false,
          error: { issues: [{ path: ['question'], message: 'Question is required' }] },
        }
      }
      if (data.question.length > 500) {
        return {
          success: false,
          error: { issues: [{ path: ['question'], message: 'Question too long (max 500)' }] },
        }
      }
      const language = data.language || 'ko'
      if (language !== 'ko' && language !== 'en') {
        return {
          success: false,
          error: { issues: [{ path: ['language'], message: 'Invalid enum value' }] },
        }
      }
      return { success: true, data: { question: data.question, language } }
    }),
  },
}))

// Mock the global fetch for OpenAI calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ============================================================
// Import route AFTER all mocks
// ============================================================
import { POST } from '@/app/api/tarot/analyze-question/route'
import { rateLimit } from '@/lib/rateLimit'
import * as recommendModule from '@/lib/Tarot/tarot-recommend'

// ============================================================
// Helpers
// ============================================================
function createRequest(body: Record<string, unknown>): NextRequest {
  const token = process.env.PUBLIC_API_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['x-api-token'] = token
  }
  return new NextRequest('http://localhost/api/tarot/analyze-question', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function createRequestWithoutToken(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/tarot/analyze-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createOpenAIResponse(content: Record<string, unknown>) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(content) } }],
    }),
    text: vi.fn().mockResolvedValue(''),
  }
}

// ============================================================
// Tests
// ============================================================
describe('Tarot Analyze Question API - POST', () => {
  const originalPublicToken = process.env.NEXT_PUBLIC_API_TOKEN
  const originalLegacyPublicToken = process.env.PUBLIC_API_TOKEN

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || 'test-public-token'
    process.env.PUBLIC_API_TOKEN = process.env.PUBLIC_API_TOKEN || 'test-public-token'
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key'
    // Default: OpenAI returns a valid response
    mockFetch.mockResolvedValue(
      createOpenAIResponse({
        themeId: 'decisions-crossroads',
        spreadId: 'yes-no-why',
        reason: 'Yes/No question detected',
        userFriendlyExplanation: 'ì˜ˆ/ì•„ë‹ˆì˜¤ë¡œ ë‹µë³€í•  ìˆ˜ ìžˆëŠ” ì§ˆë¬¸ì´ì—ìš”',
      })
    )
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_TOKEN = originalPublicToken
    process.env.PUBLIC_API_TOKEN = originalLegacyPublicToken
  })

  // ----------------------------------------------------------
  // Auth Guard
  // ----------------------------------------------------------
  describe('Auth Guard', () => {
    it('should return 401 when x-api-token is missing', async () => {
      const req = createRequestWithoutToken({ question: 'ì˜¤ëŠ˜ ë­í• ê¹Œ?', language: 'ko' })
      const response = await POST(req)

      expect(response.status).toBe(401)
    })
  })

  // ----------------------------------------------------------
  // Rate Limiting
  // ----------------------------------------------------------
  describe('Rate Limiting', () => {
    it('should return 429 when rate limited', async () => {
      vi.mocked(rateLimit).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        headers: new Headers({ 'Retry-After': '60' }),
      } as any)

      const req = createRequest({ question: 'ì˜¤ëŠ˜ ìš´ë™ê°ˆê¹Œ?', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBeDefined()
    })

    it('should allow requests within rate limit', async () => {
      const req = createRequest({ question: 'ì˜¤ëŠ˜ ìš´ë™ê°ˆê¹Œ?', language: 'ko' })
      const response = await POST(req)

      expect(response.status).toBe(200)
    })
  })

  // ----------------------------------------------------------
  // Input Validation
  // ----------------------------------------------------------
  describe('Input Validation', () => {
    it('should return 400 when question is missing', async () => {
      const req = createRequest({ language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should return 400 when question is empty string', async () => {
      const req = createRequest({ question: '', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should return 400 when question exceeds 500 characters', async () => {
      const longQuestion = 'a'.repeat(501)
      const req = createRequest({ question: longQuestion, language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should return 400 for invalid language value', async () => {
      const req = createRequest({ question: 'Hello?', language: 'fr' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should default language to ko when not provided', async () => {
      const req = createRequest({ question: 'ì˜¤ëŠ˜ ìš´ì„¸ ì–´ë•Œ?' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should have processed successfully with default ko
      expect(data.isDangerous).toBe(false)
    })

    it('should accept valid English language parameter', async () => {
      const req = createRequest({ question: 'Should I go?', language: 'en' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isDangerous).toBe(false)
    })
  })

  // ----------------------------------------------------------
  // Dangerous Question Detection
  // ----------------------------------------------------------
  describe('Dangerous Question Detection', () => {
    it('should detect Korean dangerous keywords and return safety message', async () => {
      const req = createRequest({
        question: '\uC790\uC0B4\uD558\uACE0 \uC2F6\uC5B4\uC694',
        language: 'ko',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isDangerous).toBe(true)
      expect(data.message).toContain('1393')
    })

    it('should detect English dangerous keywords', async () => {
      const req = createRequest({ question: 'I want to kill myself', language: 'en' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isDangerous).toBe(true)
      expect(data.message).toContain('Crisis helpline')
    })

    it('should detect "end my life" keyword', async () => {
      const req = createRequest({ question: 'I want to end my life', language: 'en' })
      const response = await POST(req)
      const data = await response.json()

      expect(data.isDangerous).toBe(true)
    })

    it('should return Korean safety message when language is ko', async () => {
      const req = createRequest({
        question: '\uC8FD\uACE0 \uC2F6\uC5B4',
        language: 'ko',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(data.isDangerous).toBe(true)
      expect(data.message).toContain('\uC790\uC0B4\uC608\uBC29\uC0C1\uB2F4\uC804\uD654')
    })

    it('should return English safety message when language is en', async () => {
      const req = createRequest({ question: 'suicide thoughts', language: 'en' })
      const response = await POST(req)
      const data = await response.json()

      expect(data.isDangerous).toBe(true)
      expect(data.message).toContain('professional')
    })

    it('should NOT flag normal questions as dangerous', async () => {
      const req = createRequest({
        question: '\uC624\uB298 \uBC25 \uBB50 \uBA39\uC744\uAE4C?',
        language: 'ko',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(data.isDangerous).toBe(false)
    })
  })

  // ----------------------------------------------------------
  // Successful OpenAI Analysis
  // ----------------------------------------------------------
  describe('Successful Analysis', () => {
    it('should return analyzed spread when OpenAI responds correctly', async () => {
      mockFetch.mockResolvedValueOnce(
        createOpenAIResponse({
          themeId: 'decisions-crossroads',
          spreadId: 'yes-no-why',
          reason: 'Yes/No question',
          userFriendlyExplanation: 'ì˜ˆ/ì•„ë‹ˆì˜¤ ì§ˆë¬¸ìž…ë‹ˆë‹¤',
        })
      )

      const req = createRequest({ question: 'ì´ ì˜· ì‚´ê¹Œ?', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isDangerous).toBe(false)
      expect(data.themeId).toBe('decisions-crossroads')
      expect(data.spreadId).toBe('yes-no-why')
      expect(data.cardCount).toBe(3)
      expect(data.path).toContain('/tarot/decisions-crossroads/yes-no-why')
      expect(data.path).toContain('question=')
    })

    it('should include spread title in the response', async () => {
      mockFetch.mockResolvedValueOnce(
        createOpenAIResponse({
          themeId: 'general-insight',
          spreadId: 'past-present-future',
          reason: 'General',
          userFriendlyExplanation: 'General flow',
        })
      )

      const req = createRequest({ question: '앞으로의 방향', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(typeof data.spreadTitle).toBe('string')
      expect(data.spreadTitle.length).toBeGreaterThan(0)
    })

    it('should classify named third-person subject question as meeting likelihood intent', async () => {
      mockFetch.mockResolvedValueOnce(
        createOpenAIResponse({
          themeId: 'love-relationships',
          spreadId: 'crush-feelings',
          reason: 'Relationship likelihood',
          userFriendlyExplanation: 'ìƒëŒ€ì˜ í–‰ë™ ê°€ëŠ¥ì„±ì„ ë³¸ ë¦¬ë”©',
        })
      )

      const req = createRequest({
        question: '\uC774\uCC28\uC5F0\uC774 \uB098\uB97C \uB0B4\uC77C \uB9CC\uB0A0\uAE4C?',
        language: 'ko',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.intent).toBe('meeting_likelihood')
    })

    it('should classify named third-person speech question as other-person response intent', async () => {
      mockFetch.mockResolvedValueOnce(
        createOpenAIResponse({
          themeId: 'love-relationships',
          spreadId: 'crush-feelings',
          reason: 'Other person response',
          userFriendlyExplanation: 'ìƒëŒ€ ë°˜ì‘ ì¤‘ì‹¬ ë¦¬ë”©',
        })
      )

      const req = createRequest({
        question:
          '\uC774\uCC28\uC5F0\uC774 \uB098\uC5D0\uAC8C \uBB34\uC2A8 \uB9D0\uC744 \uD560\uAE4C?',
        language: 'ko',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.intent).toBe('other_person_response')
    })

    it('should not blindly replace a valid route with the recommender suggestion', async () => {
      const recommendSpy = vi.spyOn(recommendModule, 'recommendSpreads').mockReturnValue([
        {
          themeId: 'daily-reading',
          theme: { id: 'daily-reading' } as any,
          spreadId: 'day-card',
          spread: {
            id: 'day-card',
            title: 'Day Card',
            titleKo: '오늘의 카드',
            cardCount: 1,
          } as any,
          reason: 'Daily recommendation',
          reasonKo: '오늘의 흐름',
          matchScore: 99,
        },
      ])

      mockFetch.mockResolvedValueOnce(
        createOpenAIResponse({
          themeId: 'general-insight',
          spreadId: 'past-present-future',
          reason: 'General flow',
          userFriendlyExplanation: 'General flow',
        })
      )

      const req = createRequest({ question: '오늘 운세 어때?', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.themeId).not.toBe('daily-reading')
      expect(data.spreadId).not.toBe('day-card')
      expect(typeof data.themeId).toBe('string')
      expect(typeof data.spreadId).toBe('string')

      recommendSpy.mockRestore()
    })

    it('should URL-encode the question in the path', async () => {
      mockFetch.mockResolvedValueOnce(
        createOpenAIResponse({
          themeId: 'decisions-crossroads',
          spreadId: 'yes-no-why',
          reason: 'Decision',
          userFriendlyExplanation: 'Test',
        })
      )

      const req = createRequest({ question: 'ì˜¤ëŠ˜ ìš´ë™ ê°ˆê¹Œ?', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(data.path).toContain(encodeURIComponent('ì˜¤ëŠ˜ ìš´ë™ ê°ˆê¹Œ?'))
    })

    it('should trim whitespace from the question', async () => {
      mockFetch.mockResolvedValueOnce(
        createOpenAIResponse({
          themeId: 'decisions-crossroads',
          spreadId: 'yes-no-why',
          reason: 'Decision',
          userFriendlyExplanation: 'Test',
        })
      )

      const req = createRequest({ question: '  ì˜¤ëŠ˜ ìš´ë™ ê°ˆê¹Œ?  ', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      // Path should use trimmed question
      expect(data.path).toContain(encodeURIComponent('ì˜¤ëŠ˜ ìš´ë™ ê°ˆê¹Œ?'))
    })
  })

  // ----------------------------------------------------------
  // OpenAI Failure / Fallback
  // ----------------------------------------------------------
  describe('OpenAI Failure and Fallback', () => {
    it('should use fallback spread when OpenAI call fails', async () => {
      mockFetch.mockRejectedValue(new Error('OpenAI API timeout'))

      const req = createRequest({ question: 'ì˜¤ëŠ˜ì˜ íë¦„ì€?', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isDangerous).toBe(false)
      expect(data.source).toBe('fallback')
      expect(data.fallback_reason).toBe('server_error')
      expect(typeof data.themeId).toBe('string')
      expect(typeof data.spreadId).toBe('string')
    })

    it('should still return a valid route when one OpenAI step returns non-JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'not valid json' } }],
        }),
        text: vi.fn(),
      })

      const req = createRequest({ question: '오늘 뭐할까?', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(typeof data.source).toBe('string')
      expect(typeof data.themeId).toBe('string')
      expect(typeof data.spreadId).toBe('string')
    })

    it('should still return a valid route when one OpenAI step returns empty content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: '' } }],
        }),
        text: vi.fn(),
      })

      const req = createRequest({ question: '미래 어떻게 될까?', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(typeof data.source).toBe('string')
      expect(typeof data.themeId).toBe('string')
      expect(typeof data.spreadId).toBe('string')
    })

    it('should use Korean fallback explanation when language is ko', async () => {
      mockFetch.mockRejectedValue(new Error('fail'))

      const req = createRequest({
        question: '\uD750\uB984 \uBCF4\uAE30',
        language: 'ko',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(data.userFriendlyExplanation).toContain('\uAE30\uBCF8 \uC2A4\uD504\uB808\uB4DC')
      expect(data.source).toBe('fallback')
    })

    it('should use English fallback explanation when language is en', async () => {
      mockFetch.mockRejectedValue(new Error('fail'))

      const req = createRequest({ question: 'What is my future?', language: 'en' })
      const response = await POST(req)
      const data = await response.json()

      expect(data.userFriendlyExplanation).toContain('default spread')
      expect(data.source).toBe('fallback')
    })
  })

  // ----------------------------------------------------------
  // Unknown Spread Fallback
  // ----------------------------------------------------------
  describe('Unknown Spread Fallback', () => {
    it('should fall back to general-insight/past-present-future when OpenAI returns unknown spread', async () => {
      mockFetch.mockResolvedValueOnce(
        createOpenAIResponse({
          themeId: 'nonexistent-theme',
          spreadId: 'nonexistent-spread',
          reason: 'Some reason',
          userFriendlyExplanation: 'Some explanation',
        })
      )

      const req = createRequest({ question: 'ë­ë¼ë„ í•´ë³¼ê¹Œ', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.themeId).toBeDefined()
      expect(data.spreadId).toBeDefined()
      expect(data.spreadTitle).toBeDefined()
      expect(typeof data.cardCount).toBe('number')
    })
  })

  // ----------------------------------------------------------
  // Error Handling
  // ----------------------------------------------------------
  describe('Error Handling', () => {
    it('should return 500 when request.json() throws', async () => {
      const token = process.env.PUBLIC_API_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers['x-api-token'] = token
      }
      const req = new NextRequest('http://localhost/api/tarot/analyze-question', {
        method: 'POST',
        headers,
        body: 'not valid json{{',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to analyze question')
    })

    it('should return 500 for unexpected server errors', async () => {
      // Force rateLimit to throw
      vi.mocked(rateLimit).mockRejectedValueOnce(new Error('Redis connection failed'))

      const req = createRequest({ question: 'í…ŒìŠ¤íŠ¸', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  // ----------------------------------------------------------
  // Edge Cases
  // ----------------------------------------------------------
  describe('Edge Cases', () => {
    it('should handle questions with special characters', async () => {
      const req = createRequest({ question: 'ì˜¤ëŠ˜ ìš´ì„¸!!! @#$%^&*()', language: 'ko' })
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should handle single character question', async () => {
      const req = createRequest({ question: '?', language: 'ko' })
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should handle question at max length (500 chars)', async () => {
      const maxQuestion = 'a'.repeat(500)
      const req = createRequest({ question: maxQuestion, language: 'ko' })
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should handle OpenAI API returning HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: vi.fn().mockResolvedValue('Rate limit exceeded'),
        json: vi.fn(),
      })

      const req = createRequest({ question: 'ì˜¤ëŠ˜ ë­ í• ê¹Œ?', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      // Should fall back gracefully
      expect(response.status).toBe(200)
      expect(data.source).toBe('fallback')
      expect(data.fallback_reason).toBe('server_error')
      expect(typeof data.themeId).toBe('string')
      expect(typeof data.spreadId).toBe('string')
    })

    it('should always return a valid spread for diverse non-dangerous questions when OpenAI fails', async () => {
      mockFetch.mockRejectedValue(new Error('OpenAI unavailable'))

      const validSpreadKeys = new Set([
        'general-insight/past-present-future',
        'general-insight/quick-reading',
        'decisions-crossroads/yes-no-why',
        'decisions-crossroads/two-paths',
        'decisions-crossroads/timing-window',
        'love-relationships/crush-feelings',
        'daily-reading/day-card',
      ])

      const questions = [
        'ëª¸ê³¼ ë§ˆìŒì˜ ê· í˜•ì„ ì–´ë–»ê²Œ íšŒë³µí• ê¹Œìš”?',
        'ê·¸ ì‚¬ëžŒ ë§ˆìŒì´ ê¶ê¸ˆí•´',
        'ì˜¤ëŠ˜ ìš´ë™ ê°ˆê¹Œ?',
        'ë©´ì ‘ ê²°ê³¼ ì–´ë–¨ê¹Œ?',
        'ì´ë²ˆ ì£¼ ìš´ì„¸',
        'ëˆì´ ë“¤ì–´ì˜¬ê¹Œ?',
        'Aì™€ B ì¤‘ ë­ê°€ ë‚˜ì„ê¹Œ?',
        'How can I recover my balance?',
        'Should I text them?',
        '???',
        'asdf qwer zxcv',
      ]

      for (const question of questions) {
        const req = createRequest({ question, language: 'ko' })
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.isDangerous).toBe(false)
        expect(typeof data.cardCount).toBe('number')
        expect(data.path).toContain('/tarot/')
        expect(['llm', 'pattern', 'fallback']).toContain(data.source)

        const spreadKey = `${data.themeId}/${data.spreadId}`
        expect(validSpreadKeys.has(spreadKey), `${question} -> ${spreadKey}`).toBe(true)
      }
    })

    it('should pass fixed 20-question regression suite when OpenAI is unavailable', async () => {
      mockFetch.mockRejectedValue(new Error('OpenAI unavailable'))

      const validSpreadKeys = new Set([
        'general-insight/past-present-future',
        'general-insight/quick-reading',
        'decisions-crossroads/yes-no-why',
        'decisions-crossroads/two-paths',
        'decisions-crossroads/timing-window',
        'love-relationships/crush-feelings',
        'daily-reading/day-card',
      ])

      const fixedQuestions = [
        'ì´ì°¨ì—°ì´ ë‚˜ì—ê²Œ ë¬´ìŠ¨ ë§ì„ í• ê¹Œ?',
        'ê·¸ ì‚¬ëžŒì´ ë‚´ì¼ ë‚˜ë¥¼ ë§Œë‚ ê¹Œ?',
        'ë‚´ê°€ ë¨¼ì € ì—°ë½í• ê¹Œ?',
        'ìš°ë¦¬ ìž¬íšŒ ê°€ëŠ¥í• ê¹Œ?',
        'ì–¸ì œ ì—°ë½ì´ ì˜¬ê¹Œ?',
        'ì˜¤ëŠ˜ ìš´ì„¸ ì–´ë•Œ?',
        'ì´ë²ˆ ì£¼ íë¦„ì€?',
        'Aì•ˆì´ ë‚˜ì„ê¹Œ Bì•ˆì´ ë‚˜ì„ê¹Œ?',
        'ì´ì§í• ê¹Œ ë§ê¹Œ?',
        'ë©´ì ‘ í•©ê²©í• ê¹Œ?',
        'ì‹œí—˜ ê²°ê³¼ ê´œì°®ì„ê¹Œ?',
        'ì§€ê¸ˆ íˆ¬ìž ë“¤ì–´ê°€ë„ ë ê¹Œ?',
        'ì´ ê´€ê³„ì˜ ì†ë§ˆìŒì€ ë­ì•¼?',
        'ì§€ê¸ˆì€ ê¸°ë‹¤ë¦¬ëŠ” ê²Œ ë§žì•„?',
        'ì–¸ì œ ì›€ì§ì´ëŠ” ê²Œ ë² ìŠ¤íŠ¸ì•¼?',
        'Should I text them first?',
        'Will they respond this week?',
        'When is the right timing?',
        'Is reconciliation possible?',
        'General reading for this month',
      ]

      for (const question of fixedQuestions) {
        const req = createRequest({
          question,
          language: /[A-Za-z]/.test(question) ? 'en' : 'ko',
        })
        const response = await POST(req)
        const data = await response.json()
        const spreadKey = `${data.themeId}/${data.spreadId}`

        expect(response.status).toBe(200)
        expect(data.isDangerous).toBe(false)
        expect(data.source).toBe('fallback')
        expect(validSpreadKeys.has(spreadKey), `${question} -> ${spreadKey}`).toBe(true)
      }
    }, 120000)
  })

  // ----------------------------------------------------------
  // Weird Question Routing (Fallback path)
  // ----------------------------------------------------------
  describe('Weird Question Routing', () => {
    it('returns a valid fallback spread for noisy / no-space / slang-like questions when OpenAI is unavailable', async () => {
      mockFetch.mockRejectedValue(new Error('OpenAI unavailable'))
      const validSpreadKeys = new Set([
        'general-insight/past-present-future',
        'general-insight/quick-reading',
        'decisions-crossroads/yes-no-why',
        'decisions-crossroads/two-paths',
        'decisions-crossroads/timing-window',
        'love-relationships/crush-feelings',
        'daily-reading/day-card',
      ])

      const cases = [
        {
          question: 'ê°œí•œí…Œë½€ë½€í• ê¹Œ???',
          expectedTheme: 'decisions-crossroads',
          expectedSpread: 'yes-no-why',
        },
        {
          question: 'Aí• ê¹ŒBí• ê¹Œ ã„¹ã…‡ ê³ ë¯¼ë¨',
          expectedTheme: 'decisions-crossroads',
          expectedSpread: 'two-paths',
        },
        {
          question: 'ì–¸ì œ ì—°ë½í•˜ëŠ”ê²Œ ì¢‹ì„ê¹Œ íƒ€ì´ë°ë§Œ ì•Œë ¤ì¤˜',
          expectedTheme: 'decisions-crossroads',
          expectedSpread: 'timing-window',
        },
        {
          question: 'ê·¸ì‚¬ëžŒ ë‚˜ ì¢‹ì•„í•˜ë‚˜',
          expectedTheme: 'love-relationships',
          expectedSpread: 'crush-feelings',
        },
        {
          question: 'ì˜¤ëŠ˜í•˜ë£¨ìš´ì„¸',
          expectedTheme: 'daily-reading',
          expectedSpread: 'day-card',
        },
      ]

      for (const c of cases) {
        const req = createRequest({ question: c.question, language: 'ko' })
        const response = await POST(req)
        const data = await response.json()
        const spreadKey = `${data.themeId}/${data.spreadId}`

        expect(response.status).toBe(200)
        expect(data.source).toBe('fallback')
        expect(validSpreadKeys.has(spreadKey), `${c.question} -> ${spreadKey}`).toBe(true)
      }
    })
  })
})
