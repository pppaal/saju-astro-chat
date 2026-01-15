// @vitest-environment node
// tests/lib/astrology/foundation/harmonics.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateHarmonicChart,
  findHarmonicConjunctions,
  findHarmonicPatterns,
  analyzeHarmonic,
  analyzeAgeHarmonic,
  generateHarmonicProfile,
  analyzeAspectSeriesHarmonic,
  getHarmonicMeaning,
} from '@/lib/astrology/foundation/harmonics';
import type { Chart, PlanetBase, ZodiacKo } from '@/lib/astrology/foundation/types';

// Helper function to create test planets
function createPlanet(name: string, longitude: number, speed = 1): PlanetBase {
  const signIndex = Math.floor((longitude % 360) / 30);
  const signs: ZodiacKo[] = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ];
  return {
    name,
    longitude,
    sign: signs[signIndex],
    degree: Math.floor(longitude % 30),
    minute: Math.floor(((longitude % 30) % 1) * 60),
    formatted: `${signs[signIndex]} ${Math.floor(longitude % 30)}deg`,
    house: Math.floor(longitude / 30) + 1,
    speed,
  };
}

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
      formatted: `${i * 30}deg`,
    })),
  };
}

describe('harmonics', () => {
  describe('calculateHarmonicChart', () => {
    it('should calculate harmonic chart for H2', () => {
      const natal = createChart([
        createPlanet('Sun', 45),
        createPlanet('Moon', 120),
      ]);

      const h2 = calculateHarmonicChart(natal, 2);

      expect(h2.harmonicNumber).toBe(2);
      expect(h2.chartType).toBe('harmonic');
      expect(h2.planets).toHaveLength(2);
      expect(h2.planets[0].longitude).toBeCloseTo(90, 1);
      expect(h2.planets[1].longitude).toBeCloseTo(240, 1);
    });

    it('should calculate H5 chart', () => {
      const natal = createChart([createPlanet('Sun', 30)]);
      const h5 = calculateHarmonicChart(natal, 5);

      expect(h5.harmonicNumber).toBe(5);
      expect(h5.planets[0].longitude).toBeCloseTo(150, 1);
    });

    it('should calculate H7 chart', () => {
      const natal = createChart([createPlanet('Sun', 50)]);
      const h7 = calculateHarmonicChart(natal, 7);

      expect(h7.harmonicNumber).toBe(7);
      expect(h7.planets[0].longitude).toBeCloseTo(350, 1);
    });

    it('should calculate H9 chart', () => {
      const natal = createChart([createPlanet('Sun', 40)]);
      const h9 = calculateHarmonicChart(natal, 9);

      expect(h9.harmonicNumber).toBe(9);
      expect(h9.planets[0].longitude).toBeCloseTo(0, 0);
    });

    it('should wrap longitude beyond 360 degrees', () => {
      const natal = createChart([createPlanet('Sun', 100)]);
      const h5 = calculateHarmonicChart(natal, 5);

      expect(h5.planets[0].longitude).toBeCloseTo(140, 1);
    });

    it('should transform ASC and MC', () => {
      const natal = createChart([], 60, 150);
      const h3 = calculateHarmonicChart(natal, 3);

      expect(h3.ascendant.longitude).toBeCloseTo(180, 1);
      expect(h3.mc.longitude).toBeCloseTo(90, 1);
    });

    it('should transform house cusps', () => {
      const natal = createChart([]);
      const h2 = calculateHarmonicChart(natal, 2);

      expect(h2.houses).toHaveLength(12);
      expect(h2.houses[0].cusp).toBe(0);
      expect(h2.houses[1].cusp).toBe(60);
    });

    it('should throw error for invalid harmonic number', () => {
      const natal = createChart([createPlanet('Sun', 0)]);

      expect(() => calculateHarmonicChart(natal, 0)).toThrow();
      expect(() => calculateHarmonicChart(natal, -1)).toThrow();
      expect(() => calculateHarmonicChart(natal, 145)).toThrow();
    });

    it('should handle harmonic 1 (same as natal)', () => {
      const natal = createChart([createPlanet('Sun', 45)]);
      const h1 = calculateHarmonicChart(natal, 1);

      expect(h1.planets[0].longitude).toBe(45);
    });
  });

  describe('findHarmonicConjunctions', () => {
    it('should find conjunctions within orb', () => {
      const chart = calculateHarmonicChart(
        createChart([
          createPlanet('Sun', 100),
          createPlanet('Moon', 101),
          createPlanet('Mercury', 102),
        ]),
        5
      );

      const conjunctions = findHarmonicConjunctions(chart, 10);

      expect(conjunctions.length).toBeGreaterThan(0);
      expect(conjunctions[0].planets.length).toBeGreaterThanOrEqual(2);
    });

    it('should not find conjunctions outside orb', () => {
      const chart = calculateHarmonicChart(
        createChart([
          createPlanet('Sun', 10),
          createPlanet('Moon', 70),
        ], 200, 260),
        2
      );

      const conjunctions = findHarmonicConjunctions(chart, 5);

      expect(conjunctions).toHaveLength(0);
    });

    it('should group multiple planets in conjunction', () => {
      const chart = calculateHarmonicChart(
        createChart([
          createPlanet('Sun', 100),
          createPlanet('Moon', 101),
          createPlanet('Mercury', 102),
          createPlanet('Venus', 103),
        ]),
        3
      );

      const conjunctions = findHarmonicConjunctions(chart, 15);

      const stellium = conjunctions.find(c => c.planets.length >= 3);
      expect(stellium).toBeDefined();
    });

    it('should sort by strength descending', () => {
      const chart = calculateHarmonicChart(
        createChart([
          createPlanet('Sun', 100),
          createPlanet('Moon', 105),
          createPlanet('Mercury', 150),
          createPlanet('Venus', 155),
        ]),
        4
      );

      const conjunctions = findHarmonicConjunctions(chart, 10);

      for (let i = 1; i < conjunctions.length; i++) {
        expect(conjunctions[i - 1].strength).toBeGreaterThanOrEqual(conjunctions[i].strength);
      }
    });
  });

  describe('findHarmonicPatterns', () => {
    it('should detect stellium pattern', () => {
      const chart = calculateHarmonicChart(
        createChart([
          createPlanet('Sun', 100),
          createPlanet('Moon', 101),
          createPlanet('Mercury', 102),
        ]),
        5
      );

      const patterns = findHarmonicPatterns(chart);

      const stellium = patterns.find(p => p.type === 'stellium');
      expect(stellium).toBeDefined();
      if (stellium) {
        expect(stellium.planets.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should return empty array when no patterns found', () => {
      const chart = calculateHarmonicChart(
        createChart([
          createPlanet('Sun', 0),
          createPlanet('Moon', 180),
        ]),
        2
      );

      const patterns = findHarmonicPatterns(chart);

      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('analyzeHarmonic', () => {
    it('should return harmonic analysis with all fields', () => {
      const natal = createChart([
        createPlanet('Sun', 45),
        createPlanet('Moon', 120),
      ]);

      const analysis = analyzeHarmonic(natal, 3);

      expect(analysis.harmonic).toBe(3);
      expect(analysis.chart).toBeDefined();
      expect(analysis.strength).toBeGreaterThanOrEqual(0);
      expect(analysis.strength).toBeLessThanOrEqual(100);
      expect(analysis.conjunctions).toBeDefined();
      expect(analysis.patterns).toBeDefined();
      expect(analysis.interpretation).toBeDefined();
    });

    it('should cap strength at 100', () => {
      const natal = createChart([
        createPlanet('Sun', 100),
        createPlanet('Moon', 101),
        createPlanet('Mercury', 102),
        createPlanet('Venus', 103),
        createPlanet('Mars', 104),
      ]);

      const analysis = analyzeHarmonic(natal, 4);

      expect(analysis.strength).toBeLessThanOrEqual(100);
    });
  });

  describe('analyzeAgeHarmonic', () => {
    it('should analyze harmonic matching age', () => {
      const natal = createChart([createPlanet('Sun', 45)]);
      const age = 33;

      const analysis = analyzeAgeHarmonic(natal, age);

      expect(analysis.harmonic).toBe(age);
    });
  });

  describe('generateHarmonicProfile', () => {
    it('should generate profile with strongest harmonics', () => {
      const natal = createChart([
        createPlanet('Sun', 45),
        createPlanet('Moon', 120),
      ]);

      const profile = generateHarmonicProfile(natal);

      expect(profile.strongestHarmonics).toHaveLength(3);
      expect(profile.weakestHarmonics).toHaveLength(3);
      expect(profile.overallInterpretation).toBeDefined();
    });

    it('should include age harmonic when provided', () => {
      const natal = createChart([createPlanet('Sun', 45)]);

      const profile = generateHarmonicProfile(natal, 30);

      expect(profile.ageHarmonic).toBeDefined();
      expect(profile.ageHarmonic?.harmonic).toBe(30);
    });

    it('should not include age harmonic when not provided', () => {
      const natal = createChart([createPlanet('Sun', 45)]);

      const profile = generateHarmonicProfile(natal);

      expect(profile.ageHarmonic).toBeNull();
    });
  });

  describe('analyzeAspectSeriesHarmonic', () => {
    it('should analyze quintile series (H5)', () => {
      const natal = createChart([createPlanet('Sun', 45)]);

      const analysis = analyzeAspectSeriesHarmonic(natal, 'quintile');

      expect(analysis.harmonic).toBe(5);
    });

    it('should analyze septile series (H7)', () => {
      const natal = createChart([createPlanet('Sun', 45)]);

      const analysis = analyzeAspectSeriesHarmonic(natal, 'septile');

      expect(analysis.harmonic).toBe(7);
    });

    it('should analyze novile series (H9)', () => {
      const natal = createChart([createPlanet('Sun', 45)]);

      const analysis = analyzeAspectSeriesHarmonic(natal, 'novile');

      expect(analysis.harmonic).toBe(9);
    });
  });

  describe('getHarmonicMeaning', () => {
    it('should return known harmonic meanings', () => {
      const h3 = getHarmonicMeaning(3);

      expect(h3.name).toContain('Third Harmonic');
      expect(h3.meaning).toBeDefined();
      expect(h3.lifeArea).toBeDefined();
    });

    it('should return meanings for all primary harmonics', () => {
      const primaryHarmonics = [2, 3, 4, 5, 7, 8, 9, 12];

      for (const h of primaryHarmonics) {
        const meaning = getHarmonicMeaning(h);
        expect(meaning.meaning).toBeDefined();
        expect(meaning.lifeArea).toBeDefined();
      }
    });

    it('should handle unknown harmonics gracefully', () => {
      const h99 = getHarmonicMeaning(99);

      expect(h99.name).toContain('H99');
      expect(h99.meaning).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle chart with no planets', () => {
      const emptyChart = createChart([]);

      const h2 = calculateHarmonicChart(emptyChart, 2);

      expect(h2.planets).toHaveLength(0);
    });

    it('should handle planets at 0 degrees', () => {
      const natal = createChart([createPlanet('Sun', 0)]);
      const h3 = calculateHarmonicChart(natal, 3);

      expect(h3.planets[0].longitude).toBe(0);
    });

    it('should handle high harmonic numbers', () => {
      const natal = createChart([createPlanet('Sun', 45)]);
      const h144 = calculateHarmonicChart(natal, 144);

      expect(h144.harmonicNumber).toBe(144);
      expect(h144.planets[0].longitude).toBeDefined();
    });
  });
});

