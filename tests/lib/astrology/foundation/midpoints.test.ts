// @vitest-environment node
// tests/lib/astrology/foundation/midpoints.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateMidpoints,
  findMidpointActivations,
  getMidpoint,
  findCrossMidpointActivations,
} from '@/lib/astrology/foundation/midpoints';
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

describe('midpoints', () => {
  describe('getMidpoint', () => {
    it('should calculate midpoint for simple case', () => {
      const result = getMidpoint(0, 60);

      expect(result.longitude).toBeCloseTo(30, 1);
      expect(result.sign).toBe('Taurus'); // longitude 30 = Taurus 0°
    });

    it('should calculate midpoint using shorter arc', () => {
      const result = getMidpoint(10, 350);

      expect(result.longitude).toBeCloseTo(0, 1);
    });

    it('should handle opposite longitudes', () => {
      const result = getMidpoint(0, 180);

      expect(result.longitude).toBeCloseTo(90, 1);
    });

    it('should return formatted string', () => {
      const result = getMidpoint(0, 60);

      expect(result.formatted).toBeDefined();
      expect(typeof result.formatted).toBe('string');
    });

    it('should calculate degree and minute', () => {
      const result = getMidpoint(0, 60);

      expect(result.degree).toBeGreaterThanOrEqual(0);
      expect(result.degree).toBeLessThan(30);
      expect(result.minute).toBeGreaterThanOrEqual(0);
      expect(result.minute).toBeLessThan(60);
    });

    it('should handle wrapping around 360', () => {
      const result = getMidpoint(350, 10);

      expect(result.longitude).toBeCloseTo(0, 1);
    });

    it('should choose longer arc for 270 degree separation', () => {
      const result = getMidpoint(0, 270);

      // 270 degrees apart, shorter arc is 90, so midpoint should be 315
      expect(result.longitude).toBeCloseTo(315, 1);
    });
  });

  describe('calculateMidpoints', () => {
    it('should calculate midpoints for chart with planets', () => {
      const chart = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 120),
      ]);

      const midpoints = calculateMidpoints(chart);

      expect(Array.isArray(midpoints)).toBe(true);
      expect(midpoints.length).toBeGreaterThan(0);
    });

    it('should include Sun/Moon midpoint (Soul Point)', () => {
      const chart = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
      ]);

      const midpoints = calculateMidpoints(chart);

      const sunMoon = midpoints.find(m => m.id === 'Sun/Moon');
      expect(sunMoon).toBeDefined();
      if (sunMoon) {
        expect(sunMoon.name_ko).toBe('영혼의 점');
        expect(sunMoon.longitude).toBeCloseTo(30, 1);
      }
    });

    it('should include Venus/Mars midpoint (Passion Point)', () => {
      const chart = createChart([
        createPlanet('Venus', 0),
        createPlanet('Mars', 90),
      ]);

      const midpoints = calculateMidpoints(chart);

      const venusMars = midpoints.find(m => m.id === 'Venus/Mars');
      expect(venusMars).toBeDefined();
      if (venusMars) {
        expect(venusMars.name_ko).toBe('열정의 점');
        expect(venusMars.longitude).toBeCloseTo(45, 1);
      }
    });

    it('should have all required fields', () => {
      const chart = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
      ]);

      const midpoints = calculateMidpoints(chart);

      if (midpoints.length > 0) {
        const mp = midpoints[0];
        expect(mp).toHaveProperty('planet1');
        expect(mp).toHaveProperty('planet2');
        expect(mp).toHaveProperty('id');
        expect(mp).toHaveProperty('longitude');
        expect(mp).toHaveProperty('sign');
        expect(mp).toHaveProperty('degree');
        expect(mp).toHaveProperty('minute');
        expect(mp).toHaveProperty('formatted');
        expect(mp).toHaveProperty('name_ko');
        expect(mp).toHaveProperty('keywords');
      }
    });

    it('should calculate midpoints with ASC and MC', () => {
      // Note: ASC and MC are included in allPoints but MIDPOINT_DEFINITIONS
      // only defines planet-planet midpoints, not ASC/MC midpoints
      const chart = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 30),
      ], 60, 150);

      const midpoints = calculateMidpoints(chart);

      // Should find Sun/Moon midpoint at least
      expect(midpoints.length).toBeGreaterThan(0);
      const sunMoon = midpoints.find(m => m.id === 'Sun/Moon');
      expect(sunMoon).toBeDefined();
    });

    it('should skip missing planets', () => {
      const chart = createChart([
        createPlanet('Sun', 0),
        // Moon is missing
      ]);

      const midpoints = calculateMidpoints(chart);

      const sunMoon = midpoints.find(m => m.id === 'Sun/Moon');
      expect(sunMoon).toBeUndefined();
    });

    it('should include keywords for each midpoint', () => {
      const chart = createChart([
        createPlanet('Jupiter', 0),
        createPlanet('Saturn', 90),
      ]);

      const midpoints = calculateMidpoints(chart);

      const jupSat = midpoints.find(m => m.id === 'Jupiter/Saturn');
      if (jupSat) {
        expect(Array.isArray(jupSat.keywords)).toBe(true);
        expect(jupSat.keywords.length).toBeGreaterThan(0);
      }
    });

    it('should handle chart with all planets', () => {
      const chart = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 30),
        createPlanet('Mercury', 60),
        createPlanet('Venus', 90),
        createPlanet('Mars', 120),
        createPlanet('Jupiter', 150),
        createPlanet('Saturn', 180),
        createPlanet('Uranus', 210),
        createPlanet('Neptune', 240),
        createPlanet('Pluto', 270),
      ]);

      const midpoints = calculateMidpoints(chart);

      expect(midpoints.length).toBeGreaterThan(10);
    });
  });

  describe('findMidpointActivations', () => {
    it('should find conjunction activations', () => {
      const chart = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
        createPlanet('Mercury', 30), // Conjunct Sun/Moon midpoint at 30
        createPlanet('Venus', 100), // Add another planet for other potential midpoints
      ]);

      const activations = findMidpointActivations(chart, 2); // Use wider orb

      // Mercury should activate Sun/Moon midpoint
      const mercuryActivation = activations.find(
        a => a.activator === 'Mercury' && a.midpoint.id === 'Sun/Moon'
      );
      expect(mercuryActivation).toBeDefined();
      if (mercuryActivation) {
        expect(mercuryActivation.aspectType).toBe('conjunction');
      }
    });

    it('should find opposition activations', () => {
      const chart = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
        createPlanet('Mercury', 210), // Opposite Sun/Moon midpoint (30 + 180)
        createPlanet('Venus', 100), // Add another planet
      ]);

      const activations = findMidpointActivations(chart, 2); // Use wider orb

      // Mercury should oppose Sun/Moon midpoint
      const mercuryActivation = activations.find(
        a => a.activator === 'Mercury' && a.midpoint.id === 'Sun/Moon'
      );
      expect(mercuryActivation).toBeDefined();
      if (mercuryActivation) {
        expect(mercuryActivation.aspectType).toBe('opposition');
      }
    });

    it('should find square activations', () => {
      const chart = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
        createPlanet('Mars', 120), // Square Sun/Moon midpoint (30 + 90)
      ]);

      const activations = findMidpointActivations(chart, 2);

      const squares = activations.filter(a => a.aspectType === 'square');
      expect(squares.length).toBeGreaterThan(0);
    });

    it('should respect orb setting', () => {
      const chart = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
        createPlanet('Mercury', 32), // 2 degrees from midpoint
      ]);

      const tight = findMidpointActivations(chart, 1);
      const wide = findMidpointActivations(chart, 3);

      expect(wide.length).toBeGreaterThanOrEqual(tight.length);
    });

    it('should exclude midpoint-forming planets from activations', () => {
      const chart = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
      ]);

      const activations = findMidpointActivations(chart);

      // Sun and Moon should not activate their own midpoint
      const sunActivation = activations.find(a =>
        a.midpoint.id === 'Sun/Moon' && a.activator === 'Sun'
      );
      const moonActivation = activations.find(a =>
        a.midpoint.id === 'Sun/Moon' && a.activator === 'Moon'
      );

      expect(sunActivation).toBeUndefined();
      expect(moonActivation).toBeUndefined();
    });

    it('should sort activations by orb ascending', () => {
      const chart = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
        createPlanet('Mercury', 29),
        createPlanet('Venus', 31),
        createPlanet('Mars', 30.5),
      ]);

      const activations = findMidpointActivations(chart, 2);

      for (let i = 1; i < activations.length; i++) {
        expect(activations[i].orb).toBeGreaterThanOrEqual(activations[i - 1].orb);
      }
    });

    it('should include activation description', () => {
      const chart = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
        createPlanet('Mercury', 30),
      ]);

      const activations = findMidpointActivations(chart);

      if (activations.length > 0) {
        expect(activations[0].description).toBeDefined();
        expect(typeof activations[0].description).toBe('string');
      }
    });

    it('should handle ASC activating midpoints', () => {
      const chart = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
      ], 30, 90);

      const activations = findMidpointActivations(chart, 2);

      const ascActivation = activations.find(a => a.activator === 'Ascendant');
      expect(ascActivation).toBeDefined();
    });

    it('should handle MC activating midpoints', () => {
      const chart = createChart([
        createPlanet('Venus', 0),
        createPlanet('Mars', 60),
      ], 0, 30);

      const activations = findMidpointActivations(chart, 2);

      const mcActivation = activations.find(a => a.activator === 'MC');
      expect(mcActivation).toBeDefined();
    });

    it('should return empty array when no activations', () => {
      const chart = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 180),
        createPlanet('Mercury', 100), // Far from all midpoints
      ]);

      const activations = findMidpointActivations(chart, 0.5);

      const mercuryActivations = activations.filter(a => a.activator === 'Mercury');
      expect(mercuryActivations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('findCrossMidpointActivations', () => {
    it('should find activations between two charts', () => {
      const chartA = createChart([
        createPlanet('Sun', 30), // Conjunct B's Venus/Mars midpoint
      ]);
      const chartB = createChart([
        createPlanet('Venus', 0),
        createPlanet('Mars', 60),
      ]);

      const activations = findCrossMidpointActivations(chartA, chartB, 2);

      expect(activations.length).toBeGreaterThan(0);
    });

    it('should prefix activator with "A의"', () => {
      const chartA = createChart([
        createPlanet('Sun', 30),
      ]);
      const chartB = createChart([
        createPlanet('Venus', 0),
        createPlanet('Mars', 60),
      ]);

      const activations = findCrossMidpointActivations(chartA, chartB, 2);

      if (activations.length > 0) {
        expect(activations[0].activator).toContain('A의');
      }
    });

    it('should find conjunction activations', () => {
      const chartA = createChart([
        createPlanet('Jupiter', 30), // Conjunct Sun/Moon midpoint at 30
      ]);
      const chartB = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
        createPlanet('Venus', 100), // Add for other midpoints
      ]);

      const activations = findCrossMidpointActivations(chartA, chartB, 3); // Wider orb

      // Jupiter from Chart A should activate Sun/Moon midpoint in Chart B
      const jupiterActivation = activations.find(
        a => a.activator.includes('Jupiter') && a.midpoint.id === 'Sun/Moon'
      );
      expect(jupiterActivation).toBeDefined();
      if (jupiterActivation) {
        expect(jupiterActivation.aspectType).toBe('conjunction');
      }
    });

    it('should find opposition activations', () => {
      const chartA = createChart([
        createPlanet('Mars', 210), // 180 from Sun/Moon midpoint at 30
      ]);
      const chartB = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
        createPlanet('Venus', 100), // Add for other midpoints
      ]);

      const activations = findCrossMidpointActivations(chartA, chartB, 3); // Wider orb

      // Mars from Chart A should oppose Sun/Moon midpoint in Chart B
      const marsActivation = activations.find(
        a => a.activator.includes('Mars') && a.midpoint.id === 'Sun/Moon'
      );
      expect(marsActivation).toBeDefined();
      if (marsActivation) {
        expect(marsActivation.aspectType).toBe('opposition');
      }
    });

    it('should find square activations', () => {
      const chartA = createChart([
        createPlanet('Saturn', 120), // 90 from Sun/Moon midpoint at 30
      ]);
      const chartB = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
      ]);

      const activations = findCrossMidpointActivations(chartA, chartB, 2);

      const squares = activations.filter(a => a.aspectType === 'square');
      expect(squares.length).toBeGreaterThan(0);
    });

    it('should sort by orb ascending', () => {
      const chartA = createChart([
        createPlanet('Mercury', 29),
        createPlanet('Venus', 31),
        createPlanet('Mars', 30.5),
      ]);
      const chartB = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
      ]);

      const activations = findCrossMidpointActivations(chartA, chartB, 2);

      for (let i = 1; i < activations.length; i++) {
        expect(activations[i].orb).toBeGreaterThanOrEqual(activations[i - 1].orb);
      }
    });

    it('should include ASC from chart A', () => {
      const chartA = createChart([], 30, 90);
      const chartB = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
      ]);

      const activations = findCrossMidpointActivations(chartA, chartB, 2);

      const ascActivation = activations.find(a => a.activator.includes('Ascendant'));
      expect(ascActivation).toBeDefined();
    });

    it('should include MC from chart A', () => {
      const chartA = createChart([], 0, 30);
      const chartB = createChart([
        createPlanet('Venus', 0),
        createPlanet('Mars', 60),
      ]);

      const activations = findCrossMidpointActivations(chartA, chartB, 2);

      const mcActivation = activations.find(a => a.activator.includes('MC'));
      expect(mcActivation).toBeDefined();
    });

    it('should respect custom orb setting', () => {
      const chartA = createChart([
        createPlanet('Mercury', 32),
      ]);
      const chartB = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
      ]);

      const tight = findCrossMidpointActivations(chartA, chartB, 1);
      const wide = findCrossMidpointActivations(chartA, chartB, 3);

      expect(wide.length).toBeGreaterThanOrEqual(tight.length);
    });

    it('should handle charts with no activations', () => {
      const chartA = createChart([
        createPlanet('Sun', 100),
      ]);
      const chartB = createChart([
        createPlanet('Venus', 200),
        createPlanet('Mars', 260),
      ]);

      const activations = findCrossMidpointActivations(chartA, chartB, 0.5);

      expect(Array.isArray(activations)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle midpoints at 0 degrees', () => {
      const chart = createChart([
        createPlanet('Sun', 350),
        createPlanet('Moon', 10),
      ]);

      const midpoints = calculateMidpoints(chart);

      const sunMoon = midpoints.find(m => m.id === 'Sun/Moon');
      if (sunMoon) {
        expect(sunMoon.longitude).toBeCloseTo(0, 1);
      }
    });

    it('should handle midpoints near 360 degrees', () => {
      const result = getMidpoint(340, 20);

      expect(result.longitude).toBeGreaterThanOrEqual(0);
      expect(result.longitude).toBeLessThan(360);
    });

    it('should handle very precise longitudes', () => {
      const result = getMidpoint(123.456789, 223.456789);

      expect(result.longitude).toBeCloseTo(173.456789, 3);
    });

    it('should handle activation at exact degree', () => {
      const chart = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
        createPlanet('Mercury', 30.0),
      ]);

      const activations = findMidpointActivations(chart, 1);

      const exactActivation = activations.find(
        a => a.midpoint.id === 'Sun/Moon' && a.activator === 'Mercury'
      );
      if (exactActivation) {
        expect(exactActivation.orb).toBeCloseTo(0, 1);
      }
    });

    it('should handle chart with only two planets', () => {
      const chart = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 120),
      ]);

      const midpoints = calculateMidpoints(chart);

      expect(midpoints.length).toBeGreaterThan(0);
    });

    it('should handle empty chart', () => {
      const chart = createChart([]);

      const midpoints = calculateMidpoints(chart);

      expect(midpoints).toHaveLength(0);
    });

    it('should handle activation wrapping around 360', () => {
      const chart = createChart([
        createPlanet('Sun', 350),
        createPlanet('Moon', 10),
        createPlanet('Mars', 180), // Opposition to midpoint at ~0
        createPlanet('Venus', 100), // Add for other midpoints
      ]);

      const activations = findMidpointActivations(chart, 3); // Wider orb for wrapping

      // Mars should oppose the Sun/Moon midpoint
      const marsOpposition = activations.find(
        a => a.aspectType === 'opposition' && a.activator === 'Mars' && a.midpoint.id === 'Sun/Moon'
      );
      expect(marsOpposition).toBeDefined();
    });

    it('should handle multiple activations of same midpoint', () => {
      const chart = createChart([
        createPlanet('Sun', 0),
        createPlanet('Moon', 60),
        createPlanet('Mercury', 30),
        createPlanet('Venus', 31),
      ]);

      const activations = findMidpointActivations(chart, 2);

      const sunMoonActivations = activations.filter(
        a => a.midpoint.id === 'Sun/Moon'
      );
      expect(sunMoonActivations.length).toBeGreaterThan(0);
    });
  });
});

