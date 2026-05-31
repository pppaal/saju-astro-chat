/**
 * Application Route Constants
 * Centralized route definitions for consistent navigation
 */

/**
 * Category to route mapping
 * Maps blog/content categories to their corresponding app routes.
 * 옛 카테고리 (Numerology · I Ching · Dream · Personality) 는 글/페이지 모두
 * 제거되어 (#948 / #949 / #952) 매핑에서 제외. 'Destiny Map' 카테고리는
 * '운명 상담사' (#958) 로 통합 — Destiny Counselor 만 유지.
 *
 * Saju · Astrology 단독 라우트(/saju · /astrology)도 서비스에서 제거됨
 * (enabledServices REMOVED_PUBLIC_SERVICE_PREFIXES). 두 분야는 이제 운명
 * 상담사가 사주+점성을 통합 해석하므로, 블로그 CTA 는 /destiny-counselor 로
 * 보낸다. (이전엔 404 로 떨어지던 죽은 링크였음.)
 */
export const CATEGORY_ROUTES: Record<string, string> = {
  Saju: '/destiny-counselor',
  Astrology: '/destiny-counselor',
  Tarot: '/tarot',
  Compatibility: '/compatibility',
  'Destiny Counselor': '/destiny-counselor',
} as const

/**
 * Main app routes
 */
export const ROUTES = {
  HOME: '/',
  BLOG: '/blog',
  SAJU: '/saju',
  ASTROLOGY: '/astrology',
  TAROT: '/tarot',
  COMPATIBILITY: '/compatibility',
  DESTINY_MAP: '/destiny-counselor',
  COUNSELOR: '/counselor',
  PROFILE: '/profile',
  SETTINGS: '/settings',
} as const

/**
 * Get route for a given category
 * @param category - Blog post category
 * @param fallback - Fallback route if category not found
 * @returns Route path
 */
export function getCategoryRoute(category: string, fallback = '/destiny-counselor'): string {
  return CATEGORY_ROUTES[category] || fallback
}
