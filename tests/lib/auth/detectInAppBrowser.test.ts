import { describe, it, expect } from 'vitest'
import { isInAppBrowserUA } from '@/lib/auth/detectInAppBrowser'

// Regression: a referral-link friend opened `/?ref=CODE` inside KakaoTalk's
// embedded webview, clicked "Continue with Google", and Google replied with
// `403 disallowed_useragent / 액세스 차단됨`. We can't unblock Google's policy,
// but we can detect the same UAs Google does and route users to a real
// browser before they ever hit the OAuth handoff. These cases lock in the
// detection so the warning doesn't silently regress when the marker list
// drifts.
describe('isInAppBrowserUA', () => {
  it('flags KakaoTalk webview', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13; SM-S908N) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 KAKAOTALK 10.5.6'
    expect(isInAppBrowserUA(ua)).toBe(true)
  })

  it('flags NAVER in-app browser', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NAVER(inapp; search; 2000; 12.6.5)'
    expect(isInAppBrowserUA(ua)).toBe(true)
  })

  it('flags Facebook in-app browser variants', () => {
    expect(
      isInAppBrowserUA(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/450.0]'
      )
    ).toBe(true)
    expect(
      isInAppBrowserUA(
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0]'
      )
    ).toBe(true)
  })

  it('flags Instagram webview', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 312.0.0.34.111'
    expect(isInAppBrowserUA(ua)).toBe(true)
  })

  it('flags Line webview', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 Line/13.10.0'
    expect(isInAppBrowserUA(ua)).toBe(true)
  })

  it('flags WeChat (micromessenger)', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 MicroMessenger/8.0.49'
    expect(isInAppBrowserUA(ua)).toBe(true)
  })

  it('does NOT flag plain Mobile Safari', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    expect(isInAppBrowserUA(ua)).toBe(false)
  })

  it('does NOT flag plain Chrome on Android', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13; SM-S908N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    expect(isInAppBrowserUA(ua)).toBe(false)
  })

  it('does NOT flag desktop Chrome', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    expect(isInAppBrowserUA(ua)).toBe(false)
  })

  it('flags generic Android WebView (자사 Capacitor 포함) via "; wv)" token', () => {
    // Android WebView UA 는 "...; wv) AppleWebKit..." 형태. Google OAuth 가
    // 모든 webview 를 차단하므로 특정 앱 열거 대신 이 공통 표식으로 잡는다.
    const ua =
      'Mozilla/5.0 (Linux; Android 13; SM-S908N; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36'
    expect(isInAppBrowserUA(ua)).toBe(true)
  })

  it('handles empty UA without throwing', () => {
    expect(isInAppBrowserUA('')).toBe(false)
  })
})
