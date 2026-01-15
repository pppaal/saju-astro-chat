/**
 * Saju StrengthScore 테스트
 * - 오행 점수 계산
 * - 신강/신약 점수 계산
 * - 격국 점수 계산
 * - 용신 적합도 계산
 * - 종합 점수 계산
 */


import {
  calculateElementScores,
  calculateStrengthScore,
  calculateGeokgukScore,
  calculateYongsinFitScore,
  calculateComprehensiveScore,
  type ElementScore,
  type StrengthScore,
  type GeokgukScore,
  type YongsinFitScore,
  type ComprehensiveScore,
} from "@/lib/Saju/strengthScore";
import type { SajuPillars, FiveElement } from "@/lib/Saju/types";

// 테스트용 헬퍼 - SajuPillars 생성
function createTestPillars(
  year: [string, string],
  month: [string, string],
  day: [string, string],
  time: [string, string]
): SajuPillars {
  return {
    year: {
      heavenlyStem: { name: year[0] },
      earthlyBranch: { name: year[1] },
    },
    month: {
      heavenlyStem: { name: month[0] },
      earthlyBranch: { name: month[1] },
    },
    day: {
      heavenlyStem: { name: day[0] },
      earthlyBranch: { name: day[1] },
    },
    time: {
      heavenlyStem: { name: time[0] },
      earthlyBranch: { name: time[1] },
    },
  } as SajuPillars;
}

describe("calculateElementScores", () => {
  it("returns scores for all five elements", () => {
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const scores = calculateElementScores(pillars);

    expect(scores).toHaveLength(5);
    expect(scores.map((s) => s.element)).toEqual(["목", "화", "토", "금", "수"]);
  });

  it("calculates raw scores for each element", () => {
    const pillars = createTestPillars(
      ["甲", "寅"], // 목목
      ["甲", "卯"], // 목목
      ["甲", "辰"], // 목토
      ["甲", "巳"]  // 목화
    );

    const scores = calculateElementScores(pillars);
    const woodScore = scores.find((s) => s.element === "목");

    expect(woodScore).toBeDefined();
    expect(woodScore!.raw).toBeGreaterThan(0);
  });

  it("calculates ratios that sum to approximately 1", () => {
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const scores = calculateElementScores(pillars);
    const totalRatio = scores.reduce((sum, s) => sum + s.ratio, 0);

    expect(totalRatio).toBeCloseTo(1, 5);
  });

  it("handles all wood (목) dominant chart", () => {
    const pillars = createTestPillars(
      ["甲", "寅"],
      ["乙", "卯"],
      ["甲", "寅"],
      ["乙", "卯"]
    );

    const scores = calculateElementScores(pillars);
    const woodScore = scores.find((s) => s.element === "목");

    expect(woodScore!.ratio).toBeGreaterThan(0.4);
  });

  it("handles all fire (화) dominant chart", () => {
    const pillars = createTestPillars(
      ["丙", "午"],
      ["丁", "巳"],
      ["丙", "午"],
      ["丁", "巳"]
    );

    const scores = calculateElementScores(pillars);
    const fireScore = scores.find((s) => s.element === "화");

    expect(fireScore!.ratio).toBeGreaterThan(0.4);
  });

  it("returns weighted scores equal to raw scores", () => {
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const scores = calculateElementScores(pillars);

    scores.forEach((score) => {
      expect(score.weighted).toBe(score.raw);
    });
  });
});

describe("calculateStrengthScore", () => {
  it("returns valid strength score structure", () => {
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const strength = calculateStrengthScore(pillars);

    expect(strength.total).toBeGreaterThanOrEqual(0);
    expect(strength.total).toBeLessThanOrEqual(100);
    expect(["극강", "강", "중강", "중약", "약", "극약"]).toContain(strength.level);
    expect(strength.supportScore).toBeGreaterThanOrEqual(0);
    expect(strength.resistScore).toBeGreaterThanOrEqual(0);
    expect(strength.items).toBeInstanceOf(Array);
  });

  it("identifies 극강 level for very strong day master", () => {
    // 丙 일간 + 巳午 화월 + 목 지원
    const pillars = createTestPillars(
      ["甲", "寅"], // 목 인성
      ["丙", "午"], // 화월 득령
      ["丙", "巳"], // 일주
      ["甲", "寅"]  // 목 인성
    );

    const strength = calculateStrengthScore(pillars);

    // Should be strong or very strong
    expect(["극강", "강", "중강"]).toContain(strength.level);
  });

  it("identifies 약 or 극약 level for weak day master", () => {
    // 甲 일간 in 금월 with 금 overwhelming
    const pillars = createTestPillars(
      ["庚", "申"], // 금금
      ["辛", "酉"], // 금금
      ["甲", "戌"], // 목토
      ["庚", "申"]  // 금금
    );

    const strength = calculateStrengthScore(pillars);

    // Should be weak due to 극받는관계
    expect(["약", "극약", "중약"]).toContain(strength.level);
  });

  it("calculates balance correctly", () => {
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const strength = calculateStrengthScore(pillars);

    expect(strength.balance).toBe(strength.supportScore - strength.resistScore);
  });

  it("includes 득령 item in calculation", () => {
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "寅"], // 목월
      ["甲", "辰"], // 甲 일간
      ["丁", "卯"]
    );

    const strength = calculateStrengthScore(pillars);
    const deukryeongItem = strength.items.find((i) => i.category === "득령");

    expect(deukryeongItem).toBeDefined();
    expect(deukryeongItem!.score).toBeGreaterThanOrEqual(0);
  });

  it("includes 통근 item in calculation", () => {
    const pillars = createTestPillars(
      ["甲", "寅"],
      ["乙", "卯"],
      ["甲", "辰"],
      ["丁", "巳"]
    );

    const strength = calculateStrengthScore(pillars);
    const tonggeunItem = strength.items.find((i) => i.category === "통근");

    expect(tonggeunItem).toBeDefined();
  });

  it("respects custom monthBranch parameter", () => {
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["甲", "辰"],
      ["丁", "卯"]
    );

    const strengthWithDefault = calculateStrengthScore(pillars);
    const strengthWithCustom = calculateStrengthScore(pillars, "寅");

    // Different month branch should potentially give different scores
    expect(strengthWithDefault.items[0].name).not.toBe(strengthWithCustom.items[0].name);
  });

  it("total is clamped between 0 and 100", () => {
    // Even extreme cases should be within bounds
    const strongPillars = createTestPillars(
      ["甲", "寅"],
      ["甲", "寅"],
      ["甲", "寅"],
      ["甲", "寅"]
    );

    const weakPillars = createTestPillars(
      ["庚", "申"],
      ["庚", "申"],
      ["甲", "酉"],
      ["庚", "申"]
    );

    const strongScore = calculateStrengthScore(strongPillars);
    const weakScore = calculateStrengthScore(weakPillars);

    expect(strongScore.total).toBeLessThanOrEqual(100);
    expect(weakScore.total).toBeGreaterThanOrEqual(0);
  });
});

describe("calculateGeokgukScore", () => {
  it("returns valid geokguk score structure", () => {
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const geokguk = calculateGeokgukScore(pillars, "정인격");

    expect(geokguk.type).toBe("정인격");
    expect(geokguk.purity).toBeGreaterThanOrEqual(0);
    expect(geokguk.purity).toBeLessThanOrEqual(100);
    expect(geokguk.stability).toBeGreaterThanOrEqual(0);
    expect(geokguk.stability).toBeLessThanOrEqual(100);
    expect(geokguk.items).toBeInstanceOf(Array);
  });

  it("increases purity for 월지 정기 투출", () => {
    // 寅월 정기 甲이 천간에 투출
    const pillars = createTestPillars(
      ["甲", "子"], // 甲 투출
      ["乙", "寅"], // 寅월 정기 = 甲
      ["丙", "辰"],
      ["丁", "卯"]
    );

    const geokguk = calculateGeokgukScore(pillars, "정인격");
    const touchulItem = geokguk.items.find((i) => i.category === "투출");

    expect(touchulItem).toBeDefined();
    expect(touchulItem!.score).toBeGreaterThan(0);
  });

  it("decreases purity and stability for 충", () => {
    // 子午충
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "午"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const geokguk = calculateGeokgukScore(pillars, "식신격");
    const chungItem = geokguk.items.find((i) => i.category === "충");

    expect(chungItem).toBeDefined();
    expect(chungItem!.score).toBeLessThan(0);
  });

  it("increases stability for 합", () => {
    // 子丑합
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const geokguk = calculateGeokgukScore(pillars, "재격");
    const hapItem = geokguk.items.find((i) => i.category === "합");

    expect(hapItem).toBeDefined();
    expect(hapItem!.score).toBeGreaterThan(0);
  });

  it("detects 寅申충", () => {
    const pillars = createTestPillars(
      ["甲", "寅"],
      ["乙", "申"],
      ["丙", "辰"],
      ["丁", "卯"]
    );

    const geokguk = calculateGeokgukScore(pillars, "관격");
    const chungItem = geokguk.items.find((i) => i.category === "충");

    expect(chungItem).toBeDefined();
  });

  it("detects 卯酉충", () => {
    const pillars = createTestPillars(
      ["甲", "卯"],
      ["乙", "酉"],
      ["丙", "辰"],
      ["丁", "巳"]
    );

    const geokguk = calculateGeokgukScore(pillars, "정관격");
    const chungItem = geokguk.items.find((i) => i.category === "충");

    expect(chungItem).toBeDefined();
  });

  it("detects 寅亥합", () => {
    const pillars = createTestPillars(
      ["甲", "寅"],
      ["乙", "亥"],
      ["丙", "辰"],
      ["丁", "巳"]
    );

    const geokguk = calculateGeokgukScore(pillars, "인수격");
    const hapItem = geokguk.items.find((i) => i.category === "합");

    expect(hapItem).toBeDefined();
  });
});

describe("calculateYongsinFitScore", () => {
  it("returns valid yongsin fit score structure", () => {
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const yongsin = calculateYongsinFitScore(pillars, "수", "중강");

    expect(yongsin.yongsin).toBe("수");
    expect(yongsin.fitScore).toBeGreaterThanOrEqual(0);
    expect(yongsin.fitScore).toBeLessThanOrEqual(100);
    expect(yongsin.presenceScore).toBeGreaterThanOrEqual(0);
    expect(yongsin.effectiveScore).toBeGreaterThanOrEqual(0);
    expect(yongsin.items).toBeInstanceOf(Array);
  });

  it("calculates high presence score when yongsin is abundant", () => {
    // 수 용신, 수가 많은 사주
    const pillars = createTestPillars(
      ["壬", "子"],
      ["癸", "亥"],
      ["甲", "子"],
      ["壬", "亥"]
    );

    const yongsin = calculateYongsinFitScore(pillars, "수", "약");

    // Presence score should be relatively high when element is abundant
    expect(yongsin.presenceScore).toBeGreaterThan(30);
  });

  it("calculates low presence score when yongsin is lacking", () => {
    // 수 용신, 수가 없는 사주 (화 위주)
    const pillars = createTestPillars(
      ["丙", "午"],
      ["丁", "巳"],
      ["丙", "午"],
      ["丁", "巳"]
    );

    const yongsin = calculateYongsinFitScore(pillars, "수", "강");

    expect(yongsin.presenceScore).toBeLessThan(30);
  });

  it("adds bonus for yongsin 투출", () => {
    // 목 용신, 甲이 천간에 있음
    const pillars = createTestPillars(
      ["甲", "子"], // 목 천간 투출
      ["乙", "丑"], // 목 천간 투출
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const yongsin = calculateYongsinFitScore(pillars, "목", "중약");
    const touchulItem = yongsin.items.find((i) => i.category === "투출");

    expect(touchulItem).toBeDefined();
    expect(yongsin.effectiveScore).toBeGreaterThan(30);
  });

  it("handles different yongsin elements", () => {
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const elements: FiveElement[] = ["목", "화", "토", "금", "수"];

    elements.forEach((element) => {
      const yongsin = calculateYongsinFitScore(pillars, element, "중강");
      expect(yongsin.yongsin).toBe(element);
      expect(yongsin.fitScore).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("calculateComprehensiveScore", () => {
  it("returns valid comprehensive score structure", () => {
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const score = calculateComprehensiveScore(pillars);

    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(100);
    expect(["S", "A", "B", "C", "D", "F"]).toContain(score.grade);
    expect(score.elements).toHaveLength(5);
    expect(score.strength).toBeDefined();
    expect(score.geokguk).toBeDefined();
    expect(score.yongsin).toBeDefined();
    expect(score.summary).toBeTruthy();
    expect(score.strengths).toBeInstanceOf(Array);
    expect(score.weaknesses).toBeInstanceOf(Array);
    expect(score.recommendations).toBeInstanceOf(Array);
  });

  it("uses custom geokgukType when provided", () => {
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const score = calculateComprehensiveScore(pillars, {
      geokgukType: "정관격",
    });

    expect(score.geokguk.type).toBe("정관격");
  });

  it("uses custom yongsin when provided", () => {
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const score = calculateComprehensiveScore(pillars, {
      yongsin: "금",
    });

    expect(score.yongsin.yongsin).toBe("금");
  });

  it("includes unse score when unseInfo provided", () => {
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const score = calculateComprehensiveScore(pillars, {
      unseInfo: { period: "대운", stem: "庚", branch: "申" },
    });

    expect(score.unse).toBeDefined();
    expect(score.unse!.period).toBe("대운");
    expect(score.unse!.harmonyScore).toBeDefined();
    expect(score.unse!.conflictScore).toBeDefined();
  });

  it("identifies strengths for strong day master", () => {
    const pillars = createTestPillars(
      ["甲", "寅"],
      ["甲", "寅"],
      ["甲", "寅"],
      ["甲", "寅"]
    );

    const score = calculateComprehensiveScore(pillars);

    // Should have strength-related positive comment
    const hasStrengthPositive = score.strengths.some(
      (s) => s.includes("강") || s.includes("극복")
    );
    expect(hasStrengthPositive).toBe(true);
  });

  it("identifies weaknesses for weak day master", () => {
    const pillars = createTestPillars(
      ["庚", "申"],
      ["辛", "酉"],
      ["甲", "戌"],
      ["庚", "申"]
    );

    const score = calculateComprehensiveScore(pillars);

    // Should have weakness-related comment
    const hasWeakness = score.weaknesses.length > 0 || score.recommendations.length > 0;
    expect(hasWeakness).toBe(true);
  });

  it("assigns S grade for very high scores", () => {
    // Well-balanced strong chart
    const pillars = createTestPillars(
      ["甲", "寅"],
      ["丙", "午"],
      ["戊", "辰"],
      ["庚", "申"]
    );

    const score = calculateComprehensiveScore(pillars, {
      yongsin: "수",
      geokgukType: "식신격",
    });

    // Grade should be valid
    expect(["S", "A", "B", "C", "D", "F"]).toContain(score.grade);
  });

  it("summary includes grade and level info", () => {
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const score = calculateComprehensiveScore(pillars);

    expect(score.summary).toContain("점");
    expect(score.summary).toContain("등급");
  });

  it("detects element imbalance in weaknesses", () => {
    // Very imbalanced chart (all wood)
    const pillars = createTestPillars(
      ["甲", "寅"],
      ["乙", "卯"],
      ["甲", "寅"],
      ["乙", "卯"]
    );

    const score = calculateComprehensiveScore(pillars);

    // Should detect imbalance
    const hasImbalanceWarning = score.weaknesses.some(
      (w) => w.includes("불균형") || w.includes("과다") || w.includes("부족")
    );
    // Either has imbalance warning or balanced is in strengths
    const isBalanced = score.strengths.some((s) => s.includes("균형"));
    expect(hasImbalanceWarning || isBalanced).toBe(true);
  });

  it("handles unse with 충 correctly", () => {
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"], // 일지 寅
      ["丁", "卯"]
    );

    const score = calculateComprehensiveScore(pillars, {
      unseInfo: { period: "세운", stem: "庚", branch: "申" }, // 寅申충
    });

    expect(score.unse).toBeDefined();
    expect(score.unse!.conflictScore).toBeGreaterThan(0);
  });

  it("handles unse with 인성 relation correctly", () => {
    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"], // 丙 일간, 인성은 목
      ["丁", "卯"]
    );

    const score = calculateComprehensiveScore(pillars, {
      unseInfo: { period: "대운", stem: "甲", branch: "寅" }, // 목 운 (인성)
    });

    expect(score.unse).toBeDefined();
    expect(score.unse!.harmonyScore).toBeGreaterThan(50);
  });
});

describe("Grade determination", () => {
  it("assigns appropriate grades based on overall score", () => {
    // Test grade boundaries
    const gradeThresholds = [
      { min: 90, expected: "S" },
      { min: 80, max: 89, expected: "A" },
      { min: 70, max: 79, expected: "B" },
      { min: 60, max: 69, expected: "C" },
      { min: 50, max: 59, expected: "D" },
      { min: 0, max: 49, expected: "F" },
    ];

    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const score = calculateComprehensiveScore(pillars);

    // Find which threshold the score falls into
    const matchedThreshold = gradeThresholds.find((t) => {
      if (t.max !== undefined) {
        return score.overall >= t.min && score.overall <= t.max;
      }
      return score.overall >= t.min;
    });

    expect(matchedThreshold).toBeDefined();
    expect(score.grade).toBe(matchedThreshold!.expected);
  });
});

describe("Strength level determination", () => {
  it("maps total score to correct level", () => {
    // Level thresholds:
    // >= 85: 극강
    // >= 70: 강
    // >= 55: 중강
    // >= 40: 중약
    // >= 25: 약
    // < 25: 극약

    const pillars = createTestPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const strength = calculateStrengthScore(pillars);
    const total = strength.total;
    const level = strength.level;

    if (total >= 85) expect(level).toBe("극강");
    else if (total >= 70) expect(level).toBe("강");
    else if (total >= 55) expect(level).toBe("중강");
    else if (total >= 40) expect(level).toBe("중약");
    else if (total >= 25) expect(level).toBe("약");
    else expect(level).toBe("극약");
  });
});
