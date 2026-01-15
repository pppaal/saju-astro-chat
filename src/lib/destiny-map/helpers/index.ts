/**
 * Report Helpers Main Module (Refactored)
 * 리포트 헬퍼 메인 모듈 (리팩토링됨)
 *
 * This module provides utility functions for report generation, validation,
 * and text sanitization. It has been refactored from a monolithic file into
 * focused modules for better maintainability and testability.
 *
 * Architecture:
 * - text-sanitization.ts: Text cleaning and sanitization
 * - report-validation.ts: Report structure validation
 * - index.ts (this file): Main exports and backward compatibility
 *
 * All original functions are re-exported for backward compatibility.
 */

// ============================================================
// Re-export Security Functions (from centralized module)
// ============================================================

export { hashName, maskDisplayName, maskTextWithName } from "@/lib/security";

// ============================================================
// Re-export Text Sanitization
// ============================================================

export { cleanseText, isJsonResponse } from './text-sanitization';

// ============================================================
// Re-export Report Validation
// ============================================================

export {
  REQUIRED_SECTIONS,
  validateSections,
  validateSectionsDetailed,
  type ValidationWarning,
} from './report-validation';

// ============================================================
// Date/Time Helpers
// ============================================================

/**
 * Get current date in user's timezone (YYYY-MM-DD)
 *
 * Returns the current date formatted as YYYY-MM-DD in the specified timezone.
 * Falls back to UTC if timezone is not provided or invalid.
 *
 * @param tz - IANA timezone identifier (e.g., 'Asia/Seoul', 'America/New_York')
 * @returns Current date string in YYYY-MM-DD format
 *
 * @example
 * ```typescript
 * getDateInTimezone('Asia/Seoul')    // "2026-01-14"
 * getDateInTimezone('America/New_York') // "2026-01-14"
 * getDateInTimezone()                // "2026-01-14" (UTC)
 * ```
 */
export function getDateInTimezone(tz?: string): string {
  const now = new Date();
  if (!tz) return now.toISOString().slice(0, 10);

  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

// ============================================================
// Five Elements Helpers
// ============================================================

/**
 * Extract reasonable five-element defaults when AI text is unavailable
 *
 * Provides default five-element (오행) distribution when actual analysis
 * is not available. This is used as a fallback to ensure the system
 * always has valid data to work with.
 *
 * **Five Elements (오행):**
 * - Wood (木 목): Growth, expansion, creativity
 * - Fire (火 화): Energy, passion, transformation
 * - Earth (土 토): Stability, grounding, nurturing
 * - Metal (金 금): Structure, clarity, precision
 * - Water (水 수): Flow, wisdom, adaptability
 *
 * @param _text - Text to analyze (currently unused, reserved for future enhancement)
 * @returns Default five-element distribution (percentages)
 *
 * @example
 * ```typescript
 * const defaults = extractDefaultElements("");
 * // { fiveElements: { wood: 25, fire: 25, earth: 20, metal: 20, water: 15 } }
 * ```
 */
export function extractDefaultElements(_text: string): {
  fiveElements: Record<string, number>;
} {
  return {
    fiveElements: {
      wood: 25,
      fire: 25,
      earth: 20,
      metal: 20,
      water: 15,
    },
  };
}
