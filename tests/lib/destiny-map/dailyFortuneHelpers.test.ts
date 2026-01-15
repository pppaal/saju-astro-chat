import { describe, it, expect } from 'vitest';
import {
  calculateAreaScores,
  getLuckyColorFromElement,
  getLuckyNumber,
  generateAlerts,
} from '@/lib/destiny-map/calendar/daily-fortune-helpers';

describe('daily-fortune-helpers', () => {
  describe('calculateAreaScores', () => {
    it('should calculate base scores from overall score', () => {
      const analysis = { sajuFactorKeys: [], astroFactorKeys: [] };
      const targetDate = new Date('2024-06-15');
      const scores = calculateAreaScores(70, analysis, targetDate);

      expect(scores.love).toBeGreaterThanOrEqual(15);
      expect(scores.love).toBeLessThanOrEqual(95);
      expect(scores.career).toBeGreaterThanOrEqual(15);
      expect(scores.career).toBeLessThanOrEqual(95);
      expect(scores.wealth).toBeGreaterThanOrEqual(15);
      expect(scores.wealth).toBeLessThanOrEqual(95);
      expect(scores.health).toBeGreaterThanOrEqual(15);
      expect(scores.health).toBeLessThanOrEqual(95);
    });

    it('should boost love score for dohwaDay', () => {
      const analysisWithDohwa = { sajuFactorKeys: ['dohwaDay'], astroFactorKeys: [] };
      const analysisWithout = { sajuFactorKeys: [], astroFactorKeys: [] };
      const targetDate = new Date('2024-06-15');

      const withDohwa = calculateAreaScores(50, analysisWithDohwa, targetDate);
      const without = calculateAreaScores(50, analysisWithout, targetDate);

      expect(withDohwa.love).toBeGreaterThan(without.love);
    });

    it('should boost career score for geonrokDay', () => {
      const analysisWithGeonrok = { sajuFactorKeys: ['geonrokDay'], astroFactorKeys: [] };
      const analysisWithout = { sajuFactorKeys: [], astroFactorKeys: [] };
      const targetDate = new Date('2024-06-15');

      const withGeonrok = calculateAreaScores(50, analysisWithGeonrok, targetDate);
      const without = calculateAreaScores(50, analysisWithout, targetDate);

      expect(withGeonrok.career).toBeGreaterThan(without.career);
    });

    it('should reduce health score for branchChung', () => {
      const analysisWithChung = { sajuFactorKeys: ['branchChung'], astroFactorKeys: [] };
      const analysisWithout = { sajuFactorKeys: [], astroFactorKeys: [] };
      const targetDate = new Date('2024-06-15');

      const withChung = calculateAreaScores(50, analysisWithChung, targetDate);
      const without = calculateAreaScores(50, analysisWithout, targetDate);

      expect(withChung.health).toBeLessThan(without.health);
    });

    it('should boost love score for venusTrine', () => {
      const analysisWithVenus = { sajuFactorKeys: [], astroFactorKeys: ['venusTrine'] };
      const analysisWithout = { sajuFactorKeys: [], astroFactorKeys: [] };
      const targetDate = new Date('2024-06-15');

      const withVenus = calculateAreaScores(50, analysisWithVenus, targetDate);
      const without = calculateAreaScores(50, analysisWithout, targetDate);

      expect(withVenus.love).toBeGreaterThan(without.love);
    });

    it('should boost career/wealth for jupiterTrine', () => {
      const analysisWithJupiter = { sajuFactorKeys: [], astroFactorKeys: ['jupiterTrine'] };
      const analysisWithout = { sajuFactorKeys: [], astroFactorKeys: [] };
      const targetDate = new Date('2024-06-15');

      const withJupiter = calculateAreaScores(50, analysisWithJupiter, targetDate);
      const without = calculateAreaScores(50, analysisWithout, targetDate);

      expect(withJupiter.career).toBeGreaterThan(without.career);
      expect(withJupiter.wealth).toBeGreaterThan(without.wealth);
    });

    it('should return rounded integer scores', () => {
      const analysis = { sajuFactorKeys: [], astroFactorKeys: [] };
      const targetDate = new Date('2024-06-15');
      const scores = calculateAreaScores(55, analysis, targetDate);

      expect(Number.isInteger(scores.love)).toBe(true);
      expect(Number.isInteger(scores.career)).toBe(true);
      expect(Number.isInteger(scores.wealth)).toBe(true);
      expect(Number.isInteger(scores.health)).toBe(true);
    });
  });

  describe('getLuckyColorFromElement', () => {
    it('should return green colors for wood element', () => {
      const color = getLuckyColorFromElement('wood');
      expect(['Green', 'Teal', 'Emerald']).toContain(color);
    });

    it('should return red colors for fire element', () => {
      const color = getLuckyColorFromElement('fire');
      expect(['Red', 'Orange', 'Pink']).toContain(color);
    });

    it('should return yellow colors for earth element', () => {
      const color = getLuckyColorFromElement('earth');
      expect(['Yellow', 'Brown', 'Beige']).toContain(color);
    });

    it('should return white colors for metal element', () => {
      const color = getLuckyColorFromElement('metal');
      expect(['White', 'Silver', 'Gold']).toContain(color);
    });

    it('should return blue colors for water element', () => {
      const color = getLuckyColorFromElement('water');
      expect(['Blue', 'Black', 'Navy']).toContain(color);
    });

    it('should default to wood colors for unknown element', () => {
      const color = getLuckyColorFromElement('unknown');
      expect(['Green', 'Teal', 'Emerald']).toContain(color);
    });
  });

  describe('getLuckyNumber', () => {
    it('should return number between 1 and 9', () => {
      const targetDate = new Date('2024-06-15');
      const birthDate = new Date('1990-05-20');
      const num = getLuckyNumber(targetDate, birthDate);

      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(9);
    });

    it('should return consistent results for same inputs', () => {
      const targetDate = new Date('2024-06-15');
      const birthDate = new Date('1990-05-20');

      const num1 = getLuckyNumber(targetDate, birthDate);
      const num2 = getLuckyNumber(targetDate, birthDate);

      expect(num1).toBe(num2);
    });

    it('should return different numbers for different dates', () => {
      const birthDate = new Date('1990-05-20');
      const results = new Set<number>();

      // Test multiple days
      for (let i = 1; i <= 9; i++) {
        const targetDate = new Date(`2024-06-${i.toString().padStart(2, '0')}`);
        results.add(getLuckyNumber(targetDate, birthDate));
      }

      // Should have some variety
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('generateAlerts', () => {
    it('should generate positive alert for grade 0', () => {
      const analysis = {
        grade: 0,
        sajuFactorKeys: [],
        astroFactorKeys: [],
        crossVerified: false,
      };
      const alerts = generateAlerts(analysis);

      const positiveAlert = alerts.find(a => a.type === 'positive');
      expect(positiveAlert).toBeDefined();
      expect(positiveAlert?.msg).toContain('천운');
    });

    it('should generate positive alert for grade 1', () => {
      const analysis = {
        grade: 1,
        sajuFactorKeys: [],
        astroFactorKeys: [],
        crossVerified: false,
      };
      const alerts = generateAlerts(analysis);

      const positiveAlert = alerts.find(a => a.type === 'positive');
      expect(positiveAlert).toBeDefined();
    });

    it('should generate warning alert for grade 4', () => {
      const analysis = {
        grade: 4,
        sajuFactorKeys: [],
        astroFactorKeys: [],
        crossVerified: false,
      };
      const alerts = generateAlerts(analysis);

      const warningAlert = alerts.find(a => a.type === 'warning');
      expect(warningAlert).toBeDefined();
      expect(warningAlert?.msg).toContain('조심');
    });

    it('should generate alert for cheoneulGwiin', () => {
      const analysis = {
        grade: 2,
        sajuFactorKeys: ['cheoneulGwiin'],
        astroFactorKeys: [],
        crossVerified: false,
      };
      const alerts = generateAlerts(analysis);

      const gwiinAlert = alerts.find(a => a.msg.includes('천을귀인'));
      expect(gwiinAlert).toBeDefined();
    });

    it('should generate alert for dohwaDay', () => {
      const analysis = {
        grade: 2,
        sajuFactorKeys: ['dohwaDay'],
        astroFactorKeys: [],
        crossVerified: false,
      };
      const alerts = generateAlerts(analysis);

      const dohwaAlert = alerts.find(a => a.msg.includes('도화살'));
      expect(dohwaAlert).toBeDefined();
      expect(dohwaAlert?.type).toBe('info');
    });

    it('should generate warning for mercury retrograde', () => {
      const analysis = {
        grade: 2,
        sajuFactorKeys: [],
        astroFactorKeys: ['retrogradeMercury'],
        crossVerified: false,
      };
      const alerts = generateAlerts(analysis);

      const retroAlert = alerts.find(a => a.msg.includes('수성 역행'));
      expect(retroAlert).toBeDefined();
      expect(retroAlert?.type).toBe('warning');
    });

    it('should generate positive alert for cross verification', () => {
      const analysis = {
        grade: 2,
        sajuFactorKeys: [],
        astroFactorKeys: [],
        crossVerified: true,
      };
      const alerts = generateAlerts(analysis);

      const crossAlert = alerts.find(a => a.msg.includes('일치'));
      expect(crossAlert).toBeDefined();
      expect(crossAlert?.type).toBe('positive');
    });

    it('should return empty array for neutral analysis', () => {
      const analysis = {
        grade: 2,
        sajuFactorKeys: [],
        astroFactorKeys: [],
        crossVerified: false,
      };
      const alerts = generateAlerts(analysis);

      expect(alerts).toEqual([]);
    });
  });
});
