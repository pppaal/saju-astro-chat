// src/lib/Saju/normalizer.ts
// Input normalization utilities for various date/time formats

import { parseTimeStringSafe, SajuValidationError } from "./validation";

// ============================================================
// Date Normalization
// ============================================================

/**
 * Date input patterns that we can normalize
 */
const DATE_PATTERNS = [
  // ISO format: 1990-05-15
  { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, extract: (m: RegExpMatchArray) => ({ y: m[1], M: m[2], d: m[3] }) },
  // Slash format: 1990/05/15, 1990/5/15
  { regex: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, extract: (m: RegExpMatchArray) => ({ y: m[1], M: m[2], d: m[3] }) },
  // Dot format: 1990.05.15
  { regex: /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/, extract: (m: RegExpMatchArray) => ({ y: m[1], M: m[2], d: m[3] }) },
  // Korean format: 1990년 5월 15일
  { regex: /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/, extract: (m: RegExpMatchArray) => ({ y: m[1], M: m[2], d: m[3] }) },
  // Compact: 19900515
  { regex: /^(\d{4})(\d{2})(\d{2})$/, extract: (m: RegExpMatchArray) => ({ y: m[1], M: m[2], d: m[3] }) },
  // US format: 05/15/1990, 5/15/1990
  { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, extract: (m: RegExpMatchArray) => ({ y: m[3], M: m[1], d: m[2] }) },
];

export interface NormalizedDate {
  /** Normalized date string: YYYY-MM-DD */
  date: string;
  /** Year (1900-2100) */
  year: number;
  /** Month (1-12) */
  month: number;
  /** Day (1-31) */
  day: number;
  /** Original input */
  original: string;
}

/**
 * Normalize various date formats to YYYY-MM-DD
 *
 * Supported formats:
 * - 1990-05-15 (ISO)
 * - 1990/05/15, 1990/5/15 (Slash)
 * - 1990.05.15 (Dot)
 * - 1990년 5월 15일 (Korean)
 * - 19900515 (Compact)
 * - 05/15/1990 (US format)
 *
 * @throws {SajuValidationError} if date cannot be parsed or is invalid
 */
export function normalizeDate(input: string): NormalizedDate {
  const trimmed = input.trim();

  for (const pattern of DATE_PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      const { y, M, d } = pattern.extract(match);
      const year = parseInt(y, 10);
      const month = parseInt(M, 10);
      const day = parseInt(d, 10);

      // Validate ranges
      if (year < 1900 || year > 2100) {
        throw new SajuValidationError(
          "INVALID_YEAR",
          `Year ${year} is out of range (1900-2100)`,
          "birthDate"
        );
      }

      if (month < 1 || month > 12) {
        throw new SajuValidationError(
          "INVALID_DATE_FORMAT",
          `Month ${month} is out of range (1-12)`,
          "birthDate"
        );
      }

      if (day < 1 || day > 31) {
        throw new SajuValidationError(
          "INVALID_DATE_FORMAT",
          `Day ${day} is out of range (1-31)`,
          "birthDate"
        );
      }

      // Validate the date is real (handles Feb 30, etc.)
      const dateObj = new Date(year, month - 1, day);
      if (
        dateObj.getFullYear() !== year ||
        dateObj.getMonth() !== month - 1 ||
        dateObj.getDate() !== day
      ) {
        throw new SajuValidationError(
          "INVALID_DATE_FORMAT",
          `Invalid date: ${year}-${month}-${day}`,
          "birthDate"
        );
      }

      const normalized = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      return {
        date: normalized,
        year,
        month,
        day,
        original: input,
      };
    }
  }

  throw new SajuValidationError(
    "INVALID_DATE_FORMAT",
    `Cannot parse date: "${input}". Supported formats: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD, YYYY년 M월 D일`,
    "birthDate"
  );
}

/**
 * Try to normalize date, returns null on failure
 */
export function tryNormalizeDate(input: string): NormalizedDate | null {
  try {
    return normalizeDate(input);
  } catch {
    return null;
  }
}

// ============================================================
// Time Normalization
// ============================================================

/**
 * Time input patterns
 */
const TIME_PATTERNS = [
  // Standard: 14:30, 2:30
  { regex: /^(\d{1,2}):(\d{2})$/, extract: (m: RegExpMatchArray) => ({ h: m[1], m: m[2], period: null }) },
  // With AM/PM: 2:30 PM, 2:30PM
  { regex: /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i, extract: (m: RegExpMatchArray) => ({ h: m[1], m: m[2], period: m[3].toUpperCase() }) },
  // Korean 24h: 14시 30분
  { regex: /^(\d{1,2})시\s*(\d{1,2})분$/, extract: (m: RegExpMatchArray) => ({ h: m[1], m: m[2], period: null }) },
  // Korean 12h: 오후 2시 30분
  { regex: /^(오전|오후)\s*(\d{1,2})시\s*(\d{1,2})분$/, extract: (m: RegExpMatchArray) => ({ h: m[2], m: m[3], period: m[1] === "오후" ? "PM" : "AM" }) },
  // Korean short: 오후 2시
  { regex: /^(오전|오후)\s*(\d{1,2})시$/, extract: (m: RegExpMatchArray) => ({ h: m[2], m: "0", period: m[1] === "오후" ? "PM" : "AM" }) },
  // Hour only: 14시
  { regex: /^(\d{1,2})시$/, extract: (m: RegExpMatchArray) => ({ h: m[1], m: "0", period: null }) },
  // Compact: 1430
  { regex: /^(\d{2})(\d{2})$/, extract: (m: RegExpMatchArray) => ({ h: m[1], m: m[2], period: null }) },
];

export interface NormalizedTime {
  /** Normalized time string: HH:MM (24-hour) */
  time: string;
  /** Hour (0-23) */
  hour: number;
  /** Minute (0-59) */
  minute: number;
  /** Original input */
  original: string;
  /** 시진 (Korean time period) */
  sijin: string;
}

/**
 * Get 시진 (Korean time period) name from hour
 */
function getSijinFromHour(hour: number): string {
  const sijinMap: Record<number, string> = {
    0: "자시 (子時) 23:00-01:00",
    1: "축시 (丑時) 01:00-03:00",
    2: "축시 (丑時) 01:00-03:00",
    3: "인시 (寅時) 03:00-05:00",
    4: "인시 (寅時) 03:00-05:00",
    5: "묘시 (卯時) 05:00-07:00",
    6: "묘시 (卯時) 05:00-07:00",
    7: "진시 (辰時) 07:00-09:00",
    8: "진시 (辰時) 07:00-09:00",
    9: "사시 (巳時) 09:00-11:00",
    10: "사시 (巳時) 09:00-11:00",
    11: "오시 (午時) 11:00-13:00",
    12: "오시 (午時) 11:00-13:00",
    13: "미시 (未時) 13:00-15:00",
    14: "미시 (未時) 13:00-15:00",
    15: "신시 (申時) 15:00-17:00",
    16: "신시 (申時) 15:00-17:00",
    17: "유시 (酉時) 17:00-19:00",
    18: "유시 (酉時) 17:00-19:00",
    19: "술시 (戌時) 19:00-21:00",
    20: "술시 (戌時) 19:00-21:00",
    21: "해시 (亥時) 21:00-23:00",
    22: "해시 (亥時) 21:00-23:00",
    23: "자시 (子時) 23:00-01:00",
  };

  return sijinMap[hour] || "알 수 없음";
}

/**
 * Normalize various time formats to HH:MM (24-hour)
 *
 * Supported formats:
 * - 14:30 (24-hour)
 * - 2:30 PM (12-hour with AM/PM)
 * - 14시 30분 (Korean 24h)
 * - 오후 2시 30분 (Korean 12h)
 * - 오후 2시 (Korean hour only)
 * - 1430 (Compact)
 *
 * @throws {SajuValidationError} if time cannot be parsed or is invalid
 */
export function normalizeTime(input: string): NormalizedTime {
  const trimmed = input.trim();

  for (const pattern of TIME_PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      const { h, m, period } = pattern.extract(match);
      let hour = parseInt(h, 10);
      const minute = parseInt(m, 10);

      // Convert 12-hour to 24-hour
      if (period === "PM" && hour < 12) {
        hour += 12;
      } else if (period === "AM" && hour === 12) {
        hour = 0;
      }

      // Validate ranges
      if (hour < 0 || hour > 23) {
        throw new SajuValidationError(
          "INVALID_HOUR",
          `Hour ${hour} is out of range (0-23)`,
          "birthTime"
        );
      }

      if (minute < 0 || minute > 59) {
        throw new SajuValidationError(
          "INVALID_MINUTE",
          `Minute ${minute} is out of range (0-59)`,
          "birthTime"
        );
      }

      const normalized = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

      return {
        time: normalized,
        hour,
        minute,
        original: input,
        sijin: getSijinFromHour(hour),
      };
    }
  }

  throw new SajuValidationError(
    "INVALID_TIME_FORMAT",
    `Cannot parse time: "${input}". Supported formats: HH:MM, H:MM AM/PM, H시 M분, 오전/오후 H시 M분`,
    "birthTime"
  );
}

/**
 * Try to normalize time, returns null on failure
 */
export function tryNormalizeTime(input: string): NormalizedTime | null {
  try {
    return normalizeTime(input);
  } catch {
    return null;
  }
}

// ============================================================
// Gender Normalization
// ============================================================

export type Gender = "male" | "female";

/**
 * Gender input patterns (case-insensitive)
 */
const MALE_PATTERNS = ["male", "m", "남", "남자", "남성", "man", "boy"];
const FEMALE_PATTERNS = ["female", "f", "여", "여자", "여성", "woman", "girl"];

/**
 * Normalize gender input to "male" or "female"
 *
 * @throws {SajuValidationError} if gender cannot be determined
 */
export function normalizeGender(input: string): Gender {
  const trimmed = input.trim().toLowerCase();

  if (MALE_PATTERNS.includes(trimmed)) {
    return "male";
  }

  if (FEMALE_PATTERNS.includes(trimmed)) {
    return "female";
  }

  throw new SajuValidationError(
    "VALIDATION_FAILED",
    `Cannot determine gender from: "${input}". Use: male/female, 남/여, 남자/여자`,
    "gender"
  );
}

/**
 * Try to normalize gender, returns null on failure
 */
export function tryNormalizeGender(input: string): Gender | null {
  try {
    return normalizeGender(input);
  } catch {
    return null;
  }
}

// ============================================================
// Calendar Type Normalization
// ============================================================

export type CalendarType = "solar" | "lunar";

const SOLAR_PATTERNS = ["solar", "양력", "양", "gregorian", "sun"];
const LUNAR_PATTERNS = ["lunar", "음력", "음", "chinese", "moon"];

/**
 * Normalize calendar type input
 *
 * @throws {SajuValidationError} if calendar type cannot be determined
 */
export function normalizeCalendarType(input: string): CalendarType {
  const trimmed = input.trim().toLowerCase();

  if (SOLAR_PATTERNS.includes(trimmed)) {
    return "solar";
  }

  if (LUNAR_PATTERNS.includes(trimmed)) {
    return "lunar";
  }

  throw new SajuValidationError(
    "VALIDATION_FAILED",
    `Cannot determine calendar type from: "${input}". Use: solar/lunar, 양력/음력`,
    "calendarType"
  );
}

/**
 * Try to normalize calendar type, returns null on failure
 */
export function tryNormalizeCalendarType(input: string): CalendarType | null {
  try {
    return normalizeCalendarType(input);
  } catch {
    return null;
  }
}

// ============================================================
// Combined Birth Info Normalization
// ============================================================

export interface NormalizedBirthInfo {
  date: NormalizedDate;
  time: NormalizedTime;
  gender?: Gender;
  calendarType: CalendarType;
  timezone: string;
}

export interface BirthInfoInput {
  birthDate: string;
  birthTime: string;
  gender?: string;
  calendarType?: string;
  timezone?: string;
}

/**
 * Normalize all birth info at once
 *
 * @throws {SajuValidationError} if any field cannot be parsed
 */
export function normalizeBirthInfo(input: BirthInfoInput): NormalizedBirthInfo {
  const date = normalizeDate(input.birthDate);
  const time = normalizeTime(input.birthTime);
  const gender = input.gender ? normalizeGender(input.gender) : undefined;
  const calendarType = input.calendarType
    ? normalizeCalendarType(input.calendarType)
    : "solar";
  const timezone = input.timezone || "Asia/Seoul";

  return {
    date,
    time,
    gender,
    calendarType,
    timezone,
  };
}

/**
 * Safe version that returns validation errors instead of throwing
 */
export function safeNormalizeBirthInfo(
  input: BirthInfoInput
): { success: true; data: NormalizedBirthInfo } | { success: false; errors: string[] } {
  const errors: string[] = [];

  let date: NormalizedDate | null = null;
  let time: NormalizedTime | null = null;
  let gender: Gender | undefined;
  let calendarType: CalendarType = "solar";

  // Try each field
  try {
    date = normalizeDate(input.birthDate);
  } catch (e) {
    errors.push(e instanceof SajuValidationError ? e.message : "Invalid birth date");
  }

  try {
    time = normalizeTime(input.birthTime);
  } catch (e) {
    errors.push(e instanceof SajuValidationError ? e.message : "Invalid birth time");
  }

  if (input.gender) {
    try {
      gender = normalizeGender(input.gender);
    } catch (e) {
      errors.push(e instanceof SajuValidationError ? e.message : "Invalid gender");
    }
  }

  if (input.calendarType) {
    try {
      calendarType = normalizeCalendarType(input.calendarType);
    } catch (e) {
      errors.push(e instanceof SajuValidationError ? e.message : "Invalid calendar type");
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      date: date!,
      time: time!,
      gender,
      calendarType,
      timezone: input.timezone || "Asia/Seoul",
    },
  };
}

// ============================================================
// Utility: Detect Input Format
// ============================================================

export interface DetectedFormat {
  type: "date" | "time" | "gender" | "calendarType" | "unknown";
  confidence: "high" | "medium" | "low";
  normalized?: string;
}

/**
 * Auto-detect what type of input was provided and try to normalize it
 */
export function detectAndNormalize(input: string): DetectedFormat {
  const trimmed = input.trim();

  // Try date first (longer patterns)
  const dateResult = tryNormalizeDate(trimmed);
  if (dateResult) {
    return { type: "date", confidence: "high", normalized: dateResult.date };
  }

  // Try time
  const timeResult = tryNormalizeTime(trimmed);
  if (timeResult) {
    return { type: "time", confidence: "high", normalized: timeResult.time };
  }

  // Try gender
  const genderResult = tryNormalizeGender(trimmed);
  if (genderResult) {
    return { type: "gender", confidence: "high", normalized: genderResult };
  }

  // Try calendar type
  const calendarResult = tryNormalizeCalendarType(trimmed);
  if (calendarResult) {
    return { type: "calendarType", confidence: "high", normalized: calendarResult };
  }

  return { type: "unknown", confidence: "low" };
}
