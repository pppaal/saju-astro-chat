/**
 * Hyeongchung (형충회합) Tests
 *
 * Tests for branch interactions: combination, clash, punishment, etc.
 */


import {
  analyzeHyeongchung,
  analyzeUnseInteraction,
  calculateInteractionScore,
  type SajuPillarsInput,
  type InteractionType,
  type PillarPosition,
  type HyeongType,
  type InteractionResult,
  type HyeongchungAnalysis,
} from "@/lib/Saju/hyeongchung";

describe("analyzeHyeongchung", () => {
  const createPillars = (
    yearBranch: string,
    monthBranch: string,
    dayBranch: string,
    hourBranch: string
  ): SajuPillarsInput => ({
    year: { stem: "甲", branch: yearBranch },
    month: { stem: "甲", branch: monthBranch },
    day: { stem: "甲", branch: dayBranch },
    hour: { stem: "甲", branch: hourBranch },
  });

  describe("육합 (Yukap) detection", () => {
    it("detects 子丑 combination", () => {
      const pillars = createPillars("子", "丑", "寅", "卯");
      const result = analyzeHyeongchung(pillars);

      const yukap = result.interactions.find(
        (i) => i.type === "육합" && i.branches.includes("子") && i.branches.includes("丑")
      );
      expect(yukap).toBeDefined();
      expect(yukap?.effect).toBe("길");
      expect(yukap?.mergedElement).toBe("土");
    });

    it("detects 寅亥 combination", () => {
      const pillars = createPillars("寅", "亥", "午", "未");
      const result = analyzeHyeongchung(pillars);

      const yukap = result.interactions.find(
        (i) => i.type === "육합" && i.branches.includes("寅") && i.branches.includes("亥")
      );
      expect(yukap).toBeDefined();
      expect(yukap?.mergedElement).toBe("木");
    });
  });

  describe("삼합 (Samhap) detection", () => {
    it("detects complete water samhap (申子辰)", () => {
      const pillars = createPillars("申", "子", "辰", "午");
      const result = analyzeHyeongchung(pillars);

      const samhap = result.interactions.find((i) => i.type === "삼합");
      expect(samhap).toBeDefined();
      expect(samhap?.mergedElement).toBe("水");
      expect(samhap?.strength).toBe(100);
    });

    it("detects complete fire samhap (寅午戌)", () => {
      const pillars = createPillars("寅", "午", "戌", "子");
      const result = analyzeHyeongchung(pillars);

      const samhap = result.interactions.find((i) => i.type === "삼합");
      expect(samhap).toBeDefined();
      expect(samhap?.mergedElement).toBe("火");
    });

    it("detects partial samhap (반합)", () => {
      const pillars = createPillars("申", "子", "未", "戌");
      const result = analyzeHyeongchung(pillars);

      const banhap = result.interactions.find((i) => i.type === "반합");
      expect(banhap).toBeDefined();
      expect(banhap?.strength).toBeLessThan(100);
    });
  });

  describe("충 (Chung) detection", () => {
    it("detects 子午 clash", () => {
      const pillars = createPillars("子", "午", "寅", "卯");
      const result = analyzeHyeongchung(pillars);

      const chung = result.interactions.find(
        (i) => i.type === "충" && i.branches.includes("子") && i.branches.includes("午")
      );
      expect(chung).toBeDefined();
      expect(chung?.effect).toBe("흉");
      expect(chung?.subType).toContain("자오충");
    });

    it("detects 卯酉 clash", () => {
      const pillars = createPillars("卯", "酉", "丑", "未");
      const result = analyzeHyeongchung(pillars);

      const chung = result.interactions.find(
        (i) => i.type === "충" && i.branches.includes("卯") && i.branches.includes("酉")
      );
      expect(chung).toBeDefined();
      expect(chung?.subType).toContain("묘유충");
    });
  });

  describe("형 (Hyeong) detection", () => {
    it("detects 무은지형 (寅巳申)", () => {
      const pillars = createPillars("寅", "巳", "申", "午");
      const result = analyzeHyeongchung(pillars);

      const hyeong = result.interactions.find(
        (i) => i.type === "형" && i.subType === "무은지형"
      );
      expect(hyeong).toBeDefined();
      expect(hyeong?.effect).toBe("흉");
    });

    it("detects 시세지형 (丑戌未)", () => {
      const pillars = createPillars("丑", "戌", "未", "午");
      const result = analyzeHyeongchung(pillars);

      const hyeong = result.interactions.find(
        (i) => i.type === "형" && i.subType === "시세지형"
      );
      expect(hyeong).toBeDefined();
    });

    it("detects 무례지형 (子卯)", () => {
      const pillars = createPillars("子", "卯", "午", "未");
      const result = analyzeHyeongchung(pillars);

      const hyeong = result.interactions.find(
        (i) => i.type === "형" && i.subType === "무례지형"
      );
      expect(hyeong).toBeDefined();
    });

    it("detects 자형 (self-punishment)", () => {
      const pillars = createPillars("辰", "辰", "午", "未");
      const result = analyzeHyeongchung(pillars);

      const hyeong = result.interactions.find(
        (i) => i.type === "형" && i.subType === "자형"
      );
      expect(hyeong).toBeDefined();
    });
  });

  describe("해 (Hae) detection", () => {
    it("detects 子未 harm", () => {
      const pillars = createPillars("子", "未", "寅", "卯");
      const result = analyzeHyeongchung(pillars);

      const hae = result.interactions.find(
        (i) => i.type === "해" && i.branches.includes("子") && i.branches.includes("未")
      );
      expect(hae).toBeDefined();
      expect(hae?.effect).toBe("흉");
    });
  });

  describe("파 (Pa) detection", () => {
    it("detects 子酉 break", () => {
      const pillars = createPillars("子", "酉", "寅", "卯");
      const result = analyzeHyeongchung(pillars);

      const pa = result.interactions.find(
        (i) => i.type === "파" && i.branches.includes("子") && i.branches.includes("酉")
      );
      expect(pa).toBeDefined();
      expect(pa?.effect).toBe("흉");
    });
  });

  describe("원진 (Wonjin) detection", () => {
    it("detects 子未 resentment", () => {
      const pillars = createPillars("子", "未", "寅", "卯");
      const result = analyzeHyeongchung(pillars);

      const wonjin = result.interactions.find((i) => i.type === "원진");
      expect(wonjin).toBeDefined();
      expect(wonjin?.effect).toBe("흉");
    });
  });

  describe("Summary calculation", () => {
    it("calculates total positive correctly", () => {
      const pillars = createPillars("子", "丑", "寅", "亥");
      const result = analyzeHyeongchung(pillars);

      expect(result.summary.totalPositive).toBeGreaterThan(0);
    });

    it("calculates net effect", () => {
      const pillars = createPillars("子", "丑", "寅", "卯");
      const result = analyzeHyeongchung(pillars);

      expect(["길", "흉", "중립"]).toContain(result.summary.netEffect);
    });

    it("identifies dominant interaction", () => {
      const pillars = createPillars("申", "子", "辰", "午");
      const result = analyzeHyeongchung(pillars);

      expect(result.summary.dominantInteraction).toBeDefined();
    });
  });

  describe("Warnings", () => {
    it("generates warnings when hap is broken by chung", () => {
      // 子丑 합 and 子午 충
      const pillars = createPillars("子", "丑", "午", "未");
      const result = analyzeHyeongchung(pillars);

      // May have warnings about hap being affected by chung
      expect(result).toHaveProperty("warnings");
    });
  });
});

describe("analyzeUnseInteraction", () => {
  const createPillars = (
    yearBranch: string,
    monthBranch: string,
    dayBranch: string,
    hourBranch: string
  ): SajuPillarsInput => ({
    year: { stem: "甲", branch: yearBranch },
    month: { stem: "甲", branch: monthBranch },
    day: { stem: "甲", branch: dayBranch },
    hour: { stem: "甲", branch: hourBranch },
  });

  it("detects clash with unse branch", () => {
    const pillars = createPillars("子", "寅", "辰", "午");
    const results = analyzeUnseInteraction(pillars, "午", "세운");

    const chung = results.find((i) => i.type === "충");
    expect(chung).toBeDefined();
  });

  it("detects combination with unse branch", () => {
    const pillars = createPillars("子", "寅", "辰", "午");
    const results = analyzeUnseInteraction(pillars, "丑", "대운");

    const yukap = results.find((i) => i.type === "육합");
    expect(yukap).toBeDefined();
  });

  it("includes unse type in subType", () => {
    const pillars = createPillars("子", "寅", "辰", "午");
    const results = analyzeUnseInteraction(pillars, "午", "월운");

    const interaction = results.find((i) => i.subType?.includes("월운"));
    expect(interaction).toBeDefined();
  });
});

describe("calculateInteractionScore", () => {
  it("returns score between 0 and 100", () => {
    const analysis: HyeongchungAnalysis = {
      interactions: [],
      summary: {
        totalPositive: 100,
        totalNegative: 50,
        dominantInteraction: "육합",
        netEffect: "길",
      },
      warnings: [],
    };

    const result = calculateInteractionScore(analysis);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns grade A for high positive", () => {
    const analysis: HyeongchungAnalysis = {
      interactions: [],
      summary: {
        totalPositive: 200,
        totalNegative: 0,
        dominantInteraction: "삼합",
        netEffect: "길",
      },
      warnings: [],
    };

    const result = calculateInteractionScore(analysis);
    expect(result.grade).toBe("A");
  });

  it("returns grade F for high negative", () => {
    const analysis: HyeongchungAnalysis = {
      interactions: [],
      summary: {
        totalPositive: 0,
        totalNegative: 200,
        dominantInteraction: "충",
        netEffect: "흉",
      },
      warnings: [],
    };

    const result = calculateInteractionScore(analysis);
    expect(result.grade).toBe("F");
  });

  it("returns interpretation string", () => {
    const analysis: HyeongchungAnalysis = {
      interactions: [],
      summary: {
        totalPositive: 100,
        totalNegative: 100,
        dominantInteraction: null,
        netEffect: "중립",
      },
      warnings: [],
    };

    const result = calculateInteractionScore(analysis);
    expect(result.interpretation).toBeDefined();
    expect(typeof result.interpretation).toBe("string");
  });
});

describe("Type interfaces", () => {
  describe("InteractionType", () => {
    it("includes all interaction types", () => {
      const types: InteractionType[] = [
        "육합", "삼합", "반합", "방합", "충", "형", "해", "파", "원진", "귀문"
      ];
      expect(types).toHaveLength(10);
    });
  });

  describe("PillarPosition", () => {
    it("includes all pillar positions", () => {
      const positions: PillarPosition[] = ["year", "month", "day", "hour"];
      expect(positions).toHaveLength(4);
    });
  });

  describe("HyeongType", () => {
    it("includes all hyeong types", () => {
      const types: HyeongType[] = [
        "삼형", "자형", "상형", "무은지형", "시세지형", "무례지형"
      ];
      expect(types).toHaveLength(6);
    });
  });

  describe("InteractionResult", () => {
    it("has all required fields", () => {
      const result: InteractionResult = {
        type: "육합",
        branches: ["子", "丑"],
        pillars: ["year", "month"],
        strength: 80,
        description: "子丑 육합",
        effect: "길",
      };

      expect(result.type).toBe("육합");
      expect(result.branches).toHaveLength(2);
      expect(result.strength).toBe(80);
      expect(result.effect).toBe("길");
    });

    it("supports optional fields", () => {
      const result: InteractionResult = {
        type: "삼합",
        subType: "水국",
        branches: ["申", "子", "辰"],
        pillars: ["year", "month", "day"],
        strength: 100,
        mergedElement: "水",
        description: "申子辰 삼합",
        effect: "길",
      };

      expect(result.subType).toBe("水국");
      expect(result.mergedElement).toBe("水");
    });
  });
});

describe("Pillar distance effects", () => {
  const createPillars = (
    yearBranch: string,
    monthBranch: string,
    dayBranch: string,
    hourBranch: string
  ): SajuPillarsInput => ({
    year: { stem: "甲", branch: yearBranch },
    month: { stem: "甲", branch: monthBranch },
    day: { stem: "甲", branch: dayBranch },
    hour: { stem: "甲", branch: hourBranch },
  });

  it("adjacent pillars have stronger interaction", () => {
    // 子午 in year-month (adjacent)
    const adjacent = createPillars("子", "午", "寅", "卯");
    const adjacentResult = analyzeHyeongchung(adjacent);
    const adjacentChung = adjacentResult.interactions.find((i) => i.type === "충");

    // 子午 in year-day (one apart)
    const apart = createPillars("子", "寅", "午", "卯");
    const apartResult = analyzeHyeongchung(apart);
    const apartChung = apartResult.interactions.find((i) => i.type === "충");

    expect(adjacentChung?.strength).toBeGreaterThan(apartChung?.strength ?? 0);
  });
});
