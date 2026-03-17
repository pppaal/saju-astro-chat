import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuestionAnalysis } from '@/app/tarot/hooks/useQuestionAnalysis'
import { apiFetch } from '@/lib/api'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  tarotLogger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/Tarot/tarot-recommend', () => ({
  checkDangerousQuestion: vi.fn(() => ({ isDangerous: false })),
}))

describe('useQuestionAnalysis', () => {
  const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>
  const getQuickRecommendation = vi.fn((question: string) => ({
    path: `/tarot/general-insight/quick-reading?question=${encodeURIComponent(question)}`,
    cardCount: 1,
    spreadTitle: '빠른 리딩',
    isKeywordMatch: false,
  }))

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  it('records auth_failed fallback reason when analyze endpoint returns 401', async () => {
    mockApiFetch.mockResolvedValue({
      ok: false,
      status: 401,
    } as Response)

    const { result } = renderHook(() =>
      useQuestionAnalysis({
        question: '내가 가진 운의 강점은?',
        language: 'ko',
        isKo: true,
        getQuickRecommendation,
      })
    )

    await act(async () => {
      vi.advanceTimersByTime(450)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.fallbackReason).toBe('auth_failed')
    })
  })

  it('uses server fallback reason when response is 200 with source=fallback', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        isDangerous: false,
        themeId: 'general-insight',
        spreadId: 'quick-reading',
        spreadTitle: '빠른 리딩',
        cardCount: 1,
        userFriendlyExplanation: '기본 스프레드로 연결했어요',
        path: '/tarot/general-insight/quick-reading?question=test',
        source: 'fallback',
        fallback_reason: 'parse_failed',
      }),
    } as Response)

    const { result } = renderHook(() =>
      useQuestionAnalysis({
        question: '테스트 질문입니다',
        language: 'ko',
        isKo: true,
        getQuickRecommendation,
      })
    )

    await act(async () => {
      vi.advanceTimersByTime(450)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.fallbackReason).toBe('parse_failed')
    })
  })

  it('builds a quick fallback analysis on start-reading analyze failure (401)', async () => {
    const question = '질문'

    mockApiFetch.mockResolvedValue({
      ok: false,
      status: 401,
    } as Response)

    const { result } = renderHook(() =>
      useQuestionAnalysis({
        question,
        language: 'ko',
        isKo: true,
        getQuickRecommendation,
      })
    )

    await act(async () => {
      await result.current.handleStartReading()
    })

    expect(result.current.analysisResult?.path).toBe(
      `/tarot/general-insight/quick-reading?question=${encodeURIComponent(question)}`
    )
    expect(result.current.fallbackReason).toBe('auth_failed')
  })
})
