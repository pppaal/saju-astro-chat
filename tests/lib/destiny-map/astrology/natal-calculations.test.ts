import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateNatal } from '@/lib/destiny-map/astrology/natal-calculations';

// Mock dependencies
vi.mock('@/lib/astrology', () => ({
  calculateNatalChart: vi.fn(),
  buildEngineMeta: vi.fn(),
  findNatalAspectsPlus: vi.fn(),
  resolveOptions: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  calculateNatalChart,
  buildEngineMeta,
  findNatalAspectsPlus,
  resolveOptions,
} from '@/lib/astrology';
import { logger } from '@/lib/logger';

describe('natal-calculations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockInput = {
    year: 1990,
    month: 5,
    date: 15,
    hour: 14,
    minute: 30,
    latitude: 37.5665,
    longitude: 126.9780,
    timeZone: 'Asia/Seoul',
  };

  const mockNatalChartResult = {
    planets: [
      { name: 'Sun', lon: 54.123, longitude: 54.123, lat: 0, speed: 1 },
      { name: 'Moon', lon: 120.456, longitude: 120.456, lat: 0, speed: 13 },
    ],
    houses: [
      { cusp: 1, formatted: '0° Aries' },
      { cusp: 2, formatted: '30° Taurus' },
    ],
    ascendant: { lon: 0, sign: 'Aries' },
    mc: { lon: 90, sign: 'Cancer' },
    meta: { jdUT: 2448000.5 },
  };

  describe('calculateNatal', () => {
    it('should calculate natal chart with all components', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalChartResult as any);
      vi.mocked(resolveOptions).mockReturnValue({
        theme: 'western',
        houseSystem: 'Placidus',
        nodeType: 'true',
        includeMinorAspects: false,
        enable: { chiron: false, lilith: false, pof: false },
      });
      vi.mocked(findNatalAspectsPlus).mockReturnValue([
        {
          from: { name: 'Sun', lon: 54.123 },
          to: { name: 'Moon', lon: 120.456 },
          aspect: 'sextile',
          angle: 60,
          orb: 6.333,
          score: 85,
        },
      ]);
      vi.mocked(buildEngineMeta).mockReturnValue({
        engine: 'swisseph',
        version: '2.0',
      });

      const result = await calculateNatal(mockInput);

      expect(calculateNatalChart).toHaveBeenCalledWith(mockInput);
      expect(result).toBeDefined();
      expect(result.chart).toBeDefined();
      expect(result.facts).toBeDefined();
      expect(result.aspects).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.planets).toBeDefined();
      expect(result.houses).toBeDefined();
      expect(result.ascendant).toBeDefined();
      expect(result.mc).toBeDefined();
    });

    it('should find natal aspects using resolved options', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalChartResult as any);
      vi.mocked(resolveOptions).mockReturnValue({
        theme: 'saju',
        houseSystem: 'WholeSign',
        nodeType: 'mean',
        includeMinorAspects: false,
        enable: { chiron: false, lilith: false, pof: false },
      });
      vi.mocked(findNatalAspectsPlus).mockReturnValue([]);
      vi.mocked(buildEngineMeta).mockReturnValue({});

      await calculateNatal(mockInput);

      expect(resolveOptions).toHaveBeenCalled();
      expect(findNatalAspectsPlus).toHaveBeenCalled();
    });

    it('should include jdUT in meta', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalChartResult as any);
      vi.mocked(resolveOptions).mockReturnValue({
        theme: 'western',
        houseSystem: 'Placidus',
        nodeType: 'true',
        includeMinorAspects: false,
        enable: { chiron: false, lilith: false, pof: false },
      });
      vi.mocked(findNatalAspectsPlus).mockReturnValue([]);
      vi.mocked(buildEngineMeta).mockReturnValue({
        engine: 'swisseph',
      });

      const result = await calculateNatal(mockInput);

      expect(result.meta).toHaveProperty('jdUT', 2448000.5);
    });

    it('should convert planets to PlanetData array', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalChartResult as any);
      vi.mocked(resolveOptions).mockReturnValue({
        theme: 'western',
        houseSystem: 'Placidus',
        nodeType: 'true',
        includeMinorAspects: false,
        enable: { chiron: false, lilith: false, pof: false },
      });
      vi.mocked(findNatalAspectsPlus).mockReturnValue([]);
      vi.mocked(buildEngineMeta).mockReturnValue({});

      const result = await calculateNatal(mockInput);

      expect(Array.isArray(result.planets)).toBe(true);
      expect(result.planets.length).toBe(2);
      expect(result.planets[0].name).toBe('Sun');
      expect(result.planets[1].name).toBe('Moon');
    });

    it('should convert houses to HouseCusp array', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalChartResult as any);
      vi.mocked(resolveOptions).mockReturnValue({
        theme: 'western',
        houseSystem: 'Placidus',
        nodeType: 'true',
        includeMinorAspects: false,
        enable: { chiron: false, lilith: false, pof: false },
      });
      vi.mocked(findNatalAspectsPlus).mockReturnValue([]);
      vi.mocked(buildEngineMeta).mockReturnValue({});

      const result = await calculateNatal(mockInput);

      expect(Array.isArray(result.houses)).toBe(true);
      expect(result.houses.length).toBe(2);
      expect(result.houses[0]).toHaveProperty('cusp');
      expect(result.houses[0]).toHaveProperty('longitude');
    });

    it('should return ascendant and mc from natal chart', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalChartResult as any);
      vi.mocked(resolveOptions).mockReturnValue({
        theme: 'western',
        houseSystem: 'Placidus',
        nodeType: 'true',
        includeMinorAspects: false,
        enable: { chiron: false, lilith: false, pof: false },
      });
      vi.mocked(findNatalAspectsPlus).mockReturnValue([]);
      vi.mocked(buildEngineMeta).mockReturnValue({});

      const result = await calculateNatal(mockInput);

      expect(result.ascendant).toEqual({ lon: 0, sign: 'Aries' });
      expect(result.mc).toEqual({ lon: 90, sign: 'Cancer' });
    });

    it('should log debug info when enabled', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalChartResult as any);
      vi.mocked(resolveOptions).mockReturnValue({
        theme: 'western',
        houseSystem: 'Placidus',
        nodeType: 'true',
        includeMinorAspects: false,
        enable: { chiron: false, lilith: false, pof: false },
      });
      vi.mocked(findNatalAspectsPlus).mockReturnValue([
        { from: { name: 'Sun' }, to: { name: 'Moon' }, aspect: 'trine' },
      ]);
      vi.mocked(buildEngineMeta).mockReturnValue({});

      await calculateNatal(mockInput, true);

      expect(logger.debug).toHaveBeenCalledWith(
        '[Natal] Calculating natal chart',
        expect.any(Object)
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[Natal] Calculated',
        expect.objectContaining({
          planets: 2,
          houses: 2,
          aspects: 1,
        })
      );
    });

    it('should not log when debug disabled', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalChartResult as any);
      vi.mocked(resolveOptions).mockReturnValue({
        theme: 'western',
        houseSystem: 'Placidus',
        nodeType: 'true',
        includeMinorAspects: false,
        enable: { chiron: false, lilith: false, pof: false },
      });
      vi.mocked(findNatalAspectsPlus).mockReturnValue([]);
      vi.mocked(buildEngineMeta).mockReturnValue({});

      await calculateNatal(mockInput, false);

      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should handle chart without meta gracefully', async () => {
      const resultWithoutMeta = {
        ...mockNatalChartResult,
        meta: null,
      };

      vi.mocked(calculateNatalChart).mockResolvedValue(resultWithoutMeta as any);
      vi.mocked(resolveOptions).mockReturnValue({
        theme: 'western',
        houseSystem: 'Placidus',
        nodeType: 'true',
        includeMinorAspects: false,
        enable: { chiron: false, lilith: false, pof: false },
      });
      vi.mocked(findNatalAspectsPlus).mockReturnValue([]);
      vi.mocked(buildEngineMeta).mockReturnValue({});

      const result = await calculateNatal(mockInput);

      expect(result.meta).toBeNull();
    });

    it('should handle empty aspects array', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalChartResult as any);
      vi.mocked(resolveOptions).mockReturnValue({
        theme: 'western',
        houseSystem: 'Placidus',
        nodeType: 'true',
        includeMinorAspects: false,
        enable: { chiron: false, lilith: false, pof: false },
      });
      vi.mocked(findNatalAspectsPlus).mockReturnValue([]);
      vi.mocked(buildEngineMeta).mockReturnValue({});

      const result = await calculateNatal(mockInput);

      expect(result.aspects).toEqual([]);
    });
  });
});
