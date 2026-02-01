import { describe, it, expect, vi } from 'vitest';
import { findAspectsPlus, findNatalAspectsPlus } from '@/lib/astrology/advanced/aspectsPlus';
import type { Chart, AspectHit } from '@/lib/astrology/foundation/types';

// Mock the foundation aspects module
vi.mock('@/lib/astrology/foundation/aspects', () => ({
  findAspects: vi.fn(),
  findNatalAspects: vi.fn(),
}));

import { findAspects as baseFind, findNatalAspects as baseFindNatal } from '@/lib/astrology/foundation/aspects';

describe('aspectsPlus', () => {
  const mockNatalChart: Chart = {
    planets: [
      { name: 'Sun', lon: 120, lat: 0, speed: 1 },
      { name: 'Moon', lon: 180, lat: 0, speed: 13 },
    ],
    houses: [],
  };

  const mockTransitChart: Chart = {
    planets: [
      { name: 'Mars', lon: 150, lat: 0, speed: 0.5 },
    ],
    houses: [],
  };

  describe('findAspectsPlus', () => {
    it('should call baseFind with natal, transit, and processed rules', () => {
      vi.mocked(baseFind).mockReturnValue([]);

      findAspectsPlus(mockNatalChart, mockTransitChart);

      expect(baseFind).toHaveBeenCalledWith(
        mockNatalChart,
        mockTransitChart,
        expect.objectContaining({
          includeMinor: false,
          maxResults: 50,
        })
      );
    });

    it('should apply planet weights to scores', () => {
      const mockHits: AspectHit[] = [
        {
          from: { name: 'Sun', lon: 120 },
          to: { name: 'Mars', lon: 150 },
          aspect: 'sextile',
          angle: 60,
          orb: 0.5,
          score: 100,
        },
      ];

      vi.mocked(baseFind).mockReturnValue(mockHits);

      const result = findAspectsPlus(mockNatalChart, mockTransitChart);

      // Sun weight = 1.0, Mars weight = 1.0, max = 1.0
      // score = 100 * 1.0 = 100
      expect(result[0].score).toBe(100);
    });

    it('should apply higher weight for Moon', () => {
      const mockHits: AspectHit[] = [
        {
          from: { name: 'Moon', lon: 180 },
          to: { name: 'Mars', lon: 150 },
          aspect: 'sextile',
          angle: 60,
          orb: 0.5,
          score: 100,
        },
      ];

      vi.mocked(baseFind).mockReturnValue(mockHits);

      const result = findAspectsPlus(mockNatalChart, mockTransitChart);

      // Moon weight = 1.05, Mars weight = 1.0, max = 1.05
      // score = 100 * 1.05 = 105
      expect(result[0].score).toBe(105);
    });

    it('should apply highest weight for Ascendant', () => {
      const mockHits: AspectHit[] = [
        {
          from: { name: 'Ascendant', lon: 0 },
          to: { name: 'Sun', lon: 120 },
          aspect: 'trine',
          angle: 120,
          orb: 0.3,
          score: 100,
        },
      ];

      vi.mocked(baseFind).mockReturnValue(mockHits);

      const result = findAspectsPlus(mockNatalChart, mockTransitChart);

      // Ascendant weight = 1.1, Sun weight = 1.0, max = 1.1
      // score = 100 * 1.1 = 110
      expect(result[0].score).toBe(110);
    });

    it('should use max weight when both planets have weights', () => {
      const mockHits: AspectHit[] = [
        {
          from: { name: 'Moon', lon: 180 },
          to: { name: 'Ascendant', lon: 0 },
          aspect: 'opposition',
          angle: 180,
          orb: 1.0,
          score: 100,
        },
      ];

      vi.mocked(baseFind).mockReturnValue(mockHits);

      const result = findAspectsPlus(mockNatalChart, mockTransitChart);

      // Moon weight = 1.05, Ascendant weight = 1.1, max = 1.1
      // score = 100 * 1.1 = 110
      expect(result[0].score).toBe(110);
    });

    it('should use maxResults=30 for saju theme', () => {
      vi.mocked(baseFind).mockReturnValue([]);

      findAspectsPlus(mockNatalChart, mockTransitChart, {}, { theme: 'saju' });

      expect(baseFind).toHaveBeenCalledWith(
        mockNatalChart,
        mockTransitChart,
        expect.objectContaining({
          maxResults: 30,
          includeMinor: false,
        })
      );
    });

    it('should use maxResults=50 for western theme', () => {
      vi.mocked(baseFind).mockReturnValue([]);

      findAspectsPlus(mockNatalChart, mockTransitChart, {}, { theme: 'western' });

      expect(baseFind).toHaveBeenCalledWith(
        mockNatalChart,
        mockTransitChart,
        expect.objectContaining({
          maxResults: 50,
        })
      );
    });

    it('should disable minor aspects for saju theme even if requested', () => {
      vi.mocked(baseFind).mockReturnValue([]);

      findAspectsPlus(mockNatalChart, mockTransitChart, {}, { theme: 'saju', includeMinorAspects: true });

      expect(baseFind).toHaveBeenCalledWith(
        mockNatalChart,
        mockTransitChart,
        expect.objectContaining({
          includeMinor: false,
        })
      );
    });

    it('should enable minor aspects for western theme when requested', () => {
      vi.mocked(baseFind).mockReturnValue([]);

      findAspectsPlus(mockNatalChart, mockTransitChart, {}, { theme: 'western', includeMinorAspects: true });

      expect(baseFind).toHaveBeenCalledWith(
        mockNatalChart,
        mockTransitChart,
        expect.objectContaining({
          includeMinor: true,
        })
      );
    });

    it('should apply tighter orbs for saju semisextile', () => {
      vi.mocked(baseFind).mockReturnValue([]);

      findAspectsPlus(mockNatalChart, mockTransitChart, {}, { theme: 'saju' });

      expect(baseFind).toHaveBeenCalledWith(
        mockNatalChart,
        mockTransitChart,
        expect.objectContaining({
          perAspectOrbs: expect.objectContaining({
            semisextile: 0.6,
            quincunx: 0.8,
          }),
        })
      );
    });

    it('should apply looser orbs for western semisextile', () => {
      vi.mocked(baseFind).mockReturnValue([]);

      findAspectsPlus(mockNatalChart, mockTransitChart, {}, { theme: 'western' });

      expect(baseFind).toHaveBeenCalledWith(
        mockNatalChart,
        mockTransitChart,
        expect.objectContaining({
          perAspectOrbs: expect.objectContaining({
            semisextile: 1.0,
            quincunx: 1.2,
          }),
        })
      );
    });

    it('should round scores to 3 decimal places', () => {
      const mockHits: AspectHit[] = [
        {
          from: { name: 'Sun', lon: 120 },
          to: { name: 'Mars', lon: 150 },
          aspect: 'sextile',
          angle: 60,
          orb: 0.5,
          score: 33.333333333,
        },
      ];

      vi.mocked(baseFind).mockReturnValue(mockHits);

      const result = findAspectsPlus(mockNatalChart, mockTransitChart);

      expect(result[0].score).toBe(33.333);
    });

    it('should preserve base rule overrides', () => {
      vi.mocked(baseFind).mockReturnValue([]);

      findAspectsPlus(
        mockNatalChart,
        mockTransitChart,
        { maxResults: 100, orbs: { default: 3.0 } }
      );

      expect(baseFind).toHaveBeenCalledWith(
        mockNatalChart,
        mockTransitChart,
        expect.objectContaining({
          maxResults: 100,
          orbs: expect.objectContaining({
            default: 3.0,
          }),
        })
      );
    });
  });

  describe('findNatalAspectsPlus', () => {
    it('should call baseFindNatal with natal chart and processed rules', () => {
      vi.mocked(baseFindNatal).mockReturnValue([]);

      findNatalAspectsPlus(mockNatalChart);

      expect(baseFindNatal).toHaveBeenCalledWith(
        mockNatalChart,
        expect.objectContaining({
          includeMinor: false,
          maxResults: 50,
        })
      );
    });

    it('should apply planet weights to natal aspects', () => {
      const mockHits: AspectHit[] = [
        {
          from: { name: 'Sun', lon: 120 },
          to: { name: 'Moon', lon: 180 },
          aspect: 'sextile',
          angle: 60,
          orb: 0.5,
          score: 100,
        },
      ];

      vi.mocked(baseFindNatal).mockReturnValue(mockHits);

      const result = findNatalAspectsPlus(mockNatalChart);

      // Sun weight = 1.0, Moon weight = 1.05, max = 1.05
      // score = 100 * 1.05 = 105
      expect(result[0].score).toBe(105);
    });

    it('should use saju settings when theme is saju', () => {
      vi.mocked(baseFindNatal).mockReturnValue([]);

      findNatalAspectsPlus(mockNatalChart, {}, { theme: 'saju' });

      expect(baseFindNatal).toHaveBeenCalledWith(
        mockNatalChart,
        expect.objectContaining({
          maxResults: 30,
          includeMinor: false,
        })
      );
    });

    it('should handle missing scores gracefully', () => {
      const mockHits: AspectHit[] = [
        {
          from: { name: 'Sun', lon: 120 },
          to: { name: 'Moon', lon: 180 },
          aspect: 'sextile',
          angle: 60,
          orb: 0.5,
          // no score
        },
      ];

      vi.mocked(baseFindNatal).mockReturnValue(mockHits);

      const result = findNatalAspectsPlus(mockNatalChart);

      // Should use 0 as default, 0 * 1.05 = 0
      expect(result[0].score).toBe(0);
    });

    it('should default to weight 1 for unknown planets', () => {
      const mockHits: AspectHit[] = [
        {
          from: { name: 'Unknown Planet X', lon: 120 },
          to: { name: 'Mystery Planet Y', lon: 180 },
          aspect: 'conjunction',
          angle: 0,
          orb: 0.1,
          score: 100,
        },
      ];

      vi.mocked(baseFindNatal).mockReturnValue(mockHits);

      const result = findNatalAspectsPlus(mockNatalChart);

      // Both unknown, should use max(1, 1) = 1
      // score = 100 * 1 = 100
      expect(result[0].score).toBe(100);
    });
  });
});
