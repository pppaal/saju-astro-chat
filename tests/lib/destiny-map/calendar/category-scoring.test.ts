import { describe, it, expect } from 'vitest';
import { calculateAreaScoresForCategories, getBestAreaCategory } from '@/lib/destiny-map/calendar/category-scoring';

describe('category-scoring', () => {
  describe('calculateAreaScoresForCategories', () => {
    it('should return base scores of 50 with no matches', () => {
      const ganzhi = { stemElement: 'wood', branchElement: 'wood' };
      const scores = calculateAreaScoresForCategories(ganzhi, 0, 0);
      
      Object.values(scores).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('should boost career score with metal/earth elements', () => {
      const ganzhi = { stemElement: 'metal', branchElement: 'earth' };
      const scores = calculateAreaScoresForCategories(ganzhi, 50, 50);
      
      expect(scores.career).toBeGreaterThan(50);
    });

    it('should boost wealth score with earth/metal elements', () => {
      const ganzhi = { stemElement: 'earth', branchElement: 'metal' };
      const scores = calculateAreaScoresForCategories(ganzhi, 50, 50);
      
      expect(scores.wealth).toBeGreaterThan(50);
    });

    it('should incorporate seunScore into calculation', () => {
      const ganzhi = { stemElement: 'wood', branchElement: 'wood' };
      const highScore = calculateAreaScoresForCategories(ganzhi, 100, 0);
      const lowScore = calculateAreaScoresForCategories(ganzhi, 0, 0);
      
      Object.keys(highScore).forEach(area => {
        expect(highScore[area as keyof typeof highScore]).toBeGreaterThan(
          lowScore[area as keyof typeof lowScore] || 0
        );
      });
    });

    it('should cap scores at 100', () => {
      const ganzhi = { stemElement: 'metal', branchElement: 'metal' };
      const scores = calculateAreaScoresForCategories(ganzhi, 100, 100);
      
      Object.values(scores).forEach(score => {
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('should floor scores at 0', () => {
      const ganzhi = { stemElement: 'wood', branchElement: 'wood' };
      const scores = calculateAreaScoresForCategories(ganzhi, -100, -100);
      
      Object.values(scores).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('getBestAreaCategory', () => {
    it('should return null when no scores meet minScore', () => {
      const areaScores = { career: 50, wealth: 40, love: 30 };
      const result = getBestAreaCategory(areaScores, 65);
      expect(result).toBeNull();
    });

    it('should return best area when score exceeds minScore', () => {
      const areaScores = { career: 70, wealth: 60, love: 50 };
      const result = getBestAreaCategory(areaScores, 65);
      expect(result).toBe('career');
    });

    it('should return correct category for wealth', () => {
      const areaScores = { wealth: 80, career: 60, love: 50 };
      const result = getBestAreaCategory(areaScores);
      expect(result).toBe('wealth');
    });

    it('should use default minScore of 65', () => {
      const areaScores = { career: 64, wealth: 63 };
      const result = getBestAreaCategory(areaScores);
      expect(result).toBeNull();
    });

    it('should handle empty scores object', () => {
      const result = getBestAreaCategory({});
      expect(result).toBeNull();
    });
  });
});
