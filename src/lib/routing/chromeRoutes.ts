// 전역 chrome(GlobalHeader · BackButton · Footer · StarrySky)을 어느 경로에서
// 그릴지 정하는 단일 목록. 컴포넌트마다 흩어져 있던 경로 배열을 한곳에 모으고,
// /ko 프리픽스(proxy.ts 가 /ko/* 를 실제 라우트로 리라이트하고 브라우저 URL 은
// 그대로 둔다)를 벗긴 경로로 판정해 /ko/... 와 베어 경로가 같은 chrome 을 갖게 한다.
//
// 순수 함수만 둔다 — 클라이언트 컴포넌트(usePathname)와 테스트 양쪽에서 쓴다.

type RouteRule = { path: string; match: 'exact' | 'prefix' }

const exact = (path: string): RouteRule => ({ path, match: 'exact' })
const prefix = (path: string): RouteRule => ({ path, match: 'prefix' })

/**
 * 자체 상단바·푸터를 직접 그리는 v9 paper 화면. 전역 헤더·뒤로가기·푸터·별밭을
 * 모두 끈다. '/destiny' 는 정확히 일치만 — /destiny-counselor 는 자기 규칙을 따른다.
 */
export const OWN_CHROME_ROUTES: readonly RouteRule[] = [
  exact('/'), // 홈
  exact('/destiny'), // 인생 흐름
  prefix('/calendar'), // 캘린더(운흐름) + /calendar/preview
]

/** 자체 상단 네비를 가진 페이지 — 전역 헤더가 겹쳐 그려지지 않게 숨긴다. */
const HEADER_HIDDEN_ROUTES: readonly RouteRule[] = [
  exact('/destiny-counselor'),
  exact('/astrology/counselor'),
  exact('/compatibility/counselor'),
  exact('/tarot'),
  prefix('/admin'),
]

/** 자체 뒤로가기·커스텀 헤더를 가진 페이지 — 전역 BackButton 을 숨긴다(하위 경로 포함). */
const BACK_BUTTON_HIDDEN_ROUTES: readonly RouteRule[] = [
  prefix('/tarot'), // 타로 — 자체 내비게이션
  prefix('/compatibility'), // ServicePageLayout 내장 뒤로가기
  prefix('/about'),
  prefix('/contact'),
  prefix('/faq'),
  prefix('/pricing'),
  prefix('/policy'),
  prefix('/destinypal'), // legacy alias → /calendar (edge 308)
  prefix('/profile'),
  prefix('/auth'),
  prefix('/destiny-counselor'), // 상담사 — 자체 헤더/뒤로가기
  prefix('/blog'),
  prefix('/success'),
  prefix('/icp'),
  prefix('/admin'),
]

/**
 * 푸터를 숨기는 서비스 화면(하위 경로 포함). 모바일에서 아래쪽 면책·링크가
 * 화면이 다 들어오는 페이지까지 "스크롤되는" 느낌을 줘서 숨긴다.
 * /destiny 가 OWN_CHROME 의 정확 일치가 되면서 예전 '/destiny' 접두어가 덮던
 * /destiny-counselor 를 따로 적는다.
 */
const FOOTER_HIDDEN_ROUTES: readonly RouteRule[] = [
  prefix('/destiny-counselor'),
  prefix('/tarot'),
  prefix('/destinypal'), // legacy alias → /calendar (edge 308)
  prefix('/compatibility'),
  prefix('/report'),
  prefix('/astrology/counselor'),
]

/**
 * 경로 판정용 정규화: null/'' → '/', /ko 프리픽스 제거, 끝 슬래시 제거.
 * proxy.ts stripKoPrefix 와 같은 규약(/ko → /, /ko/x → /x).
 */
export function normalizePath(pathname: string | null | undefined): string {
  let path = pathname || '/'
  if (path === '/ko') path = '/'
  else if (path.startsWith('/ko/')) path = path.slice(3)
  if (path.length > 1 && path.endsWith('/')) path = path.replace(/\/+$/, '') || '/'
  return path
}

function matches(path: string, rule: RouteRule): boolean {
  if (rule.match === 'exact') return path === rule.path
  return path === rule.path || path.startsWith(`${rule.path}/`)
}

function matchesAny(path: string, rules: readonly RouteRule[]): boolean {
  return rules.some((rule) => matches(path, rule))
}

/** v9 paper 화면(자체 chrome) 여부. */
export function isOwnChromeRoute(pathname: string | null | undefined): boolean {
  return matchesAny(normalizePath(pathname), OWN_CHROME_ROUTES)
}

export function shouldShowGlobalHeader(pathname: string | null | undefined): boolean {
  const path = normalizePath(pathname)
  return !matchesAny(path, OWN_CHROME_ROUTES) && !matchesAny(path, HEADER_HIDDEN_ROUTES)
}

export function shouldShowBackButton(pathname: string | null | undefined): boolean {
  const path = normalizePath(pathname)
  return !matchesAny(path, OWN_CHROME_ROUTES) && !matchesAny(path, BACK_BUTTON_HIDDEN_ROUTES)
}

export function shouldShowFooter(pathname: string | null | undefined): boolean {
  const path = normalizePath(pathname)
  return !matchesAny(path, OWN_CHROME_ROUTES) && !matchesAny(path, FOOTER_HIDDEN_ROUTES)
}

/** 전역 별밭(StarrySky). v9 화면은 불투명 paper 라 가려진 채 애니메이션만 돈다 — 끈다. */
export function shouldShowStarfield(pathname: string | null | undefined): boolean {
  return !isOwnChromeRoute(pathname)
}
