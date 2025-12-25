// src/lib/constants/api-limits.ts
// Centralized API request/response limits

/**
 * Message limits for chat APIs
 */
export const MESSAGE_LIMITS = {
  /** Maximum messages in conversation history */
  MAX_MESSAGES: 20,
  /** Maximum length per message content */
  MAX_MESSAGE_LENGTH: 2000,
  /** Maximum messages for streaming endpoints (smaller for performance) */
  MAX_STREAM_MESSAGES: 10,
} as const;

/**
 * Body size limits
 */
export const BODY_LIMITS = {
  /** Default body size limit (64KB) */
  DEFAULT: 64 * 1024,
  /** Large body size limit (96KB) - for context-heavy requests */
  LARGE: 96 * 1024,
  /** Small body size limit (32KB) - for simple requests */
  SMALL: 32 * 1024,
  /** Stream request body limit */
  STREAM: 64 * 1024,
} as const;

/**
 * Text field length limits
 */
export const TEXT_LIMITS = {
  /** Maximum name length */
  MAX_NAME: 120,
  /** Maximum theme/category length */
  MAX_THEME: 64,
  /** Maximum title length */
  MAX_TITLE: 200,
  /** Maximum guidance/summary text */
  MAX_GUIDANCE: 1200,
  /** Maximum card/item text */
  MAX_CARD_TEXT: 400,
  /** Maximum keyword length */
  MAX_KEYWORD: 60,
  /** Maximum context field */
  MAX_CONTEXT: 2000,
  /** Maximum dream text */
  MAX_DREAM_TEXT: 4000,
  /** Maximum timezone string */
  MAX_TIMEZONE: 64,
} as const;

/**
 * Array/list limits
 */
export const LIST_LIMITS = {
  /** Maximum items in keyword arrays */
  MAX_KEYWORDS: 20,
  /** Maximum cards in tarot spread */
  MAX_CARDS: 20,
  /** Maximum list items (generic) */
  MAX_LIST_ITEMS: 20,
  /** Maximum context items */
  MAX_CONTEXT_ITEMS: 20,
} as const;

/**
 * Timeout limits (milliseconds)
 */
export const TIMEOUT_LIMITS = {
  /** Default API timeout */
  DEFAULT: 60000,
  /** Short timeout for quick operations */
  SHORT: 8000,
  /** Medium timeout */
  MEDIUM: 30000,
  /** Long timeout for AI generation */
  LONG: 120000,
  /** Extra long for complex operations */
  EXTRA_LONG: 180000,
} as const;

/**
 * Rate limiting defaults
 */
export const RATE_LIMITS = {
  /** Default requests per minute */
  DEFAULT_RPM: 30,
  /** Streaming requests per minute */
  STREAM_RPM: 10,
  /** Chat requests per minute */
  CHAT_RPM: 20,
  /** Premium user multiplier */
  PREMIUM_MULTIPLIER: 2,
} as const;

/**
 * Allowed locales
 */
export const ALLOWED_LOCALES = new Set(["ko", "en"]);

/**
 * Allowed genders
 */
export const ALLOWED_GENDERS = new Set(["male", "female", "other"]);

/**
 * Validation patterns
 */
export const PATTERNS = {
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  TIME: /^\d{2}:\d{2}$/,
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
} as const;
