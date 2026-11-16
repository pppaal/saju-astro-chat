/**
 * Footer / GlobalHeader — 경로 판정이 /ko 프리픽스에도 같게 동작하는지,
 * 그리고 푸터가 홈에서 보이며 크롤러용 "Explore" 링크 블록을 싣는지 검증.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import React from 'react'

const { pathnameMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn<() => string>(() => '/'),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
  signOut: vi.fn(),
}))

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({
    locale: 'en',
    language: 'en',
    translate: (_key: string, fallback?: string) => fallback ?? _key,
    t: (_key: string, fallback?: string) => fallback ?? _key,
    setLocale: vi.fn(),
    dir: 'ltr',
    hydrated: true,
  }),
}))

import Footer from '@/components/ui/Footer'
import GlobalHeader from '@/components/ui/GlobalHeader'

const EXPLORE = [
  ['Daily Horoscope', '/horoscope'],
  ['Zodiac Compatibility', '/compatibility/signs'],
  ['Tarot Card Meanings', '/tarot/cards'],
  ['Korean Zodiac Today', '/fortune'],
  ['Free Birth Chart', '/integrated-report'],
  ['Compatibility Report', '/compatibility/free'],
  ["Today's Tarot", '/tarot/daily'],
  ['Guides', '/blog'],
  ['How it works', '/method'],
  ['Free tools', '/free'],
] as const

describe('Footer', () => {
  beforeEach(() => {
    cleanup()
    pathnameMock.mockReturnValue('/')
  })

  it('일반 페이지(/blog) 에서 렌더되고 Explore 링크 10개를 전부 싣는다', () => {
    pathnameMock.mockReturnValue('/blog')
    render(<Footer />)
    const nav = screen.getByRole('navigation', { name: 'Explore' })
    expect(nav).toBeInTheDocument()
    for (const [label, href] of EXPLORE) {
      const link = screen.getByRole('link', { name: label })
      expect(link).toHaveAttribute('href', href)
    }
  })

  it('홈(/) 은 고정 앱 셸이라 숨긴다 — 홈은 자체 Explore 줄을 가진다', () => {
    const { container } = render(<Footer />)
    expect(container.querySelector('footer')).toBeNull()
  })

  it('/ko (한국어 홈) 에서도 베어 홈과 똑같이 숨긴다', () => {
    pathnameMock.mockReturnValue('/ko')
    const { container } = render(<Footer />)
    expect(container.querySelector('footer')).toBeNull()
  })

  it('몰입형 라우트에서는 숨는다 — 베어 경로와 /ko 경로 모두', () => {
    pathnameMock.mockReturnValue('/tarot/daily')
    const bare = render(<Footer />)
    expect(bare.container.querySelector('footer')).toBeNull()
    cleanup()

    pathnameMock.mockReturnValue('/ko/tarot/daily')
    const ko = render(<Footer />)
    expect(ko.container.querySelector('footer')).toBeNull()
    cleanup()

    pathnameMock.mockReturnValue('/ko/calendar')
    const koCal = render(<Footer />)
    expect(koCal.container.querySelector('footer')).toBeNull()
  })

  it('/ko/blog 같은 일반 페이지에서는 보인다', () => {
    pathnameMock.mockReturnValue('/ko/blog')
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'Guides' })).toHaveAttribute('href', '/blog')
    // Privacy 는 데스크톱 링크줄 + 모바일 전용 법적 링크줄에 한 번씩(2개) 있다.
    const privacyLinks = screen.getAllByRole('link', { name: 'Privacy' })
    expect(privacyLinks.length).toBeGreaterThan(0)
    for (const link of privacyLinks) {
      expect(link).toHaveAttribute('href', '/policy/privacy')
    }
  })
})

describe('GlobalHeader — /ko 프리픽스 경로 판정', () => {
  beforeEach(() => {
    cleanup()
    pathnameMock.mockReturnValue('/blog')
  })

  it('/ko (한국어 홈) 에서는 베어 홈과 똑같이 숨는다', () => {
    pathnameMock.mockReturnValue('/')
    const bare = render(<GlobalHeader />)
    expect(bare.container.querySelector('[role="banner"]')).toBeNull()
    cleanup()

    pathnameMock.mockReturnValue('/ko')
    const ko = render(<GlobalHeader />)
    expect(ko.container.querySelector('[role="banner"]')).toBeNull()
  })

  it('/ko/calendar 에서도 캘린더처럼 숨는다', () => {
    pathnameMock.mockReturnValue('/ko/calendar')
    const { container } = render(<GlobalHeader />)
    expect(container.querySelector('[role="banner"]')).toBeNull()
  })

  it('/ko/blog 에서는 일반 페이지처럼 헤더를 그린다', () => {
    pathnameMock.mockReturnValue('/ko/blog')
    render(<GlobalHeader />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })
})
