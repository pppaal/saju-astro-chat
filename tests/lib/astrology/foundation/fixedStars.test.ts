// @vitest-environment node
// tests/lib/astrology/foundation/fixedStars.test.ts
import { describe, it, expect } from 'vitest';
import {
  correctForPrecession,
  findFixedStarConjunctions,
  getFixedStar,
  getAllFixedStars,
  findStarsNearLongitude,
  getBrightestStars,
  type FixedStar,
  type FixedStarConjunction,
} from '../../../../src/lib/astrology/foundation/fixedStars';
import type { Chart } from '../../../../src/lib/astrology/foundation/types';

// Helper to create a mock chart
function createMockChart(overrides?: Partial<Chart>): Chart {
  return {
    planets: [
      { name: 'Sun', longitude: 149.83, sign: 'Leo', degree: 29, minute: 50, formatted: '29°50\' Leo', house: 5 },
      { name: 'Moon', longitude: 104.08, sign: 'Cancer', degree: 14, minute: 5, formatted: '14°05\' Cancer', house: 3 },
      { name: 'Mercury', longitude: 76.83, sign: 'Gemini', degree: 16, minute: 50, formatted: '16°50\' Gemini', house: 2 },
      { name: 'Venus', longitude: 203.83, sign: 'Libra', degree: 23, minute: 50, formatted: '23°50\' Libra', house: 7 },
      { name: 'Mars', longitude: 56.17, sign: 'Taurus', degree: 26, minute: 10, formatted: '26°10\' Taurus', house: 1 },
      { name: 'Jupiter', longitude: 249.77, sign: 'Sagittarius', degree: 9, minute: 46, formatted: '9°46\' Sagittarius', house: 9 },
      { name: 'Saturn', longitude: 285.32, sign: 'Capricorn', degree: 15, minute: 19, formatted: '15°19\' Capricorn', house: 10 },
      { name: 'Uranus', longitude: 301.78, sign: 'Aquarius', degree: 1, minute: 47, formatted: '1°47\' Aquarius', house: 11 },
      { name: 'Neptune', longitude: 333.87, sign: 'Pisces', degree: 3, minute: 52, formatted: '3°52\' Pisces', house: 12 },
      { name: 'Pluto', longitude: 204.14, sign: 'Libra', degree: 24, minute: 14, formatted: '24°14\' Libra', house: 7 },
      { name: 'True Node', longitude: 100.0, sign: 'Cancer', degree: 10, minute: 0, formatted: '10°00\' Cancer', house: 3 },
    ],
    ascendant: { name: 'Ascendant', longitude: 30.0, sign: 'Aries', degree: 0, minute: 0, formatted: '0°00\' Aries', house: 1 },
    mc: { name: 'MC', longitude: 120.0, sign: 'Cancer', degree: 0, minute: 0, formatted: '0°00\' Cancer', house: 10 },
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: (i * 30),
      sign: 'Aries',
      formatted: `${i * 30}° Aries`,
    })),
    ...overrides,
  } as Chart;
}

describe('fixedStars', () => {
  describe('correctForPrecession', () => {
    it('should return same longitude for year 2000', () => {
      const baseLongitude = 149.83; // Regulus at 29 Leo 50
      const corrected = correctForPrecession(baseLongitude, 2000);

      expect(corrected).toBeCloseTo(baseLongitude, 2);
    });

    it('should add precession for future years', () => {
      const baseLongitude = 149.83; // Regulus
      const corrected2020 = correctForPrecession(baseLongitude, 2020);
      const corrected2024 = correctForPrecession(baseLongitude, 2024);

      expect(corrected2020).toBeGreaterThan(baseLongitude);
      expect(corrected2024).toBeGreaterThan(corrected2020);
    });

    it('should subtract precession for past years', () => {
      const baseLongitude = 149.83;
      const corrected1980 = correctForPrecession(baseLongitude, 1980);

      expect(corrected1980).toBeLessThan(baseLongitude);
    });

    it('should normalize result to 0-360 range', () => {
      const baseLongitude = 359.0;
      const corrected = correctForPrecession(baseLongitude, 2050);

      expect(corrected).toBeGreaterThanOrEqual(0);
      expect(corrected).toBeLessThan(360);
    });

    it('should apply consistent precession rate', () => {
      const baseLongitude = 100.0;
      const diff10years = correctForPrecession(baseLongitude, 2010) - correctForPrecession(baseLongitude, 2000);
      const diff20years = correctForPrecession(baseLongitude, 2020) - correctForPrecession(baseLongitude, 2000);

      expect(diff20years).toBeCloseTo(diff10years * 2, 1);
    });
  });

  describe('getFixedStar', () => {
    it('should find Regulus by name', () => {
      const star = getFixedStar('Regulus');

      expect(star).toBeDefined();
      expect(star?.name).toBe('Regulus');
      expect(star?.name_ko).toBe('레굴루스 (왕의 별)');
      expect(star?.constellation).toBe('Leo');
    });

    it('should find Sirius by name', () => {
      const star = getFixedStar('Sirius');

      expect(star).toBeDefined();
      expect(star?.name).toBe('Sirius');
      expect(star?.magnitude).toBe(-1.46); // Brightest star
    });

    it('should be case insensitive', () => {
      const star1 = getFixedStar('regulus');
      const star2 = getFixedStar('REGULUS');
      const star3 = getFixedStar('Regulus');

      expect(star1).toBeDefined();
      expect(star2).toBeDefined();
      expect(star3).toBeDefined();
      expect(star1?.name).toBe(star2?.name);
      expect(star2?.name).toBe(star3?.name);
    });

    it('should return undefined for non-existent star', () => {
      const star = getFixedStar('NonExistentStar');

      expect(star).toBeUndefined();
    });

    it('should have all required properties', () => {
      const star = getFixedStar('Aldebaran');

      expect(star).toBeDefined();
      expect(star?.name).toBeDefined();
      expect(star?.name_ko).toBeDefined();
      expect(star?.longitude).toBeGreaterThanOrEqual(0);
      expect(star?.longitude).toBeLessThan(360);
      expect(star?.magnitude).toBeDefined();
      expect(star?.nature).toBeDefined();
      expect(star?.constellation).toBeDefined();
      expect(star?.keywords).toBeDefined();
      expect(Array.isArray(star?.keywords)).toBe(true);
      expect(star?.interpretation).toBeDefined();
    });
  });

  describe('getAllFixedStars', () => {
    it('should return array of all fixed stars', () => {
      const stars = getAllFixedStars();

      expect(Array.isArray(stars)).toBe(true);
      expect(stars.length).toBeGreaterThan(40); // Should have 50+ stars
    });

    it('should include all Royal Stars', () => {
      const stars = getAllFixedStars();
      const names = stars.map(s => s.name);

      expect(names).toContain('Regulus');
      expect(names).toContain('Aldebaran');
      expect(names).toContain('Antares');
      expect(names).toContain('Fomalhaut');
    });

    it('should have valid data for all stars', () => {
      const stars = getAllFixedStars();

      for (const star of stars) {
        expect(star.name).toBeDefined();
        expect(star.longitude).toBeGreaterThanOrEqual(0);
        expect(star.longitude).toBeLessThan(360);
        expect(star.magnitude).toBeDefined();
        expect(star.constellation).toBeDefined();
      }
    });

    it('should return a copy not original array', () => {
      const stars1 = getAllFixedStars();
      const stars2 = getAllFixedStars();

      expect(stars1).not.toBe(stars2); // Different array instances
      expect(stars1.length).toBe(stars2.length);
    });
  });

  describe('getBrightestStars', () => {
    it('should return 5 brightest stars by default', () => {
      const stars = getBrightestStars();

      expect(stars).toHaveLength(5);
    });

    it('should return stars sorted by magnitude (ascending)', () => {
      const stars = getBrightestStars(10);

      for (let i = 0; i < stars.length - 1; i++) {
        expect(stars[i].magnitude).toBeLessThanOrEqual(stars[i + 1].magnitude);
      }
    });

    it('should include Sirius as brightest', () => {
      const stars = getBrightestStars(5);

      expect(stars[0].name).toBe('Sirius');
      expect(stars[0].magnitude).toBe(-1.46);
    });

    it('should handle custom count', () => {
      const stars3 = getBrightestStars(3);
      const stars10 = getBrightestStars(10);

      expect(stars3).toHaveLength(3);
      expect(stars10).toHaveLength(10);
    });

    it('should return all stars if count exceeds total', () => {
      const allStars = getAllFixedStars();
      const brightStars = getBrightestStars(1000);

      expect(brightStars.length).toBe(allStars.length);
    });
  });

  describe('findStarsNearLongitude', () => {
    it('should find stars near Regulus position', () => {
      const stars = findStarsNearLongitude(149.83, 2000, 1.0);

      expect(stars.length).toBeGreaterThanOrEqual(1);
      expect(stars.some(s => s.name === 'Regulus')).toBe(true);
    });

    it('should find stars within orb', () => {
      const longitude = 104.0; // Near Sirius
      const orb = 2.0;
      const stars = findStarsNearLongitude(longitude, 2000, orb);

      expect(stars.length).toBeGreaterThanOrEqual(1);
    });

    it('should find no stars with very tight orb', () => {
      const stars = findStarsNearLongitude(45.0, 2000, 0.01);

      expect(stars.length).toBe(0);
    });

    it('should find more stars with larger orb', () => {
      const tightOrb = findStarsNearLongitude(100.0, 2000, 1.0);
      const wideOrb = findStarsNearLongitude(100.0, 2000, 5.0);

      expect(wideOrb.length).toBeGreaterThanOrEqual(tightOrb.length);
    });

    it('should apply precession correction', () => {
      const stars2000 = findStarsNearLongitude(149.83, 2000, 0.5);
      const stars2024 = findStarsNearLongitude(149.83, 2024, 0.5);

      // With precession, fewer stars should match the old position
      expect(stars2024.length).toBeLessThanOrEqual(stars2000.length);
    });

    it('should handle longitude wrapping', () => {
      const stars = findStarsNearLongitude(359.0, 2000, 2.0);

      expect(stars).toBeDefined();
      expect(Array.isArray(stars)).toBe(true);
    });
  });

  describe('findFixedStarConjunctions', () => {
    it('should find conjunctions in chart', () => {
      const chart = createMockChart();
      const conjunctions = findFixedStarConjunctions(chart, 2024, 1.0);

      expect(Array.isArray(conjunctions)).toBe(true);
    });

    it('should find Sun conjunct Regulus', () => {
      const chart = createMockChart({
        planets: [
          { name: 'Sun', longitude: 149.83, sign: 'Leo', degree: 29, minute: 50, formatted: '29°50\' Leo', house: 5 },
        ],
      } as any);

      const conjunctions = findFixedStarConjunctions(chart, 2000, 1.0);
      const regulusConj = conjunctions.find(c => c.star.name === 'Regulus' && c.planet === 'Sun');

      expect(regulusConj).toBeDefined();
      expect(regulusConj?.orb).toBeLessThan(1.0);
    });

    it('should include ascendant in conjunction search', () => {
      const chart = createMockChart({
        ascendant: { name: 'Ascendant', longitude: 149.8, sign: 'Leo', degree: 29, minute: 48, formatted: '29°48\' Leo', house: 1 },
      } as any);

      const conjunctions = findFixedStarConjunctions(chart, 2000, 1.0);
      const ascConj = conjunctions.find(c => c.planet === 'Ascendant');

      expect(ascConj).toBeDefined();
    });

    it('should include MC in conjunction search', () => {
      const chart = createMockChart({
        mc: { name: 'MC', longitude: 149.85, sign: 'Leo', degree: 29, minute: 51, formatted: '29°51\' Leo', house: 10 },
      } as any);

      const conjunctions = findFixedStarConjunctions(chart, 2000, 1.0);
      const mcConj = conjunctions.find(c => c.planet === 'MC');

      expect(mcConj).toBeDefined();
    });

    it('should sort conjunctions by orb', () => {
      const chart = createMockChart();
      const conjunctions = findFixedStarConjunctions(chart, 2024, 2.0);

      for (let i = 0; i < conjunctions.length - 1; i++) {
        expect(conjunctions[i].orb).toBeLessThanOrEqual(conjunctions[i + 1].orb);
      }
    });

    it('should respect orb parameter', () => {
      const chart = createMockChart();
      const tight = findFixedStarConjunctions(chart, 2024, 0.5);
      const wide = findFixedStarConjunctions(chart, 2024, 2.0);

      expect(wide.length).toBeGreaterThanOrEqual(tight.length);
    });

    it('should have valid conjunction structure', () => {
      const chart = createMockChart();
      const conjunctions = findFixedStarConjunctions(chart, 2024, 2.0);

      for (const conj of conjunctions) {
        expect(conj.star).toBeDefined();
        expect(conj.star.name).toBeDefined();
        expect(conj.planet).toBeDefined();
        expect(conj.orb).toBeGreaterThanOrEqual(0);
        expect(conj.description).toBeDefined();
        expect(typeof conj.description).toBe('string');
      }
    });

    it('should handle charts with no conjunctions', () => {
      const chart = createMockChart({
        planets: [
          { name: 'Sun', longitude: 10.0, sign: 'Aries', degree: 10, minute: 0, formatted: '10°00\' Aries', house: 1 },
        ],
      } as any);

      const conjunctions = findFixedStarConjunctions(chart, 2024, 0.1);

      expect(conjunctions).toBeDefined();
      expect(Array.isArray(conjunctions)).toBe(true);
    });

    it('should find multiple conjunctions for same planet', () => {
      const chart = createMockChart({
        planets: [
          { name: 'Sun', longitude: 82.0, sign: 'Gemini', degree: 22, minute: 0, formatted: '22°00\' Gemini', house: 2 },
        ],
      } as any);

      const conjunctions = findFixedStarConjunctions(chart, 2000, 2.0);
      const sunConj = conjunctions.filter(c => c.planet === 'Sun');

      // Multiple Orion belt stars near this position
      expect(sunConj.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Star database integrity', () => {
    it('should have Royal Stars with correct properties', () => {
      const regulus = getFixedStar('Regulus');
      const aldebaran = getFixedStar('Aldebaran');
      const antares = getFixedStar('Antares');
      const fomalhaut = getFixedStar('Fomalhaut');

      expect(regulus?.constellation).toBe('Leo');
      expect(aldebaran?.constellation).toBe('Taurus');
      expect(antares?.constellation).toBe('Scorpius');
      expect(fomalhaut?.constellation).toBe('Piscis Austrinus');
    });

    it('should have brightest stars cataloged', () => {
      const sirius = getFixedStar('Sirius');
      const canopus = getFixedStar('Canopus');
      const arcturus = getFixedStar('Arcturus');
      const vega = getFixedStar('Vega');

      expect(sirius?.magnitude).toBeLessThan(0); // Negative magnitude = very bright
      expect(canopus).toBeDefined();
      expect(arcturus).toBeDefined();
      expect(vega).toBeDefined();
    });

    it('should have famous fixed stars', () => {
      expect(getFixedStar('Algol')).toBeDefined(); // Demon star
      expect(getFixedStar('Spica')).toBeDefined(); // Fortune star
      expect(getFixedStar('Pleiades')).toBeDefined(); // Seven sisters
      expect(getFixedStar('Polaris')).toBeDefined(); // North star
    });

    it('should have keywords for all stars', () => {
      const stars = getAllFixedStars();

      for (const star of stars) {
        expect(star.keywords).toBeDefined();
        expect(Array.isArray(star.keywords)).toBe(true);
        expect(star.keywords.length).toBeGreaterThan(0);
      }
    });

    it('should have interpretations for all stars', () => {
      const stars = getAllFixedStars();

      for (const star of stars) {
        expect(star.interpretation).toBeDefined();
        expect(typeof star.interpretation).toBe('string');
        expect(star.interpretation.length).toBeGreaterThan(0);
      }
    });
  });
});


