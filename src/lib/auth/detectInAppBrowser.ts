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
