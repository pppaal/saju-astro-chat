import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

// --- mocks ------------------------------------------------------------------

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

const i18nState = vi.hoisted(() => ({ locale: 'ko' as 'ko' | 'en' }))
vi.mock('@/i18n/I18nProvider', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useI18n: () => ({
    locale: i18nState.locale,
    setLocale: vi.fn(),
    t: (_k: string, f?: string) => f,
  }),
}))

const sessionState = vi.hoisted(() => ({ status: 'unauthenticated' as string }))
vi.mock('next-auth/react', () => ({
  useSession: () => ({ status: sessionState.status, data: null, update: vi.fn() }),
}))

const apiFetch = vi.fn()
vi.mock('@/lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

const savePendingChat = vi.fn()
const loadPendingChat = vi.fn()
const clearPendingChat = vi.fn()
vi.mock('@/lib/chat/pendingChat', () => ({
  savePendingChat: (...a: unknown[]) => savePendingChat(...a),
  loadPendingChat: (...a: unknown[]) => loadPendingChat(...a),
  clearPendingChat: (...a: unknown[]) => clearPendingChat(...a),
}))

// AppShell — render accentLayer + children plainly.
vi.mock('@/components/ui/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}))

// next/image → plain img.
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
  },
}))

// framer-motion → passthrough divs, keep AnimatePresence rendering children.
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () => (props: Record<string, unknown>) => {
        const { children, ...rest } = props as { children?: React.ReactNode }
        return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
      },
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Capture the props ChatInputArea receives so we can drive send/keydown.
const chatInputProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }))
vi.mock('@/components/destiny-map/chat-panels', () => ({
  ChatInputArea: (props: Record<string, unknown>) => {
    chatInputProps.current = props
    const labels = props.labels as { placeholder?: string; send?: string }
    return (
      <div data-testid="chat-input-area">
        {props.topSlot as React.ReactNode}
        <textarea
          data-testid="chat-textarea"
          value={props.input as string}
          placeholder={labels?.placeholder}
          onChange={(e) => (props.onInputChange as (v: string) => void)(e.target.value)}
          onKeyDown={props.onKeyDown as React.KeyboardEventHandler}
        />
        <button data-testid="chat-send" onClick={props.onSend as () => void}>
          {labels?.send}
        </button>
      </div>
    )
  },
}))

import TarotChatScreen from '@/components/tarot/TarotChatScreen'

describe('TarotChatScreen', () => {
  beforeEach(() => {
    push.mockReset()
    apiFetch.mockReset()
    savePendingChat.mockReset()
    loadPendingChat.mockReset()
    clearPendingChat.mockReset()
    chatInputProps.current = null
    i18nState.locale = 'ko'
    sessionState.status = 'unauthenticated'
    loadPendingChat.mockReturnValue(null)
  })
  afterEach(() => cleanup())

  it('renders the hero heading and seed-question chips (ko)', () => {
    render(<TarotChatScreen />)
    expect(
      screen.getByRole('heading', { name: '타로 마스터가 기다리고 있습니다' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '헤어진 그 사람, 다시 연락 올까요?' })
    ).toBeInTheDocument()
    expect(screen.getByTestId('chat-input-area')).toBeInTheDocument()
  })

  it('renders English copy when locale=en', () => {
    i18nState.locale = 'en'
    render(<TarotChatScreen />)
    expect(screen.getByRole('heading', { name: 'The Tarot Master Awaits' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Will my ex reach out again?' })).toBeInTheDocument()
  })

  it('navigates to /tarot/daily when the daily-tarot chip is clicked', () => {
    render(<TarotChatScreen />)
    fireEvent.click(screen.getByRole('button', { name: /오늘의 타로/ }))
    expect(push).toHaveBeenCalledWith('/tarot/daily')
  })

  it('pushes to the reading route after a successful prefetch (typed question)', async () => {
    apiFetch.mockResolvedValue({ ok: true, status: 200 })
    render(<TarotChatScreen />)

    fireEvent.change(screen.getByTestId('chat-textarea'), { target: { value: '연애운 어때요?' } })
    fireEvent.click(screen.getByTestId('chat-send'))

    await waitFor(() => expect(push).toHaveBeenCalled())
    const dest = push.mock.calls[0][0] as string
    expect(dest).toContain('/tarot/')
    expect(dest).toContain(`question=${encodeURIComponent('연애운 어때요?')}`)
    expect(dest).toContain('deck=')
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/tarot/prefetch',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('starts a reading directly from a seed-question chip', async () => {
    apiFetch.mockResolvedValue({ ok: true, status: 200 })
    render(<TarotChatScreen />)

    fireEvent.click(screen.getByRole('button', { name: '이번 달 금전운은 어떤가요?' }))
    await waitFor(() => expect(push).toHaveBeenCalled())
    expect(push.mock.calls[0][0] as string).toContain(
      `question=${encodeURIComponent('이번 달 금전운은 어떤가요?')}`
    )
  })

  it('does not navigate when the question is blank', () => {
    render(<TarotChatScreen />)
    fireEvent.click(screen.getByTestId('chat-send')) // input is empty
    expect(apiFetch).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('saves a pending chat (no navigation) when prefetch returns 401', async () => {
    apiFetch.mockResolvedValue({ ok: false, status: 401 })
    render(<TarotChatScreen />)

    fireEvent.change(screen.getByTestId('chat-textarea'), { target: { value: '취업운 알려줘' } })
    fireEvent.click(screen.getByTestId('chat-send'))

    await waitFor(() => expect(savePendingChat).toHaveBeenCalled())
    expect(savePendingChat).toHaveBeenCalledWith(
      'tarot',
      expect.objectContaining({ question: '취업운 알려줘' })
    )
    expect(push).not.toHaveBeenCalled()
  })

  it('still navigates when prefetch throws (network error is non-blocking)', async () => {
    apiFetch.mockRejectedValue(new Error('offline'))
    render(<TarotChatScreen />)

    fireEvent.change(screen.getByTestId('chat-textarea'), { target: { value: '건강운?' } })
    fireEvent.click(screen.getByTestId('chat-send'))

    await waitFor(() => expect(push).toHaveBeenCalled())
  })

  it('submits on Enter (no shift) via keydown handler', async () => {
    apiFetch.mockResolvedValue({ ok: true, status: 200 })
    render(<TarotChatScreen />)
    const ta = screen.getByTestId('chat-textarea')
    fireEvent.change(ta, { target: { value: '결혼운?' } })
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: false })
    await waitFor(() => expect(push).toHaveBeenCalled())
  })

  it('does NOT submit on Shift+Enter', () => {
    render(<TarotChatScreen />)
    const ta = screen.getByTestId('chat-textarea')
    fireEvent.change(ta, { target: { value: '결혼운?' } })
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: true })
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('opens the deck modal from the options popover', async () => {
    render(<TarotChatScreen />)
    fireEvent.click(screen.getByRole('button', { name: /덱·스프레드 선택/ }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /덱 선택/ }))
    expect(await screen.findByRole('heading', { name: '타로 덱 선택' })).toBeInTheDocument()
  })

  it('opens the spread modal and selects a spread', async () => {
    render(<TarotChatScreen />)
    fireEvent.click(screen.getByRole('button', { name: /덱·스프레드 선택/ }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /스프레드 선택/ }))
    expect(await screen.findByRole('heading', { name: '카드 매수 선택' })).toBeInTheDocument()
  })

  it('auto-resumes a pending reading once authenticated', async () => {
    sessionState.status = 'authenticated'
    loadPendingChat.mockReturnValue({
      question: '이어서 볼래요',
      deck: 'classic',
      categoryId: 'love',
      spreadId: 'past-present-future',
    })
    render(<TarotChatScreen />)
    await waitFor(() => expect(push).toHaveBeenCalled())
    expect(clearPendingChat).toHaveBeenCalledWith('tarot')
    expect(push.mock.calls[0][0] as string).toContain('autostart=1')
  })
})
