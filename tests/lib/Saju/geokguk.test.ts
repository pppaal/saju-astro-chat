/**
 * Geokguk (격국) Tests
 * Tests for Korean fortune-telling pattern determination
 */

import {
  determineGeokguk,
  getGeokgukDescription,
  evaluateGeokgukStatus,
  evaluateHwagiGeokguk,
  determineGeokgukAdvanced,
  type GeokgukType,
  type SajuPillarsInput,
} from "@/lib/Saju/geokguk";

// Note: evaluateGeokgukStatus takes (geokguk, pillars) in that order
// Note: evaluateHwagiGeokguk returns { possible, type, conditions, description }

// Helper to create test pillars
function createPillars(
  yearStem: string, yearBranch: string,
  monthStem: string, monthBranch: string,
  dayStem: string, dayBranch: string,
  timeStem: string, timeBranch: string
): SajuPillarsInput {
  return {
    year: { stem: yearStem, branch: yearBranch },
    month: { stem: monthStem, branch: monthBranch },
    day: { stem: dayStem, branch: dayBranch },
    time: { stem: timeStem, branch: timeBranch },
  };
}

describe("Geokguk Module", () => {
  describe("determineGeokguk", () => {
    it("returns a valid GeokgukResult structure", () => {
      const pillars = createPillars("甲", "子", "丙", "寅", "戊", "辰", "庚", "午");
      const result = determineGeokguk(pillars);

      expect(result).toHaveProperty("primary");
      expect(result).toHaveProperty("category");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("description");
    });

    it("assigns a category from valid categories", () => {
      const pillars = createPillars("甲", "子", "乙", "丑", "丙", "寅", "丁", "卯");
      const result = determineGeokguk(pillars);

      const validCategories = ["정격", "종격", "비격", "화기격국", "특수격국", "미정"];
      expect(validCategories).toContain(result.category);
    });

    it("assigns confidence level", () => {
      const pillars = createPillars("甲", "子", "乙", "丑", "丙", "寅", "丁", "卯");
      const result = determineGeokguk(pillars);

      expect(["high", "medium", "low"]).toContain(result.confidence);
    });

    it("provides description for the geokguk", () => {
      const pillars = createPillars("甲", "子", "乙", "丑", "丙", "寅", "丁", "卯");
      const result = determineGeokguk(pillars);

      expect(result.description).toBeTruthy();
      expect(typeof result.description).toBe("string");
    });
  });

  describe("getGeokgukDescription", () => {
    const geokgukTypes: GeokgukType[] = [
      "식신격", "상관격", "편재격", "정재격",
      "편관격", "정관격", "편인격", "정인격",
      "종왕격", "종강격", "종아격", "종재격", "종살격",
      "건록격", "양인격", "월겁격", "잡기격",
      "갑기화토격", "을경화금격", "병신화수격", "정임화목격", "무계화화격",
      "곡직격", "염상격", "가색격", "종혁격", "윤하격",
      "미정"
    ];

    it("returns description for all geokguk types", () => {
      for (const type of geokgukTypes) {
        const desc = getGeokgukDescription(type);
        expect(desc).toBeTruthy();
        expect(typeof desc).toBe("string");
      }
    });

    it("returns non-empty string for 식신격", () => {
      const desc = getGeokgukDescription("식신격");
      expect(desc.length).toBeGreaterThan(0);
    });

    it("returns non-empty string for 종격 types", () => {
      expect(getGeokgukDescription("종왕격").length).toBeGreaterThan(0);
      expect(getGeokgukDescription("종강격").length).toBeGreaterThan(0);
      expect(getGeokgukDescription("종아격").length).toBeGreaterThan(0);
    });

    it("returns non-empty string for 화기격국 types", () => {
      expect(getGeokgukDescription("갑기화토격").length).toBeGreaterThan(0);
      expect(getGeokgukDescription("을경화금격").length).toBeGreaterThan(0);
    });

    it("returns fallback for 미정", () => {
      const desc = getGeokgukDescription("미정");
      expect(desc).toBeTruthy();
    });
  });

  describe("evaluateGeokgukStatus", () => {
    it("returns status evaluation object", () => {
      const pillars = createPillars("甲", "子", "乙", "丑", "丙", "寅", "丁", "卯");
      const geokguk = determineGeokguk(pillars);
      // Note: evaluateGeokgukStatus takes (geokguk, pillars) in that order
      const status = evaluateGeokgukStatus(geokguk.primary, pillars);

      expect(status).toHaveProperty("status");
      expect(status).toHaveProperty("factors");
      expect(status).toHaveProperty("description");
    });

    it("status is valid value", () => {
      const pillars = createPillars("甲", "子", "乙", "丑", "丙", "寅", "丁", "卯");
      const geokguk = determineGeokguk(pillars);
      const status = evaluateGeokgukStatus(geokguk.primary, pillars);

      expect(["성격", "파격", "반성반파"]).toContain(status.status);
    });

    it("factors has positive and negative arrays", () => {
      const pillars = createPillars("甲", "子", "乙", "丑", "丙", "寅", "丁", "卯");
      const geokguk = determineGeokguk(pillars);
      const status = evaluateGeokgukStatus(geokguk.primary, pillars);

      expect(Array.isArray(status.factors.positive)).toBe(true);
      expect(Array.isArray(status.factors.negative)).toBe(true);
    });
  });

  describe("evaluateHwagiGeokguk", () => {
    it("returns hwagi evaluation object", () => {
      const pillars = createPillars("甲", "子", "己", "丑", "甲", "寅", "己", "卯");
      const result = evaluateHwagiGeokguk(pillars);

      // API returns { possible, type, conditions, description }
      expect(result).toHaveProperty("possible");
      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("conditions");
      expect(result).toHaveProperty("description");
    });

    it("possible is boolean", () => {
      const pillars = createPillars("甲", "子", "己", "丑", "甲", "寅", "己", "卯");
      const result = evaluateHwagiGeokguk(pillars);

      expect(typeof result.possible).toBe("boolean");
    });

    it("conditions object has required fields", () => {
      const pillars = createPillars("甲", "子", "己", "丑", "甲", "寅", "己", "卯");
      const result = evaluateHwagiGeokguk(pillars);

      expect(result.conditions).toHaveProperty("hasHap");
      expect(result.conditions).toHaveProperty("isDaymasterPart");
      expect(result.conditions).toHaveProperty("monthSupport");
      expect(result.conditions).toHaveProperty("noBreaker");
    });

    it("detects 갑기화토격 when conditions are met", () => {
      // 甲 and 己 together should trigger hwagi detection
      const pillars = createPillars("甲", "辰", "己", "戌", "甲", "丑", "己", "未");
      const result = evaluateHwagiGeokguk(pillars);

      // Should at least detect the 합 exists
      expect(result.conditions.hasHap).toBe(true);
    });
  });

  describe("determineGeokgukAdvanced", () => {
    it("returns extended GeokgukResult", () => {
      const pillars = createPillars("甲", "子", "乙", "丑", "丙", "寅", "丁", "卯");
      const result = determineGeokgukAdvanced(pillars);

      expect(result).toHaveProperty("primary");
      expect(result).toHaveProperty("category");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("description");
    });

    it("handles various pillar combinations", () => {
      const testCases = [
        createPillars("甲", "子", "甲", "子", "甲", "子", "甲", "子"),
        createPillars("乙", "丑", "乙", "丑", "乙", "丑", "乙", "丑"),
        createPillars("丙", "寅", "丁", "卯", "戊", "辰", "己", "巳"),
        createPillars("庚", "申", "辛", "酉", "壬", "戌", "癸", "亥"),
      ];

      for (const pillars of testCases) {
        const result = determineGeokgukAdvanced(pillars);
        expect(result).toBeTruthy();
        expect(result.primary).toBeTruthy();
      }
    });
  });

  describe("Edge cases", () => {
    it("produces consistent results for same input", () => {
      const pillars = createPillars("甲", "子", "乙", "丑", "丙", "寅", "丁", "卯");

      const result1 = determineGeokguk(pillars);
      const result2 = determineGeokguk(pillars);

      expect(result1.primary).toBe(result2.primary);
      expect(result1.category).toBe(result2.category);
      expect(result1.confidence).toBe(result2.confidence);
    });
  });
});
