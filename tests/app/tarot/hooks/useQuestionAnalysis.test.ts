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

  it('keeps a usable heuristic analysis when analyze endpoint returns 401', async () => {
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
      expect(result.current.analysisResult?.source).toBe('heuristic')
      expect(result.current.analysisResult?.question_profile).toBeUndefined()
    })
  })

  it('normalizes server fallback responses into heuristic analysis', async () => {
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
      expect(result.current.analysisResult?.source).toBe('heuristic')
      expect(result.current.analysisResult?.question_profile).toBeUndefined()
    })
  })

  it('does not surface fallback notice when the engine returns heuristic analysis', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        isDangerous: false,
        themeId: 'general-insight',
        spreadId: 'quick-reading',
        spreadTitle: '빠른 리딩',
        cardCount: 1,
        userFriendlyExplanation: '질문 해석을 먼저 고정했어요.',
        path: '/tarot/general-insight/quick-reading?question=test',
        source: 'heuristic',
        fallback_reason: null,
      }),
    } as Response)

    const { result } = renderHook(() =>
      useQuestionAnalysis({
        question: '내일 이차연이 나를 만날까?',
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
      expect(result.current.fallbackReason).toBeNull()
    })
  })

  it('builds a heuristic analysis on start-reading analyze failure (401)', async () => {
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
    expect(result.current.analysisResult?.source).toBe('heuristic')
    expect(result.current.fallbackReason).toBe('auth_failed')
  })

  it('keeps fallback reason visible when preview analyze throws a network error', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('network down'))

    const { result } = renderHook(() =>
      useQuestionAnalysis({
        question: '그 사람은 나를 어떻게 생각해?',
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
      expect(result.current.fallbackReason).toBe('network_error')
      expect(result.current.analysisResult?.source).toBe('heuristic')
      expect(result.current.analysisResult?.question_profile).toBeUndefined()
    })
  })
})
