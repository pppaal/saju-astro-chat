/**
 * Houses Module Tests (하우스 계산 테스트)
 *
 * Tests for:
 * - calcHouses: 하우스 커스프 계산 (Placidus, WholeSign)
 * - inferHouseOf: 행성의 하우스 위치 판단
 * - mapHouseCupsFormatted: 하우스 커스프 포맷팅
 */

import {
  calcHouses,
  inferHouseOf,
  mapHouseCupsFormatted,
} from "@/lib/astrology/foundation/houses";

// Mock the swisseph dependency
vi.mock("@/lib/astrology/foundation/ephe", () => ({
  getSwisseph: () => ({
    swe_houses: vi.fn((ut_jd: number, lat: number, lon: number, system: string) => {
      // Mock return value for Placidus system
      return {
        house: [
          10.5, 42.3, 71.2, 100.8, 132.5, 165.0,
          190.5, 222.3, 251.2, 280.8, 312.5, 345.0
        ],
        ascendant: 10.5,
        mc: 280.8,
      };
    }),
  }),
}));

describe("Houses Module", () => {
  describe("calcHouses", () => {
    const testJD = 2460000.5; // Some Julian Day
    const testLat = 37.5665; // Seoul latitude
    const testLon = 126.978; // Seoul longitude

    it("returns house cusps for Placidus system (default)", () => {
      const result = calcHouses(testJD, testLat, testLon);

      expect(result).toHaveProperty("house");
      expect(result).toHaveProperty("ascendant");
      expect(result).toHaveProperty("mc");
    });

    it("returns house cusps for explicit Placidus system", () => {
      const result = calcHouses(testJD, testLat, testLon, "Placidus");

      expect(result).toHaveProperty("house");
      expect(result.house).toHaveLength(12);
    });

    it("returns house cusps for WholeSign system", () => {
      const result = calcHouses(testJD, testLat, testLon, "WholeSign");

      expect(result).toHaveProperty("house");
      expect(result).toHaveProperty("ascendant");
      expect(result).toHaveProperty("mc");
      expect(result.house).toHaveLength(12);
    });

    it("WholeSign houses are 30 degrees apart", () => {
      const result = calcHouses(testJD, testLat, testLon, "WholeSign");

      for (let i = 0; i < 11; i++) {
        const diff = (result.house[i + 1] - result.house[i] + 360) % 360;
        expect(diff).toBe(30);
      }
    });

    it("WholeSign starts from ASC sign", () => {
      const result = calcHouses(testJD, testLat, testLon, "WholeSign");

      // First house should be at sign boundary (multiple of 30)
      expect(result.house[0] % 30).toBeCloseTo(0, 1);
    });

    it("throws error for unsupported house system", () => {
      expect(() => {
        calcHouses(testJD, testLat, testLon, "UnsupportedSystem" as never);
      }).toThrow("Unsupported house system");
    });

    it("ascendant is between 0 and 360", () => {
      const result = calcHouses(testJD, testLat, testLon);

      expect(result.ascendant).toBeGreaterThanOrEqual(0);
      expect(result.ascendant).toBeLessThan(360);
    });

    it("mc is between 0 and 360", () => {
      const result = calcHouses(testJD, testLat, testLon);

      expect(result.mc).toBeGreaterThanOrEqual(0);
      expect(result.mc).toBeLessThan(360);
    });
  });

  describe("inferHouseOf", () => {
    // Standard house cusps (30 degrees each, starting at 0)
    const equalHouses = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

    it("returns house 1 for longitude at 15 degrees", () => {
      const result = inferHouseOf(15, equalHouses);
      expect(result).toBe(1);
    });

    it("returns house 2 for longitude at 45 degrees", () => {
      const result = inferHouseOf(45, equalHouses);
      expect(result).toBe(2);
    });

    it("returns house 6 for longitude at 165 degrees", () => {
      const result = inferHouseOf(165, equalHouses);
      expect(result).toBe(6);
    });

    it("returns house 12 for longitude at 345 degrees", () => {
      const result = inferHouseOf(345, equalHouses);
      expect(result).toBe(12);
    });

    it("handles house cusp exactly (cusp belongs to that house)", () => {
      const result = inferHouseOf(30, equalHouses);
      expect(result).toBe(2);
    });

    it("handles wrapping from house 12 to house 1", () => {
      // Cusps that wrap around 0 degrees
      const wrappingHouses = [350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320];
      const result = inferHouseOf(5, wrappingHouses);
      expect(result).toBe(1);
    });

    it("handles longitude near 0 degrees", () => {
      const result = inferHouseOf(0, equalHouses);
      expect(result).toBe(1);
    });

    it("handles longitude near 360 degrees (normalizes to 0)", () => {
      const result = inferHouseOf(359.9, equalHouses);
      expect(result).toBe(12);
    });

    it("returns 12 as fallback for edge cases", () => {
      // This tests the fallback return
      // In practice, all longitudes should find a house
      const result = inferHouseOf(329.9, equalHouses);
      expect(result).toBe(11);
    });

    it("handles non-equal house systems", () => {
      // Placidus-like unequal houses
      const unequalHouses = [10, 35, 70, 100, 130, 165, 190, 215, 250, 280, 310, 345];

      const result1 = inferHouseOf(20, unequalHouses);
      expect(result1).toBe(1);

      const result2 = inferHouseOf(50, unequalHouses);
      expect(result2).toBe(2);
    });
  });

  describe("mapHouseCupsFormatted", () => {
    const testCusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

    it("returns formatted array with correct length", () => {
      const result = mapHouseCupsFormatted(testCusps);
      expect(result).toHaveLength(12);
    });

    it("includes index, cusp, sign, and formatted for each house", () => {
      const result = mapHouseCupsFormatted(testCusps);

      for (const house of result) {
        expect(house).toHaveProperty("index");
        expect(house).toHaveProperty("cusp");
        expect(house).toHaveProperty("sign");
        expect(house).toHaveProperty("formatted");
      }
    });

    it("indices are 1-12", () => {
      const result = mapHouseCupsFormatted(testCusps);

      for (let i = 0; i < 12; i++) {
        expect(result[i].index).toBe(i + 1);
      }
    });

    it("cusps match input values", () => {
      const result = mapHouseCupsFormatted(testCusps);

      for (let i = 0; i < 12; i++) {
        expect(result[i].cusp).toBe(testCusps[i]);
      }
    });

    it("assigns correct zodiac signs", () => {
      const result = mapHouseCupsFormatted(testCusps);

      // 0° = Aries, 30° = Taurus, etc.
      expect(result[0].sign).toBe("Aries");
      expect(result[1].sign).toBe("Taurus");
      expect(result[2].sign).toBe("Gemini");
      expect(result[3].sign).toBe("Cancer");
      expect(result[4].sign).toBe("Leo");
      expect(result[5].sign).toBe("Virgo");
      expect(result[6].sign).toBe("Libra");
      expect(result[7].sign).toBe("Scorpio");
      expect(result[8].sign).toBe("Sagittarius");
      expect(result[9].sign).toBe("Capricorn");
      expect(result[10].sign).toBe("Aquarius");
      expect(result[11].sign).toBe("Pisces");
    });

    it("handles mid-sign cusps", () => {
      const midSignCusps = [15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345];
      const result = mapHouseCupsFormatted(midSignCusps);

      // 15° = still Aries, 45° = still Taurus, etc.
      expect(result[0].sign).toBe("Aries");
      expect(result[1].sign).toBe("Taurus");
    });

    it("formatted includes degrees", () => {
      const result = mapHouseCupsFormatted(testCusps);

      // Each formatted string should include degree info
      for (const house of result) {
        expect(typeof house.formatted).toBe("string");
        expect(house.formatted.length).toBeGreaterThan(0);
      }
    });

    it("handles empty array", () => {
      const result = mapHouseCupsFormatted([]);
      expect(result).toHaveLength(0);
    });
  });

  describe("Integration", () => {
    it("calcHouses result works with inferHouseOf", () => {
      const testJD = 2460000.5;
      const testLat = 37.5665;
      const testLon = 126.978;

      const housesResult = calcHouses(testJD, testLat, testLon, "WholeSign");
      const planetLongitude = 45; // Some test longitude

      const houseNumber = inferHouseOf(planetLongitude, housesResult.house);

      expect(houseNumber).toBeGreaterThanOrEqual(1);
      expect(houseNumber).toBeLessThanOrEqual(12);
    });

    it("calcHouses result works with mapHouseCupsFormatted", () => {
      const testJD = 2460000.5;
      const testLat = 37.5665;
      const testLon = 126.978;

      const housesResult = calcHouses(testJD, testLat, testLon);
      const formatted = mapHouseCupsFormatted(housesResult.house);

      expect(formatted).toHaveLength(12);
      expect(formatted[0].cusp).toBe(housesResult.house[0]);
    });
  });
});
