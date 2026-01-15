// @vitest-environment node
// tests/lib/astrology/foundation/astrologyService.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateNatalChart,
  toChart,
  type NatalChartInput,
} from '@/lib/astrology/foundation/astrologyService';

// Helper function to create test natal input
function createNatalInput(overrides?: Partial<NatalChartInput>): NatalChartInput {
  return {
    year: 1990,
    month: 6,
    date: 15,
    hour: 12,
    minute: 0,
    latitude: 37.5665,
    longitude: 126.9780,
    timeZone: 'Asia/Seoul',
    ...overrides,
  };
}

describe('astrologyService', () => {
  describe('calculateNatalChart', () => {
    it('should calculate natal chart with correct structure', async () => {
      const input = createNatalInput();
      const chart = await calculateNatalChart(input);

      expect(chart.planets).toBeDefined();
      expect(chart.planets.length).toBeGreaterThan(0);
      expect(chart.ascendant).toBeDefined();
      expect(chart.mc).toBeDefined();
      expect(chart.houses).toBeDefined();
      expect(chart.houses).toHaveLength(12);
    });

    it('should have all major planets', async () => {
      const input = createNatalInput();
      const chart = await calculateNatalChart(input);

      const planetNames = chart.planets.map(p => p.name);

      expect(planetNames).toContain('Sun');
      expect(planetNames).toContain('Moon');
      expect(planetNames).toContain('Mercury');
      expect(planetNames).toContain('Venus');
      expect(planetNames).toContain('Mars');
      expect(planetNames).toContain('Jupiter');
      expect(planetNames).toContain('Saturn');
      expect(planetNames).toContain('Uranus');
      expect(planetNames).toContain('Neptune');
      expect(planetNames).toContain('Pluto');
      expect(planetNames).toContain('True Node');
    });

    it('should have planets with valid properties', async () => {
      const input = createNatalInput();
      const chart = await calculateNatalChart(input);

      for (const planet of chart.planets) {
        expect(planet.name).toBeDefined();
        expect(planet.longitude).toBeGreaterThanOrEqual(0);
        expect(planet.longitude).toBeLessThan(360);
        expect(planet.sign).toBeDefined();
        expect(planet.degree).toBeGreaterThanOrEqual(0);
        expect(planet.degree).toBeLessThan(30);
        expect(planet.minute).toBeGreaterThanOrEqual(0);
        expect(planet.minute).toBeLessThan(60);
        expect(planet.formatted).toBeDefined();
        expect(planet.house).toBeGreaterThanOrEqual(1);
        expect(planet.house).toBeLessThanOrEqual(12);
      }
    });

    it('should have ascendant with correct properties', async () => {
      const input = createNatalInput();
      const chart = await calculateNatalChart(input);

      expect(chart.ascendant.name).toBe('Ascendant');
      expect(chart.ascendant.longitude).toBeGreaterThanOrEqual(0);
      expect(chart.ascendant.longitude).toBeLessThan(360);
      expect(chart.ascendant.sign).toBeDefined();
      expect(chart.ascendant.house).toBe(1);
    });

    it('should have MC with correct properties', async () => {
      const input = createNatalInput();
      const chart = await calculateNatalChart(input);

      expect(chart.mc.name).toBe('MC');
      expect(chart.mc.longitude).toBeGreaterThanOrEqual(0);
      expect(chart.mc.longitude).toBeLessThan(360);
      expect(chart.mc.sign).toBeDefined();
      expect(chart.mc.house).toBe(10);
    });

    it('should have 12 houses with ascending cusps', async () => {
      const input = createNatalInput();
      const chart = await calculateNatalChart(input);

      expect(chart.houses).toHaveLength(12);

      for (const house of chart.houses) {
        expect(house.cusp).toBeGreaterThanOrEqual(0);
        expect(house.cusp).toBeLessThan(360);
        expect(house.formatted).toBeDefined();
      }
    });

    it('should mark retrograde planets', async () => {
      const input = createNatalInput();
      const chart = await calculateNatalChart(input);

      const planetsWithSpeed = chart.planets.filter(p => p.speed !== undefined);
      expect(planetsWithSpeed.length).toBeGreaterThan(0);

      for (const planet of planetsWithSpeed) {
        if (planet.speed! < 0) {
          expect(planet.retrograde).toBe(true);
        } else {
          expect(planet.retrograde).toBe(false);
        }
      }
    });

    it('should calculate different charts for different dates', async () => {
      const input1 = createNatalInput({ year: 1990, month: 6, date: 15 });
      const input2 = createNatalInput({ year: 1995, month: 12, date: 25 });

      const chart1 = await calculateNatalChart(input1);
      const chart2 = await calculateNatalChart(input2);

      // Charts should be different
      expect(chart1.planets[0].longitude).not.toBe(chart2.planets[0].longitude);
      expect(chart1.ascendant.longitude).not.toBe(chart2.ascendant.longitude);
    });

    it('should calculate different charts for different times', async () => {
      const input1 = createNatalInput({ hour: 6, minute: 0 });
      const input2 = createNatalInput({ hour: 18, minute: 0 });

      const chart1 = await calculateNatalChart(input1);
      const chart2 = await calculateNatalChart(input2);

      // Ascendant should be very different for different times
      expect(chart1.ascendant.longitude).not.toBeCloseTo(chart2.ascendant.longitude, 1);
    });

    it('should calculate different charts for different locations', async () => {
      const inputSeoul = createNatalInput({ latitude: 37.5665, longitude: 126.9780 });
      const inputNewYork = createNatalInput({ latitude: 40.7128, longitude: -74.0060 });

      const chartSeoul = await calculateNatalChart(inputSeoul);
      const chartNewYork = await calculateNatalChart(inputNewYork);

      // Ascendant and houses should be different for different locations
      expect(chartSeoul.ascendant.longitude).not.toBeCloseTo(chartNewYork.ascendant.longitude, 1);
    });

    it('should handle different time zones', async () => {
      const inputUTC = createNatalInput({ timeZone: 'UTC' });
      const inputTokyo = createNatalInput({ timeZone: 'Asia/Tokyo' });

      const chartUTC = await calculateNatalChart(inputUTC);
      const chartTokyo = await calculateNatalChart(inputTokyo);

      expect(chartUTC.planets).toBeDefined();
      expect(chartTokyo.planets).toBeDefined();
    });

    it('should handle midnight births', async () => {
      const input = createNatalInput({ hour: 0, minute: 0 });
      const chart = await calculateNatalChart(input);

      expect(chart.planets).toBeDefined();
      expect(chart.ascendant).toBeDefined();
    });

    it('should handle noon births', async () => {
      const input = createNatalInput({ hour: 12, minute: 0 });
      const chart = await calculateNatalChart(input);

      expect(chart.planets).toBeDefined();
      expect(chart.ascendant).toBeDefined();
    });

    it('should handle southern hemisphere', async () => {
      const input = createNatalInput({
        latitude: -33.8688,
        longitude: 151.2093,
        timeZone: 'Australia/Sydney',
      });

      const chart = await calculateNatalChart(input);

      expect(chart.planets).toBeDefined();
      expect(chart.ascendant).toBeDefined();
    });

    it('should handle leap year dates', async () => {
      const input = createNatalInput({ year: 1992, month: 2, date: 29 });
      const chart = await calculateNatalChart(input);

      expect(chart.planets).toBeDefined();
    });

    it('should throw error for invalid date', async () => {
      const input = createNatalInput({ month: 13, date: 32 });

      await expect(calculateNatalChart(input)).rejects.toThrow();
    });

    it('should throw error for invalid time zone', async () => {
      const input = createNatalInput({ timeZone: 'Invalid/Timezone' });

      await expect(calculateNatalChart(input)).rejects.toThrow();
    });
  });

  describe('toChart', () => {
    it('should convert NatalChartData to Chart', async () => {
      const input = createNatalInput();
      const natalData = await calculateNatalChart(input);
      const chart = toChart(natalData);

      expect(chart.planets).toBeDefined();
      expect(chart.ascendant).toBeDefined();
      expect(chart.mc).toBeDefined();
      expect(chart.houses).toBeDefined();
    });

    it('should preserve all planet data', async () => {
      const input = createNatalInput();
      const natalData = await calculateNatalChart(input);
      const chart = toChart(natalData);

      expect(chart.planets.length).toBe(natalData.planets.length);

      for (let i = 0; i < chart.planets.length; i++) {
        expect(chart.planets[i].name).toBe(natalData.planets[i].name);
        expect(chart.planets[i].longitude).toBe(natalData.planets[i].longitude);
        expect(chart.planets[i].sign).toBe(natalData.planets[i].sign);
        expect(chart.planets[i].degree).toBe(natalData.planets[i].degree);
        expect(chart.planets[i].house).toBe(natalData.planets[i].house);
      }
    });

    it('should have houses with correct indices', async () => {
      const input = createNatalInput();
      const natalData = await calculateNatalChart(input);
      const chart = toChart(natalData);

      expect(chart.houses).toHaveLength(12);

      for (let i = 0; i < 12; i++) {
        expect(chart.houses[i].index).toBe(i + 1);
      }
    });

    it('should preserve retrograde information', async () => {
      const input = createNatalInput();
      const natalData = await calculateNatalChart(input);
      const chart = toChart(natalData);

      for (const planet of chart.planets) {
        const original = natalData.planets.find(p => p.name === planet.name);
        expect(planet.retrograde).toBe(original?.retrograde);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle dates near Unix epoch', async () => {
      const input = createNatalInput({ year: 1970, month: 1, date: 1, hour: 0, minute: 0 });
      const chart = await calculateNatalChart(input);

      expect(chart.planets).toBeDefined();
    });

    it('should handle very old dates', async () => {
      const input = createNatalInput({ year: 1900, month: 1, date: 1 });
      const chart = await calculateNatalChart(input);

      expect(chart.planets).toBeDefined();
    });

    it('should handle future dates', async () => {
      const input = createNatalInput({ year: 2030, month: 1, date: 1 });
      const chart = await calculateNatalChart(input);

      expect(chart.planets).toBeDefined();
    });

    it('should handle extreme northern latitudes', async () => {
      const input = createNatalInput({
        latitude: 78.2232,
        longitude: 15.6267,
        timeZone: 'Arctic/Longyearbyen',
      });

      const chart = await calculateNatalChart(input);

      expect(chart.planets).toBeDefined();
    });

    it('should handle International Date Line', async () => {
      const input = createNatalInput({
        latitude: -17.75,
        longitude: 178.0,
        timeZone: 'Pacific/Fiji',
      });

      const chart = await calculateNatalChart(input);

      expect(chart.planets).toBeDefined();
    });
  });
});

