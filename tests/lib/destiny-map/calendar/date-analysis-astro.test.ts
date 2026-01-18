/**
 * Date Analysis Astro Tests
 * Tests for astrology analysis helper functions
 */

import { describe, it, expect, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/destiny-map/calendar/transit-analysis", () => ({
  analyzePlanetTransits: vi.fn(() => ({
    major: [],
    minor: [],
    score: 50,
  })),
  getMoonPhaseDetailed: vi.fn(() => ({
    phaseName: "waxingGibbous",
    illumination: 0.75,
    score: 70,
  })),
}));

vi.mock("@/lib/destiny-map/calendar/planetary-hours", () => ({
  getPlanetaryHourForDate: vi.fn(() => ({
    dayRuler: "Jupiter",
    currentHour: "Venus",
  })),
  checkVoidOfCourseMoon: vi.fn(() => ({
    isVoid: false,
    endsAt: null,
  })),
  checkEclipseImpact: vi.fn(() => ({
    hasImpact: false,
    type: null,
  })),
  getRetrogradePlanetsForDate: vi.fn(() => []),
  getSunSign: vi.fn(() => "Aries"),
}));

vi.mock("@/lib/destiny-map/calendar/temporal-scoring", () => ({
  getLunarPhase: vi.fn(() => ({
    phase: "waxingGibbous",
    age: 10,
    illumination: 0.75,
  })),
}));

import {
  analyzeAstroFactors,
  getMoonElement,
  analyzeElementHarmony,
  analyzeLunarPhaseFactors,
  analyzeRetrogradeFactors,
  analyzePlanetaryHourFactors,
  AstroAnalysisResult,
  ElementHarmonyResult,
  LunarPhaseFactors,
  RetrogradeFactors,
  PlanetaryHourFactors,
} from "@/lib/destiny-map/calendar/date-analysis-astro";

describe("Date Analysis Astro", () => {
  describe("analyzeAstroFactors", () => {
    const mockAstroProfile = {
      sunSign: "Leo",
      sunElement: "fire",
      sunLongitude: 125.5,
    };

    it("returns complete analysis result structure", () => {
      const result = analyzeAstroFactors(new Date(2025, 0, 15), mockAstroProfile);

      expect(result).toHaveProperty("lunarPhase");
      expect(result).toHaveProperty("moonPhaseDetailed");
      expect(result).toHaveProperty("planetTransits");
      expect(result).toHaveProperty("retrogradePlanets");
      expect(result).toHaveProperty("voidOfCourse");
      expect(result).toHaveProperty("eclipseImpact");
      expect(result).toHaveProperty("planetaryHour");
      expect(result).toHaveProperty("advancedAstroScore");
      expect(result).toHaveProperty("transitSunSign");
      expect(result).toHaveProperty("transitSunElement");
    });

    it("includes transit sun sign", () => {
      const result = analyzeAstroFactors(new Date(2025, 0, 15), mockAstroProfile);

      expect(result.transitSunSign).toBeDefined();
      expect(typeof result.transitSunSign).toBe("string");
    });

    it("includes transit sun element", () => {
      const result = analyzeAstroFactors(new Date(2025, 0, 15), mockAstroProfile);

      expect(result.transitSunElement).toBeDefined();
    });

    it("includes advanced astro score", () => {
      const result = analyzeAstroFactors(new Date(2025, 6, 15), mockAstroProfile);

      expect(typeof result.advancedAstroScore).toBe("number");
    });

    it("includes retrograde planets array", () => {
      const result = analyzeAstroFactors(new Date(2025, 3, 15), mockAstroProfile);

      expect(Array.isArray(result.retrogradePlanets)).toBe(true);
    });
  });

  describe("getMoonElement", () => {
    it("returns element based on month", () => {
      const element = getMoonElement(new Date(2025, 0, 15));
      expect(typeof element).toBe("string");
    });

    it("returns different elements for different months", () => {
      const elements = new Set<string>();

      for (let month = 0; month < 12; month++) {
        const element = getMoonElement(new Date(2025, month, 15));
        elements.add(element);
      }

      // Should have multiple different elements
      expect(elements.size).toBeGreaterThan(1);
    });

    it("returns valid element types", () => {
      const validElements = ["fire", "earth", "metal", "water", "wood"];

      for (let month = 0; month < 12; month++) {
        const element = getMoonElement(new Date(2025, month, 15));
        expect(validElements).toContain(element);
      }
    });
  });

  describe("analyzeElementHarmony", () => {
    it("returns same type for identical elements", () => {
      const result = analyzeElementHarmony("fire", "fire");

      expect(result.type).toBe("same");
      expect(result.factorKey).toBe("sameElement");
      expect(result.recommendations).toContain("confidence");
    });

    it("returns support type when transit generates natal", () => {
      // Wood generates Fire
      const result = analyzeElementHarmony("fire", "wood");

      expect(result.type).toBe("support");
      expect(result.factorKey).toBe("supportElement");
      expect(result.recommendations).toContain("learning");
    });

    it("returns giving type when natal generates transit", () => {
      // Fire generates Earth
      const result = analyzeElementHarmony("fire", "earth");

      expect(result.type).toBe("giving");
      expect(result.factorKey).toBe("givingElement");
      expect(result.recommendations).toContain("giving");
    });

    it("returns conflict type when transit controls natal", () => {
      // Water controls Fire
      const result = analyzeElementHarmony("fire", "water");

      expect(result.type).toBe("conflict");
      expect(result.factorKey).toBe("conflictElement");
      expect(result.warnings).toContain("stress");
    });

    it("returns control type when natal controls transit", () => {
      // Fire controls Metal
      const result = analyzeElementHarmony("fire", "metal");

      expect(result.type).toBe("control");
      expect(result.factorKey).toBe("controlElement");
      expect(result.recommendations).toContain("achievement");
    });

    it("returns neutral for unknown element", () => {
      const result = analyzeElementHarmony("unknown", "fire");

      expect(result.type).toBe("neutral");
      expect(result.factorKey).toBe("neutralElement");
    });

    describe("element cycles", () => {
      it("wood generates fire (support)", () => {
        const result = analyzeElementHarmony("fire", "wood");
        expect(result.type).toBe("support");
      });

      it("fire generates earth (giving)", () => {
        const result = analyzeElementHarmony("fire", "earth");
        expect(result.type).toBe("giving");
      });

      it("earth generates metal (giving)", () => {
        const result = analyzeElementHarmony("earth", "metal");
        expect(result.type).toBe("giving");
      });

      it("metal generates water (giving)", () => {
        const result = analyzeElementHarmony("metal", "water");
        expect(result.type).toBe("giving");
      });

      it("water generates wood (giving)", () => {
        const result = analyzeElementHarmony("water", "wood");
        expect(result.type).toBe("giving");
      });
    });
  });

  describe("analyzeLunarPhaseFactors", () => {
    it("returns new moon factors", () => {
      const result = analyzeLunarPhaseFactors("newMoon");

      expect(result.factorKey).toBe("lunarNewMoon");
      expect(result.recommendations).toContain("newBeginning");
      expect(result.recommendations).toContain("planning");
    });

    it("returns full moon factors", () => {
      const result = analyzeLunarPhaseFactors("fullMoon");

      expect(result.factorKey).toBe("lunarFullMoon");
      expect(result.recommendations).toContain("completion");
      expect(result.recommendations).toContain("celebration");
    });

    it("returns first quarter factors with warnings", () => {
      const result = analyzeLunarPhaseFactors("firstQuarter");

      expect(result.factorKey).toBe("lunarFirstQuarter");
      expect(result.warnings).toContain("tension");
      expect(result.warnings).toContain("challenge");
    });

    it("returns last quarter factors", () => {
      const result = analyzeLunarPhaseFactors("lastQuarter");

      expect(result.factorKey).toBe("lunarLastQuarter");
      expect(result.recommendations).toContain("reflection");
      expect(result.recommendations).toContain("release");
    });

    it("returns generic factor for other phases", () => {
      const result = analyzeLunarPhaseFactors("waxingCrescent");

      expect(result.factorKey).toBe("lunarwaxingCrescent");
      expect(result.recommendations).toBeUndefined();
      expect(result.warnings).toBeUndefined();
    });
  });

  describe("analyzeRetrogradeFactors", () => {
    it("returns empty arrays when no retrograde planets", () => {
      const result = analyzeRetrogradeFactors([]);

      expect(result.factorKeys).toHaveLength(0);
      expect(result.warningKeys).toHaveLength(0);
      expect(result.removeRecommendations).toHaveLength(0);
    });

    it("handles mercury retrograde", () => {
      const result = analyzeRetrogradeFactors(["mercury"]);

      expect(result.factorKeys).toContain("retrogradeMercury");
      expect(result.warningKeys).toContain("mercuryRetrograde");
      expect(result.removeRecommendations).toContain("contract");
      expect(result.removeRecommendations).toContain("documents");
      expect(result.removeRecommendations).toContain("interview");
    });

    it("handles venus retrograde", () => {
      const result = analyzeRetrogradeFactors(["venus"]);

      expect(result.factorKeys).toContain("retrogradeVenus");
      expect(result.warningKeys).toContain("venusRetrograde");
      expect(result.removeRecommendations).toContain("dating");
      expect(result.removeRecommendations).toContain("love");
      expect(result.removeRecommendations).toContain("finance");
      expect(result.removeRecommendations).toContain("investment");
    });

    it("handles mars retrograde", () => {
      const result = analyzeRetrogradeFactors(["mars"]);

      expect(result.factorKeys).toContain("retrogradeMars");
      expect(result.warningKeys).toContain("marsRetrograde");
    });

    it("handles multiple retrograde planets", () => {
      const result = analyzeRetrogradeFactors(["mercury", "venus", "mars"]);

      expect(result.factorKeys).toHaveLength(3);
      expect(result.warningKeys).toContain("mercuryRetrograde");
      expect(result.warningKeys).toContain("venusRetrograde");
      expect(result.warningKeys).toContain("marsRetrograde");
    });

    it("capitalizes planet names in factor keys", () => {
      const result = analyzeRetrogradeFactors(["jupiter"]);

      expect(result.factorKeys).toContain("retrogradeJupiter");
    });
  });

  describe("analyzePlanetaryHourFactors", () => {
    it("returns Jupiter factors", () => {
      const result = analyzePlanetaryHourFactors("Jupiter");

      expect(result.factorKey).toBe("dayRulerJupiter");
      expect(result.recommendations).toContain("expansion");
      expect(result.recommendations).toContain("luck");
    });

    it("returns Venus factors", () => {
      const result = analyzePlanetaryHourFactors("Venus");

      expect(result.factorKey).toBe("dayRulerVenus");
      expect(result.recommendations).toContain("love");
      expect(result.recommendations).toContain("beauty");
    });

    it("returns Mars factors", () => {
      const result = analyzePlanetaryHourFactors("Mars");

      expect(result.factorKey).toBe("dayRulerMars");
      expect(result.recommendations).toContain("action");
      expect(result.recommendations).toContain("courage");
    });

    it("returns Mercury factors", () => {
      const result = analyzePlanetaryHourFactors("Mercury");

      expect(result.factorKey).toBe("dayRulerMercury");
      expect(result.recommendations).toContain("communication");
      expect(result.recommendations).toContain("learning");
    });

    it("returns Saturn factors", () => {
      const result = analyzePlanetaryHourFactors("Saturn");

      expect(result.factorKey).toBe("dayRulerSaturn");
      expect(result.recommendations).toContain("discipline");
      expect(result.recommendations).toContain("structure");
    });

    it("returns Sun factors", () => {
      const result = analyzePlanetaryHourFactors("Sun");

      expect(result.factorKey).toBe("dayRulerSun");
      expect(result.recommendations).toContain("leadership");
      expect(result.recommendations).toContain("vitality");
    });

    it("returns Moon factors", () => {
      const result = analyzePlanetaryHourFactors("Moon");

      expect(result.factorKey).toBe("dayRulerMoon");
      expect(result.recommendations).toContain("intuition");
      expect(result.recommendations).toContain("emotion");
    });

    it("returns generic factor for unknown ruler", () => {
      const result = analyzePlanetaryHourFactors("Unknown");

      expect(result.factorKey).toBe("dayRulerUnknown");
      expect(result.recommendations).toBeUndefined();
    });
  });

  describe("Type interfaces", () => {
    it("AstroAnalysisResult has correct shape", () => {
      const result: AstroAnalysisResult = {
        lunarPhase: { phase: "full", age: 14, illumination: 1 },
        moonPhaseDetailed: { phaseName: "fullMoon", illumination: 1, score: 100 },
        planetTransits: { major: [], minor: [], score: 50 },
        retrogradePlanets: ["mercury"],
        voidOfCourse: { isVoid: false, endsAt: null },
        eclipseImpact: { hasImpact: false, type: null },
        planetaryHour: { dayRuler: "Sun", currentHour: "Moon" },
        advancedAstroScore: 75,
        transitSunSign: "Aries",
        transitSunElement: "fire",
      };

      expect(result.advancedAstroScore).toBe(75);
    });

    it("ElementHarmonyResult has correct shape", () => {
      const result: ElementHarmonyResult = {
        factorKey: "sameElement",
        type: "same",
        recommendations: ["confidence"],
      };

      expect(result.type).toBe("same");
    });

    it("LunarPhaseFactors has correct shape", () => {
      const result: LunarPhaseFactors = {
        factorKey: "lunarNewMoon",
        recommendations: ["planning"],
        warnings: undefined,
      };

      expect(result.factorKey).toBe("lunarNewMoon");
    });

    it("RetrogradeFactors has correct shape", () => {
      const result: RetrogradeFactors = {
        factorKeys: ["retrogradeMercury"],
        warningKeys: ["mercuryRetrograde"],
        removeRecommendations: ["contract"],
      };

      expect(result.factorKeys).toHaveLength(1);
    });

    it("PlanetaryHourFactors has correct shape", () => {
      const result: PlanetaryHourFactors = {
        factorKey: "dayRulerJupiter",
        recommendations: ["luck"],
      };

      expect(result.recommendations).toContain("luck");
    });
  });
});
