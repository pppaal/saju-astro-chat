/**
 * Application Route Constants
 * Centralized route definitions for consistent navigation
 */

/**
 * Category to route mapping
 * Maps blog/content categories to their corresponding app routes
 */
export const CATEGORY_ROUTES: Record<string, string> = {
  Saju: "/saju",
  Astrology: "/astrology",
  Tarot: "/tarot",
  Numerology: "/numerology",
  "I Ching": "/iching",
  Dream: "/dream",
  Compatibility: "/destiny-match",
  Personality: "/personality",
  "Destiny Map": "/destiny-map",
} as const;

/**
 * Main app routes
 */
export const ROUTES = {
  HOME: "/",
  BLOG: "/blog",
  SAJU: "/saju",
  ASTROLOGY: "/astrology",
  TAROT: "/tarot",
  NUMEROLOGY: "/numerology",
  ICHING: "/iching",
  DREAM: "/dream",
  COMPATIBILITY: "/compatibility",
  DESTINY_MATCH: "/destiny-match",
  PERSONALITY: "/personality",
  DESTINY_MAP: "/destiny-map",
  PAST_LIFE: "/past-life",
  LIFE_PREDICTION: "/life-prediction",
  PREMIUM_REPORTS: "/premium-reports",
  COUNSELOR: "/counselor",
  PROFILE: "/profile",
  SETTINGS: "/settings",
} as const;

/**
 * Get route for a given category
 * @param category - Blog post category
 * @param fallback - Fallback route if category not found
 * @returns Route path
 */
export function getCategoryRoute(category: string, fallback = ROUTES.DESTINY_MAP): string {
  return CATEGORY_ROUTES[category] || fallback;
}
