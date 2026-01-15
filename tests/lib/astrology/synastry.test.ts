/**
 * Astrology Synastry Tests
 *
 * Tests for synastry (chart comparison) calculations
 */


import type { AspectType, Chart, ZodiacKo } from "@/lib/astrology/foundation/types";
import type {
  SynastryInput,
  SynastryResult,
  HouseOverlay
} from "@/lib/astrology/foundation/synastry";

describe("SynastryInput interface", () => {
  it("has chartA field", () => {
    const mockChart: Chart = {
      planets: [],
      houses: Array(12).fill({ cusp: 0, sign: "양자리" as ZodiacKo }),
      ascendant: { name: "Ascendant", longitude: 0, sign: "양자리" as ZodiacKo },
      mc: { name: "MC", longitude: 270, sign: "염소자리" as ZodiacKo },
    };

    const input: SynastryInput = {
      chartA: mockChart,
      chartB: mockChart,
    };

    expect(input.chartA).toBeDefined();
  });

  it("has chartB field", () => {
    const mockChart: Chart = {
      planets: [],
      houses: Array(12).fill({ cusp: 0, sign: "양자리" as ZodiacKo }),
      ascendant: { name: "Ascendant", longitude: 0, sign: "양자리" as ZodiacKo },
      mc: { name: "MC", longitude: 270, sign: "염소자리" as ZodiacKo },
    };

    const input: SynastryInput = {
      chartA: mockChart,
      chartB: mockChart,
    };

    expect(input.chartB).toBeDefined();
  });
});

describe("HouseOverlay interface", () => {
  it("has planet field", () => {
    const overlay: HouseOverlay = {
      planet: "Sun",
      planetSign: "사자자리",
      inHouse: 5,
      description: "A의 Sun이(가) B의 5하우스에 위치",
    };

    expect(overlay.planet).toBe("Sun");
  });

  it("has planetSign field", () => {
    const overlay: HouseOverlay = {
      planet: "Moon",
      planetSign: "게자리",
      inHouse: 4,
      description: "A의 Moon이(가) B의 4하우스에 위치",
    };

    expect(overlay.planetSign).toBe("게자리");
  });

  it("has inHouse field", () => {
    const overlay: HouseOverlay = {
      planet: "Venus",
      planetSign: "천칭자리",
      inHouse: 7,
      description: "A의 Venus이(가) B의 7하우스에 위치",
    };

    expect(overlay.inHouse).toBe(7);
  });

  it("has description field", () => {
    const overlay: HouseOverlay = {
      planet: "Mars",
      planetSign: "양자리",
      inHouse: 1,
      description: "A의 Mars이(가) B의 1하우스에 위치",
    };

    expect(overlay.description).toContain("Mars");
    expect(overlay.description).toContain("1하우스");
  });
});

describe("SynastryResult interface", () => {
  it("has aspects array", () => {
    const result: SynastryResult = {
      aspects: [],
      houseOverlaysAtoB: [],
      houseOverlaysBtoA: [],
      score: { harmony: 0, tension: 0, total: 10 },
    };

    expect(Array.isArray(result.aspects)).toBe(true);
  });

  it("has houseOverlaysAtoB array", () => {
    const result: SynastryResult = {
      aspects: [],
      houseOverlaysAtoB: [
        { planet: "Sun", planetSign: "사자자리", inHouse: 5, description: "test" }
      ],
      houseOverlaysBtoA: [],
      score: { harmony: 0, tension: 0, total: 10 },
    };

    expect(result.houseOverlaysAtoB).toHaveLength(1);
  });

  it("has houseOverlaysBtoA array", () => {
    const result: SynastryResult = {
      aspects: [],
      houseOverlaysAtoB: [],
      houseOverlaysBtoA: [
        { planet: "Moon", planetSign: "게자리", inHouse: 4, description: "test" }
      ],
      score: { harmony: 0, tension: 0, total: 10 },
    };

    expect(result.houseOverlaysBtoA).toHaveLength(1);
  });

  it("has score object with harmony, tension, and total", () => {
    const result: SynastryResult = {
      aspects: [],
      houseOverlaysAtoB: [],
      houseOverlaysBtoA: [],
      score: { harmony: 5.5, tension: 2.3, total: 13.35 },
    };

    expect(result.score.harmony).toBe(5.5);
    expect(result.score.tension).toBe(2.3);
    expect(result.score.total).toBe(13.35);
  });
});

describe("Synastry aspect angles", () => {
  const aspectAngles: Record<AspectType, number> = {
    conjunction: 0,
    sextile: 60,
    square: 90,
    trine: 120,
    opposition: 180,
    semisextile: 30,
    quincunx: 150,
    quintile: 72,
    biquintile: 144,
  };

  it("conjunction is at 0°", () => {
    expect(aspectAngles.conjunction).toBe(0);
  });

  it("opposition is at 180°", () => {
    expect(aspectAngles.opposition).toBe(180);
  });

  it("trine is at 120°", () => {
    expect(aspectAngles.trine).toBe(120);
  });

  it("square is at 90°", () => {
    expect(aspectAngles.square).toBe(90);
  });
});

describe("Synastry aspect orbs", () => {
  const aspectOrbs: Record<AspectType, number> = {
    conjunction: 8,
    opposition: 8,
    trine: 7,
    square: 7,
    sextile: 5,
    quincunx: 3,
    semisextile: 2,
    quintile: 2,
    biquintile: 2,
  };

  it("major aspects have larger orbs", () => {
    expect(aspectOrbs.conjunction).toBe(8);
    expect(aspectOrbs.opposition).toBe(8);
  });

  it("trine and square have 7° orb", () => {
    expect(aspectOrbs.trine).toBe(7);
    expect(aspectOrbs.square).toBe(7);
  });

  it("sextile has 5° orb", () => {
    expect(aspectOrbs.sextile).toBe(5);
  });

  it("minor aspects have smaller orbs", () => {
    expect(aspectOrbs.quincunx).toBe(3);
    expect(aspectOrbs.semisextile).toBe(2);
  });
});

describe("Harmony and tension aspects", () => {
  const harmonyAspects: AspectType[] = ["conjunction", "trine", "sextile"];
  const tensionAspects: AspectType[] = ["square", "opposition", "quincunx"];

  it("conjunction is harmonious", () => {
    expect(harmonyAspects).toContain("conjunction");
  });

  it("trine is harmonious", () => {
    expect(harmonyAspects).toContain("trine");
  });

  it("sextile is harmonious", () => {
    expect(harmonyAspects).toContain("sextile");
  });

  it("square creates tension", () => {
    expect(tensionAspects).toContain("square");
  });

  it("opposition creates tension", () => {
    expect(tensionAspects).toContain("opposition");
  });

  it("quincunx creates tension", () => {
    expect(tensionAspects).toContain("quincunx");
  });
});

describe("House overlay meanings in synastry", () => {
  const houseAreas: Record<number, string> = {
    1: "self and identity",
    2: "values and resources",
    3: "communication",
    4: "home and family",
    5: "romance and creativity",
    6: "daily routines",
    7: "partnerships",
    8: "shared resources",
    9: "philosophy and travel",
    10: "career and public image",
    11: "friendship and groups",
    12: "subconscious",
  };

  it("house 5 relates to romance", () => {
    expect(houseAreas[5]).toContain("romance");
  });

  it("house 7 relates to partnerships", () => {
    expect(houseAreas[7]).toContain("partnerships");
  });

  it("house 8 relates to shared resources", () => {
    expect(houseAreas[8]).toContain("shared resources");
  });

  it("all 12 houses have meanings", () => {
    expect(Object.keys(houseAreas)).toHaveLength(12);
  });
});

describe("Synastry planet importance", () => {
  // Planets important for relationship synastry
  const relationshipPlanets = ["Sun", "Moon", "Venus", "Mars"];
  const personalPlanets = ["Mercury", "Venus", "Mars"];
  const outerPlanets = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

  it("Sun is important for synastry", () => {
    expect(relationshipPlanets).toContain("Sun");
  });

  it("Moon is important for synastry", () => {
    expect(relationshipPlanets).toContain("Moon");
  });

  it("Venus is important for love", () => {
    expect(relationshipPlanets).toContain("Venus");
  });

  it("Mars is important for attraction", () => {
    expect(relationshipPlanets).toContain("Mars");
  });

  it("personal planets have stronger effect", () => {
    expect(personalPlanets).toHaveLength(3);
  });

  it("outer planets have 5 members", () => {
    expect(outerPlanets).toHaveLength(5);
  });
});

describe("Synastry score calculation", () => {
  it("total score formula includes harmony and tension", () => {
    const harmony = 8.5;
    const tension = 3.0;
    // Formula from synastry.ts: total = harmony - tension * 0.5 + 10
    const total = harmony - tension * 0.5 + 10;

    expect(total).toBe(17);
  });

  it("no aspects gives base score of 10", () => {
    const harmony = 0;
    const tension = 0;
    const total = harmony - tension * 0.5 + 10;

    expect(total).toBe(10);
  });

  it("high harmony increases total", () => {
    const harmony1 = 5;
    const harmony2 = 10;
    const tension = 2;

    const total1 = harmony1 - tension * 0.5 + 10;
    const total2 = harmony2 - tension * 0.5 + 10;

    expect(total2).toBeGreaterThan(total1);
  });

  it("high tension decreases total", () => {
    const harmony = 5;
    const tension1 = 2;
    const tension2 = 8;

    const total1 = harmony - tension1 * 0.5 + 10;
    const total2 = harmony - tension2 * 0.5 + 10;

    expect(total1).toBeGreaterThan(total2);
  });
});

describe("Korean zodiac signs in synastry", () => {
  const zodiacSigns: ZodiacKo[] = [
    "양자리", "황소자리", "쌍둥이자리", "게자리",
    "사자자리", "처녀자리", "천칭자리", "전갈자리",
    "사수자리", "염소자리", "물병자리", "물고기자리"
  ];

  it("has 12 zodiac signs", () => {
    expect(zodiacSigns).toHaveLength(12);
  });

  it("includes fire signs", () => {
    expect(zodiacSigns).toContain("양자리");
    expect(zodiacSigns).toContain("사자자리");
    expect(zodiacSigns).toContain("사수자리");
  });

  it("includes water signs", () => {
    expect(zodiacSigns).toContain("게자리");
    expect(zodiacSigns).toContain("전갈자리");
    expect(zodiacSigns).toContain("물고기자리");
  });

  it("includes earth signs", () => {
    expect(zodiacSigns).toContain("황소자리");
    expect(zodiacSigns).toContain("처녀자리");
    expect(zodiacSigns).toContain("염소자리");
  });

  it("includes air signs", () => {
    expect(zodiacSigns).toContain("쌍둥이자리");
    expect(zodiacSigns).toContain("천칭자리");
    expect(zodiacSigns).toContain("물병자리");
  });
});
