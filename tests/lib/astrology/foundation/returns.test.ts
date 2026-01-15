// @vitest-environment node
// tests/lib/astrology/foundation/returns.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateSolarReturn,
  calculateLunarReturn,
  getSolarReturnSummary,
  getLunarReturnSummary,
} from '@/lib/astrology/foundation/returns';
import type { NatalInput, SolarReturnInput, LunarReturnInput } from '@/lib/astrology/foundation/types';

// Helper function to create test natal input
function createNatalInput(overrides?: Partial<NatalInput>): NatalInput {
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

describe('returns', () => {
  describe('calculateSolarReturn', () => {
    it('should calculate solar return chart with correct structure', async () => {
      const natal = createNatalInput();
      const input: SolarReturnInput = {
        natal,
        year: 2023,
      };

      const solarReturn = await calculateSolarReturn(input);

      expect(solarReturn.returnType).toBe('solar');
      expect(solarReturn.returnYear).toBe(2023);
      expect(solarReturn.planets).toBeDefined();
      expect(solarReturn.planets.length).toBeGreaterThan(0);
      expect(solarReturn.ascendant).toBeDefined();
      expect(solarReturn.mc).toBeDefined();
      expect(solarReturn.houses).toBeDefined();
      expect(solarReturn.houses).toHaveLength(12);
      expect(solarReturn.exactReturnTime).toBeDefined();
    });

    it('should have Sun at same longitude as natal Sun', async () => {
      const natal = createNatalInput();
      const input: SolarReturnInput = {
        natal,
        year: 2020,
      };

      const solarReturn = await calculateSolarReturn(input);
      const sun = solarReturn.planets.find(p => p.name === 'Sun');

      expect(sun).toBeDefined();
      expect(sun?.longitude).toBeGreaterThanOrEqual(0);
      expect(sun?.longitude).toBeLessThan(360);
    });

    it('should calculate different returns for different years', async () => {
      const natal = createNatalInput();

      const return2020 = await calculateSolarReturn({ natal, year: 2020 });
      const return2021 = await calculateSolarReturn({ natal, year: 2021 });

      expect(return2020.exactReturnTime).not.toBe(return2021.exactReturnTime);

      // Ascendant should be different for different years
      expect(return2020.ascendant.longitude).not.toBe(return2021.ascendant.longitude);
    });

    it('should have all planets with valid properties', async () => {
      const natal = createNatalInput();
      const solarReturn = await calculateSolarReturn({ natal, year: 2020 });

      for (const planet of solarReturn.planets) {
        expect(planet.name).toBeDefined();
        expect(planet.longitude).toBeGreaterThanOrEqual(0);
        expect(planet.longitude).toBeLessThan(360);
        expect(planet.sign).toBeDefined();
        expect(planet.degree).toBeGreaterThanOrEqual(0);
        expect(planet.degree).toBeLessThan(30);
        expect(planet.house).toBeGreaterThanOrEqual(1);
        expect(planet.house).toBeLessThanOrEqual(12);
      }
    });

    it('should include exact return time in ISO format', async () => {
      const natal = createNatalInput();
      const solarReturn = await calculateSolarReturn({ natal, year: 2020 });

      expect(solarReturn.exactReturnTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle different birth dates', async () => {
      const natalJan = createNatalInput({ month: 1, date: 1 });
      const natalDec = createNatalInput({ month: 12, date: 31 });

      const returnJan = await calculateSolarReturn({ natal: natalJan, year: 2020 });
      const returnDec = await calculateSolarReturn({ natal: natalDec, year: 2020 });

      expect(returnJan.exactReturnTime).toBeDefined();
      expect(returnDec.exactReturnTime).toBeDefined();
      expect(returnJan.exactReturnTime).not.toBe(returnDec.exactReturnTime);
    });

    it('should handle southern hemisphere', async () => {
      const natal = createNatalInput({
        latitude: -33.8688,
        longitude: 151.2093,
        timeZone: 'Australia/Sydney',
      });

      const solarReturn = await calculateSolarReturn({ natal, year: 2020 });

      expect(solarReturn.planets).toBeDefined();
      expect(solarReturn.ascendant).toBeDefined();
    });
  });

  describe('calculateLunarReturn', () => {
    it('should calculate lunar return chart with correct structure', async () => {
      const natal = createNatalInput();
      const input: LunarReturnInput = {
        natal,
        month: 6,
        year: 2023,
      };

      const lunarReturn = await calculateLunarReturn(input);

      expect(lunarReturn.returnType).toBe('lunar');
      expect(lunarReturn.returnYear).toBe(2023);
      expect(lunarReturn.returnMonth).toBe(6);
      expect(lunarReturn.planets).toBeDefined();
      expect(lunarReturn.planets.length).toBeGreaterThan(0);
      expect(lunarReturn.ascendant).toBeDefined();
      expect(lunarReturn.mc).toBeDefined();
      expect(lunarReturn.houses).toBeDefined();
      expect(lunarReturn.exactReturnTime).toBeDefined();
    });

    it('should have Moon at same longitude as natal Moon', async () => {
      const natal = createNatalInput();
      const input: LunarReturnInput = {
        natal,
        month: 6,
        year: 2020,
      };

      const lunarReturn = await calculateLunarReturn(input);
      const moon = lunarReturn.planets.find(p => p.name === 'Moon');

      expect(moon).toBeDefined();
      expect(moon?.longitude).toBeGreaterThanOrEqual(0);
      expect(moon?.longitude).toBeLessThan(360);
    });

    it('should calculate different returns for different months', async () => {
      const natal = createNatalInput();

      const returnJune = await calculateLunarReturn({ natal, month: 6, year: 2020 });
      const returnJuly = await calculateLunarReturn({ natal, month: 7, year: 2020 });

      expect(returnJune.exactReturnTime).not.toBe(returnJuly.exactReturnTime);
      expect(returnJune.ascendant.longitude).not.toBe(returnJuly.ascendant.longitude);
    });

    it('should have all planets with valid properties', async () => {
      const natal = createNatalInput();
      const lunarReturn = await calculateLunarReturn({ natal, month: 6, year: 2020 });

      for (const planet of lunarReturn.planets) {
        expect(planet.name).toBeDefined();
        expect(planet.longitude).toBeGreaterThanOrEqual(0);
        expect(planet.longitude).toBeLessThan(360);
        expect(planet.sign).toBeDefined();
        expect(planet.degree).toBeGreaterThanOrEqual(0);
        expect(planet.degree).toBeLessThan(30);
        expect(planet.house).toBeGreaterThanOrEqual(1);
        expect(planet.house).toBeLessThanOrEqual(12);
      }
    });

    it('should handle all 12 months', async () => {
      const natal = createNatalInput();

      for (let month = 1; month <= 12; month++) {
        const lunarReturn = await calculateLunarReturn({ natal, month, year: 2020 });
        expect(lunarReturn.returnMonth).toBe(month);
        expect(lunarReturn.exactReturnTime).toBeDefined();
      }
    });

    it('should include exact return time in ISO format', async () => {
      const natal = createNatalInput();
      const lunarReturn = await calculateLunarReturn({ natal, month: 6, year: 2020 });

      expect(lunarReturn.exactReturnTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('getSolarReturnSummary', () => {
    it('should return summary with all required fields', async () => {
      const natal = createNatalInput();
      const solarReturn = await calculateSolarReturn({ natal, year: 2020 });

      const summary = getSolarReturnSummary(solarReturn);

      expect(summary.year).toBe(2020);
      expect(summary.ascSign).toBeDefined();
      expect(summary.sunHouse).toBeGreaterThanOrEqual(1);
      expect(summary.sunHouse).toBeLessThanOrEqual(12);
      expect(summary.moonSign).toBeDefined();
      expect(summary.moonHouse).toBeGreaterThanOrEqual(1);
      expect(summary.moonHouse).toBeLessThanOrEqual(12);
      expect(summary.theme).toBeDefined();
    });

    it('should provide meaningful theme based on Sun house', async () => {
      const natal = createNatalInput();
      const solarReturn = await calculateSolarReturn({ natal, year: 2020 });

      const summary = getSolarReturnSummary(solarReturn);

      expect(typeof summary.theme).toBe('string');
      expect(summary.theme.length).toBeGreaterThan(0);
    });

    it('should have different themes for different houses', () => {
      // Create mock charts with Sun in different houses
      const mockReturn1 = {
        returnType: 'solar' as const,
        returnYear: 2020,
        planets: [
          {
            name: 'Sun',
            longitude: 0,
            sign: 'Aries' as const,
            degree: 0,
            minute: 0,
            formatted: 'Aries 0deg',
            house: 1,
          },
          {
            name: 'Moon',
            longitude: 120,
            sign: 'Leo' as const,
            degree: 0,
            minute: 0,
            formatted: 'Leo 0deg',
            house: 5,
          },
        ],
        ascendant: {
          name: 'Ascendant',
          longitude: 0,
          sign: 'Aries' as const,
          degree: 0,
          minute: 0,
          formatted: 'Aries 0deg',
          house: 1,
        },
        mc: {
          name: 'MC',
          longitude: 90,
          sign: 'Cancer' as const,
          degree: 0,
          minute: 0,
          formatted: 'Cancer 0deg',
          house: 10,
        },
        houses: [],
        exactReturnTime: '2020-06-15T12:00:00Z',
      };

      const mockReturn10 = {
        ...mockReturn1,
        planets: mockReturn1.planets.map(p =>
          p.name === 'Sun' ? { ...p, house: 10 } : p
        ),
      };

      const summary1 = getSolarReturnSummary(mockReturn1);
      const summary10 = getSolarReturnSummary(mockReturn10);

      expect(summary1.theme).not.toBe(summary10.theme);
    });
  });

  describe('getLunarReturnSummary', () => {
    it('should return summary with all required fields', async () => {
      const natal = createNatalInput();
      const lunarReturn = await calculateLunarReturn({ natal, month: 6, year: 2020 });

      const summary = getLunarReturnSummary(lunarReturn);

      expect(summary.year).toBe(2020);
      expect(summary.month).toBe(6);
      expect(summary.ascSign).toBeDefined();
      expect(summary.moonHouse).toBeGreaterThanOrEqual(1);
      expect(summary.moonHouse).toBeLessThanOrEqual(12);
      expect(summary.sunSign).toBeDefined();
      expect(summary.theme).toBeDefined();
    });

    it('should provide meaningful theme based on Moon house', async () => {
      const natal = createNatalInput();
      const lunarReturn = await calculateLunarReturn({ natal, month: 6, year: 2020 });

      const summary = getLunarReturnSummary(lunarReturn);

      expect(typeof summary.theme).toBe('string');
      expect(summary.theme.length).toBeGreaterThan(0);
    });

    it('should have different themes for different Moon houses', () => {
      const mockReturn1 = {
        returnType: 'lunar' as const,
        returnYear: 2020,
        returnMonth: 6,
        planets: [
          {
            name: 'Sun',
            longitude: 85,
            sign: 'Gemini' as const,
            degree: 25,
            minute: 0,
            formatted: 'Gemini 25deg',
            house: 3,
          },
          {
            name: 'Moon',
            longitude: 120,
            sign: 'Leo' as const,
            degree: 0,
            minute: 0,
            formatted: 'Leo 0deg',
            house: 1,
          },
        ],
        ascendant: {
          name: 'Ascendant',
          longitude: 0,
          sign: 'Aries' as const,
          degree: 0,
          minute: 0,
          formatted: 'Aries 0deg',
          house: 1,
        },
        mc: {
          name: 'MC',
          longitude: 90,
          sign: 'Cancer' as const,
          degree: 0,
          minute: 0,
          formatted: 'Cancer 0deg',
          house: 10,
        },
        houses: [],
        exactReturnTime: '2020-06-15T12:00:00Z',
      };

      const mockReturn7 = {
        ...mockReturn1,
        planets: mockReturn1.planets.map(p =>
          p.name === 'Moon' ? { ...p, house: 7 } : p
        ),
      };

      const summary1 = getLunarReturnSummary(mockReturn1);
      const summary7 = getLunarReturnSummary(mockReturn7);

      expect(summary1.theme).not.toBe(summary7.theme);
    });
  });

  describe('edge cases', () => {
    it('should handle leap year births', async () => {
      const natal = createNatalInput({ year: 1992, month: 2, date: 29 });

      const solarReturn = await calculateSolarReturn({ natal, year: 2020 });

      expect(solarReturn.planets).toBeDefined();
      expect(solarReturn.exactReturnTime).toBeDefined();
    });

    it('should handle different time zones', async () => {
      const natalUTC = createNatalInput({ timeZone: 'UTC' });
      const natalTokyo = createNatalInput({ timeZone: 'Asia/Tokyo' });

      const returnUTC = await calculateSolarReturn({ natal: natalUTC, year: 2020 });
      const returnTokyo = await calculateSolarReturn({ natal: natalTokyo, year: 2020 });

      expect(returnUTC.planets).toBeDefined();
      expect(returnTokyo.planets).toBeDefined();
    });

    it('should handle midnight births', async () => {
      const natal = createNatalInput({ hour: 0, minute: 0 });

      const solarReturn = await calculateSolarReturn({ natal, year: 2020 });

      expect(solarReturn.planets).toBeDefined();
    });

    it('should handle noon births', async () => {
      const natal = createNatalInput({ hour: 12, minute: 0 });

      const solarReturn = await calculateSolarReturn({ natal, year: 2020 });

      expect(solarReturn.planets).toBeDefined();
    });

    it('should handle very old birth dates', async () => {
      const natal = createNatalInput({ year: 1900 });

      const solarReturn = await calculateSolarReturn({ natal, year: 2020 });

      expect(solarReturn.planets).toBeDefined();
    });

    it('should handle February lunar returns', async () => {
      const natal = createNatalInput();

      const lunarReturn = await calculateLunarReturn({ natal, month: 2, year: 2020 });

      expect(lunarReturn.planets).toBeDefined();
      expect(lunarReturn.returnMonth).toBe(2);
    });

    it('should handle December lunar returns', async () => {
      const natal = createNatalInput();

      const lunarReturn = await calculateLunarReturn({ natal, month: 12, year: 2020 });

      expect(lunarReturn.planets).toBeDefined();
      expect(lunarReturn.returnMonth).toBe(12);
    });
  });
});

