/**
 * Tests for src/lib/destiny-map/astrology/advanced-points.ts
 * 고급 포인트 계산 (Chiron, Lilith, Part of Fortune, Vertex)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateAdvancedPoints, type AdvancedPointsInput } from '@/lib/destiny-map/astrology/advanced-points';

// Mock the astrology module
vi.mock('@/lib/astrology', () => ({
  calculateChiron: vi.fn(() => ({
    name: 'Chiron',
    longitude: 45.5,
    sign: 'Taurus',
    degree: 15.5,
    house: 2,
    retrograde: false,
  })),
  calculateLilith: vi.fn(() => ({
    name: 'Lilith',
    longitude: 120.3,
    sign: 'Leo',
    degree: 0.3,
    house: 5,
    retrograde: false,
  })),
  calculatePartOfFortune: vi.fn(() => ({
    name: 'Part of Fortune',
    longitude: 200.0,
    sign: 'Libra',
    degree: 20.0,
    house: 7,
    retrograde: false,
  })),
  calculateVertex: vi.fn(() => ({
    name: 'Vertex',
    longitude: 270.0,
    sign: 'Capricorn',
    degree: 0.0,
    house: 10,
    retrograde: false,
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe('advanced-points', () => {
  const baseInput: AdvancedPointsInput = {
    jdUT: 2451545.0,
    houseCusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
    ascendantLongitude: 15.5,
    sunLongitude: 120.0,
    moonLongitude: 240.0,
    isNightChart: false,
    latitude: 37.5665,
    longitude: 126.978,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Restore default mock implementations (they get overridden in error tests)
    const astrology = await import('@/lib/astrology');
    (astrology.calculateChiron as any).mockImplementation(() => ({
      name: 'Chiron', longitude: 45.5, sign: 'Taurus', degree: 15.5, house: 2, retrograde: false,
    }));
    (astrology.calculateLilith as any).mockImplementation(() => ({
      name: 'Lilith', longitude: 120.3, sign: 'Leo', degree: 0.3, house: 5, retrograde: false,
    }));
    (astrology.calculatePartOfFortune as any).mockImplementation(() => ({
      name: 'Part of Fortune', longitude: 200.0, sign: 'Libra', degree: 20.0, house: 7, retrograde: false,
    }));
    (astrology.calculateVertex as any).mockImplementation(() => ({
      name: 'Vertex', longitude: 270.0, sign: 'Capricorn', degree: 0.0, house: 10, retrograde: false,
    }));
  });

  describe('calculateAdvancedPoints', () => {
    it('should calculate all four points', async () => {
      const result = await calculateAdvancedPoints(baseInput);

      expect(result.chiron).toBeDefined();
      expect(result.lilith).toBeDefined();
      expect(result.partOfFortune).toBeDefined();
      expect(result.vertex).toBeDefined();
    });

    it('should return Chiron with correct properties', async () => {
      const result = await calculateAdvancedPoints(baseInput);

      expect(result.chiron!.name).toBe('Chiron');
      expect(result.chiron!.sign).toBe('Taurus');
      expect(result.chiron!.house).toBe(2);
    });

    it('should return Lilith with correct properties', async () => {
      const result = await calculateAdvancedPoints(baseInput);

      expect(result.lilith!.name).toBe('Lilith');
      expect(result.lilith!.sign).toBe('Leo');
    });

    it('should pass correct args to calculatePartOfFortune', async () => {
      const { calculatePartOfFortune } = await import('@/lib/astrology');

      await calculateAdvancedPoints(baseInput);

      expect(calculatePartOfFortune).toHaveBeenCalledWith(
        baseInput.ascendantLongitude,
        baseInput.sunLongitude,
        baseInput.moonLongitude,
        baseInput.isNightChart,
        baseInput.houseCusps
      );
    });

    it('should pass correct args to calculateVertex', async () => {
      const { calculateVertex } = await import('@/lib/astrology');

      await calculateAdvancedPoints(baseInput);

      expect(calculateVertex).toHaveBeenCalledWith(
        baseInput.jdUT,
        baseInput.latitude,
        baseInput.longitude,
        baseInput.houseCusps
      );
    });

    it('should handle night chart input', async () => {
      const nightInput = { ...baseInput, isNightChart: true };

      const result = await calculateAdvancedPoints(nightInput);

      expect(result.partOfFortune).toBeDefined();
    });

    it('should handle Chiron calculation failure gracefully', async () => {
      const { calculateChiron } = await import('@/lib/astrology');
      (calculateChiron as any).mockImplementation(() => { throw new Error('Chiron calc error'); });

      const result = await calculateAdvancedPoints(baseInput);

      expect(result.chiron).toBeUndefined();
      expect(result.lilith).toBeDefined();
      expect(result.partOfFortune).toBeDefined();
      expect(result.vertex).toBeDefined();
    });

    it('should handle Lilith calculation failure gracefully', async () => {
      const { calculateLilith } = await import('@/lib/astrology');
      (calculateLilith as any).mockImplementation(() => { throw new Error('Lilith calc error'); });

      const result = await calculateAdvancedPoints(baseInput);

      expect(result.lilith).toBeUndefined();
      expect(result.chiron).toBeDefined();
    });

    it('should handle PartOfFortune calculation failure gracefully', async () => {
      const { calculatePartOfFortune } = await import('@/lib/astrology');
      (calculatePartOfFortune as any).mockImplementation(() => { throw new Error('PoF calc error'); });

      const result = await calculateAdvancedPoints(baseInput);

      expect(result.partOfFortune).toBeUndefined();
      expect(result.chiron).toBeDefined();
    });

    it('should handle Vertex calculation failure gracefully', async () => {
      const { calculateVertex } = await import('@/lib/astrology');
      (calculateVertex as any).mockImplementation(() => { throw new Error('Vertex calc error'); });

      const result = await calculateAdvancedPoints(baseInput);

      expect(result.vertex).toBeUndefined();
      expect(result.chiron).toBeDefined();
    });

    it('should enable debug logging when enableDebugLogs is true', async () => {
      const { logger } = await import('@/lib/logger');

      await calculateAdvancedPoints(baseInput, true);

      expect(logger.debug).toHaveBeenCalledWith(
        '[Advanced Points] Starting calculation',
        expect.any(Object)
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[Advanced Points] Calculation complete',
        expect.any(Object)
      );
    });

    it('should not log when enableDebugLogs is false', async () => {
      const { logger } = await import('@/lib/logger');

      await calculateAdvancedPoints(baseInput, false);

      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should log each successful point in debug mode', async () => {
      const { logger } = await import('@/lib/logger');

      await calculateAdvancedPoints(baseInput, true);

      expect(logger.debug).toHaveBeenCalledWith(
        '[Advanced Points] Chiron calculated',
        expect.objectContaining({ sign: 'Taurus', house: 2 })
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[Advanced Points] Lilith calculated',
        expect.objectContaining({ sign: 'Leo' })
      );
    });

    it('should log failure in debug mode when calculation fails', async () => {
      const { calculateChiron } = await import('@/lib/astrology');
      const { logger } = await import('@/lib/logger');
      (calculateChiron as any).mockImplementation(() => { throw new Error('fail'); });

      await calculateAdvancedPoints(baseInput, true);

      expect(logger.debug).toHaveBeenCalledWith(
        '[Advanced Points] Chiron calculation failed',
        expect.any(Error)
      );
    });

    it('should return empty result when all calculations fail', async () => {
      const astrology = await import('@/lib/astrology');
      (astrology.calculateChiron as any).mockImplementation(() => { throw new Error('fail'); });
      (astrology.calculateLilith as any).mockImplementation(() => { throw new Error('fail'); });
      (astrology.calculatePartOfFortune as any).mockImplementation(() => { throw new Error('fail'); });
      (astrology.calculateVertex as any).mockImplementation(() => { throw new Error('fail'); });

      const result = await calculateAdvancedPoints(baseInput);

      expect(result.chiron).toBeUndefined();
      expect(result.lilith).toBeUndefined();
      expect(result.partOfFortune).toBeUndefined();
      expect(result.vertex).toBeUndefined();
    });

    it('should log "none" in debug mode when all calculations fail', async () => {
      const astrology = await import('@/lib/astrology');
      const { logger } = await import('@/lib/logger');
      (astrology.calculateChiron as any).mockImplementation(() => { throw new Error('fail'); });
      (astrology.calculateLilith as any).mockImplementation(() => { throw new Error('fail'); });
      (astrology.calculatePartOfFortune as any).mockImplementation(() => { throw new Error('fail'); });
      (astrology.calculateVertex as any).mockImplementation(() => { throw new Error('fail'); });

      await calculateAdvancedPoints(baseInput, true);

      expect(logger.debug).toHaveBeenCalledWith(
        '[Advanced Points] Calculation complete',
        { calculated: 'none' }
      );
    });
  });
});
