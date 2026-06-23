import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react'

// --- mocks ------------------------------------------------------------------

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

const i18nState = vi.hoisted(() => ({ language: 'ko' as 'ko' | 'en' }))
vi.mock('@/i18n/I18nProvider', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useI18n: () => ({
    language: i18nState.language,
    locale: i18nState.language,
    setLocale: vi.fn(),
    t: (_k: string, f?: string) => f,
  }),
}))

const apiFetch = vi.fn()
vi.mock('@/lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

// historyClientUtils — fully mocked; the util logic itself is tested elsewhere.
const getSavedReadings = vi.fn()
const deleteReading = vi.fn()
const formatRelativeTime = vi.fn(() => '방금 전')
const mapServerReadingToSavedReading = vi.fn((r: unknown) => r)
const migrateLocalReadingsToServer = vi.fn(async () => ({ migrated: 0, failed: 0 }))
const storeReadingRestorePayload = vi.fn(() => 'restore-key')
vi.mock('@/app/tarot/history/historyClientUtils', () => ({
  getSavedReadings: (...a: unknown[]) => getSavedReadings(...a),
  deleteReading: (...a: unknown[]) => deleteReading(...a),
  formatRelativeTime: (...a: unknown[]) => formatRelativeTime(...a),
  mapServerReadingToSavedReading: (...a: unknown[]) => mapServerReadingToSavedReading(...a),
  migrateLocalReadingsToServer: (...a: unknown[]) => migrateLocalReadingsToServer(...a),
  storeReadingRestorePayload: (...a: unknown[]) => storeReadingRestorePayload(...a),
}))

vi.mock('@/components/ui/CosmicBackdrop', () => ({
  CosmicBackdrop: () => <div data-testid="cosmic-backdrop" />,
}))
vi.mock('@/components/chat/ChatBubbleContent', () => ({
  default: ({ content }: { content: string }) => <div data-testid="bubble">{content}</div>,
}))
vi.mock('@/components/tarot/ShareTarotButton', () => ({
  ShareTarotButton: () => <button data-testid="share-button">share</button>,
}))
vi.mock('@/components/tarot/shareCardData', () => ({
  buildShareDataFromSavedReading: vi.fn(() => ({ cards: [] })),
}))
vi.mock('@/lib/tarot/findCardByName', () => ({
  findCardBySavedName: vi.fn((c: { name?: string }) => ({
    name: c?.name ?? 'card',
    nameKo: c?.name ?? '카드',
    image: '/images/tarot/card-back.webp',
  })),
}))
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
  },
}))

import TarotHistoryClient from '@/app/tarot/history/TarotHistoryClient'

// jsdom does not implement window.confirm; define it as a configurable fn.
function setConfirm(impl: () => boolean) {
  Object.defineProperty(window, 'confirm', {
    value: vi.fn(impl),
    configurable: true,
    writable: true,
  })
}

type Reading = Record<string, unknown>

function makeReading(over: Reading = {}): Reading {
  return {
    id: 'r1',
    timestamp: 1_700_000_000_000,
    question: '이직해도 될까요?',
    storageOrigin: 'server',
    spread: { title: 'Three Card', cardCount: 1 },
    spreadId: 'past-present-future',
    categoryId: 'general-insight',
    cards: [
      { name: 'The Fool', nameKo: '바보', isReversed: false, position: '현재', positionKo: '현재' },
    ],
    interpretation: { overallMessage: 'overall', guidance: 'g', cardInsights: [] },
    ...over,
  }
}

function okHistory(readings: Reading[], hasMore = false) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data: { readings, hasMore } }),
  }
}

describe('TarotHistoryClient', () => {
  beforeEach(() => {
    push.mockReset()
    apiFetch.mockReset()
    getSavedReadings.mockReset().mockReturnValue([])
    deleteReading.mockReset()
    migrateLocalReadingsToServer.mockReset().mockResolvedValue({ migrated: 0, failed: 0 })
    storeReadingRestorePayload.mockReset().mockReturnValue('restore-key')
    i18nState.language = 'ko'
    setConfirm(() => true)
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders the page header', async () => {
    apiFetch.mockResolvedValue(okHistory([]))
    render(<TarotHistoryClient />)
    expect(await screen.findByRole('heading', { name: '타로 기록' })).toBeInTheDocument()
  })

  it('lists readings fetched from the server', async () => {
    apiFetch.mockResolvedValue(okHistory([makeReading()]))
    render(<TarotHistoryClient />)
    expect(await screen.findByText('이직해도 될까요?')).toBeInTheDocument()
  })

  it('shows the empty state with a CTA when there are no readings', async () => {
    apiFetch.mockResolvedValue(okHistory([]))
    render(<TarotHistoryClient />)
    expect(await screen.findByText('저장된 리딩이 없어요')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '타로 시작하기' }))
    expect(push).toHaveBeenCalledWith('/tarot')
  })

  it('falls back to local storage when the server returns an error', async () => {
    apiFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    getSavedReadings.mockReturnValue([
      makeReading({ question: '로컬 리딩', storageOrigin: 'local' }),
    ])
    render(<TarotHistoryClient />)
    expect(await screen.findByText('로컬 리딩')).toBeInTheDocument()
  })

  it('falls back to local storage when the fetch throws', async () => {
    apiFetch.mockRejectedValue(new Error('offline'))
    getSavedReadings.mockReturnValue([
      makeReading({ question: '오프라인 리딩', storageOrigin: 'local' }),
    ])
    render(<TarotHistoryClient />)
    expect(await screen.findByText('오프라인 리딩')).toBeInTheDocument()
  })

  it('filters readings by the search query', async () => {
    apiFetch.mockResolvedValue(
      okHistory([
        makeReading({ id: 'a', question: '연애운 질문' }),
        makeReading({ id: 'b', question: '금전운 질문' }),
      ])
    )
    render(<TarotHistoryClient />)
    await screen.findByText('연애운 질문')

    fireEvent.change(screen.getByPlaceholderText('질문 또는 카드 검색…'), {
      target: { value: '금전' },
    })
    expect(screen.queryByText('연애운 질문')).not.toBeInTheDocument()
    expect(screen.getByText('금전운 질문')).toBeInTheDocument()
  })

  it('shows a no-results empty state for a non-matching search', async () => {
    apiFetch.mockResolvedValue(okHistory([makeReading()]))
    render(<TarotHistoryClient />)
    await screen.findByText('이직해도 될까요?')
    fireEvent.change(screen.getByPlaceholderText('질문 또는 카드 검색…'), {
      target: { value: 'zzzzz' },
    })
    expect(screen.getByText('검색 결과가 없어요')).toBeInTheDocument()
  })

  it('toggles the statistics panel and shows card frequency', async () => {
    apiFetch.mockResolvedValue(okHistory([makeReading()]))
    render(<TarotHistoryClient />)
    await screen.findByText('이직해도 될까요?')

    fireEvent.click(screen.getByRole('button', { name: '통계 보기 전환' }))
    expect(screen.getByText('자주 나온 카드 TOP 10')).toBeInTheDocument()
    expect(screen.getByText('총 1개의 리딩')).toBeInTheDocument()
  })

  it('opens the detail modal and shows the resume button', async () => {
    apiFetch.mockResolvedValue(okHistory([makeReading()]))
    render(<TarotHistoryClient />)
    fireEvent.click(await screen.findByText('이직해도 될까요?'))

    expect(await screen.findByText('뽑은 카드')).toBeInTheDocument()
    expect(screen.getByText('해석')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /이 리딩 다시 열기/ })).toBeInTheDocument()
  })

  it('resumes a reading: stores payload and navigates', async () => {
    apiFetch.mockResolvedValue(okHistory([makeReading()]))
    render(<TarotHistoryClient />)
    fireEvent.click(await screen.findByText('이직해도 될까요?'))
    fireEvent.click(await screen.findByRole('button', { name: /이 리딩 다시 열기/ }))

    expect(storeReadingRestorePayload).toHaveBeenCalled()
    await waitFor(() => expect(push).toHaveBeenCalled())
    const dest = push.mock.calls[0][0] as string
    expect(dest).toContain('/tarot/general-insight/past-present-future')
    expect(dest).toContain('restoreKey=restore-key')
  })

  it('deletes a server reading via the API and removes it from the list', async () => {
    apiFetch
      .mockResolvedValueOnce(okHistory([makeReading()])) // initial load
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) }) // DELETE
    render(<TarotHistoryClient />)
    await screen.findByText('이직해도 될까요?')

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/tarot/save/r1',
        expect.objectContaining({ method: 'DELETE' })
      )
    )
    await waitFor(() => expect(screen.queryByText('이직해도 될까요?')).not.toBeInTheDocument())
    expect(screen.getByText('리딩을 삭제했습니다.')).toBeInTheDocument()
  })

  it('does not delete when the confirm dialog is cancelled', async () => {
    setConfirm(() => false)
    apiFetch.mockResolvedValue(okHistory([makeReading()]))
    render(<TarotHistoryClient />)
    await screen.findByText('이직해도 될까요?')

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))
    // Only the initial load call should have happened.
    expect(apiFetch).toHaveBeenCalledTimes(1)
    expect(screen.getByText('이직해도 될까요?')).toBeInTheDocument()
  })

  it('shows an error notice when server deletion fails', async () => {
    apiFetch
      .mockResolvedValueOnce(okHistory([makeReading()]))
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    render(<TarotHistoryClient />)
    await screen.findByText('이직해도 될까요?')

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(await screen.findByText(/삭제하지 못했어요/)).toBeInTheDocument()
  })

  it('deletes a local reading via the storage helper', async () => {
    apiFetch.mockResolvedValue(okHistory([makeReading({ storageOrigin: 'local' })]))
    deleteReading.mockReturnValue(true)
    getSavedReadings.mockReturnValue([]) // after deletion
    render(<TarotHistoryClient />)
    await screen.findByText('이직해도 될까요?')

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))
    await waitFor(() => expect(deleteReading).toHaveBeenCalledWith('r1'))
    expect(screen.getByText('리딩을 삭제했습니다.')).toBeInTheDocument()
  })

  it('loads more readings when the "Load more" button is clicked', async () => {
    apiFetch
      .mockResolvedValueOnce(okHistory([makeReading({ id: 'a', question: '첫 페이지' })], true))
      .mockResolvedValueOnce(okHistory([makeReading({ id: 'b', question: '둘째 페이지' })], false))
    render(<TarotHistoryClient />)
    await screen.findByText('첫 페이지')

    fireEvent.click(screen.getByRole('button', { name: '더 보기' }))
    expect(await screen.findByText('둘째 페이지')).toBeInTheDocument()
  })

  it('switches sort order between newest and oldest', async () => {
    apiFetch.mockResolvedValue(
      okHistory([
        makeReading({ id: 'old', question: '오래된 질문', timestamp: 1000 }),
        makeReading({ id: 'new', question: '최신 질문', timestamp: 9000 }),
      ])
    )
    render(<TarotHistoryClient />)
    await screen.findByText('최신 질문')

    const articles = () => screen.getAllByRole('button').filter((el) => el.tagName === 'ARTICLE')
    // newest first by default
    expect(within(articles()[0]).getByText('최신 질문')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '오래된순' }))
    expect(within(articles()[0]).getByText('오래된 질문')).toBeInTheDocument()
  })

  it('shows a migration notice when guest readings are imported', async () => {
    apiFetch.mockResolvedValue(okHistory([makeReading()]))
    migrateLocalReadingsToServer.mockResolvedValue({ migrated: 2, failed: 0 })
    render(<TarotHistoryClient />)
    expect(await screen.findByText(/이전 2개의 리딩을 계정으로 옮겼어요/)).toBeInTheDocument()
  })
})
