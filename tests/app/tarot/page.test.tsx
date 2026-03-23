import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import TarotHomePage from '@/app/tarot/page'

const mockPush = vi.fn()
const mockHandleStartReading = vi.fn()
const mockAddRecentQuestion = vi.fn()
const mockStoreQuestionAnalysisSnapshot = vi.fn(() => 'analysis-key')
const mockBuildStableEntryPath = vi.fn(
  () => '/tarot/general-insight/quick-reading?question=%EC%95%88%EC%A0%95'
)
const mockAppendQuestionContextToPath = vi.fn(
  (path: string, question: string, analysisKey?: string | null) =>
    `${path}${path.includes('?') ? '&' : '?'}question=${encodeURIComponent(question)}${analysisKey ? `&analysisKey=${analysisKey}` : ''}`
)

const baseAnalysisResult = {
  themeId: 'decisions-crossroads',
  spreadId: 'yes-no-why',
  spreadTitle: '할까 말까',
  cardCount: 3,
  userFriendlyExplanation: '질문에 가장 가까운 스프레드입니다.',
  question_summary: '질문을 직접 해석했습니다.',
  question_profile: {
    type: { code: 'meeting_likelihood', label: '연락 가능성' },
    subject: { code: 'other_person', label: '상대방' },
    focus: { code: 'reply', label: '연락/반응' },
    timeframe: { code: 'near_term', label: '단기' },
    tone: { code: 'prediction', label: '예측 중심' },
  },
  direct_answer: '곧 반응 여부가 드러날 수 있습니다.',
  intent_label: '연락 가능성',
  recommended_spreads: [],
  path: '/tarot/decisions-crossroads/yes-no-why?question=%EA%B1%94%20%EC%97%B0%EB%9D%BD%EC%98%B4%3F',
  source: 'llm' as const,
  fallback_reason: null,
}

const mockUseQuestionAnalysis = vi.fn(() => ({
  analysisResult: baseAnalysisResult,
  dangerWarning: null,
  isAnalyzing: false,
  isLoadingPreview: false,
  fallbackReason: null,
  fallbackNotice: null,
  handleStartReading: mockHandleStartReading,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ language: 'ko' }),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/BackButton', () => ({
  default: () => <div data-testid="back-button" />,
}))

vi.mock('@/app/tarot/hooks', () => ({
  useCanvasAnimation: () => ({ current: null }),
  useRecentQuestions: () => ({
    recentQuestions: [],
    addRecentQuestion: mockAddRecentQuestion,
    removeRecentQuestion: vi.fn(),
  }),
  useQuestionAnalysis: () => mockUseQuestionAnalysis(),
}))

vi.mock('@/hooks/useMobileEnhancements', () => ({
  useTapFeedback: () => vi.fn(),
  useHapticFeedback: () => vi.fn(),
}))

vi.mock('@/app/tarot/utils/recommendations', () => ({
  getQuickRecommendation: () => ({
    path: '/tarot/general-insight/quick-reading',
    spreadTitle: '빠른 리딩',
    cardCount: 1,
  }),
}))

vi.mock('@/lib/Tarot/questionFlow', async () => {
  const actual = await vi.importActual<typeof import('@/lib/Tarot/questionFlow')>(
    '@/lib/Tarot/questionFlow'
  )
  return {
    ...actual,
    storeQuestionAnalysisSnapshot: (
      ...args: Parameters<typeof actual.storeQuestionAnalysisSnapshot>
    ) => mockStoreQuestionAnalysisSnapshot(...args),
    buildStableEntryPath: (...args: Parameters<typeof actual.buildStableEntryPath>) =>
      mockBuildStableEntryPath(...args),
    appendQuestionContextToPath: (...args: Parameters<typeof actual.appendQuestionContextToPath>) =>
      mockAppendQuestionContextToPath(...args),
  }
})

describe('TarotHomePage primary entry routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseQuestionAnalysis.mockReturnValue({
      analysisResult: baseAnalysisResult,
      dangerWarning: null,
      isAnalyzing: false,
      isLoadingPreview: false,
      fallbackReason: null,
      fallbackNotice: null,
      handleStartReading: mockHandleStartReading,
    })
  })

  it('uses analysisResult.path for the primary CTA when analysis is valid', () => {
    render(<TarotHomePage />)

    fireEvent.change(screen.getByLabelText('타로 질문 입력'), {
      target: { value: '걔 연락옴?' },
    })
    fireEvent.click(screen.getByRole('button', { name: '이 추천으로 시작' }))

    expect(mockAppendQuestionContextToPath).toHaveBeenCalledWith(
      baseAnalysisResult.path,
      '걔 연락옴?',
      'analysis-key'
    )
    expect(mockBuildStableEntryPath).not.toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith(
      '/tarot/decisions-crossroads/yes-no-why?question=%EA%B1%94%20%EC%97%B0%EB%9D%BD%EC%98%B4%3F&question=%EA%B1%94%20%EC%97%B0%EB%9D%BD%EC%98%B4%3F&analysisKey=analysis-key'
    )
  })

  it('falls back to a stable path when analysis source is fallback', () => {
    mockUseQuestionAnalysis.mockReturnValue({
      analysisResult: {
        ...baseAnalysisResult,
        source: 'fallback' as const,
      },
      dangerWarning: null,
      isAnalyzing: false,
      isLoadingPreview: false,
      fallbackReason: null,
      fallbackNotice: null,
      handleStartReading: mockHandleStartReading,
    })

    render(<TarotHomePage />)

    fireEvent.change(screen.getByLabelText('타로 질문 입력'), {
      target: { value: '걔 연락옴?' },
    })
    fireEvent.click(screen.getByRole('button', { name: '이 추천으로 시작' }))

    expect(mockBuildStableEntryPath).toHaveBeenCalled()
    expect(mockAppendQuestionContextToPath).not.toHaveBeenCalledWith(
      baseAnalysisResult.path,
      '걔 연락옴?',
      'analysis-key'
    )
    expect(mockPush).toHaveBeenCalledWith(
      '/tarot/general-insight/quick-reading?question=%EC%95%88%EC%A0%95'
    )
  })
})
