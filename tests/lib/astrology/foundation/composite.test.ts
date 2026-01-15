// @vitest-environment node
// tests/lib/astrology/foundation/composite.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateComposite,
  getCompositeSummary,
} from '@/lib/astrology/foundation/composite';
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

describe('composite', () => {
  describe('calculateComposite', () => {
    it('should calculate composite chart with correct structure', () => {
      const chartA = createChart([
        createPlanet('Sun', 45),
        createPlanet('Moon', 120),
      ]);
      const chartB = createChart([
        createPlanet('Sun', 75),
        createPlanet('Moon', 180),
      ]);

      const composite = calculateComposite({ chartA, chartB });

      expect(composite).toBeDefined();
      expect(composite.planets).toBeDefined();
      expect(composite.ascendant).toBeDefined();
      expect(composite.mc).toBeDefined();
      expect(composite.houses).toBeDefined();
      expect(composite.compositeType).toBe('midpoint');
    });

    it('should calculate midpoint for planets', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([createPlanet('Sun', 60)]);

      const composite = calculateComposite({ chartA, chartB });

      const sun = composite.planets.find(p => p.name === 'Sun');
      expect(sun).toBeDefined();
      if (sun) {
        expect(sun.longitude).toBeCloseTo(30, 1);
      }
    });

    it('should calculate midpoint using shorter arc', () => {
      const chartA = createChart([createPlanet('Sun', 10)]);
      const chartB = createChart([createPlanet('Sun', 350)]);

      const composite = calculateComposite({ chartA, chartB });

      const sun = composite.planets.find(p => p.name === 'Sun');
      expect(sun).toBeDefined();
      if (sun) {
        // Shorter arc should give 0 degrees
        expect(sun.longitude).toBeCloseTo(0, 1);
      }
    });

    it('should calculate composite ASC as midpoint', () => {
      const chartA = createChart([], 0, 0);
      const chartB = createChart([], 60, 0);

      const composite = calculateComposite({ chartA, chartB });

      expect(composite.ascendant.longitude).toBeCloseTo(30, 1);
    });

    it('should calculate composite MC as midpoint', () => {
      const chartA = createChart([], 0, 90);
      const chartB = createChart([], 0, 150);

      const composite = calculateComposite({ chartA, chartB });

      expect(composite.mc.longitude).toBeCloseTo(120, 1);
    });

    it('should have 12 houses in composite', () => {
      const chartA = createChart([]);
      const chartB = createChart([]);

      const composite = calculateComposite({ chartA, chartB });

      expect(composite.houses).toHaveLength(12);
      for (let i = 0; i < 12; i++) {
        expect(composite.houses[i].index).toBe(i + 1);
      }
    });

    it('should calculate all major planets', () => {
      const planetNames = [
        'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
        'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'True Node',
      ];

      const planetsA = planetNames.map((name, i) => createPlanet(name, i * 30));
      const planetsB = planetNames.map((name, i) => createPlanet(name, i * 30 + 60));

      const chartA = createChart(planetsA);
      const chartB = createChart(planetsB);

      const composite = calculateComposite({ chartA, chartB });

      expect(composite.planets).toHaveLength(11);
      for (const name of planetNames) {
        const planet = composite.planets.find(p => p.name === name);
        expect(planet).toBeDefined();
      }
    });

    it('should assign planets to houses', () => {
      const chartA = createChart([createPlanet('Sun', 45)]);
      const chartB = createChart([createPlanet('Sun', 75)]);

      const composite = calculateComposite({ chartA, chartB });

      const sun = composite.planets.find(p => p.name === 'Sun');
      expect(sun).toBeDefined();
      if (sun) {
        expect(sun.house).toBeGreaterThanOrEqual(1);
        expect(sun.house).toBeLessThanOrEqual(12);
      }
    });

    it('should calculate average speed', () => {
      const chartA = createChart([createPlanet('Mercury', 100, 1.2)]);
      const chartB = createChart([createPlanet('Mercury', 140, 1.8)]);

      const composite = calculateComposite({ chartA, chartB });

      const mercury = composite.planets.find(p => p.name === 'Mercury');
      expect(mercury).toBeDefined();
      if (mercury && mercury.speed !== undefined) {
        expect(mercury.speed).toBeCloseTo(1.5, 1);
      }
    });

    it('should mark composite planet as retrograde if average speed is negative', () => {
      const chartA = createChart([createPlanet('Mercury', 100, -1.0)]);
      const chartB = createChart([createPlanet('Mercury', 140, -2.0)]);

      const composite = calculateComposite({ chartA, chartB });

      const mercury = composite.planets.find(p => p.name === 'Mercury');
      expect(mercury).toBeDefined();
      if (mercury) {
        expect(mercury.retrograde).toBe(true);
      }
    });

    it('should store source chart data', () => {
      const chartA = createChart([], 30, 120);
      const chartB = createChart([], 60, 180);

      const composite = calculateComposite({ chartA, chartB });

      expect(composite.sourceCharts).toBeDefined();
      expect(composite.sourceCharts.chartA.ascendant).toBe(30);
      expect(composite.sourceCharts.chartA.mc).toBe(120);
      expect(composite.sourceCharts.chartB.ascendant).toBe(60);
      expect(composite.sourceCharts.chartB.mc).toBe(180);
    });

    it('should handle opposite longitudes', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([createPlanet('Sun', 180)]);

      const composite = calculateComposite({ chartA, chartB });

      const sun = composite.planets.find(p => p.name === 'Sun');
      expect(sun).toBeDefined();
      if (sun) {
        expect(sun.longitude).toBeCloseTo(90, 1);
      }
    });

    it('should handle planets wrapping around 360', () => {
      const chartA = createChart([createPlanet('Sun', 350)]);
      const chartB = createChart([createPlanet('Sun', 10)]);

      const composite = calculateComposite({ chartA, chartB });

      const sun = composite.planets.find(p => p.name === 'Sun');
      expect(sun).toBeDefined();
      if (sun) {
        expect(sun.longitude).toBeCloseTo(0, 1);
      }
    });

    it('should assign correct signs to planets', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([createPlanet('Sun', 20)]);

      const composite = calculateComposite({ chartA, chartB });

      const sun = composite.planets.find(p => p.name === 'Sun');
      expect(sun).toBeDefined();
      if (sun) {
        expect(sun.sign).toBe('Aries');
      }
    });

    it('should handle charts with missing planets', () => {
      const chartA = createChart([createPlanet('Sun', 45)]);
      const chartB = createChart([createPlanet('Moon', 120)]);

      const composite = calculateComposite({ chartA, chartB });

      expect(composite.planets.length).toBeLessThan(11);
    });

    it('should format planet positions', () => {
      const chartA = createChart([createPlanet('Sun', 45)]);
      const chartB = createChart([createPlanet('Sun', 75)]);

      const composite = calculateComposite({ chartA, chartB });

      const sun = composite.planets.find(p => p.name === 'Sun');
      expect(sun).toBeDefined();
      if (sun) {
        expect(sun.formatted).toBeDefined();
        expect(sun.degree).toBeGreaterThanOrEqual(0);
        expect(sun.degree).toBeLessThan(30);
        expect(sun.minute).toBeGreaterThanOrEqual(0);
        expect(sun.minute).toBeLessThan(60);
      }
    });
  });

  describe('getCompositeSummary', () => {
    it('should return summary with sun and moon signs', () => {
      const chartA = createChart([
        createPlanet('Sun', 45),
        createPlanet('Moon', 120),
      ]);
      const chartB = createChart([
        createPlanet('Sun', 75),
        createPlanet('Moon', 180),
      ]);

      const composite = calculateComposite({ chartA, chartB });
      const summary = getCompositeSummary(composite);

      expect(summary.sunSign).toBeDefined();
      expect(summary.moonSign).toBeDefined();
      expect(summary.ascSign).toBeDefined();
    });

    it('should return sun and moon house placements', () => {
      const chartA = createChart([
        createPlanet('Sun', 45),
        createPlanet('Moon', 120),
      ]);
      const chartB = createChart([
        createPlanet('Sun', 75),
        createPlanet('Moon', 180),
      ]);

      const composite = calculateComposite({ chartA, chartB });
      const summary = getCompositeSummary(composite);

      expect(summary.sunHouse).toBeGreaterThanOrEqual(1);
      expect(summary.sunHouse).toBeLessThanOrEqual(12);
      expect(summary.moonHouse).toBeGreaterThanOrEqual(1);
      expect(summary.moonHouse).toBeLessThanOrEqual(12);
    });

    it('should identify house emphasis with 3+ planets', () => {
      const planetsA = [
        createPlanet('Sun', 5),
        createPlanet('Moon', 10),
        createPlanet('Mercury', 15),
        createPlanet('Venus', 20),
      ];
      const planetsB = [
        createPlanet('Sun', 10),
        createPlanet('Moon', 15),
        createPlanet('Mercury', 20),
        createPlanet('Venus', 25),
      ];

      const chartA = createChart(planetsA);
      const chartB = createChart(planetsB);

      const composite = calculateComposite({ chartA, chartB });
      const summary = getCompositeSummary(composite);

      expect(summary.emphasis).toBeDefined();
      expect(Array.isArray(summary.emphasis)).toBe(true);
    });

    it('should handle composite with no emphasis', () => {
      const planetsA = [
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
        createPlanet('Mercury', 120),
      ];
      const planetsB = [
        createPlanet('Sun', 30),
        createPlanet('Moon', 90),
        createPlanet('Mercury', 150),
      ];

      const chartA = createChart(planetsA);
      const chartB = createChart(planetsB);

      const composite = calculateComposite({ chartA, chartB });
      const summary = getCompositeSummary(composite);

      expect(summary.emphasis).toBeDefined();
    });

    it('should provide default values when planets missing', () => {
      const chartA = createChart([]);
      const chartB = createChart([]);

      const composite = calculateComposite({ chartA, chartB });
      const summary = getCompositeSummary(composite);

      expect(summary.sunSign).toBe('Aries');
      expect(summary.moonSign).toBe('Aries');
      expect(summary.sunHouse).toBe(1);
      expect(summary.moonHouse).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle charts with no planets', () => {
      const chartA = createChart([]);
      const chartB = createChart([]);

      const composite = calculateComposite({ chartA, chartB });

      expect(composite.planets).toHaveLength(0);
      expect(composite.ascendant).toBeDefined();
      expect(composite.mc).toBeDefined();
    });

    it('should handle ASC at 0 degrees', () => {
      const chartA = createChart([], 0, 90);
      const chartB = createChart([], 0, 90);

      const composite = calculateComposite({ chartA, chartB });

      expect(composite.ascendant.longitude).toBe(0);
    });

    it('should handle MC at 0 degrees', () => {
      const chartA = createChart([], 0, 0);
      const chartB = createChart([], 0, 0);

      const composite = calculateComposite({ chartA, chartB });

      expect(composite.mc.longitude).toBe(0);
    });

    it('should handle very precise longitudes', () => {
      const chartA = createChart([createPlanet('Sun', 123.456789)]);
      const chartB = createChart([createPlanet('Sun', 183.456789)]);

      const composite = calculateComposite({ chartA, chartB });

      const sun = composite.planets.find(p => p.name === 'Sun');
      expect(sun).toBeDefined();
      if (sun) {
        expect(sun.longitude).toBeGreaterThanOrEqual(0);
        expect(sun.longitude).toBeLessThan(360);
      }
    });

    it('should handle retrograde and direct planets', () => {
      const chartA = createChart([createPlanet('Mercury', 100, -1.0)]);
      const chartB = createChart([createPlanet('Mercury', 140, 2.0)]);

      const composite = calculateComposite({ chartA, chartB });

      const mercury = composite.planets.find(p => p.name === 'Mercury');
      expect(mercury).toBeDefined();
      if (mercury && mercury.speed !== undefined) {
        // Average of -1 and 2 is 0.5 (direct)
        expect(mercury.speed).toBeCloseTo(0.5, 1);
        expect(mercury.retrograde).toBe(false);
      }
    });

    it('should handle planets with undefined speed', () => {
      const planetA = createPlanet('Sun', 100);
      delete planetA.speed;
      const planetB = createPlanet('Sun', 140);
      delete planetB.speed;

      const chartA = createChart([planetA]);
      const chartB = createChart([planetB]);

      const composite = calculateComposite({ chartA, chartB });

      const sun = composite.planets.find(p => p.name === 'Sun');
      expect(sun).toBeDefined();
      if (sun) {
        expect(sun.speed).toBeUndefined();
        expect(sun.retrograde).toBeUndefined();
      }
    });

    it('should handle ASC and MC wrapping around 360', () => {
      const chartA = createChart([], 350, 355);
      const chartB = createChart([], 10, 5);

      const composite = calculateComposite({ chartA, chartB });

      expect(composite.ascendant.longitude).toBeGreaterThanOrEqual(0);
      expect(composite.ascendant.longitude).toBeLessThan(360);
      expect(composite.mc.longitude).toBeGreaterThanOrEqual(0);
      expect(composite.mc.longitude).toBeLessThan(360);
    });

    it('should handle longer arc midpoint calculation', () => {
      const chartA = createChart([createPlanet('Sun', 0)]);
      const chartB = createChart([createPlanet('Sun', 270)]);

      const composite = calculateComposite({ chartA, chartB });

      const sun = composite.planets.find(p => p.name === 'Sun');
      expect(sun).toBeDefined();
      if (sun) {
        // 270 degrees apart, shorter arc is 90 degrees, so midpoint should be around 315
        expect(sun.longitude).toBeCloseTo(315, 1);
      }
    });

    it('should maintain house system integrity', () => {
      const chartA = createChart([]);
      const chartB = createChart([]);

      const composite = calculateComposite({ chartA, chartB });

      for (let i = 0; i < 12; i++) {
        expect(composite.houses[i].index).toBe(i + 1);
        expect(composite.houses[i].cusp).toBeGreaterThanOrEqual(0);
        expect(composite.houses[i].cusp).toBeLessThan(360);
        expect(composite.houses[i].sign).toBeDefined();
      }
    });
  });
});

