// @vitest-environment node
// tests/lib/astrology/foundation/synastry.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateSynastry,
  findSynastryAspects,
  type SynastryInput,
} from '@/lib/astrology/foundation/synastry';
import type { Chart, PlanetBase, ZodiacKo } from '@/lib/astrology/foundation/types';

// Helper function to create test planets
function createPlanet(name: string, longitude: number, speed = 1): PlanetBase {
  const signIndex = Math.floor((longitude % 360) / 30);
  const signs: ZodiacKo[] = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ];
  const degree = Math.floor(longitude % 30);
  const minute = Math.floor(((longitude % 30) % 1) * 60);

  return {
    name,
    longitude,
    sign: signs[signIndex],
    degree,
    minute,
    formatted: `${signs[signIndex]} ${degree}deg ${minute}'`,
    house: Math.floor(longitude / 30) + 1,
    speed,
    retrograde: speed < 0,
  };
}

// Helper to create a complete chart
function createChart(planets: PlanetBase[], ascLon = 0, mcLon = 90): Chart {
  const signs: ZodiacKo[] = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ];

  return {
    planets,
    ascendant: createPlanet('Ascendant', ascLon),
    mc: createPlanet('MC', mcLon),
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      sign: signs[i],
      formatted: `${signs[i]} ${0}deg`,
    })),
  };
}

describe('synastry', () => {
  describe('calculateSynastry', () => {
    it('should calculate synastry between two charts', () => {
      const chartA = createChart([
        createPlanet('Sun', 45),
        createPlanet('Moon', 120),
      ]);
      const chartB = createChart([
        createPlanet('Sun', 75),
        createPlanet('Moon', 180),
      ]);

      const result = calculateSynastry({ chartA, chartB });

      expect(result).toBeDefined();
      expect(result.aspects).toBeDefined();
      expect(result.houseOverlaysAtoB).toBeDefined();
      expect(result.houseOverlaysBtoA).toBeDefined();
      expect(result.score).toBeDefined();
    });

    it('should include harmony and tension scores', () => {
      const chartA = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
      ]);
      const chartB = createChart([
        createPlanet('Sun', 120),
        createPlanet('Moon', 90),
      ]);

      const result = calculateSynastry({ chartA, chartB });

      expect(result.score.harmony).toBeGreaterThanOrEqual(0);
      expect(result.score.tension).toBeGreaterThanOrEqual(0);
      expect(typeof result.score.total).toBe('number');
    });

    it('should find conjunction aspects', () => {
      const chartA = createChart([createPlanet('Sun', 100)]);
      const chartB = createChart([createPlanet('Sun', 105)]);

      const result = calculateSynastry({ chartA, chartB });

      const conjunction = result.aspects.find(a => a.type === 'conjunction');
      expect(conjunction).toBeDefined();
      if (conjunction) {
        expect(conjunction.orb).toBeLessThanOrEqual(8);
      }
    });

    it('should find trine aspects', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([createPlanet('Moon', 120)]);

      const result = calculateSynastry({ chartA, chartB });

      const trine = result.aspects.find(a => a.type === 'trine');
      expect(trine).toBeDefined();
    });

    it('should find square aspects', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([createPlanet('Moon', 90)]);

      const result = calculateSynastry({ chartA, chartB });

      const square = result.aspects.find(a => a.type === 'square');
      expect(square).toBeDefined();
    });

    it('should find sextile aspects', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([createPlanet('Moon', 60)]);

      const result = calculateSynastry({ chartA, chartB });

      const sextile = result.aspects.find(a => a.type === 'sextile');
      expect(sextile).toBeDefined();
    });

    it('should find opposition aspects', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([createPlanet('Moon', 180)]);

      const result = calculateSynastry({ chartA, chartB });

      const opposition = result.aspects.find(a => a.type === 'opposition');
      expect(opposition).toBeDefined();
    });

    it('should calculate orb for aspects', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([createPlanet('Moon', 3)]);

      const result = calculateSynastry({ chartA, chartB });

      const conjunction = result.aspects.find(
        a => a.type === 'conjunction' && a.from.name === 'Sun' && a.to.name === 'Moon'
      );
      expect(conjunction).toBeDefined();
      if (conjunction) {
        expect(conjunction.orb).toBeCloseTo(3, 1);
      }
    });

    it('should include aspect score', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([createPlanet('Moon', 2)]);

      const result = calculateSynastry({ chartA, chartB });

      if (result.aspects.length > 0) {
        for (const aspect of result.aspects) {
          expect(aspect.score).toBeGreaterThanOrEqual(0);
          expect(aspect.score).toBeLessThanOrEqual(1);
        }
      }
    });

    it('should sort aspects by score descending', () => {
      const chartA = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
        createPlanet('Mercury', 120),
      ]);
      const chartB = createChart([
        createPlanet('Venus', 5),
        createPlanet('Mars', 65),
        createPlanet('Jupiter', 125),
      ]);

      const result = calculateSynastry({ chartA, chartB });

      for (let i = 1; i < result.aspects.length; i++) {
        const prevScore = result.aspects[i - 1].score ?? 0;
        const currScore = result.aspects[i].score ?? 0;
        expect(prevScore).toBeGreaterThanOrEqual(currScore);
      }
    });

    it('should calculate house overlays A to B', () => {
      const chartA = createChart([
        createPlanet('Sun', 45),
        createPlanet('Moon', 100),
      ]);
      const chartB = createChart([createPlanet('Venus', 0)], 0, 90);

      const result = calculateSynastry({ chartA, chartB });

      expect(result.houseOverlaysAtoB).toHaveLength(2);
      expect(result.houseOverlaysAtoB[0]).toHaveProperty('planet');
      expect(result.houseOverlaysAtoB[0]).toHaveProperty('inHouse');
      expect(result.houseOverlaysAtoB[0]).toHaveProperty('description');
    });

    it('should calculate house overlays B to A', () => {
      const chartA = createChart([createPlanet('Sun', 0)], 0, 90);
      const chartB = createChart([
        createPlanet('Venus', 45),
        createPlanet('Mars', 100),
      ]);

      const result = calculateSynastry({ chartA, chartB });

      expect(result.houseOverlaysBtoA).toHaveLength(2);
      expect(result.houseOverlaysBtoA[0]).toHaveProperty('planet');
      expect(result.houseOverlaysBtoA[0]).toHaveProperty('inHouse');
    });

    it('should handle charts with no aspects', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([createPlanet('Moon', 200)]);

      const result = calculateSynastry({ chartA, chartB });

      expect(result.aspects).toBeDefined();
      expect(result.score).toBeDefined();
    });

    it('should include ASC and MC in aspect calculations', () => {
      const chartA = createChart([], 100, 190);
      const chartB = createChart([createPlanet('Sun', 100)]);

      const result = calculateSynastry({ chartA, chartB });

      // Should find aspect between B's Sun and A's ASC
      const ascAspect = result.aspects.find(
        a => a.from.name === 'Ascendant' || a.to.name === 'Ascendant'
      );
      expect(ascAspect).toBeDefined();
    });

    it('should calculate harmony score for harmonious aspects', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([createPlanet('Moon', 120)]);

      const result = calculateSynastry({ chartA, chartB });

      expect(result.score.harmony).toBeGreaterThan(0);
    });

    it('should calculate tension score for challenging aspects', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([createPlanet('Moon', 90)]);

      const result = calculateSynastry({ chartA, chartB });

      expect(result.score.tension).toBeGreaterThan(0);
    });

    it('should handle multiple aspects between same planets', () => {
      const chartA = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 90),
        createPlanet('Mercury', 180),
      ]);
      const chartB = createChart([
        createPlanet('Venus', 5),
        createPlanet('Mars', 92),
        createPlanet('Jupiter', 185),
      ]);

      const result = calculateSynastry({ chartA, chartB });

      expect(result.aspects.length).toBeGreaterThan(0);
    });

    it('should respect aspect orbs', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([createPlanet('Moon', 20)]);

      const result = calculateSynastry({ chartA, chartB });

      // 20 degrees is too wide for any major aspect
      const validAspects = result.aspects.filter(a =>
        ['conjunction', 'sextile', 'square', 'trine', 'opposition'].includes(a.type) &&
        !['Ascendant', 'MC'].includes(a.from.name) &&
        !['Ascendant', 'MC'].includes(a.to.name)
      );
      expect(validAspects.length).toBe(0);
    });

    it('should handle empty charts', () => {
      const chartA = createChart([]);
      const chartB = createChart([]);

      const result = calculateSynastry({ chartA, chartB });

      const nonAngleAspects = result.aspects.filter(a =>
        !['Ascendant', 'MC'].includes(a.from.name) &&
        !['Ascendant', 'MC'].includes(a.to.name)
      );
      expect(nonAngleAspects).toHaveLength(0);
      expect(result.houseOverlaysAtoB).toHaveLength(0);
      expect(result.houseOverlaysBtoA).toHaveLength(0);
    });

    it('should mark aspects as natal kind', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([createPlanet('Moon', 120)]);

      const result = calculateSynastry({ chartA, chartB });

      if (result.aspects.length > 0) {
        expect(result.aspects[0].from.kind).toBe('natal');
        expect(result.aspects[0].to.kind).toBe('natal');
      }
    });
  });

  describe('findSynastryAspects', () => {
    it('should find all synastry aspects', () => {
      const chartA = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
      ]);
      const chartB = createChart([
        createPlanet('Venus', 120),
        createPlanet('Mars', 180),
      ]);

      const aspects = findSynastryAspects(chartA, chartB);

      expect(Array.isArray(aspects)).toBe(true);
      expect(aspects.length).toBeGreaterThan(0);
    });

    it('should filter by aspect types when provided', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([
        createPlanet('Moon', 120),
        createPlanet('Venus', 180),
      ]);

      const trineOnly = findSynastryAspects(chartA, chartB, ['trine']);

      for (const aspect of trineOnly) {
        expect(aspect.type).toBe('trine');
      }
    });

    it('should return sorted aspects', () => {
      const chartA = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
      ]);
      const chartB = createChart([
        createPlanet('Venus', 5),
        createPlanet('Mars', 63),
      ]);

      const aspects = findSynastryAspects(chartA, chartB);

      for (let i = 1; i < aspects.length; i++) {
        const prevScore = aspects[i - 1].score ?? 0;
        const currScore = aspects[i].score ?? 0;
        expect(prevScore).toBeGreaterThanOrEqual(currScore);
      }
    });

    it('should handle no matching aspects', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([createPlanet('Moon', 45)]);

      const aspects = findSynastryAspects(chartA, chartB, ['trine']);

      expect(aspects).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle planets at 0 degrees', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([createPlanet('Moon', 0)]);

      const result = calculateSynastry({ chartA, chartB });

      const conjunction = result.aspects.find(a => a.type === 'conjunction');
      expect(conjunction).toBeDefined();
      if (conjunction) {
        expect(conjunction.orb).toBeCloseTo(0, 1);
      }
    });

    it('should handle planets near 360 degrees', () => {
      const chartA = createChart([createPlanet('Sun', 359)]);
      const chartB = createChart([createPlanet('Moon', 1)]);

      const result = calculateSynastry({ chartA, chartB });

      const conjunction = result.aspects.find(a => a.type === 'conjunction');
      expect(conjunction).toBeDefined();
    });

    it('should handle aspect wrapping around 0', () => {
      const chartA = createChart([createPlanet('Sun', 350)]);
      const chartB = createChart([createPlanet('Moon', 170)]);

      const result = calculateSynastry({ chartA, chartB });

      const opposition = result.aspects.find(a => a.type === 'opposition');
      expect(opposition).toBeDefined();
    });

    it('should handle very precise longitudes', () => {
      const chartA = createChart([createPlanet('Sun', 123.456789)]);
      const chartB = createChart([createPlanet('Moon', 243.456789)]);

      const result = calculateSynastry({ chartA, chartB });

      const trine = result.aspects.find(a => a.type === 'trine');
      expect(trine).toBeDefined();
    });

    it('should handle charts with many planets', () => {
      const planetsA = [
        createPlanet('Sun', 0),
        createPlanet('Moon', 30),
        createPlanet('Mercury', 60),
        createPlanet('Venus', 90),
        createPlanet('Mars', 120),
        createPlanet('Jupiter', 150),
      ];
      const planetsB = [
        createPlanet('Sun', 120),
        createPlanet('Moon', 150),
        createPlanet('Mercury', 180),
        createPlanet('Venus', 210),
        createPlanet('Mars', 240),
        createPlanet('Jupiter', 270),
      ];

      const chartA = createChart(planetsA);
      const chartB = createChart(planetsB);

      const result = calculateSynastry({ chartA, chartB });

      expect(result.aspects.length).toBeGreaterThan(0);
      expect(result.houseOverlaysAtoB).toHaveLength(6);
      expect(result.houseOverlaysBtoA).toHaveLength(6);
    });

    it('should handle retrograde planets', () => {
      const chartA = createChart([createPlanet('Mercury', 100, -0.5)]);
      const chartB = createChart([createPlanet('Venus', 100, 1.2)]);

      const result = calculateSynastry({ chartA, chartB });

      const conjunction = result.aspects.find(a => a.type === 'conjunction');
      expect(conjunction).toBeDefined();
    });

    it('should calculate total score correctly', () => {
      const chartA = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
      ]);
      const chartB = createChart([
        createPlanet('Venus', 120),
        createPlanet('Mars', 90),
      ]);

      const result = calculateSynastry({ chartA, chartB });

      // Total = harmony - tension * 0.5 + 10
      const expectedTotal = result.score.harmony - result.score.tension * 0.5 + 10;
      expect(result.score.total).toBeCloseTo(expectedTotal, 0);
    });
  });
});

