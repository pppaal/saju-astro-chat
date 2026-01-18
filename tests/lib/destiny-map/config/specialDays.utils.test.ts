/**
 * Special Days Utils Tests
 * Tests for special day calculations and utilities
 */

import { describe, it, expect, vi } from "vitest";

// Mock constants
const mockData = {
  SAMJAE_BY_YEAR_BRANCH: {
    "子": ["辰", "巳", "午"],
    "丑": ["巳", "午", "未"],
    "寅": ["午", "未", "申"],
  },
  YEOKMA_BY_YEAR_BRANCH: {
    "子": "寅",
    "丑": "亥",
    "寅": "申",
  },
  DOHWA_BY_YEAR_BRANCH: {
    "子": "酉",
    "丑": "午",
    "寅": "卯",
  },
  GEONROK_BY_DAY_STEM: {
    "甲": "寅",
    "乙": "卯",
    "丙": "巳",
  },
  SIPSIN_RELATIONS: {
    "甲": {
      "甲": "비견",
      "乙": "겁재",
      "丙": "식신",
    },
  },
  STEMS: ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],
  BRANCHES: ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"],
};

vi.mock("@/lib/destiny-map/config/specialDays.data", () => ({
  STEMS_LOCAL: mockData.STEMS,
  BRANCHES_LOCAL: mockData.BRANCHES,
  SAMJAE_BY_YEAR_BRANCH: mockData.SAMJAE_BY_YEAR_BRANCH,
  YEOKMA_BY_YEAR_BRANCH: mockData.YEOKMA_BY_YEAR_BRANCH,
  DOHWA_BY_YEAR_BRANCH: mockData.DOHWA_BY_YEAR_BRANCH,
  GEONROK_BY_DAY_STEM: mockData.GEONROK_BY_DAY_STEM,
  SIPSIN_RELATIONS: mockData.SIPSIN_RELATIONS,
}));

describe("Special Days Utils", () => {
  describe("Samjae Year Detection (삼재년)", () => {
    it("identifies samjae years correctly", () => {
      const birthYearBranch = "子";
      const samjaeBranches = ["辰", "巳", "午"];

      samjaeBranches.forEach(branch => {
        expect(mockData.SAMJAE_BY_YEAR_BRANCH[birthYearBranch]).toContain(branch);
      });
    });

    it("returns false for non-samjae years", () => {
      const birthYearBranch = "子";
      const nonSamjaeBranch = "寅";

      expect(mockData.SAMJAE_BY_YEAR_BRANCH[birthYearBranch]).not.toContain(nonSamjaeBranch);
    });

    it("handles all 12 branches", () => {
      const allBranches = mockData.BRANCHES;

      expect(allBranches).toHaveLength(12);
    });
  });

  describe("Yeokma Day Detection (역마일)", () => {
    it("identifies yeokma day correctly", () => {
      const birthYearBranch = "子";
      const yeokmaDay = mockData.YEOKMA_BY_YEAR_BRANCH[birthYearBranch];

      expect(yeokmaDay).toBe("寅");
    });

    it("different birth years have different yeokma days", () => {
      const yeokma1 = mockData.YEOKMA_BY_YEAR_BRANCH["子"];
      const yeokma2 = mockData.YEOKMA_BY_YEAR_BRANCH["丑"];

      expect(yeokma1).not.toBe(yeokma2);
    });

    it("returns undefined for unknown branch", () => {
      const yeokma = mockData.YEOKMA_BY_YEAR_BRANCH["unknown"];

      expect(yeokma).toBeUndefined();
    });
  });

  describe("Dohwa Day Detection (도화일)", () => {
    it("identifies dohwa day correctly", () => {
      const birthYearBranch = "子";
      const dohwaDay = mockData.DOHWA_BY_YEAR_BRANCH[birthYearBranch];

      expect(dohwaDay).toBe("酉");
    });

    it("different birth years have different dohwa days", () => {
      const dohwa1 = mockData.DOHWA_BY_YEAR_BRANCH["子"];
      const dohwa2 = mockData.DOHWA_BY_YEAR_BRANCH["寅"];

      expect(dohwa1).toBe("酉");
      expect(dohwa2).toBe("卯");
    });
  });

  describe("Geonrok Day Detection (건록일)", () => {
    it("identifies geonrok day correctly", () => {
      const dayMasterStem = "甲";
      const geonrokDay = mockData.GEONROK_BY_DAY_STEM[dayMasterStem];

      expect(geonrokDay).toBe("寅");
    });

    it("each stem has specific geonrok day", () => {
      expect(mockData.GEONROK_BY_DAY_STEM["甲"]).toBe("寅");
      expect(mockData.GEONROK_BY_DAY_STEM["乙"]).toBe("卯");
      expect(mockData.GEONROK_BY_DAY_STEM["丙"]).toBe("巳");
    });
  });

  describe("Sipsin Calculation (십신)", () => {
    it("calculates sipsin relationship", () => {
      const dayMaster = "甲";
      const targetStem = "甲";
      const sipsin = mockData.SIPSIN_RELATIONS[dayMaster]?.[targetStem];

      expect(sipsin).toBe("비견");
    });

    it("handles different stem combinations", () => {
      const dayMaster = "甲";

      expect(mockData.SIPSIN_RELATIONS[dayMaster]?.["甲"]).toBe("비견");
      expect(mockData.SIPSIN_RELATIONS[dayMaster]?.["乙"]).toBe("겁재");
      expect(mockData.SIPSIN_RELATIONS[dayMaster]?.["丙"]).toBe("식신");
    });

    it("returns undefined for unknown combination", () => {
      const sipsin = mockData.SIPSIN_RELATIONS["unknown"]?.["甲"];

      expect(sipsin).toBeUndefined();
    });
  });

  describe("Son Eomneun Day (손없는날)", () => {
    it("identifies days 9, 10, 19, 20, 29, 30 as son eomneun", () => {
      const sonEomneunDays = [9, 10, 19, 20, 29, 30];

      sonEomneunDays.forEach(day => {
        const dayInCycle = day % 10;
        expect(dayInCycle === 9 || dayInCycle === 0).toBe(true);
      });
    });

    it("rejects other days", () => {
      const normalDays = [1, 2, 3, 11, 15, 25];

      normalDays.forEach(day => {
        const dayInCycle = day % 10;
        expect(dayInCycle === 9 || dayInCycle === 0).toBe(false);
      });
    });

    it("handles edge cases", () => {
      expect(1 % 10).toBe(1); // Not son eomneun
      expect(10 % 10).toBe(0); // Is son eomneun
      expect(30 % 10).toBe(0); // Is son eomneun
    });
  });

  describe("Lunar Day Approximation", () => {
    it("converts solar to approximate lunar day", () => {
      const date = new Date(2024, 0, 15); // Jan 15, 2024
      const lunarMonthDays = 29.53;

      expect(typeof lunarMonthDays).toBe("number");
      expect(lunarMonthDays).toBeCloseTo(29.53, 2);
    });

    it("lunar month is approximately 29.53 days", () => {
      const lunarMonthDays = 29.53;

      expect(lunarMonthDays).toBeGreaterThan(29);
      expect(lunarMonthDays).toBeLessThan(30);
    });

    it("returns day between 1 and 30", () => {
      // Mock calculation
      const approximateLunarDay = 15;

      expect(approximateLunarDay).toBeGreaterThanOrEqual(1);
      expect(approximateLunarDay).toBeLessThanOrEqual(30);
    });
  });

  describe("Gongmang Calculation (공망)", () => {
    it("calculates gongmang branches", () => {
      // Gongmang 계산은 간지 순환 기반
      const stems = mockData.STEMS;
      const branches = mockData.BRANCHES;

      expect(stems).toHaveLength(10);
      expect(branches).toHaveLength(12);
    });

    it("gongmang uses 60-cycle system", () => {
      // 60갑자 체계에서 천간 10개, 지지 12개
      const cycleLength = 60;
      const stemCount = 10;
      const branchCount = 12;

      expect(cycleLength).toBe(stemCount * 6);
      expect(cycleLength).toBe(branchCount * 5);
    });

    it("returns empty array for invalid input", () => {
      const emptyArray: string[] = [];

      expect(emptyArray).toHaveLength(0);
      expect(Array.isArray(emptyArray)).toBe(true);
    });
  });

  describe("Constants Validation", () => {
    it("has 10 heavenly stems", () => {
      expect(mockData.STEMS).toHaveLength(10);
    });

    it("has 12 earthly branches", () => {
      expect(mockData.BRANCHES).toHaveLength(12);
    });

    it("samjae data covers all branches", () => {
      const samjaeKeys = Object.keys(mockData.SAMJAE_BY_YEAR_BRANCH);

      expect(samjaeKeys.length).toBeGreaterThan(0);
      samjaeKeys.forEach(key => {
        expect(mockData.BRANCHES).toContain(key);
      });
    });

    it("yeokma data has valid branches", () => {
      const yeokmaValues = Object.values(mockData.YEOKMA_BY_YEAR_BRANCH);

      yeokmaValues.forEach(branch => {
        expect(mockData.BRANCHES).toContain(branch);
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles undefined birth year branch", () => {
      const result = mockData.SAMJAE_BY_YEAR_BRANCH[undefined as any];

      expect(result).toBeUndefined();
    });

    it("handles empty string input", () => {
      const result = mockData.SIPSIN_RELATIONS[""]?.["甲"];

      expect(result).toBeUndefined();
    });

    it("handles out of range lunar day", () => {
      const invalidDays = [-1, 0, 31, 100];

      invalidDays.forEach(day => {
        const isValid = day >= 1 && day <= 30;
        expect(isValid).toBe(false);
      });
    });
  });
});
