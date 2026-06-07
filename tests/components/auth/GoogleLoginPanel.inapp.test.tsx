import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react'

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}))

import { signIn } from 'next-auth/react'

// Link mock keeps the test focused on the warning markup, not next/link routing.
vi.mock('next/link', () => ({
  default: ({ children, ...rest }: { children: React.ReactNode }) => (
    <a {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>{children}</a>
  ),
}))

// The panel now pulls the warning copy through useI18n() (context), separate
// from its `locale` prop. Mock the provider with the real misc.json values for
// the two asserted keys, switching by a test-controlled locale.
const i18nState = vi.hoisted(() => ({ locale: 'ko' as 'ko' | 'en' }))

vi.mock('@/i18n/I18nProvider', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useI18n: () => ({
    locale: i18nState.locale,
    setLocale: vi.fn(),
    t: (key: string, fallback?: string) => {
      const dict = {
        ko: {
          'auth.inAppBrowserBlockedTitle': '이 화면에서는 Google 로그인이 차단됩니다.',
        },
        en: {
          'auth.inAppBrowserBlockedTitle': 'Google sign-in is blocked in this view.',
        },
      } as const
      return (dict[i18nState.locale] as Record<string, string>)[key] ?? fallback ?? key
    },
  }),
}))

import GoogleLoginPanel from '@/components/auth/GoogleLoginPanel'

const KAKAOTALK_UA =
  'Mozilla/5.0 (Linux; Android 13; SM-S908N) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120 Mobile Safari/537.36 KAKAOTALK 10.5.6'
const PLAIN_CHROME_UA =
  'Mozilla/5.0 (Linux; Android 13; SM-S908N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'

function withUserAgent(ua: string, fn: () => void) {
  const original = Object.getOwnPropertyDescriptor(window.navigator, 'userAgent')
  Object.defineProperty(window.navigator, 'userAgent', {
    value: ua,
    configurable: true,
  })
  try {
    fn()
  } finally {
    if (original) {
      Object.defineProperty(window.navigator, 'userAgent', original)
    }
  }
}

describe('GoogleLoginPanel — in-app browser warning', () => {
  beforeEach(() => {
    cleanup()
    i18nState.locale = 'ko'
  })
  afterEach(() => {
    cleanup()
  })

  it('renders the warning when opened in a blocked in-app browser', () => {
    // Regression: a referral-link friend hit Google's 403 disallowed_useragent
    // page after opening `/?ref=CODE` inside KakaoTalk's webview. The panel
    // must surface a warning + "open in browser" guidance BEFORE the user
    // taps Google sign-in, since there's no way back from Google's error.
    withUserAgent(KAKAOTALK_UA, () => {
      act(() => {
        render(<GoogleLoginPanel locale="ko" />)
      })
      expect(screen.getByTestId('inapp-browser-warning')).toBeInTheDocument()
      expect(screen.getByTestId('inapp-browser-warning')).toHaveTextContent(
        'Google 로그인이 차단됩니다'
      )
    })
  })

  it('does NOT render the warning in a normal mobile browser', () => {
    withUserAgent(PLAIN_CHROME_UA, () => {
      act(() => {
        render(<GoogleLoginPanel locale="ko" />)
      })
      expect(screen.queryByTestId('inapp-browser-warning')).not.toBeInTheDocument()
    })
  })

  it('shows English copy when locale=en', () => {
    i18nState.locale = 'en'
    withUserAgent(KAKAOTALK_UA, () => {
      act(() => {
        render(<GoogleLoginPanel locale="en" />)
      })
      expect(screen.getByTestId('inapp-browser-warning')).toHaveTextContent(
        'Google sign-in is blocked'
      )
    })
  })
})

// Mutable window.location stand-in so we can observe redirect assignments
// without jsdom throwing on real navigation.
function withLocation(href: string, origin: string, fn: (loc: { href: string }) => void) {
  const original = Object.getOwnPropertyDescriptor(window, 'location')
  const loc = { href, origin }
  Object.defineProperty(window, 'location', { value: loc, configurable: true, writable: true })
  try {
    fn(loc)
  } finally {
    if (original) Object.defineProperty(window, 'location', original)
  }
}

describe('GoogleLoginPanel — in-app sign-in redirect', () => {
  beforeEach(() => {
    cleanup()
    i18nState.locale = 'ko'
    vi.mocked(signIn).mockClear()
  })
  afterEach(() => cleanup())

  it('redirects to the KakaoTalk external-browser scheme instead of calling signIn', () => {
    withUserAgent(KAKAOTALK_UA, () => {
      withLocation('https://app.example.com/?ref=ABC', 'https://app.example.com', (loc) => {
        act(() => {
          render(<GoogleLoginPanel locale="ko" callbackUrl="/dashboard" />)
        })
        // 약관 동의 후 Google 버튼 탭 → 인앱이면 외부 브라우저로 점프해야 함.
        fireEvent.click(screen.getByRole('checkbox'))
        fireEvent.click(screen.getByRole('button', { name: 'Google로 로그인' }))

        expect(loc.href).toContain('kakaotalk://web/openExternal')
        expect(loc.href).toContain(encodeURIComponent('https://app.example.com/auth/signin'))
        expect(signIn).not.toHaveBeenCalled()
      })
    })
  })

  it('calls signIn normally in a regular mobile browser', () => {
    withUserAgent(PLAIN_CHROME_UA, () => {
      withLocation('https://app.example.com/', 'https://app.example.com', () => {
        act(() => {
          render(<GoogleLoginPanel locale="ko" callbackUrl="/dashboard" />)
        })
        fireEvent.click(screen.getByRole('checkbox'))
        fireEvent.click(screen.getByRole('button', { name: 'Google로 로그인' }))

        expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' })
      })
    })
  })
})
