import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock cache manager
vi.mock('@/lib/destiny-map/astrology/cache-manager', () => ({
  CacheManager: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    getSize: vi.fn().mockReturnValue(0),
  })),
  generateDestinyMapCacheKey: vi.fn().mockReturnValue('test-cache-key'),
}));

// Mock natal calculations
vi.mock('@/lib/destiny-map/astrology/natal-calculations', () => ({
  calculateNatal: vi.fn().mockResolvedValue({
    chart: {
      planets: [
        { name: 'Sun', longitude: 84.5, sign: 'Gemini', house: 3 },
        { name: 'Moon', longitude: 105.2, sign: 'Cancer', house: 4 },
        { name: 'Mercury', longitude: 78.1, sign: 'Gemini', house: 3 },
        { name: 'Venus', longitude: 55.3, sign: 'Taurus', house: 2 },
        { name: 'Mars', longitude: 125.8, sign: 'Leo', house: 5 },
      ],
      houses: Array.from({ length: 12 }, (_, i) => ({ cusp: i * 30 })),
      ascendant: { sign: 'Aries', longitude: 15.5 },
      mc: { sign: 'Capricorn', longitude: 285.5 },
      meta: { jdUT: 2451545.0 },
    },
    facts: {
      elementRatios: { fire: 40, earth: 30, air: 20, water: 10 },
    },
    planets: [
      { name: 'Sun', sign: 'Gemini' },
      { name: 'Moon', sign: 'Cancer' },
    ],
    ascendant: { sign: 'Aries' },
    mc: { sign: 'Capricorn' },
  }),
  getNowInTimezone: vi.fn().mockReturnValue({
    year: 2024,
    month: 1,
    day: 13,
    hour: 10,
    minute: 30,
  }),
}));

// Mock advanced points
vi.mock('@/lib/destiny-map/astrology/advanced-points', () => ({
  calculateAdvancedPoints: vi.fn().mockResolvedValue({
    chiron: { sign: 'Aries', longitude: 15.5 },
    lilith: { sign: 'Taurus', longitude: 45.2 },
    partOfFortune: { sign: 'Cancer', longitude: 105.3 },
    vertex: { sign: 'Leo', longitude: 135.8 },
  }),
}));

// Mock returns progressions
vi.mock('@/lib/destiny-map/astrology/returns-progressions', () => ({
  calculateSolarReturnChart: vi.fn().mockResolvedValue({
    chart: { ascendant: { sign: 'Leo' } },
    summary: { theme: 'Year of creativity' },
  }),
  calculateLunarReturnChart: vi.fn().mockResolvedValue({
    chart: { ascendant: { sign: 'Scorpio' } },
    summary: { theme: 'Month of transformation' },
  }),
  calculateAllProgressions: vi.fn().mockResolvedValue({
    secondary: {
      chart: { planets: [] },
      moonPhase: 'First Quarter',
      summary: { theme: 'Growth period' },
    },
    solarArc: {
      chart: { planets: [] },
      summary: { theme: 'Direction change' },
    },
  }),
}));

// Mock specialized charts
vi.mock('@/lib/destiny-map/astrology/specialized-charts', () => ({
  calculateAllSpecializedCharts: vi.fn().mockResolvedValue({
    draconic: {
      planets: [{ name: 'Sun', sign: 'Cancer' }],
      interpretation: 'Soul-level patterns',
    },
    harmonics: {
      h5: { planets: [], theme: 'Creative talents' },
      h7: { planets: [], theme: 'Spiritual gifts' },
    },
  }),
}));

// Mock asteroids stars
vi.mock('@/lib/destiny-map/astrology/asteroids-stars', () => ({
  calculateAllAsteroidsStars: vi.fn().mockResolvedValue({
    asteroids: [
      { name: 'Ceres', sign: 'Virgo', longitude: 165.5 },
      { name: 'Juno', sign: 'Libra', longitude: 195.2 },
    ],
    fixedStars: [
      { name: 'Regulus', longitude: 150.0, conjunctions: ['Sun'] },
    ],
    eclipses: {
      upcoming: [{ type: 'Solar', date: '2024-04-08' }],
      impact: { affectedPlanets: ['Sun'] },
    },
  }),
}));

// Mock astrology
vi.mock('@/lib/astrology', () => ({
  isNightChart: vi.fn().mockReturnValue(false),
}));

// Mock Saju
vi.mock('@/lib/Saju', () => ({
  calculateSajuData: vi.fn().mockResolvedValue({
    dayMaster: { name: '갑', element: '목' },
    yearPillar: { stem: '甲', branch: '子' },
    monthPillar: { stem: '乙', branch: '丑' },
    dayPillar: { stem: '丙', branch: '寅' },
    timePillar: { stem: '丁', branch: '卯' },
  }),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock tz-lookup
vi.mock('tz-lookup', () => ({
  default: vi.fn().mockReturnValue('Asia/Seoul'),
}));

// Import after mocks
import {
  computeDestinyMapRefactored,
  calculateAstrologyData,
} from '@/lib/destiny-map/astrology/engine-core';
import type { CombinedInput } from '@/lib/destiny-map/astrologyengine';

describe('Engine Core', () => {
  const mockInput: CombinedInput = {
    birthDate: '1990-06-15',
    birthTime: '10:30',
    latitude: 37.5665,
    longitude: 126.978,
    gender: 'male',
    tz: 'Asia/Seoul',
    userTimezone: 'Asia/Seoul',
    name: 'Test User',
  };

  const mockNatalChart = {
    planets: [
      { name: 'Sun', longitude: 84.5, sign: 'Gemini', house: 3 },
      { name: 'Moon', longitude: 105.2, sign: 'Cancer', house: 4 },
    ],
    houses: Array.from({ length: 12 }, (_, i) => ({ cusp: i * 30 })),
    ascendant: { sign: 'Aries', longitude: 15.5 },
    mc: { sign: 'Capricorn', longitude: 285.5 },
    meta: { jdUT: 2451545.0 },
  };

  const mockUserNow = {
    year: 2024,
    month: 1,
    day: 13,
    hour: 10,
    minute: 30,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('computeDestinyMapRefactored', () => {
    it('should return a valid CombinedResult', async () => {
      const result = await computeDestinyMapRefactored(mockInput);

      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('astrology');
      expect(result).toHaveProperty('saju');
      expect(result).toHaveProperty('summary');
    });

    it('should include meta information', async () => {
      const result = await computeDestinyMapRefactored(mockInput);

      expect(result.meta).toHaveProperty('generator');
      expect(result.meta).toHaveProperty('generatedAt');
      expect(result.meta.name).toBe('Test User');
      expect(result.meta.gender).toBe('male');
    });

    it('should include astrology data', async () => {
      const result = await computeDestinyMapRefactored(mockInput);

      expect(result.astrology).toHaveProperty('planets');
      expect(result.astrology).toHaveProperty('facts');
    });

    it('should include saju data', async () => {
      const result = await computeDestinyMapRefactored(mockInput);

      expect(result.saju).toHaveProperty('facts');
      expect(result.saju).toHaveProperty('pillars');
      expect(result.saju).toHaveProperty('dayMaster');
      expect(result.saju).toHaveProperty('unse');
    });

    it('should generate summary string', async () => {
      const result = await computeDestinyMapRefactored(mockInput);

      expect(typeof result.summary).toBe('string');
      expect(result.summary).toContain('Sun:');
      expect(result.summary).toContain('Moon:');
    });

    it('should include advanced astrology data', async () => {
      const result = await computeDestinyMapRefactored(mockInput);

      // These come from calculateAstrologyData
      expect(result).toHaveProperty('extraPoints');
      expect(result).toHaveProperty('solarReturn');
      expect(result).toHaveProperty('lunarReturn');
      expect(result).toHaveProperty('progressions');
      expect(result).toHaveProperty('draconic');
      expect(result).toHaveProperty('harmonics');
      expect(result).toHaveProperty('asteroids');
      expect(result).toHaveProperty('fixedStars');
      expect(result).toHaveProperty('eclipses');
    });

    it('should handle input without name', async () => {
      const inputWithoutName = { ...mockInput, name: undefined };
      const result = await computeDestinyMapRefactored(inputWithoutName);

      expect(result.meta.name).toBeUndefined();
      expect(result.summary).not.toContain('Name:');
    });

    it('should handle input without timezone', async () => {
      const inputWithoutTz = { ...mockInput, tz: undefined };
      const result = await computeDestinyMapRefactored(inputWithoutTz);

      expect(result).toHaveProperty('meta');
    });

    it('should handle female gender', async () => {
      const femaleInput = { ...mockInput, gender: 'female' as const };
      const result = await computeDestinyMapRefactored(femaleInput);

      expect(result.meta.gender).toBe('female');
    });

    it('should default to male when gender is undefined', async () => {
      const inputWithoutGender = { ...mockInput, gender: undefined };
      const result = await computeDestinyMapRefactored(inputWithoutGender);

      expect(result).toHaveProperty('saju');
    });

    it('should return error result for invalid coordinates', async () => {
      const invalidInput = { ...mockInput, latitude: 100 }; // Invalid latitude

      const result = await computeDestinyMapRefactored(invalidInput);

      expect(result.meta.generator).toContain('Error');
      expect(result.summary).toContain('error');
    });

    it('should return error result for invalid longitude', async () => {
      const invalidInput = { ...mockInput, longitude: 200 }; // Invalid longitude

      const result = await computeDestinyMapRefactored(invalidInput);

      expect(result.meta.generator).toContain('Error');
    });

    it('should return error result for invalid date format', async () => {
      const invalidInput = { ...mockInput, birthDate: 'invalid-date' };

      const result = await computeDestinyMapRefactored(invalidInput);

      expect(result.meta.generator).toContain('Error');
    });
  });

  describe('calculateAstrologyData', () => {
    it('should return all advanced astrology features', async () => {
      const result = await calculateAstrologyData(mockInput, mockNatalChart as any, mockUserNow);

      expect(result).toHaveProperty('extraPoints');
      expect(result).toHaveProperty('solarReturn');
      expect(result).toHaveProperty('lunarReturn');
      expect(result).toHaveProperty('progressions');
      expect(result).toHaveProperty('draconic');
      expect(result).toHaveProperty('harmonics');
      expect(result).toHaveProperty('asteroids');
      expect(result).toHaveProperty('fixedStars');
      expect(result).toHaveProperty('eclipses');
    });

    it('should include extra points data', async () => {
      const result = await calculateAstrologyData(mockInput, mockNatalChart as any, mockUserNow);

      expect(result.extraPoints).toHaveProperty('chiron');
      expect(result.extraPoints).toHaveProperty('lilith');
      expect(result.extraPoints).toHaveProperty('partOfFortune');
      expect(result.extraPoints).toHaveProperty('vertex');
    });

    it('should include solar return data', async () => {
      const result = await calculateAstrologyData(mockInput, mockNatalChart as any, mockUserNow);

      expect(result.solarReturn).toHaveProperty('chart');
      expect(result.solarReturn).toHaveProperty('summary');
    });

    it('should include lunar return data', async () => {
      const result = await calculateAstrologyData(mockInput, mockNatalChart as any, mockUserNow);

      expect(result.lunarReturn).toHaveProperty('chart');
      expect(result.lunarReturn).toHaveProperty('summary');
    });

    it('should include progressions data', async () => {
      const result = await calculateAstrologyData(mockInput, mockNatalChart as any, mockUserNow);

      expect(result.progressions).toHaveProperty('secondary');
      expect(result.progressions).toHaveProperty('solarArc');
    });

    it('should include draconic chart data', async () => {
      const result = await calculateAstrologyData(mockInput, mockNatalChart as any, mockUserNow);

      expect(result.draconic).toBeDefined();
    });

    it('should include harmonics data', async () => {
      const result = await calculateAstrologyData(mockInput, mockNatalChart as any, mockUserNow);

      expect(result.harmonics).toBeDefined();
    });

    it('should include asteroids data', async () => {
      const result = await calculateAstrologyData(mockInput, mockNatalChart as any, mockUserNow);

      expect(Array.isArray(result.asteroids)).toBe(true);
    });

    it('should include fixed stars data', async () => {
      const result = await calculateAstrologyData(mockInput, mockNatalChart as any, mockUserNow);

      expect(Array.isArray(result.fixedStars)).toBe(true);
    });

    it('should include eclipses data', async () => {
      const result = await calculateAstrologyData(mockInput, mockNatalChart as any, mockUserNow);

      expect(result.eclipses).toBeDefined();
    });

    it('should handle partial calculation failures gracefully', async () => {
      // Mock one calculation to fail
      const { calculateAdvancedPoints } = await import('@/lib/destiny-map/astrology/advanced-points');
      vi.mocked(calculateAdvancedPoints).mockRejectedValueOnce(new Error('Advanced points failed'));

      const result = await calculateAstrologyData(mockInput, mockNatalChart as any, mockUserNow);

      // Should still have other data
      expect(result.solarReturn).toBeDefined();
      expect(result.lunarReturn).toBeDefined();
      // extraPoints should be undefined since it failed
      expect(result.extraPoints).toBeUndefined();
    });
  });

  describe('Input Validation', () => {
    it('should validate latitude range', async () => {
      const invalidLatitude = { ...mockInput, latitude: 95 };
      const result = await computeDestinyMapRefactored(invalidLatitude);

      expect(result.meta.generator).toContain('Error');
    });

    it('should validate longitude range', async () => {
      const invalidLongitude = { ...mockInput, longitude: -185 };
      const result = await computeDestinyMapRefactored(invalidLongitude);

      expect(result.meta.generator).toContain('Error');
    });

    it('should handle NaN coordinates', async () => {
      const nanCoords = { ...mockInput, latitude: NaN };
      const result = await computeDestinyMapRefactored(nanCoords);

      expect(result.meta.generator).toContain('Error');
    });

    it('should handle Infinity coordinates', async () => {
      const infCoords = { ...mockInput, latitude: Infinity };
      const result = await computeDestinyMapRefactored(infCoords);

      expect(result.meta.generator).toContain('Error');
    });
  });

  describe('Date/Time Parsing', () => {
    it('should parse standard date format', async () => {
      const result = await computeDestinyMapRefactored(mockInput);

      expect(result.meta.generatedAt).toBeDefined();
    });

    it('should handle time without minutes', async () => {
      const timeWithoutMinutes = { ...mockInput, birthTime: '10:' };
      const result = await computeDestinyMapRefactored(timeWithoutMinutes);

      // Should not throw, should use 0 for missing minute
      expect(result).toHaveProperty('meta');
    });

    it('should pad single-digit hours', async () => {
      const singleDigitHour = { ...mockInput, birthTime: '9:30' };
      const result = await computeDestinyMapRefactored(singleDigitHour);

      expect(result).toHaveProperty('saju');
    });
  });

  describe('Caching', () => {
    it('should return valid result on first call', async () => {
      const result = await computeDestinyMapRefactored(mockInput);

      // On first call, result should be generated (not from cache)
      expect(result).toHaveProperty('meta');
      expect(result.meta.generator).toContain('DestinyMap');
    });

    it('should return consistent results', async () => {
      const result1 = await computeDestinyMapRefactored(mockInput);
      const result2 = await computeDestinyMapRefactored(mockInput);

      // Both calls should return valid results
      expect(result1.meta.generator).toBe(result2.meta.generator);
    });
  });
});
