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
      categoryKo: '전반 운세',
      description: 'General insight',
      descriptionKo: '전반 운세',
      spreads: [
        {
          id: 'past-present-future',
          title: 'Past, Present, Future',
          titleKo: '과거, 현재, 미래',
          cardCount: 3,
          description: 'Past present future flow.',
          descriptionKo: '과거 현재 미래 흐름.',
          positions: [],
        },
        {
          id: 'quick-reading',
          title: 'Quick Reading',
          titleKo: '빠른 리딩',
          cardCount: 1,
          description: 'Quick reading.',
          descriptionKo: '빠른 리딩.',
          positions: [],
        },
      ],
    },
    {
      id: 'decisions-crossroads',
      category: 'Decisions & Crossroads',
      categoryKo: '결정과 선택',
      description: 'Decisions',
      descriptionKo: '결정',
      spreads: [
        {
          id: 'yes-no-why',
          title: 'Yes / No / Why',
          titleKo: '예 / 아니오 / 이유',
          cardCount: 3,
          description: 'Yes or No.',
          descriptionKo: '예 아니오.',
          positions: [],
        },
        {
          id: 'two-paths',
          title: 'Two Paths',
          titleKo: '두 갈래 길',
          cardCount: 5,
          description: 'Comparison.',
          descriptionKo: '비교.',
          positions: [],
        },
        {
          id: 'timing-window',
          title: 'Timing Window',
          titleKo: '시기 판단',
          cardCount: 3,
          description: 'Timing.',
          descriptionKo: '시기.',
          positions: [],
        },
      ],
    },
    {
      id: 'love-relationships',
      category: 'Love',
      categoryKo: '사랑',
      description: 'Love',
      descriptionKo: '사랑',
      spreads: [
        {
          id: 'crush-feelings',
          title: 'Crush Feelings',
          titleKo: '짝사랑',
          cardCount: 3,
          description: 'Crush.',
          descriptionKo: '짝사랑.',
          positions: [],
        },
      ],
    },
    {
      id: 'daily-reading',
      category: 'Daily',
      categoryKo: '오늘의 운세',
      description: 'Daily.',
      descriptionKo: '오늘.',
      spreads: [
        {
          id: 'day-card',
          title: 'Day Card',
          titleKo: '오늘의 카드',
          cardCount: 1,
          description: 'Daily card.',
          descriptionKo: '오늘의 카드.',
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
        userFriendlyExplanation: '예/아니오로 답변할 수 있는 질문이에요',
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
      const req = createRequestWithoutToken({ question: '오늘 뭐할까?', language: 'ko' })
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

      const req = createRequest({ question: '오늘 운동갈까?', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBeDefined()
    })

    it('should allow requests within rate limit', async () => {
      const req = createRequest({ question: '오늘 운동갈까?', language: 'ko' })
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
      const req = createRequest({ question: '오늘 운세 어때?' })
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
      const req = createRequest({ question: '자살하고 싶어요', language: 'ko' })
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
      const req = createRequest({ question: '죽고 싶어', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(data.isDangerous).toBe(true)
      expect(data.message).toContain('자살예방상담전화')
    })

    it('should return English safety message when language is en', async () => {
      const req = createRequest({ question: 'suicide thoughts', language: 'en' })
      const response = await POST(req)
      const data = await response.json()

      expect(data.isDangerous).toBe(true)
      expect(data.message).toContain('professional')
    })

    it('should NOT flag normal questions as dangerous', async () => {
      const req = createRequest({ question: '오늘 밥 뭐 먹을까?', language: 'ko' })
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
          userFriendlyExplanation: '예/아니오 질문입니다',
        })
      )

      const req = createRequest({ question: '이 옷 살까?', language: 'ko' })
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

      expect(data.spreadTitle).toBe('과거, 현재, 미래')
    })

    it('should revalidate LLM result with recommender when intent mismatch is detected', async () => {
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
      expect(data.themeId).toBe('daily-reading')
      expect(data.spreadId).toBe('day-card')

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

      const req = createRequest({ question: '오늘 운동 갈까?', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(data.path).toContain(encodeURIComponent('오늘 운동 갈까?'))
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

      const req = createRequest({ question: '  오늘 운동 갈까?  ', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      // Path should use trimmed question
      expect(data.path).toContain(encodeURIComponent('오늘 운동 갈까?'))
    })
  })

  // ----------------------------------------------------------
  // OpenAI Failure / Fallback
  // ----------------------------------------------------------
  describe('OpenAI Failure and Fallback', () => {
    it('should use fallback spread when OpenAI call fails', async () => {
      mockFetch.mockRejectedValue(new Error('OpenAI API timeout'))

      const req = createRequest({ question: '오늘의 흐름은?', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isDangerous).toBe(false)
      expect(data.source).toBe('fallback')
      expect(data.fallback_reason).toBe('server_error')
      expect(typeof data.themeId).toBe('string')
      expect(typeof data.spreadId).toBe('string')
    })

    it('should use fallback when OpenAI returns non-JSON', async () => {
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
      expect(data.source).toBe('fallback')
      expect(data.fallback_reason).toBe('parse_failed')
      expect(typeof data.themeId).toBe('string')
      expect(typeof data.spreadId).toBe('string')
    })

    it('should use fallback when OpenAI returns empty content', async () => {
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
      expect(data.source).toBe('fallback')
      expect(data.fallback_reason).toBe('no_candidate')
      expect(typeof data.themeId).toBe('string')
      expect(typeof data.spreadId).toBe('string')
    })

    it('should use Korean fallback explanation when language is ko', async () => {
      mockFetch.mockRejectedValue(new Error('fail'))

      const req = createRequest({ question: '흐름 보기', language: 'ko' })
      const response = await POST(req)
      const data = await response.json()

      expect(data.userFriendlyExplanation).toContain('기본 스프레드')
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

      const req = createRequest({ question: '뭐라도 해볼까', language: 'ko' })
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

      const req = createRequest({ question: '테스트', language: 'ko' })
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
      const req = createRequest({ question: '오늘 운세!!! @#$%^&*()', language: 'ko' })
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

      const req = createRequest({ question: '오늘 뭐 할까?', language: 'ko' })
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
        '몸과 마음의 균형을 어떻게 회복할까요?',
        '그 사람 마음이 궁금해',
        '오늘 운동 갈까?',
        '면접 결과 어떨까?',
        '이번 주 운세',
        '돈이 들어올까?',
        'A와 B 중 뭐가 나을까?',
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
  })
})
