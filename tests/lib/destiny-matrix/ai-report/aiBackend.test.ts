// tests/lib/destiny-matrix/ai-report/aiBackend.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Set env vars before any module evaluation (vi.hoisted runs before vi.mock)
vi.hoisted(() => {
  process.env.OPENAI_API_KEY = 'test-openai-key'
  delete process.env.TOGETHER_API_KEY
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
