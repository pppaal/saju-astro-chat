import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}))

// Link mock keeps the test focused on the warning markup, not next/link routing.
vi.mock('next/link', () => ({
  default: ({ children, ...rest }: { children: React.ReactNode }) => (
    <a {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>{children}</a>
  ),
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
