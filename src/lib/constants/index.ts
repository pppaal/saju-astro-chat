// src/lib/constants/index.ts
// Shared constants

export {
  THEME_DESCRIPTIONS,
  VALID_THEMES,
  getThemeDescription,
  buildThemeContext,
  isValidTheme,
  type ThemeKey,
  type ThemeDescription,
} from "./themes";

export {
  MESSAGE_LIMITS,
  BODY_LIMITS,
  TEXT_LIMITS,
  LIST_LIMITS,
  TIMEOUT_LIMITS,
  RATE_LIMITS,
  ALLOWED_LOCALES,
  ALLOWED_GENDERS,
  PATTERNS,
} from "./api-limits";

export { HTTP_STATUS, HTTP_TIMEOUTS, CACHE_MAX_AGE } from "./http";
