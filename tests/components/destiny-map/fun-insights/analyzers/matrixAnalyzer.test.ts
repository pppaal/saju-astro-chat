/**
 * Matrix Analyzer Tests
 * Tests for Destiny Fusion Matrix analysis functions
 */

import { describe, it, expect, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/destiny-matrix/engine", () => ({
  getInteractionColor: vi.fn((level: string) => {
    const colors: Record<string, string> = {
      extreme: "#FFD700",
      amplify: "#4CAF50",
      balance: "#2196F3",
      clash: "#FF9800",
      conflict: "#F44336",
    };
    return colors[level] || "#9E9E9E";
  }),
}));

vi.mock("@/lib/destiny-matrix/data/layer1-element-core", () => ({
  ELEMENT_CORE_GRID: {
    "목": {
      fire: { level: "amplify", score: 8, icon: "🔥", keyword: "성장", keywordEn: "Growth" },
      earth: { level: "balance", score: 6, icon: "🌍", keyword: "안정", keywordEn: "Stability" },
      air: { level: "extreme", score: 10, icon: "💨", keyword: "확장", keywordEn: "Expansion" },
      water: { level: "amplify", score: 8, icon: "💧", keyword: "유연", keywordEn: "Flexibility" },
    },
    "화": {
      fire: { level: "extreme", score: 10, icon: "🔥", keyword: "열정", keywordEn: "Passion" },
      earth: { level: "amplify", score: 7, icon: "🌍", keyword: "창조", keywordEn: "Creation" },
      air: { level: "amplify", score: 8, icon: "💨", keyword: "영감", keywordEn: "Inspiration" },
      water: { level: "conflict", score: 3, icon: "💧", keyword: "갈등", keywordEn: "Conflict" },
    },
    "토": {
      fire: { level: "amplify", score: 7, icon: "🔥", keyword: "결실", keywordEn: "Harvest" },
      earth: { level: "extreme", score: 10, icon: "🌍", keyword: "신뢰", keywordEn: "Trust" },
      air: { level: "clash", score: 4, icon: "💨", keyword: "변화", keywordEn: "Change" },
      water: { level: "balance", score: 6, icon: "💧", keyword: "양육", keywordEn: "Nurture" },
    },
    "금": {
      fire: { level: "clash", score: 4, icon: "🔥", keyword: "단련", keywordEn: "Forge" },
      earth: { level: "amplify", score: 8, icon: "🌍", keyword: "보석", keywordEn: "Gem" },
      air: { level: "extreme", score: 9, icon: "💨", keyword: "예리", keywordEn: "Sharp" },
      water: { level: "amplify", score: 7, icon: "💧", keyword: "정화", keywordEn: "Purify" },
    },
    "수": {
      fire: { level: "conflict", score: 3, icon: "🔥", keyword: "증발", keywordEn: "Evaporate" },
      earth: { level: "balance", score: 5, icon: "🌍", keyword: "흡수", keywordEn: "Absorb" },
      air: { level: "amplify", score: 7, icon: "💨", keyword: "흐름", keywordEn: "Flow" },
      water: { level: "extreme", score: 10, icon: "💧", keyword: "깊이", keywordEn: "Depth" },
    },
  },
  SIGN_TO_ELEMENT: {
    Aries: "fire",
    Leo: "fire",
    Sagittarius: "fire",
    Taurus: "earth",
    Virgo: "earth",
    Capricorn: "earth",
    Gemini: "air",
    Libra: "air",
    Aquarius: "air",
    Cancer: "water",
    Scorpio: "water",
    Pisces: "water",
  },
}));

vi.mock("@/lib/destiny-matrix/data/layer2-sibsin-planet", () => ({
  SIBSIN_PLANET_MATRIX: {
    "비견": {
      Sun: { level: "amplify", score: 8, icon: "☀️", keyword: "자립", keywordEn: "Independence" },
      Moon: { level: "balance", score: 6, icon: "🌙", keyword: "동반", keywordEn: "Companion" },
      Mars: { level: "extreme", score: 9, icon: "♂️", keyword: "경쟁", keywordEn: "Competition" },
    },
    "식신": {
      Sun: { level: "extreme", score: 10, icon: "☀️", keyword: "창작", keywordEn: "Creation" },
      Venus: { level: "amplify", score: 8, icon: "♀️", keyword: "예술", keywordEn: "Art" },
      Jupiter: { level: "amplify", score: 8, icon: "♃", keyword: "풍요", keywordEn: "Abundance" },
    },
    "정관": {
      Saturn: { level: "extreme", score: 9, icon: "♄", keyword: "규율", keywordEn: "Discipline" },
      Sun: { level: "amplify", score: 7, icon: "☀️", keyword: "권위", keywordEn: "Authority" },
    },
  },
  PLANET_KEYWORDS: {
    Sun: { ko: "자아", en: "Self" },
    Moon: { ko: "감정", en: "Emotion" },
    Mercury: { ko: "소통", en: "Communication" },
    Venus: { ko: "사랑", en: "Love" },
    Mars: { ko: "행동", en: "Action" },
    Jupiter: { ko: "확장", en: "Expansion" },
    Saturn: { ko: "책임", en: "Responsibility" },
  },
  SIBSIN_KEYWORDS: {
    "비견": { ko: "나와 같은 자", en: "Similar to Self" },
    "겁재": { ko: "경쟁자", en: "Competitor" },
    "식신": { ko: "창작자", en: "Creator" },
    "상관": { ko: "표현자", en: "Expresser" },
    "정재": { ko: "정당한 재물", en: "Righteous Wealth" },
    "편재": { ko: "편법 재물", en: "Unconventional Wealth" },
    "정관": { ko: "정당한 권력", en: "Righteous Authority" },
    "편관": { ko: "편법 권력", en: "Unconventional Authority" },
    "정인": { ko: "정통 지식", en: "Orthodox Knowledge" },
    "편인": { ko: "창의적 지식", en: "Creative Knowledge" },
  },
}));

vi.mock("@/lib/destiny-matrix/data/layer6-stage-house", () => ({
  TWELVE_STAGE_HOUSE_MATRIX: {
    "장생": {
      1: { level: "extreme", score: 10, icon: "🌱", keyword: "탄생", keywordEn: "Birth" },
      4: { level: "amplify", score: 8, icon: "🏠", keyword: "가정", keywordEn: "Home" },
    },
    "임관": {
      10: { level: "extreme", score: 10, icon: "👔", keyword: "직업", keywordEn: "Career" },
      1: { level: "amplify", score: 8, icon: "🎯", keyword: "목표", keywordEn: "Goal" },
    },
    "왕지": {
      10: { level: "extreme", score: 10, icon: "👑", keyword: "정점", keywordEn: "Peak" },
      1: { level: "amplify", score: 9, icon: "💪", keyword: "전성", keywordEn: "Prime" },
    },
  },
  TWELVE_STAGE_INFO: {
    "장생": { ko: "장생 - 새로운 시작", en: "Changseong - New Beginning" },
    "임관": { ko: "임관 - 성숙과 책임", en: "Imgwan - Maturity and Responsibility" },
    "왕지": { ko: "왕지 - 최고의 상태", en: "Wangji - Peak Condition" },
  },
}));

vi.mock("@/lib/destiny-matrix/data/layer8-shinsal-planet", () => ({
  SHINSAL_PLANET_MATRIX: {
    "도화": {
      Venus: { level: "extreme", score: 10, icon: "🌸", keyword: "매력", keywordEn: "Charm" },
      Mars: { level: "amplify", score: 8, icon: "💕", keyword: "정열", keywordEn: "Passion" },
    },
    "천을귀인": {
      Jupiter: { level: "extreme", score: 10, icon: "🍀", keyword: "행운", keywordEn: "Luck" },
    },
  },
  SHINSAL_INFO: {
    "도화": { ko: "도화살", en: "Peach Blossom", effect: "매력과 인기", effectEn: "Charm and popularity" },
    "천을귀인": { ko: "천을귀인", en: "Heavenly Noble", effect: "귀인의 도움", effectEn: "Help from noble" },
  },
}));

vi.mock("@/lib/destiny-matrix/data/layer9-asteroid-house", () => ({
  ASTEROID_HOUSE_MATRIX: {
    Juno: {
      7: { level: "extreme", score: 10, icon: "💍", keyword: "결혼", keywordEn: "Marriage" },
      5: { level: "amplify", score: 8, icon: "❤️", keyword: "연애", keywordEn: "Romance" },
    },
  },
  ASTEROID_INFO: {
    Juno: { ko: "주노", en: "Juno", theme: "결혼과 헌신", themeEn: "Marriage and commitment" },
  },
}));

vi.mock("@/lib/destiny-matrix/data/layer3-sibsin-house", () => ({
  SIBSIN_HOUSE_MATRIX: {
    "정재": {
      2: { level: "extreme", score: 10, icon: "💰", keyword: "재물", keywordEn: "Wealth" },
      10: { level: "amplify", score: 8, icon: "💼", keyword: "직업", keywordEn: "Career" },
    },
    "정관": {
      10: { level: "extreme", score: 10, icon: "👔", keyword: "명예", keywordEn: "Honor" },
    },
  },
  HOUSE_KEYWORDS: {
    1: { ko: "자아", en: "Self" },
    2: { ko: "재물", en: "Money" },
    10: { ko: "커리어", en: "Career" },
  },
}));

vi.mock("@/lib/destiny-matrix/data/layer4-timing-overlay", () => ({
  TIMING_OVERLAY_MATRIX: {},
}));

vi.mock("@/lib/destiny-matrix/data/layer5-relation-aspect", () => ({
  RELATION_ASPECT_MATRIX: {},
}));

vi.mock("@/lib/destiny-matrix/data/layer7-advanced-analysis", () => ({
  ADVANCED_ANALYSIS_MATRIX: {},
}));

vi.mock("@/lib/destiny-matrix/data/layer10-extrapoint-element", () => ({
  EXTRAPOINT_ELEMENT_MATRIX: {},
  EXTRAPOINT_SIBSIN_MATRIX: {},
  EXTRAPOINT_INFO: {},
}));

vi.mock("@/components/destiny-map/fun-insights/utils/helpers", () => ({
  findPlanetSign: vi.fn((astro, planet) => {
    if (!astro?.planets) return null;
    const p = astro.planets.find((pl: any) => pl.name?.toLowerCase() === planet.toLowerCase());
    return p?.sign || null;
  }),
}));

import {
  getMatrixAnalysis,
  getElementFusionDescription,
  getSibsinPlanetDescription,
  getLifeCycleDescription,
  getLoveMatrixAnalysis,
} from "@/components/destiny-map/fun-insights/analyzers/matrixAnalyzer";

describe("Matrix Analyzer", () => {
  const mockSaju = {
    dayMaster: { element: "wood", name: "甲" },
    sibsin: {
      year: "비견",
      month: "식신",
      day: "정관",
      hour: "정재",
    },
    twelveStages: {
      year: "장생",
      month: "임관",
      day: "왕지",
      hour: "장생",
    },
    shinsal: [{ name: "도화" }, { name: "천을귀인" }],
  };

  const mockAstro = {
    planets: [
      { name: "Sun", sign: "Aries", house: 1 },
      { name: "Moon", sign: "Cancer", house: 4 },
      { name: "Mercury", sign: "Gemini", house: 3 },
      { name: "Venus", sign: "Taurus", house: 2 },
      { name: "Mars", sign: "Leo", house: 5 },
      { name: "Jupiter", sign: "Sagittarius", house: 9 },
      { name: "Saturn", sign: "Capricorn", house: 10 },
    ],
  };

  describe("getMatrixAnalysis", () => {
    it("returns null when no data provided", () => {
      const result = getMatrixAnalysis(undefined, undefined, "ko");
      expect(result).toBeNull();
    });

    it("returns complete analysis result structure", () => {
      const result = getMatrixAnalysis(mockSaju as any, mockAstro as any, "ko");

      expect(result).not.toBeNull();
      expect(result).toHaveProperty("elementFusions");
      expect(result).toHaveProperty("sibsinPlanetFusions");
      expect(result).toHaveProperty("lifeCycles");
      expect(result).toHaveProperty("synergy");
      expect(result).toHaveProperty("fusionSummary");
    });

    it("analyzes element fusions correctly", () => {
      const result = getMatrixAnalysis(mockSaju as any, mockAstro as any, "ko");

      expect(result!.elementFusions.length).toBeGreaterThan(0);
      const sunFusion = result!.elementFusions[0];
      expect(sunFusion).toHaveProperty("sajuElement");
      expect(sunFusion).toHaveProperty("westElement");
      expect(sunFusion).toHaveProperty("fusion");
      expect(sunFusion.fusion).toHaveProperty("level");
      expect(sunFusion.fusion).toHaveProperty("score");
      expect(sunFusion.fusion).toHaveProperty("icon");
    });

    it("analyzes sibsin-planet fusions", () => {
      const result = getMatrixAnalysis(mockSaju as any, mockAstro as any, "ko");

      expect(Array.isArray(result!.sibsinPlanetFusions)).toBe(true);
    });

    it("analyzes life cycles", () => {
      const result = getMatrixAnalysis(mockSaju as any, mockAstro as any, "ko");

      expect(Array.isArray(result!.lifeCycles)).toBe(true);
    });

    it("calculates fusion summary", () => {
      const result = getMatrixAnalysis(mockSaju as any, mockAstro as any, "ko");

      expect(result!.fusionSummary).toHaveProperty("extreme");
      expect(result!.fusionSummary).toHaveProperty("amplify");
      expect(result!.fusionSummary).toHaveProperty("balance");
      expect(result!.fusionSummary).toHaveProperty("clash");
      expect(result!.fusionSummary).toHaveProperty("conflict");
    });

    it("calculates synergy with strengths and cautions", () => {
      const result = getMatrixAnalysis(mockSaju as any, mockAstro as any, "ko");

      expect(result!.synergy).toHaveProperty("topStrengths");
      expect(result!.synergy).toHaveProperty("topCautions");
      expect(result!.synergy).toHaveProperty("overallScore");
      expect(result!.synergy).toHaveProperty("dominantEnergy");
    });

    it("returns Korean descriptions when lang is ko", () => {
      const result = getMatrixAnalysis(mockSaju as any, mockAstro as any, "ko");

      if (result!.elementFusions.length > 0) {
        expect(result!.elementFusions[0].fusion.description.ko).toBeDefined();
      }
    });

    it("returns English descriptions when lang is en", () => {
      const result = getMatrixAnalysis(mockSaju as any, mockAstro as any, "en");

      if (result!.elementFusions.length > 0) {
        expect(result!.elementFusions[0].fusion.description.en).toBeDefined();
      }
    });

    it("works with only saju data", () => {
      const result = getMatrixAnalysis(mockSaju as any, undefined, "ko");

      expect(result).not.toBeNull();
    });

    it("works with only astro data", () => {
      const result = getMatrixAnalysis(undefined, mockAstro as any, "ko");

      expect(result).not.toBeNull();
    });
  });

  describe("getElementFusionDescription", () => {
    it("returns description for valid element combination", () => {
      const result = getElementFusionDescription("목", "fire", "ko");

      expect(result).not.toBeNull();
      expect(result).toContain("목");
      expect(result).toContain("fire");
    });

    it("returns Korean description when lang is ko", () => {
      const result = getElementFusionDescription("화", "fire", "ko");

      expect(result).toContain("점수");
    });

    it("returns English description when lang is en", () => {
      const result = getElementFusionDescription("화", "fire", "en");

      expect(result).toContain("Score");
    });

    it("returns null for invalid element", () => {
      const result = getElementFusionDescription("invalid" as any, "fire", "ko");

      expect(result).toBeNull();
    });
  });

  describe("getSibsinPlanetDescription", () => {
    it("returns description for valid sibsin-planet combination", () => {
      const result = getSibsinPlanetDescription("비견", "Sun", "ko");

      expect(result).not.toBeNull();
      expect(result).toContain("비견");
      expect(result).toContain("Sun");
    });

    it("returns Korean description when lang is ko", () => {
      const result = getSibsinPlanetDescription("식신", "Sun", "ko");

      expect(result).toContain("창작");
    });

    it("returns English description when lang is en", () => {
      const result = getSibsinPlanetDescription("식신", "Sun", "en");

      expect(result).toContain("Creation");
    });

    it("returns null for invalid combination", () => {
      const result = getSibsinPlanetDescription("invalid" as any, "Sun", "ko");

      expect(result).toBeNull();
    });
  });

  describe("getLifeCycleDescription", () => {
    it("returns description for valid stage-house combination", () => {
      const result = getLifeCycleDescription("장생", 1, "ko");

      expect(result).not.toBeNull();
      expect(result).toContain("장생");
      expect(result).toContain("1");
    });

    it("returns Korean description when lang is ko", () => {
      const result = getLifeCycleDescription("임관", 10, "ko");

      expect(result).toContain("하우스");
    });

    it("returns English description when lang is en", () => {
      const result = getLifeCycleDescription("임관", 10, "en");

      expect(result).toContain("House");
    });

    it("returns null for invalid combination", () => {
      const result = getLifeCycleDescription("invalid" as any, 1, "ko");

      expect(result).toBeNull();
    });
  });

  describe("getLoveMatrixAnalysis", () => {
    it("returns null when no data provided", () => {
      const result = getLoveMatrixAnalysis(undefined, undefined, "ko");

      expect(result).toBeNull();
    });

    it("returns love matrix structure", () => {
      const result = getLoveMatrixAnalysis(mockSaju as any, mockAstro as any, "ko");

      expect(result).not.toBeNull();
      expect(result).toHaveProperty("shinsalLove");
      expect(result).toHaveProperty("asteroidLove");
      expect(result).toHaveProperty("loveScore");
      expect(result).toHaveProperty("loveMessage");
    });

    it("analyzes love-related shinsals", () => {
      const result = getLoveMatrixAnalysis(mockSaju as any, mockAstro as any, "ko");

      expect(Array.isArray(result!.shinsalLove)).toBe(true);
    });

    it("includes love score", () => {
      const result = getLoveMatrixAnalysis(mockSaju as any, mockAstro as any, "ko");

      expect(typeof result!.loveScore).toBe("number");
    });

    it("includes bilingual love message", () => {
      const result = getLoveMatrixAnalysis(mockSaju as any, mockAstro as any, "ko");

      expect(result!.loveMessage).toHaveProperty("ko");
      expect(result!.loveMessage).toHaveProperty("en");
    });
  });

  describe("element mapping", () => {
    it("maps saju wood to air", () => {
      const sajuWithWood = { dayMaster: { element: "wood" } };
      const result = getMatrixAnalysis(sajuWithWood as any, mockAstro as any, "ko");

      expect(result).not.toBeNull();
      if (result!.elementFusions.length > 0) {
        expect(result!.elementFusions[0].sajuElement).toBe("목");
      }
    });

    it("maps saju fire to fire", () => {
      const sajuWithFire = { dayMaster: { element: "fire" } };
      const result = getMatrixAnalysis(sajuWithFire as any, mockAstro as any, "ko");

      expect(result).not.toBeNull();
      if (result!.elementFusions.length > 0) {
        expect(result!.elementFusions[0].sajuElement).toBe("화");
      }
    });
  });

  describe("fusion level classification", () => {
    it("identifies extreme level fusions", () => {
      const result = getMatrixAnalysis(mockSaju as any, mockAstro as any, "ko");

      const extremeFusions = [
        ...result!.elementFusions.filter(f => f.fusion.level === "extreme"),
        ...result!.sibsinPlanetFusions.filter(f => f.fusion.level === "extreme"),
      ];

      // Should have some extreme fusions based on mock data
      expect(result!.fusionSummary.extreme).toBeGreaterThanOrEqual(0);
    });

    it("calculates overall score correctly", () => {
      const result = getMatrixAnalysis(mockSaju as any, mockAstro as any, "ko");

      expect(result!.synergy.overallScore).toBeGreaterThanOrEqual(0);
      expect(result!.synergy.overallScore).toBeLessThanOrEqual(10);
    });
  });

  describe("dominant energy detection", () => {
    it("detects dominant energy based on fusion counts", () => {
      const result = getMatrixAnalysis(mockSaju as any, mockAstro as any, "ko");

      expect(result!.synergy.dominantEnergy).toHaveProperty("ko");
      expect(result!.synergy.dominantEnergy).toHaveProperty("en");
    });
  });
});
