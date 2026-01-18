/**
 * Date Analysis Saju Tests
 * Tests for Saju (사주) analysis helper functions
 */

import { describe, it, expect, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/prediction/advancedTimingEngine", () => ({
  analyzeMultiLayer: vi.fn(() => ({
    interactions: [{ scoreModifier: 10 }],
    branchInteractions: [{ type: "삼합", score: 8 }],
  })),
  calculatePreciseTwelveStage: vi.fn(() => ({
    stage: "건록",
    score: 75,
    energy: "peak",
  })),
  calculateYearlyGanji: vi.fn((year: number) => ({
    stem: "甲",
    branch: "子",
    year,
  })),
  calculateMonthlyGanji: vi.fn(() => ({
    stem: "乙",
    branch: "丑",
  })),
}));

vi.mock("@/lib/destiny-map/calendar/temporal-scoring", () => ({
  calculateDaeunScore: vi.fn(() => ({ score: 70, phase: "상승기" })),
  calculateSeunScore: vi.fn(() => ({ score: 65, yearStem: "甲", yearBranch: "子" })),
  calculateWolunScore: vi.fn(() => ({ score: 60, monthStem: "乙", monthBranch: "丑" })),
  calculateIljinScore: vi.fn(() => ({ score: 55, ganzhi: { stem: "丙", branch: "寅" } })),
  analyzeYongsin: vi.fn(() => ({ active: true, element: "수", bonus: 10 })),
  analyzeGeokguk: vi.fn(() => ({ pattern: "정관격", strength: "strong" })),
  analyzeSolarReturn: vi.fn(() => ({ returnDate: null, aspects: [] })),
  analyzeProgressions: vi.fn(() => ({ progressedMoon: 90, aspects: [] })),
  getGanzhiForDate: vi.fn(() => ({ stem: "丙", branch: "寅" })),
}));

vi.mock("@/lib/destiny-map/calendar/utils", () => ({
  getSipsin: vi.fn((dayStem: string, targetStem: string) => {
    if (dayStem === "甲" && targetStem === "丙") return "정재";
    if (dayStem === "甲" && targetStem === "乙") return "겁재";
    return null;
  }),
}));

vi.mock("@/lib/destiny-map/calendar/constants", () => ({
  JIJANGGAN: {
    "子": { 정기: "癸", 중기: "", 여기: "" },
    "丑": { 정기: "己", 중기: "癸", 여기: "辛" },
    "寅": { 정기: "甲", 중기: "丙", 여기: "戊" },
    "卯": { 정기: "乙", 중기: "", 여기: "" },
    "辰": { 정기: "戊", 중기: "乙", 여기: "癸" },
    "巳": { 정기: "丙", 중기: "庚", 여기: "戊" },
    "午": { 정기: "丁", 중기: "己", 여기: "" },
    "未": { 정기: "己", 중기: "丁", 여기: "乙" },
    "申": { 정기: "庚", 중기: "壬", 여기: "戊" },
    "酉": { 정기: "辛", 중기: "", 여기: "" },
    "戌": { 정기: "戊", 중기: "辛", 여기: "丁" },
    "亥": { 정기: "壬", 중기: "甲", 여기: "" },
  },
  SAMHAP: {
    "목": ["寅", "卯", "辰"],
    "화": ["巳", "午", "未"],
    "금": ["申", "酉", "戌"],
    "수": ["亥", "子", "丑"],
  },
  YUKHAP: {
    "子": "丑", "丑": "子",
    "寅": "亥", "亥": "寅",
    "卯": "戌", "戌": "卯",
    "辰": "酉", "酉": "辰",
    "巳": "申", "申": "巳",
    "午": "未", "未": "午",
  },
  CHUNG: {
    "子": "午", "午": "子",
    "丑": "未", "未": "丑",
    "寅": "申", "申": "寅",
    "卯": "酉", "酉": "卯",
    "辰": "戌", "戌": "辰",
    "巳": "亥", "亥": "巳",
  },
  XING: {
    "寅": ["巳", "申"],
    "巳": ["寅", "申"],
    "申": ["寅", "巳"],
    "丑": ["戌", "未"],
    "戌": ["丑", "未"],
    "未": ["丑", "戌"],
    "子": ["卯"],
    "卯": ["子"],
  },
  STEM_TO_ELEMENT: {
    "甲": "목", "乙": "목",
    "丙": "화", "丁": "화",
    "戊": "토", "己": "토",
    "庚": "금", "辛": "금",
    "壬": "수", "癸": "수",
  },
}));

import {
  analyzeSajuFactors,
  analyzeSipsin,
  analyzeJijanggan,
  analyzeBranchRelations,
  SajuAnalysisResult,
  SipsinResult,
  JijangganResult,
  BranchRelationsResult,
} from "@/lib/destiny-map/calendar/date-analysis-saju";

describe("Date Analysis Saju", () => {
  describe("analyzeSajuFactors", () => {
    const mockSajuProfile = {
      dayMaster: "甲",
      dayMasterElement: "목",
      dayBranch: "子",
      birthYear: 1990,
      yongsin: ["수"],
      geokguk: "정관격",
      daeunCycles: [
        { age: 5, heavenlyStem: "乙", earthlyBranch: "丑" },
        { age: 15, heavenlyStem: "丙", earthlyBranch: "寅" },
      ],
      pillars: {
        year: { stem: "庚", branch: "午" },
        month: { stem: "壬", branch: "申" },
        day: { stem: "甲", branch: "子" },
        hour: { stem: "乙", branch: "卯" },
      },
    };

    const mockGanzhi = { stem: "丙", branch: "寅" };

    it("returns complete analysis result structure", () => {
      const result = analyzeSajuFactors(
        mockSajuProfile as any,
        new Date(2025, 0, 15),
        mockGanzhi
      );

      expect(result).toHaveProperty("daeunAnalysis");
      expect(result).toHaveProperty("seunAnalysis");
      expect(result).toHaveProperty("wolunAnalysis");
      expect(result).toHaveProperty("iljinAnalysis");
      expect(result).toHaveProperty("yongsinAnalysis");
      expect(result).toHaveProperty("geokgukAnalysis");
      expect(result).toHaveProperty("solarReturnAnalysis");
      expect(result).toHaveProperty("progressionAnalysis");
      expect(result).toHaveProperty("advancedMultiLayerScore");
      expect(result).toHaveProperty("advancedBranchInteractions");
    });

    it("includes daeun analysis", () => {
      const result = analyzeSajuFactors(
        mockSajuProfile as any,
        new Date(2025, 0, 15),
        mockGanzhi
      );

      expect(result.daeunAnalysis).toBeDefined();
    });

    it("includes seun analysis", () => {
      const result = analyzeSajuFactors(
        mockSajuProfile as any,
        new Date(2025, 0, 15),
        mockGanzhi
      );

      expect(result.seunAnalysis).toBeDefined();
    });

    it("includes wolun analysis", () => {
      const result = analyzeSajuFactors(
        mockSajuProfile as any,
        new Date(2025, 0, 15),
        mockGanzhi
      );

      expect(result.wolunAnalysis).toBeDefined();
    });

    it("includes advanced multi layer score", () => {
      const result = analyzeSajuFactors(
        mockSajuProfile as any,
        new Date(2025, 0, 15),
        mockGanzhi
      );

      expect(typeof result.advancedMultiLayerScore).toBe("number");
    });

    it("includes advanced branch interactions", () => {
      const result = analyzeSajuFactors(
        mockSajuProfile as any,
        new Date(2025, 0, 15),
        mockGanzhi
      );

      expect(Array.isArray(result.advancedBranchInteractions)).toBe(true);
    });
  });

  describe("analyzeSipsin", () => {
    it("returns null values when dayMasterStem is undefined", () => {
      const result = analyzeSipsin(undefined, { stem: "丙", branch: "寅" });

      expect(result.sipsin).toBeNull();
      expect(result.factorKey).toBeNull();
    });

    it("returns null values when sipsin not found", () => {
      const result = analyzeSipsin("庚", { stem: "庚", branch: "子" });

      expect(result.sipsin).toBeNull();
      expect(result.factorKey).toBeNull();
    });

    it("returns sipsin with correct factor key", () => {
      const result = analyzeSipsin("甲", { stem: "丙", branch: "寅" });

      expect(result.sipsin).toBe("정재");
      expect(result.factorKey).toBe("sipsin_정재");
    });

    it("returns wealth category for 정재", () => {
      const result = analyzeSipsin("甲", { stem: "丙", branch: "寅" });

      expect(result.category).toBe("wealth");
      expect(result.recommendations).toContain("stableWealth");
      expect(result.recommendations).toContain("savings");
    });

    it("returns warnings for 겁재", () => {
      const result = analyzeSipsin("甲", { stem: "乙", branch: "卯" });

      expect(result.warnings).toContain("rivalry");
      expect(result.warnings).toContain("loss");
    });
  });

  describe("analyzeJijanggan", () => {
    it("returns empty array when branch has no jijanggan", () => {
      const result = analyzeJijanggan(
        { stem: "甲", branch: "未知" },
        { generatedBy: "수", controlledBy: "토" }
      );

      expect(result.factorKeys).toHaveLength(0);
    });

    it("returns empty array when relations is undefined", () => {
      const result = analyzeJijanggan(
        { stem: "甲", branch: "子" },
        undefined
      );

      expect(result.factorKeys).toHaveLength(0);
    });

    it("returns main hidden stem and element", () => {
      const result = analyzeJijanggan(
        { stem: "甲", branch: "子" },
        { generatedBy: "수", controlledBy: "토" }
      );

      expect(result.mainHiddenStem).toBe("癸");
      expect(result.mainHiddenElement).toBe("수");
    });

    it("adds hiddenStemSupport when main element generates", () => {
      const result = analyzeJijanggan(
        { stem: "甲", branch: "子" },
        { generatedBy: "수", controlledBy: "토" }
      );

      expect(result.factorKeys).toContain("hiddenStemSupport");
    });

    it("adds hiddenStemConflict when main element controls", () => {
      const result = analyzeJijanggan(
        { stem: "甲", branch: "寅" },
        { generatedBy: "수", controlledBy: "목" }
      );

      expect(result.factorKeys).toContain("hiddenStemConflict");
    });
  });

  describe("analyzeBranchRelations", () => {
    it("returns empty arrays when dayBranch is undefined", () => {
      const result = analyzeBranchRelations(
        undefined,
        { stem: "甲", branch: "子" },
        "목",
        { generatedBy: "수", controlledBy: "토" }
      );

      expect(result.factorKeys).toHaveLength(0);
      expect(result.recommendationKeys).toHaveLength(0);
      expect(result.warningKeys).toHaveLength(0);
      expect(result.categories).toHaveLength(0);
    });

    it("returns empty arrays when relations is undefined", () => {
      const result = analyzeBranchRelations(
        "子",
        { stem: "甲", branch: "午" },
        "목",
        undefined
      );

      expect(result.factorKeys).toHaveLength(0);
    });

    describe("삼합 (Samhap/Triple Harmony)", () => {
      it("detects positive samhap when element matches", () => {
        const result = analyzeBranchRelations(
          "寅",
          { stem: "甲", branch: "卯" },
          "목",
          { generatedBy: "수", controlledBy: "금" }
        );

        expect(result.factorKeys).toContain("branchSamhap");
        expect(result.titleKey).toBe("calendar.samhap");
        expect(result.descKey).toBe("calendar.samhapDesc");
        expect(result.recommendationKeys).toContain("bigDecision");
        expect(result.recommendationKeys).toContain("contract");
        expect(result.recommendationKeys).toContain("partnership");
      });

      it("detects samhap with generatedBy element", () => {
        const result = analyzeBranchRelations(
          "亥",
          { stem: "甲", branch: "子" },
          "목",
          { generatedBy: "수", controlledBy: "금" }
        );

        expect(result.factorKeys).toContain("branchSamhap");
        expect(result.categories).toContain("general");
      });

      it("detects negative samhap when controlledBy element", () => {
        const result = analyzeBranchRelations(
          "申",
          { stem: "甲", branch: "酉" },
          "목",
          { generatedBy: "수", controlledBy: "금" }
        );

        expect(result.factorKeys).toContain("branchSamhapNegative");
        expect(result.warningKeys).toContain("opposition");
      });
    });

    describe("육합 (Yukhap/Six Harmony)", () => {
      it("detects yukhap between 子 and 丑", () => {
        const result = analyzeBranchRelations(
          "子",
          { stem: "甲", branch: "丑" },
          "수",
          { generatedBy: "금", controlledBy: "토" }
        );

        expect(result.factorKeys).toContain("branchYukhap");
        // Samhap also matches here (子 and 丑 both in 수 samhap), so titleKey may be samhap
        expect(result.categories).toContain("love");
        expect(result.recommendationKeys).toContain("love");
        expect(result.recommendationKeys).toContain("meeting");
        expect(result.recommendationKeys).toContain("reconciliation");
      });
    });

    describe("충 (Chung/Clash)", () => {
      it("detects chung between 子 and 午", () => {
        const result = analyzeBranchRelations(
          "子",
          { stem: "甲", branch: "午" },
          "수",
          { generatedBy: "금", controlledBy: "토" }
        );

        expect(result.factorKeys).toContain("branchChung");
        expect(result.titleKey).toBe("calendar.chung");
        expect(result.descKey).toBe("calendar.chungDesc");
        expect(result.categories).toContain("travel");
        expect(result.categories).toContain("health");
        expect(result.warningKeys).toContain("avoidTravel");
        expect(result.warningKeys).toContain("conflict");
        expect(result.warningKeys).toContain("accident");
        expect(result.warningKeys).toContain("avoidChange");
        expect(result.recommendationKeys).toContain("careful");
        expect(result.recommendationKeys).toContain("postpone");
      });
    });

    describe("형 (Xing/Punishment)", () => {
      it("detects xing between 寅 and 巳", () => {
        const result = analyzeBranchRelations(
          "寅",
          { stem: "甲", branch: "巳" },
          "목",
          { generatedBy: "수", controlledBy: "금" }
        );

        expect(result.factorKeys).toContain("branchXing");
        expect(result.warningKeys).toContain("legal");
        expect(result.warningKeys).toContain("injury");
      });
    });

    describe("해 (Hai/Harm)", () => {
      it("detects hai between 子 and 未", () => {
        const result = analyzeBranchRelations(
          "子",
          { stem: "甲", branch: "未" },
          "수",
          { generatedBy: "금", controlledBy: "토" }
        );

        expect(result.factorKeys).toContain("branchHai");
        expect(result.warningKeys).toContain("betrayal");
        expect(result.warningKeys).toContain("misunderstanding");
      });

      it("detects hai between 酉 and 戌", () => {
        const result = analyzeBranchRelations(
          "酉",
          { stem: "辛", branch: "戌" },
          "금",
          { generatedBy: "토", controlledBy: "화" }
        );

        expect(result.factorKeys).toContain("branchHai");
      });
    });

    describe("multiple relations", () => {
      it("can detect multiple branch relations", () => {
        // 子 to 丑 has yukhap
        const result = analyzeBranchRelations(
          "子",
          { stem: "甲", branch: "丑" },
          "수",
          { generatedBy: "금", controlledBy: "토" }
        );

        // Should have at least yukhap
        expect(result.factorKeys.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Type interfaces", () => {
    it("SajuAnalysisResult has correct shape", () => {
      const result: SajuAnalysisResult = {
        daeunAnalysis: { score: 70, phase: "상승기" } as any,
        seunAnalysis: { score: 65 } as any,
        wolunAnalysis: { score: 60 } as any,
        iljinAnalysis: { score: 55 } as any,
        yongsinAnalysis: { active: true } as any,
        geokgukAnalysis: { pattern: "정관격" } as any,
        solarReturnAnalysis: { returnDate: null } as any,
        progressionAnalysis: { progressedMoon: 90 } as any,
        advancedMultiLayerScore: 15,
        advancedBranchInteractions: [],
      };

      expect(result.advancedMultiLayerScore).toBe(15);
    });

    it("SipsinResult has correct shape", () => {
      const result: SipsinResult = {
        sipsin: "정재",
        factorKey: "sipsin_정재",
        category: "wealth",
        recommendations: ["savings"],
        warnings: undefined,
      };

      expect(result.category).toBe("wealth");
    });

    it("JijangganResult has correct shape", () => {
      const result: JijangganResult = {
        factorKeys: ["hiddenStemSupport"],
        mainHiddenStem: "癸",
        mainHiddenElement: "수",
      };

      expect(result.mainHiddenElement).toBe("수");
    });

    it("BranchRelationsResult has correct shape", () => {
      const result: BranchRelationsResult = {
        factorKeys: ["branchYukhap"],
        recommendationKeys: ["love", "meeting"],
        warningKeys: [],
        categories: ["love"],
        titleKey: "calendar.yukhap",
        descKey: "calendar.yukhapDesc",
      };

      expect(result.categories).toContain("love");
    });
  });
});
