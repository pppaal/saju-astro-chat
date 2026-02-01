import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateElectionalAnalysis,
  calculateMidpointsAnalysis,
} from '@/lib/destiny-map/astrology/electional-midpoints';
import type { Chart } from '@/lib/astrology';

// Mock the astrology foundation module
vi.mock('@/lib/astrology', async () => {
  const actual = await vi.importActual('@/lib/astrology');
  return {
    ...actual,
    getMoonPhase: vi.fn(),
    checkVoidOfCourse: vi.fn(),
    getRetrogradePlanets: vi.fn(),
    calculateMidpoints: vi.fn(),
    findMidpointActivations: vi.fn(),
  };
});

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  getMoonPhase,
  checkVoidOfCourse,
  getRetrogradePlanets,
  calculateMidpoints,
  findMidpointActivations,
} from '@/lib/astrology';

describe('electional-midpoints', () => {
  const mockChart: Chart = {
    planets: [
      { name: 'Sun', lon: 120, longitude: 120, lat: 0, speed: 1 },
      { name: 'Moon', lon: 180, longitude: 180, lat: 0, speed: 13 },
      { name: 'Mercury', lon: 115, longitude: 115, lat: 0, speed: 1.5 },
      { name: 'Ascendant', lon: 0, longitude: 0, lat: 0, speed: 0 },
      { name: 'MC', lon: 90, longitude: 90, lat: 0, speed: 0 },
    ],
    houses: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateElectionalAnalysis', () => {
    it('should return electional result with all components', async () => {
      const mockMoonPhase = {
        phase: 'waxing_crescent' as const,
        percentage: 25,
        angle: 60,
      };

      const mockVoidOfCourse = {
        isVoid: false,
        nextAspect: null,
        signChange: null,
      };

      const mockRetrograde = [
        { name: 'Mercury', longitude: 115, isRetrograde: true },
      ];

      vi.mocked(getMoonPhase).mockReturnValue(mockMoonPhase);
      vi.mocked(checkVoidOfCourse).mockReturnValue(mockVoidOfCourse);
      vi.mocked(getRetrogradePlanets).mockReturnValue(mockRetrograde);

      const result = await calculateElectionalAnalysis({ natalChart: mockChart });

      expect(result).toBeDefined();
      expect(result?.moonPhase).toEqual(mockMoonPhase);
      expect(result?.voidOfCourse).toEqual(mockVoidOfCourse);
      expect(result?.retrograde).toEqual(mockRetrograde);
      expect(result?.planetaryHour).toBeDefined();
      expect(result?.planetaryHour.planet).toBe('Sun');
    });

    it('should use provided sun and moon planets', async () => {
      const mockMoonPhase = { phase: 'full' as const, percentage: 100, angle: 180 };
      vi.mocked(getMoonPhase).mockReturnValue(mockMoonPhase);
      vi.mocked(checkVoidOfCourse).mockReturnValue({ isVoid: false, nextAspect: null, signChange: null });
      vi.mocked(getRetrogradePlanets).mockReturnValue([]);

      const customSun = { name: 'Sun', lon: 90, longitude: 90, lat: 0, speed: 1 };
      const customMoon = { name: 'Moon', lon: 270, longitude: 270, lat: 0, speed: 13 };

      const result = await calculateElectionalAnalysis({
        natalChart: mockChart,
        sunPlanet: customSun,
        moonPlanet: customMoon,
      });

      expect(getMoonPhase).toHaveBeenCalledWith(90, 270);
      expect(result).toBeDefined();
    });

    it('should return undefined if Sun is missing', async () => {
      const chartWithoutSun: Chart = {
        planets: [
          { name: 'Moon', lon: 180, longitude: 180, lat: 0, speed: 13 },
        ],
        houses: [],
      };

      const result = await calculateElectionalAnalysis({ natalChart: chartWithoutSun });

      expect(result).toBeUndefined();
    });

    it('should return undefined if Moon is missing', async () => {
      const chartWithoutMoon: Chart = {
        planets: [
          { name: 'Sun', lon: 120, longitude: 120, lat: 0, speed: 1 },
        ],
        houses: [],
      };

      const result = await calculateElectionalAnalysis({ natalChart: chartWithoutMoon });

      expect(result).toBeUndefined();
    });

    it('should return undefined on error', async () => {
      vi.mocked(getMoonPhase).mockImplementation(() => {
        throw new Error('Mock error');
      });

      const result = await calculateElectionalAnalysis({ natalChart: mockChart });

      expect(result).toBeUndefined();
    });

    it('should log debug info when enabled', async () => {
      const { logger } = await import('@/lib/logger');

      vi.mocked(getMoonPhase).mockReturnValue({ phase: 'new', percentage: 0, angle: 0 });
      vi.mocked(checkVoidOfCourse).mockReturnValue({ isVoid: true, nextAspect: null, signChange: null });
      vi.mocked(getRetrogradePlanets).mockReturnValue([]);

      await calculateElectionalAnalysis({ natalChart: mockChart }, true);

      expect(logger.debug).toHaveBeenCalled();
    });

    it('should have analysis property set to undefined', async () => {
      vi.mocked(getMoonPhase).mockReturnValue({ phase: 'new', percentage: 0, angle: 0 });
      vi.mocked(checkVoidOfCourse).mockReturnValue({ isVoid: false, nextAspect: null, signChange: null });
      vi.mocked(getRetrogradePlanets).mockReturnValue([]);

      const result = await calculateElectionalAnalysis({ natalChart: mockChart });

      expect(result?.analysis).toBeUndefined();
    });

    it('should create planetary hour with correct structure', async () => {
      vi.mocked(getMoonPhase).mockReturnValue({ phase: 'new', percentage: 0, angle: 0 });
      vi.mocked(checkVoidOfCourse).mockReturnValue({ isVoid: false, nextAspect: null, signChange: null });
      vi.mocked(getRetrogradePlanets).mockReturnValue([]);

      const result = await calculateElectionalAnalysis({ natalChart: mockChart });

      expect(result?.planetaryHour).toMatchObject({
        planet: 'Sun',
        dayRuler: 'Sun',
        isDay: true,
        goodFor: ['general'],
      });
      expect(result?.planetaryHour.startTime).toBeInstanceOf(Date);
      expect(result?.planetaryHour.endTime).toBeInstanceOf(Date);
    });
  });

  describe('calculateMidpointsAnalysis', () => {
    it('should return midpoints result with all midpoints', async () => {
      const mockMidpoints = [
        { planet1: 'Sun', planet2: 'Moon', midpoint: 150, orb: 0 },
        { planet1: 'Ascendant', planet2: 'MC', midpoint: 45, orb: 0 },
        { planet1: 'Sun', planet2: 'Mercury', midpoint: 117.5, orb: 0 },
      ];

      const mockActivations = [
        { midpoint: mockMidpoints[0], activatingPlanet: 'Mars', orb: 2 },
      ];

      vi.mocked(calculateMidpoints).mockReturnValue(mockMidpoints);
      vi.mocked(findMidpointActivations).mockReturnValue(mockActivations);

      const result = await calculateMidpointsAnalysis(mockChart);

      expect(result).toBeDefined();
      expect(result?.all).toEqual(mockMidpoints);
      expect(result?.activations).toEqual(mockActivations);
    });

    it('should identify Sun/Moon midpoint', async () => {
      const sunMoonMidpoint = { planet1: 'Sun', planet2: 'Moon', midpoint: 150, orb: 0 };
      const mockMidpoints = [
        sunMoonMidpoint,
        { planet1: 'Ascendant', planet2: 'MC', midpoint: 45, orb: 0 },
      ];

      vi.mocked(calculateMidpoints).mockReturnValue(mockMidpoints);
      vi.mocked(findMidpointActivations).mockReturnValue([]);

      const result = await calculateMidpointsAnalysis(mockChart);

      expect(result?.sunMoon).toEqual(sunMoonMidpoint);
    });

    it('should identify Sun/Moon midpoint in reverse order', async () => {
      const sunMoonMidpoint = { planet1: 'Moon', planet2: 'Sun', midpoint: 150, orb: 0 };
      const mockMidpoints = [sunMoonMidpoint];

      vi.mocked(calculateMidpoints).mockReturnValue(mockMidpoints);
      vi.mocked(findMidpointActivations).mockReturnValue([]);

      const result = await calculateMidpointsAnalysis(mockChart);

      expect(result?.sunMoon).toEqual(sunMoonMidpoint);
    });

    it('should identify Asc/MC midpoint', async () => {
      const ascMcMidpoint = { planet1: 'Ascendant', planet2: 'MC', midpoint: 45, orb: 0 };
      const mockMidpoints = [
        { planet1: 'Sun', planet2: 'Moon', midpoint: 150, orb: 0 },
        ascMcMidpoint,
      ];

      vi.mocked(calculateMidpoints).mockReturnValue(mockMidpoints);
      vi.mocked(findMidpointActivations).mockReturnValue([]);

      const result = await calculateMidpointsAnalysis(mockChart);

      expect(result?.ascMc).toEqual(ascMcMidpoint);
    });

    it('should identify Asc/MC midpoint in reverse order', async () => {
      const ascMcMidpoint = { planet1: 'MC', planet2: 'Ascendant', midpoint: 45, orb: 0 };
      const mockMidpoints = [ascMcMidpoint];

      vi.mocked(calculateMidpoints).mockReturnValue(mockMidpoints);
      vi.mocked(findMidpointActivations).mockReturnValue([]);

      const result = await calculateMidpointsAnalysis(mockChart);

      expect(result?.ascMc).toEqual(ascMcMidpoint);
    });

    it('should handle missing Sun/Moon midpoint', async () => {
      const mockMidpoints = [
        { planet1: 'Ascendant', planet2: 'MC', midpoint: 45, orb: 0 },
      ];

      vi.mocked(calculateMidpoints).mockReturnValue(mockMidpoints);
      vi.mocked(findMidpointActivations).mockReturnValue([]);

      const result = await calculateMidpointsAnalysis(mockChart);

      expect(result?.sunMoon).toBeUndefined();
    });

    it('should handle missing Asc/MC midpoint', async () => {
      const mockMidpoints = [
        { planet1: 'Sun', planet2: 'Moon', midpoint: 150, orb: 0 },
      ];

      vi.mocked(calculateMidpoints).mockReturnValue(mockMidpoints);
      vi.mocked(findMidpointActivations).mockReturnValue([]);

      const result = await calculateMidpointsAnalysis(mockChart);

      expect(result?.ascMc).toBeUndefined();
    });

    it('should return undefined on error', async () => {
      vi.mocked(calculateMidpoints).mockImplementation(() => {
        throw new Error('Mock error');
      });

      const result = await calculateMidpointsAnalysis(mockChart);

      expect(result).toBeUndefined();
    });

    it('should log debug info when enabled', async () => {
      const { logger } = await import('@/lib/logger');

      vi.mocked(calculateMidpoints).mockReturnValue([]);
      vi.mocked(findMidpointActivations).mockReturnValue([]);

      await calculateMidpointsAnalysis(mockChart, true);

      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle empty midpoints array', async () => {
      vi.mocked(calculateMidpoints).mockReturnValue([]);
      vi.mocked(findMidpointActivations).mockReturnValue([]);

      const result = await calculateMidpointsAnalysis(mockChart);

      expect(result).toBeDefined();
      expect(result?.all).toEqual([]);
      expect(result?.sunMoon).toBeUndefined();
      expect(result?.ascMc).toBeUndefined();
      expect(result?.activations).toEqual([]);
    });
  });
});
