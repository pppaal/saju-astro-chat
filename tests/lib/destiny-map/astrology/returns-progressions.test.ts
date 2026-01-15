import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateSolarReturnChart,
  calculateLunarReturnChart,
  calculateSecondaryProgressionsChart,
  calculateSolarArcChart,
  calculateAllProgressions,
  type ReturnsProgressionsInput,
  type NatalInput,
  type CurrentDate,
} from '@/lib/destiny-map/astrology/returns-progressions';

// Mock astrology functions
vi.mock('@/lib/astrology', () => ({
  calculateSolarReturn: vi.fn().mockResolvedValue({
    date: new Date('2024-06-15'),
    ascendant: { sign: 'Aries', longitude: 15.5 },
    mc: { sign: 'Capricorn', longitude: 285.5 },
    planets: [
      { name: 'Sun', sign: 'Gemini', longitude: 84.5, house: 3 },
      { name: 'Moon', sign: 'Cancer', longitude: 105.2, house: 4 },
      { name: 'Mercury', sign: 'Gemini', longitude: 78.1, house: 3 },
      { name: 'Venus', sign: 'Taurus', longitude: 55.3, house: 2 },
      { name: 'Mars', sign: 'Leo', longitude: 125.8, house: 5 },
    ],
    houses: Array.from({ length: 12 }, (_, i) => ({
      number: i + 1,
      sign: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][i],
      cusp: i * 30,
    })),
  }),
  calculateLunarReturn: vi.fn().mockResolvedValue({
    date: new Date('2024-01-20'),
    ascendant: { sign: 'Scorpio', longitude: 215.3 },
    mc: { sign: 'Leo', longitude: 125.7 },
    planets: [
      { name: 'Sun', sign: 'Aquarius', longitude: 305.2, house: 4 },
      { name: 'Moon', sign: 'Cancer', longitude: 105.5, house: 9 },
      { name: 'Mercury', sign: 'Capricorn', longitude: 285.1, house: 3 },
      { name: 'Venus', sign: 'Sagittarius', longitude: 265.8, house: 2 },
      { name: 'Mars', sign: 'Capricorn', longitude: 290.4, house: 3 },
    ],
    houses: Array.from({ length: 12 }, (_, i) => ({
      number: i + 1,
      sign: ['Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra'][i],
      cusp: 210 + i * 30,
    })),
  }),
  getSolarReturnSummary: vi.fn().mockReturnValue({
    ascendant: { sign: 'Aries', interpretation: 'New beginnings and initiative' },
    sun: { sign: 'Gemini', house: 3, interpretation: 'Focus on communication' },
    moon: { sign: 'Cancer', house: 4, interpretation: 'Emotional home focus' },
    theme: 'Year of communication and learning',
    keyPlanets: ['Mercury', 'Venus'],
  }),
  getLunarReturnSummary: vi.fn().mockReturnValue({
    moon: { sign: 'Cancer', house: 9, interpretation: 'Emotional exploration' },
    ascendant: { sign: 'Scorpio', interpretation: 'Deep introspection' },
    theme: 'Month of emotional depth',
    focus: ['relationships', 'self-discovery'],
  }),
  calculateSecondaryProgressions: vi.fn().mockResolvedValue({
    targetDate: '2024-01-13',
    planets: [
      { name: 'Sun', sign: 'Leo', longitude: 130.5, house: 5 },
      { name: 'Moon', sign: 'Scorpio', longitude: 218.7, house: 8 },
      { name: 'Mercury', sign: 'Leo', longitude: 128.3, house: 5 },
      { name: 'Venus', sign: 'Virgo', longitude: 165.2, house: 6 },
      { name: 'Mars', sign: 'Virgo', longitude: 170.8, house: 6 },
    ],
    ascendant: { sign: 'Aries', longitude: 12.5 },
    mc: { sign: 'Capricorn', longitude: 282.5 },
  }),
  calculateSolarArcDirections: vi.fn().mockResolvedValue({
    targetDate: '2024-01-13',
    arcValue: 33.75,
    planets: [
      { name: 'Sun', sign: 'Leo', longitude: 118.25, house: 5 },
      { name: 'Moon', sign: 'Libra', longitude: 188.95, house: 7 },
      { name: 'Mercury', sign: 'Leo', longitude: 111.85, house: 5 },
      { name: 'Venus', sign: 'Leo', longitude: 89.05, house: 5 },
      { name: 'Mars', sign: 'Libra', longitude: 159.55, house: 7 },
    ],
    ascendant: { sign: 'Taurus', longitude: 49.25 },
    mc: { sign: 'Aquarius', longitude: 319.25 },
  }),
  getProgressedMoonPhase: vi.fn((sunLong: number, moonLong: number) => {
    const diff = (moonLong - sunLong + 360) % 360;
    if (diff < 45) return 'New Moon';
    if (diff < 90) return 'Crescent';
    if (diff < 135) return 'First Quarter';
    if (diff < 180) return 'Gibbous';
    if (diff < 225) return 'Full Moon';
    if (diff < 270) return 'Disseminating';
    if (diff < 315) return 'Last Quarter';
    return 'Balsamic';
  }),
  getProgressionSummary: vi.fn().mockReturnValue({
    sun: { sign: 'Leo', interpretation: 'Creative self-expression period' },
    moon: { sign: 'Scorpio', interpretation: 'Deep emotional transformation' },
    theme: 'Personal transformation and creative growth',
    keyAspects: [
      { planet1: 'Sun', planet2: 'Moon', aspect: 'Square', interpretation: 'Inner tension driving growth' },
    ],
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

describe('Returns and Progressions', () => {
  const mockNatal: NatalInput = {
    year: 1990,
    month: 6,
    date: 15,
    hour: 10,
    minute: 30,
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  };

  const mockCurrentDate: CurrentDate = {
    year: 2024,
    month: 1,
    day: 13,
  };

  const mockInput: ReturnsProgressionsInput = {
    natal: mockNatal,
    currentDate: mockCurrentDate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateSolarReturnChart', () => {
    it('should return a valid SolarReturnResult', async () => {
      const result = await calculateSolarReturnChart(mockInput);

      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('summary');
      expect(result.chart).toHaveProperty('ascendant');
      expect(result.chart).toHaveProperty('mc');
      expect(result.chart).toHaveProperty('planets');
    });

    it('should include ascendant in summary', async () => {
      const result = await calculateSolarReturnChart(mockInput);

      expect(result.summary.ascendant).toBeDefined();
      expect(result.summary.ascendant.sign).toBeDefined();
    });

    it('should include theme in summary', async () => {
      const result = await calculateSolarReturnChart(mockInput);

      expect(result.summary.theme).toBeDefined();
      expect(typeof result.summary.theme).toBe('string');
    });

    it('should enable debug logs when flag is true', async () => {
      const { logger } = await import('@/lib/logger');

      await calculateSolarReturnChart(mockInput, true);

      expect(logger.debug).toHaveBeenCalled();
    });

    it('should not log debug when flag is false', async () => {
      const { logger } = await import('@/lib/logger');

      await calculateSolarReturnChart(mockInput, false);

      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should handle calculation errors', async () => {
      const { calculateSolarReturn } = await import('@/lib/astrology');
      vi.mocked(calculateSolarReturn).mockRejectedValueOnce(new Error('Calculation failed'));

      await expect(calculateSolarReturnChart(mockInput)).rejects.toThrow('Calculation failed');
    });
  });

  describe('calculateLunarReturnChart', () => {
    it('should return a valid LunarReturnResult', async () => {
      const result = await calculateLunarReturnChart(mockInput);

      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('summary');
      expect(result.chart).toHaveProperty('planets');
    });

    it('should include moon in summary', async () => {
      const result = await calculateLunarReturnChart(mockInput);

      expect(result.summary.moon).toBeDefined();
      expect(result.summary.moon.sign).toBeDefined();
    });

    it('should include theme in summary', async () => {
      const result = await calculateLunarReturnChart(mockInput);

      expect(result.summary.theme).toBeDefined();
    });

    it('should enable debug logs when flag is true', async () => {
      const { logger } = await import('@/lib/logger');

      await calculateLunarReturnChart(mockInput, true);

      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle calculation errors', async () => {
      const { calculateLunarReturn } = await import('@/lib/astrology');
      vi.mocked(calculateLunarReturn).mockRejectedValueOnce(new Error('Lunar calculation failed'));

      await expect(calculateLunarReturnChart(mockInput)).rejects.toThrow('Lunar calculation failed');
    });
  });

  describe('calculateSecondaryProgressionsChart', () => {
    it('should return a valid SecondaryProgressionResult', async () => {
      const result = await calculateSecondaryProgressionsChart(mockInput);

      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('moonPhase');
      expect(result).toHaveProperty('summary');
    });

    it('should calculate progressed moon phase', async () => {
      const result = await calculateSecondaryProgressionsChart(mockInput);

      expect(result.moonPhase).toBeDefined();
      expect(['New Moon', 'Crescent', 'First Quarter', 'Gibbous', 'Full Moon', 'Disseminating', 'Last Quarter', 'Balsamic', 'Dark Moon'])
        .toContain(result.moonPhase);
    });

    it('should include planets in chart', async () => {
      const result = await calculateSecondaryProgressionsChart(mockInput);

      expect(result.chart.planets).toBeDefined();
      expect(Array.isArray(result.chart.planets)).toBe(true);
    });

    it('should format target date correctly', async () => {
      const { calculateSecondaryProgressions } = await import('@/lib/astrology');

      await calculateSecondaryProgressionsChart(mockInput);

      expect(calculateSecondaryProgressions).toHaveBeenCalledWith(
        expect.objectContaining({
          targetDate: '2024-01-13',
        })
      );
    });

    it('should enable debug logs when flag is true', async () => {
      const { logger } = await import('@/lib/logger');

      await calculateSecondaryProgressionsChart(mockInput, true);

      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle missing Sun/Moon gracefully', async () => {
      const { calculateSecondaryProgressions } = await import('@/lib/astrology');
      vi.mocked(calculateSecondaryProgressions).mockResolvedValueOnce({
        targetDate: '2024-01-13',
        planets: [], // No planets
        ascendant: { sign: 'Aries', longitude: 12.5 },
        mc: { sign: 'Capricorn', longitude: 282.5 },
      });

      const result = await calculateSecondaryProgressionsChart(mockInput);

      expect(result.moonPhase).toBe('Dark Moon');
    });

    it('should handle calculation errors', async () => {
      const { calculateSecondaryProgressions } = await import('@/lib/astrology');
      vi.mocked(calculateSecondaryProgressions).mockRejectedValueOnce(new Error('Progression failed'));

      await expect(calculateSecondaryProgressionsChart(mockInput)).rejects.toThrow('Progression failed');
    });
  });

  describe('calculateSolarArcChart', () => {
    it('should return a valid SolarArcResult', async () => {
      const result = await calculateSolarArcChart(mockInput);

      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('summary');
    });

    it('should include planets in chart', async () => {
      const result = await calculateSolarArcChart(mockInput);

      expect(result.chart.planets).toBeDefined();
      expect(Array.isArray(result.chart.planets)).toBe(true);
    });

    it('should format target date correctly', async () => {
      const { calculateSolarArcDirections } = await import('@/lib/astrology');

      await calculateSolarArcChart(mockInput);

      expect(calculateSolarArcDirections).toHaveBeenCalledWith(
        expect.objectContaining({
          targetDate: '2024-01-13',
        })
      );
    });

    it('should enable debug logs when flag is true', async () => {
      const { logger } = await import('@/lib/logger');

      await calculateSolarArcChart(mockInput, true);

      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle calculation errors', async () => {
      const { calculateSolarArcDirections } = await import('@/lib/astrology');
      vi.mocked(calculateSolarArcDirections).mockRejectedValueOnce(new Error('Solar arc failed'));

      await expect(calculateSolarArcChart(mockInput)).rejects.toThrow('Solar arc failed');
    });
  });

  describe('calculateAllProgressions', () => {
    it('should return both secondary and solar arc by default', async () => {
      const result = await calculateAllProgressions(mockInput);

      expect(result).toHaveProperty('secondary');
      expect(result).toHaveProperty('solarArc');
      expect(result.secondary).toBeDefined();
      expect(result.solarArc).toBeDefined();
    });

    it('should exclude solar arc when includeSolarArc is false', async () => {
      const inputWithoutSolarArc: ReturnsProgressionsInput = {
        ...mockInput,
        includeSolarArc: false,
      };

      const result = await calculateAllProgressions(inputWithoutSolarArc);

      expect(result.secondary).toBeDefined();
      expect(result.solarArc).toBeUndefined();
    });

    it('should include solar arc when includeSolarArc is true', async () => {
      const inputWithSolarArc: ReturnsProgressionsInput = {
        ...mockInput,
        includeSolarArc: true,
      };

      const result = await calculateAllProgressions(inputWithSolarArc);

      expect(result.secondary).toBeDefined();
      expect(result.solarArc).toBeDefined();
    });

    it('should enable debug logs when flag is true', async () => {
      const { logger } = await import('@/lib/logger');

      await calculateAllProgressions(mockInput, true);

      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle secondary progression errors', async () => {
      const { calculateSecondaryProgressions } = await import('@/lib/astrology');
      vi.mocked(calculateSecondaryProgressions).mockRejectedValueOnce(new Error('Secondary failed'));

      await expect(calculateAllProgressions(mockInput)).rejects.toThrow('Secondary failed');
    });

    it('should handle solar arc errors', async () => {
      const { calculateSolarArcDirections } = await import('@/lib/astrology');
      vi.mocked(calculateSolarArcDirections).mockRejectedValueOnce(new Error('Solar arc failed'));

      await expect(calculateAllProgressions(mockInput)).rejects.toThrow('Solar arc failed');
    });
  });

  describe('Date formatting', () => {
    it('should pad single-digit months', async () => {
      const { calculateSecondaryProgressions } = await import('@/lib/astrology');

      const inputWithSingleDigitMonth: ReturnsProgressionsInput = {
        natal: mockNatal,
        currentDate: { year: 2024, month: 5, day: 1 },
      };

      await calculateSecondaryProgressionsChart(inputWithSingleDigitMonth);

      expect(calculateSecondaryProgressions).toHaveBeenCalledWith(
        expect.objectContaining({
          targetDate: '2024-05-01',
        })
      );
    });

    it('should pad single-digit days', async () => {
      const { calculateSecondaryProgressions } = await import('@/lib/astrology');

      const inputWithSingleDigitDay: ReturnsProgressionsInput = {
        natal: mockNatal,
        currentDate: { year: 2024, month: 12, day: 5 },
      };

      await calculateSecondaryProgressionsChart(inputWithSingleDigitDay);

      expect(calculateSecondaryProgressions).toHaveBeenCalledWith(
        expect.objectContaining({
          targetDate: '2024-12-05',
        })
      );
    });
  });

  describe('NatalInput validation', () => {
    it('should pass natal data to calculation functions', async () => {
      const { calculateSolarReturn } = await import('@/lib/astrology');

      await calculateSolarReturnChart(mockInput);

      expect(calculateSolarReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          natal: mockNatal,
        })
      );
    });

    it('should use correct year from currentDate', async () => {
      const { calculateSolarReturn } = await import('@/lib/astrology');

      await calculateSolarReturnChart(mockInput);

      expect(calculateSolarReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          year: 2024,
        })
      );
    });
  });
});
