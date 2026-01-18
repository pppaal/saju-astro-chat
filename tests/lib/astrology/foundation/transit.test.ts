/**
 * Transit Calculation Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock swisseph before importing transit module
const mockSwisseph = {
  SEFLG_SPEED: 256,
  swe_calc_ut: vi.fn(),
  swe_houses: vi.fn(),
};

vi.mock("@/lib/astrology/foundation/ephe", () => ({
  getSwisseph: () => mockSwisseph,
}));

vi.mock("@/lib/astrology/foundation/shared", () => ({
  getPlanetList: () => ({
    Sun: 0,
    Moon: 1,
    Mercury: 2,
    Venus: 3,
    Mars: 4,
  }),
  isoToJD: (iso: string) => 2451545.0,
  throwIfSwissEphError: vi.fn(),
}));

vi.mock("@/lib/astrology/foundation/houses", () => ({
  calcHouses: vi.fn(() => ({
    ascendant: 0,
    mc: 90,
    house: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
  })),
  inferHouseOf: vi.fn((lon: number) => 1),
  mapHouseCupsFormatted: vi.fn((houses: number[]) =>
    houses.map((h, i) => ({ number: i + 1, longitude: h }))
  ),
}));

vi.mock("@/lib/astrology/foundation/utils", () => ({
  formatLongitude: vi.fn((lon: number) => ({
    sign: "Aries",
    degree: Math.floor(lon % 30),
    signDegree: lon % 30,
  })),
  angleDiff: vi.fn((a: number, b: number) => {
    let diff = Math.abs(a - b);
    if (diff > 180) diff = 360 - diff;
    return diff;
  }),
}));

import { calculateTransitChart } from "@/lib/astrology/foundation/transit";

describe("Transit Calculations", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSwisseph.swe_calc_ut.mockReturnValue({
      longitude: 45.0,
      speed: 1.0,
      latitude: 0,
      distance: 1.0,
    });
  });

  describe("calculateTransitChart", () => {
    it("calculates transit chart for given date and location", async () => {
      const input = {
        iso: "2024-01-01T12:00:00Z",
        timeZone: "UTC",
        latitude: 37.5665,
        longitude: 126.978,
      };

      const chart = await calculateTransitChart(input);

      expect(chart).toBeDefined();
      expect(chart.planets).toBeDefined();
      expect(chart.ascendant).toBeDefined();
      expect(chart.mc).toBeDefined();
      expect(chart.houses).toBeDefined();
    });

    it("includes planet positions", async () => {
      const input = {
        iso: "2024-01-01T12:00:00Z",
        timeZone: "UTC",
        latitude: 37.5665,
        longitude: 126.978,
      };

      const chart = await calculateTransitChart(input);

      expect(chart.planets.length).toBe(5);
      expect(chart.planets[0].name).toBe("Sun");
      expect(chart.planets[0].longitude).toBe(45.0);
    });

    it("calculates retrograde status", async () => {
      mockSwisseph.swe_calc_ut.mockReturnValue({
        longitude: 45.0,
        speed: -0.5,
        latitude: 0,
        distance: 1.0,
      });

      const input = {
        iso: "2024-01-01T12:00:00Z",
        timeZone: "UTC",
        latitude: 37.5665,
        longitude: 126.978,
      };

      const chart = await calculateTransitChart(input);

      expect(chart.planets[0].retrograde).toBe(true);
    });

    it("includes ascendant and MC", async () => {
      const input = {
        iso: "2024-01-01T12:00:00Z",
        timeZone: "UTC",
        latitude: 37.5665,
        longitude: 126.978,
      };

      const chart = await calculateTransitChart(input);

      expect(chart.ascendant.name).toBe("Ascendant");
      expect(chart.ascendant.house).toBe(1);
      expect(chart.mc.name).toBe("MC");
      expect(chart.mc.house).toBe(10);
    });

    it("includes metadata", async () => {
      const input = {
        iso: "2024-01-01T12:00:00Z",
        timeZone: "Asia/Seoul",
        latitude: 37.5665,
        longitude: 126.978,
      };

      const chart = await calculateTransitChart(input);

      expect(chart.meta).toBeDefined();
      expect(chart.meta.isoUTC).toBe("2024-01-01T12:00:00Z");
      expect(chart.meta.timeZone).toBe("Asia/Seoul");
      expect(chart.meta.latitude).toBe(37.5665);
      expect(chart.meta.longitude).toBe(126.978);
      expect(chart.meta.houseSystem).toBe("Placidus");
    });

    it("supports different house systems", async () => {
      const input = {
        iso: "2024-01-01T12:00:00Z",
        timeZone: "UTC",
        latitude: 37.5665,
        longitude: 126.978,
      };

      const chart = await calculateTransitChart(input, "Koch");

      expect(chart.meta.houseSystem).toBe("Koch");
    });

    it("throws error on calculation failure", async () => {
      mockSwisseph.swe_calc_ut.mockReturnValue({
        error: "Calculation failed",
      });

      const input = {
        iso: "2024-01-01T12:00:00Z",
        timeZone: "UTC",
        latitude: 37.5665,
        longitude: 126.978,
      };

      await expect(calculateTransitChart(input)).rejects.toThrow();
    });

    it("assigns house numbers to planets", async () => {
      const input = {
        iso: "2024-01-01T12:00:00Z",
        timeZone: "UTC",
        latitude: 37.5665,
        longitude: 126.978,
      };

      const chart = await calculateTransitChart(input);

      chart.planets.forEach((planet) => {
        expect(planet.house).toBeDefined();
      });
    });
  });
});
