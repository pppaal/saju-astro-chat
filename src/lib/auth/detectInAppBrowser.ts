// Detect in-app webviews that Google OAuth blocks with `disallowed_useragent`
// (403). When a referral link is opened from a messenger like KakaoTalk, the
// page renders inside that app's embedded webview; clicking "Continue with
// Google" then dead-ends on Google's own "액세스 차단됨 / disallowed_useragent"
// page, with no path back into our app. Users only escape by re-opening the
// link in a real browser, which they can't figure out without help.
//
// We detect the most common offenders client-side so the login UI can warn
// before they click. The list is conservative — false positives downgrade the
// CTA to a warning but don't block sign-in, so the cost of an extra entry is
// low; false negatives leak users into the Google error page.
//
// Markers are case-insensitive substrings of `navigator.userAgent`. Keep this
// list lowercase.
const IN_APP_UA_MARKERS = [
  'kakaotalk',
  'naver(inapp', // NAVER(inapp; search; ...)
  'fb_iab',
  'fbav', // Facebook
  'fban',
  'instagram',
  'line/', // matches "Line/" but not unrelated "lineage" etc.
  'daumapps',
  'band/',
  'twitter',
  'snapchat',
  'micromessenger', // WeChat
  'kakaostory',
  'everytimeapp',
  'tossapp',
  // 일반 Android WebView 표식. Android WebView(및 그 위에 뜨는 Capacitor 자사 앱,
  // 그 외 특정-앱 목록에 없는 임베디드 webview)의 UA 는 "...; wv) AppleWebKit..."
  // 형태로 "; wv)" 토큰을 담는다. Google OAuth 는 *모든* webview 를 차단하므로
  // (disallowed_useragent) 특정 앱을 열거하는 대신 이 공통 표식으로 커버리지를
  // 넓힌다. 일반 모바일 브라우저(Chrome/Safari) UA 엔 "; wv)" 가 없어 웹 사용자
  // 오탐 없음. 예전엔 이 표식이 없어 자사 Capacitor WebView 사용자가 경고 없이
  // Google 에러 페이지에서 막혔다.
  '; wv)',
] as const

export function isInAppBrowserUA(userAgent: string): boolean {
  if (!userAgent) return false
  const ua = userAgent.toLowerCase()
  return IN_APP_UA_MARKERS.some((marker) => ua.includes(marker))
}

// Browser-only helper. Returns false during SSR so the server-rendered markup
// matches the first client render (no hydration mismatch).
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return isInAppBrowserUA(navigator.userAgent)
}
