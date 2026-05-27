/**
 * Application Route Constants
 * Centralized route definitions for consistent navigation
 */

/**
 * Category to route mapping
 * Maps blog/content categories to their corresponding app routes.
 * 옛 카테고리(Saju/Astrology/Numerology 등)는 폴더가 삭제됐으므로
 * 대표 채널(destiny-map)로 redirect 되도록 fallback 만 남긴다 — getCategoryRoute
 * 가 fallback 기본값으로 ROUTES.DESTINY_MAP 을 쓴다.
 */
export const CATEGORY_ROUTES: Record<string, string> = {
  Tarot: '/tarot',
  Compatibility: '/compatibility',
  'Destiny Counselor': '/destiny-counselor',
} as const

/**
 * Get route for a given category
 * @param category - Blog post category
 * @param fallback - Fallback route if category not found
 * @returns Route path
 */
export function getCategoryRoute(category: string, fallback = '/destiny-map'): string {
  return CATEGORY_ROUTES[category] || fallback
}
