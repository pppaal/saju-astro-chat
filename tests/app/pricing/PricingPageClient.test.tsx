import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { CREDIT_PACKS } from '@/lib/config/pricing'
import { SSR_PRICING_KEYS } from '@/app/pricing/pricingCopyKeys'

// --- i18n -------------------------------------------------------------------
// t(path, fallback) returns the leaf key so assertions can target stable text,
// except a handful of pack-name / button keys we map to readable labels.
const labelMap: Record<string, string> = {
  'pricing.buyNow': 'Buy now',
  'pricing.creditPacks': 'Credit Packs',
  'pricing.heroTitle': 'Simple Pricing',
  'pricing.bestValue': 'Best value',
  'pricing.creditPackNames.mini': 'Mini',
  'pricing.creditPackNames.standard': 'Standard',
  'pricing.creditPackNames.plus': 'Plus',
  'pricing.creditPackNames.mega': 'Mega',
  'pricing.creditPackNames.ultimate': 'Ultimate',
  'pricing.paymentError': 'Payment service temporarily unavailable',
}
const mockI18n = {
  locale: 'en' as 'en' | 'ko',
  hydrated: true,
  t: (path: string, fallback?: string) => labelMap[path] ?? fallback ?? path.split('.').pop()!,
}
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => mockI18n }))

// i18n utils: keep our mapped labels from being treated as placeholders.
vi.mock('@/i18n/utils', () => ({
  isPlaceholderTranslation: () => false,
  toSafeFallbackText: (path: string) => path,
}))

// --- session ----------------------------------------------------------------
const mockSession = {
  data: null as any,
  status: 'unauthenticated' as string,
  update: vi.fn(),
}
vi.mock('next-auth/react', () => ({
  useSession: () => mockSession,
}))

// --- login modal ------------------------------------------------------------
const mockRequireLogin = vi.fn()
vi.mock('@/contexts/LoginModalContext', () => ({
  useRequireLogin: () => mockRequireLogin,
}))

// --- toast ------------------------------------------------------------------
const mockToast = { error: vi.fn(), success: vi.fn() }
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => mockToast,
}))

// --- http -------------------------------------------------------------------
const mockFetchWithRetry = vi.fn()
vi.mock('@/lib/http', () => ({
  fetchWithRetry: (...args: any[]) => mockFetchWithRetry(...args),
}))

// --- CSS module + misc children --------------------------------------------
vi.mock('@/app/pricing/pricing.module.css', () => ({
  default: new Proxy({}, { get: (_t, k: string) => k }),
}))
vi.mock('@/components/ui/BackButton', () => ({ default: () => <button>back</button> }))

// Modals — expose their open flag + the confirm/save callbacks as buttons.
vi.mock('@/components/pricing/RefundConsentModal', () => ({
  RefundConsentModal: ({ open, onConfirm, onClose, productSummary }: any) =>
    open ? (
      <div data-testid="refund-modal">
        <span data-testid="refund-summary">{productSummary}</span>
        <button onClick={onConfirm}>refund-confirm</button>
        <button onClick={onClose}>refund-close</button>
      </div>
    ) : null,
}))
vi.mock('@/components/pricing/EmailCollectionModal', () => ({
  EmailCollectionModal: ({ open, onSaved, onClose }: any) =>
    open ? (
      <div data-testid="email-modal">
        <button onClick={() => onSaved('new@user.com')}>email-save</button>
        <button onClick={onClose}>email-close</button>
      </div>
    ) : null,
}))

import PricingPageClient from '@/app/pricing/PricingPageClient'

// initialCopy aligned to SSR_PRICING_KEYS ordering (values unused since hydrated).
const initialCopy = SSR_PRICING_KEYS.map((k) => `ssr-${k}`)

function renderPage(locale: 'en' | 'ko' = 'en') {
  mockI18n.locale = locale
  return render(<PricingPageClient initialLocale={locale} initialCopy={initialCopy} />)
}

beforeEach(() => {
  mockSession.data = null
  mockSession.status = 'unauthenticated'
  mockSession.update = vi.fn().mockResolvedValue(undefined)
  mockI18n.locale = 'en'
  mockRequireLogin.mockReset()
  mockToast.error.mockReset()
  mockFetchWithRetry.mockReset()
  // jsdom: no real navigation; stub window.location.href assignment.
  delete (window as any).location
  ;(window as any).location = { href: 'http://localhost:3000/pricing', host: 'localhost:3000' }
})

afterEach(() => {
  cleanup()
})

describe('PricingPageClient', () => {
  it('renders all five credit packs with USD prices, credits and per-reading rate (en)', () => {
    renderPage('en')
    for (const id of ['mini', 'standard', 'plus', 'mega', 'ultimate'] as const) {
      const pack = CREDIT_PACKS[id]
      expect(screen.getByText(`$${pack.pricing.usd.toFixed(2)}`)).toBeInTheDocument()
      expect(screen.getByText(String(pack.credits))).toBeInTheDocument()
    }
    expect(screen.getByText('Mini')).toBeInTheDocument()
    expect(screen.getByText('Ultimate')).toBeInTheDocument()
    // Buy buttons — one per pack.
    expect(screen.getAllByRole('button', { name: 'Buy now' })).toHaveLength(5)
  })

  it('renders KRW prices and Korean copy when locale is ko', () => {
    renderPage('ko')
    for (const id of ['mini', 'plus', 'ultimate'] as const) {
      const pack = CREDIT_PACKS[id]
      expect(screen.getByText(`₩${pack.pricing.krw.toLocaleString('ko-KR')}`)).toBeInTheDocument()
    }
    expect(screen.getAllByText('VAT 포함').length).toBe(5)
  })

  it('marks the popular pack with the best-value badge', () => {
    renderPage('en')
    // 'plus' is the popular pack in the SSOT.
    expect(CREDIT_PACKS.plus.popular).toBe(true)
    expect(screen.getByText('Best value')).toBeInTheDocument()
  })

  it('shows the reference rate footer derived from the SSOT', () => {
    renderPage('en')
    expect(screen.getByText(new RegExp(`Reference rate: 1 credit`, 'i'))).toBeInTheDocument()
  })

  it('guest clicking buy triggers the login prompt (no checkout)', () => {
    mockSession.status = 'unauthenticated'
    renderPage('en')
    fireEvent.click(screen.getAllByRole('button', { name: 'Buy now' })[0])
    expect(mockRequireLogin).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('refund-modal')).toBeNull()
    expect(mockFetchWithRetry).not.toHaveBeenCalled()
  })

  it('authenticated user with email opens the refund consent modal', () => {
    mockSession.status = 'authenticated'
    mockSession.data = { user: { email: 'me@user.com' } }
    renderPage('en')
    fireEvent.click(screen.getAllByRole('button', { name: 'Buy now' })[1])
    expect(screen.getByTestId('refund-modal')).toBeInTheDocument()
    // Product summary reflects the chosen pack (standard, index 1).
    expect(screen.getByTestId('refund-summary')).toHaveTextContent('Standard')
  })

  it('confirming the refund modal runs checkout and redirects to the Stripe url', async () => {
    mockSession.status = 'authenticated'
    mockSession.data = { user: { email: 'me@user.com' } }
    mockFetchWithRetry.mockResolvedValue({
      status: 200,
      json: async () => ({ success: true, data: { url: 'https://stripe.test/checkout' } }),
    })
    renderPage('en')
    fireEvent.click(screen.getAllByRole('button', { name: 'Buy now' })[0])
    fireEvent.click(screen.getByText('refund-confirm'))

    await waitFor(() =>
      expect(mockFetchWithRetry).toHaveBeenCalledWith(
        '/api/checkout',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ creditPack: 'mini' }) }),
        expect.objectContaining({ maxRetries: 2 })
      )
    )
    await waitFor(() => expect(window.location.href).toBe('https://stripe.test/checkout'))
  })

  it('supports the legacy flat { url } checkout envelope', async () => {
    mockSession.status = 'authenticated'
    mockSession.data = { user: { email: 'me@user.com' } }
    mockFetchWithRetry.mockResolvedValue({
      status: 200,
      json: async () => ({ url: 'https://stripe.test/flat' }),
    })
    renderPage('en')
    fireEvent.click(screen.getAllByRole('button', { name: 'Buy now' })[0])
    fireEvent.click(screen.getByText('refund-confirm'))
    await waitFor(() => expect(window.location.href).toBe('https://stripe.test/flat'))
  })

  it('shows a toast error when checkout returns no url', async () => {
    mockSession.status = 'authenticated'
    mockSession.data = { user: { email: 'me@user.com' } }
    mockFetchWithRetry.mockResolvedValue({
      status: 500,
      json: async () => ({ success: false }),
    })
    renderPage('en')
    fireEvent.click(screen.getAllByRole('button', { name: 'Buy now' })[0])
    fireEvent.click(screen.getByText('refund-confirm'))
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith('Payment service temporarily unavailable')
    )
  })

  it('shows a toast error when the checkout request throws', async () => {
    mockSession.status = 'authenticated'
    mockSession.data = { user: { email: 'me@user.com' } }
    mockFetchWithRetry.mockRejectedValue(new Error('network down'))
    renderPage('en')
    fireEvent.click(screen.getAllByRole('button', { name: 'Buy now' })[0])
    fireEvent.click(screen.getByText('refund-confirm'))
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith('Payment service temporarily unavailable')
    )
  })

  it('authenticated user without email opens the email collection modal first', async () => {
    mockSession.status = 'authenticated'
    mockSession.data = { user: { email: '' } }
    renderPage('en')
    fireEvent.click(screen.getAllByRole('button', { name: 'Buy now' })[2])
    expect(screen.getByTestId('email-modal')).toBeInTheDocument()
    expect(screen.queryByTestId('refund-modal')).toBeNull()

    // Saving the email updates the session then advances to the refund modal.
    fireEvent.click(screen.getByText('email-save'))
    await waitFor(() => expect(mockSession.update).toHaveBeenCalledWith({ email: 'new@user.com' }))
    await waitFor(() => expect(screen.getByTestId('refund-modal')).toBeInTheDocument())
  })

  it('toggles a FAQ item open and closed', () => {
    renderPage('en')
    // FAQ question buttons carry aria-expanded.
    const faqButtons = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-controls')?.startsWith('faq-answer-'))
    expect(faqButtons.length).toBe(8)
    const first = faqButtons[0]
    expect(first).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(first)
    expect(first).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(first)
    expect(first).toHaveAttribute('aria-expanded', 'false')
  })

  it('closing the refund modal without confirming does not call checkout', () => {
    mockSession.status = 'authenticated'
    mockSession.data = { user: { email: 'me@user.com' } }
    renderPage('en')
    fireEvent.click(screen.getAllByRole('button', { name: 'Buy now' })[0])
    fireEvent.click(screen.getByText('refund-close'))
    expect(screen.queryByTestId('refund-modal')).toBeNull()
    expect(mockFetchWithRetry).not.toHaveBeenCalled()
  })
})
