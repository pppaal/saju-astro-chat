// tests/lib/destiny-matrix/ai-report/aiBackend.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callAIBackendGeneric } from '@/lib/destiny-matrix/ai-report/aiBackend'

describe('AI Backend', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    // Set only OpenAI key to avoid Together.xyz being preferred
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-key-123', TOGETHER_API_KEY: undefined, REPLICATE_API_KEY: undefined }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('callAIBackendGeneric', () => {
    it('should call OpenAI API directly', async () => {
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
      expect(result).toHaveProperty('model', 'gpt-4o')
      expect(result).toHaveProperty('tokensUsed', 500)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: expect.stringContaining('Bearer'),
          }),
        })
      )
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

    it('should handle errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal error' }),
      })

      await expect(callAIBackendGeneric('Test', 'ko')).rejects.toThrow('openai API error: 500')
    })

    it('should return empty object if JSON parsing fails', async () => {
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

      const result = await callAIBackendGeneric('Test', 'ko')

      expect(result.sections).toEqual({})
    })

    it('should handle timeout', async () => {
      global.fetch = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 200000)))

      await expect(callAIBackendGeneric('Test', 'ko')).rejects.toThrow()
    }, 125000)
  })
})
