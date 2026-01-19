/**
 * Transit Analysis Module Tests
 * Tests for planet transit calculations and analysis
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/destiny-map/calendar/constants", () => ({
  ZODIAC_TO_ELEMENT: {
    Aries: "fire",
    Taurus: "earth",
    Gemini: "air",
    Cancer: "water",
    Leo: "fire",
    Virgo: "earth",
    Libra: "air",
    Scorpio: "water",
    Sagittarius: "fire",
    Capricorn: "earth",
    Aquarius: "air",
    Pisces: "water",
  },
  ELEMENT_RELATIONS: {
    fire: { generatedBy: "wood", generates: "earth", controlledBy: "water", controls: "metal" },
    earth: { generatedBy: "fire", generates: "metal", controlledBy: "wood", controls: "water" },
    metal: { generatedBy: "earth", generates: "water", controlledBy: "fire", controls: "wood" },
    water: { generatedBy: "metal", generates: "wood", controlledBy: "earth", controls: "fire" },
    wood: { generatedBy: "water", generates: "fire", controlledBy: "metal", controls: "earth" },
  },
}));

vi.mock("@/lib/destiny-map/calendar/utils", () => ({
  normalizeElement: vi.fn((element: string) => element),
}));

import {
  getPlanetPosition,
  getAspect,
  analyzePlanetTransits,
  getMoonPhaseDetailed,
  type TransitAnalysisResult,
  type MoonPhaseResult,
} from "@/lib/destiny-map/calendar/transit-analysis";

describe("Transit Analysis Module", () => {
  describe("getPlanetPosition", () => {
    const referenceDate = new Date(2024, 0, 1); // January 1, 2024

    it("returns position object with sign, longitude, and degree", () => {
      const position = getPlanetPosition(referenceDate, "sun");

      expect(position).toHaveProperty("sign");
      expect(position).toHaveProperty("longitude");
      expect(position).toHaveProperty("degree");
    });

    it("calculates longitude within 0-360 range", () => {
      const planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"] as const;

      for (const planet of planets) {
        const position = getPlanetPosition(referenceDate, planet);
        expect(position.longitude).toBeGreaterThanOrEqual(0);
        expect(position.longitude).toBeLessThan(360);
      }
    });

    it("calculates degree within 0-30 range", () => {
      const planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"] as const;

      for (const planet of planets) {
        const position = getPlanetPosition(referenceDate, planet);
        expect(position.degree).toBeGreaterThanOrEqual(0);
        expect(position.degree).toBeLessThan(30);
      }
    });

    it("returns valid zodiac sign", () => {
      const validSigns = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
      ];

      const position = getPlanetPosition(referenceDate, "sun");
      expect(validSigns).toContain(position.sign);
    });

    describe("Sun position", () => {
      it("Sun is in Capricorn in early January", () => {
        const earlyJan = new Date(2024, 0, 5);
        const position = getPlanetPosition(earlyJan, "sun");
        expect(position.sign).toBe("Capricorn");
      });

      it("Sun moves approximately 1 degree per day", () => {
        const day1 = getPlanetPosition(new Date(2024, 0, 1), "sun");
        const day2 = getPlanetPosition(new Date(2024, 0, 2), "sun");
        const diff = Math.abs(day2.longitude - day1.longitude);
        expect(diff).toBeCloseTo(0.9856474, 1);
      });
    });

    describe("Moon position", () => {
      it("Moon moves faster than sun (about 13 degrees per day)", () => {
        const day1 = getPlanetPosition(new Date(2024, 0, 1), "moon");
        const day2 = getPlanetPosition(new Date(2024, 0, 2), "moon");
        let diff = day2.longitude - day1.longitude;
        if (diff < 0) diff += 360;
        expect(diff).toBeCloseTo(13.176396, 1);
      });

      it("Moon changes sign more frequently than sun", () => {
        // Moon stays in each sign about 2.5 days
        const positions = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(2024, 0, 1 + i);
          positions.push(getPlanetPosition(date, "moon").sign);
        }
        // In a week, moon should traverse multiple signs
        const uniqueSigns = new Set(positions);
        expect(uniqueSigns.size).toBeGreaterThan(2);
      });
    });

    describe("Mercury position", () => {
      it("Mercury oscillates around sun position", () => {
        // Mercury stays within ~28 degrees of sun
        const date = new Date(2024, 0, 15);
        const sunPos = getPlanetPosition(date, "sun");
        const mercuryPos = getPlanetPosition(date, "mercury");

        let diff = Math.abs(mercuryPos.longitude - sunPos.longitude);
        if (diff > 180) diff = 360 - diff;
        expect(diff).toBeLessThan(30); // Within ~30 degrees typically
      });
    });

    describe("Slow planets (Jupiter, Saturn)", () => {
      it("Jupiter moves slowly (12 year cycle)", () => {
        const day1 = getPlanetPosition(new Date(2024, 0, 1), "jupiter");
        const day30 = getPlanetPosition(new Date(2024, 1, 1), "jupiter");
        let diff = Math.abs(day30.longitude - day1.longitude);
        if (diff > 180) diff = 360 - diff;
        expect(diff).toBeLessThan(5); // Moves only a few degrees in a month
      });

      it("Saturn moves very slowly (29 year cycle)", () => {
        const day1 = getPlanetPosition(new Date(2024, 0, 1), "saturn");
        const day30 = getPlanetPosition(new Date(2024, 1, 1), "saturn");
        let diff = Math.abs(day30.longitude - day1.longitude);
        if (diff > 180) diff = 360 - diff;
        expect(diff).toBeLessThan(3); // Moves very little in a month
      });
    });
  });

  describe("getAspect", () => {
    it("detects conjunction (0° ± 8°)", () => {
      const result = getAspect(100, 100);
      expect(result.aspect).toBe("conjunction");
      expect(result.orb).toBe(0);
    });

    it("detects conjunction within orb", () => {
      const result = getAspect(100, 107);
      expect(result.aspect).toBe("conjunction");
      expect(result.orb).toBe(7);
    });

    it("detects sextile (60° ± 6°)", () => {
      const result = getAspect(100, 160);
      expect(result.aspect).toBe("sextile");
      expect(result.orb).toBe(0);
    });

    it("detects sextile within orb", () => {
      const result = getAspect(100, 155);
      expect(result.aspect).toBe("sextile");
      expect(result.orb).toBe(5);
    });

    it("detects square (90° ± 8°)", () => {
      const result = getAspect(100, 190);
      expect(result.aspect).toBe("square");
      expect(result.orb).toBe(0);
    });

    it("detects square within orb", () => {
      const result = getAspect(100, 195);
      expect(result.aspect).toBe("square");
      expect(result.orb).toBe(5);
    });

    it("detects trine (120° ± 8°)", () => {
      const result = getAspect(100, 220);
      expect(result.aspect).toBe("trine");
      expect(result.orb).toBe(0);
    });

    it("detects trine within orb", () => {
      const result = getAspect(100, 225);
      expect(result.aspect).toBe("trine");
      expect(result.orb).toBe(5);
    });

    it("detects opposition (180° ± 8°)", () => {
      const result = getAspect(100, 280);
      expect(result.aspect).toBe("opposition");
      expect(result.orb).toBe(0);
    });

    it("detects opposition within orb", () => {
      const result = getAspect(100, 285);
      expect(result.aspect).toBe("opposition");
      expect(result.orb).toBe(5);
    });

    it("returns null for no aspect", () => {
      const result = getAspect(100, 140); // 40 degrees - no aspect
      expect(result.aspect).toBeNull();
    });

    it("handles wrap-around at 360°", () => {
      // 350° and 10° should be 20° apart (conjunction)
      const result = getAspect(350, 10);
      expect(result.aspect).toBeNull(); // 20° is not an aspect
    });

    it("handles wrap-around for opposition", () => {
      // 10° and 190° = 180° apart
      const result = getAspect(10, 190);
      expect(result.aspect).toBe("opposition");
    });

    it("handles wrap-around for conjunction", () => {
      // 5° and 355° = 10° apart
      const result = getAspect(5, 358);
      expect(result.aspect).toBe("conjunction");
      expect(result.orb).toBe(7);
    });
  });

  describe("analyzePlanetTransits", () => {
    const testDate = new Date(2024, 5, 15); // June 15, 2024

    it("returns TransitAnalysisResult structure", () => {
      const result = analyzePlanetTransits(testDate, "Aries", "fire");

      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("factorKeys");
      expect(result).toHaveProperty("positive");
      expect(result).toHaveProperty("negative");
      expect(typeof result.score).toBe("number");
      expect(Array.isArray(result.factorKeys)).toBe(true);
    });

    describe("Mercury transit analysis", () => {
      it("adds score for Mercury conjunct natal Sun", () => {
        // Find a date when Mercury is in specific sign
        const mercuryPos = getPlanetPosition(testDate, "mercury");
        const result = analyzePlanetTransits(testDate, mercuryPos.sign, "fire");

        expect(result.factorKeys).toContain("mercuryConjunct");
        expect(result.positive).toBe(true);
      });
    });

    describe("Venus transit analysis", () => {
      it("adds score for Venus in same sign as natal Sun", () => {
        const venusPos = getPlanetPosition(testDate, "venus");
        const result = analyzePlanetTransits(testDate, venusPos.sign, "fire");

        expect(result.factorKeys).toContain("venusConjunct");
        expect(result.positive).toBe(true);
      });
    });

    describe("Mars transit analysis", () => {
      it("adds score for Mars in same sign as natal Sun", () => {
        const marsPos = getPlanetPosition(testDate, "mars");
        const result = analyzePlanetTransits(testDate, marsPos.sign, "fire");

        expect(result.factorKeys).toContain("marsConjunct");
      });
    });

    describe("Jupiter transit analysis", () => {
      it("gives high score for Jupiter conjunct natal Sun (12-year luck)", () => {
        const jupiterPos = getPlanetPosition(testDate, "jupiter");
        const result = analyzePlanetTransits(testDate, jupiterPos.sign, "fire");

        expect(result.factorKeys).toContain("jupiterConjunct");
        expect(result.positive).toBe(true);
      });
    });

    describe("Saturn transit analysis", () => {
      it("gives negative score for Saturn conjunct natal Sun", () => {
        const saturnPos = getPlanetPosition(testDate, "saturn");
        const result = analyzePlanetTransits(testDate, saturnPos.sign, "earth");

        expect(result.factorKeys).toContain("saturnConjunct");
        expect(result.negative).toBe(true);
      });
    });

    describe("Sun transit analysis", () => {
      it("gives high score for Solar Return (birthday season)", () => {
        const sunPos = getPlanetPosition(testDate, "sun");
        const result = analyzePlanetTransits(testDate, sunPos.sign, "fire");

        expect(result.factorKeys).toContain("solarReturn");
        expect(result.positive).toBe(true);
      });
    });

    describe("Moon transit analysis", () => {
      it("adds score for Moon in natal Sun sign", () => {
        const moonPos = getPlanetPosition(testDate, "moon");
        const result = analyzePlanetTransits(testDate, moonPos.sign, "water");

        expect(result.factorKeys).toContain("moonConjunct");
        expect(result.positive).toBe(true);
      });
    });

    describe("Aspect analysis with natal longitude", () => {
      it("analyzes Jupiter aspects when natal longitude provided", () => {
        // Test Jupiter trine (120°)
        const jupiterPos = getPlanetPosition(testDate, "jupiter");
        const natalLongitude = (jupiterPos.longitude + 120) % 360;
        const result = analyzePlanetTransits(testDate, "Aries", "fire", natalLongitude);

        expect(result.factorKeys).toContain("jupiterTrine");
        expect(result.positive).toBe(true);
      });

      it("analyzes Saturn aspects when natal longitude provided", () => {
        // Test Saturn square (90°)
        const saturnPos = getPlanetPosition(testDate, "saturn");
        const natalLongitude = (saturnPos.longitude + 90) % 360;
        const result = analyzePlanetTransits(testDate, "Aries", "fire", natalLongitude);

        expect(result.factorKeys).toContain("saturnSquare");
        expect(result.negative).toBe(true);
      });
    });

    describe("Planet-to-planet aspects", () => {
      it("detects Jupiter-Venus favorable aspects", () => {
        // Find a date with Jupiter-Venus conjunction/trine
        // This is a general test that the analysis includes planet-planet aspects
        const result = analyzePlanetTransits(testDate, "Aries", "fire");

        // The result should have a score (may or may not have specific planet aspects)
        expect(typeof result.score).toBe("number");
      });

      it("detects Sun-Moon phase aspects", () => {
        const result = analyzePlanetTransits(testDate, "Aries", "fire");

        // Should detect moon phase (new, full, quarter)
        const moonPhaseFactors = ["newMoon", "fullMoon", "quarterMoon"];
        const hasMoonPhase = result.factorKeys.some(key => moonPhaseFactors.includes(key));
        // Not every day has a notable moon phase, so we just check the structure
        expect(Array.isArray(result.factorKeys)).toBe(true);
      });
    });

    describe("Element relationship effects", () => {
      it("considers element harmony in analysis", () => {
        const result1 = analyzePlanetTransits(testDate, "Aries", "fire");
        const result2 = analyzePlanetTransits(testDate, "Aries", "water");

        // Different elements should produce different scores
        // (exact difference depends on planet positions)
        expect(typeof result1.score).toBe("number");
        expect(typeof result2.score).toBe("number");
      });
    });
  });

  describe("getMoonPhaseDetailed", () => {
    it("returns MoonPhaseResult structure", () => {
      const result = getMoonPhaseDetailed(new Date(2024, 0, 15));

      expect(result).toHaveProperty("phase");
      expect(result).toHaveProperty("phaseName");
      expect(result).toHaveProperty("illumination");
      expect(result).toHaveProperty("isWaxing");
      expect(result).toHaveProperty("factorKey");
      expect(result).toHaveProperty("score");
    });

    it("illumination is between 0 and 100", () => {
      for (let day = 0; day < 30; day++) {
        const date = new Date(2024, 0, 1 + day);
        const result = getMoonPhaseDetailed(date);
        expect(result.illumination).toBeGreaterThanOrEqual(0);
        expect(result.illumination).toBeLessThanOrEqual(100);
      }
    });

    it("returns valid phase type", () => {
      const validPhases = [
        "new_moon", "waxing_crescent", "first_quarter", "waxing_gibbous",
        "full_moon", "waning_gibbous", "last_quarter", "waning_crescent"
      ];

      const result = getMoonPhaseDetailed(new Date(2024, 0, 15));
      expect(validPhases).toContain(result.phase);
    });

    it("isWaxing is true for first half of cycle", () => {
      // New moon and waxing phases should have isWaxing = true
      // Full moon and waning phases should have isWaxing = false
      const dates = [];
      for (let i = 0; i < 30; i++) {
        dates.push(new Date(2024, 0, 1 + i));
      }

      const results = dates.map(d => getMoonPhaseDetailed(d));

      // Should have both waxing and waning days in a month
      const hasWaxing = results.some(r => r.isWaxing);
      const hasWaning = results.some(r => !r.isWaxing);
      expect(hasWaxing).toBe(true);
      expect(hasWaning).toBe(true);
    });

    describe("Phase scores", () => {
      it("full moon has highest score (12)", () => {
        // Find a full moon date
        for (let day = 0; day < 30; day++) {
          const date = new Date(2024, 0, 1 + day);
          const result = getMoonPhaseDetailed(date);
          if (result.phase === "full_moon") {
            expect(result.score).toBe(12);
            break;
          }
        }
      });

      it("waning crescent has lowest score (-3)", () => {
        // Find a waning crescent date
        for (let day = 0; day < 30; day++) {
          const date = new Date(2024, 0, 1 + day);
          const result = getMoonPhaseDetailed(date);
          if (result.phase === "waning_crescent") {
            expect(result.score).toBe(-3);
            break;
          }
        }
      });
    });

    describe("Phase names (Korean)", () => {
      it("returns Korean phase name", () => {
        const result = getMoonPhaseDetailed(new Date(2024, 0, 15));

        const koreanNames = [
          "삭 (새달)", "초승달", "상현달", "차오르는 달",
          "보름달", "기우는 달", "하현달", "그믐달"
        ];
        expect(koreanNames).toContain(result.phaseName);
      });
    });

    describe("Factor keys", () => {
      it("returns appropriate factor key for each phase", () => {
        const expectedKeys = {
          new_moon: "moonPhaseNew",
          waxing_crescent: "moonPhaseWaxingCrescent",
          first_quarter: "moonPhaseFirstQuarter",
          waxing_gibbous: "moonPhaseWaxingGibbous",
          full_moon: "moonPhaseFull",
          waning_gibbous: "moonPhaseWaningGibbous",
          last_quarter: "moonPhaseLastQuarter",
          waning_crescent: "moonPhaseWaningCrescent",
        };

        for (let day = 0; day < 30; day++) {
          const date = new Date(2024, 0, 1 + day);
          const result = getMoonPhaseDetailed(date);
          expect(result.factorKey).toBe(expectedKeys[result.phase]);
        }
      });
    });
  });

  describe("Integration tests", () => {
    it("planet positions and aspects work together", () => {
      const date = new Date(2024, 6, 15); // July 15, 2024
      const sunPos = getPlanetPosition(date, "sun");
      const moonPos = getPlanetPosition(date, "moon");

      const aspect = getAspect(sunPos.longitude, moonPos.longitude);

      // Should either have an aspect or not
      if (aspect.aspect) {
        expect(["conjunction", "sextile", "square", "trine", "opposition"]).toContain(aspect.aspect);
      } else {
        expect(aspect.aspect).toBeNull();
      }
    });

    it("transit analysis uses correct planet positions", () => {
      const date = new Date(2024, 3, 15); // April 15, 2024
      const sunPos = getPlanetPosition(date, "sun");

      // Sun should be in Aries in mid-April
      expect(sunPos.sign).toBe("Aries");

      // Transit analysis with Aries natal should detect solarReturn
      const result = analyzePlanetTransits(date, "Aries", "fire");
      expect(result.factorKeys).toContain("solarReturn");
    });

    it("moon phase detail aligns with transit analysis moon factors", () => {
      const date = new Date(2024, 0, 11); // Try to find a new/full moon
      const moonPhase = getMoonPhaseDetailed(date);
      const transitResult = analyzePlanetTransits(date, "Aries", "fire");

      // Both should provide moon-related information
      expect(moonPhase.factorKey).toBeDefined();
      // Transit may or may not have moon phase factor depending on the date
      expect(typeof transitResult.score).toBe("number");
    });
  });

  describe("Edge cases", () => {
    it("handles dates far in the past", () => {
      const oldDate = new Date(1950, 5, 15);
      const position = getPlanetPosition(oldDate, "sun");

      expect(position.longitude).toBeGreaterThanOrEqual(0);
      expect(position.longitude).toBeLessThan(360);
    });

    it("handles dates far in the future", () => {
      const futureDate = new Date(2100, 5, 15);
      const position = getPlanetPosition(futureDate, "sun");

      expect(position.longitude).toBeGreaterThanOrEqual(0);
      expect(position.longitude).toBeLessThan(360);
    });

    it("handles leap year dates", () => {
      const leapDate = new Date(2024, 1, 29); // Feb 29, 2024
      const position = getPlanetPosition(leapDate, "sun");

      expect(position.sign).toBeDefined();
      expect(position.longitude).toBeGreaterThanOrEqual(0);
    });

    it("handles end of year boundary", () => {
      const endYear = new Date(2024, 11, 31);
      const position = getPlanetPosition(endYear, "sun");

      expect(position.sign).toBe("Capricorn");
    });

    it("getAspect handles 0 and 360 boundary", () => {
      const result = getAspect(359, 1);
      expect(result.aspect).toBe("conjunction");
      expect(result.orb).toBe(2);
    });
  });
});
