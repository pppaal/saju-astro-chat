/**
 * Google Analytics 로 보내는 URL 정화 — page_path · page_location · page_referrer 에 출생 정보가
 * 실리지 않게 한다(QA-7). 리포트 · 달력 · 인생 흐름 · 상담사 링크는 ?date=&time=&lat=&lng=… 로
 * 본명을 싣는데, gtag 는 기본으로 전체 URL(page_location)을 보낸다.
 *
 * 규칙: 쿼리는 허용 목록 키만 남기고(나머지 전부 버림), 해시는 버린다. 경로는 그대로.
 * 허용 목록 밖의 새 쿼리 키는 자동으로 빠지므로, 출생 키를 하나하나 막는 것보다 안전하다.
 *
 * 두 경로가 같은 규칙을 쓴다:
 *  - sanitizeAnalyticsUrl — React 효과(클라이언트 내비게이션마다 gtag('config'))
 *  - gaBootstrapScript — 첫 페이지 뷰를 보내는 인라인 스크립트(같은 허용 목록을 JSON 으로 싣는다)
 */

/** GA 로 보내도 되는 쿼리 키 — 캠페인 · 광고 클릭 · 추천 · 언어. */
export const ANALYTICS_QUERY_ALLOWLIST = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'ref',
  'lang',
] as const

const ALLOWED = new Set<string>(ANALYTICS_QUERY_ALLOWLIST)

export interface SanitizedAnalyticsUrl {
  /** pathname + 허용 쿼리 — gtag page_path. */
  path: string
  /** origin + path — gtag page_location / page_referrer. */
  location: string
}

/**
 * `url`(절대 또는 `origin` 기준 상대)을 GA 로 보낼 모양으로. 파싱이 안 되면 null.
 */
export function sanitizeAnalyticsUrl(url: string, origin: string): SanitizedAnalyticsUrl | null {
  let u: URL
  try {
    u = new URL(url, origin)
  } catch {
    return null
  }
  const kept = new URLSearchParams()
  u.searchParams.forEach((value, key) => {
    if (ALLOWED.has(key)) kept.append(key, value)
  })
  const q = kept.toString()
  const path = u.pathname + (q ? `?${q}` : '')
  return { path, location: u.origin + path }
}

/**
 * GA 첫 설정 인라인 스크립트. gtag 스텁 · 동의 갱신 · 정화한 page_location/page_path/page_referrer 를
 * gtag('set') 로 깔고(이후 모든 이벤트가 물려받는다) 첫 config 를 보낸다. sanitizeAnalyticsUrl 과 같은
 * 규칙(허용 목록 · 해시 버림 · URLSearchParams 직렬화)을 ES5 로 옮겼다 — 테스트가 둘을 같은 표로 본다.
 */
export function gaBootstrapScript(gaId: string): string {
  return `
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('consent', 'update', {
  ad_storage: 'granted',
  analytics_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted'
});
gtag('js', new Date());
var dpKeep = ${JSON.stringify(ANALYTICS_QUERY_ALLOWLIST)};
function dpClean(u) {
  try {
    var x = new URL(u, window.location.origin);
    var p = new URLSearchParams();
    x.searchParams.forEach(function (v, k) { if (dpKeep.indexOf(k) !== -1) p.append(k, v); });
    var q = p.toString();
    var path = x.pathname + (q ? '?' + q : '');
    return { path: path, location: x.origin + path };
  } catch (e) {
    return null;
  }
}
var dpPage = dpClean(window.location.href) || { path: '/', location: window.location.origin + '/' };
var dpSet = { page_location: dpPage.location, page_path: dpPage.path };
var dpRef = document.referrer ? dpClean(document.referrer) : null;
if (dpRef) dpSet.page_referrer = dpRef.location;
gtag('set', dpSet);
gtag('config', ${JSON.stringify(gaId)}, { page_path: dpPage.path, page_location: dpPage.location });
`
}
