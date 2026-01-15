/**
 * Astrology Types Tests
 *
 * Tests for astrology type definitions
 */


import type {
  ZodiacKo,
  HouseSystem,
  AspectType,
  AspectRules,
  PlanetBase,
  House,
  ChartMeta,
  Chart,
  NatalInput,
  TransitInput,
  AspectEnd,
  AspectHit,
  ProgressionInput,
  SolarReturnInput,
  LunarReturnInput,
  ProgressedChart,
  ReturnChart,
  ExtraPoint,
  ExtendedChart,
  AstrologyChartFacts,
} from "@/lib/astrology/foundation/types";

describe("ZodiacKo type", () => {
  it("includes all 12 zodiac signs", () => {
    const signs: ZodiacKo[] = [
      "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
      "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ];
    expect(signs).toHaveLength(12);
  });
});

describe("HouseSystem type", () => {
  it("includes Placidus and WholeSign", () => {
    const systems: HouseSystem[] = ["Placidus", "WholeSign"];
    expect(systems).toHaveLength(2);
  });
});

describe("AspectType type", () => {
  it("includes major aspects", () => {
    const majorAspects: AspectType[] = [
      "conjunction", "sextile", "square", "trine", "opposition"
    ];
    expect(majorAspects).toHaveLength(5);
  });

  it("includes minor aspects", () => {
    const minorAspects: AspectType[] = [
      "semisextile", "quincunx", "quintile", "biquintile"
    ];
    expect(minorAspects).toHaveLength(4);
  });
});

describe("AspectRules interface", () => {
  it("accepts valid rules configuration", () => {
    const rules: AspectRules = {
      aspects: ["conjunction", "sextile", "square", "trine", "opposition"],
      includeMinor: false,
      maxResults: 50,
      orbs: {
        Sun: 10,
        Moon: 8,
        inner: 6,
        outer: 4,
        angles: 6,
        default: 5,
      },
    };

    expect(rules.aspects).toHaveLength(5);
    expect(rules.orbs?.Sun).toBe(10);
    expect(rules.maxResults).toBe(50);
  });

  it("accepts per-aspect orbs", () => {
    const rules: AspectRules = {
      perAspectOrbs: {
        conjunction: 10,
        opposition: 8,
        square: 6,
        trine: 6,
        sextile: 4,
      },
    };

    expect(rules.perAspectOrbs?.conjunction).toBe(10);
  });

  it("accepts scoring configuration", () => {
    const rules: AspectRules = {
      scoring: {
        weights: {
          orb: 0.5,
          aspect: 0.3,
          speed: 0.2,
        },
      },
    };

    expect(rules.scoring?.weights?.orb).toBe(0.5);
  });
});

describe("PlanetBase interface", () => {
  it("has all required fields", () => {
    const sun: PlanetBase = {
      name: "Sun",
      longitude: 45.5,
      sign: "Taurus",
      degree: 15,
      minute: 30,
      formatted: "Taurus 15deg 30'",
      house: 10,
    };

    expect(sun.name).toBe("Sun");
    expect(sun.longitude).toBe(45.5);
    expect(sun.sign).toBe("Taurus");
    expect(sun.house).toBe(10);
  });

  it("accepts optional fields", () => {
    const mars: PlanetBase = {
      name: "Mars",
      longitude: 120.0,
      sign: "Leo",
      degree: 0,
      minute: 0,
      formatted: "Leo 0deg 0'",
      house: 1,
      speed: -0.5,
      retrograde: true,
    };

    expect(mars.speed).toBe(-0.5);
    expect(mars.retrograde).toBe(true);
  });
});

describe("House interface", () => {
  it("has all required fields", () => {
    const house: House = {
      index: 1,
      cusp: 0,
      sign: "Aries",
      formatted: "1st House: Aries 0deg",
    };

    expect(house.index).toBe(1);
    expect(house.cusp).toBe(0);
    expect(house.sign).toBe("Aries");
  });
});

describe("ChartMeta interface", () => {
  it("has all required fields", () => {
    const meta: ChartMeta = {
      jdUT: 2459580.5,
      isoUTC: "2022-01-01T12:00:00Z",
      timeZone: "Asia/Seoul",
      latitude: 37.5665,
      longitude: 126.978,
      houseSystem: "Placidus",
    };

    expect(meta.jdUT).toBe(2459580.5);
    expect(meta.timeZone).toBe("Asia/Seoul");
    expect(meta.houseSystem).toBe("Placidus");
  });
});

describe("Chart interface", () => {
  it("has planets, ascendant, mc, and houses", () => {
    const planet: PlanetBase = {
      name: "Sun",
      longitude: 0,
      sign: "Aries",
      degree: 0,
      minute: 0,
      formatted: "Aries 0deg",
      house: 1,
    };

    const house: House = {
      index: 1,
      cusp: 0,
      sign: "Aries",
      formatted: "1st",
    };

    const chart: Chart = {
      planets: [planet],
      ascendant: { ...planet, name: "Ascendant" },
      mc: { ...planet, name: "MC" },
      houses: [house],
    };

    expect(chart.planets).toHaveLength(1);
    expect(chart.ascendant.name).toBe("Ascendant");
    expect(chart.mc.name).toBe("MC");
    expect(chart.houses).toHaveLength(1);
  });
});

describe("NatalInput interface", () => {
  it("has all required fields", () => {
    const input: NatalInput = {
      year: 1990,
      month: 5,
      date: 15,
      hour: 14,
      minute: 30,
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: "Asia/Seoul",
    };

    expect(input.year).toBe(1990);
    expect(input.month).toBe(5);
    expect(input.timeZone).toBe("Asia/Seoul");
  });
});

describe("TransitInput interface", () => {
  it("has all required fields", () => {
    const input: TransitInput = {
      iso: "2024-01-15T14:30:00",
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: "Asia/Seoul",
    };

    expect(input.iso).toContain("2024");
    expect(input.latitude).toBe(37.5665);
  });
});

describe("AspectEnd interface", () => {
  it("has required fields", () => {
    const end: AspectEnd = {
      name: "Sun",
      kind: "natal",
      longitude: 45.5,
    };

    expect(end.name).toBe("Sun");
    expect(end.kind).toBe("natal");
    expect(end.longitude).toBe(45.5);
  });

  it("accepts optional fields", () => {
    const end: AspectEnd = {
      name: "Moon",
      kind: "transit",
      house: 4,
      sign: "Cancer",
      longitude: 100.0,
    };

    expect(end.house).toBe(4);
    expect(end.sign).toBe("Cancer");
  });
});

describe("AspectHit interface", () => {
  it("has all required fields", () => {
    const hit: AspectHit = {
      from: { name: "Sun", kind: "natal", longitude: 45 },
      to: { name: "Moon", kind: "natal", longitude: 135 },
      type: "square",
      orb: 0.5,
    };

    expect(hit.from.name).toBe("Sun");
    expect(hit.to.name).toBe("Moon");
    expect(hit.type).toBe("square");
    expect(hit.orb).toBe(0.5);
  });

  it("accepts optional fields", () => {
    const hit: AspectHit = {
      from: { name: "Mars", kind: "transit", longitude: 0 },
      to: { name: "Saturn", kind: "natal", longitude: 90 },
      type: "square",
      orb: 2.5,
      applying: true,
      score: 85,
    };

    expect(hit.applying).toBe(true);
    expect(hit.score).toBe(85);
  });
});

describe("ProgressionInput interface", () => {
  it("has natal and targetDate", () => {
    const input: ProgressionInput = {
      natal: {
        year: 1990,
        month: 5,
        date: 15,
        hour: 14,
        minute: 30,
        latitude: 37.5665,
        longitude: 126.978,
        timeZone: "Asia/Seoul",
      },
      targetDate: "2024-01-15",
    };

    expect(input.natal.year).toBe(1990);
    expect(input.targetDate).toBe("2024-01-15");
  });
});

describe("SolarReturnInput interface", () => {
  it("has natal and year", () => {
    const input: SolarReturnInput = {
      natal: {
        year: 1990,
        month: 5,
        date: 15,
        hour: 14,
        minute: 30,
        latitude: 37.5665,
        longitude: 126.978,
        timeZone: "Asia/Seoul",
      },
      year: 2024,
    };

    expect(input.year).toBe(2024);
  });
});

describe("LunarReturnInput interface", () => {
  it("has natal, month, and year", () => {
    const input: LunarReturnInput = {
      natal: {
        year: 1990,
        month: 5,
        date: 15,
        hour: 14,
        minute: 30,
        latitude: 37.5665,
        longitude: 126.978,
        timeZone: "Asia/Seoul",
      },
      month: 6,
      year: 2024,
    };

    expect(input.month).toBe(6);
    expect(input.year).toBe(2024);
  });
});

describe("ProgressedChart interface", () => {
  it("extends Chart with progression fields", () => {
    const planet: PlanetBase = {
      name: "Sun",
      longitude: 0,
      sign: "Aries",
      degree: 0,
      minute: 0,
      formatted: "Aries 0deg",
      house: 1,
    };

    const house: House = {
      index: 1,
      cusp: 0,
      sign: "Aries",
      formatted: "1st",
    };

    const chart: ProgressedChart = {
      planets: [planet],
      ascendant: planet,
      mc: planet,
      houses: [house],
      progressionType: "secondary",
      yearsProgressed: 34,
      progressedDate: "2024-06-19",
    };

    expect(chart.progressionType).toBe("secondary");
    expect(chart.yearsProgressed).toBe(34);
  });
});

describe("ReturnChart interface", () => {
  it("extends Chart with return fields", () => {
    const planet: PlanetBase = {
      name: "Sun",
      longitude: 0,
      sign: "Aries",
      degree: 0,
      minute: 0,
      formatted: "Aries 0deg",
      house: 1,
    };

    const chart: ReturnChart = {
      planets: [planet],
      ascendant: planet,
      mc: planet,
      houses: [],
      returnType: "solar",
      returnYear: 2024,
      exactReturnTime: "2024-05-15T03:45:00Z",
    };

    expect(chart.returnType).toBe("solar");
    expect(chart.returnYear).toBe(2024);
  });
});

describe("ExtraPoint interface", () => {
  it("has all required fields", () => {
    const chiron: ExtraPoint = {
      name: "Chiron",
      longitude: 12.5,
      sign: "Aries",
      degree: 12,
      minute: 30,
      formatted: "Aries 12deg 30'",
      house: 1,
    };

    expect(chiron.name).toBe("Chiron");
    expect(chiron.longitude).toBe(12.5);
  });

  it("accepts optional description", () => {
    const lilith: ExtraPoint = {
      name: "Black Moon Lilith",
      longitude: 180,
      sign: "Libra",
      degree: 0,
      minute: 0,
      formatted: "Libra 0deg",
      house: 7,
      description: "Mean Black Moon Lilith",
    };

    expect(lilith.description).toBe("Mean Black Moon Lilith");
  });
});

describe("ExtendedChart interface", () => {
  it("extends Chart with extra points", () => {
    const planet: PlanetBase = {
      name: "Sun",
      longitude: 0,
      sign: "Aries",
      degree: 0,
      minute: 0,
      formatted: "Aries 0deg",
      house: 1,
    };

    const extraPoint: ExtraPoint = {
      name: "Chiron",
      longitude: 12,
      sign: "Aries",
      degree: 12,
      minute: 0,
      formatted: "Aries 12deg",
      house: 1,
    };

    const chart: ExtendedChart = {
      planets: [planet],
      ascendant: planet,
      mc: planet,
      houses: [],
      chiron: extraPoint,
      lilith: extraPoint,
      partOfFortune: extraPoint,
      vertex: extraPoint,
    };

    expect(chart.chiron?.name).toBe("Chiron");
  });
});

describe("AstrologyChartFacts interface", () => {
  it("has required sun and moon", () => {
    const planet: PlanetBase = {
      name: "Sun",
      longitude: 0,
      sign: "Aries",
      degree: 0,
      minute: 0,
      formatted: "Aries 0deg",
      house: 1,
    };

    const facts: AstrologyChartFacts = {
      sun: planet,
      moon: { ...planet, name: "Moon" },
    };

    expect(facts.sun.name).toBe("Sun");
    expect(facts.moon.name).toBe("Moon");
  });

  it("accepts all optional planets", () => {
    const planet: PlanetBase = {
      name: "Planet",
      longitude: 0,
      sign: "Aries",
      degree: 0,
      minute: 0,
      formatted: "Aries 0deg",
      house: 1,
    };

    const facts: AstrologyChartFacts = {
      sun: { ...planet, name: "Sun" },
      moon: { ...planet, name: "Moon" },
      mercury: { ...planet, name: "Mercury" },
      venus: { ...planet, name: "Venus" },
      mars: { ...planet, name: "Mars" },
      jupiter: { ...planet, name: "Jupiter" },
      saturn: { ...planet, name: "Saturn" },
      uranus: { ...planet, name: "Uranus" },
      neptune: { ...planet, name: "Neptune" },
      pluto: { ...planet, name: "Pluto" },
    };

    expect(Object.keys(facts).length).toBeGreaterThanOrEqual(10);
  });

  it("accepts element ratios", () => {
    const planet: PlanetBase = {
      name: "Sun",
      longitude: 0,
      sign: "Aries",
      degree: 0,
      minute: 0,
      formatted: "Aries 0deg",
      house: 1,
    };

    const facts: AstrologyChartFacts = {
      sun: planet,
      moon: planet,
      elementRatios: {
        fire: 0.4,
        earth: 0.2,
        air: 0.3,
        water: 0.1,
      },
    };

    expect(facts.elementRatios?.fire).toBe(0.4);
  });
});
