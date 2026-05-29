/**
 * Application Route Constants
 * Centralized route definitions for consistent navigation
 */

/**
 * Category to route mapping
 * Maps blog/content categories to their corresponding app routes
 */
export const CATEGORY_ROUTES: Record<string, string> = {
  Saju: '/saju',
  Astrology: '/astrology',
  Tarot: '/tarot',
  Numerology: '/numerology',
  'I Ching': '/iching',
  Dream: '/dream',
  // destiny-match 페이지는 출시 전 임시 hide (chore/hide-destiny-match-prelaunch).
  // Compatibility 카테고리는 그동안 /compatibility 로 보낸다.
  Compatibility: '/compatibility',
  Personality: '/personality',
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
  NUMEROLOGY: '/numerology',
  ICHING: '/iching',
  COMPATIBILITY: '/compatibility',
  DESTINY_MATCH: '/destiny-match',
  PERSONALITY: '/personality',
  DESTINY_MAP: '/destiny-map',
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
export function getCategoryRoute(category: string, fallback = ROUTES.DESTINY_MAP): string {
  return CATEGORY_ROUTES[category] || fallback
}
