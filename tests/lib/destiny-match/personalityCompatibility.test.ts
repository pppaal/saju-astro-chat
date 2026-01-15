import { describe, it, expect } from 'vitest';
import {
  calculatePersonalityCompatibility,
  quickPersonalityScore,
} from '@/lib/destiny-match/personalityCompatibility';

describe('personalityCompatibility', () => {
  describe('calculatePersonalityCompatibility', () => {
    it('should return high score for similar personalities', () => {
      const person1 = { energy: 70, cognition: 60, decision: 75, rhythm: 65 };
      const person2 = { energy: 75, cognition: 55, decision: 70, rhythm: 60 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.score).toBeGreaterThan(70);
      expect(result.grade).toMatch(/^[SAB]$/);
      expect(result.chemistry).toBeDefined();
      expect(result.strengths.length).toBeGreaterThan(0);
      expect(result.challenges.length).toBeGreaterThan(0);
      expect(result.tips.length).toBeGreaterThan(0);
    });

    it('should return lower score for very different personalities', () => {
      const person1 = { energy: 10, cognition: 10, decision: 10, rhythm: 10 };
      const person2 = { energy: 90, cognition: 90, decision: 90, rhythm: 90 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.score).toBeLessThan(50);
      expect(result.grade).toMatch(/^[CD]$/);
    });

    it('should handle optimal cognition difference (around 35)', () => {
      const person1 = { energy: 50, cognition: 30, decision: 50, rhythm: 50 };
      const person2 = { energy: 50, cognition: 65, decision: 50, rhythm: 50 };

      const result = calculatePersonalityCompatibility(person1, person2);

      // Cognition difference is 35 which is optimal
      expect(result.score).toBeGreaterThan(80);
    });

    it('should return grade S for score >= 90', () => {
      const person1 = { energy: 50, cognition: 32, decision: 50, rhythm: 50 };
      const person2 = { energy: 50, cognition: 67, decision: 50, rhythm: 50 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.grade).toBe('S');
    });

    it('should return grade A for score >= 80 and < 90', () => {
      // Design inputs to get score in 80-89 range
      // cognition diff = 25 -> cognitionScore = 100 - |25-35|*2 = 80
      // energy diff = 10 -> energyScore = 100 - 10*1.5 = 85
      // decision diff = 10 -> decisionScore = 100 - 10*1.8 = 82
      // rhythm diff = 10 -> rhythmScore = 100 - 10*1.6 = 84
      const person1 = { energy: 50, cognition: 50, decision: 50, rhythm: 50 };
      const person2 = { energy: 60, cognition: 75, decision: 60, rhythm: 60 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.score).toBeLessThan(90);
      expect(result.grade).toBe('A');
    });

    it('should return grade B for score >= 65 and < 80', () => {
      const person1 = { energy: 50, cognition: 50, decision: 50, rhythm: 50 };
      const person2 = { energy: 70, cognition: 70, decision: 70, rhythm: 70 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.score).toBeGreaterThanOrEqual(65);
      expect(result.score).toBeLessThan(80);
      expect(result.grade).toBe('B');
    });

    it('should return grade C for score >= 50 and < 65', () => {
      // Design inputs to get score in 50-64 range
      // energy diff = 30 -> energyScore = 100 - 30*1.5 = 55
      // cognition diff = 30 -> cognitionScore = 100 - |30-35|*2 = 90
      // decision diff = 30 -> decisionScore = 100 - 30*1.8 = 46
      // rhythm diff = 30 -> rhythmScore = 100 - 30*1.6 = 52
      // weighted: 0.2*55 + 0.2*90 + 0.3*46 + 0.3*52 = 11+18+13.8+15.6 = 58.4
      const person1 = { energy: 35, cognition: 35, decision: 35, rhythm: 35 };
      const person2 = { energy: 65, cognition: 65, decision: 65, rhythm: 65 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.score).toBeLessThan(65);
      expect(result.grade).toBe('C');
    });

    it('should return grade D for score < 50', () => {
      const person1 = { energy: 0, cognition: 0, decision: 0, rhythm: 0 };
      const person2 = { energy: 100, cognition: 100, decision: 100, rhythm: 100 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.score).toBeLessThan(50);
      expect(result.grade).toBe('D');
    });

    it('should return appropriate chemistry messages based on score', () => {
      const highScorePair = {
        person1: { energy: 50, cognition: 32, decision: 50, rhythm: 50 },
        person2: { energy: 50, cognition: 67, decision: 50, rhythm: 50 },
      };

      const result = calculatePersonalityCompatibility(
        highScorePair.person1,
        highScorePair.person2
      );

      expect(result.chemistry).toContain('환상의 케미');
    });

    it('should identify energy level differences as challenges', () => {
      const person1 = { energy: 10, cognition: 50, decision: 50, rhythm: 50 };
      const person2 = { energy: 80, cognition: 50, decision: 50, rhythm: 50 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.challenges.some((c) => c.includes('에너지'))).toBe(true);
    });

    it('should identify similar values as strengths', () => {
      const person1 = { energy: 50, cognition: 50, decision: 70, rhythm: 50 };
      const person2 = { energy: 50, cognition: 50, decision: 75, rhythm: 50 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.strengths.some((s) => s.includes('가치관'))).toBe(true);
    });

    it('should identify similar rhythm as strength', () => {
      const person1 = { energy: 50, cognition: 50, decision: 50, rhythm: 60 };
      const person2 = { energy: 50, cognition: 50, decision: 50, rhythm: 65 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.strengths.some((s) => s.includes('생활 리듬'))).toBe(true);
    });

    it('should provide tips for energy differences', () => {
      const person1 = { energy: 10, cognition: 50, decision: 50, rhythm: 50 };
      const person2 = { energy: 80, cognition: 50, decision: 50, rhythm: 50 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.tips.some((t) => t.includes('에너지 충전'))).toBe(true);
    });

    it('should provide tips for cognition differences', () => {
      const person1 = { energy: 50, cognition: 10, decision: 50, rhythm: 50 };
      const person2 = { energy: 50, cognition: 80, decision: 50, rhythm: 50 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.tips.some((t) => t.includes('다른 것'))).toBe(true);
    });

    it('should provide tips for decision differences', () => {
      const person1 = { energy: 50, cognition: 50, decision: 10, rhythm: 50 };
      const person2 = { energy: 50, cognition: 50, decision: 80, rhythm: 50 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.tips.some((t) => t.includes('결정') || t.includes('관점'))).toBe(true);
    });

    it('should provide tips for rhythm differences', () => {
      const person1 = { energy: 50, cognition: 50, decision: 50, rhythm: 10 };
      const person2 = { energy: 50, cognition: 50, decision: 50, rhythm: 80 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.tips.some((t) => t.includes('루틴'))).toBe(true);
    });

    it('should provide default tips when no major differences', () => {
      const person1 = { energy: 50, cognition: 50, decision: 50, rhythm: 50 };
      const person2 = { energy: 50, cognition: 50, decision: 50, rhythm: 50 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.tips.length).toBeGreaterThan(0);
      expect(result.tips.some((t) => t.includes('칭찬') || t.includes('감사'))).toBe(true);
    });

    it('should add default strength when no specific strengths found', () => {
      // Very large differences in all categories
      const person1 = { energy: 0, cognition: 0, decision: 100, rhythm: 0 };
      const person2 = { energy: 100, cognition: 100, decision: 30, rhythm: 100 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.strengths.length).toBeGreaterThanOrEqual(1);
    });

    it('should add default challenge when personalities are very similar', () => {
      const person1 = { energy: 50, cognition: 50, decision: 50, rhythm: 50 };
      const person2 = { energy: 50, cognition: 50, decision: 50, rhythm: 50 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.challenges.some((c) => c.includes('비슷'))).toBe(true);
    });

    it('should handle boundary values', () => {
      const person1 = { energy: 0, cognition: 0, decision: 0, rhythm: 0 };
      const person2 = { energy: 0, cognition: 0, decision: 0, rhythm: 0 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.score).toBeDefined();
      expect(result.grade).toBeDefined();
    });

    it('should handle max values', () => {
      const person1 = { energy: 100, cognition: 100, decision: 100, rhythm: 100 };
      const person2 = { energy: 100, cognition: 100, decision: 100, rhythm: 100 };

      const result = calculatePersonalityCompatibility(person1, person2);

      expect(result.score).toBeDefined();
      expect(result.grade).toBeDefined();
    });
  });

  describe('quickPersonalityScore', () => {
    it('should return score for valid inputs', () => {
      const person1 = { energy: 70, cognition: 60, decision: 75, rhythm: 65 };
      const person2 = { energy: 75, cognition: 55, decision: 70, rhythm: 60 };

      const score = quickPersonalityScore(person1, person2);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return null for null person1', () => {
      const person2 = { energy: 75, cognition: 55, decision: 70, rhythm: 60 };

      const score = quickPersonalityScore(null, person2);

      expect(score).toBeNull();
    });

    it('should return null for null person2', () => {
      const person1 = { energy: 70, cognition: 60, decision: 75, rhythm: 65 };

      const score = quickPersonalityScore(person1, null);

      expect(score).toBeNull();
    });

    it('should return null for both null inputs', () => {
      const score = quickPersonalityScore(null, null);

      expect(score).toBeNull();
    });

    it('should return consistent score with calculatePersonalityCompatibility', () => {
      const person1 = { energy: 60, cognition: 50, decision: 70, rhythm: 55 };
      const person2 = { energy: 65, cognition: 45, decision: 75, rhythm: 60 };

      const quickScore = quickPersonalityScore(person1, person2);
      const fullResult = calculatePersonalityCompatibility(person1, person2);

      expect(quickScore).toBe(fullResult.score);
    });

    it('should handle identical personalities', () => {
      const person1 = { energy: 50, cognition: 50, decision: 50, rhythm: 50 };
      const person2 = { energy: 50, cognition: 50, decision: 50, rhythm: 50 };

      const score = quickPersonalityScore(person1, person2);

      expect(score).toBeDefined();
      expect(score).not.toBeNull();
    });

    it('should handle extreme differences', () => {
      const person1 = { energy: 0, cognition: 0, decision: 0, rhythm: 0 };
      const person2 = { energy: 100, cognition: 100, decision: 100, rhythm: 100 };

      const score = quickPersonalityScore(person1, person2);

      expect(score).toBeDefined();
      expect(score).toBeLessThan(50);
    });
  });
});
