// tests/app/MainPageClient.test.tsx
//
// v9.2 홈 — #home-headline 하나, 손님 CTA → 출생 모달, CTA 에서 저장하면 리포트로(상담사 아님),
// 저장된 출생 정보 → 'Open my full card' 링크 + 'Edit birth details', 삭제하면 손님 CTA 로,
// 로그인 사용자 프로필 동기화, 언어 토글, Sign in / Menu 드로어, 띠 범례 한 번 · 다이얼 = 주입한 now.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'

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

vi.mock('@vercel/speed-insights/next', () => ({ SpeedInsights: () => null }))
vi.mock('@/components/PrefetchLinks', () => ({ default: () => <div data-testid="prefetch" /> }))
vi.mock('@/components/pwa/PWAInstallPrompt', () => ({
  default: () => <div data-testid="pwa-prompt" />,
}))

vi.mock('@/components/ui/MenuDrawerPanel', () => ({
  MenuDrawerPanel: ({ open, onClose, initialLoginOpen, variant }: any) => (
    <div
      data-testid="menu-drawer"
      data-open={String(open)}
      data-login={String(!!initialLoginOpen)}
      data-variant={variant}
    >
      <button onClick={onClose}>close-drawer</button>
    </div>
  ),
}))

vi.mock('@/components/birth/BirthInfoModal', () => ({
  default: ({ open, onClose, onSaved, onDeleted }: any) => (
    <div data-testid="birth-modal" data-open={String(open)}>
      <button onClick={onClose}>modal-close</button>
      <button
        onClick={() =>
          onSaved({
            birthDate: '1995-02-09',
            birthTime: '06:40',
            birthTimeUnknown: false,
            gender: 'male',
            city: 'Busan, KR',
            latitude: 35.1796,
            longitude: 129.0756,
            timeZone: 'Asia/Seoul',
            savedAt: '2026-01-01T00:00:00.000Z',
          })
        }
      >
        modal-save
      </button>
      <button onClick={onDeleted}>modal-delete</button>
    </div>
  ),
}))

const mockTrackFunnel = vi.fn()
vi.mock('@/lib/metrics/trackFunnel', () => ({
  trackFunnel: (e: string) => mockTrackFunnel(e),
}))

const mockGetStoredBirthInfo = vi.fn(() => null as any)
const mockBuildCounselorHref = vi.fn()
vi.mock('@/lib/birth/storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/birth/storage')>('@/lib/birth/storage')
  return {
    ...actual,
    getStoredBirthInfo: () => mockGetStoredBirthInfo(),
    saveBirthInfo: vi.fn(),
    buildCounselorHref: (...args: Parameters<typeof actual.buildCounselorHref>) => {
      mockBuildCounselorHref(...args)
      return actual.buildCounselorHref(...args)
    },
  }
})

import MainPageClient from '@/app/(main)/MainPageClient'
import { buildHomeDial } from '@/app/(main)/home/homeDial'

const STORED = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  birthTimeUnknown: false,
  gender: 'male' as const,
  city: 'Busan, KR',
  savedAt: '2026-01-01T00:00:00.000Z',
}

function renderPage(nowIso = '2026-11-19T03:00:00.000Z', timeZone = 'Asia/Seoul') {
  const home = buildHomeDial({ now: new Date(nowIso), timeZone })
  return render(<MainPageClient initialLocale="en" dial={home.dial} backYear={home.backYear} />)
}

beforeEach(() => {
  mockUseSession.mockReturnValue({ status: 'unauthenticated' })
  mockI18n.locale = 'en'
  mockGetStoredBirthInfo.mockReturnValue(null)
  mockRouterPush.mockReset()
  mockBuildCounselorHref.mockClear()
  mockTrackFunnel.mockClear()
  mockSetLocale.mockClear()
  window.history.replaceState(null, '', '/')
  ;(global.fetch as any) = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ user: {} }),
  })
})

afterEach(() => {
  cleanup()
})

describe('MainPageClient — v9.2 home', () => {
  it('renders one #home-headline with the v9 hook and the guest CTA (en)', () => {
    const { container } = renderPage()
    expect(container.querySelectorAll('#home-headline')).toHaveLength(1)
    // '—' 와 'you.' 는 줄바꿈 없는 공백으로 묶였다(QA VH-7), 밑줄은 마침표까지(VH-9).
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Saju and the stars, strangely, describe the same person —\u00a0you.'
    )
    expect(container.querySelector('#home-headline span')?.textContent).toBe('you.')
    expect(screen.getByRole('button', { name: /Get my free Saju Card/ })).toBeInTheDocument()
    // 고정 입력창(채팅 바)은 없다.
    expect(container.querySelector('textarea')).toBeNull()
    // 샘플 폴리오 — 스탬프 + Sample, 화면에 두 번(위 · 푸터 위).
    expect(container.querySelectorAll('[data-folio]')).toHaveLength(2)
    expect(container.querySelector('[data-folio="top"]')!.textContent).toContain(
      '1997.3.21 14:30 · Seoul'
    )
    expect(container.querySelector('[data-folio="top"]')!.textContent).toContain('Sample')
    // 끝 폴리오도 샘플 스탬프라 SAMPLE 을 단다(QA-1).
    expect(container.querySelector('[data-folio="end"]')!.textContent).toContain('Sample')
    // 손님에겐 디자인 그대로 'Your free Saju Card'.
    expect(
      container.querySelector('[data-home-card-label]')!.getAttribute('data-home-card-label')
    ).toBe('yours')
    expect(screen.getByText('Your free Saju Card')).toBeInTheDocument()
  })

  it('renders Korean copy when locale is ko', () => {
    mockI18n.locale = 'ko'
    const { container } = renderPage()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      '사주도 별자리도, 이상하게 너를 같은 사람이라 말해.'
    )
    expect(screen.getByRole('button', { name: /내 무료 사주 카드 받기/ })).toBeInTheDocument()
    expect(container.querySelector('[data-folio="top"]')!.textContent).toContain(
      '1997년 3월 21일 14:30 · 서울'
    )
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
  })

  it('the guest CTA opens the birth modal and tracks home.cta_clicked', () => {
    renderPage()
    expect(screen.getByTestId('birth-modal')).toHaveAttribute('data-open', 'false')
    fireEvent.click(screen.getByRole('button', { name: /Get my free Saju Card/ }))
    expect(screen.getByTestId('birth-modal')).toHaveAttribute('data-open', 'true')
    expect(mockTrackFunnel).toHaveBeenCalledWith('home.cta_clicked')
  })

  it('saving from the CTA pushes the report URL with the birth query, not the counselor', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Get my free Saju Card/ }))
    fireEvent.click(screen.getByText('modal-save'))
    await waitFor(() => expect(mockRouterPush).toHaveBeenCalledTimes(1))
    const url = mockRouterPush.mock.calls[0][0] as string
    expect(url.startsWith('/integrated-report?')).toBe(true)
    const p = new URLSearchParams(url.split('?')[1])
    expect(p.get('date')).toBe('1995-02-09')
    expect(p.get('time')).toBe('06:40')
    expect(p.get('tz')).toBe('Asia/Seoul')
    expect(p.get('gender')).toBe('male')
    expect(p.get('lang')).toBe('en')
    // 상담사로 보내지 않는다 — 상담사 주소는 카드 다음 CTA 링크(렌더)에만 쓰인다.
    expect(mockRouterPush).not.toHaveBeenCalledWith(expect.stringContaining('/destiny-counselor'))
    expect(mockTrackFunnel).toHaveBeenCalledWith('home.birth_saved')
  })

  it('stored birth info shows "Open my full card" and "Edit birth details"', async () => {
    mockGetStoredBirthInfo.mockReturnValue(STORED)
    renderPage()
    const open = await screen.findByRole('link', { name: /Open my full card/ })
    const href = open.getAttribute('href')!
    expect(href.startsWith('/integrated-report?')).toBe(true)
    expect(href).toContain('date=1995-02-09')
    expect(screen.getByRole('button', { name: 'Edit birth details' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Get my free Saju Card/ })).toBeNull()
    // formatBirthStamp — 24시간 · 도시 첫 마디.
    expect(screen.getByText('1995.2.9 06:40 · Busan')).toBeInTheDocument()
  })

  it('stored birth info: the card is labelled as a sample, never as "your" card (QA-1)', async () => {
    mockGetStoredBirthInfo.mockReturnValue(STORED)
    const { container } = renderPage()
    await screen.findByRole('link', { name: /Open my full card/ })
    const label = container.querySelector('[data-home-card-label]')!
    expect(label.getAttribute('data-home-card-label')).toBe('sample')
    expect(label.textContent).toContain('Sample Saju Card')
    expect(label.textContent).toContain('A sample card — open yours above.')
    expect(label.textContent).not.toContain('Your free Saju Card')
    // 두 폴리오 모두 샘플 스탬프 + SAMPLE.
    for (const pos of ['top', 'end']) {
      const folio = container.querySelector(`[data-folio="${pos}"]`)!
      expect(folio.textContent).toContain('1997.3.21 14:30 · Seoul')
      expect(folio.textContent).toContain('Sample')
    }
    cleanup()
    mockI18n.locale = 'ko'
    const ko = renderPage().container
    await screen.findByRole('link', { name: /내 전체 카드 보기/ })
    expect(ko.querySelector('[data-home-card-label]')!.textContent).toContain('샘플 사주 카드')
  })

  it('editing stored birth info stays on the page', async () => {
    mockGetStoredBirthInfo.mockReturnValue(STORED)
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit birth details' }))
    expect(screen.getByTestId('birth-modal')).toHaveAttribute('data-open', 'true')
    fireEvent.click(screen.getByText('modal-save'))
    await waitFor(() =>
      expect(screen.getByTestId('birth-modal')).toHaveAttribute('data-open', 'false')
    )
    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(mockTrackFunnel).not.toHaveBeenCalledWith('home.birth_saved')
  })

  it('deleting birth info resets to the guest CTA', async () => {
    mockGetStoredBirthInfo.mockReturnValue(STORED)
    renderPage()
    await screen.findByRole('button', { name: 'Edit birth details' })
    fireEvent.click(screen.getByText('modal-delete'))
    expect(await screen.findByRole('button', { name: /Get my free Saju Card/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit birth details' })).toBeNull()
  })

  it('?openBirth=1 opens the birth modal on mount', async () => {
    window.history.replaceState(null, '', '/?openBirth=1')
    renderPage()
    await waitFor(() =>
      expect(screen.getByTestId('birth-modal')).toHaveAttribute('data-open', 'true')
    )
  })

  it('authenticated users trigger the /api/me/profile sync and see Menu', async () => {
    mockUseSession.mockReturnValue({ status: 'authenticated' })
    renderPage()
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith('/api/me/profile', expect.any(Object))
    )
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    const drawer = screen.getByTestId('menu-drawer')
    expect(drawer).toHaveAttribute('data-open', 'true')
    expect(drawer).toHaveAttribute('data-login', 'false')
    expect(drawer).toHaveAttribute('data-variant', 'light')
  })

  it('the Sign in pill opens the drawer on the login panel for guests', () => {
    renderPage()
    expect(screen.getByTestId('menu-drawer')).toHaveAttribute('data-open', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    const drawer = screen.getByTestId('menu-drawer')
    expect(drawer).toHaveAttribute('data-open', 'true')
    expect(drawer).toHaveAttribute('data-login', 'true')
    expect(mockTrackFunnel).toHaveBeenCalledWith('home.signin_clicked')
    fireEvent.click(screen.getByText('close-drawer'))
    expect(screen.getByTestId('menu-drawer')).toHaveAttribute('data-open', 'false')
  })

  it('the locale toggle calls setLocale (en → ko, ko → en); its name starts with the visible label', () => {
    renderPage()
    // WCAG 2.5.3 — 이름이 보이는 글자 'KO' 로 시작하고, 설명은 바꿀 언어의 lang 으로.
    const toKo = screen.getByRole('button', { name: 'KO 한국어로 전환' })
    expect(toKo.querySelector('[lang="ko"]')?.textContent?.trim()).toBe('한국어로 전환')
    fireEvent.click(toKo)
    expect(mockSetLocale).toHaveBeenCalledWith('ko')
    cleanup()
    mockI18n.locale = 'ko'
    renderPage()
    const toEn = screen.getByRole('button', { name: 'EN Switch to English' })
    expect(toEn.querySelector('[lang="en"]')).not.toBeNull()
    fireEvent.click(toEn)
    expect(mockSetLocale).toHaveBeenCalledWith('en')
  })

  it('header nav carries an <a> (wordmark) — homepage.spec counts nav/header links', () => {
    const { container } = renderPage()
    expect(container.querySelectorAll('header nav a').length).toBeGreaterThan(0)
  })

  it('explore rows link to the products and track their funnel event', () => {
    const { container } = renderPage()
    const hrefOf = (id: string) =>
      container.querySelector(`[data-explore="${id}"]`)!.getAttribute('href')
    expect(hrefOf('life')).toBe('/destiny?lang=en')
    expect(hrefOf('calendar')).toBe('/calendar?lang=en')
    expect(hrefOf('tarot')).toBe('/tarot')
    expect(hrefOf('compat')).toBe('/compatibility/free')
    expect(hrefOf('report')).toBe('/integrated-report?lang=en')
    expect(hrefOf('counselor')).toBe('/destiny-counselor')
    fireEvent.click(container.querySelector('[data-explore="tarot"]')!)
    expect(mockTrackFunnel).toHaveBeenCalledWith('home.explore.tarot')
  })

  it('keeps a paid counselor entry after the card, with SSOT prices', async () => {
    mockGetStoredBirthInfo.mockReturnValue(STORED)
    const { container } = renderPage()
    const cta = container.querySelector('[data-home-counselor]') as HTMLAnchorElement
    expect(cta.textContent).toBe('Ask the destiny counselor')
    await waitFor(() => expect(cta.getAttribute('href')).toContain('/destiny-counselor?'))
    expect(cta.getAttribute('href')).toContain('birthDate=1995-02-09')
    expect(mockBuildCounselorHref).toHaveBeenCalled()
    const price = cta.parentElement!.querySelector('[data-price-line]')!
    expect(price.textContent).toContain('From 1 credit')
    expect(price.textContent).toMatch(/Credits from \$\d/)
    fireEvent.click(cta)
    expect(mockTrackFunnel).toHaveBeenCalledWith('home.counselor_cta')
  })

  it('the band shows the sample trait rows without marks and no ▲/▼ legend (QA VH-2)', () => {
    const { container } = renderPage()
    // 축 행엔 마크가 없으므로 타이밍 범례도 없다(parts9 'No ▲/▼ here').
    expect(container.querySelectorAll('[data-legend]')).toHaveLength(0)
    const step3 = container.querySelector('[data-step="03"]') as HTMLElement
    const rows = step3.querySelectorAll('[data-kind="trait"]')
    expect(rows).toHaveLength(2)
    expect(within(step3).getByText('Identity')).toBeInTheDocument()
    expect(within(step3).getByText('Temperament')).toBeInTheDocument()
    expect(step3.querySelectorAll('[data-kind="timing"]')).toHaveLength(0)
  })

  it('the dial and the card back come from the injected now (立春 2027-02-04 in Seoul)', () => {
    const before = renderPage('2027-02-03T03:00:00.000Z')
    expect(before.container.querySelector('[data-dial]')!.getAttribute('data-dial')).toBe('丙午')
    expect(before.container.querySelector('[data-card-back]')!.textContent).toContain('丙午 · 2026')
    cleanup()
    const after = renderPage('2027-02-04T03:00:00.000Z')
    expect(after.container.querySelector('[data-dial]')!.getAttribute('data-dial')).toBe('丁未')
    expect(after.container.querySelector('[data-card-back]')!.textContent).toContain('丁未 · 2027')
  })
})
