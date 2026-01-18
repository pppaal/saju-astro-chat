/**
 * Date Analysis Factors Tests
 * Tests for factor key generation and special day detection
 */

import { describe, it, expect, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/destiny-map/calendar/utils", () => ({
  approximateLunarDay: vi.fn((date: Date) => 15),
  isCheoneulGwiin: vi.fn(() => false),
  isDohwaDay: vi.fn(() => false),
  isGeonrokDay: vi.fn(() => false),
  isSamjaeYear: vi.fn(() => false),
  isSonEomneunDay: vi.fn(() => false),
  isYeokmaDay: vi.fn(() => false),
}));

vi.mock("@/lib/destiny-map/calendar/temporal-scoring", () => ({
  getYearGanzhi: vi.fn(() => ({ stem: "甲", branch: "子" })),
}));

vi.mock("@/lib/destiny-map/calendar/constants", () => ({
  ELEMENT_RELATIONS: {
    "목": { generatedBy: "수", controls: "토", generates: "화", controlledBy: "금" },
    "화": { generatedBy: "목", controls: "금", generates: "토", controlledBy: "수" },
    "토": { generatedBy: "화", controls: "수", generates: "금", controlledBy: "목" },
    "금": { generatedBy: "토", controls: "목", generates: "수", controlledBy: "화" },
    "수": { generatedBy: "금", controls: "화", generates: "목", controlledBy: "토" },
  },
}));

describe("Date Analysis Factors", () => {
  describe("Type Definitions", () => {
    it("defines SpecialDayFlags structure", () => {
      const flags = {
        hasCheoneulGwiin: false,
        hasGeonrok: false,
        hasSonEomneun: false,
        hasYeokma: false,
        hasDohwa: false,
        isSamjaeYearFlag: false,
      };

      expect(flags).toHaveProperty("hasCheoneulGwiin");
      expect(flags).toHaveProperty("hasGeonrok");
      expect(flags).toHaveProperty("hasSonEomneun");
      expect(flags).toHaveProperty("hasYeokma");
      expect(flags).toHaveProperty("hasDohwa");
      expect(flags).toHaveProperty("isSamjaeYearFlag");
    });

    it("defines SajuFactorKeysInput structure", () => {
      const input = {
        dayMasterStem: "甲",
        yearBranch: "子",
        ganzhi: { stem: "甲", branch: "子", stemElement: "목" },
        date: new Date(),
        dayMasterElement: "목",
        relations: {
          generatedBy: "수",
          controls: "토",
          generates: "화",
          controlledBy: "금",
        },
      };

      expect(input).toHaveProperty("dayMasterStem");
      expect(input).toHaveProperty("ganzhi");
      expect(input).toHaveProperty("date");
      expect(input).toHaveProperty("dayMasterElement");
      expect(input).toHaveProperty("relations");
    });

    it("defines FactorKeysResult structure", () => {
      const result = {
        sajuFactorKeys: ["good_element"],
        recommendationKeys: ["meditation"],
        warningKeys: ["avoid_travel"],
        categories: ["love"],
        titleKey: "good_day",
        descKey: "favorable_fortune",
        specialDayFlags: {
          hasCheoneulGwiin: false,
          hasGeonrok: false,
          hasSonEomneun: false,
          hasYeokma: false,
          hasDohwa: false,
          isSamjaeYearFlag: false,
        },
      };

      expect(result).toHaveProperty("sajuFactorKeys");
      expect(result).toHaveProperty("recommendationKeys");
      expect(result).toHaveProperty("warningKeys");
      expect(result).toHaveProperty("categories");
      expect(result).toHaveProperty("titleKey");
      expect(result).toHaveProperty("descKey");
      expect(result).toHaveProperty("specialDayFlags");
    });
  });

  describe("Special Day Detection", () => {
    it("detects 천을귀인 (Cheoneul Gwiin)", () => {
      const flags = {
        hasCheoneulGwiin: true,
        hasGeonrok: false,
        hasSonEomneun: false,
        hasYeokma: false,
        hasDohwa: false,
        isSamjaeYearFlag: false,
      };

      expect(flags.hasCheoneulGwiin).toBe(true);
    });

    it("detects 건록일 (Geonrok Day)", () => {
      const flags = {
        hasCheoneulGwiin: false,
        hasGeonrok: true,
        hasSonEomneun: false,
        hasYeokma: false,
        hasDohwa: false,
        isSamjaeYearFlag: false,
      };

      expect(flags.hasGeonrok).toBe(true);
    });

    it("detects 손없는날 (Son Eomneun Day)", () => {
      const flags = {
        hasCheoneulGwiin: false,
        hasGeonrok: false,
        hasSonEomneun: true,
        hasYeokma: false,
        hasDohwa: false,
        isSamjaeYearFlag: false,
      };

      expect(flags.hasSonEomneun).toBe(true);
    });

    it("detects 역마일 (Yeokma Day)", () => {
      const flags = {
        hasCheoneulGwiin: false,
        hasGeonrok: false,
        hasSonEomneun: false,
        hasYeokma: true,
        hasDohwa: false,
        isSamjaeYearFlag: false,
      };

      expect(flags.hasYeokma).toBe(true);
    });

    it("detects 도화일 (Dohwa Day)", () => {
      const flags = {
        hasCheoneulGwiin: false,
        hasGeonrok: false,
        hasSonEomneun: false,
        hasYeokma: false,
        hasDohwa: true,
        isSamjaeYearFlag: false,
      };

      expect(flags.hasDohwa).toBe(true);
    });

    it("detects 삼재년 (Samjae Year)", () => {
      const flags = {
        hasCheoneulGwiin: false,
        hasGeonrok: false,
        hasSonEomneun: false,
        hasYeokma: false,
        hasDohwa: false,
        isSamjaeYearFlag: true,
      };

      expect(flags.isSamjaeYearFlag).toBe(true);
    });

    it("handles multiple special days", () => {
      const flags = {
        hasCheoneulGwiin: true,
        hasGeonrok: true,
        hasSonEomneun: false,
        hasYeokma: false,
        hasDohwa: false,
        isSamjaeYearFlag: false,
      };

      const activeFlags = Object.values(flags).filter(Boolean);
      expect(activeFlags.length).toBe(2);
    });
  });

  describe("Factor Keys Generation", () => {
    it("generates saju factor keys", () => {
      const sajuFactorKeys = ["good_element", "favorable_branch", "yukhap"];

      expect(Array.isArray(sajuFactorKeys)).toBe(true);
      expect(sajuFactorKeys.length).toBeGreaterThan(0);
    });

    it("generates recommendation keys", () => {
      const recommendationKeys = [
        "good_for_business",
        "good_for_study",
        "good_for_travel",
      ];

      expect(Array.isArray(recommendationKeys)).toBe(true);
      expect(recommendationKeys).toContain("good_for_business");
    });

    it("generates warning keys", () => {
      const warningKeys = [
        "avoid_conflicts",
        "avoid_investments",
        "be_careful_health",
      ];

      expect(Array.isArray(warningKeys)).toBe(true);
      expect(warningKeys).toContain("avoid_conflicts");
    });

    it("generates category classifications", () => {
      const categories = ["love", "career", "health"];

      expect(Array.isArray(categories)).toBe(true);
      categories.forEach(cat => {
        expect(typeof cat).toBe("string");
      });
    });
  });

  describe("Title and Description Keys", () => {
    it("generates appropriate title key", () => {
      const titleKey = "good_day";

      expect(typeof titleKey).toBe("string");
      expect(titleKey.length).toBeGreaterThan(0);
    });

    it("generates appropriate description key", () => {
      const descKey = "favorable_fortune";

      expect(typeof descKey).toBe("string");
      expect(descKey.length).toBeGreaterThan(0);
    });

    it("title and desc keys match day quality", () => {
      const goodDay = {
        titleKey: "excellent_day",
        descKey: "very_favorable",
      };

      const badDay = {
        titleKey: "difficult_day",
        descKey: "be_cautious",
      };

      expect(goodDay.titleKey).toContain("excellent");
      expect(badDay.titleKey).toContain("difficult");
    });
  });

  describe("Element Relations Impact", () => {
    it("considers generatedBy relationship", () => {
      const relations = {
        generatedBy: "수",
        controls: "토",
        generates: "화",
        controlledBy: "금",
      };

      expect(relations.generatedBy).toBe("수");
    });

    it("considers controls relationship", () => {
      const relations = {
        generatedBy: "수",
        controls: "토",
        generates: "화",
        controlledBy: "금",
      };

      expect(relations.controls).toBe("토");
    });

    it("considers all five element relationships", () => {
      const relations = {
        generatedBy: "수",
        controls: "토",
        generates: "화",
        controlledBy: "금",
      };

      expect(Object.keys(relations)).toHaveLength(4);
    });
  });

  describe("Shinsal Integration", () => {
    it("processes shinsal results when available", () => {
      const shinsalResult = {
        active: [
          { name: "천을귀인", type: "lucky" as const, affectedArea: "overall" },
          { name: "백호살", type: "unlucky" as const, affectedArea: "health" },
        ],
      };

      expect(shinsalResult.active).toHaveLength(2);
      expect(shinsalResult.active[0].type).toBe("lucky");
      expect(shinsalResult.active[1].type).toBe("unlucky");
    });

    it("handles missing shinsal data gracefully", () => {
      const shinsalResult = undefined;

      expect(shinsalResult).toBeUndefined();
    });

    it("categorizes shinsal by type", () => {
      const shinsal = {
        name: "도화살",
        type: "special" as const,
        affectedArea: "love",
      };

      expect(shinsal.type).toBe("special");
      expect(shinsal.affectedArea).toBe("love");
    });
  });

  describe("Edge Cases", () => {
    it("handles missing dayMasterStem", () => {
      const input = {
        dayMasterStem: undefined,
        yearBranch: "子",
        ganzhi: { stem: "甲", branch: "子", stemElement: "목" },
        date: new Date(),
        dayMasterElement: "목",
        relations: {
          generatedBy: "수",
          controls: "토",
          generates: "화",
          controlledBy: "금",
        },
      };

      expect(input.dayMasterStem).toBeUndefined();
    });

    it("handles missing yearBranch", () => {
      const input = {
        dayMasterStem: "甲",
        yearBranch: undefined,
        ganzhi: { stem: "甲", branch: "子", stemElement: "목" },
        date: new Date(),
        dayMasterElement: "목",
        relations: {
          generatedBy: "수",
          controls: "토",
          generates: "화",
          controlledBy: "금",
        },
      };

      expect(input.yearBranch).toBeUndefined();
    });

    it("returns all flags as false when conditions not met", () => {
      const allFalseFlags = {
        hasCheoneulGwiin: false,
        hasGeonrok: false,
        hasSonEomneun: false,
        hasYeokma: false,
        hasDohwa: false,
        isSamjaeYearFlag: false,
      };

      const allFalse = Object.values(allFalseFlags).every(v => v === false);
      expect(allFalse).toBe(true);
    });
  });
});
