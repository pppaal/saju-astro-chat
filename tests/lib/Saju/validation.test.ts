// tests/lib/Saju/validation.test.ts
// Tests for Saju validation utilities

import { describe, it, expect } from "vitest";
import {
  // Schemas
  SajuTimeSchema,
  SajuDateSchema,
  StemSchema,
  BranchSchema,
  ElementSchema,
  SibsinSchema,
  SajuBirthInfoSchema,
  SimplePillarSchema,
  // Functions
  parseTimeStringSafe,
  tryParseTimeString,
  validateSajuBirthInfo,
  safeValidateSajuBirthInfo,
  isValidStem,
  isValidBranch,
  isValidElement,
  isValidSibsin,
  isValidGanji,
  getTimeBranchFromHour,
  getTimePeriodName,
  // Constants
  VALID_STEMS,
  VALID_BRANCHES,
  VALID_ELEMENTS,
  VALID_SIBSIN,
  // Error class
  SajuValidationError,
} from "@/lib/Saju/validation";

describe("SajuTimeSchema", () => {
  it("should accept valid 24-hour format", () => {
    expect(SajuTimeSchema.parse("00:00")).toBe("00:00");
    expect(SajuTimeSchema.parse("12:30")).toBe("12:30");
    expect(SajuTimeSchema.parse("23:59")).toBe("23:59");
  });

  it("should accept valid 12-hour format with AM/PM", () => {
    expect(SajuTimeSchema.parse("2:30 PM")).toBe("2:30 PM");
    expect(SajuTimeSchema.parse("12:00 AM")).toBe("12:00 AM");
    expect(SajuTimeSchema.parse("11:59 PM")).toBe("11:59 PM");
  });

  it("should trim and uppercase input", () => {
    expect(SajuTimeSchema.parse("  2:30 pm  ")).toBe("2:30 PM");
  });

  it("should reject invalid times", () => {
    expect(() => SajuTimeSchema.parse("25:00")).toThrow();
    expect(() => SajuTimeSchema.parse("12:60")).toThrow();
    expect(() => SajuTimeSchema.parse("invalid")).toThrow();
    expect(() => SajuTimeSchema.parse("")).toThrow();
  });
});

describe("SajuDateSchema", () => {
  it("should accept valid dates", () => {
    expect(SajuDateSchema.parse("1990-05-15")).toBe("1990-05-15");
    expect(SajuDateSchema.parse("2000-01-01")).toBe("2000-01-01");
    expect(SajuDateSchema.parse("2024-12-31")).toBe("2024-12-31");
  });

  it("should reject dates outside 1900-2100", () => {
    expect(() => SajuDateSchema.parse("1899-12-31")).toThrow();
    expect(() => SajuDateSchema.parse("2101-01-01")).toThrow();
  });

  it("should reject invalid date formats", () => {
    expect(() => SajuDateSchema.parse("90-05-15")).toThrow();
    expect(() => SajuDateSchema.parse("1990/05/15")).toThrow();
    expect(() => SajuDateSchema.parse("invalid")).toThrow();
  });
});

describe("StemSchema and BranchSchema", () => {
  it("should accept all valid stems", () => {
    VALID_STEMS.forEach((stem) => {
      expect(StemSchema.parse(stem)).toBe(stem);
    });
  });

  it("should accept all valid branches", () => {
    VALID_BRANCHES.forEach((branch) => {
      expect(BranchSchema.parse(branch)).toBe(branch);
    });
  });

  it("should reject invalid stems", () => {
    expect(() => StemSchema.parse("X")).toThrow();
    expect(() => StemSchema.parse("")).toThrow();
  });

  it("should reject invalid branches", () => {
    expect(() => BranchSchema.parse("X")).toThrow();
    expect(() => BranchSchema.parse("")).toThrow();
  });
});

describe("parseTimeStringSafe", () => {
  it("should parse 24-hour format correctly", () => {
    const result = parseTimeStringSafe("14:30");
    expect(result.hour).toBe(14);
    expect(result.minute).toBe(30);
  });

  it("should parse 12-hour format with PM", () => {
    const result = parseTimeStringSafe("2:30 PM");
    expect(result.hour).toBe(14);
    expect(result.minute).toBe(30);
  });

  it("should parse 12-hour format with AM", () => {
    const result = parseTimeStringSafe("2:30 AM");
    expect(result.hour).toBe(2);
    expect(result.minute).toBe(30);
  });

  it("should handle midnight correctly", () => {
    const result = parseTimeStringSafe("12:00 AM");
    expect(result.hour).toBe(0);
    expect(result.minute).toBe(0);
  });

  it("should handle noon correctly", () => {
    const result = parseTimeStringSafe("12:00 PM");
    expect(result.hour).toBe(12);
    expect(result.minute).toBe(0);
  });

  it("should throw SajuValidationError for invalid format", () => {
    expect(() => parseTimeStringSafe("invalid")).toThrow(SajuValidationError);
    expect(() => parseTimeStringSafe("25:00")).toThrow(SajuValidationError);
  });

  it("should include original input in result", () => {
    const result = parseTimeStringSafe("14:30");
    expect(result.original).toBe("14:30");
  });
});

describe("tryParseTimeString", () => {
  it("should return parsed time for valid input", () => {
    const result = tryParseTimeString("14:30");
    expect(result).not.toBeNull();
    expect(result?.hour).toBe(14);
  });

  it("should return null for invalid input", () => {
    expect(tryParseTimeString("invalid")).toBeNull();
    expect(tryParseTimeString("25:00")).toBeNull();
  });
});

describe("validateSajuBirthInfo", () => {
  it("should validate correct birth info", () => {
    const result = validateSajuBirthInfo({
      birthDate: "1990-05-15",
      birthTime: "14:30",
    });

    expect(result.birthDate).toBe("1990-05-15");
    expect(result.birthTime).toBe("14:30");
    expect(result.isLunar).toBe(false);
    expect(result.timezone).toBe("Asia/Seoul");
  });

  it("should accept optional gender", () => {
    const result = validateSajuBirthInfo({
      birthDate: "1990-05-15",
      birthTime: "14:30",
      gender: "male",
    });

    expect(result.gender).toBe("male");
  });

  it("should throw for invalid date", () => {
    expect(() =>
      validateSajuBirthInfo({
        birthDate: "invalid",
        birthTime: "14:30",
      })
    ).toThrow();
  });
});

describe("safeValidateSajuBirthInfo", () => {
  it("should return success for valid input", () => {
    const result = safeValidateSajuBirthInfo({
      birthDate: "1990-05-15",
      birthTime: "14:30",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.birthDate).toBe("1990-05-15");
    }
  });

  it("should return errors for invalid input", () => {
    const result = safeValidateSajuBirthInfo({
      birthDate: "invalid",
      birthTime: "invalid",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

describe("Validation helper functions", () => {
  describe("isValidStem", () => {
    it("should return true for valid stems", () => {
      expect(isValidStem("甲")).toBe(true);
      expect(isValidStem("乙")).toBe(true);
    });

    it("should return false for invalid stems", () => {
      expect(isValidStem("X")).toBe(false);
      expect(isValidStem("")).toBe(false);
    });
  });

  describe("isValidBranch", () => {
    it("should return true for valid branches", () => {
      expect(isValidBranch("子")).toBe(true);
      expect(isValidBranch("丑")).toBe(true);
    });

    it("should return false for invalid branches", () => {
      expect(isValidBranch("X")).toBe(false);
    });
  });

  describe("isValidElement", () => {
    it("should return true for valid elements", () => {
      VALID_ELEMENTS.forEach((el) => {
        expect(isValidElement(el)).toBe(true);
      });
    });

    it("should return false for invalid elements", () => {
      expect(isValidElement("invalid")).toBe(false);
    });
  });

  describe("isValidSibsin", () => {
    it("should return true for valid sibsin", () => {
      VALID_SIBSIN.forEach((s) => {
        expect(isValidSibsin(s)).toBe(true);
      });
    });

    it("should return false for invalid sibsin", () => {
      expect(isValidSibsin("invalid")).toBe(false);
    });
  });

  describe("isValidGanji", () => {
    it("should return true for valid ganji pairs", () => {
      expect(isValidGanji("甲", "子")).toBe(true);
      expect(isValidGanji("乙", "丑")).toBe(true);
    });

    it("should return false for invalid pairs", () => {
      expect(isValidGanji("X", "子")).toBe(false);
      expect(isValidGanji("甲", "X")).toBe(false);
    });
  });
});

describe("getTimeBranchFromHour", () => {
  it("should return correct branch for each time period", () => {
    // 자시 (子時): 23:00-01:00
    expect(getTimeBranchFromHour(23)).toBe("子");
    expect(getTimeBranchFromHour(0)).toBe("子");

    // 축시 (丑時): 01:00-03:00
    expect(getTimeBranchFromHour(1)).toBe("丑");
    expect(getTimeBranchFromHour(2)).toBe("丑");

    // 인시 (寅時): 03:00-05:00
    expect(getTimeBranchFromHour(3)).toBe("寅");
    expect(getTimeBranchFromHour(4)).toBe("寅");

    // 오시 (午時): 11:00-13:00
    expect(getTimeBranchFromHour(11)).toBe("午");
    expect(getTimeBranchFromHour(12)).toBe("午");
  });

  it("should throw for invalid hours", () => {
    expect(() => getTimeBranchFromHour(-1)).toThrow(SajuValidationError);
    expect(() => getTimeBranchFromHour(24)).toThrow(SajuValidationError);
  });
});

describe("getTimePeriodName", () => {
  it("should return correct period names", () => {
    expect(getTimePeriodName(0)).toBe("자시 (子時)");
    expect(getTimePeriodName(12)).toBe("오시 (午時)");
  });
});

describe("SajuValidationError", () => {
  it("should create error with code and message", () => {
    const error = new SajuValidationError("INVALID_TIME_FORMAT", "Test message");
    expect(error.code).toBe("INVALID_TIME_FORMAT");
    expect(error.message).toBe("Test message");
    expect(error.name).toBe("SajuValidationError");
  });

  it("should support field parameter", () => {
    const error = new SajuValidationError("INVALID_HOUR", "Test", "birthTime");
    expect(error.field).toBe("birthTime");
  });

  it("should provide localized messages", () => {
    const error = new SajuValidationError("INVALID_TIME_FORMAT", "Test");
    expect(error.getLocalizedMessage("ko")).toContain("시간");
    expect(error.getLocalizedMessage("en")).toContain("time");
  });

  it("should serialize to JSON", () => {
    const error = new SajuValidationError("INVALID_HOUR", "Test", "birthTime");
    const json = error.toJSON();

    expect(json.name).toBe("SajuValidationError");
    expect(json.code).toBe("INVALID_HOUR");
    expect(json.message).toBe("Test");
    expect(json.field).toBe("birthTime");
  });
});

describe("SimplePillarSchema", () => {
  it("should accept valid simple pillar", () => {
    const result = SimplePillarSchema.parse({
      stem: "甲",
      branch: "子",
    });

    expect(result.stem).toBe("甲");
    expect(result.branch).toBe("子");
  });

  it("should reject invalid stem", () => {
    expect(() =>
      SimplePillarSchema.parse({
        stem: "X",
        branch: "子",
      })
    ).toThrow();
  });

  it("should reject invalid branch", () => {
    expect(() =>
      SimplePillarSchema.parse({
        stem: "甲",
        branch: "X",
      })
    ).toThrow();
  });
});
