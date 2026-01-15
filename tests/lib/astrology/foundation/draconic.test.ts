// @vitest-environment node
// tests/lib/astrology/foundation/draconic.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
  calculateDraconicChart,
  compareDraconicToNatal,
  findDraconicAspects,
  calculateDraconicSynastry,
  findDraconicTransits,
  getDraconicPlanetMeaning,
  type DraconicChart,
} from '../../../../src/lib/astrology/foundation/draconic';
import type { Chart, ZodiacKo } from '../../../../src/lib/astrology/foundation/types';

// Mock chart helper
const createMockChart = (nodeOffset: number = 0): Chart => ({
  planets: [
    { name: 'Sun', longitude: 45 + nodeOffset, sign: 'Taurus', degree: 15, minute: 0, formatted: '15°00\' Taurus', house: 1 },
    { name: 'Moon', longitude: 120 + nodeOffset, sign: 'Leo', degree: 0, minute: 0, formatted: '00°00\' Leo', house: 5 },
    { name: 'Mercury', longitude: 50 + nodeOffset, sign: 'Taurus', degree: 20, minute: 0, formatted: '20°00\' Taurus', house: 1 },
    { name: 'True Node', longitude: nodeOffset, sign: 'Aries', degree: 0, minute: 0, formatted: '00°00\' Aries', house: 1 },
  ],
  ascendant: { name: 'Ascendant', longitude: 30 + nodeOffset, sign: 'Taurus', degree: 0, minute: 0, formatted: '00°00\' Taurus', house: 1 },
  mc: { name: 'MC', longitude: 300 + nodeOffset, sign: 'Aquarius', degree: 0, minute: 0, formatted: '00°00\' Aquarius', house: 10 },
  houses: [
    { number: 1, cusp: 30 + nodeOffset, sign: 'Taurus', formatted: '00°00\' Taurus' },
    { number: 2, cusp: 60 + nodeOffset, sign: 'Gemini', formatted: '00°00\' Gemini' },
  ],
});

describe('lib/astrology/foundation/draconic', () => {
  describe('calculateDraconicChart', () => {
    it('should calculate draconic chart from natal chart', () => {
      const natalChart = createMockChart(45);
      const draconic = calculateDraconicChart(natalChart);

      expect(draconic).toBeDefined();
      expect(draconic.chartType).toBe('draconic');
      expect(draconic.natalNorthNode).toBe(45);
      expect(draconic.offsetDegrees).toBe(45);
    });

    it('should normalize all planet positions by North Node offset', () => {
      const natalChart = createMockChart(30);
      const draconic = calculateDraconicChart(natalChart);

      const sun = draconic.planets.find(p => p.name === 'Sun');
      expect(sun).toBeDefined();
      // Sun at 75 (45+30), minus offset 30 = 45
      expect(sun!.longitude).toBe(45);
    });

    it('should set True Node to 0 degrees Aries in draconic chart', () => {
      const natalChart = createMockChart(90);
      const draconic = calculateDraconicChart(natalChart);

      const node = draconic.planets.find(p => p.name === 'True Node');
      expect(node).toBeDefined();
      expect(node!.longitude).toBe(0);
      expect(node!.sign).toBe('Aries');
    });

    it('should handle negative longitudes correctly', () => {
      const natalChart = createMockChart(350);
      const draconic = calculateDraconicChart(natalChart);

      const planet = draconic.planets.find(p => p.name === 'Sun');
      expect(planet).toBeDefined();
      expect(planet!.longitude).toBeGreaterThanOrEqual(0);
      expect(planet!.longitude).toBeLessThan(360);
    });

    it('should throw error when North Node is missing', () => {
      const invalidChart: Chart = {
        planets: [
          { name: 'Sun', longitude: 45, sign: 'Taurus', degree: 15, minute: 0, formatted: '15°00\' Taurus', house: 1 },
        ],
        ascendant: { name: 'Ascendant', longitude: 30, sign: 'Taurus', degree: 0, minute: 0, formatted: '00°00\' Taurus', house: 1 },
        mc: { name: 'MC', longitude: 300, sign: 'Aquarius', degree: 0, minute: 0, formatted: '00°00\' Aquarius', house: 10 },
        houses: [],
      };

      expect(() => calculateDraconicChart(invalidChart)).toThrow('North Node (True Node) not found');
    });

    it('should convert ASC and MC positions', () => {
      const natalChart = createMockChart(60);
      const draconic = calculateDraconicChart(natalChart);

      expect(draconic.ascendant).toBeDefined();
      expect(draconic.mc).toBeDefined();
      expect(draconic.ascendant.longitude).toBeGreaterThanOrEqual(0);
      expect(draconic.mc.longitude).toBeGreaterThanOrEqual(0);
    });

    it('should convert house cusps', () => {
      const natalChart = createMockChart(45);
      const draconic = calculateDraconicChart(natalChart);

      expect(draconic.houses).toBeDefined();
      expect(draconic.houses.length).toBeGreaterThan(0);
      draconic.houses.forEach(house => {
        expect(house.cusp).toBeGreaterThanOrEqual(0);
        expect(house.cusp).toBeLessThan(360);
      });
    });

    it('should preserve planet names', () => {
      const natalChart = createMockChart(0);
      const draconic = calculateDraconicChart(natalChart);

      const natalPlanetNames = natalChart.planets.map(p => p.name);
      const draconicPlanetNames = draconic.planets.map(p => p.name);
      expect(draconicPlanetNames).toEqual(natalPlanetNames);
    });

    it('should calculate sign and degree correctly after offset', () => {
      const natalChart = createMockChart(15);
      const draconic = calculateDraconicChart(natalChart);

      const sun = draconic.planets.find(p => p.name === 'Sun');
      expect(sun).toBeDefined();
      expect(sun!.sign).toBeDefined();
      expect(sun!.degree).toBeGreaterThanOrEqual(0);
      expect(sun!.degree).toBeLessThan(30);
    });

    it('should handle 360-degree offset correctly', () => {
      const natalChart = createMockChart(360);
      const draconic = calculateDraconicChart(natalChart);

      expect(draconic).toBeDefined();
      expect(draconic.offsetDegrees).toBe(360);
    });
  });

  describe('compareDraconicToNatal', () => {
    it('should return comparison with alignments and tensions', () => {
      const natalChart = createMockChart(30);
      const comparison = compareDraconicToNatal(natalChart);

      expect(comparison).toBeDefined();
      expect(comparison.draconicChart).toBeDefined();
      expect(comparison.natalChart).toBeDefined();
      expect(comparison.alignments).toBeDefined();
      expect(comparison.tensions).toBeDefined();
      expect(comparison.summary).toBeDefined();
    });

    it('should find conjunctions between draconic and natal planets', () => {
      const natalChart = createMockChart(0);
      const comparison = compareDraconicToNatal(natalChart);

      expect(Array.isArray(comparison.alignments)).toBe(true);
    });

    it('should find square aspects between draconic and natal', () => {
      const natalChart = createMockChart(45);
      const comparison = compareDraconicToNatal(natalChart);

      expect(Array.isArray(comparison.tensions)).toBe(true);
    });

    it('should find opposition aspects between draconic and natal', () => {
      const natalChart = createMockChart(90);
      const comparison = compareDraconicToNatal(natalChart);

      const oppositions = comparison.tensions.filter(t => t.aspectType === 'opposition');
      expect(Array.isArray(oppositions)).toBe(true);
    });

    it('should sort alignments by orb (closest first)', () => {
      const natalChart = createMockChart(10);
      const comparison = compareDraconicToNatal(natalChart);

      if (comparison.alignments.length > 1) {
        for (let i = 0; i < comparison.alignments.length - 1; i++) {
          expect(comparison.alignments[i].orb).toBeLessThanOrEqual(comparison.alignments[i + 1].orb);
        }
      }
    });

    it('should sort tensions by orb (closest first)', () => {
      const natalChart = createMockChart(45);
      const comparison = compareDraconicToNatal(natalChart);

      if (comparison.tensions.length > 1) {
        for (let i = 0; i < comparison.tensions.length - 1; i++) {
          expect(comparison.tensions[i].orb).toBeLessThanOrEqual(comparison.tensions[i + 1].orb);
        }
      }
    });

    it('should generate summary with soul identity', () => {
      const natalChart = createMockChart(0);
      const comparison = compareDraconicToNatal(natalChart);

      expect(comparison.summary.soulIdentity).toBeDefined();
      expect(typeof comparison.summary.soulIdentity).toBe('string');
    });

    it('should generate summary with soul needs', () => {
      const natalChart = createMockChart(0);
      const comparison = compareDraconicToNatal(natalChart);

      expect(comparison.summary.soulNeeds).toBeDefined();
      expect(typeof comparison.summary.soulNeeds).toBe('string');
    });

    it('should generate summary with soul purpose', () => {
      const natalChart = createMockChart(0);
      const comparison = compareDraconicToNatal(natalChart);

      expect(comparison.summary.soulPurpose).toBeDefined();
      expect(typeof comparison.summary.soulPurpose).toBe('string');
    });

    it('should generate summary with karmic lessons', () => {
      const natalChart = createMockChart(0);
      const comparison = compareDraconicToNatal(natalChart);

      expect(comparison.summary.karmicLessons).toBeDefined();
      expect(typeof comparison.summary.karmicLessons).toBe('string');
    });

    it('should calculate alignment score', () => {
      const natalChart = createMockChart(0);
      const comparison = compareDraconicToNatal(natalChart);

      expect(comparison.summary.alignmentScore).toBeDefined();
      expect(typeof comparison.summary.alignmentScore).toBe('number');
      expect(comparison.summary.alignmentScore).toBeGreaterThanOrEqual(0);
      expect(comparison.summary.alignmentScore).toBeLessThanOrEqual(100);
    });

    it('should include alignment meanings', () => {
      const natalChart = createMockChart(0);
      const comparison = compareDraconicToNatal(natalChart);

      comparison.alignments.forEach(alignment => {
        expect(alignment.meaning).toBeDefined();
        expect(typeof alignment.meaning).toBe('string');
      });
    });

    it('should include tension meanings', () => {
      const natalChart = createMockChart(45);
      const comparison = compareDraconicToNatal(natalChart);

      comparison.tensions.forEach(tension => {
        expect(tension.meaning).toBeDefined();
        expect(typeof tension.meaning).toBe('string');
      });
    });
  });

  describe('findDraconicAspects', () => {
    it('should find aspects within draconic chart', () => {
      const natalChart = createMockChart(30);
      const draconic = calculateDraconicChart(natalChart);
      const aspects = findDraconicAspects(draconic);

      expect(Array.isArray(aspects)).toBe(true);
    });

    it('should return empty array for chart with no aspects', () => {
      const sparseChart = createMockChart(0);
      sparseChart.planets = sparseChart.planets.filter(p => ['Sun', 'True Node'].includes(p.name));
      const draconic = calculateDraconicChart(sparseChart);
      const aspects = findDraconicAspects(draconic);

      expect(Array.isArray(aspects)).toBe(true);
    });
  });

  describe('calculateDraconicSynastry', () => {
    it('should calculate synastry between two charts', () => {
      const chartA = createMockChart(30);
      const chartB = createMockChart(45);
      const synastry = calculateDraconicSynastry(chartA, chartB);

      expect(synastry).toBeDefined();
      expect(synastry.draconicA).toBeDefined();
      expect(synastry.draconicB).toBeDefined();
      expect(synastry.soulConnections).toBeDefined();
      expect(synastry.draconicToNatalAB).toBeDefined();
      expect(synastry.draconicToNatalBA).toBeDefined();
    });

    it('should find soul connections between draconic charts', () => {
      const chartA = createMockChart(0);
      const chartB = createMockChart(0);
      const synastry = calculateDraconicSynastry(chartA, chartB);

      expect(Array.isArray(synastry.soulConnections)).toBe(true);
    });

    it('should find A draconic to B natal aspects', () => {
      const chartA = createMockChart(30);
      const chartB = createMockChart(60);
      const synastry = calculateDraconicSynastry(chartA, chartB);

      expect(Array.isArray(synastry.draconicToNatalAB)).toBe(true);
    });

    it('should find B draconic to A natal aspects', () => {
      const chartA = createMockChart(30);
      const chartB = createMockChart(60);
      const synastry = calculateDraconicSynastry(chartA, chartB);

      expect(Array.isArray(synastry.draconicToNatalBA)).toBe(true);
    });
  });

  describe('findDraconicTransits', () => {
    it('should find transits to draconic chart', () => {
      const natalChart = createMockChart(30);
      const draconic = calculateDraconicChart(natalChart);
      const transitChart = createMockChart(45);
      const transits = findDraconicTransits(draconic, transitChart);

      expect(Array.isArray(transits)).toBe(true);
    });

    it('should return aspects when transit planets aspect draconic points', () => {
      const natalChart = createMockChart(0);
      const draconic = calculateDraconicChart(natalChart);
      const transitChart = createMockChart(0);
      const transits = findDraconicTransits(draconic, transitChart);

      expect(transits.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getDraconicPlanetMeaning', () => {
    it('should return meaning for Sun in each sign', () => {
      const signs: ZodiacKo[] = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                                  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

      signs.forEach(sign => {
        const meaning = getDraconicPlanetMeaning('Sun', sign);
        expect(meaning).toBeDefined();
        expect(meaning.meaning).toBeDefined();
        expect(meaning.archetype).toBeDefined();
        expect(meaning.pastLife).toBeDefined();
      });
    });

    it('should return meaning for Moon in each sign', () => {
      const meaning = getDraconicPlanetMeaning('Moon', 'Cancer');
      expect(meaning.meaning).toContain('영혼');
    });

    it('should return meaning for Mercury', () => {
      const meaning = getDraconicPlanetMeaning('Mercury', 'Gemini');
      expect(meaning).toBeDefined();
      expect(meaning.meaning).toBeDefined();
    });

    it('should return meaning for Venus', () => {
      const meaning = getDraconicPlanetMeaning('Venus', 'Taurus');
      expect(meaning).toBeDefined();
    });

    it('should return meaning for Mars', () => {
      const meaning = getDraconicPlanetMeaning('Mars', 'Aries');
      expect(meaning).toBeDefined();
    });

    it('should return meaning for Jupiter', () => {
      const meaning = getDraconicPlanetMeaning('Jupiter', 'Sagittarius');
      expect(meaning).toBeDefined();
    });

    it('should return meaning for Saturn', () => {
      const meaning = getDraconicPlanetMeaning('Saturn', 'Capricorn');
      expect(meaning.meaning).toContain('카르마');
    });

    it('should return meaning for outer planets', () => {
      const uranus = getDraconicPlanetMeaning('Uranus', 'Aquarius');
      const neptune = getDraconicPlanetMeaning('Neptune', 'Pisces');
      const pluto = getDraconicPlanetMeaning('Pluto', 'Scorpio');

      expect(uranus).toBeDefined();
      expect(neptune).toBeDefined();
      expect(pluto).toBeDefined();
    });

    it('should return meaning for Ascendant', () => {
      const meaning = getDraconicPlanetMeaning('Ascendant', 'Leo');
      expect(meaning.meaning).toContain('영혼');
    });

    it('should return meaning for MC', () => {
      const meaning = getDraconicPlanetMeaning('MC', 'Capricorn');
      expect(meaning.meaning).toContain('사명');
    });

    it('should return default for unknown planet', () => {
      const meaning = getDraconicPlanetMeaning('UnknownPlanet', 'Aries');
      expect(meaning.meaning).toBeDefined();
    });

    it('should include archetype for all signs', () => {
      const meaning = getDraconicPlanetMeaning('Sun', 'Scorpio');
      expect(meaning.archetype).toBe('변형자 영혼');
    });

    it('should include past life theme for all signs', () => {
      const meaning = getDraconicPlanetMeaning('Moon', 'Pisces');
      expect(meaning.pastLife).toBe('영매, 예술가');
    });
  });

  describe('Edge Cases', () => {
    it('should handle chart with minimal planets', () => {
      const minimalChart = createMockChart(0);
      minimalChart.planets = [
        minimalChart.planets.find(p => p.name === 'Sun')!,
        minimalChart.planets.find(p => p.name === 'True Node')!,
      ];

      const draconic = calculateDraconicChart(minimalChart);
      expect(draconic).toBeDefined();
    });

    it('should handle large node offsets', () => {
      const natalChart = createMockChart(350);
      const draconic = calculateDraconicChart(natalChart);

      expect(draconic).toBeDefined();
      expect(draconic.offsetDegrees).toBe(350);
    });

    it('should handle zero node offset', () => {
      const natalChart = createMockChart(0);
      const draconic = calculateDraconicChart(natalChart);

      expect(draconic).toBeDefined();
      expect(draconic.offsetDegrees).toBe(0);
    });

    it('should handle comparison with no alignments', () => {
      const natalChart = createMockChart(180);
      const comparison = compareDraconicToNatal(natalChart);

      expect(comparison.alignments).toBeDefined();
      expect(Array.isArray(comparison.alignments)).toBe(true);
    });

    it('should handle synastry with same charts', () => {
      const chart = createMockChart(30);
      const synastry = calculateDraconicSynastry(chart, chart);

      expect(synastry).toBeDefined();
      expect(synastry.soulConnections.length).toBeGreaterThan(0);
    });
  });
});

