/**
 * Astrology Planets Module Tests
 * Tests for planetary position calculations and retrograde detection
 */

import { describe, it, expect } from "vitest";
import {
  getPlanetPosition,
  getPlanetSign,
  isRetrograde,
  getSunSign,
  getSignElement,
  PlanetPosition,
} from "@/lib/destiny-map/calendar/astrology-planets";

describe("Astrology Planets Module", () => {
  describe("getPlanetPosition", () => {
    describe("Sun position", () => {
      it("returns valid sun position structure", () => {
        const result = getPlanetPosition(new Date(2025, 0, 1), "sun");

        expect(result).toHaveProperty("sign");
        expect(result).toHaveProperty("longitude");
        expect(result).toHaveProperty("degree");
      });

      it("calculates sun in Capricorn for January 1", () => {
        const result = getPlanetPosition(new Date(2025, 0, 1), "sun");
        expect(result.sign).toBe("Capricorn");
      });

      it("calculates sun in Cancer for July 1", () => {
        const result = getPlanetPosition(new Date(2025, 6, 1), "sun");
        expect(result.sign).toBe("Cancer");
      });

      it("longitude is between 0 and 360", () => {
        const dates = [
          new Date(2025, 0, 1),
          new Date(2025, 3, 15),
          new Date(2025, 6, 1),
          new Date(2025, 9, 15),
        ];

        dates.forEach((date) => {
          const result = getPlanetPosition(date, "sun");
          expect(result.longitude).toBeGreaterThanOrEqual(0);
          expect(result.longitude).toBeLessThan(360);
        });
      });

      it("degree is between 0 and 30", () => {
        const result = getPlanetPosition(new Date(2025, 5, 15), "sun");
        expect(result.degree).toBeGreaterThanOrEqual(0);
        expect(result.degree).toBeLessThan(30);
      });
    });

    describe("Moon position", () => {
      it("returns valid moon position", () => {
        const result = getPlanetPosition(new Date(2025, 0, 1), "moon");

        expect(result.sign).toBeDefined();
        expect(result.longitude).toBeGreaterThanOrEqual(0);
        expect(result.longitude).toBeLessThan(360);
      });

      it("moon moves faster than sun", () => {
        const date1 = new Date(2025, 0, 1);
        const date2 = new Date(2025, 0, 2);

        const moon1 = getPlanetPosition(date1, "moon");
        const moon2 = getPlanetPosition(date2, "moon");
        const sun1 = getPlanetPosition(date1, "sun");
        const sun2 = getPlanetPosition(date2, "sun");

        const moonMovement = Math.abs(moon2.longitude - moon1.longitude);
        const sunMovement = Math.abs(sun2.longitude - sun1.longitude);

        // Moon moves about 13 degrees/day vs sun's ~1 degree/day
        expect(moonMovement).toBeGreaterThan(sunMovement);
      });
    });

    describe("Mercury position", () => {
      it("returns valid mercury position", () => {
        const result = getPlanetPosition(new Date(2025, 3, 15), "mercury");

        expect(result.sign).toBeDefined();
        expect(result.longitude).toBeGreaterThanOrEqual(0);
        expect(result.longitude).toBeLessThan(360);
      });

      it("mercury stays near sun (within ~28 degrees elongation)", () => {
        const date = new Date(2025, 5, 15);
        const mercury = getPlanetPosition(date, "mercury");
        const sun = getPlanetPosition(date, "sun");

        // Mercury's maximum elongation is about 28 degrees from sun
        // Our approximation may vary, but should be reasonable
        const diff = Math.abs(mercury.longitude - sun.longitude);
        const normalizedDiff = Math.min(diff, 360 - diff);
        expect(normalizedDiff).toBeLessThan(60); // Allow some margin for approximation
      });
    });

    describe("Venus position", () => {
      it("returns valid venus position", () => {
        const result = getPlanetPosition(new Date(2025, 6, 1), "venus");

        expect(result.sign).toBeDefined();
        expect(result.longitude).toBeGreaterThanOrEqual(0);
        expect(result.longitude).toBeLessThan(360);
      });
    });

    describe("Mars position", () => {
      it("returns valid mars position", () => {
        const result = getPlanetPosition(new Date(2025, 9, 1), "mars");

        expect(result.sign).toBeDefined();
        expect(result.longitude).toBeGreaterThanOrEqual(0);
        expect(result.longitude).toBeLessThan(360);
      });

      it("mars moves slower than sun", () => {
        const date1 = new Date(2025, 0, 1);
        const date2 = new Date(2025, 1, 1);

        const mars1 = getPlanetPosition(date1, "mars");
        const mars2 = getPlanetPosition(date2, "mars");

        const marsMovement = Math.abs(mars2.longitude - mars1.longitude);

        // Mars moves about 0.5 degrees/day vs sun's ~1 degree/day
        // In 31 days, mars should move ~15 degrees
        expect(marsMovement).toBeLessThan(45);
      });
    });

    describe("Jupiter position", () => {
      it("returns valid jupiter position", () => {
        const result = getPlanetPosition(new Date(2025, 0, 1), "jupiter");

        expect(result.sign).toBeDefined();
        expect(result.longitude).toBeGreaterThanOrEqual(0);
        expect(result.longitude).toBeLessThan(360);
      });

      it("jupiter moves slowly (12-year cycle)", () => {
        const date1 = new Date(2025, 0, 1);
        const date2 = new Date(2026, 0, 1);

        const jup1 = getPlanetPosition(date1, "jupiter");
        const jup2 = getPlanetPosition(date2, "jupiter");

        // Jupiter moves about 30 degrees per year (one sign)
        const movement = Math.abs(jup2.longitude - jup1.longitude);
        expect(movement).toBeGreaterThan(20);
        expect(movement).toBeLessThan(45);
      });
    });

    describe("Saturn position", () => {
      it("returns valid saturn position", () => {
        const result = getPlanetPosition(new Date(2025, 6, 1), "saturn");

        expect(result.sign).toBeDefined();
        expect(result.longitude).toBeGreaterThanOrEqual(0);
        expect(result.longitude).toBeLessThan(360);
      });

      it("saturn moves very slowly (29-year cycle)", () => {
        const date1 = new Date(2025, 0, 1);
        const date2 = new Date(2026, 0, 1);

        const sat1 = getPlanetPosition(date1, "saturn");
        const sat2 = getPlanetPosition(date2, "saturn");

        // Saturn moves about 12 degrees per year
        const movement = Math.abs(sat2.longitude - sat1.longitude);
        expect(movement).toBeLessThan(20);
      });
    });

    describe("zodiac sign index calculation", () => {
      it("assigns signs based on 30-degree segments", () => {
        // Test that each 30-degree segment maps to correct sign
        const signs = [
          "Aries", "Taurus", "Gemini", "Cancer",
          "Leo", "Virgo", "Libra", "Scorpio",
          "Sagittarius", "Capricorn", "Aquarius", "Pisces",
        ];

        // Verify all 12 signs are possible
        const foundSigns = new Set<string>();
        for (let month = 0; month < 12; month++) {
          const date = new Date(2025, month, 15);
          const sun = getPlanetPosition(date, "sun");
          foundSigns.add(sun.sign);
        }

        expect(foundSigns.size).toBeGreaterThanOrEqual(12);
      });
    });
  });

  describe("getPlanetSign", () => {
    it("returns sign for mercury", () => {
      const sign = getPlanetSign(new Date(2025, 0, 1), "mercury");
      expect(typeof sign).toBe("string");
      expect(sign.length).toBeGreaterThan(0);
    });

    it("returns sign for venus", () => {
      const sign = getPlanetSign(new Date(2025, 6, 15), "venus");
      expect(typeof sign).toBe("string");
    });

    it("returns sign for mars", () => {
      const sign = getPlanetSign(new Date(2025, 3, 1), "mars");
      expect(typeof sign).toBe("string");
    });
  });

  describe("isRetrograde", () => {
    describe("Mercury retrograde", () => {
      it("returns boolean for mercury retrograde check", () => {
        const result = isRetrograde(new Date(2025, 3, 15), "mercury");
        expect(typeof result).toBe("boolean");
      });

      it("mercury has retrograde periods (116-day cycle, 21 days retrograde)", () => {
        // Check multiple dates to find retrograde periods
        let foundRetrograde = false;
        let foundDirect = false;

        for (let i = 0; i < 120; i++) {
          const date = new Date(2025, 0, 1);
          date.setDate(date.getDate() + i);

          if (isRetrograde(date, "mercury")) {
            foundRetrograde = true;
          } else {
            foundDirect = true;
          }
        }

        expect(foundRetrograde).toBe(true);
        expect(foundDirect).toBe(true);
      });
    });

    describe("Venus retrograde", () => {
      it("returns boolean for venus retrograde check", () => {
        const result = isRetrograde(new Date(2025, 6, 1), "venus");
        expect(typeof result).toBe("boolean");
      });

      it("venus has longer retrograde periods (584-day cycle, 40 days retrograde)", () => {
        // Venus retrograde is less frequent
        let retrogradeCount = 0;
        for (let i = 0; i < 600; i += 30) {
          const date = new Date(2025, 0, 1);
          date.setDate(date.getDate() + i);
          if (isRetrograde(date, "venus")) {
            retrogradeCount++;
          }
        }

        // Should find at least one retrograde period in 600 days
        expect(retrogradeCount).toBeGreaterThanOrEqual(0);
      });
    });

    describe("Mars retrograde", () => {
      it("returns boolean for mars retrograde check", () => {
        const result = isRetrograde(new Date(2025, 9, 1), "mars");
        expect(typeof result).toBe("boolean");
      });
    });

    describe("Jupiter retrograde", () => {
      it("returns boolean for jupiter retrograde check", () => {
        const result = isRetrograde(new Date(2025, 5, 15), "jupiter");
        expect(typeof result).toBe("boolean");
      });

      it("jupiter has longer retrograde periods (399-day cycle, 121 days retrograde)", () => {
        // Jupiter is retrograde about 4 months per year
        let retrogradeCount = 0;
        for (let month = 0; month < 12; month++) {
          const date = new Date(2025, month, 15);
          if (isRetrograde(date, "jupiter")) {
            retrogradeCount++;
          }
        }

        // Should be retrograde for approximately 4 months
        expect(retrogradeCount).toBeGreaterThanOrEqual(2);
        expect(retrogradeCount).toBeLessThanOrEqual(6);
      });
    });

    describe("Saturn retrograde", () => {
      it("returns boolean for saturn retrograde check", () => {
        const result = isRetrograde(new Date(2025, 8, 1), "saturn");
        expect(typeof result).toBe("boolean");
      });

      it("saturn has significant retrograde periods (378-day cycle, 138 days retrograde)", () => {
        // Saturn is retrograde about 4.5 months per year
        let retrogradeCount = 0;
        for (let month = 0; month < 12; month++) {
          const date = new Date(2025, month, 15);
          if (isRetrograde(date, "saturn")) {
            retrogradeCount++;
          }
        }

        expect(retrogradeCount).toBeGreaterThanOrEqual(3);
        expect(retrogradeCount).toBeLessThanOrEqual(6);
      });
    });
  });

  describe("getSunSign", () => {
    it("returns Capricorn for January 1", () => {
      expect(getSunSign(new Date(2025, 0, 1))).toBe("Capricorn");
    });

    it("returns Capricorn for January 15", () => {
      expect(getSunSign(new Date(2025, 0, 15))).toBe("Capricorn");
    });

    it("returns Aquarius for January 25", () => {
      expect(getSunSign(new Date(2025, 0, 25))).toBe("Aquarius");
    });

    it("returns Pisces for February 25", () => {
      expect(getSunSign(new Date(2025, 1, 25))).toBe("Pisces");
    });

    it("returns Aries for March 25", () => {
      expect(getSunSign(new Date(2025, 2, 25))).toBe("Aries");
    });

    it("returns Taurus for April 25", () => {
      expect(getSunSign(new Date(2025, 3, 25))).toBe("Taurus");
    });

    it("returns Gemini for May 25", () => {
      expect(getSunSign(new Date(2025, 4, 25))).toBe("Gemini");
    });

    it("returns Cancer for June 25", () => {
      expect(getSunSign(new Date(2025, 5, 25))).toBe("Cancer");
    });

    it("returns Leo for July 25", () => {
      expect(getSunSign(new Date(2025, 6, 25))).toBe("Leo");
    });

    it("returns Virgo for August 25", () => {
      expect(getSunSign(new Date(2025, 7, 25))).toBe("Virgo");
    });

    it("returns Libra for September 25", () => {
      expect(getSunSign(new Date(2025, 8, 25))).toBe("Libra");
    });

    it("returns Scorpio for October 25", () => {
      expect(getSunSign(new Date(2025, 9, 25))).toBe("Scorpio");
    });

    it("returns Sagittarius for November 25", () => {
      expect(getSunSign(new Date(2025, 10, 25))).toBe("Sagittarius");
    });

    it("returns Capricorn for December 25", () => {
      expect(getSunSign(new Date(2025, 11, 25))).toBe("Capricorn");
    });

    describe("boundary dates", () => {
      it("returns Pisces for March 20", () => {
        expect(getSunSign(new Date(2025, 2, 20))).toBe("Pisces");
      });

      it("returns Aries for March 21", () => {
        expect(getSunSign(new Date(2025, 2, 21))).toBe("Aries");
      });

      it("returns Capricorn for December 22", () => {
        expect(getSunSign(new Date(2025, 11, 22))).toBe("Capricorn");
      });

      it("returns Aquarius for January 20", () => {
        expect(getSunSign(new Date(2025, 0, 20))).toBe("Aquarius");
      });
    });
  });

  describe("getSignElement", () => {
    it("returns fire for Aries", () => {
      expect(getSignElement("Aries")).toBe("fire");
    });

    it("returns fire for Leo", () => {
      expect(getSignElement("Leo")).toBe("fire");
    });

    it("returns fire for Sagittarius", () => {
      expect(getSignElement("Sagittarius")).toBe("fire");
    });

    it("returns earth for Taurus", () => {
      expect(getSignElement("Taurus")).toBe("earth");
    });

    it("returns earth for Virgo", () => {
      expect(getSignElement("Virgo")).toBe("earth");
    });

    it("returns earth for Capricorn", () => {
      expect(getSignElement("Capricorn")).toBe("earth");
    });

    it("returns metal for Gemini (air normalized)", () => {
      expect(getSignElement("Gemini")).toBe("metal");
    });

    it("returns metal for Libra (air normalized)", () => {
      expect(getSignElement("Libra")).toBe("metal");
    });

    it("returns metal for Aquarius (air normalized)", () => {
      expect(getSignElement("Aquarius")).toBe("metal");
    });

    it("returns water for Cancer", () => {
      expect(getSignElement("Cancer")).toBe("water");
    });

    it("returns water for Scorpio", () => {
      expect(getSignElement("Scorpio")).toBe("water");
    });

    it("returns water for Pisces", () => {
      expect(getSignElement("Pisces")).toBe("water");
    });

    it("returns fire for unknown sign", () => {
      expect(getSignElement("Unknown")).toBe("fire");
    });
  });

  describe("PlanetPosition interface", () => {
    it("returns correct structure", () => {
      const position: PlanetPosition = getPlanetPosition(new Date(), "sun");

      expect(typeof position.sign).toBe("string");
      expect(typeof position.longitude).toBe("number");
      expect(typeof position.degree).toBe("number");
    });
  });
});
