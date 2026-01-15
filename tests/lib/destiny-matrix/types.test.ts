/**
 * Destiny Matrix Types Tests
 *
 * Tests for Destiny Fusion Matrix type definitions
 */


import type {
  InteractionLevel,
  InteractionCode,
  WesternElement,
  PlanetName,
  HouseNumber,
  TransitCycle,
  LuckCycleType,
  GeokgukType,
  ProgressionType,
  BranchRelation,
  ShinsalKind,
  AsteroidName,
  ExtraPointName,
  MatrixCell,
  MatrixSummary,
  MatrixHighlight,
  MatrixSynergy,
  MatrixCalculationInput,
} from "@/lib/destiny-matrix/types";

describe("InteractionLevel", () => {
  it("includes all expected levels", () => {
    const levels: InteractionLevel[] = ["extreme", "amplify", "balance", "clash", "conflict"];
    expect(levels).toHaveLength(5);
  });
});

describe("InteractionCode", () => {
  it("defines correct structure", () => {
    const code: InteractionCode = {
      level: "balance",
      score: 7,
      icon: "✨",
      colorCode: "blue",
      keyword: "균형",
      keywordEn: "Balance",
    };

    expect(code.level).toBe("balance");
    expect(code.score).toBe(7);
    expect(code.colorCode).toBe("blue");
  });

  it("score should be 1-10", () => {
    const validScores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (const score of validScores) {
      const code: InteractionCode = {
        level: "balance",
        score,
        icon: "✨",
        colorCode: "blue",
        keyword: "test",
        keywordEn: "test",
      };
      expect(code.score).toBeGreaterThanOrEqual(1);
      expect(code.score).toBeLessThanOrEqual(10);
    }
  });

  it("colorCode has valid values", () => {
    const colors: InteractionCode["colorCode"][] = ["purple", "green", "blue", "yellow", "red"];
    expect(colors).toHaveLength(5);
  });
});

describe("WesternElement", () => {
  it("includes all four elements", () => {
    const elements: WesternElement[] = ["fire", "earth", "air", "water"];
    expect(elements).toHaveLength(4);
  });
});

describe("PlanetName", () => {
  it("includes all 10 planets", () => {
    const planets: PlanetName[] = [
      "Sun",
      "Moon",
      "Mercury",
      "Venus",
      "Mars",
      "Jupiter",
      "Saturn",
      "Uranus",
      "Neptune",
      "Pluto",
    ];
    expect(planets).toHaveLength(10);
  });
});

describe("HouseNumber", () => {
  it("includes houses 1-12", () => {
    const houses: HouseNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    expect(houses).toHaveLength(12);
    expect(houses[0]).toBe(1);
    expect(houses[11]).toBe(12);
  });
});

describe("TransitCycle", () => {
  it("includes major transits", () => {
    const transits: TransitCycle[] = [
      "saturnReturn",
      "jupiterReturn",
      "uranusSquare",
      "neptuneSquare",
      "plutoTransit",
      "nodeReturn",
      "eclipse",
    ];
    expect(transits.length).toBeGreaterThanOrEqual(7);
  });

  it("includes retrograde cycles", () => {
    const retrogrades: TransitCycle[] = [
      "mercuryRetrograde",
      "venusRetrograde",
      "marsRetrograde",
      "jupiterRetrograde",
      "saturnRetrograde",
    ];
    expect(retrogrades).toHaveLength(5);
  });
});

describe("LuckCycleType", () => {
  it("includes all Korean luck cycle types", () => {
    const cycles: LuckCycleType[] = ["daeun", "saeun", "wolun", "ilun"];
    expect(cycles).toHaveLength(4);
  });
});

describe("GeokgukType", () => {
  it("includes regular patterns (정격)", () => {
    const regular: GeokgukType[] = [
      "jeonggwan",
      "pyeongwan",
      "jeongin",
      "pyeongin",
      "siksin",
      "sanggwan",
      "jeongjae",
      "pyeonjae",
    ];
    expect(regular).toHaveLength(8);
  });

  it("includes special patterns (특수격)", () => {
    const special: GeokgukType[] = ["geonrok", "yangin"];
    expect(special).toHaveLength(2);
  });

  it("includes following patterns (종격)", () => {
    const following: GeokgukType[] = ["jonga", "jongjae", "jongsal", "jonggang"];
    expect(following).toHaveLength(4);
  });

  it("includes external patterns (외격)", () => {
    const external: GeokgukType[] = ["gokjik", "yeomsang", "gasaek", "jonghyeok", "yunha"];
    expect(external).toHaveLength(5);
  });
});

describe("ProgressionType", () => {
  it("includes all progression methods", () => {
    const progressions: ProgressionType[] = [
      "secondary",
      "solarArc",
      "solarReturn",
      "lunarReturn",
      "draconic",
      "harmonics",
    ];
    expect(progressions).toHaveLength(6);
  });
});

describe("BranchRelation", () => {
  it("includes harmonious relations", () => {
    const harmonious: BranchRelation[] = ["samhap", "yukhap", "banghap"];
    expect(harmonious).toHaveLength(3);
  });

  it("includes challenging relations", () => {
    const challenging: BranchRelation[] = ["chung", "hyeong", "pa", "hae", "wonjin"];
    expect(challenging).toHaveLength(5);
  });
});

describe("ShinsalKind", () => {
  it("includes auspicious shinsals (길신)", () => {
    const auspicious: ShinsalKind[] = [
      "천을귀인",
      "태극귀인",
      "천덕귀인",
      "월덕귀인",
      "문창귀인",
      "학당귀인",
      "금여록",
      "천주귀인",
      "암록",
      "건록",
      "제왕",
    ];
    expect(auspicious).toHaveLength(11);
  });

  it("includes cautionary shinsals (흉신)", () => {
    const cautionary: ShinsalKind[] = [
      "도화",
      "홍염살",
      "양인",
      "백호",
      "겁살",
      "재살",
      "천살",
      "지살",
      "년살",
      "월살",
      "망신",
      "고신",
      "괴강",
      "현침",
      "귀문관",
    ];
    expect(cautionary).toHaveLength(15);
  });

  it("includes special shinsals", () => {
    const special: ShinsalKind[] = [
      "역마",
      "화개",
      "장성",
      "반안",
      "천라지망",
      "공망",
      "삼재",
      "원진",
    ];
    expect(special).toHaveLength(8);
  });
});

describe("AsteroidName", () => {
  it("includes four main asteroids", () => {
    const asteroids: AsteroidName[] = ["Ceres", "Pallas", "Juno", "Vesta"];
    expect(asteroids).toHaveLength(4);
  });
});

describe("ExtraPointName", () => {
  it("includes all extra points", () => {
    const points: ExtraPointName[] = [
      "Chiron",
      "Lilith",
      "PartOfFortune",
      "Vertex",
      "NorthNode",
      "SouthNode",
    ];
    expect(points).toHaveLength(6);
  });
});

describe("MatrixCell", () => {
  it("has required interaction field", () => {
    const cell: MatrixCell = {
      interaction: {
        level: "balance",
        score: 7,
        icon: "✨",
        colorCode: "blue",
        keyword: "균형",
        keywordEn: "Balance",
      },
    };

    expect(cell.interaction).toBeDefined();
    expect(cell.interaction.level).toBe("balance");
  });

  it("accepts optional fields", () => {
    const cell: MatrixCell = {
      interaction: {
        level: "amplify",
        score: 8,
        icon: "🔥",
        colorCode: "green",
        keyword: "상승",
        keywordEn: "Amplify",
      },
      sajuBasis: "목생화 관계",
      astroBasis: "화성-목성 합",
      advice: "창의적 에너지를 활용하세요",
    };

    expect(cell.sajuBasis).toBe("목생화 관계");
    expect(cell.astroBasis).toBe("화성-목성 합");
    expect(cell.advice).toBe("창의적 에너지를 활용하세요");
  });
});

describe("MatrixSummary", () => {
  it("has all required fields", () => {
    const summary: MatrixSummary = {
      totalScore: 75,
      strengthPoints: [],
      balancePoints: [],
      cautionPoints: [],
      topSynergies: [],
    };

    expect(summary.totalScore).toBe(75);
    expect(Array.isArray(summary.strengthPoints)).toBe(true);
    expect(Array.isArray(summary.balancePoints)).toBe(true);
    expect(Array.isArray(summary.cautionPoints)).toBe(true);
    expect(Array.isArray(summary.topSynergies)).toBe(true);
  });
});

describe("MatrixHighlight", () => {
  it("identifies cell location and content", () => {
    const highlight: MatrixHighlight = {
      layer: 1,
      rowKey: "wood",
      colKey: "fire",
      cell: {
        interaction: {
          level: "amplify",
          score: 8,
          icon: "🔥",
          colorCode: "green",
          keyword: "상생",
          keywordEn: "Generate",
        },
      },
    };

    expect(highlight.layer).toBe(1);
    expect(highlight.rowKey).toBe("wood");
    expect(highlight.colKey).toBe("fire");
    expect(highlight.cell.interaction.score).toBe(8);
  });
});

describe("MatrixSynergy", () => {
  it("describes multi-layer synergies", () => {
    const synergy: MatrixSynergy = {
      layers: [1, 2, 5],
      description: "목화 에너지가 사주와 점성학에서 모두 강화됨",
      score: 9,
    };

    expect(synergy.layers).toEqual([1, 2, 5]);
    expect(synergy.description.length).toBeGreaterThan(0);
    expect(synergy.score).toBe(9);
  });
});

describe("MatrixCalculationInput", () => {
  it("accepts Saju data", () => {
    const input: Partial<MatrixCalculationInput> = {
      dayMasterElement: "wood",
      pillarElements: ["wood", "fire", "earth", "metal"],
      sibsinDistribution: { 비견: 2, 식신: 1 },
      relations: [],
    };

    expect(input.dayMasterElement).toBe("wood");
    expect(input.pillarElements).toHaveLength(4);
  });

  it("accepts Astrology data", () => {
    const input: Partial<MatrixCalculationInput> = {
      dayMasterElement: "fire",
      pillarElements: [],
      sibsinDistribution: {},
      relations: [],
      planetHouses: { Sun: 1, Moon: 4, Venus: 7 },
      aspects: [{ planet1: "Sun", planet2: "Moon", type: "trine" }],
    };

    expect(input.planetHouses?.Sun).toBe(1);
    expect(input.aspects).toHaveLength(1);
  });

  it("accepts optional advanced data", () => {
    const input: Partial<MatrixCalculationInput> = {
      dayMasterElement: "earth",
      pillarElements: [],
      sibsinDistribution: {},
      relations: [],
      planetHouses: {},
      aspects: [],
      geokguk: "jeonggwan",
      yongsin: "water",
      shinsalList: ["천을귀인", "역마"],
      asteroidHouses: { Ceres: 6, Vesta: 12 },
      lang: "ko",
    };

    expect(input.geokguk).toBe("jeonggwan");
    expect(input.yongsin).toBe("water");
    expect(input.shinsalList).toContain("천을귀인");
    expect(input.lang).toBe("ko");
  });
});
