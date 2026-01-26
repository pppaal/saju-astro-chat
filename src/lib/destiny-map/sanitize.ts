// src/lib/destiny-map/sanitize.ts
// Locale-specific text sanitization

// Re-export from centralized security module for backward compatibility
export { maskDisplayName, maskTextWithName } from "@/lib/security";

/**
 * Sanitize text based on locale - removes invalid characters
 */
export function sanitizeLocaleText(str: string, lang: string) {
  if (!str) {return str;}

  // Do not alter structured JSON; caller should run HTML cleansing separately
  const isJson = str.trim().startsWith("{") || str.includes('"lifeTimeline"') || str.includes('"categoryAnalysis"');
  if (isJson) {return str;}

  // Allow printable ASCII plus language blocks
  // Note: Korean text often includes CJK Hanja (Chinese characters) for traditional terms
  const allowedByLang: Record<string, RegExp> = {
    ko: /[^\u0009\u000A\u000D\u0020-\u007E\uAC00-\uD7A3\u4E00-\u9FFF]/g, // Hangul + CJK Hanja
    ja: /[^\u0009\u000A\u000D\u0020-\u007E\u3040-\u30FF\u31F0-\u31FF\u4E00-\u9FFF]/g,
    zh: /[^\u0009\u000A\u000D\u0020-\u007E\u4E00-\u9FFF]/g,
    es: /[^\u0009\u000A\u000D\u0020-\u00FF]/g, // Latin + accents
    default: /[^\u0009\u000A\u000D\u0020-\u007E\u00A0-\uFFFF]/g, // keep most BMP printable chars
  };

  const regex = allowedByLang[lang] || allowedByLang.default;
  return str.replace(regex, "");
}
