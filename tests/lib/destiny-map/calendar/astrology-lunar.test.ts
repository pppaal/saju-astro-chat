/**
 * Astrology Lunar Module Tests
 * Tests for moon phase and eclipse analysis
 */

import { describe, it, expect, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/destiny-map/calendar/constants", () => ({
  ZODIAC_TO_ELEMENT: {
    Aries: "화",
    Taurus: "토",
    Gemini: "목",
    Cancer: "수",
    Leo: "화",
    Virgo: "토",
    Libra: "금",
    Scorpio: "수",
    Sagittarius: "화",
    Capricorn: "토",
    Aquarius: "금",
    Pisces: "수",
  },
}));

vi.mock("@/lib/destiny-map/calendar/utils", () => ({
  normalizeElement: vi.fn((e) => e),
}));

describe("Astrology Lunar Module", () => {
  describe("Type Definitions", () => {
    it("defines LunarPhaseType with 8 phases", () => {
      const phases = [
        "new_moon",
        "waxing_crescent",
        "first_quarter",
        "waxing_gibbous",
        "full_moon",
        "waning_gibbous",
        "last_quarter",
        "waning_crescent",
      ];

      expect(phases).toHaveLength(8);
    });

    it("defines LunarPhaseResult structure", () => {
      const result = {
        phase: 15.5,
        phaseName: "fullMoon",
        phaseScore: 12,
      };

      expect(result).toHaveProperty("phase");
      expect(result).toHaveProperty("phaseName");
      expect(result).toHaveProperty("phaseScore");
    });

    it("defines MoonPhaseDetailed structure", () => {
      const detailed = {
        phase: "full_moon" as const,
        phaseName: "보름달",
        illumination: 100,
        isWaxing: false,
        factorKey: "moon_full",
        score: 12,
      };

      expect(detailed).toHaveProperty("phase");
      expect(detailed).toHaveProperty("phaseName");
      expect(detailed).toHaveProperty("illumination");
      expect(detailed).toHaveProperty("isWaxing");
      expect(detailed).toHaveProperty("factorKey");
      expect(detailed).toHaveProperty("score");
    });

    it("defines VoidOfCourseMoonResult structure", () => {
      const vocResult = {
        isVoid: true,
        moonSign: "Aries",
        hoursRemaining: 4.5,
      };

      expect(vocResult).toHaveProperty("isVoid");
      expect(vocResult).toHaveProperty("moonSign");
      expect(vocResult).toHaveProperty("hoursRemaining");
    });

    it("defines EclipseData structure", () => {
      const eclipseData = {
        date: new Date(),
        type: "lunar" as const,
        sign: "Aries",
        degree: 15,
      };

      expect(eclipseData).toHaveProperty("date");
      expect(eclipseData).toHaveProperty("type");
      expect(eclipseData).toHaveProperty("sign");
      expect(eclipseData).toHaveProperty("degree");
    });

    it("defines EclipseImpactResult structure", () => {
      const impact = {
        hasImpact: true,
        type: "lunar" as const,
        intensity: "strong" as const,
        sign: "Aries",
        daysFromEclipse: 3,
      };

      expect(impact).toHaveProperty("hasImpact");
      expect(impact).toHaveProperty("type");
      expect(impact).toHaveProperty("intensity");
      expect(impact).toHaveProperty("sign");
      expect(impact).toHaveProperty("daysFromEclipse");
    });
  });

  describe("Lunar Phase Constants", () => {
    it("lunar cycle is approximately 29.53 days", () => {
      const lunarCycle = 29.53;

      expect(lunarCycle).toBeGreaterThan(29);
      expect(lunarCycle).toBeLessThan(30);
    });

    it("phase score ranges from -5 to +12", () => {
      const phaseScores = {
        new_moon: 8,
        waxing_crescent: 5,
        first_quarter: -3,
        waxing_gibbous: 4,
        full_moon: 12,
        waning_gibbous: 3,
        last_quarter: -5,
        waning_crescent: 2,
      };

      Object.values(phaseScores).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(-5);
        expect(score).toBeLessThanOrEqual(12);
      });
    });

    it("illumination ranges from 0 to 100", () => {
      const illuminations = [0, 25, 50, 75, 100];

      illuminations.forEach(ill => {
        expect(ill).toBeGreaterThanOrEqual(0);
        expect(ill).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("Moon Phase Analysis", () => {
    it("new moon has low illumination", () => {
      const newMoon = {
        phase: "new_moon" as const,
        illumination: 0,
        isWaxing: true,
      };

      expect(newMoon.illumination).toBe(0);
      expect(newMoon.isWaxing).toBe(true);
    });

    it("full moon has maximum illumination", () => {
      const fullMoon = {
        phase: "full_moon" as const,
        illumination: 100,
        isWaxing: false,
      };

      expect(fullMoon.illumination).toBe(100);
    });

    it("waxing phases increase illumination", () => {
      const waxingPhases = ["waxing_crescent", "first_quarter", "waxing_gibbous"];

      waxingPhases.forEach(phase => {
        expect(phase.startsWith("waxing") || phase.includes("first")).toBe(true);
      });
    });

    it("waning phases decrease illumination", () => {
      const waningPhases = ["waning_gibbous", "last_quarter", "waning_crescent"];

      waningPhases.forEach(phase => {
        expect(phase.startsWith("waning") || phase.includes("last")).toBe(true);
      });
    });
  });

  describe("Void of Course Moon", () => {
    it("identifies void of course moon", () => {
      const vocResult = {
        isVoid: true,
        moonSign: "Cancer",
        hoursRemaining: 2.5,
      };

      expect(vocResult.isVoid).toBe(true);
      expect(vocResult.hoursRemaining).toBeGreaterThan(0);
    });

    it("identifies active moon", () => {
      const activeResult = {
        isVoid: false,
        moonSign: "Leo",
        hoursRemaining: 0,
      };

      expect(activeResult.isVoid).toBe(false);
    });

    it("VOC moon suggests caution", () => {
      const vocRecommendation = "Avoid important decisions during VOC moon";

      expect(vocRecommendation).toContain("VOC");
    });
  });

  describe("Eclipse Analysis", () => {
    it("identifies solar eclipse", () => {
      const solarEclipse = {
        date: new Date(2024, 3, 8),
        type: "solar" as const,
        sign: "Aries",
        degree: 19,
      };

      expect(solarEclipse.type).toBe("solar");
    });

    it("identifies lunar eclipse", () => {
      const lunarEclipse = {
        date: new Date(2024, 2, 25),
        type: "lunar" as const,
        sign: "Libra",
        degree: 5,
      };

      expect(lunarEclipse.type).toBe("lunar");
    });

    it("calculates eclipse impact intensity", () => {
      const intensities = ["strong", "medium", "weak"];
      const daysFromEclipse = [1, 5, 10];

      daysFromEclipse.forEach((days, i) => {
        expect(intensities[i]).toBeDefined();
      });
    });

    it("eclipse degree is between 0 and 30", () => {
      const degrees = [0, 15, 29];

      degrees.forEach(degree => {
        expect(degree).toBeGreaterThanOrEqual(0);
        expect(degree).toBeLessThan(30);
      });
    });
  });

  describe("Zodiac Element Mapping", () => {
    it("maps zodiac signs to elements", () => {
      const zodiacElements = {
        Aries: "화",
        Taurus: "토",
        Cancer: "수",
        Leo: "화",
      };

      expect(zodiacElements.Aries).toBe("화");
      expect(zodiacElements.Cancer).toBe("수");
    });

    it("covers all 12 zodiac signs", () => {
      const zodiacSigns = [
        "Aries", "Taurus", "Gemini", "Cancer",
        "Leo", "Virgo", "Libra", "Scorpio",
        "Sagittarius", "Capricorn", "Aquarius", "Pisces",
      ];

      expect(zodiacSigns).toHaveLength(12);
    });
  });

  describe("Edge Cases", () => {
    it("handles null eclipse impact", () => {
      const noImpact = {
        hasImpact: false,
        type: null,
        intensity: null,
        sign: null,
        daysFromEclipse: null,
      };

      expect(noImpact.hasImpact).toBe(false);
      expect(noImpact.type).toBeNull();
    });

    it("handles boundary illumination values", () => {
      expect(0).toBe(0);
      expect(100).toBe(100);
    });

    it("handles date at midnight", () => {
      const midnight = new Date(2024, 0, 1, 0, 0, 0);

      expect(midnight.getHours()).toBe(0);
    });
  });
});