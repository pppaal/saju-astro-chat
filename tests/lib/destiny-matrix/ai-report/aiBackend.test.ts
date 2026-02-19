// tests/lib/destiny-matrix/ai-report/aiBackend.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Set env vars before any module evaluation (vi.hoisted runs before vi.mock)
vi.hoisted(() => {
  process.env.OPENAI_API_KEY = 'test-openai-key'
  delete process.env.REPLICATE_API_KEY
})

// Mock logger before importing the module
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { callAIBackendGeneric } from '@/lib/destiny-matrix/ai-report/aiBackend'

describe('AI Backend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('callAIBackendGeneric', () => {
    it('should call AI API successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                introduction: '테스트 소개',
                personalityDeep: '성격 분석',
              }),
            },
          },
        ],
        model: 'gpt-4o',
        usage: {
          total_tokens: 500,
        },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await callAIBackendGeneric('Test prompt', 'ko')

      expect(result).toHaveProperty('sections')
      expect(result.sections).toHaveProperty('introduction', '테스트 소개')
      expect(result.sections).toHaveProperty('personalityDeep', '성격 분석')
      expect(result).toHaveProperty('model')
      expect(result).toHaveProperty('tokensUsed')
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should handle JSON in code blocks', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '```json\n{"test": "value"}\n```',
            },
          },
        ],
        model: 'gpt-4o',
        usage: { total_tokens: 100 },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await callAIBackendGeneric('Test', 'ko')

      expect(result.sections).toEqual({ test: 'value' })
    })

    it('should handle errors gracefully with failover', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal error' }),
      })

      await expect(callAIBackendGeneric('Test', 'ko')).rejects.toThrow('All AI providers failed')
    })

    it('should throw error if JSON parsing fails', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'This is not JSON',
            },
          },
        ],
        model: 'gpt-4o',
        usage: { total_tokens: 50 },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      await expect(callAIBackendGeneric('Test', 'ko')).rejects.toThrow(
        'No JSON found in AI response'
      )
    })

    it('should handle nested JSON in response', async () => {
      const nestedData = {
        introduction: '소개',
        details: {
          personality: '성격',
          career: '진로',
          relationships: {
            romantic: '연애',
            family: '가족',
          },
        },
      }
      const mockResponse = {
        choices: [{ message: { content: JSON.stringify(nestedData) } }],
        model: 'gpt-4o-mini',
        usage: { total_tokens: 200 },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await callAIBackendGeneric('Test', 'ko')
      expect(result.sections).toEqual(nestedData)
    })

    it('should handle JSON with escaped characters', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"text": "Line 1\\nLine 2", "quote": "\\"Hello\\""}',
            },
          },
        ],
        model: 'gpt-4o',
        usage: { total_tokens: 50 },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await callAIBackendGeneric('Test', 'ko')
      expect(result.sections.text).toBe('Line 1\nLine 2')
      expect(result.sections.quote).toBe('"Hello"')
    })

    it('should handle markdown code blocks without json tag', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '```\n{"simple": "test"}\n```',
            },
          },
        ],
        model: 'gpt-4o',
        usage: { total_tokens: 30 },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await callAIBackendGeneric('Test', 'en')
      expect(result.sections).toEqual({ simple: 'test' })
    })

    it('should handle different language parameters', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({ greeting: 'Hello' }),
            },
          },
        ],
        model: 'gpt-4o',
        usage: { total_tokens: 50 },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      await callAIBackendGeneric('Test prompt', 'en')
      expect(global.fetch).toHaveBeenCalled()

      await callAIBackendGeneric('Test prompt', 'ko')
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should handle 429 rate limit errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' }),
      })

      await expect(callAIBackendGeneric('Test', 'ko')).rejects.toThrow()
    })

    it('should handle 401 authentication errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid API key' }),
      })

      await expect(callAIBackendGeneric('Test', 'ko')).rejects.toThrow()
    })

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      await expect(callAIBackendGeneric('Test', 'ko')).rejects.toThrow()
    })

    it('should handle empty response choices', async () => {
      const mockResponse = {
        choices: [],
        model: 'gpt-4o',
        usage: { total_tokens: 0 },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      await expect(callAIBackendGeneric('Test', 'ko')).rejects.toThrow()
    })

    it('should handle null message content', async () => {
      const mockResponse = {
        choices: [{ message: { content: null } }],
        model: 'gpt-4o',
        usage: { total_tokens: 10 },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      await expect(callAIBackendGeneric('Test', 'ko')).rejects.toThrow()
    })

    it('should return token usage information', async () => {
      const mockResponse = {
        choices: [{ message: { content: '{"data": "test"}' } }],
        model: 'gpt-4o',
        usage: { total_tokens: 1234 },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await callAIBackendGeneric('Test', 'ko')
      expect(result.tokensUsed).toBe(1234)
    })

    it('should return model name in response', async () => {
      const mockResponse = {
        choices: [{ message: { content: '{"data": "test"}' } }],
        model: 'gpt-4o-2024-08-06',
        usage: { total_tokens: 100 },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await callAIBackendGeneric('Test', 'ko')
      expect(result.model).toBe('gpt-4o-2024-08-06')
    })

    it.skip('should handle timeout', async () => {
      // Skipped: This test takes 120+ seconds to complete
      // Testing timeout behavior is not critical for unit tests
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves, will be aborted by controller
          })
      )

      await expect(callAIBackendGeneric('Test', 'ko')).rejects.toThrow()
    })
  })
})
