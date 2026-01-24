/**
 * Prediction Index Tests
 * 예측 시스템 통합 모듈 테스트 - 점수/등급 변환 시스템
 */

import { describe, it, expect } from 'vitest';
import {
  standardizeScore,
  scoreToGrade,
  gradeToMinScore,
  type PredictionGrade,
  type StandardizedScore,
} from '@/lib/prediction/index';

describe('Prediction Score System', () => {
  describe('standardizeScore', () => {
    describe('score normalization', () => {
      it('should normalize score to 0-100 range', () => {
        expect(standardizeScore(50).score).toBe(50);
        expect(standardizeScore(0).score).toBe(0);
        expect(standardizeScore(100).score).toBe(100);
      });

      it('should clamp scores above 100', () => {
        expect(standardizeScore(110).score).toBe(100);
        expect(standardizeScore(150).score).toBe(100);
        expect(standardizeScore(1000).score).toBe(100);
      });

      it('should clamp scores below 0', () => {
        expect(standardizeScore(-10).score).toBe(0);
        expect(standardizeScore(-50).score).toBe(0);
        expect(standardizeScore(-1000).score).toBe(0);
      });

      it('should round decimal scores', () => {
        expect(standardizeScore(75.4).score).toBe(75);
        expect(standardizeScore(75.5).score).toBe(76);
        expect(standardizeScore(75.9).score).toBe(76);
      });
    });

    describe('grade S (90+)', () => {
      it('should assign grade S for scores 90 and above', () => {
        expect(standardizeScore(90).grade).toBe('S');
        expect(standardizeScore(95).grade).toBe('S');
        expect(standardizeScore(100).grade).toBe('S');
      });

      it('should have correct labels for grade S', () => {
        const result = standardizeScore(95);
        expect(result.label).toBe('최적기');
        expect(result.labelEn).toBe('Optimal');
      });
    });

    describe('grade A+ (80-89)', () => {
      it('should assign grade A+ for scores 80-89', () => {
        expect(standardizeScore(80).grade).toBe('A+');
        expect(standardizeScore(85).grade).toBe('A+');
        expect(standardizeScore(89).grade).toBe('A+');
      });

      it('should not assign A+ for score 90', () => {
        expect(standardizeScore(90).grade).not.toBe('A+');
      });

      it('should have correct labels for grade A+', () => {
        const result = standardizeScore(85);
        expect(result.label).toBe('매우 좋은 시기');
        expect(result.labelEn).toBe('Excellent');
      });
    });

    describe('grade A (70-79)', () => {
      it('should assign grade A for scores 70-79', () => {
        expect(standardizeScore(70).grade).toBe('A');
        expect(standardizeScore(75).grade).toBe('A');
        expect(standardizeScore(79).grade).toBe('A');
      });

      it('should have correct labels for grade A', () => {
        const result = standardizeScore(75);
        expect(result.label).toBe('좋은 시기');
        expect(result.labelEn).toBe('Good');
      });
    });

    describe('grade B (60-69)', () => {
      it('should assign grade B for scores 60-69', () => {
        expect(standardizeScore(60).grade).toBe('B');
        expect(standardizeScore(65).grade).toBe('B');
        expect(standardizeScore(69).grade).toBe('B');
      });

      it('should have correct labels for grade B', () => {
        const result = standardizeScore(65);
        expect(result.label).toBe('괜찮은 시기');
        expect(result.labelEn).toBe('Fair');
      });
    });

    describe('grade C (50-59)', () => {
      it('should assign grade C for scores 50-59', () => {
        expect(standardizeScore(50).grade).toBe('C');
        expect(standardizeScore(55).grade).toBe('C');
        expect(standardizeScore(59).grade).toBe('C');
      });

      it('should have correct labels for grade C', () => {
        const result = standardizeScore(55);
        expect(result.label).toBe('보통');
        expect(result.labelEn).toBe('Average');
      });
    });

    describe('grade D (below 50)', () => {
      it('should assign grade D for scores below 50', () => {
        expect(standardizeScore(49).grade).toBe('D');
        expect(standardizeScore(25).grade).toBe('D');
        expect(standardizeScore(0).grade).toBe('D');
      });

      it('should have correct labels for grade D', () => {
        const result = standardizeScore(30);
        expect(result.label).toBe('주의 필요');
        expect(result.labelEn).toBe('Caution');
      });
    });

    describe('boundary values', () => {
      const boundaryTests: [number, PredictionGrade][] = [
        [90, 'S'],
        [89, 'A+'],
        [80, 'A+'],
        [79, 'A'],
        [70, 'A'],
        [69, 'B'],
        [60, 'B'],
        [59, 'C'],
        [50, 'C'],
        [49, 'D'],
      ];

      boundaryTests.forEach(([score, expectedGrade]) => {
        it(`should assign grade ${expectedGrade} for score ${score}`, () => {
          expect(standardizeScore(score).grade).toBe(expectedGrade);
        });
      });
    });

    describe('return type', () => {
      it('should return StandardizedScore object', () => {
        const result = standardizeScore(75);

        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('grade');
        expect(result).toHaveProperty('label');
        expect(result).toHaveProperty('labelEn');
      });

      it('should return correct types', () => {
        const result = standardizeScore(75);

        expect(typeof result.score).toBe('number');
        expect(typeof result.grade).toBe('string');
        expect(typeof result.label).toBe('string');
        expect(typeof result.labelEn).toBe('string');
      });
    });
  });

  describe('scoreToGrade', () => {
    it('should return correct grade for each score range', () => {
      expect(scoreToGrade(95)).toBe('S');
      expect(scoreToGrade(85)).toBe('A+');
      expect(scoreToGrade(75)).toBe('A');
      expect(scoreToGrade(65)).toBe('B');
      expect(scoreToGrade(55)).toBe('C');
      expect(scoreToGrade(45)).toBe('D');
    });

    it('should handle boundary values', () => {
      expect(scoreToGrade(90)).toBe('S');
      expect(scoreToGrade(89)).toBe('A+');
      expect(scoreToGrade(80)).toBe('A+');
      expect(scoreToGrade(79)).toBe('A');
      expect(scoreToGrade(70)).toBe('A');
      expect(scoreToGrade(69)).toBe('B');
      expect(scoreToGrade(60)).toBe('B');
      expect(scoreToGrade(59)).toBe('C');
      expect(scoreToGrade(50)).toBe('C');
      expect(scoreToGrade(49)).toBe('D');
    });

    it('should handle edge cases', () => {
      expect(scoreToGrade(100)).toBe('S');
      expect(scoreToGrade(0)).toBe('D');
      expect(scoreToGrade(-10)).toBe('D');
      expect(scoreToGrade(150)).toBe('S');
    });

    it('should be consistent with standardizeScore', () => {
      for (let score = 0; score <= 100; score += 10) {
        const standardized = standardizeScore(score);
        const grade = scoreToGrade(score);
        expect(standardized.grade).toBe(grade);
      }
    });
  });

  describe('gradeToMinScore', () => {
    it('should return correct minimum score for each grade', () => {
      expect(gradeToMinScore('S')).toBe(90);
      expect(gradeToMinScore('A+')).toBe(80);
      expect(gradeToMinScore('A')).toBe(70);
      expect(gradeToMinScore('B')).toBe(60);
      expect(gradeToMinScore('C')).toBe(50);
      expect(gradeToMinScore('D')).toBe(0);
    });

    it('should be inverse of scoreToGrade at boundaries', () => {
      const grades: PredictionGrade[] = ['S', 'A+', 'A', 'B', 'C', 'D'];

      grades.forEach((grade) => {
        const minScore = gradeToMinScore(grade);
        const resultGrade = scoreToGrade(minScore);
        expect(resultGrade).toBe(grade);
      });
    });

    it('should define non-overlapping ranges', () => {
      const grades: PredictionGrade[] = ['S', 'A+', 'A', 'B', 'C'];

      for (let i = 0; i < grades.length - 1; i++) {
        const currentMin = gradeToMinScore(grades[i]);
        const nextMin = gradeToMinScore(grades[i + 1]);
        expect(currentMin).toBeGreaterThan(nextMin);
      }
    });
  });

  describe('integration', () => {
    it('should maintain consistency across all functions', () => {
      const testScores = [0, 25, 49, 50, 59, 60, 69, 70, 79, 80, 89, 90, 100];

      testScores.forEach((score) => {
        const standardized = standardizeScore(score);
        const gradeOnly = scoreToGrade(score);
        const minScore = gradeToMinScore(standardized.grade);

        expect(standardized.grade).toBe(gradeOnly);
        expect(standardized.score).toBeGreaterThanOrEqual(minScore);
      });
    });

    it('should correctly categorize random scores', () => {
      for (let i = 0; i < 20; i++) {
        const randomScore = Math.floor(Math.random() * 120) - 10; // -10 to 110
        const result = standardizeScore(randomScore);

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(['S', 'A+', 'A', 'B', 'C', 'D']).toContain(result.grade);
        expect(result.label.length).toBeGreaterThan(0);
        expect(result.labelEn.length).toBeGreaterThan(0);
      }
    });

    it('should produce distinct grades for distinct ranges', () => {
      const ranges = [
        { min: 90, max: 100, grade: 'S' },
        { min: 80, max: 89, grade: 'A+' },
        { min: 70, max: 79, grade: 'A' },
        { min: 60, max: 69, grade: 'B' },
        { min: 50, max: 59, grade: 'C' },
        { min: 0, max: 49, grade: 'D' },
      ];

      ranges.forEach(({ min, max, grade }) => {
        for (let score = min; score <= max; score++) {
          expect(standardizeScore(score).grade).toBe(grade);
        }
      });
    });
  });

  describe('type safety', () => {
    it('should return valid PredictionGrade type', () => {
      const validGrades: PredictionGrade[] = ['S', 'A+', 'A', 'B', 'C', 'D'];
      const result = standardizeScore(75);

      expect(validGrades).toContain(result.grade);
    });

    it('should return complete StandardizedScore object', () => {
      const result: StandardizedScore = standardizeScore(75);

      expect(result.score).toBeDefined();
      expect(result.grade).toBeDefined();
      expect(result.label).toBeDefined();
      expect(result.labelEn).toBeDefined();
    });
  });
});
