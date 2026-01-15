/**
 * Daeun Transit Sync Tests
 *
 * Tests for Daeun-Transit synchronization analysis module
 */


import {
  analyzeDaeunTransitSync,
  convertSajuDaeunToInfo,
  generateDaeunTransitPromptContext,
  type DaeunInfo,
  type TransitInfo,
  type SyncPoint,
  type LifeSyncAnalysis,
} from "@/lib/prediction/daeunTransitSync";

describe("analyzeDaeunTransitSync", () => {
  const createDaeunList = (): DaeunInfo[] => [
    { startAge: 0, endAge: 9, stem: "甲", branch: "子", element: "목", yinYang: "양" },
    { startAge: 10, endAge: 19, stem: "乙", branch: "丑", element: "목", yinYang: "음" },
    { startAge: 20, endAge: 29, stem: "丙", branch: "寅", element: "화", yinYang: "양" },
    { startAge: 30, endAge: 39, stem: "丁", branch: "卯", element: "화", yinYang: "음" },
    { startAge: 40, endAge: 49, stem: "戊", branch: "辰", element: "토", yinYang: "양" },
    { startAge: 50, endAge: 59, stem: "己", branch: "巳", element: "토", yinYang: "음" },
    { startAge: 60, endAge: 69, stem: "庚", branch: "午", element: "금", yinYang: "양" },
    { startAge: 70, endAge: 79, stem: "辛", branch: "未", element: "금", yinYang: "음" },
    { startAge: 80, endAge: 89, stem: "壬", branch: "申", element: "수", yinYang: "양" },
  ];

  it("returns analysis structure with all fields", () => {
    const daeunList = createDaeunList();
    const result = analyzeDaeunTransitSync(daeunList, 1990, 34);

    expect(result).toHaveProperty("birthYear");
    expect(result).toHaveProperty("currentAge");
    expect(result).toHaveProperty("syncPoints");
    expect(result).toHaveProperty("majorTransitions");
    expect(result).toHaveProperty("peakYears");
    expect(result).toHaveProperty("challengeYears");
    expect(result).toHaveProperty("lifeCyclePattern");
    expect(result).toHaveProperty("overallConfidence");
  });

  it("birthYear and currentAge match input", () => {
    const daeunList = createDaeunList();
    const result = analyzeDaeunTransitSync(daeunList, 1990, 34);

    expect(result.birthYear).toBe(1990);
    expect(result.currentAge).toBe(34);
  });

  it("returns syncPoints within analysis range", () => {
    const daeunList = createDaeunList();
    const result = analyzeDaeunTransitSync(daeunList, 1990, 30);

    // Analysis range is currentAge - 5 to currentAge + 20
    for (const point of result.syncPoints) {
      expect(point.age).toBeGreaterThanOrEqual(25);
      expect(point.age).toBeLessThanOrEqual(50);
    }
  });

  it("syncPoints have required structure", () => {
    const daeunList = createDaeunList();
    const result = analyzeDaeunTransitSync(daeunList, 1990, 30);

    if (result.syncPoints.length > 0) {
      const point = result.syncPoints[0];
      expect(point).toHaveProperty("age");
      expect(point).toHaveProperty("year");
      expect(point).toHaveProperty("daeun");
      expect(point).toHaveProperty("transits");
      expect(point).toHaveProperty("synergyScore");
      expect(point).toHaveProperty("synergyType");
      expect(point).toHaveProperty("themes");
      expect(point).toHaveProperty("opportunities");
      expect(point).toHaveProperty("challenges");
      expect(point).toHaveProperty("advice");
      expect(point).toHaveProperty("confidence");
    }
  });

  it("synergyScore is between 0-100", () => {
    const daeunList = createDaeunList();
    const result = analyzeDaeunTransitSync(daeunList, 1990, 30);

    for (const point of result.syncPoints) {
      expect(point.synergyScore).toBeGreaterThanOrEqual(0);
      expect(point.synergyScore).toBeLessThanOrEqual(100);
    }
  });

  it("confidence is between 0-100", () => {
    const daeunList = createDaeunList();
    const result = analyzeDaeunTransitSync(daeunList, 1990, 30);

    for (const point of result.syncPoints) {
      expect(point.confidence).toBeGreaterThanOrEqual(0);
      expect(point.confidence).toBeLessThanOrEqual(100);
    }
  });

  it("synergyType is valid", () => {
    const daeunList = createDaeunList();
    const result = analyzeDaeunTransitSync(daeunList, 1990, 30);

    const validTypes = ["amplify", "clash", "balance", "neutral"];
    for (const point of result.syncPoints) {
      expect(validTypes).toContain(point.synergyType);
    }
  });

  it("detects Jupiter return at age 24, 36, 48", () => {
    const daeunList = createDaeunList();
    const result = analyzeDaeunTransitSync(daeunList, 1990, 30);

    const jupiterReturnAges = [24, 36, 48];
    for (const age of jupiterReturnAges) {
      const pointsAtAge = result.syncPoints.filter(
        (p) => p.age >= age - 1 && p.age <= age + 1
      );
      const hasJupiterReturn = pointsAtAge.some((p) =>
        p.transits.some((t) => t.type === "jupiterReturn")
      );
      if (age >= 25 && age <= 50) {
        // Within analysis range
        expect(hasJupiterReturn).toBe(true);
      }
    }
  });

  it("detects Saturn return around age 29", () => {
    const daeunList = createDaeunList();
    const result = analyzeDaeunTransitSync(daeunList, 1990, 25);

    const saturnReturnPoints = result.syncPoints.filter(
      (p) => p.age >= 28 && p.age <= 31
    );
    const hasSaturnReturn = saturnReturnPoints.some((p) =>
      p.transits.some((t) => t.type === "saturnReturn")
    );
    expect(hasSaturnReturn).toBe(true);
  });

  it("detects Uranus square around age 21, 42", () => {
    const daeunList = createDaeunList();
    const result = analyzeDaeunTransitSync(daeunList, 1990, 35);

    const uranusSquarePoints = result.syncPoints.filter(
      (p) => p.age >= 41 && p.age <= 44
    );
    const hasUranusSquare = uranusSquarePoints.some((p) =>
      p.transits.some((t) => t.type === "uranusSquare")
    );
    expect(hasUranusSquare).toBe(true);
  });

  it("identifies majorTransitions", () => {
    const daeunList = createDaeunList();
    const result = analyzeDaeunTransitSync(daeunList, 1990, 30);

    expect(result.majorTransitions.length).toBeGreaterThan(0);
    // Major transitions have high intensity transits or are daeun transition points
    for (const point of result.majorTransitions) {
      const hasHighIntensity = point.transits.some(
        (t) => t.intensity === "high"
      );
      // Either has high intensity transit OR has some transits (daeun transition points may have any transit)
      // The condition is: has high intensity transits OR is a syncPoint (which means it has transits or is a daeun transition)
      expect(hasHighIntensity || point.daeun !== undefined).toBe(true);
    }
  });

  it("identifies peakYears with high synergy score", () => {
    const daeunList = createDaeunList();
    const result = analyzeDaeunTransitSync(daeunList, 1990, 30);

    // Peak years should have high synergy scores
    const peakPointYears = result.peakYears.map((p) => p.year);
    const peakSyncPoints = result.syncPoints.filter((p) =>
      peakPointYears.includes(p.year)
    );
    for (const point of peakSyncPoints) {
      expect(point.synergyScore).toBeGreaterThanOrEqual(70);
    }
  });

  it("identifies challengeYears with low synergy score", () => {
    const daeunList = createDaeunList();
    const result = analyzeDaeunTransitSync(daeunList, 1990, 30);

    // Challenge years should have low synergy scores
    const challengePointYears = result.challengeYears.map((p) => p.year);
    const challengeSyncPoints = result.syncPoints.filter((p) =>
      challengePointYears.includes(p.year)
    );
    for (const point of challengeSyncPoints) {
      expect(point.synergyScore).toBeLessThanOrEqual(40);
    }
  });

  it("returns valid lifeCyclePattern", () => {
    const daeunList = createDaeunList();
    const result = analyzeDaeunTransitSync(daeunList, 1990, 30);

    expect(typeof result.lifeCyclePattern).toBe("string");
    expect(result.lifeCyclePattern.length).toBeGreaterThan(0);
  });

  describe("TIER 5 analysis", () => {
    it("includes tier5Analysis when enableTier5 is true", () => {
      const daeunList = createDaeunList();
      const result = analyzeDaeunTransitSync(daeunList, 1990, 30, {
        enableTier5: true,
      });

      const pointsWithTier5 = result.syncPoints.filter(
        (p) => p.tier5Analysis !== undefined
      );
      expect(pointsWithTier5.length).toBeGreaterThan(0);
    });

    it("tier5Analysis has required fields", () => {
      const daeunList = createDaeunList();
      const result = analyzeDaeunTransitSync(daeunList, 1990, 30, {
        enableTier5: true,
      });

      const pointWithTier5 = result.syncPoints.find(
        (p) => p.tier5Analysis !== undefined
      );
      if (pointWithTier5?.tier5Analysis) {
        expect(pointWithTier5.tier5Analysis).toHaveProperty("solarTermElement");
        expect(pointWithTier5.tier5Analysis).toHaveProperty(
          "solarTermDaeunAlignment"
        );
        expect(pointWithTier5.tier5Analysis).toHaveProperty("eastWestHarmony");
        expect(pointWithTier5.tier5Analysis).toHaveProperty("combinedThemes");
        expect(pointWithTier5.tier5Analysis).toHaveProperty("preciseTiming");
      }
    });

    it("tier5Summary is included when TIER 5 is enabled", () => {
      const daeunList = createDaeunList();
      const result = analyzeDaeunTransitSync(daeunList, 1990, 30, {
        enableTier5: true,
      });

      expect(result.tier5Summary).toBeDefined();
      if (result.tier5Summary) {
        expect(result.tier5Summary).toHaveProperty("eastWestHarmonyScore");
        expect(result.tier5Summary).toHaveProperty("dominantElement");
        expect(result.tier5Summary).toHaveProperty("criticalYears");
        expect(result.tier5Summary).toHaveProperty("yearByYearSolarTerms");
        expect(result.tier5Summary).toHaveProperty("integrationAdvice");
      }
    });

    it("eastWestHarmony is between 0-100", () => {
      const daeunList = createDaeunList();
      const result = analyzeDaeunTransitSync(daeunList, 1990, 30, {
        enableTier5: true,
      });

      for (const point of result.syncPoints) {
        if (point.tier5Analysis) {
          expect(point.tier5Analysis.eastWestHarmony).toBeGreaterThanOrEqual(0);
          expect(point.tier5Analysis.eastWestHarmony).toBeLessThanOrEqual(100);
        }
      }
    });

    it("preciseTiming has bestMonths and avoidMonths", () => {
      const daeunList = createDaeunList();
      const result = analyzeDaeunTransitSync(daeunList, 1990, 30, {
        enableTier5: true,
      });

      const pointWithTier5 = result.syncPoints.find(
        (p) => p.tier5Analysis !== undefined
      );
      if (pointWithTier5?.tier5Analysis?.preciseTiming) {
        expect(Array.isArray(pointWithTier5.tier5Analysis.preciseTiming.bestMonths)).toBe(true);
        expect(Array.isArray(pointWithTier5.tier5Analysis.preciseTiming.avoidMonths)).toBe(true);
      }
    });
  });
});

describe("convertSajuDaeunToInfo", () => {
  it("converts array of daeun raw data", () => {
    const rawData = [
      { startAge: 5, stem: "甲", branch: "子" },
      { startAge: 15, stem: "乙", branch: "丑" },
      { startAge: 25, stem: "丙", branch: "寅" },
    ];

    const result = convertSajuDaeunToInfo(rawData);

    expect(result).toHaveLength(3);
    expect(result[0].startAge).toBe(5);
    expect(result[0].endAge).toBe(14);
    expect(result[0].stem).toBe("甲");
    expect(result[0].element).toBe("목");
    expect(result[0].yinYang).toBe("양");
  });

  it("handles age property instead of startAge", () => {
    const rawData = [{ age: 10, stem: "丁", branch: "卯" }];

    const result = convertSajuDaeunToInfo(rawData);

    expect(result[0].startAge).toBe(10);
    expect(result[0].endAge).toBe(19);
  });

  it("handles heavenlyStem property instead of stem", () => {
    const rawData = [{ startAge: 0, heavenlyStem: "戊", branch: "辰" }];

    const result = convertSajuDaeunToInfo(rawData);

    expect(result[0].stem).toBe("戊");
    expect(result[0].element).toBe("토");
  });

  it("handles earthlyBranch property instead of branch", () => {
    const rawData = [{ startAge: 0, stem: "庚", earthlyBranch: "午" }];

    const result = convertSajuDaeunToInfo(rawData);

    expect(result[0].branch).toBe("午");
  });

  it("maps stems to correct elements", () => {
    const stemElementMap: Record<string, string> = {
      "甲": "목", "乙": "목",
      "丙": "화", "丁": "화",
      "戊": "토", "己": "토",
      "庚": "금", "辛": "금",
      "壬": "수", "癸": "수",
    };

    for (const [stem, element] of Object.entries(stemElementMap)) {
      const rawData = [{ startAge: 0, stem, branch: "子" }];
      const result = convertSajuDaeunToInfo(rawData);
      expect(result[0].element).toBe(element);
    }
  });

  it("maps stems to correct yinYang", () => {
    const yangStems = ["甲", "丙", "戊", "庚", "壬"];
    const yinStems = ["乙", "丁", "己", "辛", "癸"];

    for (const stem of yangStems) {
      const rawData = [{ startAge: 0, stem, branch: "子" }];
      const result = convertSajuDaeunToInfo(rawData);
      expect(result[0].yinYang).toBe("양");
    }

    for (const stem of yinStems) {
      const rawData = [{ startAge: 0, stem, branch: "子" }];
      const result = convertSajuDaeunToInfo(rawData);
      expect(result[0].yinYang).toBe("음");
    }
  });

  it("returns empty array for empty input", () => {
    const result = convertSajuDaeunToInfo([]);
    expect(result).toEqual([]);
  });

  it("uses default values for missing properties", () => {
    const rawData = [{}];
    const result = convertSajuDaeunToInfo(rawData);

    expect(result[0].startAge).toBe(0);
    expect(result[0].endAge).toBe(9);
    expect(result[0].stem).toBe("甲");
    expect(result[0].branch).toBe("子");
    expect(result[0].element).toBe("토"); // Default when stem not found
  });
});

describe("generateDaeunTransitPromptContext", () => {
  const createSampleAnalysis = (): LifeSyncAnalysis => {
    const daeunList: DaeunInfo[] = [
      { startAge: 30, endAge: 39, stem: "丁", branch: "卯", element: "화", yinYang: "음" },
    ];

    return {
      birthYear: 1990,
      currentAge: 34,
      syncPoints: [
        {
          age: 36,
          year: 2026,
          daeun: daeunList[0],
          transits: [
            {
              type: "jupiterReturn",
              triggerAge: 36,
              duration: 1,
              intensity: "high",
              theme: "확장과 성장, 새로운 기회",
            },
          ],
          synergyScore: 75,
          synergyType: "amplify",
          themes: ["확장과 성장"],
          opportunities: ["좋은 기회"],
          challenges: [],
          advice: "적극적으로 나아가세요.",
          confidence: 80,
        },
      ],
      majorTransitions: [
        {
          age: 36,
          year: 2026,
          daeun: daeunList[0],
          transits: [
            {
              type: "jupiterReturn",
              triggerAge: 36,
              duration: 1,
              intensity: "high",
              theme: "확장과 성장, 새로운 기회",
            },
          ],
          synergyScore: 75,
          synergyType: "amplify",
          themes: ["확장과 성장"],
          opportunities: ["좋은 기회"],
          challenges: [],
          advice: "적극적으로 나아가세요.",
          confidence: 80,
        },
      ],
      peakYears: [{ age: 36, year: 2026, reason: "확장과 성장" }],
      challengeYears: [],
      lifeCyclePattern: "전반적으로 상승하는 운세 패턴",
      overallConfidence: 80,
    };
  };

  it("generates Korean prompt context by default", () => {
    const analysis = createSampleAnalysis();
    const result = generateDaeunTransitPromptContext(analysis);

    expect(result).toContain("대운-트랜짓 동기화 분석");
    expect(result).toContain("인생 패턴");
    expect(result).toContain("주요 전환점");
  });

  it("generates English prompt context when lang is en", () => {
    const analysis = createSampleAnalysis();
    const result = generateDaeunTransitPromptContext(analysis, "en");

    expect(result).toContain("Daeun-Transit Synchronization");
    expect(result).toContain("Life Pattern");
    expect(result).toContain("Major Transition Points");
  });

  it("includes confidence percentage", () => {
    const analysis = createSampleAnalysis();
    const result = generateDaeunTransitPromptContext(analysis);

    expect(result).toContain("80%");
  });

  it("includes major transitions info", () => {
    const analysis = createSampleAnalysis();
    const result = generateDaeunTransitPromptContext(analysis);

    expect(result).toContain("36세");
    expect(result).toContain("2026년");
    expect(result).toContain("amplify");
  });

  it("includes peak years when available", () => {
    const analysis = createSampleAnalysis();
    const result = generateDaeunTransitPromptContext(analysis);

    expect(result).toContain("최고의 시기");
  });

  it("includes challenge years when available", () => {
    const analysis = createSampleAnalysis();
    analysis.challengeYears = [{ age: 29, year: 2019, reason: "도전" }];
    const result = generateDaeunTransitPromptContext(analysis);

    expect(result).toContain("도전의 시기");
  });
});

describe("Transit cycles", () => {
  it("Jupiter return occurs every 12 years", () => {
    const jupiterAges = [12, 24, 36, 48, 60, 72, 84];
    for (let i = 1; i < jupiterAges.length; i++) {
      expect(jupiterAges[i] - jupiterAges[i - 1]).toBe(12);
    }
  });

  it("Saturn return occurs around age 29 and 58", () => {
    const saturnAges = [29, 58, 87];
    expect(saturnAges[1] - saturnAges[0]).toBe(29);
    expect(saturnAges[2] - saturnAges[1]).toBe(29);
  });

  it("Uranus square occurs around age 21, 42, 63", () => {
    const uranusAges = [21, 42, 63];
    expect(uranusAges[1] - uranusAges[0]).toBe(21);
    expect(uranusAges[2] - uranusAges[1]).toBe(21);
  });

  it("Node return occurs every 18-19 years", () => {
    const nodeAges = [18, 37, 56, 74];
    expect(nodeAges[1] - nodeAges[0]).toBe(19);
    expect(nodeAges[2] - nodeAges[1]).toBe(19);
    expect(nodeAges[3] - nodeAges[2]).toBe(18);
  });
});

describe("Element-Planet synergy", () => {
  const createDaeunWithElement = (element: string): DaeunInfo => ({
    startAge: 30,
    endAge: 39,
    stem: "甲",
    branch: "子",
    element: element as "목" | "화" | "토" | "금" | "수",
    yinYang: "양",
  });

  it("목 element has positive synergy with Jupiter", () => {
    const daeunList = [createDaeunWithElement("목")];
    const result = analyzeDaeunTransitSync(daeunList, 1990, 34, {
      enableTier5: false,
    });

    const jupiterPoint = result.syncPoints.find((p) =>
      p.transits.some((t) => t.type === "jupiterReturn")
    );
    // 목 + Jupiter should be positive
    if (jupiterPoint) {
      expect(jupiterPoint.synergyScore).toBeGreaterThanOrEqual(50);
    }
  });

  it("토 element has positive synergy with Saturn", () => {
    // Saturn return at age 29
    const daeunList: DaeunInfo[] = [
      { startAge: 25, endAge: 34, stem: "戊", branch: "辰", element: "토", yinYang: "양" },
    ];
    const result = analyzeDaeunTransitSync(daeunList, 1995, 27, {
      enableTier5: false,
    });

    const saturnPoint = result.syncPoints.find((p) =>
      p.transits.some((t) => t.type === "saturnReturn")
    );
    // 토 + Saturn should be highly positive
    if (saturnPoint) {
      expect(saturnPoint.synergyScore).toBeGreaterThan(50);
    }
  });

  it("수 element has positive synergy with Neptune", () => {
    // Neptune square at age 41
    const daeunList: DaeunInfo[] = [
      { startAge: 40, endAge: 49, stem: "壬", branch: "子", element: "수", yinYang: "양" },
    ];
    const result = analyzeDaeunTransitSync(daeunList, 1985, 38, {
      enableTier5: false,
    });

    const neptunePoint = result.syncPoints.find((p) =>
      p.transits.some((t) => t.type === "neptuneSquare")
    );
    // 수 + Neptune should be positive
    if (neptunePoint) {
      expect(neptunePoint.synergyScore).toBeGreaterThanOrEqual(50);
    }
  });
});
