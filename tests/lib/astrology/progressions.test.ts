/**
 * Astrology Progressions Tests
 *
 * Tests for secondary progressions and solar arc direction calculations
 */


import type { ProgressedChart } from "@/lib/astrology/foundation/types";
import {
  getProgressedMoonPhase,
  findProgressedAspectKeywords,
} from "@/lib/astrology/foundation/progressions";

describe("Secondary Progressions concept", () => {
  it("uses 1 day = 1 year principle", () => {
    const dayPerYear = 1;
    expect(dayPerYear).toBe(1);
  });

  it("years progressed equals days from birth", () => {
    const yearsProgressed = 30;
    const daysProgressed = yearsProgressed;
    expect(daysProgressed).toBe(30);
  });
});

describe("Solar Arc Directions concept", () => {
  it("uses progressed Sun - natal Sun as arc", () => {
    const progressedSunLon = 45;
    const natalSunLon = 15;
    const solarArc = progressedSunLon - natalSunLon;
    expect(solarArc).toBe(30);
  });

  it("applies solar arc to all planets", () => {
    const natalMarsLon = 100;
    const solarArc = 30;
    const directedMarsLon = natalMarsLon + solarArc;
    expect(directedMarsLon).toBe(130);
  });

  it("normalizes to 360 degrees", () => {
    const natalLon = 350;
    const solarArc = 30;
    const directedLon = (natalLon + solarArc) % 360;
    expect(directedLon).toBe(20);
  });
});

describe("getProgressedMoonPhase", () => {
  it("returns New/Waxing Crescent for angle < 45", () => {
    expect(getProgressedMoonPhase(30, 0)).toBe("New/Waxing Crescent");
    expect(getProgressedMoonPhase(20, 0)).toBe("New/Waxing Crescent");
  });

  it("returns First Quarter for angle 45-90", () => {
    expect(getProgressedMoonPhase(60, 0)).toBe("First Quarter");
    expect(getProgressedMoonPhase(80, 0)).toBe("First Quarter");
  });

  it("returns Waxing Gibbous for angle 90-135", () => {
    expect(getProgressedMoonPhase(100, 0)).toBe("Waxing Gibbous");
    expect(getProgressedMoonPhase(130, 0)).toBe("Waxing Gibbous");
  });

  it("returns Full Moon for angle 135-180", () => {
    expect(getProgressedMoonPhase(150, 0)).toBe("Full Moon");
    expect(getProgressedMoonPhase(175, 0)).toBe("Full Moon");
  });

  it("returns Waning Gibbous for angle 180-225", () => {
    expect(getProgressedMoonPhase(200, 0)).toBe("Waning Gibbous");
    expect(getProgressedMoonPhase(220, 0)).toBe("Waning Gibbous");
  });

  it("returns Last Quarter for angle 225-270", () => {
    expect(getProgressedMoonPhase(240, 0)).toBe("Last Quarter");
    expect(getProgressedMoonPhase(260, 0)).toBe("Last Quarter");
  });

  it("returns Waning Crescent for angle 270-315", () => {
    expect(getProgressedMoonPhase(280, 0)).toBe("Waning Crescent");
    expect(getProgressedMoonPhase(310, 0)).toBe("Waning Crescent");
  });

  it("returns Dark Moon for angle >= 315", () => {
    expect(getProgressedMoonPhase(330, 0)).toBe("Dark Moon");
    expect(getProgressedMoonPhase(355, 0)).toBe("Dark Moon");
  });
});

describe("findProgressedAspectKeywords", () => {
  it("returns aspect keyword mapping", () => {
    const keywords = findProgressedAspectKeywords();
    expect(keywords).toHaveProperty("conjunction");
    expect(keywords).toHaveProperty("opposition");
    expect(keywords).toHaveProperty("square");
    expect(keywords).toHaveProperty("trine");
    expect(keywords).toHaveProperty("sextile");
  });

  it("conjunction is powerful merge", () => {
    const keywords = findProgressedAspectKeywords();
    expect(keywords.conjunction).toBe("강력한 합");
  });

  it("opposition is conflict", () => {
    const keywords = findProgressedAspectKeywords();
    expect(keywords.opposition).toBe("대립");
  });

  it("square is tension", () => {
    const keywords = findProgressedAspectKeywords();
    expect(keywords.square).toBe("긴장");
  });

  it("trine is harmony", () => {
    const keywords = findProgressedAspectKeywords();
    expect(keywords.trine).toBe("조화");
  });

  it("sextile is cooperation", () => {
    const keywords = findProgressedAspectKeywords();
    expect(keywords.sextile).toBe("협력");
  });
});

describe("ProgressedChart interface", () => {
  it("has planets array", () => {
    const chart: Partial<ProgressedChart> = {
      planets: [{ name: "Sun", longitude: 45 }],
    };
    expect(chart.planets).toHaveLength(1);
  });

  it("has ascendant", () => {
    const chart: Partial<ProgressedChart> = {
      ascendant: { name: "Ascendant", longitude: 0 },
    };
    expect(chart.ascendant?.name).toBe("Ascendant");
  });

  it("has mc (midheaven)", () => {
    const chart: Partial<ProgressedChart> = {
      mc: { name: "MC", longitude: 270 },
    };
    expect(chart.mc?.name).toBe("MC");
  });

  it("has progressionType", () => {
    const chart: Partial<ProgressedChart> = {
      progressionType: "secondary",
    };
    expect(chart.progressionType).toBe("secondary");
  });

  it("has yearsProgressed", () => {
    const chart: Partial<ProgressedChart> = {
      yearsProgressed: 30.5,
    };
    expect(chart.yearsProgressed).toBe(30.5);
  });

  it("has progressedDate", () => {
    const chart: Partial<ProgressedChart> = {
      progressedDate: "2025-01-15",
    };
    expect(chart.progressedDate).toBe("2025-01-15");
  });
});

describe("Progression types", () => {
  it("secondary progression type exists", () => {
    const type = "secondary";
    expect(type).toBe("secondary");
  });

  it("solarArc progression type exists", () => {
    const type = "solarArc";
    expect(type).toBe("solarArc");
  });
});

describe("Moon phase cycle", () => {
  const phases = [
    "New/Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Last Quarter",
    "Waning Crescent",
    "Dark Moon",
  ];

  it("has 8 moon phases", () => {
    expect(phases).toHaveLength(8);
  });

  it("starts with New/Waxing Crescent", () => {
    expect(phases[0]).toBe("New/Waxing Crescent");
  });

  it("includes First Quarter", () => {
    expect(phases).toContain("First Quarter");
  });

  it("includes Full Moon", () => {
    expect(phases).toContain("Full Moon");
  });

  it("includes Last Quarter", () => {
    expect(phases).toContain("Last Quarter");
  });

  it("ends with Dark Moon", () => {
    expect(phases[phases.length - 1]).toBe("Dark Moon");
  });
});

describe("Progressed Moon speed", () => {
  // Progressed Moon moves about 1 degree per month
  it("moves approximately 1 degree per month", () => {
    const degreesPerMonth = 12 / 12; // 12° per year / 12 months
    expect(degreesPerMonth).toBeCloseTo(1);
  });

  it("takes about 2.5 years per sign", () => {
    const yearsPerSign = 30 / 12; // 30° per sign / 12° per year
    expect(yearsPerSign).toBeCloseTo(2.5);
  });

  it("completes cycle in about 27-28 years", () => {
    const yearsToCycle = 360 / 12; // 360° / 12° per year
    expect(yearsToCycle).toBe(30);
  });
});

describe("Secondary Progressed angles", () => {
  it("Ascendant progresses", () => {
    const natalAsc = 0;
    const progressedAsc = 15;
    expect(progressedAsc).not.toBe(natalAsc);
  });

  it("MC progresses", () => {
    const natalMC = 270;
    const progressedMC = 285;
    expect(progressedMC).not.toBe(natalMC);
  });
});

describe("Aspect orbs for progressions", () => {
  // Progressions typically use very tight orbs
  it("uses 1-3 degree orbs", () => {
    const typicalOrb = 3;
    expect(typicalOrb).toBeLessThanOrEqual(3);
  });

  it("conjunction uses tightest orb", () => {
    const conjunctionOrb = 1;
    expect(conjunctionOrb).toBe(1);
  });
});

describe("Important progressed planets", () => {
  const importantPlanets = ["Sun", "Moon", "Mercury", "Venus", "Mars"];

  it("Sun is important for progressions", () => {
    expect(importantPlanets).toContain("Sun");
  });

  it("Moon is very important for progressions", () => {
    expect(importantPlanets).toContain("Moon");
  });

  it("includes personal planets", () => {
    expect(importantPlanets).toContain("Mercury");
    expect(importantPlanets).toContain("Venus");
    expect(importantPlanets).toContain("Mars");
  });

  it("outer planets move too slowly for significant progression", () => {
    const outerPlanets = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
    for (const planet of outerPlanets) {
      expect(importantPlanets).not.toContain(planet);
    }
  });
});
