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
 * Check if a timezone string is valid
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Default timezone
 */
export const DEFAULT_TIMEZONE = "Asia/Seoul";
