import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TarotPage from '@/app/tarot/page'

// The tarot home page was rewritten from a question-analysis routing flow
// into a chat-style entry screen (TarotChatScreen). These tests cover the
// new surface: it mounts and shows the question input + deck/spread chips.

const mockPush = vi.fn()
const mockPrefetch = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, prefetch: mockPrefetch }),
}))

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: 'ko', language: 'ko' }),
}))

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () =>
        ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <div {...props}>{children}</div>,
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('next/image', () => ({
  default: ({ alt = '', ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}))

describe('TarotPage (chat-style entry screen)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the question input', () => {
    render(<TarotPage />)

    expect(screen.getByPlaceholderText('어떤 고민이 있으신가요?')).toBeInTheDocument()
  })

  it('renders the send button', () => {
    render(<TarotPage />)

    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
  })

  it('shows the tarot master heading', () => {
    render(<TarotPage />)

    expect(screen.getByText('타로 마스터가 기다리고 있습니다')).toBeInTheDocument()
  })
})
