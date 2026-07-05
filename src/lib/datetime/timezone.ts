// src/lib/datetime/timezone.ts
//
// CANONICAL timezone utility module.
//
// History: there used to be three drifting copies of the "now in a
// timezone" primitives (saju/timezone.ts — OUT OF SCOPE, left alone —
// plus datetime/timezone.ts and utils/timezone.ts). utils/timezone.ts
// previously held the implementation and datetime/ forwarded to it.
// That direction is now reversed: this module is the single source of
// truth, and lib/utils/timezone.ts is a thin re-export shim kept so
// out-of-scope callers (destiny-map, astrology routes) don't have to
// change their imports.
//
// Production runs on a UTC server, so `new Date().getMonth()` and
// friends return UTC values. Anything that means "the user's wall clock
// right now" must go through one of these helpers instead.

// ── core: read the wall-clock components currently shown at a tz ──

export type TzNowComponents = {
  year: number // YYYY (e.g. 2026)
  month: number // 1-12, **not** 0-11 (matches the get*InTimezone consumers
  // and the Intl format output)
  day: number // 1-31
  hour: number // 0-23
  minute: number // 0-59
  second: number // 0-59
}

function partsFor(timezone: string | undefined, at: Date = new Date()): TzNowComponents {
  // 기본값은 이 모듈이 export 하는 DEFAULT_TIMEZONE(Asia/Seoul)과 일치해야
  // 한다. 'UTC' 기본이던 시절엔 UTC 날짜와 KST 날짜가 다른 매일 약 9시간
  // 동안(KST 00:00~09:00) 무인자 호출·invalid fallback 이 어제 날짜를
  // 돌려줘 테스트가 시간대에 따라 실패했다. 프로덕션의 무인자 호출처는
  // 없음(전부 명시적 tz 전달) — 이 기본값은 안전망이다.
  const tz = timezone || 'Asia/Seoul'
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(at)
  const lookup = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0')
  // Intl returns '24' for midnight in some locales; coerce back to 0 so
  // Date.UTC doesn't roll the day forward and a downstream "today" check
  // doesn't read tomorrow.
  const hour = lookup('hour')
  return {
    year: lookup('year'),
    month: lookup('month'),
    day: lookup('day'),
    hour: hour === 24 ? 0 : hour,
    minute: lookup('minute'),
    second: lookup('second'),
  }
}

/**
 * Build a Date whose UTC fields hold the local wall clock at the given
 * timezone. Use when downstream code reads `.getUTCMonth()` /
 * `.getUTCDate()` and expects user-local values.
 */
export function nowInTimezone(timezone: string): Date {
  const { year, month, day, hour, minute, second } = partsFor(timezone)
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second))
}

/**
 * Full component-shape of "now". `month` is **1-12**. Defaults to
 * DEFAULT_TIMEZONE(Asia/Seoul) when no timezone is supplied. Internal/
 * canonical shape — the public `getNowInTimezone` below narrows to
 * {year, month, day} to preserve the historical datetime/ signature its
 * callers depend on.
 */
export function getNowComponentsInTimezone(timezone?: string): TzNowComponents {
  try {
    return partsFor(timezone)
  } catch {
    // Invalid IANA name — fall back to DEFAULT_TIMEZONE rather than throwing
    // so a malformed profile doesn't break the entire request.
    return partsFor('Asia/Seoul')
  }
}

/**
 * 주어진 *인스턴트*(injected now 등)를 특정 timezone 의 wall-clock 요소로
 * 분해한다. getNowComponentsInTimezone 과 달리 실제 시계가 아니라 넘긴 Date 를
 * 쓰므로 결정론 경로(주입식 now)에서 안전하다. Invalid IANA 는 Asia/Seoul 폴백.
 */
export function getDateComponentsInTimezone(at: Date, timezone?: string): TzNowComponents {
  try {
    return partsFor(timezone, at)
  } catch {
    return partsFor('Asia/Seoul', at)
  }
}

/**
 * 주어진 인스턴트의 요일(0=일 … 6=토)을 특정 timezone 기준으로 반환.
 * 서버-로컬 getDay() 대신 사용해 서버 TZ 의존성을 없앤다.
 */
export function getWeekdayInTimezone(at: Date, timezone?: string): number {
  const tz = timezone || 'Asia/Seoul'
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(at)
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return map[wd] ?? 0
}

/** Convenience: the user's local year right now at the given timezone. */
export function currentYearInTimezone(timezone: string): number {
  return getNowComponentsInTimezone(timezone).year
}

/** Convenience: the user's local month (0-11) right now at the given timezone. */
export function currentMonthInTimezone(timezone: string): number {
  return getNowComponentsInTimezone(timezone).month - 1
}

// ── public date helpers (the historical datetime/timezone surface) ──

/**
 * Is `tz` a timezone identifier the runtime's Intl can actually use?
 * Empty / undefined / junk (e.g. legacy or corrupt profile values) → false.
 * Used to keep a bad IANA string from throwing deep inside the saju /
 * astrology engines (Intl.DateTimeFormat throws RangeError on an invalid
 * `timeZone`), which would crash every birth-based service at once.
 */
export function isValidTimeZone(tz: string | null | undefined): boolean {
  if (!tz) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** Return `tz` if it's a usable IANA zone, else `fallback` (default Asia/Seoul). */
export function normalizeTimeZone(tz: string | null | undefined, fallback = 'Asia/Seoul'): string {
  return isValidTimeZone(tz) ? (tz as string) : fallback
}

/**
 * Get current date components in a specific timezone.
 *
 * Returns the narrowed {year, month, day} shape this module's callers
 * have always consumed. Use getNowComponentsInTimezone() when you also
 * need hour/minute/second.
 *
 * Defaults to DEFAULT_TIMEZONE(Asia/Seoul) when no timezone is supplied —
 * pass an explicit IANA name for user-facing values.
 */
export function getNowInTimezone(tz?: string): {
  year: number
  month: number
  day: number
} {
  const { year, month, day } = getNowComponentsInTimezone(tz)
  return { year, month, day }
}

/**
 * Get current date string in user's timezone (YYYY-MM-DD)
 */
export function getDateInTimezone(tz?: string): string {
  const { year, month, day } = getNowComponentsInTimezone(tz)
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
  const { year, month, day, hour, minute, second } = getNowComponentsInTimezone(tz)
  return `${formatDateString(year, month, day)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
}

/**
 * Check if a timezone string is valid IANA timezone identifier
 * Strict validation that rejects abbreviations and non-standard formats
 */
export function isValidTimezone(tz: string): boolean {
  // Reject empty or whitespace-only strings
  if (!tz || tz.trim() !== tz || tz.trim().length === 0) {
    return false
  }

  // Reject common timezone abbreviations (3-4 letter codes), but allow UTC and GMT
  if (tz !== 'UTC' && tz !== 'GMT') {
    const abbreviationPattern = /^[A-Z]{3,4}$/
    if (abbreviationPattern.test(tz)) {
      return false
    }
  }

  // Reject numeric offset formats like +09:00, UTC+9, etc.
  if (/[+\-]\d|UTC[+\-]/.test(tz)) {
    return false
  }

  // Reject strings with only numbers
  if (/^\d+$/.test(tz)) {
    return false
  }

  // Reject strings with special characters (except / and _)
  if (/[!?#@$%^&*()=[\]{}|\\;:'",<>]/.test(tz)) {
    return false
  }

  // Check if it's a valid IANA timezone using Intl API
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })

    // Additional check: Intl API is case-insensitive but IANA identifiers are case-sensitive
    // We need to ensure the exact case matches by checking common patterns
    // Valid IANA timezones typically start with uppercase (America/, Asia/, Europe/, etc.)
    // or are all uppercase (UTC, GMT)
    if (tz === 'UTC' || tz === 'GMT') {
      return true
    }

    // For region/city format, check if it has proper casing
    if (tz.includes('/')) {
      const parts = tz.split('/')

      // Special case: Etc/GMT and Etc/UTC are allowed with all uppercase
      const isEtcTimezone = parts[0] === 'Etc' && (parts[1] === 'GMT' || parts[1] === 'UTC')
      if (isEtcTimezone) {
        return true
      }

      // Check proper casing for standard timezones
      for (const part of parts) {
        if (part.length > 0) {
          // Each part should start with uppercase
          const startsWithUppercase = part[0] === part[0].toUpperCase()
          if (!startsWithUppercase) {
            return false
          }

          // Reject all-uppercase parts (except for already-handled Etc/GMT cases)
          const isAllUppercase = part === part.toUpperCase() && /^[A-Z]+$/.test(part)
          if (isAllUppercase) {
            return false
          }
        }
      }
    }

    return true
  } catch {
    return false
  }
}

/**
 * Default timezone
 */
export const DEFAULT_TIMEZONE = 'Asia/Seoul'
