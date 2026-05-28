// src/lib/datetime/timezone.ts
// Timezone helpers. The "now" primitives live in lib/utils/timezone
// (single source of truth — previously there were three drifting
// copies with different fallbacks); this file forwards to them and
// adds the IANA-name validator + the default constant that callers
// of this module have always imported from here.

import { getNowInTimezone as canonicalGetNow } from '@/lib/utils/timezone'

/**
 * Get current date components in a specific timezone.
 *
 * Historical note: this used to default to Asia/Seoul, the canonical
 * version defaults to UTC. None of the live callers rely on the
 * implicit default — every site passes an explicit timezone — so the
 * tightening is safe, and a request without a timezone now silently
 * falls back to UTC instead of getting wrong-by-9h values labeled
 * "Seoul".
 */
export function getNowInTimezone(tz?: string): {
  year: number
  month: number
  day: number
} {
  const { year, month, day } = canonicalGetNow(tz)
  return { year, month, day }
}

/**
 * Get current date string in user's timezone (YYYY-MM-DD)
 */
export function getDateInTimezone(tz?: string): string {
  const { year, month, day } = canonicalGetNow(tz)
  return formatDateString(year, month, day)
}

/**
 * Format date components to YYYY-MM-DD string
 */
export function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Get current datetime in ISO format for a specific timezone
 */
export function getIsoInTimezone(tz?: string): string {
  const { year, month, day, hour, minute, second } = canonicalGetNow(tz)
  return `${formatDateString(year, month, day)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
}

/**
 * Check if a timezone string is valid IANA timezone identifier
 * Strict validation that rejects abbreviations and non-standard formats
 */
export function isValidTimezone(tz: string): boolean {
  // Reject empty or whitespace-only strings
  if (!tz || tz.trim() !== tz || tz.trim().length === 0) {
    return false;
  }

  // Reject common timezone abbreviations (3-4 letter codes), but allow UTC and GMT
  if (tz !== 'UTC' && tz !== 'GMT') {
    const abbreviationPattern = /^[A-Z]{3,4}$/;
    if (abbreviationPattern.test(tz)) {
      return false;
    }
  }

  // Reject numeric offset formats like +09:00, UTC+9, etc.
  if (/[+\-]\d|UTC[+\-]/.test(tz)) {
    return false;
  }

  // Reject strings with only numbers
  if (/^\d+$/.test(tz)) {
    return false;
  }

  // Reject strings with special characters (except / and _)
  if (/[!?#@$%^&*()=[\]{}|\\;:'",<>]/.test(tz)) {
    return false;
  }

  // Check if it's a valid IANA timezone using Intl API
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });

    // Additional check: Intl API is case-insensitive but IANA identifiers are case-sensitive
    // We need to ensure the exact case matches by checking common patterns
    // Valid IANA timezones typically start with uppercase (America/, Asia/, Europe/, etc.)
    // or are all uppercase (UTC, GMT)
    if (tz === 'UTC' || tz === 'GMT') {
      return true;
    }

    // For region/city format, check if it has proper casing
    if (tz.includes('/')) {
      const parts = tz.split('/');

      // Special case: Etc/GMT and Etc/UTC are allowed with all uppercase
      const isEtcTimezone = parts[0] === 'Etc' && (parts[1] === 'GMT' || parts[1] === 'UTC');
      if (isEtcTimezone) {
        return true;
      }

      // Check proper casing for standard timezones
      for (const part of parts) {
        if (part.length > 0) {
          // Each part should start with uppercase
          const startsWithUppercase = part[0] === part[0].toUpperCase();
          if (!startsWithUppercase) {
            return false;
          }

          // Reject all-uppercase parts (except for already-handled Etc/GMT cases)
          const isAllUppercase = part === part.toUpperCase() && /^[A-Z]+$/.test(part);
          if (isAllUppercase) {
            return false;
          }
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Default timezone
 */
export const DEFAULT_TIMEZONE = "Asia/Seoul";
