// tests/lib/destiny-map/calendar/calendar-helpers.test.ts
import { describe, it, expect } from 'vitest';

describe('Calendar Helpers Integration', () => {
  describe('scoring', () => {
    it('should export scoring functions', async () => {
      const { calculateDaeunScore, calculateSeunScore, calculateWolunScore, calculateIljinScore } = await import('@/lib/destiny-map/calendar/scoring');

      expect(typeof calculateDaeunScore).toBe('function');
      expect(typeof calculateSeunScore).toBe('function');
      expect(typeof calculateWolunScore).toBe('function');
      expect(typeof calculateIljinScore).toBe('function');
    });
  });

  describe('grading', () => {
    it('should export grading functions', async () => {
      const { calculateGrade, getCategoryScore } = await import('@/lib/destiny-map/calendar/grading-optimized');

      expect(typeof calculateGrade).toBe('function');
      expect(typeof getCategoryScore).toBe('function');
    });

    it('should calculate grade correctly', async () => {
      const { calculateGrade } = await import('@/lib/destiny-map/calendar/grading-optimized');

      expect(calculateGrade(80)).toBe(0); // Best
      expect(calculateGrade(70)).toBe(0); // Best (68+)
      expect(calculateGrade(55)).toBe(2); // Normal
      expect(calculateGrade(40)).toBe(3); // Bad (28-41)
      expect(calculateGrade(20)).toBe(4); // Worst
    });
  });

  describe('scoring-factory', () => {
    it('should export createScoreCalculator', async () => {
      const { createScoreCalculator } = await import('@/lib/destiny-map/calendar/scoring-factory');

      expect(typeof createScoreCalculator).toBe('function');
    });

    it('should create score calculators from config', async () => {
      const { createScoreCalculator } = await import('@/lib/destiny-map/calendar/scoring-factory');
      const { DAEUN_CONFIG } = await import('@/lib/destiny-map/calendar/scoring-factory-config');

      const calculator = createScoreCalculator(DAEUN_CONFIG);

      expect(typeof calculator).toBe('function');

      // Test with empty input
      const score = calculator({});
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('activity-scoring', () => {
    it('should export calculateActivityScore', async () => {
      const { calculateActivityScore } = await import('@/lib/destiny-map/calendar/activity-scoring');

      expect(typeof calculateActivityScore).toBe('function');
    });

    it('should calculate activity score', async () => {
      const { calculateActivityScore } = await import('@/lib/destiny-map/calendar/activity-scoring');

      const result = calculateActivityScore('wealth', {}, {}, []);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('factors');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.factors)).toBe(true);
    });
  });

  describe('type-guards', () => {
    it('should export type guard functions', async () => {
      const guards = await import('@/lib/destiny-map/type-guards');

      expect(typeof guards.isChart).toBe('function');
      expect(typeof guards.isAstrologyChartFacts).toBe('function');
      expect(typeof guards.isSajuPillar).toBe('function');
      expect(typeof guards.normalizePillar).toBe('function');
      expect(typeof guards.isPlanet).toBe('function');
      expect(typeof guards.isPlanetArray).toBe('function');
      expect(typeof guards.getNestedProperty).toBe('function');
      expect(typeof guards.assertType).toBe('function');
    });

    it('should validate chart structure', async () => {
      const { isChart } = await import('@/lib/destiny-map/type-guards');

      expect(isChart({ planets: [], houses: {}, aspects: {} })).toBe(true);
      expect(isChart(null)).toBe(false);
      expect(isChart({})).toBe(false);
    });

    it('should normalize pillars', async () => {
      const { normalizePillar } = await import('@/lib/destiny-map/type-guards');

      const result = normalizePillar({
        heavenlyStem: { name: '甲' },
        earthlyBranch: { name: '子' },
      });

      expect(result).not.toBeNull();
      expect(result?.heavenlyStem.name).toBe('甲');
      expect(result?.earthlyBranch.name).toBe('子');
    });
  });

  describe('calendar-schema', () => {
    it('should export Zod schemas', async () => {
      const schemas = await import('@/lib/validation/calendar-schema');

      expect(schemas.BirthInfoSchema).toBeDefined();
      expect(schemas.CalendarQuerySchema).toBeDefined();
      expect(schemas.SaveDateSchema).toBeDefined();
    });

    it('should validate birth info', async () => {
      const { BirthInfoSchema } = await import('@/lib/validation/calendar-schema');

      const valid = {
        birthDate: '1990-01-15',
        latitude: 37.5665,
        longitude: 126.9780,
        timezone: 'Asia/Seoul',
      };

      const result = BirthInfoSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid birth info', async () => {
      const { BirthInfoSchema } = await import('@/lib/validation/calendar-schema');

      const invalid = {
        birthDate: 'invalid-date',
        latitude: 200, // Invalid latitude
        longitude: 500, // Invalid longitude
        timezone: '',
      };

      const result = BirthInfoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
