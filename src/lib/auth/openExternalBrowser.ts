// 인앱 브라우저(카톡·인스타·페북 등)에서 Google OAuth 는 `disallowed_useragent`
// 로 막힌다. 다른 사이트들이 "그냥 되는" 것처럼 보이는 이유는, 로그인 시도
// 순간 **외부 브라우저(크롬/사파리)로 매끄럽게 점프**시켜 거기서 OAuth 를
// 끝내기 때문이다. 이 헬퍼가 그 점프를 담당한다.
//
// 플랫폼/앱별 전략:
// - KakaoTalk : `kakaotalk://web/openExternal?url=` → 카톡이 기기 기본
//   브라우저로 직접 열어준다 (iOS·Android 공통, 가장 매끄러움).
// - Android (그 외 인앱) : `intent://...;package=com.android.chrome` 으로
//   Chrome 강제 실행. 미설치 시 browser_fallback_url 로 안전 폴백.
// - iOS (인스타·페북 등) : OS 차원에서 외부 브라우저 자동 실행이 막혀 있어
//   자동 점프 불가 → 'manual' 반환. 호출부에서 링크 복사 + 안내 노출.
import { isInAppBrowserUA } from '@/lib/auth/detectInAppBrowser'

export type ExternalOpenResult = 'redirected' | 'manual' | 'not-in-app'

function getUA(): string {
  if (typeof navigator === 'undefined') return ''
  return navigator.userAgent || ''
}

function getMobilePlatform(ua = getUA()): 'android' | 'ios' | 'other' {
  if (/Android/i.test(ua)) return 'android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  return 'other'
}

function isKakaoTalkInApp(ua = getUA()): boolean {
  return /kakaotalk/i.test(ua)
}

// 외부 브라우저에서 열 목표 URL. signin 페이지로 보내 callbackUrl 을 보존하면
// 외부 브라우저에서 그대로 로그인 → 원래 가려던 곳으로 복귀할 수 있다.
function buildTargetUrl(callbackUrl?: string): string {
  if (typeof window === 'undefined') return ''
  const origin = window.location.origin
  if (callbackUrl) {
    return `${origin}/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
  }
  return window.location.href
}

/**
 * 인앱 브라우저면 외부 브라우저로 점프시킨다.
 * @returns 'redirected' 점프 성공(브라우저가 이어받음) / 'manual' 자동 불가
 *   (호출부에서 링크 복사 안내) / 'not-in-app' 인앱이 아님(그냥 진행).
 */
export function openInExternalBrowser(callbackUrl?: string): ExternalOpenResult {
  if (typeof window === 'undefined') return 'not-in-app'
  const ua = getUA()
  if (!isInAppBrowserUA(ua)) return 'not-in-app'

  const target = buildTargetUrl(callbackUrl)

  // 1) KakaoTalk — 전용 스킴이 가장 확실. iOS·Android 모두 동작.
  if (isKakaoTalkInApp(ua)) {
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(target)}`
    return 'redirected'
  }

  // 2) Android — Chrome intent 강제 실행 + 안전 폴백.
  if (getMobilePlatform(ua) === 'android') {
    const fallback = encodeURIComponent(target)
    const intentUrl =
      `intent://${target.replace(/^https?:\/\//, '')}` +
      `#Intent;scheme=https;package=com.android.chrome` +
      `;S.browser_fallback_url=${fallback};end`
    window.location.href = intentUrl
    return 'redirected'
  }

  // 3) iOS 인스타·페북 등 — 자동 점프 불가. 호출부에서 복사+안내.
  return 'manual'
}
