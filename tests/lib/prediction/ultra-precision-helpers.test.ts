import { describe, it, expect } from 'vitest';
import {
  getStemElement,
  getPlanetaryHourPlanet,
} from '@/lib/prediction/ultra-precision-helpers';

describe('ultra-precision-helpers', () => {
  describe('getStemElement', () => {
    it('should return 목 for 甲 (wood)', () => {
      expect(getStemElement('甲')).toBe('목');
    });

    it('should return 목 for 乙 (wood)', () => {
      expect(getStemElement('乙')).toBe('목');
    });

    it('should return 화 for 丙 (fire)', () => {
      expect(getStemElement('丙')).toBe('화');
    });

    it('should return 화 for 丁 (fire)', () => {
      expect(getStemElement('丁')).toBe('화');
    });

    it('should return 토 for 戊 (earth)', () => {
      expect(getStemElement('戊')).toBe('토');
    });

    it('should return 토 for 己 (earth)', () => {
      expect(getStemElement('己')).toBe('토');
    });

    it('should return 금 for 庚 (metal)', () => {
      expect(getStemElement('庚')).toBe('금');
    });

    it('should return 금 for 辛 (metal)', () => {
      expect(getStemElement('辛')).toBe('금');
    });

    it('should return 수 for 壬 (water)', () => {
      expect(getStemElement('壬')).toBe('수');
    });

    it('should return 수 for 癸 (water)', () => {
      expect(getStemElement('癸')).toBe('수');
    });

    it('should return 토 as default for unknown stem', () => {
      expect(getStemElement('X')).toBe('토');
      expect(getStemElement('')).toBe('토');
      expect(getStemElement('Unknown')).toBe('토');
    });

    it('should handle all 10 heavenly stems', () => {
      const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
      const expectedElements = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];

      stems.forEach((stem, index) => {
        expect(getStemElement(stem)).toBe(expectedElements[index]);
      });
    });

    it('should map stems to elements correctly', () => {
      // Wood stems
      expect(getStemElement('甲')).toBe('목');
      expect(getStemElement('乙')).toBe('목');

      // Fire stems
      expect(getStemElement('丙')).toBe('화');
      expect(getStemElement('丁')).toBe('화');

      // Earth stems
      expect(getStemElement('戊')).toBe('토');
      expect(getStemElement('己')).toBe('토');

      // Metal stems
      expect(getStemElement('庚')).toBe('금');
      expect(getStemElement('辛')).toBe('금');

      // Water stems
      expect(getStemElement('壬')).toBe('수');
      expect(getStemElement('癸')).toBe('수');
    });
  });

  describe('getPlanetaryHourPlanet', () => {
    it('should return Sun for Sunday (day 0)', () => {
      // Create a Sunday date
      const sunday = new Date('2026-02-01T12:00:00'); // Feb 1, 2026 is Sunday
      expect(getPlanetaryHourPlanet(sunday)).toBe('Sun');
    });

    it('should return Moon for Monday (day 1)', () => {
      const monday = new Date('2026-02-02T12:00:00'); // Feb 2, 2026 is Monday
      expect(getPlanetaryHourPlanet(monday)).toBe('Moon');
    });

    it('should return Mars for Tuesday (day 2)', () => {
      const tuesday = new Date('2026-02-03T12:00:00'); // Feb 3, 2026 is Tuesday
      expect(getPlanetaryHourPlanet(tuesday)).toBe('Mars');
    });

    it('should return Mercury for Wednesday (day 3)', () => {
      const wednesday = new Date('2026-02-04T12:00:00'); // Feb 4, 2026 is Wednesday
      expect(getPlanetaryHourPlanet(wednesday)).toBe('Mercury');
    });

    it('should return Jupiter for Thursday (day 4)', () => {
      const thursday = new Date('2026-02-05T12:00:00'); // Feb 5, 2026 is Thursday
      expect(getPlanetaryHourPlanet(thursday)).toBe('Jupiter');
    });

    it('should return Venus for Friday (day 5)', () => {
      const friday = new Date('2026-02-06T12:00:00'); // Feb 6, 2026 is Friday
      expect(getPlanetaryHourPlanet(friday)).toBe('Venus');
    });

    it('should return Saturn for Saturday (day 6)', () => {
      const saturday = new Date('2026-02-07T12:00:00'); // Feb 7, 2026 is Saturday
      expect(getPlanetaryHourPlanet(saturday)).toBe('Saturn');
    });

    it('should work for different times on same day', () => {
      const morning = new Date('2026-02-01T08:00:00'); // Sunday morning
      const afternoon = new Date('2026-02-01T14:00:00'); // Sunday afternoon
      const night = new Date('2026-02-01T22:00:00'); // Sunday night

      expect(getPlanetaryHourPlanet(morning)).toBe('Sun');
      expect(getPlanetaryHourPlanet(afternoon)).toBe('Sun');
      expect(getPlanetaryHourPlanet(night)).toBe('Sun');
    });

    it('should return consistent planet for same weekday in different weeks', () => {
      const sunday1 = new Date('2026-02-01T12:00:00');
      const sunday2 = new Date('2026-02-08T12:00:00');
      const sunday3 = new Date('2026-02-15T12:00:00');

      expect(getPlanetaryHourPlanet(sunday1)).toBe('Sun');
      expect(getPlanetaryHourPlanet(sunday2)).toBe('Sun');
      expect(getPlanetaryHourPlanet(sunday3)).toBe('Sun');
    });

    it('should map all 7 days correctly', () => {
      const dates = [
        new Date('2026-02-01'), // Sunday
        new Date('2026-02-02'), // Monday
        new Date('2026-02-03'), // Tuesday
        new Date('2026-02-04'), // Wednesday
        new Date('2026-02-05'), // Thursday
        new Date('2026-02-06'), // Friday
        new Date('2026-02-07'), // Saturday
      ];

      const expectedPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

      dates.forEach((date, index) => {
        expect(getPlanetaryHourPlanet(date)).toBe(expectedPlanets[index]);
      });
    });
  });

  describe('integration tests', () => {
    it('should map all stems to 5 elements', () => {
      const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
      const elements = stems.map(getStemElement);
      const uniqueElements = new Set(elements);

      // Should have exactly 5 unique elements
      expect(uniqueElements.size).toBe(5);
      expect(uniqueElements.has('목')).toBe(true);
      expect(uniqueElements.has('화')).toBe(true);
      expect(uniqueElements.has('토')).toBe(true);
      expect(uniqueElements.has('금')).toBe(true);
      expect(uniqueElements.has('수')).toBe(true);
    });

    it('should distribute stems evenly across elements', () => {
      const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
      const elementCounts: Record<string, number> = {};

      stems.forEach(stem => {
        const element = getStemElement(stem);
        elementCounts[element] = (elementCounts[element] || 0) + 1;
      });

      // Each element should have exactly 2 stems
      expect(elementCounts['목']).toBe(2);
      expect(elementCounts['화']).toBe(2);
      expect(elementCounts['토']).toBe(2);
      expect(elementCounts['금']).toBe(2);
      expect(elementCounts['수']).toBe(2);
    });

    it('should map all weekdays to 7 planets', () => {
      const baseSunday = new Date('2026-02-01'); // Known Sunday
      const planets = new Set<string>();

      for (let i = 0; i < 7; i++) {
        const date = new Date(baseSunday);
        date.setDate(date.getDate() + i);
        const planet = getPlanetaryHourPlanet(date);
        planets.add(planet);
      }

      expect(planets.size).toBe(7);
      expect(planets.has('Sun')).toBe(true);
      expect(planets.has('Moon')).toBe(true);
      expect(planets.has('Mars')).toBe(true);
      expect(planets.has('Mercury')).toBe(true);
      expect(planets.has('Jupiter')).toBe(true);
      expect(planets.has('Venus')).toBe(true);
      expect(planets.has('Saturn')).toBe(true);
    });
  });
});
