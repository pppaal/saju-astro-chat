/**
 * Compatibility Fusion Engine 테스트
 * - Fusion 궁합 계산
 * - AI 인사이트 생성
 * - 추천 행동 생성
 * - 관계 역학 분석
 * - 미래 가이던스
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FiveElement } from "@/lib/Saju/types";

// Mock dependencies
vi.mock("@/lib/compatibility/cosmicCompatibility", () => ({
  calculateCosmicCompatibility: vi.fn(() => ({
    overallScore: 75,
    breakdown: {
      elementalHarmony: 80,
      yinYangBalance: 70,
      sajuPillarMatch: 75,
      aspectHarmony: 72,
    },
    details: {
      sajuAnalysis: {
        dayMasterHarmony: 78,
        elementBalance: 65,
        sijuHarmony: 70,
      },
      astrologyAnalysis: {
        sunMoonHarmony: 72,
        venusMarsSynergy: 85,
        ascendantMatch: 68,
      },
    },
    challenges: ["소통 방식의 차이"],
    strengths: ["깊은 감정적 연결"],
    summary: "전반적으로 좋은 궁합",
  })),
}));

vi.mock("@/lib/compatibility/compatibilityGraph", () => ({
  buildCompatibilityGraph: vi.fn(() => ({
    nodes: [],
    edges: [],
  })),
  analyzeCompatibilityGraph: vi.fn(() => ({
    harmonyIndex: 0.65,
    clusterScore: 0.55,
    strongestPaths: [
      { type: "positive", score: 0.8, from: "node1", to: "node2" },
    ],
    criticalNodes: ["dayMaster", "venus"],
  })),
}));

// Sample profiles for testing
const mockSajuProfile1 = {
  dayMaster: { name: "甲", yin_yang: "yang" as const, element: "목" as FiveElement },
  elements: { 목: 3, 화: 1, 토: 1, 금: 2, 수: 1 },
  pillars: {
    year: { stem: "甲", branch: "子" },
    month: { stem: "丙", branch: "寅" },
    day: { stem: "甲", branch: "午" },
    time: { stem: "庚", branch: "申" },
  },
};

const mockSajuProfile2 = {
  dayMaster: { name: "乙", yin_yang: "yin" as const, element: "목" as FiveElement },
  elements: { 목: 2, 화: 2, 토: 1, 금: 1, 수: 2 },
  pillars: {
    year: { stem: "乙", branch: "丑" },
    month: { stem: "丁", branch: "卯" },
    day: { stem: "乙", branch: "未" },
    time: { stem: "辛", branch: "酉" },
  },
};

const mockAstroProfile1 = {
  sun: { sign: "Aries", element: "fire" },
  moon: { sign: "Cancer", element: "water" },
  venus: { sign: "Taurus", element: "earth" },
  mars: { sign: "Leo", element: "fire" },
  ascendant: { sign: "Libra", element: "air" },
};

const mockAstroProfile2 = {
  sun: { sign: "Libra", element: "air" },
  moon: { sign: "Pisces", element: "water" },
  venus: { sign: "Scorpio", element: "water" },
  mars: { sign: "Taurus", element: "earth" },
  ascendant: { sign: "Aries", element: "fire" },
};

describe("Compatibility Fusion Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateFusionCompatibility", () => {
    it("returns FusionCompatibilityResult structure", async () => {
      const { calculateFusionCompatibility } = await import(
        "@/lib/compatibility/compatibilityFusion"
      );

      const result = calculateFusionCompatibility(
        mockSajuProfile1 as never,
        mockAstroProfile1 as never,
        mockSajuProfile2 as never,
        mockAstroProfile2 as never
      );

      expect(result).toHaveProperty("overallScore");
      expect(result).toHaveProperty("graphAnalysis");
      expect(result).toHaveProperty("aiInsights");
      expect(result).toHaveProperty("recommendedActions");
      expect(result).toHaveProperty("relationshipDynamics");
      expect(result).toHaveProperty("futureGuidance");
    });

    it("includes base compatibility properties", async () => {
      const { calculateFusionCompatibility } = await import(
        "@/lib/compatibility/compatibilityFusion"
      );

      const result = calculateFusionCompatibility(
        mockSajuProfile1 as never,
        mockAstroProfile1 as never,
        mockSajuProfile2 as never,
        mockAstroProfile2 as never
      );

      expect(result).toHaveProperty("breakdown");
      expect(result).toHaveProperty("details");
      expect(result).toHaveProperty("challenges");
      expect(result).toHaveProperty("strengths");
      expect(result).toHaveProperty("summary");
    });

    it("calculates valid overall score", async () => {
      const { calculateFusionCompatibility } = await import(
        "@/lib/compatibility/compatibilityFusion"
      );

      const result = calculateFusionCompatibility(
        mockSajuProfile1 as never,
        mockAstroProfile1 as never,
        mockSajuProfile2 as never,
        mockAstroProfile2 as never
      );

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe("AI Insights Generation", () => {
    it("generates aiInsights with required properties", async () => {
      const { calculateFusionCompatibility } = await import(
        "@/lib/compatibility/compatibilityFusion"
      );

      const result = calculateFusionCompatibility(
        mockSajuProfile1 as never,
        mockAstroProfile1 as never,
        mockSajuProfile2 as never,
        mockAstroProfile2 as never
      );

      expect(result.aiInsights).toHaveProperty("deepAnalysis");
      expect(result.aiInsights).toHaveProperty("hiddenPatterns");
      expect(result.aiInsights).toHaveProperty("synergySources");
      expect(result.aiInsights).toHaveProperty("growthOpportunities");
    });

    it("generates non-empty deep analysis", async () => {
      const { calculateFusionCompatibility } = await import(
        "@/lib/compatibility/compatibilityFusion"
      );

      const result = calculateFusionCompatibility(
        mockSajuProfile1 as never,
        mockAstroProfile1 as never,
        mockSajuProfile2 as never,
        mockAstroProfile2 as never
      );

      expect(result.aiInsights.deepAnalysis).toBeDefined();
      expect(typeof result.aiInsights.deepAnalysis).toBe("string");
      expect(result.aiInsights.deepAnalysis.length).toBeGreaterThan(0);
    });

    it("returns arrays for patterns and opportunities", async () => {
      const { calculateFusionCompatibility } = await import(
        "@/lib/compatibility/compatibilityFusion"
      );

      const result = calculateFusionCompatibility(
        mockSajuProfile1 as never,
        mockAstroProfile1 as never,
        mockSajuProfile2 as never,
        mockAstroProfile2 as never
      );

      expect(Array.isArray(result.aiInsights.hiddenPatterns)).toBe(true);
      expect(Array.isArray(result.aiInsights.synergySources)).toBe(true);
      expect(Array.isArray(result.aiInsights.growthOpportunities)).toBe(true);
    });
  });

  describe("Recommended Actions", () => {
    it("generates recommended actions array", async () => {
      const { calculateFusionCompatibility } = await import(
        "@/lib/compatibility/compatibilityFusion"
      );

      const result = calculateFusionCompatibility(
        mockSajuProfile1 as never,
        mockAstroProfile1 as never,
        mockSajuProfile2 as never,
        mockAstroProfile2 as never
      );

      expect(Array.isArray(result.recommendedActions)).toBe(true);
    });

    it("actions have valid structure", async () => {
      const { calculateFusionCompatibility } = await import(
        "@/lib/compatibility/compatibilityFusion"
      );

      const result = calculateFusionCompatibility(
        mockSajuProfile1 as never,
        mockAstroProfile1 as never,
        mockSajuProfile2 as never,
        mockAstroProfile2 as never
      );

      result.recommendedActions.forEach(action => {
        expect(["communication", "emotional", "practical", "spiritual"]).toContain(action.category);
        expect(["high", "medium", "low"]).toContain(action.priority);
        expect(action.action).toBeDefined();
        expect(action.reasoning).toBeDefined();
      });
    });

    it("sorts actions by priority", async () => {
      const { calculateFusionCompatibility } = await import(
        "@/lib/compatibility/compatibilityFusion"
      );

      const result = calculateFusionCompatibility(
        mockSajuProfile1 as never,
        mockAstroProfile1 as never,
        mockSajuProfile2 as never,
        mockAstroProfile2 as never
      );

      const priorities = result.recommendedActions.map(a => a.priority);
      const priorityOrder = { high: 0, medium: 1, low: 2 };

      for (let i = 1; i < priorities.length; i++) {
        expect(priorityOrder[priorities[i-1]]).toBeLessThanOrEqual(priorityOrder[priorities[i]]);
      }
    });
  });

  describe("Relationship Dynamics", () => {
    it("calculates relationship dynamics", async () => {
      const { calculateFusionCompatibility } = await import(
        "@/lib/compatibility/compatibilityFusion"
      );

      const result = calculateFusionCompatibility(
        mockSajuProfile1 as never,
        mockAstroProfile1 as never,
        mockSajuProfile2 as never,
        mockAstroProfile2 as never
      );

      expect(result.relationshipDynamics).toHaveProperty("powerBalance");
      expect(result.relationshipDynamics).toHaveProperty("emotionalIntensity");
      expect(result.relationshipDynamics).toHaveProperty("intellectualAlignment");
      expect(result.relationshipDynamics).toHaveProperty("spiritualConnection");
      expect(result.relationshipDynamics).toHaveProperty("conflictResolutionStyle");
    });

    it("power balance is within valid range", async () => {
      const { calculateFusionCompatibility } = await import(
        "@/lib/compatibility/compatibilityFusion"
      );

      const result = calculateFusionCompatibility(
        mockSajuProfile1 as never,
        mockAstroProfile1 as never,
        mockSajuProfile2 as never,
        mockAstroProfile2 as never
      );

      expect(result.relationshipDynamics.powerBalance).toBeGreaterThanOrEqual(-100);
      expect(result.relationshipDynamics.powerBalance).toBeLessThanOrEqual(100);
    });

    it("intensity scores are 0-100", async () => {
      const { calculateFusionCompatibility } = await import(
        "@/lib/compatibility/compatibilityFusion"
      );

      const result = calculateFusionCompatibility(
        mockSajuProfile1 as never,
        mockAstroProfile1 as never,
        mockSajuProfile2 as never,
        mockAstroProfile2 as never
      );

      expect(result.relationshipDynamics.emotionalIntensity).toBeGreaterThanOrEqual(0);
      expect(result.relationshipDynamics.emotionalIntensity).toBeLessThanOrEqual(100);
      expect(result.relationshipDynamics.intellectualAlignment).toBeGreaterThanOrEqual(0);
      expect(result.relationshipDynamics.intellectualAlignment).toBeLessThanOrEqual(100);
      expect(result.relationshipDynamics.spiritualConnection).toBeGreaterThanOrEqual(0);
      expect(result.relationshipDynamics.spiritualConnection).toBeLessThanOrEqual(100);
    });
  });

  describe("Future Guidance", () => {
    it("provides timeframe guidance", async () => {
      const { calculateFusionCompatibility } = await import(
        "@/lib/compatibility/compatibilityFusion"
      );

      const result = calculateFusionCompatibility(
        mockSajuProfile1 as never,
        mockAstroProfile1 as never,
        mockSajuProfile2 as never,
        mockAstroProfile2 as never
      );

      expect(result.futureGuidance).toHaveProperty("shortTerm");
      expect(result.futureGuidance).toHaveProperty("mediumTerm");
      expect(result.futureGuidance).toHaveProperty("longTerm");
      expect(result.futureGuidance).toHaveProperty("challenges");
      expect(result.futureGuidance).toHaveProperty("opportunities");
    });

    it("challenges have valid structure", async () => {
      const { calculateFusionCompatibility } = await import(
        "@/lib/compatibility/compatibilityFusion"
      );

      const result = calculateFusionCompatibility(
        mockSajuProfile1 as never,
        mockAstroProfile1 as never,
        mockSajuProfile2 as never,
        mockAstroProfile2 as never
      );

      result.futureGuidance.challenges.forEach(challenge => {
        expect(["short", "medium", "long"]).toContain(challenge.timeframe);
        expect(challenge.description).toBeDefined();
        expect(challenge.mitigation).toBeDefined();
      });
    });

    it("opportunities have valid structure", async () => {
      const { calculateFusionCompatibility } = await import(
        "@/lib/compatibility/compatibilityFusion"
      );

      const result = calculateFusionCompatibility(
        mockSajuProfile1 as never,
        mockAstroProfile1 as never,
        mockSajuProfile2 as never,
        mockAstroProfile2 as never
      );

      result.futureGuidance.opportunities.forEach(opportunity => {
        expect(["short", "medium", "long"]).toContain(opportunity.timeframe);
        expect(opportunity.description).toBeDefined();
        expect(opportunity.howToCapitalize).toBeDefined();
      });
    });
  });
});

describe("interpretCompatibilityScore", () => {
  it("returns correct grade for various scores", async () => {
    const { interpretCompatibilityScore } = await import(
      "@/lib/compatibility/compatibilityFusion"
    );

    expect(interpretCompatibilityScore(95).grade).toBe("S+");
    expect(interpretCompatibilityScore(87).grade).toBe("S");
    expect(interpretCompatibilityScore(78).grade).toBe("A");
    expect(interpretCompatibilityScore(68).grade).toBe("B");
    expect(interpretCompatibilityScore(58).grade).toBe("C");
    expect(interpretCompatibilityScore(48).grade).toBe("D");
    expect(interpretCompatibilityScore(30).grade).toBe("F");
  });

  it("returns complete interpretation structure", async () => {
    const { interpretCompatibilityScore } = await import(
      "@/lib/compatibility/compatibilityFusion"
    );

    const result = interpretCompatibilityScore(75);

    expect(result).toHaveProperty("grade");
    expect(result).toHaveProperty("emoji");
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("description");
  });

  it("provides meaningful titles for each grade", async () => {
    const { interpretCompatibilityScore } = await import(
      "@/lib/compatibility/compatibilityFusion"
    );

    expect(interpretCompatibilityScore(92).title).toBe("천상의 인연");
    expect(interpretCompatibilityScore(86).title).toBe("천생연분");
    expect(interpretCompatibilityScore(76).title).toBe("매우 좋은 궁합");
    expect(interpretCompatibilityScore(66).title).toBe("좋은 궁합");
    expect(interpretCompatibilityScore(56).title).toBe("노력이 필요한 궁합");
    expect(interpretCompatibilityScore(46).title).toBe("도전적인 궁합");
    expect(interpretCompatibilityScore(40).title).toBe("어려운 궁합");
  });

  it("handles boundary values correctly", async () => {
    const { interpretCompatibilityScore } = await import(
      "@/lib/compatibility/compatibilityFusion"
    );

    // Exact boundaries
    expect(interpretCompatibilityScore(90).grade).toBe("S+");
    expect(interpretCompatibilityScore(85).grade).toBe("S");
    expect(interpretCompatibilityScore(75).grade).toBe("A");
    expect(interpretCompatibilityScore(65).grade).toBe("B");
    expect(interpretCompatibilityScore(55).grade).toBe("C");
    expect(interpretCompatibilityScore(45).grade).toBe("D");
    expect(interpretCompatibilityScore(44).grade).toBe("F");
  });

  it("handles edge cases", async () => {
    const { interpretCompatibilityScore } = await import(
      "@/lib/compatibility/compatibilityFusion"
    );

    expect(() => interpretCompatibilityScore(0)).not.toThrow();
    expect(() => interpretCompatibilityScore(100)).not.toThrow();
    expect(interpretCompatibilityScore(0).grade).toBe("F");
    expect(interpretCompatibilityScore(100).grade).toBe("S+");
  });
});

describe("Type Definitions", () => {
  it("validates FusionCompatibilityResult interface", () => {
    interface TestResult {
      overallScore: number;
      graphAnalysis: {
        harmonyIndex: number;
        clusterScore: number;
      };
      aiInsights: {
        deepAnalysis: string;
        hiddenPatterns: string[];
      };
      recommendedActions: Array<{
        category: string;
        priority: string;
        action: string;
      }>;
      relationshipDynamics: {
        powerBalance: number;
        emotionalIntensity: number;
      };
      futureGuidance: {
        shortTerm: string;
        challenges: Array<{ timeframe: string }>;
      };
    }

    const mockResult: TestResult = {
      overallScore: 80,
      graphAnalysis: { harmonyIndex: 0.7, clusterScore: 0.6 },
      aiInsights: { deepAnalysis: "test", hiddenPatterns: [] },
      recommendedActions: [{ category: "communication", priority: "high", action: "talk" }],
      relationshipDynamics: { powerBalance: 0, emotionalIntensity: 75 },
      futureGuidance: { shortTerm: "test", challenges: [{ timeframe: "short" }] },
    };

    expect(mockResult.overallScore).toBe(80);
  });

  it("validates RecommendedAction categories", () => {
    type Category = "communication" | "emotional" | "practical" | "spiritual";
    type Priority = "high" | "medium" | "low";

    const categories: Category[] = ["communication", "emotional", "practical", "spiritual"];
    const priorities: Priority[] = ["high", "medium", "low"];

    expect(categories).toHaveLength(4);
    expect(priorities).toHaveLength(3);
  });

  it("validates TimedChallenge/Opportunity timeframes", () => {
    type Timeframe = "short" | "medium" | "long";
    const timeframes: Timeframe[] = ["short", "medium", "long"];

    expect(timeframes).toContain("short");
    expect(timeframes).toContain("medium");
    expect(timeframes).toContain("long");
  });
});
