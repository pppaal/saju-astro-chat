/**
 * Scoring Utils Unit Tests
 * 점수 유틸리티 함수 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeScore,
  scoreToGrade,
  getGradeLabel,
  calculateWeightedAverage,
} from '@/lib/prediction/utils/scoring-utils';

describe('normalizeScore', () => {
  it('should return score within default range (0-100)', () => {
    expect(normalizeScore(50)).toBe(50);
  });

  it('should clamp scores below minimum to min', () => {
    expect(normalizeScore(-10)).toBe(0);
    expect(normalizeScore(-100)).toBe(0);
  });

  it('should clamp scores above maximum to max', () => {
    expect(normalizeScore(150)).toBe(100);
    expect(normalizeScore(1000)).toBe(100);
  });

  it('should handle boundary values correctly', () => {
    expect(normalizeScore(0)).toBe(0);
    expect(normalizeScore(100)).toBe(100);
  });

  it('should work with custom min/max values', () => {
    expect(normalizeScore(50, 20, 80)).toBe(50);
    expect(normalizeScore(10, 20, 80)).toBe(20);
    expect(normalizeScore(90, 20, 80)).toBe(80);
  });

  it('should handle decimal values', () => {
    expect(normalizeScore(50.5)).toBe(50.5);
    expect(normalizeScore(-0.1)).toBe(0);
    expect(normalizeScore(100.1)).toBe(100);
  });
});

describe('scoreToGrade', () => {
  describe('grade 0 (최상) - 80+', () => {
    it('should return grade 0 for score 80', () => {
      expect(scoreToGrade(80)).toBe(0);
    });

    it('should return grade 0 for score 100', () => {
      expect(scoreToGrade(100)).toBe(0);
    });

    it('should return grade 0 for score 95', () => {
      expect(scoreToGrade(95)).toBe(0);
    });
  });

  describe('grade 1 (상) - 65-79', () => {
    it('should return grade 1 for score 65', () => {
      expect(scoreToGrade(65)).toBe(1);
    });

    it('should return grade 1 for score 79', () => {
      expect(scoreToGrade(79)).toBe(1);
    });

    it('should return grade 1 for score 70', () => {
      expect(scoreToGrade(70)).toBe(1);
    });
  });

  describe('grade 2 (중) - 50-64', () => {
    it('should return grade 2 for score 50', () => {
      expect(scoreToGrade(50)).toBe(2);
    });

    it('should return grade 2 for score 64', () => {
      expect(scoreToGrade(64)).toBe(2);
    });

    it('should return grade 2 for score 55', () => {
      expect(scoreToGrade(55)).toBe(2);
    });
  });

  describe('grade 3 (하) - 35-49', () => {
    it('should return grade 3 for score 35', () => {
      expect(scoreToGrade(35)).toBe(3);
    });

    it('should return grade 3 for score 49', () => {
      expect(scoreToGrade(49)).toBe(3);
    });

    it('should return grade 3 for score 40', () => {
      expect(scoreToGrade(40)).toBe(3);
    });
  });

  describe('grade 4 (최하) - 0-34', () => {
    it('should return grade 4 for score 0', () => {
      expect(scoreToGrade(0)).toBe(4);
    });

    it('should return grade 4 for score 34', () => {
      expect(scoreToGrade(34)).toBe(4);
    });

    it('should return grade 4 for score 20', () => {
      expect(scoreToGrade(20)).toBe(4);
    });
  });

  describe('edge cases', () => {
    it('should handle negative scores as grade 4', () => {
      expect(scoreToGrade(-10)).toBe(4);
    });

    it('should handle scores above 100 as grade 0', () => {
      expect(scoreToGrade(150)).toBe(0);
    });
  });
});

describe('getGradeLabel', () => {
  it('should return "최상" for grade 0', () => {
    expect(getGradeLabel(0)).toBe('최상');
  });

  it('should return "상" for grade 1', () => {
    expect(getGradeLabel(1)).toBe('상');
  });

  it('should return "중" for grade 2', () => {
    expect(getGradeLabel(2)).toBe('중');
  });

  it('should return "하" for grade 3', () => {
    expect(getGradeLabel(3)).toBe('하');
  });

  it('should return "최하" for grade 4', () => {
    expect(getGradeLabel(4)).toBe('최하');
  });

  it('should work with scoreToGrade integration', () => {
    expect(getGradeLabel(scoreToGrade(85))).toBe('최상');
    expect(getGradeLabel(scoreToGrade(70))).toBe('상');
    expect(getGradeLabel(scoreToGrade(55))).toBe('중');
    expect(getGradeLabel(scoreToGrade(40))).toBe('하');
    expect(getGradeLabel(scoreToGrade(20))).toBe('최하');
  });
});

describe('calculateWeightedAverage', () => {
  it('should return 0 for empty array', () => {
    expect(calculateWeightedAverage([])).toBe(0);
  });

  it('should return 0 when total weight is 0', () => {
    expect(calculateWeightedAverage([
      { value: 100, weight: 0 },
      { value: 50, weight: 0 },
    ])).toBe(0);
  });

  it('should calculate simple average when weights are equal', () => {
    const result = calculateWeightedAverage([
      { value: 80, weight: 1 },
      { value: 60, weight: 1 },
    ]);
    expect(result).toBe(70);
  });

  it('should calculate weighted average correctly', () => {
    const result = calculateWeightedAverage([
      { value: 100, weight: 3 },
      { value: 50, weight: 1 },
    ]);
    // (100*3 + 50*1) / (3+1) = 350/4 = 87.5
    expect(result).toBe(87.5);
  });

  it('should handle single item', () => {
    expect(calculateWeightedAverage([
      { value: 75, weight: 2 },
    ])).toBe(75);
  });

  it('should handle multiple items with different weights', () => {
    const result = calculateWeightedAverage([
      { value: 90, weight: 0.5 },
      { value: 70, weight: 0.3 },
      { value: 50, weight: 0.2 },
    ]);
    // (90*0.5 + 70*0.3 + 50*0.2) / (0.5+0.3+0.2) = (45+21+10) / 1 = 76
    expect(result).toBe(76);
  });

  it('should handle decimal values', () => {
    const result = calculateWeightedAverage([
      { value: 85.5, weight: 1 },
      { value: 74.5, weight: 1 },
    ]);
    expect(result).toBe(80);
  });

  it('should handle large numbers', () => {
    const result = calculateWeightedAverage([
      { value: 1000, weight: 100 },
      { value: 500, weight: 100 },
    ]);
    expect(result).toBe(750);
  });
});
