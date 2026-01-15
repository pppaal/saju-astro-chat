// tests/lib/iChing/ichingNumerology.test.ts
import { describe, it, expect } from 'vitest';
import {
  castMeihuaByTime,
  castMeihuaByNumbers,
  calculateBirthHexagram,
  calculateTimeHexagram,
  calculateYearlyFortune,
  analyzeDirectionalFortune,
  castHexagramByNumbers,
  type MeihuaReading,
  type BirthHexagram,
  type TimeHexagram,
} from '@/lib/iChing/ichingNumerology';

describe('ichingNumerology', () => {
  describe('castMeihuaByTime', () => {
    it('should return a valid MeihuaReading structure', () => {
      const reading = castMeihuaByTime(new Date('2024-06-15T10:30:00'));

      expect(reading).toBeDefined();
      expect(reading.상괘Number).toBeGreaterThanOrEqual(1);
      expect(reading.상괘Number).toBeLessThanOrEqual(8);
      expect(reading.하괘Number).toBeGreaterThanOrEqual(1);
      expect(reading.하괘Number).toBeLessThanOrEqual(8);
      expect(reading.변효).toBeGreaterThanOrEqual(1);
      expect(reading.변효).toBeLessThanOrEqual(6);
    });

    it('should return valid binary strings for hexagrams', () => {
      const reading = castMeihuaByTime(new Date('2024-06-15T10:30:00'));

      expect(reading.본괘Binary).toMatch(/^[01]{6}$/);
      expect(reading.지괘Binary).toMatch(/^[01]{6}$/);
      expect(reading.호괘Binary).toMatch(/^[01]{6}$/);
    });

    it('should include interpretation and timing', () => {
      const reading = castMeihuaByTime(new Date('2024-06-15T10:30:00'));

      expect(reading.interpretation).toBeDefined();
      expect(reading.timing).toBeDefined();
      expect(typeof reading.interpretation).toBe('string');
      expect(typeof reading.timing).toBe('string');
    });

    it('should use current time if no date provided', () => {
      const reading = castMeihuaByTime();

      expect(reading).toBeDefined();
      expect(reading.상괘Number).toBeGreaterThanOrEqual(1);
    });

    it('should produce consistent results for same input', () => {
      const date = new Date('2024-01-01T12:00:00');
      const reading1 = castMeihuaByTime(date);
      const reading2 = castMeihuaByTime(date);

      expect(reading1.상괘Number).toBe(reading2.상괘Number);
      expect(reading1.하괘Number).toBe(reading2.하괘Number);
      expect(reading1.변효).toBe(reading2.변효);
    });

    it('should produce different results for different times', () => {
      const reading1 = castMeihuaByTime(new Date('2024-01-01T08:00:00'));
      const reading2 = castMeihuaByTime(new Date('2024-06-15T18:00:00'));

      const isDifferent =
        reading1.상괘Number !== reading2.상괘Number ||
        reading1.하괘Number !== reading2.하괘Number ||
        reading1.변효 !== reading2.변효;

      expect(isDifferent).toBe(true);
    });
  });

  describe('castMeihuaByNumbers', () => {
    it('should return valid MeihuaReading for two numbers', () => {
      const reading = castMeihuaByNumbers(5, 3);

      expect(reading).toBeDefined();
      expect(reading.상괘Number).toBeGreaterThanOrEqual(1);
      expect(reading.상괘Number).toBeLessThanOrEqual(8);
    });

    it('should handle numbers greater than 8', () => {
      const reading = castMeihuaByNumbers(15, 23);

      expect(reading.상괘Number).toBeGreaterThanOrEqual(1);
      expect(reading.상괘Number).toBeLessThanOrEqual(8);
    });

    it('should produce consistent results', () => {
      const reading1 = castMeihuaByNumbers(7, 4);
      const reading2 = castMeihuaByNumbers(7, 4);

      expect(reading1.상괘Number).toBe(reading2.상괘Number);
      expect(reading1.하괘Number).toBe(reading2.하괘Number);
    });

    it('should include all required fields', () => {
      const reading = castMeihuaByNumbers(3, 6);

      expect(reading.본괘Binary).toBeDefined();
      expect(reading.지괘Binary).toBeDefined();
      expect(reading.호괘Binary).toBeDefined();
      expect(reading.체괘).toBeDefined();
      expect(reading.용괘).toBeDefined();
    });
  });

  describe('calculateBirthHexagram', () => {
    it('should return valid BirthHexagram structure', () => {
      const result = calculateBirthHexagram(1990, 5, 15);

      expect(result).toBeDefined();
      expect(result.선천괘).toBeDefined();
      expect(result.후천괘).toBeDefined();
      expect(result.본명괘).toBeDefined();
    });

    it('should have valid hexagram numbers (1-64)', () => {
      const result = calculateBirthHexagram(1985, 3, 20);

      expect(result.선천괘.number).toBeGreaterThanOrEqual(1);
      expect(result.선천괘.number).toBeLessThanOrEqual(64);
      expect(result.후천괘.number).toBeGreaterThanOrEqual(1);
      expect(result.후천괘.number).toBeLessThanOrEqual(64);
    });

    it('should have valid binary strings', () => {
      const result = calculateBirthHexagram(2000, 12, 25);

      expect(result.선천괘.binary).toMatch(/^[01]{6}$/);
      expect(result.후천괘.binary).toMatch(/^[01]{6}$/);
      expect(result.본명괘.binary).toMatch(/^[01]{6}$/);
    });

    it('should include life interpretations', () => {
      const result = calculateBirthHexagram(1990, 6, 15);

      expect(result.lifeTheme).toBeDefined();
      expect(result.coreChallenge).toBeDefined();
      expect(result.hiddenTalent).toBeDefined();
    });

    it('should be consistent for same birth date', () => {
      const result1 = calculateBirthHexagram(1988, 4, 12);
      const result2 = calculateBirthHexagram(1988, 4, 12);

      expect(result1.본명괘.number).toBe(result2.본명괘.number);
    });
  });

  describe('calculateTimeHexagram', () => {
    it('should return valid TimeHexagram structure', () => {
      const result = calculateTimeHexagram(new Date('2024-06-15T14:30:00'));

      expect(result).toBeDefined();
      expect(result.연괘).toBeDefined();
      expect(result.월괘).toBeDefined();
      expect(result.일괘).toBeDefined();
      expect(result.시괘).toBeDefined();
      expect(result.종합괘).toBeDefined();
    });

    it('should have valid composite hexagram', () => {
      const result = calculateTimeHexagram(new Date('2024-06-15T14:30:00'));

      expect(result.종합괘.number).toBeGreaterThanOrEqual(1);
      expect(result.종합괘.number).toBeLessThanOrEqual(64);
      expect(result.종합괘.binary).toMatch(/^[01]{6}$/);
    });

    it('should include currentEnergy and advice', () => {
      const result = calculateTimeHexagram(new Date('2024-06-15T14:30:00'));

      expect(result.currentEnergy).toBeDefined();
      expect(result.advice).toBeDefined();
    });

    it('should use current time if no date provided', () => {
      const result = calculateTimeHexagram();

      expect(result).toBeDefined();
      expect(result.종합괘).toBeDefined();
    });
  });

  describe('calculateYearlyFortune', () => {
    it('should return valid YearlyFortune structure', () => {
      const result = calculateYearlyFortune(1990, 5, 15, 2024);

      expect(result).toBeDefined();
      expect(result.year).toBe(2024);
      expect(result.hexagram).toBeDefined();
    });

    it('should have valid hexagram in fortune', () => {
      const result = calculateYearlyFortune(1985, 3, 20, 2024);

      expect(result.hexagram.number).toBeGreaterThanOrEqual(1);
      expect(result.hexagram.number).toBeLessThanOrEqual(64);
    });

    it('should include theme and advice', () => {
      const result = calculateYearlyFortune(1990, 6, 15, 2024);

      expect(result.theme).toBeDefined();
      expect(result.advice).toBeDefined();
    });

    it('should include opportunities and challenges arrays', () => {
      const result = calculateYearlyFortune(1990, 6, 15, 2024);

      expect(Array.isArray(result.opportunities)).toBe(true);
      expect(Array.isArray(result.challenges)).toBe(true);
    });
  });

  describe('analyzeDirectionalFortune', () => {
    it('should return array of DirectionalHexagram', () => {
      const result = analyzeDirectionalFortune(1990, 5, 15);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should cover all 8 directions', () => {
      const result = analyzeDirectionalFortune(1990, 5, 15);

      expect(result.length).toBe(8);
    });

    it('should have valid favorability levels', () => {
      const result = analyzeDirectionalFortune(1990, 5, 15);
      const validLevels = ['excellent', 'good', 'neutral', 'caution', 'avoid'];

      result.forEach((dir) => {
        expect(validLevels).toContain(dir.favorability);
      });
    });

    it('should include direction and element info', () => {
      const result = analyzeDirectionalFortune(1990, 5, 15);

      result.forEach((dir) => {
        expect(dir.direction).toBeDefined();
        expect(dir.trigram).toBeDefined();
        expect(dir.element).toBeDefined();
        expect(dir.explanation).toBeDefined();
      });
    });
  });

  describe('castHexagramByNumbers', () => {
    it('should return valid NumberHexagram for number array', () => {
      const result = castHexagramByNumbers([3, 7, 5]);

      expect(result).toBeDefined();
      expect(result.입력수).toEqual([3, 7, 5]);
    });

    it('should calculate valid trigram numbers', () => {
      const result = castHexagramByNumbers([1, 2, 3, 4]);

      expect(result.상괘).toBeGreaterThanOrEqual(1);
      expect(result.상괘).toBeLessThanOrEqual(8);
      expect(result.하괘).toBeGreaterThanOrEqual(1);
      expect(result.하괘).toBeLessThanOrEqual(8);
    });

    it('should calculate valid hexagram number', () => {
      const result = castHexagramByNumbers([6, 4, 9]);

      expect(result.hexagramNumber).toBeGreaterThanOrEqual(1);
      expect(result.hexagramNumber).toBeLessThanOrEqual(64);
      expect(result.hexagramBinary).toMatch(/^[01]{6}$/);
    });

    it('should include meaning', () => {
      const result = castHexagramByNumbers([2, 5, 8]);

      expect(result.meaning).toBeDefined();
      expect(typeof result.meaning).toBe('string');
    });

    it('should produce consistent results', () => {
      const result1 = castHexagramByNumbers([1, 2, 3]);
      const result2 = castHexagramByNumbers([1, 2, 3]);

      expect(result1.hexagramNumber).toBe(result2.hexagramNumber);
      expect(result1.변효).toBe(result2.변효);
    });

    it('should handle single number input', () => {
      const result = castHexagramByNumbers([7]);

      expect(result).toBeDefined();
      expect(result.hexagramNumber).toBeGreaterThanOrEqual(1);
    });

    it('should handle large numbers', () => {
      const result = castHexagramByNumbers([123, 456, 789]);

      expect(result.상괘).toBeGreaterThanOrEqual(1);
      expect(result.상괘).toBeLessThanOrEqual(8);
    });
  });

  describe('type exports', () => {
    it('should export MeihuaReading type with correct shape', () => {
      const reading: MeihuaReading = {
        상괘Number: 1,
        하괘Number: 2,
        변효: 3,
        본괘Binary: '111000',
        지괘Binary: '000111',
        호괘Binary: '101010',
        체괘: '건',
        용괘: '곤',
        interpretation: 'test',
        timing: 'test',
      };

      expect(reading).toBeDefined();
    });

    it('should export BirthHexagram type with correct shape', () => {
      const hexagram: BirthHexagram = {
        선천괘: { number: 1, binary: '111111', name: '건괘' },
        후천괘: { number: 2, binary: '000000', name: '곤괘' },
        본명괘: { number: 3, binary: '010001', name: '둔괘' },
        lifeTheme: 'test',
        coreChallenge: 'test',
        hiddenTalent: 'test',
      };

      expect(hexagram).toBeDefined();
    });

    it('should export TimeHexagram type with correct shape', () => {
      const hexagram: TimeHexagram = {
        연괘: { number: 1, name: '건' },
        월괘: { number: 2, name: '태' },
        일괘: { number: 3, name: '리' },
        시괘: { number: 4, name: '진' },
        종합괘: { number: 1, binary: '111111', name: '건괘' },
        변효: 3,
        currentEnergy: 'test',
        advice: 'test',
      };

      expect(hexagram).toBeDefined();
    });
  });
});
