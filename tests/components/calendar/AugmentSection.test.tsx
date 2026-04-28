// tests/components/calendar/AugmentSection.test.tsx
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import AugmentSection from '@/components/calendar/AugmentSection'
import { clearAugmentCache } from '@/components/calendar/useAugmentFetch'
import type { BirthInfo } from '@/components/calendar/types'

let currentLocale: 'en' | 'ko' = 'ko'

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: currentLocale }),
}))

const mockFetch = vi.fn()
;(global as unknown as { fetch: typeof mockFetch }).fetch = mockFetch

const validBirth: BirthInfo = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  birthPlace: '서울',
  gender: 'Male',
  timezone: 'Asia/Seoul',
  latitude: 37.5665,
  longitude: 126.978,
}

const idleBirth: BirthInfo = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  birthPlace: '서울',
  gender: 'Male',
  timezone: 'Asia/Seoul',
  // no lat/lng → idle
}

const fakeData = {
  themes: [{ id: 'theme.x', meaning: '테스트 테마', narrative: '테스트 내러티브' }],
  domains: [
    { domain: 'self', tone: 'positive', topConfirms: [{ meaning: '확신', intensity: 'strong' }], dualSignals: [], hasConflict: false },
    { domain: 'love', tone: 'neutral', topConfirms: [], dualSignals: [], hasConflict: false },
    { domain: 'money', tone: 'neutral', topConfirms: [], dualSignals: [], hasConflict: false },
    { domain: 'career', tone: 'neutral', topConfirms: [], dualSignals: [], hasConflict: false },
    { domain: 'health', tone: 'neutral', topConfirms: [], dualSignals: [], hasConflict: false },
    { domain: 'family', tone: 'neutral', topConfirms: [], dualSignals: [], hasConflict: false },
  ],
  context: { ageYears: 30 },
}

describe('AugmentSection', () => {
  beforeEach(() => {
    currentLocale = 'ko'
    clearAugmentCache()
    mockFetch.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('returns null when birth has no lat/lng (idle) and hideOnIdle=true', () => {
    const { container } = render(
      <AugmentSection birthInfo={idleBirth} scope="monthly" year={2026} month={4} />
    )
    expect(container.firstChild).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('shows skeleton with aria-busy while loading (ko)', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // pending forever

    const { container } = render(
      <AugmentSection birthInfo={validBirth} scope="monthly" year={2026} month={4} />
    )

    const busy = container.querySelector('[aria-busy="true"]')
    expect(busy).toBeInTheDocument()
    expect(busy).toHaveAttribute('aria-label', '운세 데이터 불러오는 중')
  })

  it('shows skeleton with English aria-label when locale=en', () => {
    currentLocale = 'en'
    mockFetch.mockImplementation(() => new Promise(() => {}))

    const { container } = render(
      <AugmentSection birthInfo={validBirth} scope="monthly" year={2026} month={4} />
    )

    const busy = container.querySelector('[aria-busy="true"]')
    expect(busy).toHaveAttribute('aria-label', 'Loading fortune data')
  })

  it('renders ready card after successful fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: fakeData }),
    })

    render(<AugmentSection birthInfo={validBirth} scope="monthly" year={2026} month={4} />)

    await waitFor(() => {
      expect(screen.getByText('테스트 테마')).toBeInTheDocument()
    })
    expect(screen.getByText('테스트 내러티브')).toBeInTheDocument()
  })

  it('renders error UI when fetch fails (ko)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    })

    render(<AugmentSection birthInfo={validBirth} scope="monthly" year={2026} month={4} />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/큰 흐름 데이터를 불러오지 못했어요/)).toBeInTheDocument()
  })

  it('renders error UI in English when locale=en', async () => {
    currentLocale = 'en'
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    })

    render(<AugmentSection birthInfo={validBirth} scope="monthly" year={2026} month={4} />)

    await waitFor(() => {
      expect(screen.getByText(/Couldn't load augment data/)).toBeInTheDocument()
    })
  })

  it('passes scopeLabel through to the rendered card', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: fakeData }),
    })

    render(
      <AugmentSection
        birthInfo={validBirth}
        scope="daily"
        queryDate="2026-04-28"
        scopeLabel="2026-04-28 일진 흐름"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('2026-04-28 일진 흐름')).toBeInTheDocument()
    })
  })

  it('calls /api/calendar/cross-augment with proper payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: fakeData }),
    })

    render(<AugmentSection birthInfo={validBirth} scope="monthly" year={2026} month={4} />)

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/calendar/cross-augment')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body)
    expect(body.scope).toBe('monthly')
    expect(body.year).toBe(2026)
    expect(body.month).toBe(4)
    expect(body.birth.gender).toBe('male') // lowercased
    expect(body.birth.latitude).toBe(37.5665)
  })

  it('caches successful responses (no re-fetch on identical input)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: fakeData }),
    })

    const { unmount } = render(
      <AugmentSection birthInfo={validBirth} scope="monthly" year={2026} month={4} />
    )

    await waitFor(() => expect(screen.getByText('테스트 테마')).toBeInTheDocument())
    unmount()

    // Re-mount with identical input — cache should serve, no second fetch.
    render(<AugmentSection birthInfo={validBirth} scope="monthly" year={2026} month={4} />)
    expect(screen.getByText('테스트 테마')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('applies compact wrapper class when variant=compact', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))

    const { container } = render(
      <AugmentSection
        birthInfo={validBirth}
        scope="daily"
        queryDate="2026-04-28"
        variant="compact"
      />
    )

    // skeleton element should have compact class hashed in
    const busy = container.querySelector('[aria-busy="true"]')
    expect(busy?.className).toMatch(/compact/)
  })
})
