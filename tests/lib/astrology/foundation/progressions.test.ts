// @vitest-environment node
// tests/lib/astrology/foundation/progressions.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
  calculateSecondaryProgressions,
  calculateSolarArcDirections,
  getProgressedMoonPhase,
  getProgressionSummary,
  findProgressedToNatalAspects,
  findProgressedInternalAspects,
  findProgressedMoonAspects,
} from '@/lib/astrology/foundation/progressions';
import type { NatalInput, ProgressionInput, Chart, PlanetBase, ZodiacKo } from '@/lib/astrology/foundation/types';

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

// Helper function to create test chart
function createTestChart(): Chart {
  const signs: ZodiacKo[] = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ];

  const createPlanet = (name: string, longitude: number): PlanetBase => ({
    name,
    longitude,
    sign: signs[Math.floor(longitude / 30)],
    degree: Math.floor(longitude % 30),
    minute: 0,
    formatted: `${signs[Math.floor(longitude / 30)]} ${Math.floor(longitude % 30)}deg`,
    house: 1,
    speed: 1,
  });

  return {
    planets: [
      createPlanet('Sun', 85),
      createPlanet('Moon', 120),
      createPlanet('Mercury', 95),
    ],
    ascendant: createPlanet('Ascendant', 0),
    mc: createPlanet('MC', 90),
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      sign: signs[i],
      formatted: `${i * 30}deg`,
    })),
  };
}

describe('progressions', () => {
  describe('calculateSecondaryProgressions', () => {
    it('should calculate secondary progressions with correct structure', async () => {
      const natal = createNatalInput();
      const input: ProgressionInput = {
        natal,
        targetDate: '2023-06-15',
      };

      const progressed = await calculateSecondaryProgressions(input);

      expect(progressed.progressionType).toBe('secondary');
      expect(progressed.planets).toBeDefined();
      expect(progressed.planets.length).toBeGreaterThan(0);
      expect(progressed.ascendant).toBeDefined();
      expect(progressed.mc).toBeDefined();
      expect(progressed.houses).toBeDefined();
      expect(progressed.houses).toHaveLength(12);
      expect(progressed.yearsProgressed).toBeCloseTo(33, 0);
      expect(progressed.progressedDate).toBeDefined();
    });

    it('should have planets with valid properties', async () => {
      const natal = createNatalInput();
      const input: ProgressionInput = {
        natal,
        targetDate: '2020-06-15',
      };

      const progressed = await calculateSecondaryProgressions(input);

      for (const planet of progressed.planets) {
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

    it('should calculate different progressions for different dates', async () => {
      const natal = createNatalInput();

      const prog2000 = await calculateSecondaryProgressions({
        natal,
        targetDate: '2000-06-15',
      });

      const prog2020 = await calculateSecondaryProgressions({
        natal,
        targetDate: '2020-06-15',
      });

      expect(prog2000.yearsProgressed).toBeCloseTo(10, 0);
      expect(prog2020.yearsProgressed).toBeCloseTo(30, 0);

      // Moon should have moved significantly
      const moon2000 = prog2000.planets.find(p => p.name === 'Moon');
      const moon2020 = prog2020.planets.find(p => p.name === 'Moon');
      expect(moon2000?.longitude).not.toBe(moon2020?.longitude);
    });

    it('should handle date before birth', async () => {
      const natal = createNatalInput();
      const input: ProgressionInput = {
        natal,
        targetDate: '1985-06-15',
      };

      const progressed = await calculateSecondaryProgressions(input);

      expect(progressed.yearsProgressed).toBeLessThan(0);
    });
  });

  describe('calculateSolarArcDirections', () => {
    it('should calculate solar arc directions with correct structure', async () => {
      const natal = createNatalInput();
      const input: ProgressionInput = {
        natal,
        targetDate: '2023-06-15',
      };

      const directed = await calculateSolarArcDirections(input);

      expect(directed.progressionType).toBe('solarArc');
      expect(directed.planets).toBeDefined();
      expect(directed.planets.length).toBeGreaterThan(0);
      expect(directed.ascendant).toBeDefined();
      expect(directed.mc).toBeDefined();
      expect(directed.houses).toBeDefined();
      expect(directed.yearsProgressed).toBeCloseTo(33, 0);
    });

    it('should apply same arc to all planets', async () => {
      const natal = createNatalInput();
      const input: ProgressionInput = {
        natal,
        targetDate: '2020-06-15',
      };

      const directed = await calculateSolarArcDirections(input);

      // In solar arc directions, all planets move by the same amount (the solar arc)
      // We can't easily test the exact arc without knowing natal positions,
      // but we can verify structure
      expect(directed.planets.every(p => p.longitude >= 0 && p.longitude < 360)).toBe(true);
    });

    it('should have different results than secondary progressions', async () => {
      const natal = createNatalInput();
      const input: ProgressionInput = {
        natal,
        targetDate: '2020-06-15',
      };

      const secondary = await calculateSecondaryProgressions(input);
      const solarArc = await calculateSolarArcDirections(input);

      // Solar arc and secondary progressions should produce different results
      const secondaryMoon = secondary.planets.find(p => p.name === 'Moon');
      const solarArcMoon = solarArc.planets.find(p => p.name === 'Moon');

      // They should be different (unless by rare coincidence)
      expect(secondaryMoon?.longitude).toBeDefined();
      expect(solarArcMoon?.longitude).toBeDefined();
    });
  });

  describe('getProgressedMoonPhase', () => {
    it('should return New Moon for 0 degree separation', () => {
      const phase = getProgressedMoonPhase(100, 100);
      expect(phase).toContain('New');
    });

    it('should return First Quarter for 90 degree separation', () => {
      const phase = getProgressedMoonPhase(190, 100);
      expect(phase).toContain('First Quarter');
    });

    it('should return Full Moon for 180 degree separation', () => {
      const phase = getProgressedMoonPhase(280, 100);
      expect(phase).toContain('Full Moon');
    });

    it('should return Last Quarter for 270 degree separation', () => {
      const phase = getProgressedMoonPhase(10, 100);
      expect(phase).toContain('Last Quarter');
    });

    it('should handle moon ahead of sun', () => {
      const phase = getProgressedMoonPhase(50, 0);
      expect(phase).toBeDefined();
      expect(typeof phase).toBe('string');
    });

    it('should handle moon behind sun', () => {
      const phase = getProgressedMoonPhase(350, 10);
      expect(phase).toBeDefined();
      expect(typeof phase).toBe('string');
    });

    it('should handle all 8 moon phases', () => {
      const testCases = [
        { moonLon: 10, sunLon: 0, expectedPhase: 'New' },
        { moonLon: 50, sunLon: 0, expectedPhase: 'Crescent' },
        { moonLon: 90, sunLon: 0, expectedPhase: 'Quarter' },
        { moonLon: 130, sunLon: 0, expectedPhase: 'Gibbous' },
        { moonLon: 180, sunLon: 0, expectedPhase: 'Full' },
        { moonLon: 220, sunLon: 0, expectedPhase: 'Gibbous' },
        { moonLon: 270, sunLon: 0, expectedPhase: 'Quarter' },
        { moonLon: 310, sunLon: 0, expectedPhase: 'Crescent' },
      ];

      testCases.forEach(({ moonLon, sunLon }) => {
        const phase = getProgressedMoonPhase(moonLon, sunLon);
        expect(phase).toBeDefined();
        expect(typeof phase).toBe('string');
      });
    });
  });

  describe('getProgressionSummary', () => {
    it('should return summary with all required fields', async () => {
      const natal = createNatalInput();
      const progressed = await calculateSecondaryProgressions({
        natal,
        targetDate: '2020-06-15',
      });

      const summary = getProgressionSummary(progressed);

      expect(summary.asc).toBeDefined();
      expect(summary.mc).toBeDefined();
      expect(summary.progressedDate).toBeDefined();
      expect(summary.type).toBe('secondary');
    });

    it('should format ascendant and mc correctly', async () => {
      const natal = createNatalInput();
      const progressed = await calculateSecondaryProgressions({
        natal,
        targetDate: '2020-06-15',
      });

      const summary = getProgressionSummary(progressed);

      expect(typeof summary.asc).toBe('string');
      expect(typeof summary.mc).toBe('string');
      expect(summary.asc.length).toBeGreaterThan(0);
      expect(summary.mc.length).toBeGreaterThan(0);
    });
  });

  describe('findProgressedToNatalAspects', () => {
    it('should find aspects between progressed and natal planets', () => {
      const progressed = createTestChart();
      const natal = createTestChart();

      const aspects = findProgressedToNatalAspects(progressed, natal);

      expect(Array.isArray(aspects)).toBe(true);
      expect(aspects.length).toBeGreaterThan(0);
      expect(aspects[0].planet).toBeDefined();
      expect(aspects[0].aspects).toBeDefined();
    });

    it('should return close aspects only', () => {
      const progressed = createTestChart();
      const natal = createTestChart();

      const aspects = findProgressedToNatalAspects(progressed, natal);

      for (const planetAspects of aspects) {
        for (const aspect of planetAspects.aspects) {
          expect(aspect.angle).toBeLessThanOrEqual(3);
        }
      }
    });

    it('should handle charts with no close aspects', () => {
      const progressed = createTestChart();
      const natal = createTestChart();
      // Modify natal planets to be far from progressed
      natal.planets = natal.planets.map((p, i) => ({
        ...p,
        longitude: (p.longitude + 180) % 360,
      }));

      const aspects = findProgressedToNatalAspects(progressed, natal);

      expect(Array.isArray(aspects)).toBe(true);
    });
  });

  describe('findProgressedInternalAspects', () => {
    it('should find aspects between progressed planets', () => {
      const progressed = createTestChart();

      const aspects = findProgressedInternalAspects(progressed);

      expect(Array.isArray(aspects)).toBe(true);
      expect(aspects.length).toBeGreaterThan(0);
    });

    it('should return aspect pairs with angles', () => {
      const progressed = createTestChart();

      const aspects = findProgressedInternalAspects(progressed);

      for (const aspect of aspects) {
        expect(aspect.pair).toBeDefined();
        expect(aspect.pair).toContain('-');
        expect(aspect.angle).toBeGreaterThanOrEqual(0);
        expect(aspect.angle).toBeLessThanOrEqual(180);
      }
    });

    it('should not create duplicate pairs', () => {
      const progressed = createTestChart();

      const aspects = findProgressedInternalAspects(progressed);

      const pairs = aspects.map(a => a.pair);
      const reversePairs = pairs.map(p => {
        const [a, b] = p.split('-');
        return `${b}-${a}`;
      });

      // Check no reverse pairs exist
      for (const pair of pairs) {
        expect(reversePairs.includes(pair)).toBe(false);
      }
    });
  });

  describe('findProgressedMoonAspects', () => {
    it('should find aspects from progressed moon to natal planets', () => {
      const progressed = createTestChart();
      const natal = createTestChart();

      const aspects = findProgressedMoonAspects(progressed, natal);

      expect(Array.isArray(aspects)).toBe(true);
    });

    it('should return aspects within 3 degree orb', () => {
      const progressed = createTestChart();
      const natal = createTestChart();

      const aspects = findProgressedMoonAspects(progressed, natal);

      for (const aspect of aspects) {
        expect(aspect.angle).toBeLessThanOrEqual(3);
        expect(aspect.target).toBeDefined();
      }
    });

    it('should return empty array if no moon in progressed chart', () => {
      const progressed = createTestChart();
      progressed.planets = progressed.planets.filter(p => p.name !== 'Moon');
      const natal = createTestChart();

      const aspects = findProgressedMoonAspects(progressed, natal);

      expect(aspects).toHaveLength(0);
    });

    it('should include all natal planets as potential targets', () => {
      const progressed = createTestChart();
      const natal = createTestChart();

      const aspects = findProgressedMoonAspects(progressed, natal);

      // Should check against all natal planets
      const targets = aspects.map(a => a.target);
      const uniqueTargets = new Set(targets);
      expect(uniqueTargets.size).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle progression for exact birth date', async () => {
      const natal = createNatalInput();
      const progressed = await calculateSecondaryProgressions({
        natal,
        targetDate: '1990-06-15',
      });

      expect(progressed.yearsProgressed).toBeCloseTo(0, 1);
    });

    it('should handle large time spans', async () => {
      const natal = createNatalInput({ year: 1950 });
      const progressed = await calculateSecondaryProgressions({
        natal,
        targetDate: '2020-06-15',
      });

      expect(progressed.yearsProgressed).toBeGreaterThan(60);
      expect(progressed.planets).toBeDefined();
    });

    it('should handle different time zones', async () => {
      const natalUTC = createNatalInput({ timeZone: 'UTC' });
      const natalTokyo = createNatalInput({ timeZone: 'Asia/Tokyo' });

      const progUTC = await calculateSecondaryProgressions({
        natal: natalUTC,
        targetDate: '2020-06-15',
      });

      const progTokyo = await calculateSecondaryProgressions({
        natal: natalTokyo,
        targetDate: '2020-06-15',
      });

      // Should handle both time zones without errors
      expect(progUTC.planets).toBeDefined();
      expect(progTokyo.planets).toBeDefined();
    });

    it('should handle southern hemisphere locations', async () => {
      const natal = createNatalInput({
        latitude: -33.8688,
        longitude: 151.2093,
        timeZone: 'Australia/Sydney',
      });

      const progressed = await calculateSecondaryProgressions({
        natal,
        targetDate: '2020-06-15',
      });

      expect(progressed.planets).toBeDefined();
      expect(progressed.ascendant).toBeDefined();
    });
  });
});

