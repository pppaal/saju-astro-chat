
import {
  calculateElementScores,
  calculateStrengthScore,
  calculateGeokgukScore,
  calculateYongsinFitScore,
  calculateComprehensiveScore,
  type ScoreItem,
  type ElementScore,
  type StrengthScore,
} from "@/lib/Saju/strengthScore";
import type { SajuPillars, PillarData } from "@/lib/Saju/types";

// Helper to create mock pillar data
function createPillarData(stem: string, branch: string): PillarData {
  return {
    heavenlyStem: { name: stem },
    earthlyBranch: { name: branch },
  } as PillarData;
}

// Helper to create mock pillars
function createMockPillars(
  year: [string, string],
  month: [string, string],
  day: [string, string],
  time: [string, string]
): SajuPillars {
  return {
    year: createPillarData(year[0], year[1]),
    month: createPillarData(month[0], month[1]),
    day: createPillarData(day[0], day[1]),
    time: createPillarData(time[0], time[1]),
  } as SajuPillars;
}

describe("strengthScore", () => {
  describe("calculateElementScores", () => {
    it("calculates element scores for all five elements", () => {
      const pillars = createMockPillars(
        ["甲", "子"], // 갑자 (목, 수)
        ["丙", "寅"], // 병인 (화, 목)
        ["戊", "午"], // 무오 (토, 화)
        ["庚", "申"]  // 경신 (금, 금)
      );

      const scores = calculateElementScores(pillars);

      expect(scores).toHaveLength(5);
      expect(scores.map(s => s.element)).toEqual(["목", "화", "토", "금", "수"]);
    });

    it("returns valid ratios that sum to approximately 1", () => {
      const pillars = createMockPillars(
        ["甲", "寅"],
        ["甲", "卯"],
        ["甲", "寅"],
        ["甲", "卯"]
      );

      const scores = calculateElementScores(pillars);
      const totalRatio = scores.reduce((sum, s) => sum + s.ratio, 0);

      expect(totalRatio).toBeCloseTo(1, 1);
    });

    it("gives higher scores to dominant elements", () => {
      // All wood (목) pillars
      const pillars = createMockPillars(
        ["甲", "寅"], // 갑인 (목, 목)
        ["乙", "卯"], // 을묘 (목, 목)
        ["甲", "寅"], // 갑인 (목, 목)
        ["乙", "卯"]  // 을묘 (목, 목)
      );

      const scores = calculateElementScores(pillars);
      const woodScore = scores.find(s => s.element === "목");

      expect(woodScore).toBeDefined();
      expect(woodScore!.ratio).toBeGreaterThan(0.5);
    });

    it("returns positive raw scores", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const scores = calculateElementScores(pillars);

      scores.forEach(score => {
        expect(score.raw).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("calculateStrengthScore", () => {
    it("returns strength score with all required properties", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const score = calculateStrengthScore(pillars);

      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(100);
      expect(score.level).toBeDefined();
      expect(score.supportScore).toBeGreaterThanOrEqual(0);
      expect(score.resistScore).toBeGreaterThanOrEqual(0);
      expect(score.items).toBeInstanceOf(Array);
    });

    it("assigns correct strength levels based on total score", () => {
      // Create a strong day master scenario
      const strongPillars = createMockPillars(
        ["甲", "寅"], // 목
        ["甲", "卯"], // 목 (월지 득령)
        ["甲", "寅"], // 갑목 일간
        ["甲", "卯"]  // 목
      );

      const strongScore = calculateStrengthScore(strongPillars);
      expect(["극강", "강", "중강"]).toContain(strongScore.level);
    });

    it("calculates balance as supportScore minus resistScore", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const score = calculateStrengthScore(pillars);

      expect(score.balance).toBe(score.supportScore - score.resistScore);
    });

    it("includes detailed score items", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const score = calculateStrengthScore(pillars);

      expect(score.items.length).toBeGreaterThan(0);
      score.items.forEach(item => {
        expect(item.category).toBeDefined();
        expect(item.name).toBeDefined();
        expect(typeof item.score).toBe("number");
        expect(item.weight).toBeGreaterThanOrEqual(0);
        expect(item.weight).toBeLessThanOrEqual(1);
      });
    });

    it("uses custom month branch when provided", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["甲", "午"], // 갑목 일간
        ["庚", "申"]
      );

      // 卯월 (목) - 득령
      const scoreWithMao = calculateStrengthScore(pillars, "卯");
      // 酉월 (금) - 실령
      const scoreWithYou = calculateStrengthScore(pillars, "酉");

      // 목 일간이 목월에서는 득령, 금월에서는 실령
      expect(scoreWithMao.supportScore).toBeGreaterThan(scoreWithYou.supportScore);
    });
  });

  describe("calculateGeokgukScore", () => {
    it("returns geokguk score with purity and stability", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const score = calculateGeokgukScore(pillars, "식신격");

      expect(score.type).toBe("식신격");
      expect(score.purity).toBeGreaterThanOrEqual(0);
      expect(score.purity).toBeLessThanOrEqual(100);
      expect(score.stability).toBeGreaterThanOrEqual(0);
      expect(score.stability).toBeLessThanOrEqual(100);
    });

    it("detects 충 (clash) and marks it in items", () => {
      // 子午충 포함
      const pillarsWithChung = createMockPillars(
        ["甲", "子"], // 자
        ["丙", "午"], // 오 (자오충)
        ["戊", "辰"],
        ["庚", "申"]
      );

      const scoreWithChung = calculateGeokgukScore(pillarsWithChung, "test");
      const hasChungItem = scoreWithChung.items.some(item => item.category === "충");

      expect(hasChungItem).toBe(true);
    });

    it("detects 합 (combination) and increases stability", () => {
      // 子丑합 포함
      const pillarsWithHap = createMockPillars(
        ["甲", "子"], // 자
        ["丙", "丑"], // 축 (자축합)
        ["戊", "辰"],
        ["庚", "申"]
      );

      const score = calculateGeokgukScore(pillarsWithHap, "test");
      const hasHapItem = score.items.some(item => item.category === "합");

      expect(hasHapItem).toBe(true);
    });

    it("includes score items explaining the calculation", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const score = calculateGeokgukScore(pillars, "편관격");

      expect(score.items).toBeInstanceOf(Array);
      score.items.forEach(item => {
        expect(item.category).toBeDefined();
        expect(item.description).toBeDefined();
      });
    });
  });

  describe("calculateYongsinFitScore", () => {
    it("returns yongsin fit score with all properties", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const score = calculateYongsinFitScore(pillars, "수", "중강");

      expect(score.yongsin).toBe("수");
      expect(score.fitScore).toBeGreaterThanOrEqual(0);
      expect(score.fitScore).toBeLessThanOrEqual(100);
      expect(score.presenceScore).toBeGreaterThanOrEqual(0);
      expect(score.effectiveScore).toBeGreaterThanOrEqual(0);
    });

    it("gives higher presence score when yongsin element is abundant", () => {
      // 수(水) 많은 사주
      const waterPillars = createMockPillars(
        ["壬", "子"], // 임자 (수, 수)
        ["癸", "亥"], // 계해 (수, 수)
        ["壬", "子"],
        ["癸", "亥"]
      );

      // 수 없는 사주
      const noWaterPillars = createMockPillars(
        ["甲", "寅"],
        ["丙", "午"],
        ["戊", "辰"],
        ["庚", "申"]
      );

      const waterScore = calculateYongsinFitScore(waterPillars, "수", "중강");
      const noWaterScore = calculateYongsinFitScore(noWaterPillars, "수", "중강");

      expect(waterScore.presenceScore).toBeGreaterThan(noWaterScore.presenceScore);
    });

    it("increases effective score when yongsin is visible in stems", () => {
      // 용신(금)이 천간에 투출
      const visibleYongsin = createMockPillars(
        ["庚", "子"], // 경(금) 천간에 있음
        ["辛", "寅"], // 신(금) 천간에 있음
        ["戊", "午"],
        ["甲", "申"]
      );

      // 용신(금)이 천간에 없음
      const hiddenYongsin = createMockPillars(
        ["甲", "申"], // 금은 지지에만
        ["丙", "酉"],
        ["戊", "午"],
        ["壬", "申"]
      );

      const visibleScore = calculateYongsinFitScore(visibleYongsin, "금", "중강");
      const hiddenScore = calculateYongsinFitScore(hiddenYongsin, "금", "중강");

      expect(visibleScore.effectiveScore).toBeGreaterThan(hiddenScore.effectiveScore);
    });
  });

  describe("calculateComprehensiveScore", () => {
    it("returns comprehensive score with all components", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const score = calculateComprehensiveScore(pillars);

      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(["S", "A", "B", "C", "D", "F"]).toContain(score.grade);
      expect(score.elements).toHaveLength(5);
      expect(score.strength).toBeDefined();
      expect(score.geokguk).toBeDefined();
      expect(score.yongsin).toBeDefined();
      expect(score.summary).toBeDefined();
      expect(score.strengths).toBeInstanceOf(Array);
      expect(score.weaknesses).toBeInstanceOf(Array);
      expect(score.recommendations).toBeInstanceOf(Array);
    });

    it("uses provided options for calculation", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const score = calculateComprehensiveScore(pillars, {
        geokgukType: "정관격",
        yongsin: "화",
      });

      expect(score.geokguk.type).toBe("정관격");
      expect(score.yongsin.yongsin).toBe("화");
    });

    it("includes unse harmony when unseInfo is provided", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const score = calculateComprehensiveScore(pillars, {
        unseInfo: {
          period: "2024년 대운",
          stem: "甲",
          branch: "辰",
        },
      });

      expect(score.unse).toBeDefined();
      expect(score.unse?.period).toBe("2024년 대운");
    });

    it("assigns correct grade based on overall score", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const score = calculateComprehensiveScore(pillars);

      // Verify grade is assigned based on overall score
      if (score.overall >= 90) expect(score.grade).toBe("S");
      else if (score.overall >= 80) expect(score.grade).toBe("A");
      else if (score.overall >= 70) expect(score.grade).toBe("B");
      else if (score.overall >= 60) expect(score.grade).toBe("C");
      else if (score.overall >= 50) expect(score.grade).toBe("D");
      else expect(score.grade).toBe("F");
    });

    it("generates summary with overall score and grade", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const score = calculateComprehensiveScore(pillars);

      expect(score.summary).toContain(String(score.overall));
      expect(score.summary).toContain(score.grade);
    });

    it("identifies strengths for balanced element distribution", () => {
      const pillars = createMockPillars(
        ["甲", "子"], // 목, 수
        ["丙", "寅"], // 화, 목
        ["戊", "午"], // 토, 화
        ["庚", "申"]  // 금, 금
      );

      const score = calculateComprehensiveScore(pillars);

      // Should have some analysis
      expect(score.strengths.length + score.weaknesses.length).toBeGreaterThan(0);
    });
  });
});
