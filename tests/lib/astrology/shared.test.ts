
import {
  isSwissEphError,
  getMidpoint,
  findHouseForLongitude,
  createPlanetData,
} from "@/lib/astrology/foundation/shared";
import type { House } from "@/lib/astrology/foundation/types";

// Note: getPlanetList, natalToJD, jdToISO, isoToJD, getSwissEphFlags require actual Swiss Ephemeris
// which is server-only and cannot be tested in jsdom environment.
// These tests focus on pure functions that don't require Swiss Ephemeris.

describe("astrology shared utilities", () => {
  describe("isSwissEphError", () => {
    it("returns true for objects with error property", () => {
      expect(isSwissEphError({ error: "Some error" })).toBe(true);
    });

    it("returns false for objects without error property", () => {
      expect(isSwissEphError({ data: "some data" })).toBe(false);
      expect(isSwissEphError({ julianDayUT: 2460000 })).toBe(false);
    });

    it("returns false for non-objects", () => {
      expect(isSwissEphError(null)).toBe(false);
      expect(isSwissEphError(undefined)).toBe(false);
      expect(isSwissEphError("string")).toBe(false);
      expect(isSwissEphError(123)).toBe(false);
    });

    it("returns false for arrays", () => {
      expect(isSwissEphError([1, 2, 3])).toBe(false);
    });
  });

  describe("getMidpoint", () => {
    it("calculates midpoint between two longitudes in the same quadrant", () => {
      expect(getMidpoint(10, 30)).toBe(20);
      expect(getMidpoint(100, 120)).toBe(110);
    });

    it("calculates midpoint across 0 degrees (shorter arc)", () => {
      // 350 to 10: shorter arc is 20 degrees, midpoint at 0
      expect(getMidpoint(350, 10)).toBe(0);
      expect(getMidpoint(10, 350)).toBe(0);
    });

    it("calculates midpoint for angles 180 apart", () => {
      // 180 apart - midpoint could be either, but should be consistent
      const mid = getMidpoint(0, 180);
      expect(mid === 90 || mid === 270).toBe(true);
    });

    it("returns normalized value (0-360)", () => {
      const result = getMidpoint(350, 20);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(360);
    });

    it("handles same longitude", () => {
      expect(getMidpoint(90, 90)).toBe(90);
      expect(getMidpoint(0, 0)).toBe(0);
    });

    it("uses shorter arc for midpoint calculation", () => {
      // 10 to 350: shorter arc goes backwards (20 degrees), midpoint at 0
      expect(getMidpoint(10, 350)).toBe(0);

      // 30 to 270: shorter arc is 120 degrees going backwards (through 0), midpoint at 330
      // Actually: 30 to 270 direct is 240, reverse is 120, so reverse is shorter
      // Midpoint would be at 30 - 60 = 330 or equivalently 30 + (120/2 going backwards)
      const mid = getMidpoint(30, 270);
      expect(mid === 330 || mid === 150).toBe(true);
    });
  });

  describe("findHouseForLongitude", () => {
    // Mock houses with 30-degree equal houses starting at 0 degrees Aries
    const equalHouses: House[] = [
      { house: 1, cusp: 0, sign: "Aries", degree: 0, minute: 0 },
      { house: 2, cusp: 30, sign: "Taurus", degree: 0, minute: 0 },
      { house: 3, cusp: 60, sign: "Gemini", degree: 0, minute: 0 },
      { house: 4, cusp: 90, sign: "Cancer", degree: 0, minute: 0 },
      { house: 5, cusp: 120, sign: "Leo", degree: 0, minute: 0 },
      { house: 6, cusp: 150, sign: "Virgo", degree: 0, minute: 0 },
      { house: 7, cusp: 180, sign: "Libra", degree: 0, minute: 0 },
      { house: 8, cusp: 210, sign: "Scorpio", degree: 0, minute: 0 },
      { house: 9, cusp: 240, sign: "Sagittarius", degree: 0, minute: 0 },
      { house: 10, cusp: 270, sign: "Capricorn", degree: 0, minute: 0 },
      { house: 11, cusp: 300, sign: "Aquarius", degree: 0, minute: 0 },
      { house: 12, cusp: 330, sign: "Pisces", degree: 0, minute: 0 },
    ];

    it("finds house 1 for longitude at 0 degrees", () => {
      expect(findHouseForLongitude(0, equalHouses)).toBe(1);
    });

    it("finds house 1 for longitude at 15 degrees", () => {
      expect(findHouseForLongitude(15, equalHouses)).toBe(1);
    });

    it("finds house 2 for longitude at 30 degrees", () => {
      expect(findHouseForLongitude(30, equalHouses)).toBe(2);
    });

    it("finds house 7 for longitude at 180 degrees", () => {
      expect(findHouseForLongitude(180, equalHouses)).toBe(7);
    });

    it("finds house 12 for longitude at 345 degrees", () => {
      expect(findHouseForLongitude(345, equalHouses)).toBe(12);
    });

    it("handles longitude at house cusp boundaries", () => {
      // At exactly 30 degrees, should be in house 2
      expect(findHouseForLongitude(30, equalHouses)).toBe(2);
      // Just before 30, should be in house 1
      expect(findHouseForLongitude(29.99, equalHouses)).toBe(1);
    });

    it("normalizes longitude over 360", () => {
      expect(findHouseForLongitude(375, equalHouses)).toBe(1); // 375 - 360 = 15
      expect(findHouseForLongitude(390, equalHouses)).toBe(2); // 390 - 360 = 30
    });

    it("handles negative longitude", () => {
      expect(findHouseForLongitude(-15, equalHouses)).toBe(12); // -15 + 360 = 345
    });

    // Test with offset houses (ASC not at 0 degrees)
    it("works with offset house cusps", () => {
      const offsetHouses: House[] = [
        { house: 1, cusp: 15, sign: "Aries", degree: 15, minute: 0 },
        { house: 2, cusp: 45, sign: "Taurus", degree: 15, minute: 0 },
        { house: 3, cusp: 75, sign: "Gemini", degree: 15, minute: 0 },
        { house: 4, cusp: 105, sign: "Cancer", degree: 15, minute: 0 },
        { house: 5, cusp: 135, sign: "Leo", degree: 15, minute: 0 },
        { house: 6, cusp: 165, sign: "Virgo", degree: 15, minute: 0 },
        { house: 7, cusp: 195, sign: "Libra", degree: 15, minute: 0 },
        { house: 8, cusp: 225, sign: "Scorpio", degree: 15, minute: 0 },
        { house: 9, cusp: 255, sign: "Sagittarius", degree: 15, minute: 0 },
        { house: 10, cusp: 285, sign: "Capricorn", degree: 15, minute: 0 },
        { house: 11, cusp: 315, sign: "Aquarius", degree: 15, minute: 0 },
        { house: 12, cusp: 345, sign: "Pisces", degree: 15, minute: 0 },
      ];

      expect(findHouseForLongitude(0, offsetHouses)).toBe(12); // 0 is before house 1 cusp at 15
      expect(findHouseForLongitude(20, offsetHouses)).toBe(1); // 20 is in house 1 (15-45)
      expect(findHouseForLongitude(50, offsetHouses)).toBe(2); // 50 is in house 2 (45-75)
    });
  });

  describe("createPlanetData", () => {
    const mockHouses: House[] = [
      { house: 1, cusp: 0, sign: "Aries", degree: 0, minute: 0 },
      { house: 2, cusp: 30, sign: "Taurus", degree: 0, minute: 0 },
      { house: 3, cusp: 60, sign: "Gemini", degree: 0, minute: 0 },
      { house: 4, cusp: 90, sign: "Cancer", degree: 0, minute: 0 },
      { house: 5, cusp: 120, sign: "Leo", degree: 0, minute: 0 },
      { house: 6, cusp: 150, sign: "Virgo", degree: 0, minute: 0 },
      { house: 7, cusp: 180, sign: "Libra", degree: 0, minute: 0 },
      { house: 8, cusp: 210, sign: "Scorpio", degree: 0, minute: 0 },
      { house: 9, cusp: 240, sign: "Sagittarius", degree: 0, minute: 0 },
      { house: 10, cusp: 270, sign: "Capricorn", degree: 0, minute: 0 },
      { house: 11, cusp: 300, sign: "Aquarius", degree: 0, minute: 0 },
      { house: 12, cusp: 330, sign: "Pisces", degree: 0, minute: 0 },
    ];

    it("creates planet data with name and longitude", () => {
      const planet = createPlanetData("Sun", 45.5, mockHouses);
      expect(planet.name).toBe("Sun");
      expect(planet.longitude).toBe(45.5);
    });

    it("calculates sign from longitude", () => {
      const planet = createPlanetData("Sun", 45.5, mockHouses);
      expect(planet.sign).toBe("Taurus"); // 45.5 degrees is in Taurus
    });

    it("calculates degree within sign", () => {
      const planet = createPlanetData("Sun", 45.5, mockHouses);
      expect(planet.degree).toBe(15); // 45.5 - 30 = 15.5, floor = 15
    });

    it("calculates minute from decimal", () => {
      const planet = createPlanetData("Sun", 45.5, mockHouses);
      expect(planet.minute).toBe(30); // 0.5 * 60 = 30
    });

    it("determines house placement", () => {
      const planet = createPlanetData("Sun", 45.5, mockHouses);
      expect(planet.house).toBe(2); // 45.5 is in house 2 (30-60)
    });

    it("includes speed when provided", () => {
      const planet = createPlanetData("Sun", 45.5, mockHouses, 1.0);
      expect(planet.speed).toBe(1.0);
    });

    it("marks retrograde when speed is negative", () => {
      const planet = createPlanetData("Mercury", 120, mockHouses, -0.5);
      expect(planet.retrograde).toBe(true);
    });

    it("marks not retrograde when speed is positive", () => {
      const planet = createPlanetData("Mercury", 120, mockHouses, 1.5);
      expect(planet.retrograde).toBe(false);
    });

    it("retrograde is undefined when speed not provided", () => {
      const planet = createPlanetData("Mercury", 120, mockHouses);
      expect(planet.retrograde).toBeUndefined();
    });

    it("includes formatted string", () => {
      const planet = createPlanetData("Sun", 45.5, mockHouses);
      expect(planet.formatted).toBe("Taurus 15deg 30'");
    });

    it("handles 0 degrees Aries", () => {
      const planet = createPlanetData("Sun", 0, mockHouses);
      expect(planet.sign).toBe("Aries");
      expect(planet.degree).toBe(0);
      expect(planet.house).toBe(1);
    });

    it("handles last degrees of Pisces", () => {
      const planet = createPlanetData("Sun", 359.9, mockHouses);
      expect(planet.sign).toBe("Pisces");
      expect(planet.degree).toBe(29);
      expect(planet.house).toBe(12);
    });
  });
});
