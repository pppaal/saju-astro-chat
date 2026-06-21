import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

const mockI18n = {
  locale: 'en' as 'en' | 'ko',
  // t(path, fallback) → return the fallback so the localized strings show.
  t: (_path: string, fallback?: string) => fallback ?? _path,
}
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => mockI18n,
}))

vi.mock('@/app/policy/_components/policyDocument.module.css', () => ({
  default: new Proxy({}, { get: (_t, k: string) => k }),
}))

vi.mock('@/components/ui/ScrollToTop', () => ({
  default: ({ label }: any) => <button data-testid="scroll-to-top">{label}</button>,
}))

import PolicyDocument, {
  type PolicySection,
  type PolicyQuickSummary,
} from '@/app/policy/_components/PolicyDocument'

const sections: PolicySection[] = [
  {
    id: 'intro',
    title: 'Introduction',
    titleKo: '소개',
    body: 'English intro body',
    bodyKo: '한국어 소개 본문',
  },
  {
    id: 'data',
    title: 'Data Use',
    titleKo: '데이터 사용',
    body: 'How we use data',
    bodyKo: '데이터 사용 방법',
  },
  {
    id: 'refund',
    title: 'Refund Policy',
    titleKo: '환불 정책',
    body: 'Strict refund body',
    bodyKo: '엄격한 환불 본문',
    strict: true,
  },
]

const quickSummary: PolicyQuickSummary = {
  en: ['Summary line one', 'Summary line two'],
  ko: ['요약 한 줄', '요약 두 줄'],
}

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    titleKey: 'policy.terms.title',
    titleFallbackEn: 'Terms of Service',
    titleFallbackKo: '이용약관',
    effectiveDate: '2026-01-01',
    contactEmail: 'legal@destinypal.com',
    sections,
    ...overrides,
  }
}

beforeEach(() => {
  mockI18n.locale = 'en'
})

afterEach(() => {
  cleanup()
})

describe('PolicyDocument', () => {
  it('renders the English title, eyebrow default, effective date and contact', () => {
    render(<PolicyDocument {...baseProps()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeInTheDocument()
    expect(screen.getByText('DESTINYPAL · LEGAL')).toBeInTheDocument()
    // Effective date appears in the meta row and again in the footer addendum.
    expect(screen.getAllByText('2026-01-01', { exact: false }).length).toBeGreaterThan(0)
    expect(screen.getByText('legal@destinypal.com')).toBeInTheDocument()
    expect(screen.getByText('Effective date:')).toBeInTheDocument()
    expect(screen.getByText('Contact:')).toBeInTheDocument()
  })

  it('renders all non-strict section titles and bodies with numbering', () => {
    render(<PolicyDocument {...baseProps()} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Introduction' })).toBeInTheDocument()
    expect(screen.getByText('English intro body')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Data Use' })).toBeInTheDocument()
    expect(screen.getByText('How we use data')).toBeInTheDocument()
    // Numbering is zero-padded § labels.
    expect(screen.getByText('§ 01')).toBeInTheDocument()
    expect(screen.getByText('§ 02')).toBeInTheDocument()
    expect(screen.getByText('§ 03')).toBeInTheDocument()
  })

  it('renders strict sections inside a collapsible details/summary', () => {
    render(<PolicyDocument {...baseProps()} />)
    // Strict section title appears in the TOC and in the summary; the Expand
    // hint and the absence of an h2 confirm the collapsible rendering.
    expect(screen.getAllByText('Refund Policy').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Expand')).toBeInTheDocument()
    expect(screen.getByText('Strict refund body')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Refund Policy' })).toBeNull()
  })

  it('renders Korean titles/bodies and labels when locale is ko', () => {
    mockI18n.locale = 'ko'
    render(<PolicyDocument {...baseProps()} />)
    expect(screen.getByRole('heading', { level: 1, name: '이용약관' })).toBeInTheDocument()
    expect(screen.getAllByText('소개').length).toBeGreaterThan(0)
    expect(screen.getByText('한국어 소개 본문')).toBeInTheDocument()
    expect(screen.getByText('시행일:')).toBeInTheDocument()
    expect(screen.getByText('문의:')).toBeInTheDocument()
    expect(screen.getAllByText('환불 정책').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('자세히 보기')).toBeInTheDocument()
  })

  it('renders the table of contents links (desktop + mobile) for every section', () => {
    render(<PolicyDocument {...baseProps()} />)
    // Each section id appears in both the aside TOC and the mobile details TOC.
    const introLinks = screen.getAllByRole('link', { name: 'Introduction' })
    expect(introLinks.length).toBe(2)
    expect(introLinks[0].getAttribute('href')).toBe('#intro')
  })

  it('handles a TOC click: scrolls into view and updates history hash', () => {
    const scrollIntoView = vi.fn()
    const el = document.createElement('section')
    el.id = 'data'
    ;(el as any).scrollIntoView = scrollIntoView
    const getById = vi
      .spyOn(document, 'getElementById')
      .mockImplementation((id) => (id === 'data' ? el : null))
    const replaceState = vi.spyOn(history, 'replaceState').mockImplementation(() => {})

    render(<PolicyDocument {...baseProps()} />)
    const dataLink = screen.getAllByRole('link', { name: 'Data Use' })[0]
    fireEvent.click(dataLink)

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    expect(replaceState).toHaveBeenCalledWith(null, '', '#data')

    getById.mockRestore()
    replaceState.mockRestore()
  })

  it('renders the optional quick summary callout when provided', () => {
    render(
      <PolicyDocument
        {...baseProps({
          quickSummary,
          quickSummaryTitle: { en: 'At a glance', ko: '한눈에' },
        })}
      />
    )
    expect(screen.getByText('At a glance')).toBeInTheDocument()
    expect(screen.getByText('Summary line one')).toBeInTheDocument()
    expect(screen.getByText('Summary line two')).toBeInTheDocument()
  })

  it('falls back to default quick-summary title and ko lines', () => {
    mockI18n.locale = 'ko'
    render(<PolicyDocument {...baseProps({ quickSummary })} />)
    expect(screen.getByText('빠른 요약')).toBeInTheDocument()
    expect(screen.getByText('요약 한 줄')).toBeInTheDocument()
  })

  it('omits the quick summary callout when not provided', () => {
    render(<PolicyDocument {...baseProps()} />)
    expect(screen.queryByText('At a glance')).toBeNull()
    expect(screen.queryByText('Quick summary')).toBeNull()
  })

  it('uses i18n keys for effective-date and footer labels when provided', () => {
    render(
      <PolicyDocument
        {...baseProps({
          effectiveKey: 'policy.effective',
          footerKey: 'policy.footer',
        })}
      />
    )
    // t() returns the fallback; effectiveKey path resolves to 'Effective date'.
    expect(screen.getByText('Effective date:')).toBeInTheDocument()
    // Footer renders 'Addendum: <date>'.
    expect(screen.getByText(/Addendum/)).toBeInTheDocument()
  })

  it('renders a custom eyebrow when supplied and the ScrollToTop control', () => {
    render(<PolicyDocument {...baseProps({ eyebrow: 'CUSTOM EYEBROW' })} />)
    expect(screen.getByText('CUSTOM EYEBROW')).toBeInTheDocument()
    expect(screen.getByTestId('scroll-to-top')).toHaveTextContent('Top')
  })
})
