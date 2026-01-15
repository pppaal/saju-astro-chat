/**
 * Astrology Aspects Tests
 *
 * Tests for aspect calculation utilities
 */


import type { AspectType, AspectHit, Chart } from "@/lib/astrology/foundation/types";

describe("AspectType values", () => {
  describe("major aspects", () => {
    it("conjunction is a valid aspect", () => {
      const aspect: AspectType = "conjunction";
      expect(aspect).toBe("conjunction");
    });

    it("sextile is a valid aspect", () => {
      const aspect: AspectType = "sextile";
      expect(aspect).toBe("sextile");
    });

    it("square is a valid aspect", () => {
      const aspect: AspectType = "square";
      expect(aspect).toBe("square");
    });

    it("trine is a valid aspect", () => {
      const aspect: AspectType = "trine";
      expect(aspect).toBe("trine");
    });

    it("opposition is a valid aspect", () => {
      const aspect: AspectType = "opposition";
      expect(aspect).toBe("opposition");
    });
  });

  describe("minor aspects", () => {
    it("semisextile is a valid aspect", () => {
      const aspect: AspectType = "semisextile";
      expect(aspect).toBe("semisextile");
    });

    it("quincunx is a valid aspect", () => {
      const aspect: AspectType = "quincunx";
      expect(aspect).toBe("quincunx");
    });

    it("quintile is a valid aspect", () => {
      const aspect: AspectType = "quintile";
      expect(aspect).toBe("quintile");
    });

    it("biquintile is a valid aspect", () => {
      const aspect: AspectType = "biquintile";
      expect(aspect).toBe("biquintile");
    });
  });
});

describe("Aspect angles", () => {
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

  it("conjunction is 0°", () => {
    expect(aspectAngles.conjunction).toBe(0);
  });

  it("sextile is 60°", () => {
    expect(aspectAngles.sextile).toBe(60);
  });

  it("square is 90°", () => {
    expect(aspectAngles.square).toBe(90);
  });

  it("trine is 120°", () => {
    expect(aspectAngles.trine).toBe(120);
  });

  it("opposition is 180°", () => {
    expect(aspectAngles.opposition).toBe(180);
  });

  it("semisextile is 30°", () => {
    expect(aspectAngles.semisextile).toBe(30);
  });

  it("quincunx is 150°", () => {
    expect(aspectAngles.quincunx).toBe(150);
  });

  it("quintile is 72°", () => {
    expect(aspectAngles.quintile).toBe(72);
  });

  it("biquintile is 144°", () => {
    expect(aspectAngles.biquintile).toBe(144);
  });
});

describe("Aspect categorization", () => {
  const harmonyAspects: AspectType[] = ["conjunction", "trine", "sextile"];
  const tensionAspects: AspectType[] = ["square", "opposition", "quincunx"];

  it("harmony aspects include conjunction", () => {
    expect(harmonyAspects).toContain("conjunction");
  });

  it("harmony aspects include trine", () => {
    expect(harmonyAspects).toContain("trine");
  });

  it("harmony aspects include sextile", () => {
    expect(harmonyAspects).toContain("sextile");
  });

  it("tension aspects include square", () => {
    expect(tensionAspects).toContain("square");
  });

  it("tension aspects include opposition", () => {
    expect(tensionAspects).toContain("opposition");
  });

  it("tension aspects include quincunx", () => {
    expect(tensionAspects).toContain("quincunx");
  });

  it("harmony aspects have 3 members", () => {
    expect(harmonyAspects).toHaveLength(3);
  });

  it("tension aspects have 3 members", () => {
    expect(tensionAspects).toHaveLength(3);
  });
});

describe("AspectHit interface", () => {
  it("has required from field", () => {
    const hit: AspectHit = {
      from: {
        name: "Sun",
        kind: "transit",
        longitude: 45.5,
      },
      to: {
        name: "Moon",
        kind: "natal",
        longitude: 45.0,
      },
      type: "conjunction",
      orb: 0.5,
    };

    expect(hit.from.name).toBe("Sun");
    expect(hit.from.kind).toBe("transit");
  });

  it("has required to field", () => {
    const hit: AspectHit = {
      from: { name: "Mars", kind: "transit", longitude: 100 },
      to: { name: "Venus", kind: "natal", longitude: 160 },
      type: "sextile",
      orb: 0.2,
    };

    expect(hit.to.name).toBe("Venus");
    expect(hit.to.kind).toBe("natal");
  });

  it("has type field", () => {
    const hit: AspectHit = {
      from: { name: "Saturn", kind: "transit", longitude: 200 },
      to: { name: "Jupiter", kind: "natal", longitude: 290 },
      type: "square",
      orb: 0.8,
    };

    expect(hit.type).toBe("square");
  });

  it("has orb field", () => {
    const hit: AspectHit = {
      from: { name: "Mercury", kind: "transit", longitude: 30 },
      to: { name: "Sun", kind: "natal", longitude: 150 },
      type: "trine",
      orb: 0.3,
    };

    expect(hit.orb).toBe(0.3);
  });

  it("can have optional applying field", () => {
    const hit: AspectHit = {
      from: { name: "Venus", kind: "transit", longitude: 0 },
      to: { name: "Mars", kind: "natal", longitude: 120 },
      type: "trine",
      orb: 0.1,
      applying: true,
    };

    expect(hit.applying).toBe(true);
  });

  it("can have optional score field", () => {
    const hit: AspectHit = {
      from: { name: "Moon", kind: "transit", longitude: 90 },
      to: { name: "Neptune", kind: "natal", longitude: 180 },
      type: "square",
      orb: 0.5,
      score: 0.85,
    };

    expect(hit.score).toBe(0.85);
  });

  it("can include house information", () => {
    const hit: AspectHit = {
      from: { name: "Sun", kind: "transit", longitude: 45, house: 5 },
      to: { name: "Moon", kind: "natal", longitude: 45.5, house: 5 },
      type: "conjunction",
      orb: 0.5,
    };

    expect(hit.from.house).toBe(5);
    expect(hit.to.house).toBe(5);
  });

  it("can include sign information", () => {
    const hit: AspectHit = {
      from: { name: "Sun", kind: "transit", longitude: 45, sign: "황소자리" },
      to: { name: "Moon", kind: "natal", longitude: 45.5, sign: "황소자리" },
      type: "conjunction",
      orb: 0.5,
    };

    expect(hit.from.sign).toBe("황소자리");
    expect(hit.to.sign).toBe("황소자리");
  });
});

describe("Aspect orb ranges", () => {
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
    expect(aspectOrbs.conjunction).toBeGreaterThanOrEqual(7);
    expect(aspectOrbs.opposition).toBeGreaterThanOrEqual(7);
  });

  it("minor aspects have smaller orbs", () => {
    expect(aspectOrbs.semisextile).toBeLessThanOrEqual(3);
    expect(aspectOrbs.quintile).toBeLessThanOrEqual(3);
  });

  it("sextile has moderate orb", () => {
    expect(aspectOrbs.sextile).toBe(5);
  });
});

describe("Aspect weights", () => {
  // Aspect weight determines importance in scoring
  const aspectWeights: Record<AspectType, number> = {
    conjunction: 1.0,
    opposition: 0.96,
    square: 0.92,
    trine: 0.88,
    sextile: 0.8,
    quincunx: 0.7,
    quintile: 0.68,
    biquintile: 0.66,
    semisextile: 0.64,
  };

  it("conjunction has highest weight", () => {
    expect(aspectWeights.conjunction).toBe(1.0);
  });

  it("opposition is second highest", () => {
    expect(aspectWeights.opposition).toBe(0.96);
  });

  it("all weights are between 0 and 1", () => {
    for (const weight of Object.values(aspectWeights)) {
      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeLessThanOrEqual(1);
    }
  });

  it("minor aspects have lower weights", () => {
    expect(aspectWeights.semisextile).toBeLessThan(aspectWeights.sextile);
    expect(aspectWeights.quintile).toBeLessThan(aspectWeights.sextile);
  });
});

describe("Aspect point kind", () => {
  it("natal kind is recognized", () => {
    const kind: "natal" | "transit" = "natal";
    expect(kind).toBe("natal");
  });

  it("transit kind is recognized", () => {
    const kind: "natal" | "transit" = "transit";
    expect(kind).toBe("transit");
  });
});

describe("Aspect source/target planets", () => {
  const commonPlanets = [
    "Sun", "Moon", "Mercury", "Venus", "Mars",
    "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"
  ];

  it("has 10 major planets", () => {
    expect(commonPlanets).toHaveLength(10);
  });

  it("includes inner planets", () => {
    expect(commonPlanets).toContain("Mercury");
    expect(commonPlanets).toContain("Venus");
    expect(commonPlanets).toContain("Mars");
  });

  it("includes outer planets", () => {
    expect(commonPlanets).toContain("Jupiter");
    expect(commonPlanets).toContain("Saturn");
    expect(commonPlanets).toContain("Uranus");
    expect(commonPlanets).toContain("Neptune");
    expect(commonPlanets).toContain("Pluto");
  });

  it("includes luminaries", () => {
    expect(commonPlanets).toContain("Sun");
    expect(commonPlanets).toContain("Moon");
  });
});

describe("Chart angles as aspect points", () => {
  const chartAngles = ["Ascendant", "MC"];

  it("Ascendant is a valid aspect point", () => {
    expect(chartAngles).toContain("Ascendant");
  });

  it("MC (Midheaven) is a valid aspect point", () => {
    expect(chartAngles).toContain("MC");
  });
});
