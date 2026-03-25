import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/http', () => ({
  fetchWithRetry: vi.fn(),
}))

import { analyzeTarotQuestionV2 } from '@/lib/Tarot/questionEngineV2'
import { fetchWithRetry } from '@/lib/http'
import { questionEngineGoldenCases } from './data/questionEngineGoldenCases'

describe('question engine golden set', () => {
  const mockFetchWithRetry = vi.mocked(fetchWithRetry)

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-openai-key'
    mockFetchWithRetry.mockRejectedValue(new Error('OpenAI timeout'))
  })

  it('keeps deterministic routing stable for key user questions when the LLM is unavailable', async () => {
    for (const item of questionEngineGoldenCases) {
      const result = await analyzeTarotQuestionV2({
        question: item.question,
        language: 'ko',
      })

      expect(result.source, `${item.id} source`).toBe('heuristic')
      expect(result.fallback_reason, `${item.id} fallback`).toBeNull()
      expect(result.intent, `${item.id} intent`).toBe(item.intent)
      expect(result.themeId, `${item.id} theme`).toBe(item.themeId)
      expect(result.spreadId, `${item.id} spread`).toBe(item.spreadId)
      expect(result.path, `${item.id} path`).toContain(`/tarot/${item.themeId}/${item.spreadId}`)
    }
  })
})
