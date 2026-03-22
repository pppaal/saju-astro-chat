import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TarotReadingPageWrapper from '@/app/tarot/[categoryName]/[spreadId]/page'

const mockUseSession = vi.fn()

vi.mock('next/navigation', () => ({
  useParams: () => ({ categoryName: 'general-insight', spreadId: 'quick-reading' }),
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams('question=test-question'),
}))

vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}))

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({
    t: (_key: string, fallback?: string) => fallback || '',
    translate: (_key: string, fallback: string) => fallback,
    language: 'en',
  }),
}))

vi.mock('@/app/tarot/[categoryName]/[spreadId]/hooks', () => ({
  useTarotGame: () => ({
    gameState: 'loading',
    spreadInfo: null,
    selectedDeckStyle: 'celestial',
    selectedColor: { id: 'celestial' },
    selectedIndices: [],
    selectionOrderMap: new Map(),
    readingResult: null,
    interpretation: null,
    drawError: null,
    revealedCards: [],
    isSpreading: false,
    userTopic: 'test-question',
    questionAnalysis: null,
    personalizationOptions: { includeSaju: true, includeAstrology: true },
    setGameState: vi.fn(),
    setInterpretation: vi.fn(),
    handlePersonalizationChange: vi.fn(),
    handleColorSelect: vi.fn(),
    handleStartReading: vi.fn(),
    handleCardClick: vi.fn(),
    handleCardReveal: vi.fn(),
    handleRedraw: vi.fn(),
    isCardRevealed: vi.fn().mockReturnValue(false),
    canRevealCard: vi.fn().mockReturnValue(false),
  }),
  useTarotInterpretation: () => ({
    isSaved: false,
    saveMessage: '',
    fetchInterpretation: vi.fn(),
    handleSaveReading: vi.fn(),
  }),
}))

vi.mock('@/app/tarot/[categoryName]/[spreadId]/components/PageContent', () => ({
  PageContent: () => <div data-testid="tarot-page-content">Tarot Page Content</div>,
}))

vi.mock('@/app/tarot/[categoryName]/[spreadId]/utils', () => ({
  smoothScrollTo: vi.fn(),
}))

describe('tarot reading page access', () => {
  beforeEach(() => {
    mockUseSession.mockReset()
  })

  it('renders the reading content for unauthenticated guest users', async () => {
    mockUseSession.mockReturnValue({ status: 'unauthenticated' })

    render(<TarotReadingPageWrapper />)

    expect(await screen.findByTestId('tarot-page-content')).toBeInTheDocument()
  })

  it('renders the reading content for authenticated users', async () => {
    mockUseSession.mockReturnValue({ status: 'authenticated' })

    render(<TarotReadingPageWrapper />)

    expect(await screen.findByTestId('tarot-page-content')).toBeInTheDocument()
  })
})
