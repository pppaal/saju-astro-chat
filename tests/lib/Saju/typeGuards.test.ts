// tests/lib/Saju/typeGuards.test.ts
// Tests for Saju type guards

import { describe, it, expect } from "vitest";
import {
  // Primitive type guards
  isFiveElement,
  isYinYang,
  isSibsinKind,
  isPillarKind,
  isHeavenlyStem,
  isEarthlyBranch,
  // Object type guards
  isGanji,
  isStemBranchInfo,
  isJijangganSlot,
  isJijangganData,
  isPillarGanjiData,
  isPillarData,
  isSimplePillar,
  isSajuPillars,
  isDaeunData,
  isRelationHit,
  isShinsalHit,
  // Array type guards
  isPillarDataArray,
  isDaeunDataArray,
  isRelationHitArray,
  isShinsalHitArray,
  // Utility functions
  hasProperty,
  hasProperties,
  assertDefined,
  assertType,
  extractPillars,
  normalizeSimplePillar,
  extractElement,
  extractYinYang,
} from "@/lib/Saju/typeGuards";

// ============================================================
// Test Data Fixtures
// ============================================================

const validPillarGanjiData = {
  name: "甲",
  element: "목" as const,
  yin_yang: "양" as const,
  sibsin: "비견" as const,
};

const validJijangganSlot = {
  name: "癸",
  sibsin: "정인" as const,
};

const validJijangganData = {
  chogi: validJijangganSlot,
  junggi: validJijangganSlot,
  jeonggi: validJijangganSlot,
};

const validPillarData = {
  heavenlyStem: validPillarGanjiData,
  earthlyBranch: { ...validPillarGanjiData, name: "子" },
  jijanggan: validJijangganData,
};

// ============================================================
// Primitive Type Guards Tests
// ============================================================

describe("Primitive Type Guards", () => {
  describe("isFiveElement", () => {
    it("should return true for valid elements", () => {
      expect(isFiveElement("목")).toBe(true);
      expect(isFiveElement("화")).toBe(true);
      expect(isFiveElement("토")).toBe(true);
      expect(isFiveElement("금")).toBe(true);
      expect(isFiveElement("수")).toBe(true);
    });

    it("should return false for invalid values", () => {
      expect(isFiveElement("invalid")).toBe(false);
      expect(isFiveElement("")).toBe(false);
      expect(isFiveElement(null)).toBe(false);
      expect(isFiveElement(undefined)).toBe(false);
      expect(isFiveElement(123)).toBe(false);
    });
  });

  describe("isYinYang", () => {
    it("should return true for valid values", () => {
      expect(isYinYang("양")).toBe(true);
      expect(isYinYang("음")).toBe(true);
    });

    it("should return false for invalid values", () => {
      expect(isYinYang("invalid")).toBe(false);
      expect(isYinYang(null)).toBe(false);
    });
  });

  describe("isSibsinKind", () => {
    it("should return true for valid sibsin", () => {
      expect(isSibsinKind("비견")).toBe(true);
      expect(isSibsinKind("겁재")).toBe(true);
      expect(isSibsinKind("식신")).toBe(true);
      expect(isSibsinKind("상관")).toBe(true);
      expect(isSibsinKind("편재")).toBe(true);
      expect(isSibsinKind("정재")).toBe(true);
      expect(isSibsinKind("편관")).toBe(true);
      expect(isSibsinKind("정관")).toBe(true);
      expect(isSibsinKind("편인")).toBe(true);
      expect(isSibsinKind("정인")).toBe(true);
    });

    it("should return false for invalid values", () => {
      expect(isSibsinKind("invalid")).toBe(false);
    });
  });

  describe("isPillarKind", () => {
    it("should return true for valid pillar kinds", () => {
      expect(isPillarKind("year")).toBe(true);
      expect(isPillarKind("month")).toBe(true);
      expect(isPillarKind("day")).toBe(true);
      expect(isPillarKind("time")).toBe(true);
    });

    it("should return false for invalid values", () => {
      expect(isPillarKind("invalid")).toBe(false);
      expect(isPillarKind("hour")).toBe(false);
    });
  });

  describe("isHeavenlyStem", () => {
    it("should return true for all 10 stems", () => {
      const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
      stems.forEach((stem) => {
        expect(isHeavenlyStem(stem)).toBe(true);
      });
    });

    it("should return false for invalid values", () => {
      expect(isHeavenlyStem("X")).toBe(false);
      expect(isHeavenlyStem("子")).toBe(false); // branch, not stem
    });
  });

  describe("isEarthlyBranch", () => {
    it("should return true for all 12 branches", () => {
      const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
      branches.forEach((branch) => {
        expect(isEarthlyBranch(branch)).toBe(true);
      });
    });

    it("should return false for invalid values", () => {
      expect(isEarthlyBranch("甲")).toBe(false); // stem, not branch
      expect(isEarthlyBranch("invalid")).toBe(false);
    });
  });
});

// ============================================================
// Object Type Guards Tests
// ============================================================

describe("Object Type Guards", () => {
  describe("isGanji", () => {
    it("should return true for valid ganji", () => {
      expect(isGanji({ stem: "甲", branch: "子" })).toBe(true);
      expect(isGanji({ stem: "乙", branch: "丑" })).toBe(true);
    });

    it("should return false for invalid ganji", () => {
      expect(isGanji({ stem: "X", branch: "子" })).toBe(false);
      expect(isGanji({ stem: "甲", branch: "X" })).toBe(false);
      expect(isGanji({})).toBe(false);
      expect(isGanji(null)).toBe(false);
    });
  });

  describe("isStemBranchInfo", () => {
    it("should return true for valid StemBranchInfo", () => {
      expect(
        isStemBranchInfo({
          name: "甲",
          element: "목",
          yin_yang: "양",
        })
      ).toBe(true);

      // Also accept yinYang (camelCase)
      expect(
        isStemBranchInfo({
          name: "甲",
          element: "목",
          yinYang: "양",
        })
      ).toBe(true);
    });

    it("should return false for invalid objects", () => {
      expect(isStemBranchInfo({})).toBe(false);
      expect(isStemBranchInfo({ name: "甲" })).toBe(false);
      expect(isStemBranchInfo(null)).toBe(false);
    });
  });

  describe("isJijangganSlot", () => {
    it("should return true for valid slot", () => {
      expect(isJijangganSlot(validJijangganSlot)).toBe(true);
    });

    it("should return false for invalid slot", () => {
      expect(isJijangganSlot({})).toBe(false);
      expect(isJijangganSlot({ name: "癸" })).toBe(false);
    });
  });

  describe("isJijangganData", () => {
    it("should return true for valid jijanggan", () => {
      expect(isJijangganData(validJijangganData)).toBe(true);
      expect(isJijangganData({ jeonggi: validJijangganSlot })).toBe(true);
    });

    it("should return true for empty object (optional slots)", () => {
      expect(isJijangganData({})).toBe(true);
    });

    it("should return false for non-objects", () => {
      expect(isJijangganData(null)).toBe(false);
    });
  });

  describe("isPillarGanjiData", () => {
    it("should return true for valid pillar ganji data", () => {
      expect(isPillarGanjiData(validPillarGanjiData)).toBe(true);
    });

    it("should return false for incomplete data", () => {
      expect(isPillarGanjiData({ name: "甲" })).toBe(false);
      expect(isPillarGanjiData({})).toBe(false);
    });
  });

  describe("isPillarData", () => {
    it("should return true for valid pillar data", () => {
      expect(isPillarData(validPillarData)).toBe(true);
    });

    it("should return false for incomplete data", () => {
      expect(isPillarData({})).toBe(false);
      expect(isPillarData({ heavenlyStem: validPillarGanjiData })).toBe(false);
    });
  });

  describe("isSimplePillar", () => {
    it("should return true for stem/branch format", () => {
      expect(isSimplePillar({ stem: "甲", branch: "子" })).toBe(true);
    });

    it("should return true for heavenlyStem/earthlyBranch format", () => {
      expect(isSimplePillar({ heavenlyStem: "甲", earthlyBranch: "子" })).toBe(true);
    });

    it("should return false for invalid formats", () => {
      expect(isSimplePillar({})).toBe(false);
      expect(isSimplePillar({ stem: "甲" })).toBe(false);
    });
  });

  describe("isSajuPillars", () => {
    it("should return true for new format pillars", () => {
      expect(
        isSajuPillars({
          year: validPillarData,
          month: validPillarData,
          day: validPillarData,
          time: validPillarData,
        })
      ).toBe(true);
    });

    it("should return true for legacy format pillars", () => {
      expect(
        isSajuPillars({
          yearPillar: validPillarData,
          monthPillar: validPillarData,
          dayPillar: validPillarData,
          timePillar: validPillarData,
        })
      ).toBe(true);
    });

    it("should return false for incomplete pillars", () => {
      expect(isSajuPillars({})).toBe(false);
      expect(isSajuPillars({ year: validPillarData })).toBe(false);
    });
  });

  describe("isDaeunData", () => {
    it("should return true for valid daeun data", () => {
      expect(
        isDaeunData({
          age: 5,
          heavenlyStem: "甲",
          earthlyBranch: "子",
          sibsin: { cheon: "비견", ji: "정인" },
        })
      ).toBe(true);
    });

    it("should return false for invalid data", () => {
      expect(isDaeunData({})).toBe(false);
      expect(isDaeunData({ age: 5 })).toBe(false);
    });
  });

  describe("isRelationHit", () => {
    it("should return true for valid relation hit", () => {
      expect(
        isRelationHit({
          kind: "천간합",
          pillars: ["year", "month"],
        })
      ).toBe(true);

      expect(
        isRelationHit({
          kind: "지지충",
          pillars: ["day", "time"],
          detail: "子-午 충",
        })
      ).toBe(true);
    });

    it("should return false for invalid kind", () => {
      expect(
        isRelationHit({
          kind: "invalid",
          pillars: ["year"],
        })
      ).toBe(false);
    });
  });

  describe("isShinsalHit", () => {
    it("should return true for valid shinsal hit", () => {
      expect(
        isShinsalHit({
          kind: "역마",
          pillars: ["year"],
        })
      ).toBe(true);
    });

    it("should return false for invalid kind", () => {
      expect(
        isShinsalHit({
          kind: "invalid",
          pillars: ["year"],
        })
      ).toBe(false);
    });
  });
});

// ============================================================
// Array Type Guards Tests
// ============================================================

describe("Array Type Guards", () => {
  describe("isPillarDataArray", () => {
    it("should return true for array of valid pillar data", () => {
      expect(isPillarDataArray([validPillarData, validPillarData])).toBe(true);
    });

    it("should return false for array with invalid items", () => {
      expect(isPillarDataArray([validPillarData, {}])).toBe(false);
    });

    it("should return true for empty array", () => {
      expect(isPillarDataArray([])).toBe(true);
    });
  });

  describe("isDaeunDataArray", () => {
    it("should work correctly", () => {
      const validDaeun = {
        age: 5,
        heavenlyStem: "甲",
        earthlyBranch: "子",
        sibsin: { cheon: "비견", ji: "정인" },
      };
      expect(isDaeunDataArray([validDaeun])).toBe(true);
      expect(isDaeunDataArray([{}])).toBe(false);
    });
  });

  describe("isRelationHitArray", () => {
    it("should work correctly", () => {
      const validHit = { kind: "천간합", pillars: ["year"] };
      expect(isRelationHitArray([validHit])).toBe(true);
      expect(isRelationHitArray([{}])).toBe(false);
    });
  });

  describe("isShinsalHitArray", () => {
    it("should work correctly", () => {
      const validHit = { kind: "역마", pillars: ["year"] };
      expect(isShinsalHitArray([validHit])).toBe(true);
      expect(isShinsalHitArray([{}])).toBe(false);
    });
  });
});

// ============================================================
// Utility Functions Tests
// ============================================================

describe("Utility Functions", () => {
  describe("hasProperty", () => {
    it("should return true when property exists", () => {
      expect(hasProperty({ a: 1 }, "a")).toBe(true);
    });

    it("should return false when property does not exist", () => {
      expect(hasProperty({ a: 1 }, "b")).toBe(false);
    });

    it("should return false for non-objects", () => {
      expect(hasProperty(null, "a")).toBe(false);
      expect(hasProperty(undefined, "a")).toBe(false);
    });
  });

  describe("hasProperties", () => {
    it("should return true when all properties exist", () => {
      expect(hasProperties({ a: 1, b: 2 }, ["a", "b"])).toBe(true);
    });

    it("should return false when some properties are missing", () => {
      expect(hasProperties({ a: 1 }, ["a", "b"])).toBe(false);
    });
  });

  describe("assertDefined", () => {
    it("should not throw for defined values", () => {
      expect(() => assertDefined("value")).not.toThrow();
      expect(() => assertDefined(0)).not.toThrow();
      expect(() => assertDefined(false)).not.toThrow();
    });

    it("should throw for null or undefined", () => {
      expect(() => assertDefined(null)).toThrow();
      expect(() => assertDefined(undefined)).toThrow();
    });

    it("should use custom message", () => {
      expect(() => assertDefined(null, "Custom message")).toThrow("Custom message");
    });
  });

  describe("assertType", () => {
    it("should not throw when guard passes", () => {
      expect(() => assertType("목", isFiveElement)).not.toThrow();
    });

    it("should throw when guard fails", () => {
      expect(() => assertType("invalid", isFiveElement)).toThrow();
    });
  });

  describe("extractPillars", () => {
    it("should extract from new format", () => {
      const pillars = {
        year: validPillarData,
        month: validPillarData,
        day: validPillarData,
        time: validPillarData,
      };

      const result = extractPillars(pillars as any);
      expect(result.year).toBe(validPillarData);
    });

    it("should extract from legacy format", () => {
      const pillars = {
        yearPillar: validPillarData,
        monthPillar: validPillarData,
        dayPillar: validPillarData,
        timePillar: validPillarData,
      };

      const result = extractPillars(pillars as any);
      expect(result.year).toBe(validPillarData);
    });
  });

  describe("normalizeSimplePillar", () => {
    it("should normalize stem/branch format", () => {
      const result = normalizeSimplePillar({ stem: "甲", branch: "子" });
      expect(result.stem).toBe("甲");
      expect(result.branch).toBe("子");
    });

    it("should normalize heavenlyStem/earthlyBranch format", () => {
      const result = normalizeSimplePillar({ heavenlyStem: "甲", earthlyBranch: "子" } as any);
      expect(result.stem).toBe("甲");
      expect(result.branch).toBe("子");
    });
  });

  describe("extractElement", () => {
    it("should extract element from object", () => {
      expect(extractElement({ element: "목" })).toBe("목");
      expect(extractElement({ 오행: "화" })).toBe("화");
    });

    it("should return null for invalid input", () => {
      expect(extractElement(null)).toBeNull();
      expect(extractElement({})).toBeNull();
      expect(extractElement({ element: "invalid" })).toBeNull();
    });
  });

  describe("extractYinYang", () => {
    it("should extract yin-yang from object", () => {
      expect(extractYinYang({ yin_yang: "양" })).toBe("양");
      expect(extractYinYang({ yinYang: "음" })).toBe("음");
      expect(extractYinYang({ 음양: "양" })).toBe("양");
    });

    it("should return null for invalid input", () => {
      expect(extractYinYang(null)).toBeNull();
      expect(extractYinYang({})).toBeNull();
    });
  });
});
