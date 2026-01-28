/**
 * Mathematical and Algorithm Constants
 * Centralized location for magic numbers used across the codebase
 */

/**
 * Luminance calculation weights (sRGB color space)
 * Used for accessibility contrast calculations
 * @see https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
export const LUMINANCE_WEIGHTS = {
  RED: 0.2126,
  GREEN: 0.7152,
  BLUE: 0.0722,
} as const;

/**
 * Astrological calculation thresholds
 */
export const ASTROLOGY_THRESHOLDS = {
  /** Minimum score for asteroid influence */
  ASTEROID_SCORE_MIN: 0.5,
  /** Tight orb for major aspects */
  ASPECT_ORB_TIGHT: 0.5,
  /** Normal orb for aspects */
  ASPECT_ORB_NORMAL: 0.55,
} as const;

/**
 * UI Animation Timings (milliseconds)
 * Used for typing animations and transitions
 */
export const ANIMATION_DELAYS = {
  /** Initial delay before typing starts */
  TYPING_START: 1000,
  /** Delay between character deletions */
  TYPING_DELETE: 30,
  /** Pause at end of typed text before deleting */
  TYPING_PAUSE_END: 2000,
  /** Delay between character typing */
  TYPING_CHAR: 80,
  /** Delay before typing next word */
  TYPING_NEXT_WORD: 500,
} as const;

/**
 * Scroll and Intersection Observer Settings
 */
export const SCROLL_SETTINGS = {
  /** Threshold for showing scroll-to-top button (pixels) */
  SCROLL_TO_TOP_THRESHOLD: 400,
  /** Intersection observer threshold (0-1) */
  INTERSECTION_THRESHOLD: 0.2,
  /** Root margin for intersection observer (pixels) */
  INTERSECTION_ROOT_MARGIN_BOTTOM: -100,
} as const;

/**
 * Rate Limiting and Request Sizes
 */
export const REQUEST_LIMITS = {
  /** Maximum body size for registration (bytes) */
  MAX_REGISTRATION_BODY_SIZE: 32 * 1024, // 32KB
  /** Maximum name length */
  MAX_NAME_LENGTH: 80,
  /** Maximum referral code length */
  MAX_REFERRAL_CODE_LENGTH: 32,
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 8,
  /** Maximum password length */
  MAX_PASSWORD_LENGTH: 128,
} as const;

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CACHE_TTL = {
  /** Short-lived cache (5 minutes) */
  SHORT: 5 * 60,
  /** Medium-lived cache (1 hour) */
  MEDIUM: 60 * 60,
  /** Long-lived cache (24 hours) */
  LONG: 24 * 60 * 60,
  /** Very long cache (1 week) */
  WEEK: 7 * 24 * 60 * 60,
  /** Image cache (1 year) */
  IMAGE: 365 * 24 * 60 * 60,
} as const;

/**
 * Zodiac and Astrological Constants
 */
export const ZODIAC_CONSTANTS = {
  /** Number of zodiac signs */
  SIGNS_COUNT: 12,
  /** Degrees in a complete circle */
  CIRCLE_DEGREES: 360,
  /** Degrees per zodiac sign */
  DEGREES_PER_SIGN: 30,
  /** Number of houses in astrology */
  HOUSES_COUNT: 12,
} as const;

/**
 * Saju (Four Pillars) Constants
 */
export const SAJU_CONSTANTS = {
  /** Number of heavenly stems */
  HEAVENLY_STEMS_COUNT: 10,
  /** Number of earthly branches */
  EARTHLY_BRANCHES_COUNT: 12,
  /** Number of elements */
  ELEMENTS_COUNT: 5,
  /** Years in a 대운 (Daeun) cycle */
  DAEUN_CYCLE_YEARS: 10,
} as const;

/**
 * UI Timeout Durations (milliseconds)
 * Used for toast messages, notifications, and temporary UI states
 */
export const UI_TIMEOUTS = {
  /** Toast/notification auto-dismiss duration */
  TOAST_DISMISS: 2000,
  /** Longer toast duration for save confirmations */
  TOAST_DISMISS_LONG: 3000,
  /** Extra long toast for important messages */
  TOAST_DISMISS_EXTRA_LONG: 5000,
  /** Confetti celebration duration */
  CONFETTI_DURATION: 4000,
  /** Short delay for dropdown blur handling */
  DROPDOWN_BLUR_DELAY: 150,
  /** Short delay for UI state transitions */
  UI_STATE_TRANSITION: 300,
  /** Minimal delay for immediate effects */
  MINIMAL_DELAY: 100,
  /** Debounce delay for search/input */
  DEBOUNCE_DELAY: 500,
  /** Very short delay for cache checks */
  CACHE_CHECK_DELAY: 10,
  /** Polling interval for admin dashboard */
  ADMIN_POLL_INTERVAL: 60000,
  /** Particle animation start delay */
  PARTICLE_ANIMATION_START: 500,
  /** Scroll slide transition duration */
  SLIDE_TRANSITION: 300,
} as const;
// HTTP constants moved to ./http.ts
export { HTTP_STATUS, HTTP_TIMEOUTS, CACHE_MAX_AGE } from './http';
