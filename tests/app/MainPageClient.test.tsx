import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

// --- Mocks -----------------------------------------------------------------

const mockUseSession = vi.fn(() => ({ status: 'unauthenticated' as string }))
vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}))

const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

const mockSetLocale = vi.fn()
const mockI18n = { locale: 'en' as 'en' | 'ko', setLocale: mockSetLocale }
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => mockI18n,
}))

// framer-motion → plain DOM elements so AnimatePresence children render
// synchronously without animation timers.
vi.mock('framer-motion', () => {
  const React = require('react')
  const passthrough = (tag: string) => {
    const Motion = React.forwardRef(({ children, ...props }: any, ref: any) => {
      // Drop motion-only props that React would warn about on DOM nodes.
      const { animate, initial, exit, transition, whileHover, whileTap, layout, ...rest } = props
      return React.createElement(tag, { ...rest, ref }, children)
    })
    Motion.displayName = `motion.${tag}`
    return Motion
  }
  return {
    motion: new Proxy({}, { get: (_t, tag: string) => passthrough(tag) }),
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
  }
})

vi.mock('@vercel/speed-insights/next', () => ({ SpeedInsights: () => null }))

// CSS module — return identity proxy so className lookups never crash.
vi.mock('@/app/(main)/main-page.module.css', () => ({
  default: new Proxy({}, { get: (_t, k: string) => k }),
}))

// Heavy / browser-only children mocked to lightweight stand-ins that expose
// the props the page wires into them so we can assert behavior.
vi.mock('@/app/(main)/components', () => ({
  ParticleCanvas: () => <div data-testid="particle-canvas" />,
}))

vi.mock('@/components/PrefetchLinks', () => ({ default: () => <div data-testid="prefetch" /> }))

vi.mock('@/components/ui/MenuDrawerPanel', () => ({
  MenuDrawerPanel: ({ open, onClose }: any) => (
    <div data-testid="menu-drawer" data-open={String(open)}>
      <button onClick={onClose}>close-drawer</button>
    </div>
  ),
}))

vi.mock('@/components/pwa/PWAInstallPrompt', () => ({
  default: () => <div data-testid="pwa-prompt" />,
}))

const mockOnRequireBirth = vi.fn()
const mockOnOpenBirth = vi.fn()
vi.mock('@/app/(main)/components/HomeChatInput', () => ({
  default: ({ onRequireBirth, onOpenBirth, birthInfo, lightMode }: any) => (
    <div
      data-testid="home-chat-input"
      data-light={String(lightMode)}
      data-has-birth={String(!!birthInfo)}
    >
      <button onClick={() => onRequireBirth('what is my fortune')}>require-birth</button>
      <button onClick={() => onOpenBirth()}>chat-open-birth</button>
    </div>
  ),
}))

let savedHandler: ((info: any) => void) | null = null
let deletedHandler: (() => void) | null = null
vi.mock('@/app/(main)/components/BirthInfoModal', () => ({
  default: ({ open, onClose, onSaved, onDeleted }: any) => {
    savedHandler = onSaved
    deletedHandler = onDeleted
    return (
      <div data-testid="birth-modal" data-open={String(open)}>
        <button onClick={onClose}>modal-close</button>
        <button
          onClick={() =>
            onSaved({
              birthDate: '1995-02-09',
              birthTime: '06:40',
              gender: 'male',
              savedAt: '2026-01-01T00:00:00.000Z',
            })
          }
        >
          modal-save
        </button>
        <button onClick={onDeleted}>modal-delete</button>
      </div>
    )
  },
}))

vi.mock('@/components/branding/HexDPLogo', () => ({ default: () => <div data-testid="logo" /> }))

vi.mock('@/components/ui/AppHeader', () => ({
  AppHeader: ({ onMenuClick, rightSlot, centerSlot }: any) => (
    <header data-testid="app-header">
      <button onClick={onMenuClick}>menu</button>
      <span>{centerSlot}</span>
      {rightSlot}
    </header>
  ),
  AppHeaderIconButton: ({ onClick, children, label }: any) => (
    <button onClick={onClick} aria-label={label}>
      {children}
    </button>
  ),
}))

const mockGetStoredBirthInfo = vi.fn(() => null as any)
const mockBuildCounselorHref = vi.fn(() => '/counselor?x=1')
vi.mock('@/app/(main)/birthInfoStorage', () => ({
  getStoredBirthInfo: () => mockGetStoredBirthInfo(),
  saveBirthInfo: vi.fn(),
  buildCounselorHref: (...args: any[]) => mockBuildCounselorHref(...args),
  // buildBirthHref(서비스 딥링크)가 쓰는 헬퍼 — 쿼리 문자열만 만들면 충분.
  buildReportBirthQuery: (info: any, locale: string) =>
    info ? `date=${info.birthDate}&gender=${info.gender}&lang=${locale}` : `lang=${locale}`,
}))

import MainPageClient from '@/app/(main)/MainPageClient'

const baseMessages = {} as any

function renderPage() {
  return render(<MainPageClient initialLocale="en" initialMessages={baseMessages} />)
}

beforeEach(() => {
  mockUseSession.mockReturnValue({ status: 'unauthenticated' })
  mockI18n.locale = 'en'
  mockGetStoredBirthInfo.mockReturnValue(null)
  mockRouterPush.mockReset()
  mockBuildCounselorHref.mockClear()
  savedHandler = null
  deletedHandler = null
  ;(global.fetch as any) = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ user: {} }),
  })
})

afterEach(() => {
  cleanup()
})

describe('MainPageClient', () => {
  it('renders the hero, header and chat input for a guest with no saved birth info', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /Your Tarot, Astrology/i })).toBeInTheDocument()
    expect(screen.getByTestId('app-header')).toBeInTheDocument()
    expect(screen.getByTestId('home-chat-input')).toBeInTheDocument()
    // Guest, no birth → cosmic (not light) surface and CTA prompt visible.
    expect(screen.getByText(/Start by entering your birth details/i)).toBeInTheDocument()
    expect(screen.getByTestId('home-chat-input')).toHaveAttribute('data-light', 'false')
  })

  it('renders Korean copy when locale is ko', () => {
    mockI18n.locale = 'ko'
    renderPage()
    expect(screen.getByRole('heading', { name: /AI가 풀어내는 당신의 운명/ })).toBeInTheDocument()
    expect(screen.getByText(/먼저 생년월일을 입력하세요/)).toBeInTheDocument()
  })

  it('toggles locale via the header EN/KO button', () => {
    // locale=en → next label KO, aria '한국어로 전환'.
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '한국어로 전환' }))
    expect(mockSetLocale).toHaveBeenCalledWith('ko')
  })

  it('toggles locale to en when current locale is ko', () => {
    mockI18n.locale = 'ko'
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Switch to English' }))
    expect(mockSetLocale).toHaveBeenCalledWith('en')
  })

  it('opens the menu drawer and closes it', () => {
    renderPage()
    const drawer = screen.getByTestId('menu-drawer')
    expect(drawer).toHaveAttribute('data-open', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'menu' }))
    expect(screen.getByTestId('menu-drawer')).toHaveAttribute('data-open', 'true')
    fireEvent.click(screen.getByText('close-drawer'))
    expect(screen.getByTestId('menu-drawer')).toHaveAttribute('data-open', 'false')
  })

  it('opens birth modal from the CTA button', () => {
    renderPage()
    expect(screen.getByTestId('birth-modal')).toHaveAttribute('data-open', 'false')
    fireEvent.click(screen.getByText(/Start by entering your birth details/i))
    expect(screen.getByTestId('birth-modal')).toHaveAttribute('data-open', 'true')
  })

  it('renders all MORE_SERVICES entries (list open by default) and collapses on toggle', () => {
    renderPage()
    // 리포트 목록은 메인에서 기본 펼침(servicesOpen=true).
    const toggle = screen.getByRole('button', { name: /Explore readings/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Tarot Counselor')).toBeInTheDocument()
    expect(screen.getByText('Compatibility Report')).toBeInTheDocument()
    expect(screen.getByText('Fortune Calendar')).toBeInTheDocument()
    expect(screen.getByText('Saju · Astrology Report')).toBeInTheDocument()
    // Report link with no saved birth → bare /integrated-report deep link.
    const reportLink = screen.getByText('Saju · Astrology Report').closest('a')
    expect(reportLink?.getAttribute('href')).toContain('/integrated-report')
    expect(reportLink?.getAttribute('href')).toContain('lang=en')
    // 토글을 누르면 접힌다. (리렌더 후 노드를 새로 조회)
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: /Explore readings/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('clicking a service link collapses the list', () => {
    renderPage()
    // 기본 펼침 상태 → 서비스 링크를 누르면 목록이 접힌다.
    const tarotLink = screen.getByText('Tarot Counselor').closest('a')!
    fireEvent.click(tarotLink)
    expect(screen.getByRole('button', { name: /Explore readings/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('shows the premium-white surface and birth chip when birth info is stored', async () => {
    mockGetStoredBirthInfo.mockReturnValue({
      birthDate: '1995-02-09',
      birthTime: '06:40',
      gender: 'male',
      savedAt: '2026-01-01T00:00:00.000Z',
    })
    renderPage()
    // useEffect hydrates birthInfo from storage after mount.
    await waitFor(() =>
      expect(screen.getByTestId('home-chat-input')).toHaveAttribute('data-light', 'true')
    )
    // Chip shows the formatted subject (am time, gender).
    expect(screen.getByText(/Client:/)).toBeInTheDocument()
    expect(screen.getByText(/1995-02-09 6:40am \(M\)/)).toBeInTheDocument()
  })

  it('treats an authenticated user as premium-white and syncs the profile', async () => {
    mockUseSession.mockReturnValue({ status: 'authenticated' })
    renderPage()
    await waitFor(() =>
      expect(screen.getByTestId('home-chat-input')).toHaveAttribute('data-light', 'true')
    )
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith('/api/me/profile', expect.any(Object))
    )
  })

  it('routes to the counselor after saving birth info that came from a pending question', async () => {
    renderPage()
    // Fire the chat "require birth" path → remembers the question + opens modal.
    fireEvent.click(screen.getByText('require-birth'))
    expect(screen.getByTestId('birth-modal')).toHaveAttribute('data-open', 'true')
    // Now save in the modal → should push to the counselor href.
    fireEvent.click(screen.getByText('modal-save'))
    await waitFor(() => expect(mockBuildCounselorHref).toHaveBeenCalled())
    expect(mockRouterPush).toHaveBeenCalledWith('/counselor?x=1')
  })

  it('saving birth info opened via edit (no pending question) stays on the page', async () => {
    renderPage()
    fireEvent.click(screen.getByText(/Start by entering your birth details/i))
    fireEvent.click(screen.getByText('modal-save'))
    // No pending question → no router push to counselor.
    await waitFor(() =>
      expect(screen.getByTestId('home-chat-input')).toHaveAttribute('data-has-birth', 'true')
    )
    expect(mockBuildCounselorHref).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('clearing birth info removes the chip and resets to the CTA', async () => {
    mockGetStoredBirthInfo.mockReturnValue({
      birthDate: '1995-02-09',
      birthTime: '06:40',
      gender: 'male',
      savedAt: '2026-01-01T00:00:00.000Z',
    })
    renderPage()
    await waitFor(() => expect(screen.getByText(/Client:/)).toBeInTheDocument())
    fireEvent.click(screen.getByText('modal-delete'))
    await waitFor(() =>
      expect(screen.getByText(/Start by entering your birth details/i)).toBeInTheDocument()
    )
  })
})
