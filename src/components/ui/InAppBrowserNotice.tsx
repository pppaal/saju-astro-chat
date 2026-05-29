'use client'

import * as React from 'react'
import { useI18n } from '@/i18n/I18nProvider'

// 카카오톡·페이스북·인스타그램 등 in-app webview 에서 Google OAuth 가
// "Error 403: disallowed_useragent" 로 차단된다 (Google "Use secure
// browsers" 정책). 사용자가 카톡으로 받은 destinypal 링크를 그대로 누르면
// 로그인 자체가 불가 → 신규 가입 막힘.
//
// 우회: in-app browser 감지 시 상단 sticky 배너로 "외부 브라우저로 열기"
// 안내. Android 는 intent://...;package=com.android.chrome 으로 Chrome
// 강제 launch 시도. iOS 는 OS 차원에서 자동 launch 가 막혀 있어 텍스트
// 안내만 가능 (우상단 메뉴 → Safari 로 열기).
//
// dismiss 한 사용자는 그 session 동안 안 보임 — 한 번 닫으면 짜증 안 나게.

const STORAGE_KEY = 'destinypal:inapp-notice-dismissed'

function isInAppBrowser(ua: string): boolean {
  // 모바일 messenger / social app 의 webview UA 패턴.
  // - KAKAOTALK : 카카오톡
  // - FBAN/FBAV : Facebook
  // - Instagram : 인스타
  // - Line/     : 라인
  // - NAVER(inapp): 네이버 앱
  // - everytimeApp: 에브리타임 (Korean college app — 우리 사용자층에 흔함)
  // - DaumApps  : 다음
  // - whale.in.app: 웨일 in-app
  // - kakaostory : 카카오스토리
  if (
    /(KAKAOTALK|FBAN|FBAV|Instagram|Line\/|NAVER\(inapp|everytimeApp|DaumApps|kakaostory)/i.test(ua)
  ) {
    return true
  }
  // Android WebView (in-app 일반). Chrome 자체는 'Chrome/x; wv' 가 아니라
  // 'Chrome/x' 라 wv 토큰만 검사하면 anchor 됨.
  if (/Android.*wv\)/.test(ua)) {
    return true
  }
  return false
}

function getPlatform(ua: string): 'android' | 'ios' | 'other' {
  if (/Android/i.test(ua)) return 'android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  return 'other'
}

export function InAppBrowserNotice() {
  const { locale } = useI18n()
  const [visible, setVisible] = React.useState(false)
  const [platform, setPlatform] = React.useState<'android' | 'ios' | 'other'>('other')

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return
    } catch {
      /* private mode 등 — 그냥 진행 */
    }
    const ua = navigator.userAgent || ''
    if (!isInAppBrowser(ua)) return
    setPlatform(getPlatform(ua))
    setVisible(true)
  }, [])

  const openInExternalBrowser = () => {
    const currentUrl = window.location.href
    if (platform === 'android') {
      // Chrome 강제 launch — 사용자에게 Chrome 설치돼 있으면 외부 Chrome 으로
      // 점프. 없으면 fallback 으로 일반 브라우저 chooser.
      // intent URL spec: https://developer.chrome.com/docs/multidevice/android/intents
      const intentUrl =
        `intent://${currentUrl.replace(/^https?:\/\//, '')}` +
        `#Intent;scheme=https;package=com.android.chrome;end`
      window.location.href = intentUrl
      return
    }
    // iOS: 자동 launch 불가능 — 사용자에게 수동 안내. 클립보드에 URL 복사해
    // 주면 그나마 한 단계 줄여줌.
    try {
      void navigator.clipboard?.writeText(currentUrl)
    } catch {
      /* clipboard 차단 환경 — 무시 */
    }
    // 텍스트 안내는 배너 자체에 이미 표시.
  }

  const dismiss = () => {
    setVisible(false)
    try {
      sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  if (!visible) return null

  const isKo = locale === 'ko'
  const title = isKo
    ? '카톡·인스타·페북 등에서는 로그인이 막혀요'
    : 'Sign-in is blocked inside in-app browsers'
  const body = isKo
    ? platform === 'android'
      ? '아래 버튼을 누르면 Chrome 으로 열려요. (Google 정책상 카톡·SNS 인앱 브라우저는 로그인 차단)'
      : platform === 'ios'
        ? '우측 상단 ⋯ 메뉴 → "Safari로 열기" 를 눌러주세요. (Google 정책상 인앱 브라우저는 로그인 차단)'
        : '외부 브라우저로 열어주세요. (Google 정책상 인앱 브라우저는 로그인 차단)'
    : platform === 'android'
      ? 'Tap below to open in Chrome. (Google blocks sign-in inside in-app browsers like Kakao/Instagram/Facebook.)'
      : platform === 'ios'
        ? 'Tap the ⋯ menu at the top-right, then "Open in Safari". (Google blocks sign-in inside in-app browsers.)'
        : 'Please open this in an external browser. (Google blocks sign-in inside in-app browsers.)'
  const cta = isKo
    ? platform === 'android'
      ? 'Chrome 으로 열기'
      : platform === 'ios'
        ? '주소 복사하기'
        : '주소 복사하기'
    : platform === 'android'
      ? 'Open in Chrome'
      : platform === 'ios'
        ? 'Copy link'
        : 'Copy link'

  return (
    <div
      role="alert"
      aria-live="polite"
      // 모든 페이지의 최상단을 덮음. z-index 는 header(10) / 모달(200) 보다는
      // 낮게 — 모달은 가리면 안 되고 header 위로는 올라가야 함. 100 정도.
      className="sticky top-0 z-[120] flex items-start gap-3 border-b border-amber-300/50 bg-amber-50 px-4 py-3 text-[13px] leading-snug text-amber-900 shadow-sm"
    >
      <div className="mt-0.5 text-base" aria-hidden>
        ⚠️
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-[12.5px] opacity-90">{body}</p>
        <button
          type="button"
          onClick={openInExternalBrowser}
          className="mt-2 inline-flex items-center justify-center rounded-full bg-amber-900 px-4 py-1.5 text-[12.5px] font-semibold text-amber-50 transition active:scale-[0.98]"
        >
          {cta}
        </button>
      </div>
      <button
        type="button"
        aria-label={isKo ? '닫기' : 'Dismiss'}
        onClick={dismiss}
        className="-mr-1 -mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-amber-900/70 transition hover:bg-amber-900/10"
      >
        ✕
      </button>
    </div>
  )
}
