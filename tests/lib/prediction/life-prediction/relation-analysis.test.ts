/**
 * Relation Analysis Tests
 * Tests for stem/branch relation analysis and multi-layer analysis
 */

import { describe, it, expect, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/prediction/advancedTimingEngine", () => ({
  calculateYearlyGanji: vi.fn((year: number) => ({
    stem: "甲",
    branch: "子",
    year,
  })),
  calculateMonthlyGanji: vi.fn((year: number, month: number) => ({
    stem: "乙",
    branch: "丑",
  })),
  calculatePreciseTwelveStage: vi.fn((dayStem: string, branch: string) => {
    // Return different energies based on branch
    if (branch === "寅" || branch === "卯") {
      return { stage: "건록", score: 80, energy: "peak" };
    }
    if (branch === "巳" || branch === "午") {
      return { stage: "장생", score: 70, energy: "rising" };
    }
    if (branch === "申" || branch === "酉") {
      return { stage: "쇠", score: 40, energy: "declining" };
    }
    return { stage: "묘", score: 30, energy: "dormant" };
  }),
  calculateSibsin: vi.fn((dayStem: string, targetStem: string) => {
    const relations: Record<string, string> = {
      "甲甲": "비견",
      "甲乙": "겁재",
      "甲丙": "식신",
      "甲丁": "상관",
      "甲戊": "편재",
      "甲己": "정재",
      "甲庚": "편관",
      "甲辛": "정관",
      "甲壬": "편인",
      "甲癸": "정인",
    };
    return relations[dayStem + targetStem] || "비견";
  }),
}));

vi.mock("@/lib/prediction/life-prediction/constants", () => ({
  STEM_COMBINATIONS: {
    "甲己": "토합",
    "乙庚": "금합",
    "丙辛": "수합",
    "丁壬": "목합",
    "戊癸": "화합",
    "己甲": "토합",
    "庚乙": "금합",
    "辛丙": "수합",
    "壬丁": "목합",
    "癸戊": "화합",
  },
  STEM_CLASHES: ["甲庚", "乙辛", "丙壬", "丁癸", "庚甲", "辛乙", "壬丙", "癸丁"],
  SIX_COMBOS: {
    "子丑": "토",
    "丑子": "토",
    "寅亥": "목",
    "亥寅": "목",
    "卯戌": "화",
    "戌卯": "화",
    "辰酉": "금",
    "酉辰": "금",
    "巳申": "수",
    "申巳": "수",
    "午未": "토",
    "未午": "토",
  },
  PARTIAL_TRINES: {
    "寅午": "화",
    "午寅": "화",
    "午戌": "화",
    "戌午": "화",
    "寅戌": "화",
    "戌寅": "화",
    "巳酉": "금",
    "酉巳": "금",
    "酉丑": "금",
    "丑酉": "금",
    "巳丑": "금",
    "丑巳": "금",
    "申子": "수",
    "子申": "수",
    "子辰": "수",
    "辰子": "수",
    "申辰": "수",
    "辰申": "수",
    "亥卯": "목",
    "卯亥": "목",
    "卯未": "목",
    "未卯": "목",
    "亥未": "목",
    "未亥": "목",
  },
  BRANCH_CLASHES: {
    "子午": true,
    "午子": true,
    "丑未": true,
    "未丑": true,
    "寅申": true,
    "申寅": true,
    "卯酉": true,
    "酉卯": true,
    "辰戌": true,
    "戌辰": true,
    "巳亥": true,
    "亥巳": true,
  },
  BRANCH_PUNISHMENTS: {
    "寅巳": true,
    "巳寅": true,
    "巳申": true,
    "申巳": true,
    "寅申": true,
    "申寅": true,
  },
  STEM_ELEMENT: {
    "甲": "목",
    "乙": "목",
    "丙": "화",
    "丁": "화",
    "戊": "토",
    "己": "토",
    "庚": "금",
    "辛": "금",
    "壬": "수",
    "癸": "수",
  },
  EVENT_FAVORABLE_CONDITIONS: {
    career: {
      favorableSibsin: ["정관", "편관", "식신"],
      avoidSibsin: ["겁재", "상관"],
    },
    love: {
      favorableSibsin: ["정재", "정관", "정인"],
      avoidSibsin: ["편인", "겁재"],
    },
    finance: {
      favorableSibsin: ["정재", "편재", "식신"],
      avoidSibsin: ["겁재", "상관"],
    },
  },
}));

import {
  analyzeStemRelation,
  analyzeBranchRelation,
  analyzeMultiLayerInteraction,
  analyzeDaeunTransition,
  generateEnergyRecommendations,
} from "@/lib/prediction/life-prediction/relation-analysis";
import type { LifePredictionInput } from "@/lib/prediction/life-prediction/types";
import type { DaeunInfo } from "@/lib/prediction/daeunTransitSync";

describe("Relation Analysis", () => {
  describe("analyzeStemRelation", () => {
    describe("stem combinations (합)", () => {
      it("detects 甲己 combination (토합)", () => {
        const result = analyzeStemRelation("甲", "己");

        expect(result.type).toBe("합");
        expect(result.description).toBe("토합");
      });

      it("detects 乙庚 combination (금합)", () => {
        const result = analyzeStemRelation("乙", "庚");

        expect(result.type).toBe("합");
        expect(result.description).toBe("금합");
      });

      it("detects 丙辛 combination (수합)", () => {
        const result = analyzeStemRelation("丙", "辛");

        expect(result.type).toBe("합");
        expect(result.description).toBe("수합");
      });

      it("detects 丁壬 combination (목합)", () => {
        const result = analyzeStemRelation("丁", "壬");

        expect(result.type).toBe("합");
        expect(result.description).toBe("목합");
      });

      it("detects 戊癸 combination (화합)", () => {
        const result = analyzeStemRelation("戊", "癸");

        expect(result.type).toBe("합");
        expect(result.description).toBe("화합");
      });

      it("detects reverse combinations", () => {
        const result = analyzeStemRelation("己", "甲");

        expect(result.type).toBe("합");
        expect(result.description).toBe("토합");
      });
    });

    describe("stem clashes (충)", () => {
      it("detects 甲庚 clash", () => {
        const result = analyzeStemRelation("甲", "庚");

        expect(result.type).toBe("충");
        expect(result.description).toBe("천간 충돌");
      });

      it("detects 乙辛 clash", () => {
        const result = analyzeStemRelation("乙", "辛");

        expect(result.type).toBe("충");
      });

      it("detects 丙壬 clash", () => {
        const result = analyzeStemRelation("丙", "壬");

        expect(result.type).toBe("충");
      });

      it("detects 丁癸 clash", () => {
        const result = analyzeStemRelation("丁", "癸");

        expect(result.type).toBe("충");
      });
    });

    describe("no relation", () => {
      it("returns 무관 for unrelated stems", () => {
        const result = analyzeStemRelation("甲", "乙");

        expect(result.type).toBe("무관");
        expect(result.description).toBe("");
      });

      it("returns 무관 for same stem", () => {
        const result = analyzeStemRelation("甲", "甲");

        expect(result.type).toBe("무관");
      });
    });
  });

  describe("analyzeBranchRelation", () => {
    describe("six combinations (육합)", () => {
      it("detects 子丑 combination", () => {
        const result = analyzeBranchRelation("子", "丑");
        expect(result).toBe("육합");
      });

      it("detects 寅亥 combination", () => {
        const result = analyzeBranchRelation("寅", "亥");
        expect(result).toBe("육합");
      });

      it("detects 卯戌 combination", () => {
        const result = analyzeBranchRelation("卯", "戌");
        expect(result).toBe("육합");
      });

      it("detects 辰酉 combination", () => {
        const result = analyzeBranchRelation("辰", "酉");
        expect(result).toBe("육합");
      });

      it("detects 巳申 combination", () => {
        const result = analyzeBranchRelation("巳", "申");
        expect(result).toBe("육합");
      });

      it("detects 午未 combination", () => {
        const result = analyzeBranchRelation("午", "未");
        expect(result).toBe("육합");
      });

      it("detects reverse combinations", () => {
        const result = analyzeBranchRelation("丑", "子");
        expect(result).toBe("육합");
      });
    });

    describe("partial trines (삼합)", () => {
      it("detects 寅午 partial trine", () => {
        const result = analyzeBranchRelation("寅", "午");
        expect(result).toBe("삼합");
      });

      it("detects 申子 partial trine", () => {
        const result = analyzeBranchRelation("申", "子");
        expect(result).toBe("삼합");
      });

      it("detects 亥卯 partial trine", () => {
        const result = analyzeBranchRelation("亥", "卯");
        expect(result).toBe("삼합");
      });

      it("detects 巳酉 partial trine", () => {
        const result = analyzeBranchRelation("巳", "酉");
        expect(result).toBe("삼합");
      });
    });

    describe("branch clashes (충)", () => {
      it("detects 子午 clash", () => {
        const result = analyzeBranchRelation("子", "午");
        expect(result).toBe("충");
      });

      it("detects 丑未 clash", () => {
        const result = analyzeBranchRelation("丑", "未");
        expect(result).toBe("충");
      });

      it("detects 寅申 clash", () => {
        const result = analyzeBranchRelation("寅", "申");
        expect(result).toBe("충");
      });

      it("detects 卯酉 clash", () => {
        const result = analyzeBranchRelation("卯", "酉");
        expect(result).toBe("충");
      });

      it("detects 辰戌 clash", () => {
        const result = analyzeBranchRelation("辰", "戌");
        expect(result).toBe("충");
      });

      it("detects 巳亥 clash", () => {
        const result = analyzeBranchRelation("巳", "亥");
        expect(result).toBe("충");
      });
    });

    describe("punishments (형)", () => {
      it("detects 寅巳 punishment", () => {
        const result = analyzeBranchRelation("寅", "巳");
        expect(result).toBe("형");
      });
    });

    describe("no relation", () => {
      it("returns 무관 for unrelated branches", () => {
        const result = analyzeBranchRelation("子", "寅");
        expect(result).toBe("무관");
      });
    });
  });

  describe("analyzeMultiLayerInteraction", () => {
    const mockInput: LifePredictionInput = {
      birthYear: 1990,
      dayStem: "甲",
      dayBranch: "子",
      monthBranch: "寅",
      yearBranch: "午",
      daeunList: [
        {
          startAge: 25,
          endAge: 34,
          stem: "丁",
          branch: "卯",
          element: "화",
        },
      ],
      yongsin: ["수", "금"],
      kisin: ["토"],
    };

    it("returns BonusResult structure", () => {
      const result = analyzeMultiLayerInteraction(mockInput, "career", 2020, 6);

      expect(result).toHaveProperty("bonus");
      expect(result).toHaveProperty("reasons");
      expect(result).toHaveProperty("penalties");
      expect(typeof result.bonus).toBe("number");
      expect(Array.isArray(result.reasons)).toBe(true);
      expect(Array.isArray(result.penalties)).toBe(true);
    });

    it("returns empty result when no conditions for event type", () => {
      const result = analyzeMultiLayerInteraction(mockInput, "unknown" as any, 2020, 6);

      expect(result.bonus).toBe(0);
      expect(result.reasons).toHaveLength(0);
      expect(result.penalties).toHaveLength(0);
    });

    it("returns empty result when no matching daeun", () => {
      const inputNoMatchingDaeun = {
        ...mockInput,
        daeunList: [
          {
            startAge: 45,
            endAge: 54,
            stem: "丁",
            branch: "卯",
            element: "화",
          },
        ],
      };
      const result = analyzeMultiLayerInteraction(inputNoMatchingDaeun, "career", 2020, 6);

      expect(result.bonus).toBe(0);
    });

    it("returns empty result when daeunList is undefined", () => {
      const inputNoDaeun = {
        ...mockInput,
        daeunList: undefined,
      };
      const result = analyzeMultiLayerInteraction(inputNoDaeun, "career", 2020, 6);

      expect(result.bonus).toBe(0);
    });

    it("caps bonus between -30 and 30", () => {
      const result = analyzeMultiLayerInteraction(mockInput, "career", 2020, 6);

      expect(result.bonus).toBeGreaterThanOrEqual(-30);
      expect(result.bonus).toBeLessThanOrEqual(30);
    });

    it("limits reasons to 4 items", () => {
      const result = analyzeMultiLayerInteraction(mockInput, "career", 2020, 6);

      expect(result.reasons.length).toBeLessThanOrEqual(4);
    });

    it("limits penalties to 3 items", () => {
      const result = analyzeMultiLayerInteraction(mockInput, "career", 2020, 6);

      expect(result.penalties.length).toBeLessThanOrEqual(3);
    });
  });

  describe("analyzeDaeunTransition", () => {
    const mockInput: LifePredictionInput = {
      birthYear: 1990,
      dayStem: "甲",
      dayBranch: "子",
      monthBranch: "寅",
      yearBranch: "午",
      daeunList: [],
      yongsin: ["수", "금"],
      kisin: ["토"],
    };

    const fromDaeun: DaeunInfo = {
      startAge: 15,
      endAge: 24,
      stem: "庚",
      branch: "申",
      element: "금",
    };

    const toDaeun: DaeunInfo = {
      startAge: 25,
      endAge: 34,
      stem: "甲",
      branch: "寅",
      element: "목",
    };

    it("returns impact and description", () => {
      const result = analyzeDaeunTransition(mockInput, fromDaeun, toDaeun);

      expect(result).toHaveProperty("impact");
      expect(result).toHaveProperty("description");
      expect(typeof result.description).toBe("string");
    });

    it("returns valid impact type", () => {
      const result = analyzeDaeunTransition(mockInput, fromDaeun, toDaeun);

      const validImpacts = [
        "major_positive",
        "positive",
        "neutral",
        "challenging",
        "major_challenging",
      ];
      expect(validImpacts).toContain(result.impact);
    });

    it("detects major_positive transition to yongsin with peak energy", () => {
      const inputWithYongsin: LifePredictionInput = {
        ...mockInput,
        yongsin: ["목"],
      };
      const toDaeunPeak: DaeunInfo = {
        startAge: 25,
        endAge: 34,
        stem: "甲",
        branch: "寅", // Peak energy in mock
        element: "목",
      };
      const fromDaeunNoYongsin: DaeunInfo = {
        startAge: 15,
        endAge: 24,
        stem: "庚",
        branch: "申",
        element: "금",
      };

      const result = analyzeDaeunTransition(inputWithYongsin, fromDaeunNoYongsin, toDaeunPeak);

      expect(result.impact).toBe("major_positive");
      expect(result.description).toContain("용신 대운 진입");
    });

    it("detects positive transition", () => {
      const inputWithYongsin: LifePredictionInput = {
        ...mockInput,
        yongsin: ["목"],
      };
      // From yongsin daeun to another yongsin
      const fromDaeunYongsin: DaeunInfo = {
        startAge: 15,
        endAge: 24,
        stem: "甲",
        branch: "巳", // Rising energy
        element: "목",
      };
      const toDaeunYongsin: DaeunInfo = {
        startAge: 25,
        endAge: 34,
        stem: "乙",
        branch: "午", // Rising energy
        element: "목",
      };

      const result = analyzeDaeunTransition(inputWithYongsin, fromDaeunYongsin, toDaeunYongsin);

      expect(result.impact).toBe("positive");
      expect(result.description).toContain("긍정적 변화");
    });

    it("detects major_challenging transition to kisin with dormant energy", () => {
      const inputWithKisin: LifePredictionInput = {
        ...mockInput,
        kisin: ["토"],
      };
      const toDaeunKisin: DaeunInfo = {
        startAge: 25,
        endAge: 34,
        stem: "戊",
        branch: "子", // Dormant energy in mock
        element: "토",
      };

      const result = analyzeDaeunTransition(inputWithKisin, fromDaeun, toDaeunKisin);

      expect(result.impact).toBe("major_challenging");
      expect(result.description).toContain("인내와 준비 필요");
    });

    it("detects challenging transition for dormant energy with kisin", () => {
      const inputWithKisin: LifePredictionInput = {
        ...mockInput,
        kisin: ["토"],
        yongsin: [], // No yongsin
      };
      const toDaeunKisin: DaeunInfo = {
        startAge: 25,
        endAge: 34,
        stem: "戊",
        branch: "子", // Dormant energy in mock
        element: "토",
      };

      const result = analyzeDaeunTransition(inputWithKisin, fromDaeun, toDaeunKisin);

      // With kisin and dormant energy, should be challenging or major_challenging
      expect(["challenging", "major_challenging"]).toContain(result.impact);
    });

    it("detects neutral transition", () => {
      const inputNeutral: LifePredictionInput = {
        ...mockInput,
        yongsin: ["수"],
        kisin: ["화"],
      };
      const toDaeunNeutral: DaeunInfo = {
        startAge: 25,
        endAge: 34,
        stem: "戊",
        branch: "酉", // Declining energy
        element: "토",
      };

      const result = analyzeDaeunTransition(inputNeutral, fromDaeun, toDaeunNeutral);

      expect(result.impact).toBe("neutral");
      expect(result.description).toContain("안정적 전환");
    });
  });

  describe("generateEnergyRecommendations", () => {
    describe("peak energy recommendations", () => {
      it("includes project and challenge recommendations", () => {
        const recommendations = generateEnergyRecommendations("peak", "목");

        expect(recommendations).toContain("중요한 결정과 큰 프로젝트 추진");
        expect(recommendations).toContain("적극적인 도전과 확장");
        expect(recommendations).toContain("리더십 발휘와 책임 수용");
      });
    });

    describe("rising energy recommendations", () => {
      it("includes new beginning and learning recommendations", () => {
        const recommendations = generateEnergyRecommendations("rising", "화");

        expect(recommendations).toContain("새로운 시작과 계획 수립");
        expect(recommendations).toContain("학습과 자기 개발");
        expect(recommendations).toContain("인맥 확장과 네트워킹");
      });
    });

    describe("declining energy recommendations", () => {
      it("includes preservation and stability recommendations", () => {
        const recommendations = generateEnergyRecommendations("declining", "토");

        expect(recommendations).toContain("기존 성과의 정리와 보존");
        expect(recommendations).toContain("무리한 확장보다 안정 추구");
        expect(recommendations).toContain("후계 양성과 지식 전수");
      });
    });

    describe("dormant energy recommendations", () => {
      it("includes rest and reflection recommendations", () => {
        const recommendations = generateEnergyRecommendations("dormant", "금");

        expect(recommendations).toContain("내면 성찰과 재충전");
        expect(recommendations).toContain("건강 관리와 휴식");
        expect(recommendations).toContain("다음 주기를 위한 조용한 준비");
      });
    });

    describe("element-specific recommendations", () => {
      it("adds 목 (wood) element recommendation", () => {
        const recommendations = generateEnergyRecommendations("peak", "목");

        expect(recommendations).toContain("창의적 활동과 새로운 아이디어 개발");
      });

      it("adds 화 (fire) element recommendation", () => {
        const recommendations = generateEnergyRecommendations("peak", "화");

        expect(recommendations).toContain("열정을 표현하되 과열 주의");
      });

      it("adds 토 (earth) element recommendation", () => {
        const recommendations = generateEnergyRecommendations("peak", "토");

        expect(recommendations).toContain("부동산, 안정적 투자에 유리");
      });

      it("adds 금 (metal) element recommendation", () => {
        const recommendations = generateEnergyRecommendations("peak", "금");

        expect(recommendations).toContain("결단력 있는 정리와 선택");
      });

      it("adds 수 (water) element recommendation", () => {
        const recommendations = generateEnergyRecommendations("peak", "수");

        expect(recommendations).toContain("유연한 대응과 지혜로운 판단");
      });
    });

    it("returns at least 4 recommendations (3 energy + 1 element)", () => {
      const recommendations = generateEnergyRecommendations("peak", "목");

      expect(recommendations.length).toBeGreaterThanOrEqual(4);
    });
  });
});
