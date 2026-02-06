// tests/lib/Saju/normalizer.test.ts
// Tests for input normalization utilities

import { describe, it, expect } from "vitest";
import {
  // Date normalization
  normalizeDate,
  tryNormalizeDate,
  // Time normalization
  normalizeTime,
  tryNormalizeTime,
  // Gender normalization
  normalizeGender,
  tryNormalizeGender,
  // Calendar type normalization
  normalizeCalendarType,
  tryNormalizeCalendarType,
  // Combined normalization
  normalizeBirthInfo,
  safeNormalizeBirthInfo,
  // Auto-detection
  detectAndNormalize,
} from "@/lib/Saju/normalizer";
import { SajuValidationError } from "@/lib/Saju/validation";

// ============================================================
// Date Normalization Tests
// ============================================================

describe("normalizeDate", () => {
  describe("ISO format (YYYY-MM-DD)", () => {
    it("should parse standard ISO format", () => {
      const result = normalizeDate("1990-05-15");
      expect(result.date).toBe("1990-05-15");
      expect(result.year).toBe(1990);
      expect(result.month).toBe(5);
      expect(result.day).toBe(15);
    });

    it("should parse single-digit month and day", () => {
      const result = normalizeDate("1990-5-5");
      expect(result.date).toBe("1990-05-05");
    });
  });

  describe("Slash format (YYYY/MM/DD)", () => {
    it("should parse slash format", () => {
      const result = normalizeDate("1990/05/15");
      expect(result.date).toBe("1990-05-15");
    });

    it("should parse single-digit values", () => {
      const result = normalizeDate("1990/5/5");
      expect(result.date).toBe("1990-05-05");
    });
  });

  describe("Dot format (YYYY.MM.DD)", () => {
    it("should parse dot format", () => {
      const result = normalizeDate("1990.05.15");
      expect(result.date).toBe("1990-05-15");
    });
  });

  describe("Korean format", () => {
    it("should parse Korean format with spaces", () => {
      const result = normalizeDate("1990년 5월 15일");
      expect(result.date).toBe("1990-05-15");
    });

    it("should parse Korean format without spaces", () => {
      const result = normalizeDate("1990년5월15일");
      expect(result.date).toBe("1990-05-15");
    });
  });

  describe("Compact format (YYYYMMDD)", () => {
    it("should parse compact format", () => {
      const result = normalizeDate("19900515");
      expect(result.date).toBe("1990-05-15");
    });
  });

  describe("US format (MM/DD/YYYY)", () => {
    it("should parse US format", () => {
      const result = normalizeDate("05/15/1990");
      expect(result.date).toBe("1990-05-15");
    });

    it("should parse single-digit US format", () => {
      const result = normalizeDate("5/15/1990");
      expect(result.date).toBe("1990-05-15");
    });
  });

  describe("Validation", () => {
    it("should reject years outside 1900-2100", () => {
      expect(() => normalizeDate("1899-01-01")).toThrow(SajuValidationError);
      expect(() => normalizeDate("2101-01-01")).toThrow(SajuValidationError);
    });

    it("should reject invalid months", () => {
      expect(() => normalizeDate("1990-13-01")).toThrow(SajuValidationError);
      expect(() => normalizeDate("1990-00-01")).toThrow(SajuValidationError);
    });

    it("should reject invalid days", () => {
      expect(() => normalizeDate("1990-01-32")).toThrow(SajuValidationError);
      expect(() => normalizeDate("1990-01-00")).toThrow(SajuValidationError);
    });

    it("should reject invalid dates like Feb 30", () => {
      expect(() => normalizeDate("1990-02-30")).toThrow(SajuValidationError);
    });

    it("should accept leap year Feb 29", () => {
      const result = normalizeDate("2000-02-29");
      expect(result.date).toBe("2000-02-29");
    });

    it("should reject non-leap year Feb 29", () => {
      expect(() => normalizeDate("1999-02-29")).toThrow(SajuValidationError);
    });

    it("should reject unparseable formats", () => {
      expect(() => normalizeDate("invalid")).toThrow(SajuValidationError);
      expect(() => normalizeDate("")).toThrow(SajuValidationError);
    });
  });

  describe("Original value preservation", () => {
    it("should preserve original input", () => {
      const result = normalizeDate("1990년 5월 15일");
      expect(result.original).toBe("1990년 5월 15일");
    });
  });
});

describe("tryNormalizeDate", () => {
  it("should return normalized date for valid input", () => {
    const result = tryNormalizeDate("1990-05-15");
    expect(result?.date).toBe("1990-05-15");
  });

  it("should return null for invalid input", () => {
    expect(tryNormalizeDate("invalid")).toBeNull();
    expect(tryNormalizeDate("1899-01-01")).toBeNull();
  });
});

// ============================================================
// Time Normalization Tests
// ============================================================

describe("normalizeTime", () => {
  describe("24-hour format", () => {
    it("should parse 24-hour format", () => {
      const result = normalizeTime("14:30");
      expect(result.time).toBe("14:30");
      expect(result.hour).toBe(14);
      expect(result.minute).toBe(30);
    });

    it("should parse midnight", () => {
      const result = normalizeTime("00:00");
      expect(result.time).toBe("00:00");
      expect(result.hour).toBe(0);
    });

    it("should parse single-digit hour", () => {
      const result = normalizeTime("9:30");
      expect(result.time).toBe("09:30");
    });
  });

  describe("12-hour format with AM/PM", () => {
    it("should parse PM time", () => {
      const result = normalizeTime("2:30 PM");
      expect(result.time).toBe("14:30");
      expect(result.hour).toBe(14);
    });

    it("should parse AM time", () => {
      const result = normalizeTime("9:30 AM");
      expect(result.time).toBe("09:30");
      expect(result.hour).toBe(9);
    });

    it("should handle 12:00 PM (noon)", () => {
      const result = normalizeTime("12:00 PM");
      expect(result.time).toBe("12:00");
      expect(result.hour).toBe(12);
    });

    it("should handle 12:00 AM (midnight)", () => {
      const result = normalizeTime("12:00 AM");
      expect(result.time).toBe("00:00");
      expect(result.hour).toBe(0);
    });

    it("should parse without space before AM/PM", () => {
      const result = normalizeTime("2:30PM");
      expect(result.time).toBe("14:30");
    });

    it("should be case-insensitive for AM/PM", () => {
      expect(normalizeTime("2:30 pm").time).toBe("14:30");
      expect(normalizeTime("2:30 Pm").time).toBe("14:30");
    });
  });

  describe("Korean 24-hour format", () => {
    it("should parse Korean 24h format", () => {
      const result = normalizeTime("14시 30분");
      expect(result.time).toBe("14:30");
    });

    it("should parse without space", () => {
      const result = normalizeTime("14시30분");
      expect(result.time).toBe("14:30");
    });

    it("should parse hour only", () => {
      const result = normalizeTime("14시");
      expect(result.time).toBe("14:00");
    });
  });

  describe("Korean 12-hour format", () => {
    it("should parse 오후 (PM)", () => {
      const result = normalizeTime("오후 2시 30분");
      expect(result.time).toBe("14:30");
    });

    it("should parse 오전 (AM)", () => {
      const result = normalizeTime("오전 9시 30분");
      expect(result.time).toBe("09:30");
    });

    it("should parse hour only with 오후", () => {
      const result = normalizeTime("오후 2시");
      expect(result.time).toBe("14:00");
    });

    it("should parse 오후 12시 as noon", () => {
      const result = normalizeTime("오후 12시 0분");
      expect(result.time).toBe("12:00");
    });
  });

  describe("Compact format", () => {
    it("should parse compact format", () => {
      const result = normalizeTime("1430");
      expect(result.time).toBe("14:30");
    });

    it("should parse midnight compact", () => {
      const result = normalizeTime("0000");
      expect(result.time).toBe("00:00");
    });
  });

  describe("Validation", () => {
    it("should reject invalid hours", () => {
      expect(() => normalizeTime("24:00")).toThrow(SajuValidationError);
      expect(() => normalizeTime("25:00")).toThrow(SajuValidationError);
    });

    it("should reject invalid minutes", () => {
      expect(() => normalizeTime("12:60")).toThrow(SajuValidationError);
    });

    it("should reject unparseable formats", () => {
      expect(() => normalizeTime("invalid")).toThrow(SajuValidationError);
    });
  });

  describe("시진 (Time period)", () => {
    it("should include 시진 in result", () => {
      const result = normalizeTime("12:00");
      expect(result.sijin).toContain("오시");
    });

    it("should return correct 시진 for different hours", () => {
      expect(normalizeTime("00:00").sijin).toContain("자시");
      expect(normalizeTime("02:00").sijin).toContain("축시");
      expect(normalizeTime("06:00").sijin).toContain("묘시");
    });
  });
});

describe("tryNormalizeTime", () => {
  it("should return normalized time for valid input", () => {
    const result = tryNormalizeTime("14:30");
    expect(result?.time).toBe("14:30");
  });

  it("should return null for invalid input", () => {
    expect(tryNormalizeTime("invalid")).toBeNull();
    expect(tryNormalizeTime("25:00")).toBeNull();
  });
});

// ============================================================
// Gender Normalization Tests
// ============================================================

describe("normalizeGender", () => {
  describe("Male inputs", () => {
    it("should normalize male variants", () => {
      expect(normalizeGender("male")).toBe("male");
      expect(normalizeGender("m")).toBe("male");
      expect(normalizeGender("남")).toBe("male");
      expect(normalizeGender("남자")).toBe("male");
      expect(normalizeGender("남성")).toBe("male");
      expect(normalizeGender("man")).toBe("male");
      expect(normalizeGender("boy")).toBe("male");
    });

    it("should be case-insensitive", () => {
      expect(normalizeGender("MALE")).toBe("male");
      expect(normalizeGender("Male")).toBe("male");
      expect(normalizeGender("M")).toBe("male");
    });
  });

  describe("Female inputs", () => {
    it("should normalize female variants", () => {
      expect(normalizeGender("female")).toBe("female");
      expect(normalizeGender("f")).toBe("female");
      expect(normalizeGender("여")).toBe("female");
      expect(normalizeGender("여자")).toBe("female");
      expect(normalizeGender("여성")).toBe("female");
      expect(normalizeGender("woman")).toBe("female");
      expect(normalizeGender("girl")).toBe("female");
    });
  });

  describe("Validation", () => {
    it("should reject invalid inputs", () => {
      expect(() => normalizeGender("invalid")).toThrow(SajuValidationError);
      expect(() => normalizeGender("")).toThrow(SajuValidationError);
    });
  });
});

describe("tryNormalizeGender", () => {
  it("should return gender for valid input", () => {
    expect(tryNormalizeGender("남자")).toBe("male");
  });

  it("should return null for invalid input", () => {
    expect(tryNormalizeGender("invalid")).toBeNull();
  });
});

// ============================================================
// Calendar Type Normalization Tests
// ============================================================

describe("normalizeCalendarType", () => {
  describe("Solar inputs", () => {
    it("should normalize solar variants", () => {
      expect(normalizeCalendarType("solar")).toBe("solar");
      expect(normalizeCalendarType("양력")).toBe("solar");
      expect(normalizeCalendarType("양")).toBe("solar");
      expect(normalizeCalendarType("gregorian")).toBe("solar");
      expect(normalizeCalendarType("sun")).toBe("solar");
    });
  });

  describe("Lunar inputs", () => {
    it("should normalize lunar variants", () => {
      expect(normalizeCalendarType("lunar")).toBe("lunar");
      expect(normalizeCalendarType("음력")).toBe("lunar");
      expect(normalizeCalendarType("음")).toBe("lunar");
      expect(normalizeCalendarType("chinese")).toBe("lunar");
      expect(normalizeCalendarType("moon")).toBe("lunar");
    });
  });

  describe("Validation", () => {
    it("should reject invalid inputs", () => {
      expect(() => normalizeCalendarType("invalid")).toThrow(SajuValidationError);
    });
  });
});

describe("tryNormalizeCalendarType", () => {
  it("should return calendar type for valid input", () => {
    expect(tryNormalizeCalendarType("음력")).toBe("lunar");
  });

  it("should return null for invalid input", () => {
    expect(tryNormalizeCalendarType("invalid")).toBeNull();
  });
});

// ============================================================
// Combined Birth Info Normalization Tests
// ============================================================

describe("normalizeBirthInfo", () => {
  it("should normalize all fields together", () => {
    const result = normalizeBirthInfo({
      birthDate: "1990년 5월 15일",
      birthTime: "오후 2시 30분",
      gender: "남자",
      calendarType: "양력",
      timezone: "Asia/Seoul",
    });

    expect(result.date.date).toBe("1990-05-15");
    expect(result.time.time).toBe("14:30");
    expect(result.gender).toBe("male");
    expect(result.calendarType).toBe("solar");
    expect(result.timezone).toBe("Asia/Seoul");
  });

  it("should use defaults for optional fields", () => {
    const result = normalizeBirthInfo({
      birthDate: "1990-05-15",
      birthTime: "14:30",
    });

    expect(result.gender).toBeUndefined();
    expect(result.calendarType).toBe("solar");
    expect(result.timezone).toBe("Asia/Seoul");
  });

  it("should throw for invalid date", () => {
    expect(() =>
      normalizeBirthInfo({
        birthDate: "invalid",
        birthTime: "14:30",
      })
    ).toThrow(SajuValidationError);
  });
});

describe("safeNormalizeBirthInfo", () => {
  it("should return success for valid input", () => {
    const result = safeNormalizeBirthInfo({
      birthDate: "1990-05-15",
      birthTime: "14:30",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date.date).toBe("1990-05-15");
    }
  });

  it("should return errors for invalid input", () => {
    const result = safeNormalizeBirthInfo({
      birthDate: "invalid",
      birthTime: "invalid",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("should collect multiple errors", () => {
    const result = safeNormalizeBirthInfo({
      birthDate: "invalid-date",
      birthTime: "invalid-time",
      gender: "invalid-gender",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    }
  });
});

// ============================================================
// Auto-Detection Tests
// ============================================================

describe("detectAndNormalize", () => {
  it("should detect dates", () => {
    const result = detectAndNormalize("1990-05-15");
    expect(result.type).toBe("date");
    expect(result.confidence).toBe("high");
    expect(result.normalized).toBe("1990-05-15");
  });

  it("should detect times", () => {
    const result = detectAndNormalize("14:30");
    expect(result.type).toBe("time");
    expect(result.confidence).toBe("high");
    expect(result.normalized).toBe("14:30");
  });

  it("should detect gender", () => {
    const result = detectAndNormalize("남자");
    expect(result.type).toBe("gender");
    expect(result.confidence).toBe("high");
    expect(result.normalized).toBe("male");
  });

  it("should detect calendar type", () => {
    const result = detectAndNormalize("음력");
    expect(result.type).toBe("calendarType");
    expect(result.confidence).toBe("high");
    expect(result.normalized).toBe("lunar");
  });

  it("should return unknown for unrecognized input", () => {
    const result = detectAndNormalize("random text");
    expect(result.type).toBe("unknown");
    expect(result.confidence).toBe("low");
  });
});
