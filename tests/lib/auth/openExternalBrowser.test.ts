/**
 * Tests for src/lib/auth/openExternalBrowser.ts
 * 인앱 브라우저 → 외부 브라우저 점프 헬퍼. 플랫폼별 분기(카톡/안드/iOS)와
 * 인앱이 아닌 경우, callbackUrl 보존을 검증한다.
 *
 * 전략: navigator.userAgent 를 defineProperty 로 바꿔 isInAppBrowserUA(실모듈)
 * 가 실제 마커를 보게 하고, window.location.href setter 를 가로채 어떤 스킴으로
 * 점프하는지 확인한다. (detectInAppBrowser 는 모킹하지 않는다 — 실제 분기 검증.)
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openInExternalBrowser } from '@/lib/auth/openExternalBrowser'

const UA_KAKAO =
  'Mozilla/5.0 (Linux; Android 13; SM-S908N) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 KAKAOTALK 10.5.6'
const UA_KAKAO_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 KAKAOTALK 10.5.6'
const UA_FB_ANDROID =
  'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0]'
const UA_INSTAGRAM_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 312.0.0.34.111'
const UA_PLAIN_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

let hrefValue = ''
const origUaDescriptor = Object.getOwnPropertyDescriptor(globalThis.navigator, 'userAgent')

function setUA(ua: string) {
  Object.defineProperty(globalThis.navigator, 'userAgent', {
    value: ua,
    configurable: true,
  })
}

function installLocation(origin = 'https://destinypal.com', href = 'https://destinypal.com/start') {
  hrefValue = href
  const locationStub = {
    get origin() {
      return origin
    },
    get href() {
      return hrefValue
    },
    set href(v: string) {
      hrefValue = v
    },
  }
  Object.defineProperty(globalThis, 'location', {
    value: locationStub,
    configurable: true,
  })
  Object.defineProperty(globalThis.window, 'location', {
    value: locationStub,
    configurable: true,
  })
}

describe('openInExternalBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installLocation()
  })

  afterEach(() => {
    if (origUaDescriptor) {
      Object.defineProperty(globalThis.navigator, 'userAgent', origUaDescriptor)
    }
  })

  it("인앱 브라우저가 아니면 'not-in-app' 이고 점프하지 않는다", () => {
    setUA(UA_PLAIN_SAFARI)
    const before = hrefValue
    const result = openInExternalBrowser('/dashboard')
    expect(result).toBe('not-in-app')
    expect(hrefValue).toBe(before)
  })

  it("KakaoTalk(Android) 은 kakaotalk:// 스킴으로 점프하며 'redirected'", () => {
    setUA(UA_KAKAO)
    const result = openInExternalBrowser('/dashboard')
    expect(result).toBe('redirected')
    expect(hrefValue.startsWith('kakaotalk://web/openExternal?url=')).toBe(true)
  })

  it('KakaoTalk(iOS) 도 kakaotalk:// 스킴을 사용한다', () => {
    setUA(UA_KAKAO_IOS)
    const result = openInExternalBrowser()
    expect(result).toBe('redirected')
    expect(hrefValue.startsWith('kakaotalk://web/openExternal?url=')).toBe(true)
  })

  it("Android 인앱(페북 등) 은 intent:// + Chrome 패키지로 점프하며 'redirected'", () => {
    setUA(UA_FB_ANDROID)
    const result = openInExternalBrowser('/dashboard')
    expect(result).toBe('redirected')
    expect(hrefValue.startsWith('intent://')).toBe(true)
    expect(hrefValue).toContain('package=com.android.chrome')
    expect(hrefValue).toContain('S.browser_fallback_url=')
  })

  it("iOS 인앱(인스타 등) 은 자동 점프 불가 → 'manual' 이며 점프하지 않는다", () => {
    setUA(UA_INSTAGRAM_IOS)
    const before = hrefValue
    const result = openInExternalBrowser('/dashboard')
    expect(result).toBe('manual')
    expect(hrefValue).toBe(before)
  })

  it('callbackUrl 이 있으면 signin 페이지 + 인코딩된 callbackUrl 을 타깃으로 보존한다', () => {
    setUA(UA_KAKAO)
    openInExternalBrowser('/dashboard?tab=1')
    const decoded = decodeURIComponent(hrefValue.replace('kakaotalk://web/openExternal?url=', ''))
    expect(decoded).toContain('https://destinypal.com/auth/signin?callbackUrl=')
    expect(decoded).toContain(encodeURIComponent('/dashboard?tab=1'))
  })

  it('callbackUrl 이 없으면 현재 href 를 타깃으로 쓴다', () => {
    setUA(UA_KAKAO)
    openInExternalBrowser()
    const decoded = decodeURIComponent(hrefValue.replace('kakaotalk://web/openExternal?url=', ''))
    expect(decoded).toBe('https://destinypal.com/start')
  })
})
