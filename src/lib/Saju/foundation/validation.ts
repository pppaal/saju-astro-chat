// src/lib/Saju/validation.ts
// Saju-specific validation utilities with safe time parsing

import { z } from "zod";
import type { FiveElement, YinYang, SibsinKind, PillarKind } from "./types";

// ============================================================
// Constants
// ============================================================

/** Valid 천간 (Heavenly Stems) */
export const VALID_STEMS = [
  "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸",
] as const;

/** Valid 지지 (Earthly Branches) */
export const VALID_BRANCHES = [
  "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥",
] as const;

/** Valid 오행 (Five Elements) */
export const VALID_ELEMENTS = ["목", "화", "토", "금", "수"] as const satisfies readonly FiveElement[];

/** Valid 음양 (Yin-Yang) */
export const VALID_YIN_YANG = ["양", "음"] as const satisfies readonly YinYang[];

/** Valid 십신 (Ten Gods) */
export const VALID_SIBSIN = [
  "비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인",
] as const satisfies readonly SibsinKind[];

/** Valid 기둥 종류 */
export const VALID_PILLAR_KINDS = ["year", "month", "day", "time"] as const satisfies readonly PillarKind[];

// ============================================================
// Zod Schemas
// ============================================================

/**
 * Time format schema: HH:MM or HH:MM AM/PM
 * Validates hours 0-23 and minutes 0-59
 */
export const SajuTimeSchema = z
  .string()
  .transform((val) => val.trim().toUpperCase())
  .refine(
    (val) => {
      // Match HH:MM or H:MM with optional AM/PM
      const match = val.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
      if (!match) return false;

      let hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      const period = match[3]?.toUpperCase();

      // Convert 12-hour to 24-hour
      if (period === "PM" && hour < 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;

      return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
    },
    { message: "Invalid time format. Use HH:MM (00:00-23:59) or H:MM AM/PM" }
  );

/**
 * Birth date schema: YYYY-MM-DD
 * Validates realistic birth years (1900-2100)
 */
export const SajuDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine(
    (val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) return false;

      const year = date.getFullYear();
      return year >= 1900 && year <= 2100;
    },
    { message: "Birth year must be between 1900 and 2100" }
  );

/**
 * 천간 (Heavenly Stem) schema
 */
export const StemSchema = z.enum(VALID_STEMS);

/**
 * 지지 (Earthly Branch) schema
 */
export const BranchSchema = z.enum(VALID_BRANCHES);

/**
 * 오행 (Five Element) schema
 */
export const ElementSchema = z.enum(VALID_ELEMENTS);

/**
 * 음양 (Yin-Yang) schema
 */
export const YinYangSchema = z.enum(VALID_YIN_YANG);

/**
 * 십신 (Ten Gods) schema
 */
export const SibsinSchema = z.enum(VALID_SIBSIN);

/**
 * 기둥 종류 schema
 */
export const PillarKindSchema = z.enum(VALID_PILLAR_KINDS);

/**
 * Simple pillar input schema
 */
export const SimplePillarSchema = z.object({
  stem: StemSchema,
  branch: BranchSchema,
});

/**
 * Complete birth info for Saju calculation
 */
export const SajuBirthInfoSchema = z.object({
  birthDate: SajuDateSchema,
  birthTime: SajuTimeSchema,
  isLunar: z.boolean().optional().default(false),
  gender: z.enum(["male", "female"]).optional(),
  timezone: z.string().optional().default("Asia/Seoul"),
});

// ============================================================
// Safe Parsing Functions
// ============================================================

export interface ParsedTime {
  hour: number;
  minute: number;
  original: string;
}

/**
 * Safely parse time string with full validation
 * Supports: "14:30", "2:30 PM", "02:30", "2:30PM"
 *
 * @throws {SajuValidationError} if time format is invalid
 */
export function parseTimeStringSafe(timeStr: string): ParsedTime {
  const normalized = timeStr.trim().toUpperCase();

  // Match various time formats
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);

  if (!match) {
    throw new SajuValidationError(
      "INVALID_TIME_FORMAT",
      `Invalid time format: "${timeStr}". Expected HH:MM or H:MM AM/PM`
    );
  }

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3];

  // Validate ranges before conversion
  if (hour < 0 || hour > 23 || (period && hour > 12)) {
    throw new SajuValidationError(
      "INVALID_HOUR",
      `Hour out of range: ${hour}. Must be 0-23 (or 1-12 with AM/PM)`
    );
  }

  if (minute < 0 || minute > 59) {
    throw new SajuValidationError(
      "INVALID_MINUTE",
      `Minute out of range: ${minute}. Must be 0-59`
    );
  }

  // Convert 12-hour to 24-hour
  if (period === "PM" && hour < 12) {
    hour += 12;
  } else if (period === "AM" && hour === 12) {
    hour = 0;
  }

  return {
    hour,
    minute,
    original: timeStr,
  };
}

/**
 * Parse time string without throwing (returns null on failure)
 */
export function tryParseTimeString(timeStr: string): ParsedTime | null {
  try {
    return parseTimeStringSafe(timeStr);
  } catch {
    return null;
  }
}

/**
 * Validate Saju birth info and return parsed result
 */
export function validateSajuBirthInfo(input: unknown): z.infer<typeof SajuBirthInfoSchema> {
  return SajuBirthInfoSchema.parse(input);
}

/**
 * Safe validation that returns result object instead of throwing
 */
export function safeValidateSajuBirthInfo(
  input: unknown
): { success: true; data: z.infer<typeof SajuBirthInfoSchema> } | { success: false; errors: string[] } {
  const result = SajuBirthInfoSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Extract error messages from Zod error (Zod v4 compatible)
  const issues = result.error?.issues ?? [];
  const errors = issues.length > 0
    ? issues.map((e) => `${e.path.map(String).join(".")}: ${e.message}`)
    : ["Validation failed"];

  return {
    success: false,
    errors,
  };
}

// ============================================================
// Validation Helpers
// ============================================================

/**
 * Check if a string is a valid 천간
 */
export function isValidStem(value: string): value is (typeof VALID_STEMS)[number] {
  return VALID_STEMS.includes(value as (typeof VALID_STEMS)[number]);
}

/**
 * Check if a string is a valid 지지
 */
export function isValidBranch(value: string): value is (typeof VALID_BRANCHES)[number] {
  return VALID_BRANCHES.includes(value as (typeof VALID_BRANCHES)[number]);
}

/**
 * Check if a string is a valid 오행
 */
export function isValidElement(value: string): value is FiveElement {
  return VALID_ELEMENTS.includes(value as FiveElement);
}

/**
 * Check if a string is a valid 십신
 */
export function isValidSibsin(value: string): value is SibsinKind {
  return VALID_SIBSIN.includes(value as SibsinKind);
}

/**
 * Validate 간지 pair (천간 + 지지)
 */
export function isValidGanji(stem: string, branch: string): boolean {
  return isValidStem(stem) && isValidBranch(branch);
}

/**
 * Calculate 시주 (time pillar branch) from hour
 * 자시(子時): 23:00-01:00, 축시(丑時): 01:00-03:00, ...
 */
export function getTimeBranchFromHour(hour: number): (typeof VALID_BRANCHES)[number] {
  if (hour < 0 || hour > 23) {
    throw new SajuValidationError("INVALID_HOUR", `Hour must be 0-23, got: ${hour}`);
  }

  // 자시는 23:00-01:00
  const index = Math.floor(((hour + 1) % 24) / 2);
  return VALID_BRANCHES[index];
}

/**
 * Get 시진 (time period name) from hour
 */
export function getTimePeriodName(hour: number): string {
  const branchNames: Record<string, string> = {
    子: "자시 (子時)",
    丑: "축시 (丑時)",
    寅: "인시 (寅時)",
    卯: "묘시 (卯時)",
    辰: "진시 (辰時)",
    巳: "사시 (巳時)",
    午: "오시 (午時)",
    未: "미시 (未時)",
    申: "신시 (申時)",
    酉: "유시 (酉時)",
    戌: "술시 (戌時)",
    亥: "해시 (亥時)",
  };

  const branch = getTimeBranchFromHour(hour);
  return branchNames[branch] || branch;
}

// ============================================================
// Custom Error Class
// ============================================================

export type SajuValidationErrorCode =
  | "INVALID_TIME_FORMAT"
  | "INVALID_HOUR"
  | "INVALID_MINUTE"
  | "INVALID_DATE_FORMAT"
  | "INVALID_YEAR"
  | "INVALID_STEM"
  | "INVALID_BRANCH"
  | "INVALID_ELEMENT"
  | "INVALID_SIBSIN"
  | "INVALID_GANJI"
  | "MISSING_REQUIRED_FIELD"
  | "VALIDATION_FAILED";

/**
 * Saju-specific validation error
 */
export class SajuValidationError extends Error {
  readonly code: SajuValidationErrorCode;
  readonly field?: string;

  constructor(code: SajuValidationErrorCode, message: string, field?: string) {
    super(message);
    this.name = "SajuValidationError";
    this.code = code;
    this.field = field;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SajuValidationError);
    }
  }

  /**
   * Get localized error message
   */
  getLocalizedMessage(lang: "ko" | "en" = "ko"): string {
    const messages: Record<SajuValidationErrorCode, { ko: string; en: string }> = {
      INVALID_TIME_FORMAT: {
        ko: "시간 형식이 올바르지 않습니다 (HH:MM 또는 H:MM AM/PM)",
        en: "Invalid time format (HH:MM or H:MM AM/PM)",
      },
      INVALID_HOUR: {
        ko: "시간이 범위를 벗어났습니다 (0-23)",
        en: "Hour out of range (0-23)",
      },
      INVALID_MINUTE: {
        ko: "분이 범위를 벗어났습니다 (0-59)",
        en: "Minute out of range (0-59)",
      },
      INVALID_DATE_FORMAT: {
        ko: "날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)",
        en: "Invalid date format (YYYY-MM-DD)",
      },
      INVALID_YEAR: {
        ko: "출생년도는 1900-2100 사이여야 합니다",
        en: "Birth year must be between 1900 and 2100",
      },
      INVALID_STEM: {
        ko: "올바르지 않은 천간입니다",
        en: "Invalid heavenly stem",
      },
      INVALID_BRANCH: {
        ko: "올바르지 않은 지지입니다",
        en: "Invalid earthly branch",
      },
      INVALID_ELEMENT: {
        ko: "올바르지 않은 오행입니다",
        en: "Invalid five element",
      },
      INVALID_SIBSIN: {
        ko: "올바르지 않은 십신입니다",
        en: "Invalid ten god",
      },
      INVALID_GANJI: {
        ko: "올바르지 않은 간지 조합입니다",
        en: "Invalid stem-branch combination",
      },
      MISSING_REQUIRED_FIELD: {
        ko: "필수 필드가 누락되었습니다",
        en: "Required field is missing",
      },
      VALIDATION_FAILED: {
        ko: "입력값 검증에 실패했습니다",
        en: "Validation failed",
      },
    };

    return messages[this.code]?.[lang] || this.message;
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      field: this.field,
    };
  }
}

// ============================================================
// Type exports
// ============================================================

export type ValidStem = (typeof VALID_STEMS)[number];
export type ValidBranch = (typeof VALID_BRANCHES)[number];
