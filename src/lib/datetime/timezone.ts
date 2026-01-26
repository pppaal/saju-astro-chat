// src/lib/datetime/timezone.ts
// Unified timezone utilities

/**
 * Get current date components in a specific timezone
 * @returns { year, month, day }
 */
export function getNowInTimezone(tz?: string): {
  year: number;
  month: number;
  day: number;
} {
  const now = new Date();
  const effectiveTz = tz || "Asia/Seoul";

  try {
    const y = Number(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: effectiveTz,
        year: "numeric",
      }).format(now)
    );
    const m = Number(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: effectiveTz,
        month: "2-digit",
      }).format(now)
    );
    const d = Number(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: effectiveTz,
        day: "2-digit",
      }).format(now)
    );
    return { year: y, month: m, day: d };
  } catch {
    // Fallback to Asia/Seoul
    const y = Number(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
      }).format(now)
    );
    const m = Number(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        month: "2-digit",
      }).format(now)
    );
    const d = Number(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        day: "2-digit",
      }).format(now)
    );
    return { year: y, month: m, day: d };
  }
}

/**
 * Get current date string in user's timezone (YYYY-MM-DD)
 */
export function getDateInTimezone(tz?: string): string {
  const now = new Date();
  if (!tz) {return now.toISOString().slice(0, 10);}

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

/**
 * Format date components to YYYY-MM-DD string
 */
export function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Get current datetime in ISO format for a specific timezone
 */
export function getIsoInTimezone(tz?: string): string {
  const { year, month, day } = getNowInTimezone(tz);
  const now = new Date();

  // Get time parts
  const effectiveTz = tz || "Asia/Seoul";
  try {
    const hour = Number(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: effectiveTz,
        hour: "2-digit",
        hour12: false,
      }).format(now)
    );
    const minute = Number(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: effectiveTz,
        minute: "2-digit",
      }).format(now)
    );
    const second = Number(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: effectiveTz,
        second: "2-digit",
      }).format(now)
    );

    return `${formatDateString(year, month, day)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
  } catch {
    return now.toISOString().slice(0, 19);
  }
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
