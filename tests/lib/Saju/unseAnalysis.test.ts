// tests/lib/Saju/unseAnalysis.test.ts
// 대운/세운 종합 분석 모듈 테스트


import {
  analyzeUnseComprehensive,
  analyzeDaeunPeriod,
  analyzeLifeCycle,
  analyzeSpecificYear,
  analyzeMultiYearTrend,
  type UnseInfo,
  type UnseType,
  type UnseComprehensiveAnalysis,
  type DaeunPeriodAnalysis,
  type LifeCycleAnalysis,
  type YearDetailAnalysis,
  type MultiYearTrend,
} from "@/lib/Saju/unseAnalysis";
import type { FiveElement } from "@/lib/Saju/types";

// 테스트용 사주 생성 헬퍼
interface Pillar {
  stem: string;
  branch: string;
}

interface SajuPillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
}

function createPillars(
  year: [string, string],
  month: [string, string],
  day: [string, string],
  time: [string, string]
): SajuPillars {
  return {
    year: { stem: year[0], branch: year[1] },
    month: { stem: month[0], branch: month[1] },
    day: { stem: day[0], branch: day[1] },
    hour: { stem: time[0], branch: time[1] },
  };
}

describe("unseAnalysis - 대운/세운 종합 분석", () => {
  const testPillars = createPillars(
    ["甲", "子"],
    ["丙", "寅"],
    ["戊", "辰"],
    ["庚", "午"]
  );

  describe("analyzeUnseComprehensive", () => {
    it("returns UnseComprehensiveAnalysis structure", () => {
      const unseInfo: UnseInfo = {
        type: "대운",
        stem: "甲",
        branch: "寅",
        startAge: 5,
        endAge: 14,
      };

      const result = analyzeUnseComprehensive(unseInfo, testPillars);

      expect(result).toHaveProperty("unseInfo");
      expect(result).toHaveProperty("overallScore");
      expect(result).toHaveProperty("grade");
      expect(result).toHaveProperty("yongsinMatch");
      expect(result).toHaveProperty("twelveStage");
      expect(result).toHaveProperty("sibsinRelations");
      expect(result).toHaveProperty("interactions");
      expect(result).toHaveProperty("themes");
      expect(result).toHaveProperty("opportunities");
      expect(result).toHaveProperty("challenges");
      expect(result).toHaveProperty("advice");
      expect(result).toHaveProperty("summary");
    });

    it("overallScore is between 0 and 100", () => {
      const unseInfo: UnseInfo = {
        type: "세운",
        stem: "甲",
        branch: "子",
        year: 2024,
      };

      const result = analyzeUnseComprehensive(unseInfo, testPillars);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it("grade is valid (S, A, B, C, D, F)", () => {
      const unseInfo: UnseInfo = {
        type: "대운",
        stem: "丙",
        branch: "午",
      };

      const result = analyzeUnseComprehensive(unseInfo, testPillars);

      expect(["S", "A", "B", "C", "D", "F"]).toContain(result.grade);
    });

    it("considers yongsin when provided", () => {
      const unseInfo: UnseInfo = {
        type: "대운",
        stem: "甲",
        branch: "寅",
      };

      const yongsin: FiveElement[] = ["목"];
      const kisin: FiveElement[] = ["금"];

      const result = analyzeUnseComprehensive(unseInfo, testPillars, yongsin, kisin);

      // 甲寅은 목 오행, 용신이 목이므로 매치됨
      expect(result.yongsinMatch.match).toBe("yongsin");
      expect(result.yongsinMatch.score).toBeGreaterThan(0);
    });

    it("considers kisin when provided", () => {
      const unseInfo: UnseInfo = {
        type: "대운",
        stem: "庚",
        branch: "申",
      };

      const yongsin: FiveElement[] = ["목"];
      const kisin: FiveElement[] = ["금"];

      const result = analyzeUnseComprehensive(unseInfo, testPillars, yongsin, kisin);

      // 庚申은 금 오행, 기신이 금이므로 매치됨
      expect(result.yongsinMatch.match).toBe("kisin");
      expect(result.yongsinMatch.score).toBeLessThan(0);
    });

    it("returns neutral when neither yongsin nor kisin match", () => {
      const unseInfo: UnseInfo = {
        type: "대운",
        stem: "丙",
        branch: "午",
      };

      const yongsin: FiveElement[] = ["목"];
      const kisin: FiveElement[] = ["금"];

      const result = analyzeUnseComprehensive(unseInfo, testPillars, yongsin, kisin);

      // 丙午는 화 오행, 용신/기신 둘 다 아님
      expect(result.yongsinMatch.match).toBe("neutral");
    });

    it("analyzes twelve stages correctly", () => {
      const unseInfo: UnseInfo = {
        type: "대운",
        stem: "戊",
        branch: "辰",
      };

      const result = analyzeUnseComprehensive(unseInfo, testPillars);

      expect(result.twelveStage).toHaveProperty("stage");
      expect(result.twelveStage).toHaveProperty("description");
      expect(result.twelveStage).toHaveProperty("energy");
      expect(result.twelveStage).toHaveProperty("score");
      expect(["rising", "peak", "declining", "dormant"]).toContain(
        result.twelveStage.energy
      );
    });

    it("analyzes interactions with pillars", () => {
      const unseInfo: UnseInfo = {
        type: "대운",
        stem: "甲",
        branch: "丑", // 子丑 육합
      };

      const result = analyzeUnseComprehensive(unseInfo, testPillars);

      // 년주(子)와 육합이 있어야 함
      expect(result.interactions.length).toBeGreaterThan(0);
      const yearInteraction = result.interactions.find(
        (i) => i.target === "년주"
      );
      expect(yearInteraction).toBeDefined();
    });

    it("detects 육합 interaction", () => {
      // 子丑 육합 테스트
      const pillarsWithZi = createPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "辰"],
        ["庚", "午"]
      );

      const unseInfo: UnseInfo = {
        type: "대운",
        stem: "乙",
        branch: "丑", // 子와 육합
      };

      const result = analyzeUnseComprehensive(unseInfo, pillarsWithZi);

      const yearInteraction = result.interactions.find((i) => i.target === "년주");
      const hasYukhap = yearInteraction?.interactions.some(
        (int) => int.type === "육합"
      );
      expect(hasYukhap).toBe(true);
    });

    it("detects 충 interaction", () => {
      // 子午 충 테스트
      const pillarsWithZi = createPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "辰"],
        ["庚", "申"]
      );

      const unseInfo: UnseInfo = {
        type: "대운",
        stem: "丙",
        branch: "午", // 子와 충
      };

      const result = analyzeUnseComprehensive(unseInfo, pillarsWithZi);

      const yearInteraction = result.interactions.find((i) => i.target === "년주");
      const hasChung = yearInteraction?.interactions.some(
        (int) => int.type === "충"
      );
      expect(hasChung).toBe(true);
    });

    it("includes themes based on sibsin", () => {
      const unseInfo: UnseInfo = {
        type: "대운",
        stem: "庚", // 戊일간 기준 편재
        branch: "申",
      };

      const result = analyzeUnseComprehensive(unseInfo, testPillars);

      // 편재 운이면 재물/경제 테마
      if (result.sibsinRelations[0]?.sibsin === "편재") {
        expect(result.themes).toContain("재물/경제");
      }
    });

    it("provides advice array", () => {
      const unseInfo: UnseInfo = {
        type: "대운",
        stem: "甲",
        branch: "寅",
      };

      const result = analyzeUnseComprehensive(unseInfo, testPillars);

      expect(Array.isArray(result.advice)).toBe(true);
      expect(result.advice.length).toBeGreaterThan(0);
    });

    it("generates summary string", () => {
      const unseInfo: UnseInfo = {
        type: "세운",
        stem: "甲",
        branch: "辰",
        year: 2024,
      };

      const result = analyzeUnseComprehensive(unseInfo, testPillars);

      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.summary).toContain("세운");
    });
  });

  describe("analyzeDaeunPeriod", () => {
    it("returns DaeunPeriodAnalysis structure", () => {
      const result = analyzeDaeunPeriod(
        "甲",
        "寅",
        5,
        0,
        testPillars,
        [],
        [],
        1990
      );

      expect(result).toHaveProperty("periodIndex");
      expect(result).toHaveProperty("startAge");
      expect(result).toHaveProperty("endAge");
      expect(result).toHaveProperty("stem");
      expect(result).toHaveProperty("branch");
      expect(result).toHaveProperty("analysis");
      expect(result).toHaveProperty("keyYears");
      expect(result).toHaveProperty("transitionAdvice");
    });

    it("sets correct start and end age (10-year period)", () => {
      const result = analyzeDaeunPeriod("甲", "寅", 5, 0, testPillars);

      expect(result.startAge).toBe(5);
      expect(result.endAge).toBe(14); // startAge + 9
    });

    it("includes comprehensive analysis", () => {
      const result = analyzeDaeunPeriod("甲", "寅", 5, 0, testPillars);

      expect(result.analysis).toHaveProperty("overallScore");
      expect(result.analysis).toHaveProperty("grade");
      expect(result.analysis.unseInfo.type).toBe("대운");
    });

    it("identifies key years when birth year provided", () => {
      const result = analyzeDaeunPeriod(
        "甲",
        "寅",
        5,
        0,
        testPillars,
        [],
        [],
        1990
      );

      // keyYears가 배열인지 확인
      expect(Array.isArray(result.keyYears)).toBe(true);
    });

    it("provides transition advice based on grade", () => {
      const result = analyzeDaeunPeriod("甲", "寅", 5, 0, testPillars);

      expect(result.transitionAdvice).toBeDefined();
      expect(result.transitionAdvice.length).toBeGreaterThan(0);
    });

    it("passes yongsin and kisin to analysis", () => {
      const yongsin: FiveElement[] = ["목"];
      const kisin: FiveElement[] = ["금"];

      const result = analyzeDaeunPeriod(
        "甲",
        "寅",
        5,
        0,
        testPillars,
        yongsin,
        kisin
      );

      expect(result.analysis.yongsinMatch.yongsin).toContain("목");
      expect(result.analysis.yongsinMatch.kisin).toContain("금");
    });
  });

  describe("analyzeLifeCycle", () => {
    const daeunList = [
      { stem: "甲", branch: "寅", startAge: 5 },
      { stem: "乙", branch: "卯", startAge: 15 },
      { stem: "丙", branch: "辰", startAge: 25 },
      { stem: "丁", branch: "巳", startAge: 35 },
      { stem: "戊", branch: "午", startAge: 45 },
    ];

    it("returns LifeCycleAnalysis structure", () => {
      const result = analyzeLifeCycle(
        testPillars,
        daeunList,
        30,
        [],
        [],
        1990
      );

      expect(result).toHaveProperty("currentDaeun");
      expect(result).toHaveProperty("currentSeun");
      expect(result).toHaveProperty("daeunHistory");
      expect(result).toHaveProperty("futureDaeun");
      expect(result).toHaveProperty("lifePeaks");
      expect(result).toHaveProperty("lifeChallenges");
      expect(result).toHaveProperty("overallLifePattern");
    });

    it("identifies current daeun based on age", () => {
      const result = analyzeLifeCycle(testPillars, daeunList, 30, [], [], 1990);

      // 30세면 25-34세 대운(丙辰) 해당
      expect(result.currentDaeun.startAge).toBeLessThanOrEqual(30);
      expect(result.currentDaeun.endAge).toBeGreaterThanOrEqual(30);
    });

    it("separates daeun history and future", () => {
      const result = analyzeLifeCycle(testPillars, daeunList, 30, [], [], 1990);

      // 30세 기준으로 과거/미래 분리
      for (const history of result.daeunHistory) {
        expect(history.endAge).toBeLessThan(30);
      }
      for (const future of result.futureDaeun) {
        expect(future.startAge).toBeGreaterThan(30);
      }
    });

    it("calculates current seun", () => {
      const result = analyzeLifeCycle(testPillars, daeunList, 30, [], [], 1990);

      expect(result.currentSeun).toBeDefined();
      expect(result.currentSeun.unseInfo.type).toBe("세운");
    });

    it("identifies life peaks (good periods)", () => {
      const result = analyzeLifeCycle(testPillars, daeunList, 30, [], [], 1990);

      expect(Array.isArray(result.lifePeaks)).toBe(true);
      for (const peak of result.lifePeaks) {
        expect(peak).toHaveProperty("age");
        expect(peak).toHaveProperty("reason");
      }
    });

    it("identifies life challenges (difficult periods)", () => {
      const result = analyzeLifeCycle(testPillars, daeunList, 30, [], [], 1990);

      expect(Array.isArray(result.lifeChallenges)).toBe(true);
      for (const challenge of result.lifeChallenges) {
        expect(challenge).toHaveProperty("age");
        expect(challenge).toHaveProperty("reason");
      }
    });

    it("provides overall life pattern description", () => {
      const result = analyzeLifeCycle(testPillars, daeunList, 30, [], [], 1990);

      expect(result.overallLifePattern).toBeDefined();
      expect(result.overallLifePattern.length).toBeGreaterThan(0);
    });
  });

  describe("analyzeSpecificYear", () => {
    const daeunList = [
      { stem: "甲", branch: "寅", startAge: 5 },
      { stem: "乙", branch: "卯", startAge: 15 },
      { stem: "丙", branch: "辰", startAge: 25 },
    ];

    it("returns YearDetailAnalysis structure", () => {
      const result = analyzeSpecificYear(
        2024,
        testPillars,
        1990,
        daeunList,
        [],
        []
      );

      expect(result).toHaveProperty("year");
      expect(result).toHaveProperty("age");
      expect(result).toHaveProperty("seun");
      expect(result).toHaveProperty("daeun");
      expect(result).toHaveProperty("combinedScore");
      expect(result).toHaveProperty("combinedGrade");
      expect(result).toHaveProperty("monthlyForecast");
      expect(result).toHaveProperty("yearSummary");
      expect(result).toHaveProperty("bestMonths");
      expect(result).toHaveProperty("challengingMonths");
    });

    it("calculates age correctly", () => {
      const result = analyzeSpecificYear(
        2024,
        testPillars,
        1990,
        daeunList,
        [],
        []
      );

      expect(result.age).toBe(34); // 2024 - 1990
    });

    it("provides seun analysis for the year", () => {
      const result = analyzeSpecificYear(
        2024,
        testPillars,
        1990,
        daeunList,
        [],
        []
      );

      expect(result.seun).toBeDefined();
      expect(result.seun.unseInfo.type).toBe("세운");
      expect(result.seun.unseInfo.year).toBe(2024);
    });

    it("finds matching daeun for the year", () => {
      const result = analyzeSpecificYear(
        2020,
        testPillars,
        1990,
        daeunList,
        [],
        []
      );

      // 30세 (2020-1990)는 25-34세 대운(丙辰)에 해당
      expect(result.daeun).toBeDefined();
      expect(result.daeun?.stem).toBe("丙");
      expect(result.daeun?.branch).toBe("辰");
    });

    it("combinedScore is between 0 and 100", () => {
      const result = analyzeSpecificYear(
        2024,
        testPillars,
        1990,
        daeunList,
        [],
        []
      );

      expect(result.combinedScore).toBeGreaterThanOrEqual(0);
      expect(result.combinedScore).toBeLessThanOrEqual(100);
    });

    it("combinedGrade matches score", () => {
      const result = analyzeSpecificYear(
        2024,
        testPillars,
        1990,
        daeunList,
        [],
        []
      );

      expect(["S", "A", "B", "C", "D", "F"]).toContain(result.combinedGrade);

      // 등급이 점수와 일치하는지 확인
      const { combinedScore, combinedGrade } = result;
      if (combinedScore >= 90) expect(combinedGrade).toBe("S");
      else if (combinedScore >= 75) expect(combinedGrade).toBe("A");
      else if (combinedScore >= 60) expect(combinedGrade).toBe("B");
      else if (combinedScore >= 45) expect(combinedGrade).toBe("C");
      else if (combinedScore >= 30) expect(combinedGrade).toBe("D");
      else expect(combinedGrade).toBe("F");
    });

    it("provides monthly forecast for all 12 months", () => {
      const result = analyzeSpecificYear(
        2024,
        testPillars,
        1990,
        daeunList,
        [],
        []
      );

      expect(result.monthlyForecast).toHaveLength(12);
      for (const month of result.monthlyForecast) {
        expect(month.month).toBeGreaterThanOrEqual(1);
        expect(month.month).toBeLessThanOrEqual(12);
        expect(month).toHaveProperty("score");
        expect(month).toHaveProperty("theme");
      }
    });

    it("identifies best and challenging months", () => {
      const result = analyzeSpecificYear(
        2024,
        testPillars,
        1990,
        daeunList,
        [],
        []
      );

      expect(Array.isArray(result.bestMonths)).toBe(true);
      expect(Array.isArray(result.challengingMonths)).toBe(true);
    });

    it("generates year summary string", () => {
      const result = analyzeSpecificYear(
        2024,
        testPillars,
        1990,
        daeunList,
        [],
        []
      );

      expect(result.yearSummary).toContain("2024");
      expect(result.yearSummary).toContain("등급");
    });
  });

  describe("analyzeMultiYearTrend", () => {
    const daeunList = [
      { stem: "甲", branch: "寅", startAge: 5 },
      { stem: "乙", branch: "卯", startAge: 15 },
      { stem: "丙", branch: "辰", startAge: 25 },
      { stem: "丁", branch: "巳", startAge: 35 },
    ];

    it("returns MultiYearTrend structure", () => {
      const result = analyzeMultiYearTrend(
        2020,
        2025,
        testPillars,
        1990,
        daeunList,
        [],
        []
      );

      expect(result).toHaveProperty("years");
      expect(result).toHaveProperty("overallTrend");
      expect(result).toHaveProperty("bestYear");
      expect(result).toHaveProperty("worstYear");
      expect(result).toHaveProperty("averageScore");
      expect(result).toHaveProperty("trendDescription");
    });

    it("analyzes all years in range", () => {
      const result = analyzeMultiYearTrend(
        2020,
        2025,
        testPillars,
        1990,
        daeunList,
        [],
        []
      );

      expect(result.years).toHaveLength(6); // 2020-2025 inclusive
      expect(result.years[0].year).toBe(2020);
      expect(result.years[5].year).toBe(2025);
    });

    it("identifies best and worst years", () => {
      const result = analyzeMultiYearTrend(
        2020,
        2025,
        testPillars,
        1990,
        daeunList,
        [],
        []
      );

      expect(result.bestYear.year).toBeGreaterThanOrEqual(2020);
      expect(result.bestYear.year).toBeLessThanOrEqual(2025);
      expect(result.worstYear.year).toBeGreaterThanOrEqual(2020);
      expect(result.worstYear.year).toBeLessThanOrEqual(2025);
      expect(result.bestYear.score).toBeGreaterThanOrEqual(result.worstYear.score);
    });

    it("calculates average score correctly", () => {
      const result = analyzeMultiYearTrend(
        2020,
        2022,
        testPillars,
        1990,
        daeunList,
        [],
        []
      );

      const manualAvg =
        result.years.reduce((sum, y) => sum + y.combinedScore, 0) /
        result.years.length;
      expect(result.averageScore).toBeCloseTo(manualAvg, 1);
    });

    it("determines overall trend", () => {
      const result = analyzeMultiYearTrend(
        2020,
        2030,
        testPillars,
        1990,
        daeunList,
        [],
        []
      );

      expect(["ascending", "descending", "stable", "fluctuating"]).toContain(
        result.overallTrend
      );
    });

    it("provides trend description", () => {
      const result = analyzeMultiYearTrend(
        2020,
        2025,
        testPillars,
        1990,
        daeunList,
        [],
        []
      );

      expect(result.trendDescription).toBeDefined();
      expect(result.trendDescription.length).toBeGreaterThan(0);
    });
  });

  describe("type definitions", () => {
    it("UnseType includes all types", () => {
      const types: UnseType[] = ["대운", "세운", "월운", "일운"];
      expect(types).toHaveLength(4);
    });

    it("UnseInfo has required fields", () => {
      const info: UnseInfo = {
        type: "대운",
        stem: "甲",
        branch: "寅",
        startAge: 5,
        endAge: 14,
      };

      expect(info.type).toBeDefined();
      expect(info.stem).toBeDefined();
      expect(info.branch).toBeDefined();
    });

    it("UnseInfo optional fields work", () => {
      const daeunInfo: UnseInfo = {
        type: "대운",
        stem: "甲",
        branch: "寅",
        startAge: 5,
        endAge: 14,
      };

      const seunInfo: UnseInfo = {
        type: "세운",
        stem: "甲",
        branch: "辰",
        year: 2024,
      };

      expect(daeunInfo.startAge).toBeDefined();
      expect(seunInfo.year).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("handles empty yongsin and kisin arrays", () => {
      const unseInfo: UnseInfo = {
        type: "대운",
        stem: "甲",
        branch: "寅",
      };

      const result = analyzeUnseComprehensive(unseInfo, testPillars, [], []);

      expect(result).toBeDefined();
      expect(result.yongsinMatch.match).toBe("neutral");
    });

    it("handles all 10 stems", () => {
      const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

      for (const stem of stems) {
        const unseInfo: UnseInfo = {
          type: "대운",
          stem,
          branch: "寅",
        };

        const result = analyzeUnseComprehensive(unseInfo, testPillars);
        expect(result).toBeDefined();
        expect(result.overallScore).toBeGreaterThanOrEqual(0);
      }
    });

    it("handles all 12 branches", () => {
      const branches = [
        "子",
        "丑",
        "寅",
        "卯",
        "辰",
        "巳",
        "午",
        "未",
        "申",
        "酉",
        "戌",
        "亥",
      ];

      for (const branch of branches) {
        const unseInfo: UnseInfo = {
          type: "대운",
          stem: "甲",
          branch,
        };

        const result = analyzeUnseComprehensive(unseInfo, testPillars);
        expect(result).toBeDefined();
      }
    });

    it("handles single year trend analysis", () => {
      const daeunList = [{ stem: "甲", branch: "寅", startAge: 5 }];

      const result = analyzeMultiYearTrend(
        2024,
        2024,
        testPillars,
        1990,
        daeunList,
        [],
        []
      );

      expect(result.years).toHaveLength(1);
      expect(result.bestYear.year).toBe(2024);
      expect(result.worstYear.year).toBe(2024);
    });

    it("handles daeunList with no matching period", () => {
      const daeunList = [{ stem: "甲", branch: "寅", startAge: 100 }]; // 미래 대운만

      const result = analyzeSpecificYear(
        2024,
        testPillars,
        1990,
        daeunList,
        [],
        []
      );

      expect(result.daeun).toBeNull();
    });
  });

  describe("sibsin calculations", () => {
    it("calculates sibsin correctly based on day stem", () => {
      // 戊일간, 甲 대운 -> 편관
      const pillars = createPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "辰"], // 戊 일간
        ["庚", "午"]
      );

      const unseInfo: UnseInfo = {
        type: "대운",
        stem: "甲", // 甲은 戊 기준 편관
        branch: "寅",
      };

      const result = analyzeUnseComprehensive(unseInfo, pillars);

      expect(result.sibsinRelations[0].sibsin).toBe("편관");
    });

    it("calculates sibsin for 비견 (same element, same polarity)", () => {
      const pillars = createPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["甲", "辰"], // 甲 일간
        ["庚", "午"]
      );

      const unseInfo: UnseInfo = {
        type: "대운",
        stem: "甲", // 甲은 甲 기준 비견
        branch: "寅",
      };

      const result = analyzeUnseComprehensive(unseInfo, pillars);

      expect(result.sibsinRelations[0].sibsin).toBe("비견");
    });
  });

  describe("twelve stages", () => {
    it("returns valid twelve stage names", () => {
      const validStages = [
        "장생",
        "목욕",
        "관대",
        "건록",
        "제왕",
        "쇠",
        "병",
        "사",
        "묘",
        "절",
        "태",
        "양",
      ];

      const unseInfo: UnseInfo = {
        type: "대운",
        stem: "甲",
        branch: "寅",
      };

      const result = analyzeUnseComprehensive(unseInfo, testPillars);

      expect(validStages).toContain(result.twelveStage.stage);
    });

    it("returns appropriate energy based on stage", () => {
      const pillars = createPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["甲", "辰"],
        ["庚", "午"]
      );

      const unseInfo: UnseInfo = {
        type: "대운",
        stem: "甲",
        branch: "亥",
      };

      const result = analyzeUnseComprehensive(unseInfo, pillars);

      // 12운성이 반환되고 에너지 상태가 유효한지 확인
      expect(result.twelveStage.stage).toBeDefined();
      expect(["rising", "peak", "declining", "dormant"]).toContain(
        result.twelveStage.energy
      );
    });
  });
});
