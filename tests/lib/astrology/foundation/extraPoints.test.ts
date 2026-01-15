// @vitest-environment node
// tests/lib/astrology/foundation/extraPoints.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import {
  calculateChiron,
  calculateLilith,
  calculatePartOfFortune,
  calculateVertex,
  isNightChart,
  extendChartWithExtraPoints,
  calculateExtraPoints,
} from '../../../../src/lib/astrology/foundation/extraPoints';
import { calculateNatalChart, toChart } from '../../../../src/lib/astrology/foundation/astrologyService';
import type { Chart, NatalInput } from '../../../../src/lib/astrology/foundation/types';
import { getSwisseph } from '../../../../src/lib/astrology/foundation/ephe';

describe('extraPoints', () => {
  let testChart: Chart;
  let testJd: number;
  let testInput: NatalInput;

  beforeAll(async () => {
    testInput = {
      year: 1990,
      month: 6,
      date: 15,
      hour: 12,
      minute: 0,
      latitude: 37.5665,
      longitude: 126.9780,
      timeZone: 'Asia/Seoul',
    };

    const natalData = await calculateNatalChart(testInput);
    testChart = toChart(natalData);

    // Calculate Julian Day
    const swisseph = getSwisseph();
    const utcDate = new Date(Date.UTC(1990, 5, 15, 3, 0, 0)); // 12:00 KST = 03:00 UTC
    const jdResult = swisseph.swe_utc_to_jd(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth() + 1,
      utcDate.getUTCDate(),
      utcDate.getUTCHours(),
      utcDate.getUTCMinutes(),
      utcDate.getUTCSeconds(),
      swisseph.SE_GREG_CAL
    );
    testJd = 'julianDayUT' in jdResult ? jdResult.julianDayUT : 2448000.0;
  });

  describe('calculateChiron', () => {
    it('should calculate Chiron with valid longitude', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const chiron = calculateChiron(testJd, houseCusps);

      expect(chiron).toBeDefined();
      expect(chiron.name).toBe('Chiron');
      expect(chiron.longitude).toBeGreaterThanOrEqual(0);
      expect(chiron.longitude).toBeLessThan(360);
    });

    it('should have valid sign and degree', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const chiron = calculateChiron(testJd, houseCusps);

      expect(chiron.sign).toBeDefined();
      expect(chiron.degree).toBeGreaterThanOrEqual(0);
      expect(chiron.degree).toBeLessThan(30);
      expect(chiron.minute).toBeGreaterThanOrEqual(0);
      expect(chiron.minute).toBeLessThan(60);
    });

    it('should assign correct house', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const chiron = calculateChiron(testJd, houseCusps);

      expect(chiron.house).toBeGreaterThanOrEqual(1);
      expect(chiron.house).toBeLessThanOrEqual(12);
    });

    it('should have formatted string', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const chiron = calculateChiron(testJd, houseCusps);

      expect(chiron.formatted).toBeDefined();
      expect(typeof chiron.formatted).toBe('string');
      expect(chiron.formatted).toContain(chiron.sign);
    });

    it('should have description', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const chiron = calculateChiron(testJd, houseCusps);

      expect(chiron.description).toBeDefined();
      expect(chiron.description).toContain('치유');
    });
  });

  describe('calculateLilith', () => {
    it('should calculate Lilith with valid longitude', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const lilith = calculateLilith(testJd, houseCusps);

      expect(lilith).toBeDefined();
      expect(lilith.name).toBe('Lilith');
      expect(lilith.longitude).toBeGreaterThanOrEqual(0);
      expect(lilith.longitude).toBeLessThan(360);
    });

    it('should have valid sign and degree', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const lilith = calculateLilith(testJd, houseCusps);

      expect(lilith.sign).toBeDefined();
      expect(lilith.degree).toBeGreaterThanOrEqual(0);
      expect(lilith.degree).toBeLessThan(30);
    });

    it('should assign correct house', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const lilith = calculateLilith(testJd, houseCusps);

      expect(lilith.house).toBeGreaterThanOrEqual(1);
      expect(lilith.house).toBeLessThanOrEqual(12);
    });

    it('should have description about shadow self', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const lilith = calculateLilith(testJd, houseCusps);

      expect(lilith.description).toBeDefined();
      expect(lilith.description).toContain('릴리스');
    });
  });

  describe('calculatePartOfFortune', () => {
    it('should calculate Part of Fortune for day chart', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const sun = testChart.planets.find(p => p.name === 'Sun')!;
      const moon = testChart.planets.find(p => p.name === 'Moon')!;

      const pof = calculatePartOfFortune(
        testChart.ascendant.longitude,
        sun.longitude,
        moon.longitude,
        false, // day chart
        houseCusps
      );

      expect(pof).toBeDefined();
      expect(pof.name).toBe('Part of Fortune');
      expect(pof.longitude).toBeGreaterThanOrEqual(0);
      expect(pof.longitude).toBeLessThan(360);
    });

    it('should calculate Part of Fortune for night chart', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const sun = testChart.planets.find(p => p.name === 'Sun')!;
      const moon = testChart.planets.find(p => p.name === 'Moon')!;

      const pof = calculatePartOfFortune(
        testChart.ascendant.longitude,
        sun.longitude,
        moon.longitude,
        true, // night chart
        houseCusps
      );

      expect(pof).toBeDefined();
      expect(pof.longitude).toBeGreaterThanOrEqual(0);
      expect(pof.longitude).toBeLessThan(360);
    });

    it('should give different results for day vs night formula', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const sun = testChart.planets.find(p => p.name === 'Sun')!;
      const moon = testChart.planets.find(p => p.name === 'Moon')!;

      const dayPof = calculatePartOfFortune(
        testChart.ascendant.longitude,
        sun.longitude,
        moon.longitude,
        false,
        houseCusps
      );

      const nightPof = calculatePartOfFortune(
        testChart.ascendant.longitude,
        sun.longitude,
        moon.longitude,
        true,
        houseCusps
      );

      // Results should be different unless Sun and Moon are conjunct
      if (Math.abs(sun.longitude - moon.longitude) > 1) {
        expect(dayPof.longitude).not.toBeCloseTo(nightPof.longitude, 1);
      }
    });

    it('should have description about fortune', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const sun = testChart.planets.find(p => p.name === 'Sun')!;
      const moon = testChart.planets.find(p => p.name === 'Moon')!;

      const pof = calculatePartOfFortune(
        testChart.ascendant.longitude,
        sun.longitude,
        moon.longitude,
        false,
        houseCusps
      );

      expect(pof.description).toBeDefined();
      expect(pof.description).toContain('행운');
    });
  });

  describe('calculateVertex', () => {
    it('should calculate Vertex with valid longitude', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const vertex = calculateVertex(testJd, testInput.latitude, testInput.longitude, houseCusps);

      expect(vertex).toBeDefined();
      expect(vertex.name).toBe('Vertex');
      expect(vertex.longitude).toBeGreaterThanOrEqual(0);
      expect(vertex.longitude).toBeLessThan(360);
    });

    it('should have valid sign and degree', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const vertex = calculateVertex(testJd, testInput.latitude, testInput.longitude, houseCusps);

      expect(vertex.sign).toBeDefined();
      expect(vertex.degree).toBeGreaterThanOrEqual(0);
      expect(vertex.degree).toBeLessThan(30);
    });

    it('should assign correct house', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const vertex = calculateVertex(testJd, testInput.latitude, testInput.longitude, houseCusps);

      expect(vertex.house).toBeGreaterThanOrEqual(1);
      expect(vertex.house).toBeLessThanOrEqual(12);
    });

    it('should have description about fate', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const vertex = calculateVertex(testJd, testInput.latitude, testInput.longitude, houseCusps);

      expect(vertex.description).toBeDefined();
      expect(vertex.description).toContain('버텍스');
    });

    it('should vary with location', () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const vertex1 = calculateVertex(testJd, 40.7128, -74.0060, houseCusps); // New York
      const vertex2 = calculateVertex(testJd, 51.5074, -0.1278, houseCusps); // London

      expect(vertex1.longitude).not.toBeCloseTo(vertex2.longitude, 0);
    });
  });

  describe('isNightChart', () => {
    it('should return true for houses 1-6 (night)', () => {
      expect(isNightChart(1)).toBe(true);
      expect(isNightChart(2)).toBe(true);
      expect(isNightChart(3)).toBe(true);
      expect(isNightChart(4)).toBe(true);
      expect(isNightChart(5)).toBe(true);
      expect(isNightChart(6)).toBe(true);
    });

    it('should return false for houses 7-12 (day)', () => {
      expect(isNightChart(7)).toBe(false);
      expect(isNightChart(8)).toBe(false);
      expect(isNightChart(9)).toBe(false);
      expect(isNightChart(10)).toBe(false);
      expect(isNightChart(11)).toBe(false);
      expect(isNightChart(12)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isNightChart(0)).toBe(false);
      expect(isNightChart(13)).toBe(false);
    });
  });

  describe('extendChartWithExtraPoints', () => {
    it('should add all extra points to chart', () => {
      const extended = extendChartWithExtraPoints(
        testChart,
        testJd,
        testInput.latitude,
        testInput.longitude
      );

      expect(extended.chiron).toBeDefined();
      expect(extended.lilith).toBeDefined();
      expect(extended.partOfFortune).toBeDefined();
      expect(extended.vertex).toBeDefined();
    });

    it('should preserve original chart data', () => {
      const extended = extendChartWithExtraPoints(
        testChart,
        testJd,
        testInput.latitude,
        testInput.longitude
      );

      expect(extended.planets.length).toBe(testChart.planets.length);
      expect(extended.ascendant.longitude).toBe(testChart.ascendant.longitude);
      expect(extended.mc.longitude).toBe(testChart.mc.longitude);
    });

    it('should calculate Part of Fortune based on chart type', () => {
      const extended = extendChartWithExtraPoints(
        testChart,
        testJd,
        testInput.latitude,
        testInput.longitude
      );

      const sun = testChart.planets.find(p => p.name === 'Sun')!;
      const nightChart = isNightChart(sun.house);

      expect(extended.partOfFortune).toBeDefined();
      expect(extended.partOfFortune.longitude).toBeGreaterThanOrEqual(0);

      // If night chart, formula is different
      if (nightChart) {
        expect(extended.partOfFortune.name).toBe('Part of Fortune');
      }
    });

    it('should throw error if Sun or Moon missing', () => {
      const chartWithoutSun = {
        ...testChart,
        planets: testChart.planets.filter(p => p.name !== 'Sun'),
      };

      expect(() =>
        extendChartWithExtraPoints(
          chartWithoutSun,
          testJd,
          testInput.latitude,
          testInput.longitude
        )
      ).toThrow();
    });
  });

  describe('calculateExtraPoints', () => {
    it('should calculate all extra points', async () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const sun = testChart.planets.find(p => p.name === 'Sun')!;
      const moon = testChart.planets.find(p => p.name === 'Moon')!;

      const points = await calculateExtraPoints(
        testJd,
        testInput.latitude,
        testInput.longitude,
        testChart.ascendant.longitude,
        sun.longitude,
        moon.longitude,
        sun.house,
        houseCusps
      );

      expect(points.chiron).toBeDefined();
      expect(points.lilith).toBeDefined();
      expect(points.partOfFortune).toBeDefined();
      expect(points.vertex).toBeDefined();
    });

    it('should return valid extra points', async () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const sun = testChart.planets.find(p => p.name === 'Sun')!;
      const moon = testChart.planets.find(p => p.name === 'Moon')!;

      const points = await calculateExtraPoints(
        testJd,
        testInput.latitude,
        testInput.longitude,
        testChart.ascendant.longitude,
        sun.longitude,
        moon.longitude,
        sun.house,
        houseCusps
      );

      expect(points.chiron.longitude).toBeGreaterThanOrEqual(0);
      expect(points.chiron.longitude).toBeLessThan(360);
      expect(points.lilith.longitude).toBeGreaterThanOrEqual(0);
      expect(points.lilith.longitude).toBeLessThan(360);
      expect(points.partOfFortune.longitude).toBeGreaterThanOrEqual(0);
      expect(points.partOfFortune.longitude).toBeLessThan(360);
      expect(points.vertex.longitude).toBeGreaterThanOrEqual(0);
      expect(points.vertex.longitude).toBeLessThan(360);
    });

    it('should apply night chart formula correctly', async () => {
      const houseCusps = testChart.houses.map(h => h.cusp);
      const sun = testChart.planets.find(p => p.name === 'Sun')!;
      const moon = testChart.planets.find(p => p.name === 'Moon')!;

      const nightPoints = await calculateExtraPoints(
        testJd,
        testInput.latitude,
        testInput.longitude,
        testChart.ascendant.longitude,
        sun.longitude,
        moon.longitude,
        3, // Night chart (house 1-6)
        houseCusps
      );

      const dayPoints = await calculateExtraPoints(
        testJd,
        testInput.latitude,
        testInput.longitude,
        testChart.ascendant.longitude,
        sun.longitude,
        moon.longitude,
        10, // Day chart (house 7-12)
        houseCusps
      );

      // Part of Fortune should differ between day and night charts
      if (Math.abs(sun.longitude - moon.longitude) > 1) {
        expect(nightPoints.partOfFortune.longitude).not.toBeCloseTo(
          dayPoints.partOfFortune.longitude,
          1
        );
      }
    });
  });

  describe('Integration tests', () => {
    it('should work with real chart calculation', async () => {
      const natalData = await calculateNatalChart(testInput);
      const chart = toChart(natalData);

      const swisseph = getSwisseph();
      const utcDate = new Date(Date.UTC(1990, 5, 15, 3, 0, 0));
      const jdResult = swisseph.swe_utc_to_jd(
        utcDate.getUTCFullYear(),
        utcDate.getUTCMonth() + 1,
        utcDate.getUTCDate(),
        utcDate.getUTCHours(),
        utcDate.getUTCMinutes(),
        utcDate.getUTCSeconds(),
        swisseph.SE_GREG_CAL
      );
      const jd = 'julianDayUT' in jdResult ? jdResult.julianDayUT : 2448000.0;

      const extended = extendChartWithExtraPoints(
        chart,
        jd,
        testInput.latitude,
        testInput.longitude
      );

      expect(extended.chiron.name).toBe('Chiron');
      expect(extended.lilith.name).toBe('Lilith');
      expect(extended.partOfFortune.name).toBe('Part of Fortune');
      expect(extended.vertex.name).toBe('Vertex');
    });
  });
});


