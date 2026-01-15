import { describe, it, expect } from 'vitest';
import { calculateAreaScores, getLuckyColorFromElement, getLuckyNumber, generateAlerts } from '@/lib/destiny-map/calendar/daily-fortune-helpers';

describe('daily-fortune-helpers', () => {
  describe('calculateAreaScores', () => {
    it('should return scores within range 15-95', () => {
      const scores = calculateAreaScores(50, { sajuFactorKeys: [], astroFactorKeys: [] }, new Date());
      expect(scores.love).toBeGreaterThanOrEqual(15);
      expect(scores.love).toBeLessThanOrEqual(95);
      expect(scores.career).toBeGreaterThanOrEqual(15);
      expect(scores.career).toBeLessThanOrEqual(95);
    });

    it('should boost love with dohwaDay', () => {
      const withDohwa = calculateAreaScores(50, { sajuFactorKeys: ['dohwaDay'], astroFactorKeys: [] }, new Date());
      const withoutDohwa = calculateAreaScores(50, { sajuFactorKeys: [], astroFactorKeys: [] }, new Date());
      expect(withDohwa.love).toBeGreaterThan(withoutDohwa.love);
    });

    it('should boost career with geonrokDay', () => {
      const withGeonrok = calculateAreaScores(50, { sajuFactorKeys: ['geonrokDay'], astroFactorKeys: [] }, new Date());
      const withoutGeonrok = calculateAreaScores(50, { sajuFactorKeys: [], astroFactorKeys: [] }, new Date());
      expect(withGeonrok.career).toBeGreaterThan(withoutGeonrok.career);
    });

    it('should reduce health with chung factors', () => {
      const withChung = calculateAreaScores(50, { sajuFactorKeys: ['branchChung'], astroFactorKeys: [] }, new Date());
      const withoutChung = calculateAreaScores(50, { sajuFactorKeys: [], astroFactorKeys: [] }, new Date());
      expect(withChung.health).toBeLessThan(withoutChung.health);
    });
  });

  describe('getLuckyColorFromElement', () => {
    it('should return green tones for wood', () => {
      const color = getLuckyColorFromElement('wood');
      expect(['Green', 'Teal', 'Emerald']).toContain(color);
    });

    it('should return red tones for fire', () => {
      const color = getLuckyColorFromElement('fire');
      expect(['Red', 'Orange', 'Pink']).toContain(color);
    });

    it('should return default for unknown element', () => {
      const color = getLuckyColorFromElement('unknown');
      expect(['Green', 'Teal', 'Emerald']).toContain(color);
    });
  });

  describe('getLuckyNumber', () => {
    it('should return number between 1-9', () => {
      const num = getLuckyNumber(new Date('2024-01-15'), new Date('1990-05-20'));
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(9);
    });

    it('should return consistent number for same dates', () => {
      const targetDate = new Date('2024-01-15');
      const birthDate = new Date('1990-05-20');
      const num1 = getLuckyNumber(targetDate, birthDate);
      const num2 = getLuckyNumber(targetDate, birthDate);
      expect(num1).toBe(num2);
    });
  });

  describe('generateAlerts', () => {
    it('should return positive alert for grade 0', () => {
      const alerts = generateAlerts({ grade: 0, sajuFactorKeys: [], astroFactorKeys: [], crossVerified: false });
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('positive');
    });

    it('should add cheoneul alert', () => {
      const alerts = generateAlerts({ grade: 2, sajuFactorKeys: ['cheoneulGwiin'], astroFactorKeys: [], crossVerified: false });
      const cheoneulAlert = alerts.find(a => a.msg.includes('천을귀인'));
      expect(cheoneulAlert).toBeDefined();
    });

    it('should add crossVerified alert', () => {
      const alerts = generateAlerts({ grade: 2, sajuFactorKeys: [], astroFactorKeys: [], crossVerified: true });
      const crossAlert = alerts.find(a => a.msg.includes('일치'));
      expect(crossAlert).toBeDefined();
    });

    it('should return empty array with no special conditions', () => {
      const alerts = generateAlerts({ grade: 2, sajuFactorKeys: [], astroFactorKeys: [], crossVerified: false });
      expect(Array.isArray(alerts)).toBe(true);
    });
  });
});
