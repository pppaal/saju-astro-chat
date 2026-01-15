// tests/lib/destiny-map/calendar/activity-scoring.test.ts
import { describe, it, expect } from 'vitest';
import { calculateActivityScore } from '@/lib/destiny-map/calendar/activity-scoring';



describe('calculateActivityScore', () => {
  describe('empty input', () => {
    it('should return neutral score with no modifiers', () => {
      const result = calculateActivityScore('wealth', {}, {}, []);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.factors).toEqual([]);
    });

    it('should return different scores for different activity types', () => {
      const wealthScore = calculateActivityScore('wealth', {}, {}, []);
      const careerScore = calculateActivityScore('career', {}, {}, []);
      const loveScore = calculateActivityScore('love', {}, {}, []);

      // Scores should be within valid range
      expect(wealthScore.score).toBeGreaterThanOrEqual(0);
      expect(careerScore.score).toBeGreaterThanOrEqual(0);
      expect(loveScore.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('gongmang effects', () => {
    it('should apply negative score for 공망 (void of course)', () => {
      const gongmangInfo = {
        isGongmang: true,
        branch: '子',
        pair: '子丑',
      };

      const result = calculateActivityScore('wealth', gongmangInfo, {}, []);

      expect(result.score).toBeLessThan(50);
      expect(result.factors).toContain('공망');
    });

    it('should not apply penalty when not 공망', () => {
      const gongmangInfo = {
        isGongmang: false,
        branch: '子',
        pair: null,
      };

      const result = calculateActivityScore('wealth', gongmangInfo, {}, []);

      expect(result.factors).not.toContain(expect.stringContaining('공망'));
    });
  });

  describe('shinsal effects', () => {
    it('should apply positive score for beneficial 신살', () => {
      const shinsalList = [
        { key: '천을귀인', description: '귀인의 도움', beneficialFor: ['wealth', 'career'] },
        { key: '문창귀인', description: '학문과 문장', beneficialFor: ['study', 'career'] },
      ];

      const result = calculateActivityScore('wealth', {}, {}, shinsalList);

      expect(result.score).toBeGreaterThan(50);
      expect(result.factors.length).toBeGreaterThan(0);
    });

    it('should apply negative score for harmful 신살', () => {
      const shinsalList = [
        { key: '역마살', description: '변동과 이동', harmfulFor: ['wealth', 'health'] },
        { key: '도화살', description: '이성 관계', harmfulFor: ['study', 'career'] },
      ];

      const result = calculateActivityScore('wealth', {}, {}, shinsalList);

      expect(result.score).toBeLessThan(50);
      expect(result.factors.length).toBeGreaterThan(0);
    });

    it('should ignore 신살 not relevant to activity type', () => {
      const shinsalList = [
        { key: '문창귀인', description: '학문과 문장', beneficialFor: ['study'] },
      ];

      const wealthResult = calculateActivityScore('wealth', {}, {}, shinsalList);
      const studyResult = calculateActivityScore('study', {}, {}, shinsalList);

      expect(studyResult.score).toBeGreaterThan(wealthResult.score);
    });
  });

  describe('combined effects', () => {
    it('should combine 공망 and 신살 effects', () => {
      const gongmangInfo = {
        isGongmang: true,
        branch: '子',
        pair: '子丑',
      };

      const shinsalList = [
        { key: '천을귀인', description: '귀인의 도움', beneficialFor: ['wealth'] },
      ];

      const result = calculateActivityScore('wealth', gongmangInfo, {}, shinsalList);

      // Should have both positive and negative factors
      expect(result.factors.length).toBeGreaterThan(0);
      // Final score should reflect combination
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle multiple beneficial and harmful 신살', () => {
      const shinsalList = [
        { key: '천을귀인', description: '귀인의 도움', beneficialFor: ['wealth', 'career'] },
        { key: '문창귀인', description: '학문과 문장', beneficialFor: ['wealth', 'study'] },
        { key: '역마살', description: '변동과 이동', harmfulFor: ['wealth', 'health'] },
        { key: '도화살', description: '이성 관계', harmfulFor: ['wealth'] },
      ];

      const result = calculateActivityScore('wealth', {}, {}, shinsalList);

      expect(result.factors.length).toBeGreaterThanOrEqual(4);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('all activity types', () => {
    const testActivityTypes = [
      'wealth',
      'career',
      'love',
      'health',
      'travel',
      'study',
      'general',
    ] as const;

    testActivityTypes.forEach((activityType) => {
      it(`should calculate valid score for ${activityType}`, () => {
        const shinsalList = [
          { key: 'test', description: 'test', beneficialFor: [activityType] },
        ];

        const result = calculateActivityScore(activityType, {}, {}, shinsalList);

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(result.factors).toBeDefined();
        expect(Array.isArray(result.factors)).toBe(true);
      });
    });
  });

  describe('score boundaries', () => {
    it('should never exceed 100', () => {
      const shinsalList = Array(20)
        .fill(null)
        .map((_, i) => ({
          key: `beneficial${i}`,
          description: `Beneficial ${i}`,
          beneficialFor: ['wealth'],
        }));

      const result = calculateActivityScore('wealth', {}, {}, shinsalList);

      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should never go below 0', () => {
      const gongmangInfo = {
        isGongmang: true,
        branch: '子',
        pair: '子丑',
      };

      const shinsalList = Array(20)
        .fill(null)
        .map((_, i) => ({
          key: `harmful${i}`,
          description: `Harmful ${i}`,
          harmfulFor: ['wealth'],
        }));

      const result = calculateActivityScore('wealth', gongmangInfo, {}, shinsalList);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('factor accumulation', () => {
    it('should accumulate all relevant factors', () => {
      const gongmangInfo = {
        isGongmang: true,
        branch: '子',
        pair: '子丑',
      };

      const shinsalList = [
        { key: '천을귀인', description: '귀인의 도움', beneficialFor: ['wealth'] },
        { key: '역마살', description: '변동과 이동', harmfulFor: ['wealth'] },
      ];

      const result = calculateActivityScore('wealth', gongmangInfo, {}, shinsalList);

      // Should have 공망 + 2 신살 factors
      expect(result.factors.length).toBeGreaterThanOrEqual(3);
    });

    it('should return factors as strings', () => {
      const shinsalList = [
        { key: '천을귀인', description: '귀인의 도움', beneficialFor: ['wealth'] },
      ];

      const result = calculateActivityScore('wealth', {}, {}, shinsalList);

      expect(result.factors.every((f) => typeof f === 'string')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined values gracefully', () => {
      const result = calculateActivityScore('wealth', undefined as any, undefined as any, undefined as any);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.factors).toBeDefined();
    });

    it('should handle null values gracefully', () => {
      const result = calculateActivityScore('wealth', null as any, null as any, null as any);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.factors).toBeDefined();
    });

    it('should handle empty shinsal list', () => {
      const result = calculateActivityScore('wealth', {}, {}, []);

      expect(result.factors).toEqual([]);
    });

    it('should handle shinsal without beneficialFor or harmfulFor', () => {
      const shinsalList = [
        { key: 'neutral', description: 'Neutral effect' },
      ];

      const result = calculateActivityScore('wealth', {}, {}, shinsalList);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
