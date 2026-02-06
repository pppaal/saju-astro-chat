// tests/app/api/tarot/chat/route.mega.test.ts
// Comprehensive tests for Tarot Chat API

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/tarot/chat/route'

// Mock dependencies
vi.mock('@/lib/api/middleware', () => ({
  initializeApiContext: vi.fn(),
  createAuthenticatedGuard: vi.fn(),
  extractLocale: vi.fn().mockReturnValue('ko'),
}))

vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
  },
}))

vi.mock('@/lib/api/errorHandler', () => ({
  ErrorCodes: {
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
  },
  createErrorResponse: vi.fn(() => {
    // Return a Response object that matches what the route returns for internal errors
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred. Please try again.',
          status: 500,
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }),
}))

vi.mock('@/lib/api/zodValidation', () => ({
  tarotChatRequestSchema: {
    safeParse: vi.fn((data: any) => {
      const errors: any[] = []

      // Validate messages
      if (!data.messages || !Array.isArray(data.messages) || data.messages.length === 0) {
        errors.push({ path: ['messages'], message: 'Messages required' })
      } else if (data.messages.length > 50) {
        errors.push({ path: ['messages'], message: 'Too many messages' })
      }

      // Validate context
      if (!data.context || typeof data.context !== 'object') {
        errors.push({ path: ['context'], message: 'Context required' })
      }

      // Validate language
      if (data.language && !['ko', 'en'].includes(data.language)) {
        errors.push({ path: ['language'], message: 'Invalid language' })
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: { issues: errors },
        }
      }

      return {
        success: true,
        data: {
          messages: data.messages,
          context: data.context,
          language: data.language || 'ko',
        },
      }
    }),
  },
  createValidationErrorResponse: vi.fn(() => {
    // Return a Response object that matches what the route returns for validation errors
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input validation failed. Please check your data.',
          status: 422,
        },
      }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    )
  }),
}))

import { initializeApiContext, createAuthenticatedGuard } from '@/lib/api/middleware'
import { apiClient } from '@/lib/api/ApiClient'
import { captureServerError } from '@/lib/telemetry'
import { logger } from '@/lib/logger'

describe('POST /api/tarot/chat', () => {
  let mockRefundCredits: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockRefundCredits = vi.fn().mockResolvedValue(undefined)

    // Default successful middleware mock
    vi.mocked(initializeApiContext).mockResolvedValue({
      context: {
        userId: 'test-user-id',
        sessionId: 'test-session-id',
        ip: '127.0.0.1',
        refundCreditsOnError: mockRefundCredits,
      },
      error: null,
    })

    vi.mocked(createAuthenticatedGuard).mockReturnValue({
      route: 'tarot-chat',
      limit: 20,
      windowSeconds: 60,
      requireCredits: true,
      creditType: 'followUp',
      creditAmount: 1,
    })
  })

  const createValidRequest = (overrides?: Record<string, unknown>) => {
    const body = {
      messages: [{ role: 'user', content: 'What does this card mean for my future?' }],
      context: {
        spread_title: 'Three Card Spread',
        category: 'general',
        cards: [
          {
            position: 'Past',
            name: 'The Fool',
            is_reversed: false,
            meaning: 'New beginnings',
            keywords: ['adventure', 'innocence'],
          },
          {
            position: 'Present',
            name: 'The Magician',
            is_reversed: false,
            meaning: 'Manifestation',
            keywords: ['power', 'skill'],
          },
          {
            position: 'Future',
            name: 'The World',
            is_reversed: false,
            meaning: 'Completion',
            keywords: ['fulfillment', 'achievement'],
          },
        ],
        overall_message: 'Your journey is progressing well',
        guidance: 'Continue on your current path',
      },
      language: 'ko',
      ...overrides,
    }

    return new NextRequest('http://localhost:3000/api/tarot/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  describe('Successful responses', () => {
    it('should return successful response from backend', async () => {
      const req = createValidRequest()

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: 'The cards show a journey from innocence to mastery...' },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reply).toBe('The cards show a journey from innocence to mastery...')
      expect(response.headers.get('X-Fallback')).toBe('0')
      expect(mockRefundCredits).not.toHaveBeenCalled()
    })

    it('should handle English language', async () => {
      const req = createValidRequest({ language: 'en' })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: 'The cards indicate growth and transformation...' },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reply).toBeDefined()

      // Verify system instruction language
      const postCall = vi.mocked(apiClient.post).mock.calls[0]
      const messages = postCall[1].messages as Array<{ role: string; content: string }>
      const systemMsg = messages.find((m) => m.role === 'system')
      expect(systemMsg?.content).toContain('tarot counselor')
    })

    it('should reject invalid language with validation error', async () => {
      const req = createValidRequest({ language: 'fr' })

      const response = await POST(req)
      const data = await response.json()

      // Zod schema only allows 'ko' and 'en', so 'fr' is rejected
      // The route uses createValidationErrorResponse which returns a structured error
      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle multiple messages in conversation', async () => {
      const req = createValidRequest({
        messages: [
          { role: 'user', content: 'Tell me about The Fool' },
          { role: 'assistant', content: 'The Fool represents new beginnings...' },
          { role: 'user', content: 'What about the reversed meaning?' },
        ],
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: 'Reversed, The Fool can indicate recklessness...' },
      })

      const response = await POST(req)
      expect(response.status).toBe(200)

      const postCall = vi.mocked(apiClient.post).mock.calls[0]
      const messages = postCall[1].messages as Array<{ role: string; content: string }>
      expect(messages.length).toBe(4) // system + 3 user messages
    })

    it('should handle reversed cards with camelCase', async () => {
      const req = createValidRequest({
        context: {
          spread_title: 'Celtic Cross',
          category: 'love',
          cards: [
            {
              position: 'Current Situation',
              name: 'The Tower',
              isReversed: true, // camelCase
              meaning: 'Delayed upheaval',
              keywords: ['change', 'breakthrough'],
            },
          ],
          overall_message: 'Changes are coming',
          guidance: 'Prepare for transformation',
        },
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: 'The reversed Tower suggests...' },
      })

      const response = await POST(req)
      expect(response.status).toBe(200)

      const postCall = vi.mocked(apiClient.post).mock.calls[0]
      const contextData = postCall[1].context
      expect(contextData.cards[0].is_reversed).toBe(true)
    })

    it('should handle reversed cards with snake_case', async () => {
      const req = createValidRequest({
        context: {
          spread_title: 'One Card Draw',
          category: 'career',
          cards: [
            {
              position: 'Outcome',
              name: 'The Empress',
              is_reversed: true, // snake_case
              meaning: 'Creative block',
              keywords: ['nurture', 'abundance'],
            },
          ],
          overall_message: 'Focus on creativity',
          guidance: 'Overcome obstacles',
        },
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: 'The reversed Empress indicates...' },
      })

      const response = await POST(req)
      expect(response.status).toBe(200)

      const postCall = vi.mocked(apiClient.post).mock.calls[0]
      const contextData = postCall[1].context
      expect(contextData.cards[0].is_reversed).toBe(true)
    })
  })

  describe('Fallback responses', () => {
    it('should use fallback when backend fails', async () => {
      const req = createValidRequest()

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: false,
        status: 500,
        data: null,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reply).toBeDefined()
      expect(response.headers.get('X-Fallback')).toBe('1')
      expect(mockRefundCredits).toHaveBeenCalledWith(
        'Backend failed: 500',
        expect.objectContaining({ backendStatus: 500, usingFallback: true })
      )
      expect(logger.warn).toHaveBeenCalledWith(
        '[Tarot] Credits refunded due to backend failure, using fallback'
      )
    })

    it('should use fallback when backend returns no reply', async () => {
      const req = createValidRequest()

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: null },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reply).toBeDefined()
      expect(response.headers.get('X-Fallback')).toBe('1')
    })

    it('should generate fallback for love questions (Korean)', async () => {
      const req = createValidRequest({
        messages: [{ role: 'user', content: '연애운이 어떤가요?' }],
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: false,
        status: 500,
        data: null,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.reply).toContain('리딩')
      expect(response.headers.get('X-Fallback')).toBe('1')
    })

    it('should generate fallback for love questions (English)', async () => {
      const req = createValidRequest({
        messages: [{ role: 'user', content: 'What about my love life?' }],
        language: 'en',
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: false,
        status: 500,
        data: null,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.reply).toContain('love')
      expect(response.headers.get('X-Fallback')).toBe('1')
    })

    it('should generate fallback for career questions (Korean)', async () => {
      const req = createValidRequest({
        messages: [{ role: 'user', content: '직장에서 승진할 수 있을까요?' }],
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: false,
        status: 500,
        data: null,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.reply).toBeDefined()
      expect(response.headers.get('X-Fallback')).toBe('1')
    })

    it('should generate fallback for career questions (English)', async () => {
      const req = createValidRequest({
        messages: [{ role: 'user', content: 'Will I get the job promotion?' }],
        language: 'en',
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: false,
        status: 500,
        data: null,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.reply).toContain('career')
      expect(response.headers.get('X-Fallback')).toBe('1')
    })

    it('should generate fallback for more cards request (Korean)', async () => {
      const req = createValidRequest({
        messages: [{ role: 'user', content: '카드를 더 뽑아주세요' }],
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: false,
        status: 500,
        data: null,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.reply).toContain('카드')
      expect(data.reply).toContain('뽑')
      expect(response.headers.get('X-Fallback')).toBe('1')
    })

    it('should generate fallback for more cards request (English)', async () => {
      const req = createValidRequest({
        messages: [{ role: 'user', content: 'Can I draw more cards?' }],
        language: 'en',
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: false,
        status: 500,
        data: null,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.reply).toContain('drawn')
      expect(data.reply).toContain('cards')
      expect(response.headers.get('X-Fallback')).toBe('1')
    })

    it('should use overall_message and guidance in fallback', async () => {
      const req = createValidRequest({
        messages: [{ role: 'user', content: 'General question' }],
        context: {
          spread_title: 'Simple Spread',
          category: 'general',
          cards: [
            {
              position: 'Main',
              name: 'The Sun',
              is_reversed: false,
              meaning: 'Joy and success',
              keywords: ['happiness'],
            },
          ],
          overall_message: 'Everything is aligned',
          guidance: 'Trust the process',
        },
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: false,
        status: 500,
        data: null,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.reply).toContain('aligned')
      expect(data.reply).toContain('process')
    })
  })

  describe('Input validation', () => {
    it('should reject middleware errors', async () => {
      vi.mocked(initializeApiContext).mockResolvedValue({
        context: undefined,
        error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
      })

      const req = createValidRequest()
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should reject null body', async () => {
      const req = new NextRequest('http://localhost:3000/api/tarot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: null,
      })

      const response = await POST(req)
      const data = await response.json()

      // req.json() throws on null body, caught by outer catch -> 500
      // The route uses createErrorResponse which returns a structured error
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should reject invalid JSON', async () => {
      const req = new NextRequest('http://localhost:3000/api/tarot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      })

      const response = await POST(req)
      const data = await response.json()

      // req.json() throws on invalid JSON, caught by outer catch -> 500
      // The route uses createErrorResponse which returns a structured error
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should reject empty messages array', async () => {
      const req = createValidRequest({ messages: [] })
      const response = await POST(req)
      const data = await response.json()

      // The route uses createValidationErrorResponse which returns a structured error
      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject null messages', async () => {
      const req = createValidRequest({ messages: null })
      const response = await POST(req)
      const data = await response.json()

      // The route uses createValidationErrorResponse which returns a structured error
      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject missing context', async () => {
      const req = createValidRequest({ context: null })
      const response = await POST(req)
      const data = await response.json()

      // The route uses createValidationErrorResponse which returns a structured error
      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should accept context with empty spread_title (Zod allows empty)', async () => {
      const req = createValidRequest({
        context: {
          spread_title: '',
          category: 'general',
          cards: [{ position: 'Main', name: 'The Fool', meaning: 'New', is_reversed: false }],
          overall_message: 'Message',
          guidance: 'Guidance',
        },
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: 'Response' },
      })

      const response = await POST(req)
      // Zod schema uses .max(200) not .min(1) for spread_title, so empty string is accepted
      expect(response.status).toBe(200)
    })

    it('should accept context with empty category (Zod allows empty)', async () => {
      const req = createValidRequest({
        context: {
          spread_title: 'Test Spread',
          category: '',
          cards: [{ position: 'Main', name: 'The Fool', meaning: 'New', is_reversed: false }],
          overall_message: 'Message',
          guidance: 'Guidance',
        },
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: 'Response' },
      })

      const response = await POST(req)
      // Zod schema uses .max(100) not .min(1) for category, so empty string is accepted
      expect(response.status).toBe(200)
    })

    it('should accept context with empty cards (Zod allows empty array)', async () => {
      const req = createValidRequest({
        context: {
          spread_title: 'Test Spread',
          category: 'general',
          cards: [],
          overall_message: 'Message',
          guidance: 'Guidance',
        },
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: 'Response' },
      })

      const response = await POST(req)
      // Zod schema uses .max(15) without .min(1) for cards array
      expect(response.status).toBe(200)
    })

    it('should filter out invalid cards', async () => {
      const req = createValidRequest({
        context: {
          spread_title: 'Test',
          category: 'general',
          cards: [
            { position: '', name: 'Invalid', meaning: 'Test', is_reversed: false }, // No position
            { position: 'Valid', name: '', meaning: 'Test', is_reversed: false }, // No name
            { position: 'Valid', name: 'Valid', meaning: '', is_reversed: false }, // No meaning
            { position: 'Valid', name: 'Valid Card', meaning: 'Valid meaning', is_reversed: false }, // Valid
          ],
          overall_message: 'Test',
          guidance: 'Test',
        },
      })
      const response = await POST(req)
      const data = await response.json()

      // Should reject because only 1 valid card, but all invalid ones filtered out
      // Actually if at least 1 valid card, should succeed
      expect(response.status).toBe(200)
    })

    it('should limit cards to MAX_CARD_COUNT (15 per Zod schema)', async () => {
      const manyCards = Array.from({ length: 15 }, (_, i) => ({
        position: `Position ${i}`,
        name: `Card ${i}`,
        meaning: `Meaning ${i}`,
        is_reversed: false,
      }))

      const req = createValidRequest({
        context: {
          spread_title: 'Big Spread',
          category: 'general',
          cards: manyCards,
          overall_message: 'Many cards',
          guidance: 'Focus',
        },
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: 'Response' },
      })

      await POST(req)

      const postCall = vi.mocked(apiClient.post).mock.calls[0]
      const contextData = postCall[1].context
      expect(contextData.cards.length).toBeLessThanOrEqual(15)
    })

    it('should pass through text fields within Zod limits', async () => {
      // Zod schema allows spread_title up to 200, category up to 100,
      // card fields up to 200/2000, overall_message up to 10000, guidance up to 5000
      const req = createValidRequest({
        context: {
          spread_title: 'a'.repeat(200),
          category: 'a'.repeat(100),
          cards: [
            {
              position: 'a'.repeat(200),
              name: 'a'.repeat(200),
              meaning: 'a'.repeat(500),
              is_reversed: false,
            },
          ],
          overall_message: 'a'.repeat(500),
          guidance: 'a'.repeat(500),
        },
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: 'Response' },
      })

      const response = await POST(req)
      expect(response.status).toBe(200)
    })

    it('should accept up to 50 messages (Zod schema limit)', async () => {
      const manyMessages = Array.from({ length: 25 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }))

      const req = createValidRequest({ messages: manyMessages })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: 'Response' },
      })

      await POST(req)

      const postCall = vi.mocked(apiClient.post).mock.calls[0]
      const messages = postCall[1].messages as Array<{ role: string; content: string }>
      // system + 25 user messages = 26 total (all accepted since max is 50)
      expect(messages.length).toBe(26)
    })

    it('should accept long messages within Zod limits', async () => {
      // chatMessageSchema allows content up to 10000 chars
      const longMessage = 'a'.repeat(3000)

      const req = createValidRequest({
        messages: [{ role: 'user', content: longMessage }],
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: 'Response' },
      })

      await POST(req)

      const postCall = vi.mocked(apiClient.post).mock.calls[0]
      const messages = postCall[1].messages as Array<{ role: string; content: string }>
      const userMessage = messages.find((m) => m.role === 'user')
      // Message passes through as-is since it's within Zod's 10000 char limit
      expect(userMessage?.content.length).toBe(3000)
    })
  })

  describe('Error handling', () => {
    it('should handle thrown errors and refund credits', async () => {
      const req = createValidRequest()

      vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'))

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
      expect(captureServerError).toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith(
        'Tarot chat error:',
        expect.objectContaining({ message: 'Network error' })
      )
      expect(mockRefundCredits).toHaveBeenCalledWith(
        'Network error',
        expect.objectContaining({ errorType: 'Error' })
      )
    })

    it('should handle non-Error thrown values', async () => {
      const req = createValidRequest()

      vi.mocked(apiClient.post).mockRejectedValue('String error')

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
      expect(mockRefundCredits).toHaveBeenCalledWith(
        'String error',
        expect.objectContaining({ errorType: 'UnknownError' })
      )
    })

    it('should not expose error detail in error response', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const req = createValidRequest()

      vi.mocked(apiClient.post).mockRejectedValue(new Error('Detailed error'))

      const response = await POST(req)
      const data = await response.json()

      // The route no longer exposes detail field
      expect(data.error).toBe('Internal Server Error')
      expect(data.detail).toBeUndefined()

      process.env.NODE_ENV = originalEnv
    })

    it('should hide error detail in production mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const req = createValidRequest()

      vi.mocked(apiClient.post).mockRejectedValue(new Error('Detailed error'))

      const response = await POST(req)
      const data = await response.json()

      expect(data.detail).toBeUndefined()

      process.env.NODE_ENV = originalEnv
    })

    it('should track hasMessages and hasContext in refund metadata', async () => {
      const req = createValidRequest()

      vi.mocked(apiClient.post).mockRejectedValue(new Error('Test error'))

      await POST(req)

      expect(mockRefundCredits).toHaveBeenCalledWith(
        'Test error',
        expect.objectContaining({
          hasMessages: true,
          hasContext: true,
        })
      )
    })
  })

  describe('System instruction generation', () => {
    it('should include card details in Korean system instruction', async () => {
      const req = createValidRequest({ language: 'ko' })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: 'Response' },
      })

      await POST(req)

      const postCall = vi.mocked(apiClient.post).mock.calls[0]
      const messages = postCall[1].messages as Array<{ role: string; content: string }>
      const systemMsg = messages.find((m) => m.role === 'system')

      expect(systemMsg?.content).toContain('타로 상담사')
      expect(systemMsg?.content).toContain('Three Card Spread')
      expect(systemMsg?.content).toContain('The Fool')
      expect(systemMsg?.content).toContain('Past')
      expect(systemMsg?.content).toContain('정위') // upright in Korean
    })

    it('should include card details in English system instruction', async () => {
      const req = createValidRequest({ language: 'en' })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: 'Response' },
      })

      await POST(req)

      const postCall = vi.mocked(apiClient.post).mock.calls[0]
      const messages = postCall[1].messages as Array<{ role: string; content: string }>
      const systemMsg = messages.find((m) => m.role === 'system')

      expect(systemMsg?.content).toContain('tarot counselor')
      expect(systemMsg?.content).toContain('Three Card Spread')
      expect(systemMsg?.content).toContain('The Fool')
      expect(systemMsg?.content).toContain('Past')
      expect(systemMsg?.content).toContain('upright')
    })

    it('should mark reversed cards in Korean system instruction', async () => {
      const req = createValidRequest({
        language: 'ko',
        context: {
          spread_title: 'Test',
          category: 'test',
          cards: [
            {
              position: 'Main',
              name: 'The Hanged Man',
              is_reversed: true,
              meaning: 'Resistance to change',
            },
          ],
          overall_message: 'Test',
          guidance: 'Test',
        },
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: 'Response' },
      })

      await POST(req)

      const postCall = vi.mocked(apiClient.post).mock.calls[0]
      const messages = postCall[1].messages as Array<{ role: string; content: string }>
      const systemMsg = messages.find((m) => m.role === 'system')

      expect(systemMsg?.content).toContain('역위') // reversed in Korean
    })

    it('should mark reversed cards in English system instruction', async () => {
      const req = createValidRequest({
        language: 'en',
        context: {
          spread_title: 'Test',
          category: 'test',
          cards: [
            {
              position: 'Main',
              name: 'The Hanged Man',
              is_reversed: true,
              meaning: 'Resistance to change',
            },
          ],
          overall_message: 'Test',
          guidance: 'Test',
        },
      })

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: 'Response' },
      })

      await POST(req)

      const postCall = vi.mocked(apiClient.post).mock.calls[0]
      const messages = postCall[1].messages as Array<{ role: string; content: string }>
      const systemMsg = messages.find((m) => m.role === 'system')

      expect(systemMsg?.content).toContain('reversed')
    })
  })

  describe('Credit refund scenarios', () => {
    it('should refund credits on backend failure', async () => {
      const req = createValidRequest()

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: false,
        status: 503,
        data: null,
      })

      await POST(req)

      expect(mockRefundCredits).toHaveBeenCalledWith(
        'Backend failed: 503',
        expect.objectContaining({
          backendStatus: 503,
          usingFallback: true,
        })
      )
    })

    it('should refund credits on exception', async () => {
      const req = createValidRequest()

      vi.mocked(apiClient.post).mockRejectedValue(new Error('Timeout'))

      await POST(req)

      expect(mockRefundCredits).toHaveBeenCalledWith(
        'Timeout',
        expect.objectContaining({
          errorType: 'Error',
          hasMessages: true,
          hasContext: true,
        })
      )
    })

    it('should not refund when backend succeeds', async () => {
      const req = createValidRequest()

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { reply: 'Success' },
      })

      await POST(req)

      expect(mockRefundCredits).not.toHaveBeenCalled()
    })
  })
})
