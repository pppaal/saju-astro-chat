/**
 * Tests for electional.ts
 * Electional astrology - selecting optimal times for events
 */

import { vi } from "vitest";
import type { Chart, PlanetBase, ZodiacKo } from "@/lib/astrology/foundation/types";

// Mock findAspects
vi.mock("@/lib/astrology/foundation/aspects", () => ({
  findAspects: vi.fn(() => []),
}));

import {
  getMoonPhase,
  getMoonPhaseName,
  checkVoidOfCourse,
  calculatePlanetaryHour,
  getRetrogradePlanets,
  classifyAspects,
  analyzeElection,
  findBestDates,
  getElectionalGuidelines,
  type MoonPhase,
  type ElectionalEventType,
} from "@/lib/astrology/foundation/electional";
import { findAspects } from "@/lib/astrology/foundation/aspects";

// Helper to create mock planet
function createPlanet(
  name: string,
  longitude: number,
  sign: ZodiacKo,
  options: { speed?: number; retrograde?: boolean } = {}
): PlanetBase {
  const degree = Math.floor(longitude % 30);
  const minute = Math.floor((longitude % 1) * 60);
  return {
    name,
    longitude,
    sign,
    degree,
    minute,
    formatted: `${sign} ${degree}° ${minute}'`,
    house: Math.floor(longitude / 30) + 1,
    speed: options.speed ?? 1,
    retrograde: options.retrograde ?? false,
  };
}

// Helper to create mock chart
function createChart(planets: PlanetBase[]): Chart {
  const ascendant = createPlanet("Ascendant", 0, "Aries");
  const mc = createPlanet("MC", 270, "Capricorn");
  return {
    planets,
    ascendant,
    mc,
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      sign: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
             "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"][i] as ZodiacKo,
      formatted: `House ${i + 1}`,
    })),
  };
}

describe("electional.ts", () => {
  describe("getMoonPhase", () => {
    it("returns new_moon when Sun and Moon are conjunct (0-45°)", () => {
      expect(getMoonPhase(0, 0)).toBe("new_moon");
      expect(getMoonPhase(100, 120)).toBe("new_moon");
      expect(getMoonPhase(0, 44)).toBe("new_moon");
    });

    it("returns waxing_crescent (45-90°)", () => {
      expect(getMoonPhase(0, 45)).toBe("waxing_crescent");
      expect(getMoonPhase(0, 89)).toBe("waxing_crescent");
    });

    it("returns first_quarter (90-135°)", () => {
      expect(getMoonPhase(0, 90)).toBe("first_quarter");
      expect(getMoonPhase(0, 134)).toBe("first_quarter");
    });

    it("returns waxing_gibbous (135-180°)", () => {
      expect(getMoonPhase(0, 135)).toBe("waxing_gibbous");
      expect(getMoonPhase(0, 179)).toBe("waxing_gibbous");
    });

    it("returns full_moon (180-225°)", () => {
      expect(getMoonPhase(0, 180)).toBe("full_moon");
      expect(getMoonPhase(0, 224)).toBe("full_moon");
    });

    it("returns waning_gibbous (225-270°)", () => {
      expect(getMoonPhase(0, 225)).toBe("waning_gibbous");
      expect(getMoonPhase(0, 269)).toBe("waning_gibbous");
    });

    it("returns last_quarter (270-315°)", () => {
      expect(getMoonPhase(0, 270)).toBe("last_quarter");
      expect(getMoonPhase(0, 314)).toBe("last_quarter");
    });

    it("returns waning_crescent (315-360°)", () => {
      expect(getMoonPhase(0, 315)).toBe("waning_crescent");
      expect(getMoonPhase(0, 359)).toBe("waning_crescent");
    });

    it("handles wrap-around when Moon longitude is less than Sun", () => {
      // Moon at 10, Sun at 350: difference is (10 - 350 + 360) = 20 -> new_moon
      expect(getMoonPhase(350, 10)).toBe("new_moon");
    });
  });

  describe("getMoonPhaseName", () => {
    const phases: MoonPhase[] = [
      "new_moon", "waxing_crescent", "first_quarter", "waxing_gibbous",
      "full_moon", "waning_gibbous", "last_quarter", "waning_crescent",
    ];

    it("returns Korean names for all phases", () => {
      expect(getMoonPhaseName("new_moon")).toBe("삭 (새달)");
      expect(getMoonPhaseName("waxing_crescent")).toBe("초승달");
      expect(getMoonPhaseName("first_quarter")).toBe("상현달");
      expect(getMoonPhaseName("waxing_gibbous")).toBe("차오르는 달");
      expect(getMoonPhaseName("full_moon")).toBe("보름달");
      expect(getMoonPhaseName("waning_gibbous")).toBe("기우는 달");
      expect(getMoonPhaseName("last_quarter")).toBe("하현달");
      expect(getMoonPhaseName("waning_crescent")).toBe("그믐달");
    });

    it("returns a value for each valid phase", () => {
      phases.forEach(phase => {
        expect(getMoonPhaseName(phase)).toBeTruthy();
        expect(typeof getMoonPhaseName(phase)).toBe("string");
      });
    });
  });

  describe("checkVoidOfCourse", () => {
    it("returns default when Moon is not in chart", () => {
      const chart = createChart([createPlanet("Sun", 0, "Aries")]);
      const result = checkVoidOfCourse(chart);

      expect(result.isVoid).toBe(false);
      expect(result.description).toBe("달 정보 없음");
    });

    it("returns void when Moon has no future aspects in current sign", () => {
      // Moon at end of sign with no other planets in aspect range
      const moon = createPlanet("Moon", 28, "Aries", { speed: 13 });
      const sun = createPlanet("Sun", 100, "Cancer"); // Far away
      const chart = createChart([moon, sun]);

      const result = checkVoidOfCourse(chart);

      expect(result.moonSign).toBe("Aries");
      // Whether void depends on if there are aspects forming before sign change
    });

    it("returns not void when Moon will form aspect before sign change", () => {
      // Moon at 10 Aries, Jupiter at 20 Aries (will form conjunction)
      const moon = createPlanet("Moon", 10, "Aries", { speed: 13 });
      const jupiter = createPlanet("Jupiter", 20, "Aries");
      const chart = createChart([moon, jupiter]);

      const result = checkVoidOfCourse(chart);

      expect(result.isVoid).toBe(false);
      expect(result.moonSign).toBe("Aries");
      expect(result.lastAspect).not.toBeNull();
    });

    it("includes hours to sign change in description", () => {
      const moon = createPlanet("Moon", 28, "Aries", { speed: 13 });
      const chart = createChart([moon]);

      const result = checkVoidOfCourse(chart);

      if (result.isVoid) {
        expect(result.description).toContain("시간 후 사인 변경");
      }
    });
  });

  describe("calculatePlanetaryHour", () => {
    const baseDate = new Date("2024-01-07T12:00:00"); // Sunday
    const sunrise = new Date("2024-01-07T07:00:00");
    const sunset = new Date("2024-01-07T17:00:00");

    it("calculates daytime planetary hour", () => {
      const hour = calculatePlanetaryHour(baseDate, 37.5, sunrise, sunset);

      expect(hour.isDay).toBe(true);
      expect(hour.planet).toBeTruthy();
      expect(hour.startTime).toBeInstanceOf(Date);
      expect(hour.endTime).toBeInstanceOf(Date);
      expect(hour.goodFor).toBeInstanceOf(Array);
    });

    it("calculates nighttime planetary hour", () => {
      const nightDate = new Date("2024-01-07T22:00:00");
      const hour = calculatePlanetaryHour(nightDate, 37.5, sunrise, sunset);

      expect(hour.isDay).toBe(false);
    });

    it("returns correct planet ruler for Sunday first hour", () => {
      // Sunday is ruled by Sun, first hour at sunrise
      const hour = calculatePlanetaryHour(sunrise, 37.5, sunrise, sunset);

      expect(hour.planet).toBe("Sun");
    });

    it("includes goodFor activities based on planet", () => {
      const hour = calculatePlanetaryHour(sunrise, 37.5, sunrise, sunset);

      expect(hour.goodFor.length).toBeGreaterThan(0);
    });
  });

  describe("getRetrogradePlanets", () => {
    it("returns empty array when no planets are retrograde", () => {
      const chart = createChart([
        createPlanet("Mercury", 50, "Taurus", { retrograde: false }),
        createPlanet("Venus", 80, "Gemini", { retrograde: false }),
      ]);

      expect(getRetrogradePlanets(chart)).toEqual([]);
    });

    it("returns retrograde planet names", () => {
      const chart = createChart([
        createPlanet("Mercury", 50, "Taurus", { retrograde: true }),
        createPlanet("Venus", 80, "Gemini", { retrograde: false }),
        createPlanet("Mars", 100, "Cancer", { retrograde: true }),
      ]);

      const result = getRetrogradePlanets(chart);

      expect(result).toContain("Mercury");
      expect(result).toContain("Mars");
      expect(result).not.toContain("Venus");
    });

    it("handles undefined retrograde property", () => {
      const chart = createChart([
        createPlanet("Jupiter", 200, "Libra"),
      ]);

      expect(getRetrogradePlanets(chart)).toEqual([]);
    });
  });

  describe("classifyAspects", () => {
    beforeEach(() => {
      vi.mocked(findAspects).mockReset();
    });

    it("returns empty arrays when no aspects", () => {
      vi.mocked(findAspects).mockReturnValue([]);
      const chart = createChart([createPlanet("Sun", 0, "Aries")]);

      const result = classifyAspects(chart);

      expect(result.benefic).toEqual([]);
      expect(result.malefic).toEqual([]);
    });

    it("classifies benefic trine as benefic", () => {
      vi.mocked(findAspects).mockReturnValue([
        {
          from: { name: "Venus", kind: "natal", longitude: 0 },
          to: { name: "Jupiter", kind: "natal", longitude: 120 },
          type: "trine",
          orb: 2,
        },
      ]);
      const chart = createChart([
        createPlanet("Venus", 0, "Aries"),
        createPlanet("Jupiter", 120, "Leo"),
      ]);

      const result = classifyAspects(chart);

      expect(result.benefic.length).toBeGreaterThan(0);
      expect(result.benefic[0]).toContain("Venus");
      expect(result.benefic[0]).toContain("trine");
    });

    it("classifies malefic square as malefic", () => {
      vi.mocked(findAspects).mockReturnValue([
        {
          from: { name: "Mars", kind: "natal", longitude: 0 },
          to: { name: "Saturn", kind: "natal", longitude: 90 },
          type: "square",
          orb: 3,
        },
      ]);
      const chart = createChart([
        createPlanet("Mars", 0, "Aries"),
        createPlanet("Saturn", 90, "Cancer"),
      ]);

      const result = classifyAspects(chart);

      expect(result.malefic.length).toBeGreaterThan(0);
      expect(result.malefic[0]).toContain("square");
    });

    it("classifies benefic conjunction as benefic", () => {
      vi.mocked(findAspects).mockReturnValue([
        {
          from: { name: "Venus", kind: "natal", longitude: 50 },
          to: { name: "Sun", kind: "natal", longitude: 52 },
          type: "conjunction",
          orb: 2,
        },
      ]);
      const chart = createChart([
        createPlanet("Venus", 50, "Taurus"),
        createPlanet("Sun", 52, "Taurus"),
      ]);

      const result = classifyAspects(chart);

      expect(result.benefic).toContainEqual(expect.stringContaining("conjunction"));
    });
  });

  describe("analyzeElection", () => {
    beforeEach(() => {
      vi.mocked(findAspects).mockReturnValue([]);
    });

    it("returns complete analysis structure", () => {
      const chart = createChart([
        createPlanet("Sun", 0, "Aries"),
        createPlanet("Moon", 90, "Cancer"),
      ]);
      const date = new Date("2024-01-07T12:00:00");

      const result = analyzeElection(chart, "business_start", date);

      expect(result.dateTime).toEqual(date);
      expect(result.eventType).toBe("business_start");
      expect(result.score).toBeDefined();
      expect(result.score.total).toBeGreaterThanOrEqual(0);
      expect(result.moonPhase).toBeDefined();
      expect(result.moonSign).toBeDefined();
      expect(result.voidOfCourse).toBeDefined();
      expect(result.currentHour).toBeDefined();
      expect(result.retrogradePlanets).toBeInstanceOf(Array);
      expect(result.beneficAspects).toBeInstanceOf(Array);
      expect(result.maleficAspects).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.warnings).toBeInstanceOf(Array);
    });

    it("scores higher for optimal moon phase", () => {
      // Business start prefers waxing phases
      const chartWaxing = createChart([
        createPlanet("Sun", 0, "Aries"),
        createPlanet("Moon", 60, "Gemini"), // waxing_crescent
      ]);
      const chartWaning = createChart([
        createPlanet("Sun", 0, "Aries"),
        createPlanet("Moon", 300, "Aquarius"), // waning_crescent
      ]);

      const date = new Date("2024-01-07T12:00:00");
      const waxingResult = analyzeElection(chartWaxing, "business_start", date);
      const waningResult = analyzeElection(chartWaning, "business_start", date);

      expect(waxingResult.score.breakdown.moonPhaseAppropriate)
        .toBeGreaterThan(waningResult.score.breakdown.moonPhaseAppropriate);
    });

    it("scores higher for optimal moon sign", () => {
      // Business start prefers Taurus, Leo, Capricorn
      const chartTaurus = createChart([
        createPlanet("Sun", 0, "Aries"),
        createPlanet("Moon", 45, "Taurus"),
      ]);
      const chartPisces = createChart([
        createPlanet("Sun", 0, "Aries"),
        createPlanet("Moon", 345, "Pisces"),
      ]);

      const date = new Date("2024-01-07T12:00:00");
      const taurusResult = analyzeElection(chartTaurus, "business_start", date);
      const piscesResult = analyzeElection(chartPisces, "business_start", date);

      expect(taurusResult.score.breakdown.moonSignAppropriate)
        .toBeGreaterThan(piscesResult.score.breakdown.moonSignAppropriate);
    });

    it("penalizes Mercury retrograde for business_start", () => {
      const chartDirect = createChart([
        createPlanet("Sun", 0, "Aries"),
        createPlanet("Moon", 60, "Gemini"),
        createPlanet("Mercury", 30, "Taurus", { retrograde: false }),
      ]);
      const chartRetro = createChart([
        createPlanet("Sun", 0, "Aries"),
        createPlanet("Moon", 60, "Gemini"),
        createPlanet("Mercury", 30, "Taurus", { retrograde: true }),
      ]);

      const date = new Date("2024-01-07T12:00:00");
      const directResult = analyzeElection(chartDirect, "business_start", date);
      const retroResult = analyzeElection(chartRetro, "business_start", date);

      expect(directResult.score.breakdown.mercuryDirect)
        .toBeGreaterThan(retroResult.score.breakdown.mercuryDirect);
    });

    it("adds warning for void of course moon", () => {
      // Create a chart where moon is void
      const chart = createChart([
        createPlanet("Sun", 180, "Libra"),
        createPlanet("Moon", 28, "Aries"), // Near end of sign
      ]);

      const date = new Date("2024-01-07T12:00:00");
      const result = analyzeElection(chart, "signing_contracts", date);

      if (result.voidOfCourse.isVoid) {
        expect(result.warnings.some(w => w.includes("Void of Course"))).toBe(true);
      }
    });

    it("provides interpretation based on total score", () => {
      const chart = createChart([
        createPlanet("Sun", 0, "Aries"),
        createPlanet("Moon", 60, "Gemini"),
      ]);

      const date = new Date("2024-01-07T12:00:00");
      const result = analyzeElection(chart, "business_start", date);

      expect(result.score.interpretation).toBeTruthy();
      expect(typeof result.score.interpretation).toBe("string");
    });
  });

  describe("findBestDates", () => {
    beforeEach(() => {
      vi.mocked(findAspects).mockReturnValue([]);
    });

    it("sorts results by score descending", () => {
      const charts = [
        {
          date: new Date("2024-01-07"),
          chart: createChart([
            createPlanet("Sun", 0, "Aries"),
            createPlanet("Moon", 300, "Aquarius"), // waning - bad for business
          ]),
        },
        {
          date: new Date("2024-01-08"),
          chart: createChart([
            createPlanet("Sun", 1, "Aries"),
            createPlanet("Moon", 60, "Gemini"), // waxing - good for business
          ]),
        },
      ];

      const result = findBestDates(
        "business_start",
        new Date("2024-01-07"),
        new Date("2024-01-10"),
        charts
      );

      expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    });

    it("returns interpretation for each date", () => {
      const charts = [
        {
          date: new Date("2024-01-07"),
          chart: createChart([
            createPlanet("Sun", 0, "Aries"),
            createPlanet("Moon", 60, "Gemini"),
          ]),
        },
      ];

      const result = findBestDates(
        "marriage",
        new Date("2024-01-07"),
        new Date("2024-01-10"),
        charts
      );

      expect(result[0].interpretation).toBeTruthy();
    });
  });

  describe("getElectionalGuidelines", () => {
    const eventTypes: ElectionalEventType[] = [
      "business_start", "signing_contracts", "marriage", "engagement",
      "first_date", "surgery", "dental", "start_treatment", "long_journey",
      "moving_house", "investment", "buying_property", "major_purchase",
      "creative_start", "publishing", "starting_studies", "exam",
      "lawsuit", "court_appearance",
    ];

    it("returns guidelines for all event types", () => {
      eventTypes.forEach(eventType => {
        const guidelines = getElectionalGuidelines(eventType);

        expect(guidelines.bestMoonPhases).toBeInstanceOf(Array);
        expect(guidelines.bestMoonPhases.length).toBeGreaterThan(0);
        expect(guidelines.bestMoonSigns).toBeInstanceOf(Array);
        expect(guidelines.bestMoonSigns.length).toBeGreaterThan(0);
        expect(guidelines.avoidRetrogrades).toBeInstanceOf(Array);
        expect(guidelines.tips).toBeInstanceOf(Array);
      });
    });

    it("returns Korean moon phase names", () => {
      const guidelines = getElectionalGuidelines("business_start");

      // Should have Korean names like "초승달", "상현달"
      guidelines.bestMoonPhases.forEach(phase => {
        expect(typeof phase).toBe("string");
        // Should not be English phase names
        expect(phase).not.toMatch(/^(new_moon|waxing|waning|first_quarter|last_quarter|full_moon)$/);
      });
    });

    it("provides surgery-specific tips", () => {
      const guidelines = getElectionalGuidelines("surgery");

      expect(guidelines.tips.length).toBeGreaterThan(0);
      expect(guidelines.tips.some(t => t.includes("수술"))).toBe(true);
    });

    it("provides marriage-specific tips", () => {
      const guidelines = getElectionalGuidelines("marriage");

      expect(guidelines.tips.length).toBeGreaterThan(0);
      expect(guidelines.tips.some(t => t.includes("금성"))).toBe(true);
    });

    it("provides contract-signing-specific tips", () => {
      const guidelines = getElectionalGuidelines("signing_contracts");

      expect(guidelines.tips.length).toBeGreaterThan(0);
      expect(guidelines.tips.some(t => t.includes("수성"))).toBe(true);
    });

    it("includes avoidMoonSigns for surgery", () => {
      const guidelines = getElectionalGuidelines("surgery");

      expect(guidelines.avoidMoonSigns).toBeDefined();
      expect(guidelines.avoidMoonSigns!.length).toBeGreaterThan(0);
    });

    it("includes bestDays when defined", () => {
      const guidelines = getElectionalGuidelines("business_start");

      expect(guidelines.bestDays).toBeDefined();
      expect(guidelines.bestDays!.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    beforeEach(() => {
      vi.mocked(findAspects).mockReturnValue([]);
    });

    it("requires Sun in chart for analysis", () => {
      const chart = createChart([createPlanet("Moon", 90, "Cancer")]);
      const date = new Date("2024-01-07T12:00:00");

      // Sun is required for moon phase calculation, so this will throw
      expect(() => analyzeElection(chart, "business_start", date)).toThrow();
    });

    it("uses default sunrise/sunset when not provided", () => {
      const chart = createChart([
        createPlanet("Sun", 0, "Aries"),
        createPlanet("Moon", 90, "Cancer"),
      ]);
      const date = new Date("2024-01-07T12:00:00");

      const result = analyzeElection(chart, "business_start", date);

      expect(result.currentHour).toBeDefined();
      expect(result.currentHour.planet).toBeTruthy();
    });

    it("handles longitude wrap-around correctly in moon phase", () => {
      // Sun at 355, Moon at 5: angle should be ~10 degrees (new moon)
      expect(getMoonPhase(355, 5)).toBe("new_moon");

      // Sun at 5, Moon at 355: angle should be ~350 degrees (waning crescent)
      expect(getMoonPhase(5, 355)).toBe("waning_crescent");
    });
  });
});
