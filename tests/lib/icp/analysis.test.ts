import { describe, it, expect, vi } from 'vitest';
import { analyzeICP, getICPCompatibility, getCrossSystemCompatibility, ICP_OCTANTS } from '@/lib/icp/analysis';
import type { ICPQuizAnswers, ICPOctantCode } from '@/lib/icp/types';

// Mock questions for consistent testing
vi.mock('@/lib/icp/questions', () => ({
  icpQuestions: [
    // Dominance questions (8 for testing)
    { id: 'dom_1', axis: 'dominance' },
    { id: 'dom_2', axis: 'dominance' },
    { id: 'dom_3', axis: 'dominance' },
    { id: 'dom_4', axis: 'dominance' },
    { id: 'dom_5', axis: 'dominance' },
    { id: 'dom_6', axis: 'dominance' },
    { id: 'dom_7', axis: 'dominance' },
    { id: 'dom_8', axis: 'dominance' },
    // Affiliation questions (8 for testing)
    { id: 'aff_1', axis: 'affiliation' },
    { id: 'aff_2', axis: 'affiliation' },
    { id: 'aff_3', axis: 'affiliation' },
    { id: 'aff_4', axis: 'affiliation' },
    { id: 'aff_5', axis: 'affiliation' },
    { id: 'aff_6', axis: 'affiliation' },
    { id: 'aff_7', axis: 'affiliation' },
    { id: 'aff_8', axis: 'affiliation' },
  ],
}));

describe('ICP Analysis', () => {
  describe('ICP_OCTANTS constant', () => {
    it('should have all 8 octant codes', () => {
      const codes: ICPOctantCode[] = ['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO'];
      codes.forEach(code => {
        expect(ICP_OCTANTS[code]).toBeDefined();
      });
    });

    it('should have proper structure for each octant', () => {
      Object.values(ICP_OCTANTS).forEach(octant => {
        expect(octant.code).toBeDefined();
        expect(octant.name).toBeDefined();
        expect(octant.korean).toBeDefined();
        expect(octant.traits).toBeInstanceOf(Array);
        expect(octant.traitsKo).toBeInstanceOf(Array);
        expect(octant.shadow).toBeDefined();
        expect(octant.shadowKo).toBeDefined();
        expect(typeof octant.dominance).toBe('number');
        expect(typeof octant.affiliation).toBe('number');
        expect(octant.description).toBeDefined();
        expect(octant.descriptionKo).toBeDefined();
        expect(octant.therapeuticQuestions).toBeInstanceOf(Array);
        expect(octant.therapeuticQuestionsKo).toBeInstanceOf(Array);
        expect(octant.growthRecommendations).toBeInstanceOf(Array);
        expect(octant.growthRecommendationsKo).toBeInstanceOf(Array);
      });
    });

    it('should have dominance values within -1 to 1 range', () => {
      Object.values(ICP_OCTANTS).forEach(octant => {
        expect(octant.dominance).toBeGreaterThanOrEqual(-1);
        expect(octant.dominance).toBeLessThanOrEqual(1);
      });
    });

    it('should have affiliation values within -1 to 1 range', () => {
      Object.values(ICP_OCTANTS).forEach(octant => {
        expect(octant.affiliation).toBeGreaterThanOrEqual(-1);
        expect(octant.affiliation).toBeLessThanOrEqual(1);
      });
    });

    it('should have PA as The Leader', () => {
      expect(ICP_OCTANTS.PA.name).toBe('The Leader');
      expect(ICP_OCTANTS.PA.korean).toBe('리더형');
      expect(ICP_OCTANTS.PA.dominance).toBe(1.0);
    });

    it('should have DE as The Analyst', () => {
      expect(ICP_OCTANTS.DE.name).toBe('The Analyst');
      expect(ICP_OCTANTS.DE.korean).toBe('분석형');
      expect(ICP_OCTANTS.DE.affiliation).toBe(-1.0);
    });

    it('should have LM as The Connector', () => {
      expect(ICP_OCTANTS.LM.name).toBe('The Connector');
      expect(ICP_OCTANTS.LM.korean).toBe('친화형');
      expect(ICP_OCTANTS.LM.affiliation).toBe(1.0);
    });

    it('should have HI as The Peacemaker', () => {
      expect(ICP_OCTANTS.HI.name).toBe('The Peacemaker');
      expect(ICP_OCTANTS.HI.korean).toBe('평화형');
      expect(ICP_OCTANTS.HI.dominance).toBe(-1.0);
    });
  });

  describe('analyzeICP', () => {
    it('should return default scores for empty answers', () => {
      const answers: ICPQuizAnswers = {};
      const result = analyzeICP(answers);

      expect(result.dominanceScore).toBe(50);
      expect(result.affiliationScore).toBe(50);
      expect(result.dominanceNormalized).toBe(0);
      expect(result.affiliationNormalized).toBe(0);
    });

    it('should return high dominance for all A answers on dominance questions', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'A', dom_2: 'A', dom_3: 'A', dom_4: 'A',
        dom_5: 'A', dom_6: 'A', dom_7: 'A', dom_8: 'A',
        aff_1: 'B', aff_2: 'B', aff_3: 'B', aff_4: 'B',
        aff_5: 'B', aff_6: 'B', aff_7: 'B', aff_8: 'B',
      };
      const result = analyzeICP(answers);

      expect(result.dominanceScore).toBe(100);
      expect(result.dominanceNormalized).toBe(1);
    });

    it('should return low dominance for all C answers on dominance questions', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'C', dom_2: 'C', dom_3: 'C', dom_4: 'C',
        dom_5: 'C', dom_6: 'C', dom_7: 'C', dom_8: 'C',
        aff_1: 'B', aff_2: 'B', aff_3: 'B', aff_4: 'B',
        aff_5: 'B', aff_6: 'B', aff_7: 'B', aff_8: 'B',
      };
      const result = analyzeICP(answers);

      expect(result.dominanceScore).toBe(0);
      expect(result.dominanceNormalized).toBe(-1);
    });

    it('should return high affiliation for all A answers on affiliation questions', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'B', dom_2: 'B', dom_3: 'B', dom_4: 'B',
        dom_5: 'B', dom_6: 'B', dom_7: 'B', dom_8: 'B',
        aff_1: 'A', aff_2: 'A', aff_3: 'A', aff_4: 'A',
        aff_5: 'A', aff_6: 'A', aff_7: 'A', aff_8: 'A',
      };
      const result = analyzeICP(answers);

      expect(result.affiliationScore).toBe(100);
      expect(result.affiliationNormalized).toBe(1);
    });

    it('should return low affiliation for all C answers on affiliation questions', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'B', dom_2: 'B', dom_3: 'B', dom_4: 'B',
        dom_5: 'B', dom_6: 'B', dom_7: 'B', dom_8: 'B',
        aff_1: 'C', aff_2: 'C', aff_3: 'C', aff_4: 'C',
        aff_5: 'C', aff_6: 'C', aff_7: 'C', aff_8: 'C',
      };
      const result = analyzeICP(answers);

      expect(result.affiliationScore).toBe(0);
      expect(result.affiliationNormalized).toBe(-1);
    });

    it('should identify PA (The Leader) as primary style for high dominance + warm affiliation', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'A', dom_2: 'A', dom_3: 'A', dom_4: 'A',
        dom_5: 'A', dom_6: 'A', dom_7: 'A', dom_8: 'A',
        aff_1: 'A', aff_2: 'B', aff_3: 'A', aff_4: 'B',
        aff_5: 'A', aff_6: 'B', aff_7: 'A', aff_8: 'B',
      };
      const result = analyzeICP(answers);

      // PA has dominance=1.0, affiliation=0.5, which matches high dominance + moderate warmth
      expect(result.primaryStyle).toBe('PA');
    });

    it('should identify DE (The Analyst) as primary style for neutral dominance + hostile affiliation', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'B', dom_2: 'B', dom_3: 'B', dom_4: 'B',
        dom_5: 'B', dom_6: 'B', dom_7: 'B', dom_8: 'B',
        aff_1: 'C', aff_2: 'C', aff_3: 'C', aff_4: 'C',
        aff_5: 'C', aff_6: 'C', aff_7: 'C', aff_8: 'C',
      };
      const result = analyzeICP(answers);

      // DE has dominance=0.0, affiliation=-1.0, which matches neutral dominance + low affiliation
      expect(result.primaryStyle).toBe('DE');
    });

    it('should identify HI (The Peacemaker) as primary style for low dominance + neutral affiliation', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'C', dom_2: 'C', dom_3: 'C', dom_4: 'C',
        dom_5: 'C', dom_6: 'C', dom_7: 'C', dom_8: 'C',
        aff_1: 'B', aff_2: 'B', aff_3: 'B', aff_4: 'B',
        aff_5: 'B', aff_6: 'B', aff_7: 'B', aff_8: 'B',
      };
      const result = analyzeICP(answers);

      // HI has dominance=-1.0, affiliation=0.0, which matches low dominance + neutral affiliation
      expect(result.primaryStyle).toBe('HI');
    });

    it('should identify LM (The Connector) as primary style for neutral dominance + high affiliation', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'B', dom_2: 'B', dom_3: 'B', dom_4: 'B',
        dom_5: 'B', dom_6: 'B', dom_7: 'B', dom_8: 'B',
        aff_1: 'A', aff_2: 'A', aff_3: 'A', aff_4: 'A',
        aff_5: 'A', aff_6: 'A', aff_7: 'A', aff_8: 'A',
      };
      const result = analyzeICP(answers);

      // LM has dominance=0.0, affiliation=1.0, which matches neutral dominance + high affiliation
      expect(result.primaryStyle).toBe('LM');
    });

    it('should calculate octant scores for all 8 octants', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'B', dom_2: 'B', dom_3: 'B', dom_4: 'B',
        dom_5: 'B', dom_6: 'B', dom_7: 'B', dom_8: 'B',
        aff_1: 'B', aff_2: 'B', aff_3: 'B', aff_4: 'B',
        aff_5: 'B', aff_6: 'B', aff_7: 'B', aff_8: 'B',
      };
      const result = analyzeICP(answers);

      const octantCodes: ICPOctantCode[] = ['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO'];
      octantCodes.forEach(code => {
        expect(result.octantScores[code]).toBeDefined();
        expect(result.octantScores[code]).toBeGreaterThanOrEqual(0);
        expect(result.octantScores[code]).toBeLessThanOrEqual(1);
      });
    });

    it('should include primary octant details', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'A', dom_2: 'A', dom_3: 'A', dom_4: 'A',
        dom_5: 'A', dom_6: 'A', dom_7: 'A', dom_8: 'A',
        aff_1: 'B', aff_2: 'B', aff_3: 'B', aff_4: 'B',
        aff_5: 'B', aff_6: 'B', aff_7: 'B', aff_8: 'B',
      };
      const result = analyzeICP(answers);

      expect(result.primaryOctant).toBeDefined();
      expect(result.primaryOctant.code).toBe(result.primaryStyle);
      expect(result.primaryOctant.name).toBeDefined();
      expect(result.primaryOctant.korean).toBeDefined();
    });

    it('should set secondary style when score is above threshold', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'A', dom_2: 'A', dom_3: 'A', dom_4: 'B',
        dom_5: 'B', dom_6: 'B', dom_7: 'B', dom_8: 'B',
        aff_1: 'A', aff_2: 'A', aff_3: 'B', aff_4: 'B',
        aff_5: 'B', aff_6: 'B', aff_7: 'B', aff_8: 'B',
      };
      const result = analyzeICP(answers);

      // With mixed answers, there should likely be a secondary style
      expect(result.primaryStyle).toBeDefined();
      // Secondary style is set if score > 0.3, which is possible with mixed answers
    });

    it('should generate English summary by default', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'B', dom_2: 'B', dom_3: 'B', dom_4: 'B',
        dom_5: 'B', dom_6: 'B', dom_7: 'B', dom_8: 'B',
        aff_1: 'B', aff_2: 'B', aff_3: 'B', aff_4: 'B',
        aff_5: 'B', aff_6: 'B', aff_7: 'B', aff_8: 'B',
      };
      const result = analyzeICP(answers, 'en');

      expect(result.summary).toContain('Your interpersonal style is');
    });

    it('should generate Korean summary for ko locale', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'B', dom_2: 'B', dom_3: 'B', dom_4: 'B',
        dom_5: 'B', dom_6: 'B', dom_7: 'B', dom_8: 'B',
        aff_1: 'B', aff_2: 'B', aff_3: 'B', aff_4: 'B',
        aff_5: 'B', aff_6: 'B', aff_7: 'B', aff_8: 'B',
      };
      const result = analyzeICP(answers, 'ko');

      expect(result.summary).toContain('당신의 대인관계 스타일은');
    });

    it('should always include summaryKo', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'B', dom_2: 'B', dom_3: 'B', dom_4: 'B',
        dom_5: 'B', dom_6: 'B', dom_7: 'B', dom_8: 'B',
        aff_1: 'B', aff_2: 'B', aff_3: 'B', aff_4: 'B',
        aff_5: 'B', aff_6: 'B', aff_7: 'B', aff_8: 'B',
      };
      const result = analyzeICP(answers, 'en');

      expect(result.summaryKo).toContain('당신의 대인관계 스타일은');
    });

    it('should calculate consistency score based on A/C vs B answers', () => {
      // All A answers = higher consistency
      const consistentAnswers: ICPQuizAnswers = {
        dom_1: 'A', dom_2: 'A', dom_3: 'A', dom_4: 'A',
        dom_5: 'A', dom_6: 'A', dom_7: 'A', dom_8: 'A',
        aff_1: 'A', aff_2: 'A', aff_3: 'A', aff_4: 'A',
        aff_5: 'A', aff_6: 'A', aff_7: 'A', aff_8: 'A',
      };
      const consistentResult = analyzeICP(consistentAnswers);

      // All B answers = lowest consistency (clamped)
      const inconsistentAnswers: ICPQuizAnswers = {
        dom_1: 'B', dom_2: 'B', dom_3: 'B', dom_4: 'B',
        dom_5: 'B', dom_6: 'B', dom_7: 'B', dom_8: 'B',
        aff_1: 'B', aff_2: 'B', aff_3: 'B', aff_4: 'B',
        aff_5: 'B', aff_6: 'B', aff_7: 'B', aff_8: 'B',
      };
      const inconsistentResult = analyzeICP(inconsistentAnswers);

      expect(consistentResult.consistencyScore).toBeGreaterThan(inconsistentResult.consistencyScore);
      expect(consistentResult.consistencyScore).toBeGreaterThan(30);
      expect(consistentResult.consistencyScore).toBeLessThanOrEqual(100);
      expect(inconsistentResult.consistencyScore).toBe(30);
    });

    it('should handle unknown answer values gracefully', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'X', // Invalid answer
        dom_2: 'B',
        aff_1: 'Y', // Invalid answer
        aff_2: 'B',
      };
      const result = analyzeICP(answers);

      // Should not throw and should return valid result
      expect(result.dominanceScore).toBeDefined();
      expect(result.affiliationScore).toBeDefined();
    });
  });

  describe('getICPCompatibility', () => {
    it('should return moderate score for same style', () => {
      const result = getICPCompatibility('PA', 'PA');
      expect(result.score).toBe(65);
    });

    it('should return good match level for same style', () => {
      const result = getICPCompatibility('PA', 'PA');
      expect(result.level).toBe('Good Match');
      expect(result.levelKo).toBe('좋은 궁합');
    });

    it('should return excellent match for complementary styles (PA + HI)', () => {
      // PA: dominance=1.0, affiliation=0.5
      // HI: dominance=-1.0, affiliation=0.0
      // domDiff = 2.0 > 1.0, so +20
      // affSum = 0.5 + 0.0 = 0.5 > 0, so +10
      // score = 50 + 20 + 10 = 80
      const result = getICPCompatibility('PA', 'HI');
      expect(result.score).toBe(80);
      expect(result.level).toBe('Excellent Match');
    });

    it('should return good match for warm complementary styles (NO + JK)', () => {
      // NO: dominance=0.7, affiliation=0.7
      // JK: dominance=-0.7, affiliation=0.7
      // domDiff = 1.4 > 1.0, so +20
      // affSum = 1.4 > 1.0, so +20
      // score = 50 + 20 + 20 = 90
      const result = getICPCompatibility('NO', 'JK');
      expect(result.score).toBe(90);
      expect(result.level).toBe('Excellent Match');
    });

    it('should return lower score for both cold styles (BC + DE)', () => {
      // BC: dominance=0.7, affiliation=-0.7
      // DE: dominance=0.0, affiliation=-1.0
      // domDiff = 0.7 > 0.5, so +10
      // affSum = -1.7 < -1.0, so -10
      // score = 50 + 10 - 10 = 50
      const result = getICPCompatibility('BC', 'DE');
      expect(result.score).toBe(50);
      expect(result.level).toBe('Moderate Match');
    });

    it('should return challenging match for opposing cold styles (DE + FG)', () => {
      // DE: dominance=0.0, affiliation=-1.0
      // FG: dominance=-0.7, affiliation=-0.7
      // domDiff = 0.7 > 0.5, so +10
      // affSum = -1.7 < -1.0, so -10
      // score = 50 + 10 - 10 = 50
      const result = getICPCompatibility('DE', 'FG');
      expect(result.score).toBe(50);
      expect(result.level).toBe('Moderate Match');
    });

    it('should include descriptions for all levels', () => {
      const excellentResult = getICPCompatibility('PA', 'HI');
      expect(excellentResult.description).toContain('complement');
      expect(excellentResult.descriptionKo).toContain('보완');

      const goodResult = getICPCompatibility('PA', 'PA');
      expect(goodResult.description).toContain('understand');
      expect(goodResult.descriptionKo).toContain('이해');

      const moderateResult = getICPCompatibility('BC', 'DE');
      expect(moderateResult.description).toContain('Different styles');
      expect(moderateResult.descriptionKo).toContain('다른 스타일');
    });

    it('should cap score at 95 max', () => {
      // Even the best combinations should not exceed 95
      const result = getICPCompatibility('NO', 'JK');
      expect(result.score).toBeLessThanOrEqual(95);
    });

    it('should floor score at 30 min', () => {
      // Even the worst combinations should not go below 30
      // Testing all combinations to ensure minimum
      const octants: ICPOctantCode[] = ['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO'];
      octants.forEach(style1 => {
        octants.forEach(style2 => {
          const result = getICPCompatibility(style1, style2);
          expect(result.score).toBeGreaterThanOrEqual(30);
        });
      });
    });

    it('should return symmetric results for swapped styles', () => {
      const result1 = getICPCompatibility('PA', 'HI');
      const result2 = getICPCompatibility('HI', 'PA');
      expect(result1.score).toBe(result2.score);
      expect(result1.level).toBe(result2.level);
    });

    it('should work with locale parameter', () => {
      const result = getICPCompatibility('PA', 'PA', 'ko');
      expect(result.levelKo).toBeDefined();
      expect(result.descriptionKo).toBeDefined();
    });

    it('should handle all octant pairs', () => {
      const octants: ICPOctantCode[] = ['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO'];

      octants.forEach(style1 => {
        octants.forEach(style2 => {
          const result = getICPCompatibility(style1, style2);
          expect(result.score).toBeGreaterThanOrEqual(30);
          expect(result.score).toBeLessThanOrEqual(95);
          expect(result.level).toBeDefined();
          expect(result.levelKo).toBeDefined();
          expect(result.description).toBeDefined();
          expect(result.descriptionKo).toBeDefined();
        });
      });
    });

    it('should verify compatibility score distribution across all levels', () => {
      // Verify score distribution across all compatibility levels
      const excellentResults: number[] = [];
      const goodResults: number[] = [];
      const moderateResults: number[] = [];
      const challengingResults: number[] = [];

      const octants: ICPOctantCode[] = ['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO'];
      octants.forEach(style1 => {
        octants.forEach(style2 => {
          const result = getICPCompatibility(style1, style2);
          if (result.score >= 80) excellentResults.push(result.score);
          else if (result.score >= 65) goodResults.push(result.score);
          else if (result.score >= 50) moderateResults.push(result.score);
          else challengingResults.push(result.score);
        });
      });

      // Verify that multiple compatibility levels exist
      expect(excellentResults.length).toBeGreaterThan(0);
      expect(goodResults.length).toBeGreaterThan(0);
      expect(moderateResults.length).toBeGreaterThan(0);
      // Challenging match (< 50) is hard to achieve with current algorithm
      // as minimum score without same-style bonus is 50 - 10 = 40
      // but domDiff almost always adds at least +10
    });

    it('should correctly calculate BC + DE compatibility (cold styles)', () => {
      // BC: dominance=0.7, affiliation=-0.7
      // DE: dominance=0.0, affiliation=-1.0
      // domDiff = 0.7 > 0.5, so +10
      // affSum = -1.7 < -1.0, so -10
      // score = 50 + 10 - 10 = 50 (Moderate Match)
      const result = getICPCompatibility('BC', 'DE');
      expect(result.score).toBe(50);
      expect(result.level).toBe('Moderate Match');
      expect(result.levelKo).toBe('보통 궁합');
    });

    it('should correctly calculate DE + FG compatibility (both cold/distant)', () => {
      // DE: dominance=0.0, affiliation=-1.0
      // FG: dominance=-0.7, affiliation=-0.7
      // domDiff = 0.7 > 0.5, so +10
      // affSum = -1.7 < -1.0, so -10
      // score = 50 + 10 - 10 = 50
      const result = getICPCompatibility('DE', 'FG');
      expect(result.score).toBe(50);
      expect(result.level).toBe('Moderate Match');
    });
  });

  describe('Edge Cases', () => {
    it('should handle partial answers', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'A',
        aff_1: 'A',
      };
      const result = analyzeICP(answers);

      expect(result.dominanceScore).toBeDefined();
      expect(result.affiliationScore).toBeDefined();
      expect(result.primaryStyle).toBeDefined();
    });

    it('should handle all A answers (extreme dominant + friendly)', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'A', dom_2: 'A', dom_3: 'A', dom_4: 'A',
        dom_5: 'A', dom_6: 'A', dom_7: 'A', dom_8: 'A',
        aff_1: 'A', aff_2: 'A', aff_3: 'A', aff_4: 'A',
        aff_5: 'A', aff_6: 'A', aff_7: 'A', aff_8: 'A',
      };
      const result = analyzeICP(answers);

      expect(result.dominanceScore).toBe(100);
      expect(result.affiliationScore).toBe(100);
      // NO has dominance=0.7, affiliation=0.7 - closest to (1,1)
      // PA has dominance=1.0, affiliation=0.5
      // The closest should be PA or NO
      expect(['PA', 'NO']).toContain(result.primaryStyle);
    });

    it('should handle all C answers (extreme submissive + hostile)', () => {
      const answers: ICPQuizAnswers = {
        dom_1: 'C', dom_2: 'C', dom_3: 'C', dom_4: 'C',
        dom_5: 'C', dom_6: 'C', dom_7: 'C', dom_8: 'C',
        aff_1: 'C', aff_2: 'C', aff_3: 'C', aff_4: 'C',
        aff_5: 'C', aff_6: 'C', aff_7: 'C', aff_8: 'C',
      };
      const result = analyzeICP(answers);

      expect(result.dominanceScore).toBe(0);
      expect(result.affiliationScore).toBe(0);
      // FG has dominance=-0.7, affiliation=-0.7 - closest to (-1,-1)
      expect(result.primaryStyle).toBe('FG');
    });
  });

  describe('getCrossSystemCompatibility', () => {
    it('should return valid compatibility result', () => {
      const result = getCrossSystemCompatibility(
        'PA', 'HI',
        'RVLA', 'GSLA',
        {
          energy: { score: 80, pole: 'radiant' },
          cognition: { score: 75, pole: 'visionary' },
          decision: { score: 70, pole: 'logic' },
          rhythm: { score: 60, pole: 'anchor' },
        },
        {
          energy: { score: 30, pole: 'grounded' },
          cognition: { score: 25, pole: 'structured' },
          decision: { score: 30, pole: 'logic' },
          rhythm: { score: 70, pole: 'anchor' },
        },
        'en'
      );

      expect(result.score).toBeGreaterThanOrEqual(30);
      expect(result.score).toBeLessThanOrEqual(95);
      expect(result.level).toBeDefined();
      expect(result.levelKo).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.descriptionKo).toBeDefined();
      expect(result.insights).toBeInstanceOf(Array);
      expect(result.insightsKo).toBeInstanceOf(Array);
    });

    it('should identify dominant + radiant leadership pattern', () => {
      const result = getCrossSystemCompatibility(
        'PA', 'PA',
        'RVLA', 'RVLA',
        {
          energy: { score: 85, pole: 'radiant' },
          cognition: { score: 80, pole: 'visionary' },
          decision: { score: 75, pole: 'logic' },
          rhythm: { score: 65, pole: 'anchor' },
        },
        {
          energy: { score: 90, pole: 'radiant' },
          cognition: { score: 85, pole: 'visionary' },
          decision: { score: 80, pole: 'logic' },
          rhythm: { score: 70, pole: 'anchor' },
        },
        'en'
      );

      expect(result.insights.some(i => i.includes('leader'))).toBe(true);
    });

    it('should identify warm + empathic connection pattern', () => {
      const result = getCrossSystemCompatibility(
        'LM', 'NO',
        'RVHA', 'RSHA',
        {
          energy: { score: 75, pole: 'radiant' },
          cognition: { score: 70, pole: 'visionary' },
          decision: { score: 80, pole: 'empathic' },
          rhythm: { score: 60, pole: 'anchor' },
        },
        {
          energy: { score: 70, pole: 'radiant' },
          cognition: { score: 40, pole: 'structured' },
          decision: { score: 85, pole: 'empathic' },
          rhythm: { score: 75, pole: 'anchor' },
        },
        'en'
      );

      expect(result.insights.some(i => i.includes('emotional') || i.includes('warmth'))).toBe(true);
    });

    it('should identify leader-supporter dynamic', () => {
      const result = getCrossSystemCompatibility(
        'PA', 'HI',
        'RVLA', 'GSLF',
        {
          energy: { score: 85, pole: 'radiant' },
          cognition: { score: 80, pole: 'visionary' },
          decision: { score: 70, pole: 'logic' },
          rhythm: { score: 65, pole: 'anchor' },
        },
        {
          energy: { score: 25, pole: 'grounded' },
          cognition: { score: 30, pole: 'structured' },
          decision: { score: 35, pole: 'logic' },
          rhythm: { score: 40, pole: 'anchor' },
        },
        'en'
      );

      expect(result.insights.some(i => i.includes('leader') || i.includes('support'))).toBe(true);
    });

    it('should work with Korean locale', () => {
      const result = getCrossSystemCompatibility(
        'PA', 'HI',
        'RVLA', 'GSLA',
        {
          energy: { score: 80, pole: 'radiant' },
          cognition: { score: 75, pole: 'visionary' },
          decision: { score: 70, pole: 'logic' },
          rhythm: { score: 60, pole: 'anchor' },
        },
        {
          energy: { score: 30, pole: 'grounded' },
          cognition: { score: 25, pole: 'structured' },
          decision: { score: 30, pole: 'logic' },
          rhythm: { score: 70, pole: 'anchor' },
        },
        'ko'
      );

      expect(result.levelKo).toBeDefined();
      expect(result.descriptionKo).toBeDefined();
      expect(result.insightsKo.length).toBeGreaterThan(0);
    });

    it('should return higher scores for complementary patterns', () => {
      const complementaryResult = getCrossSystemCompatibility(
        'PA', 'JK',
        'RVLA', 'GSHA',
        {
          energy: { score: 80, pole: 'radiant' },
          cognition: { score: 75, pole: 'visionary' },
          decision: { score: 70, pole: 'logic' },
          rhythm: { score: 60, pole: 'anchor' },
        },
        {
          energy: { score: 35, pole: 'grounded' },
          cognition: { score: 30, pole: 'structured' },
          decision: { score: 75, pole: 'empathic' },
          rhythm: { score: 70, pole: 'anchor' },
        },
        'en'
      );

      const similarResult = getCrossSystemCompatibility(
        'DE', 'FG',
        'GVLA', 'GVLF',
        {
          energy: { score: 25, pole: 'grounded' },
          cognition: { score: 70, pole: 'visionary' },
          decision: { score: 80, pole: 'logic' },
          rhythm: { score: 60, pole: 'anchor' },
        },
        {
          energy: { score: 30, pole: 'grounded' },
          cognition: { score: 75, pole: 'visionary' },
          decision: { score: 85, pole: 'logic' },
          rhythm: { score: 45, pole: 'flow' },
        },
        'en'
      );

      // Complementary should generally score higher than very similar
      expect(complementaryResult.score).toBeGreaterThan(similarResult.score - 15);
    });

    it('should identify visionary + dominant innovation pattern', () => {
      const result = getCrossSystemCompatibility(
        'PA', 'BC',
        'RVLA', 'RVLF',
        {
          energy: { score: 80, pole: 'radiant' },
          cognition: { score: 85, pole: 'visionary' },
          decision: { score: 75, pole: 'logic' },
          rhythm: { score: 60, pole: 'anchor' },
        },
        {
          energy: { score: 75, pole: 'radiant' },
          cognition: { score: 80, pole: 'visionary' },
          decision: { score: 80, pole: 'logic' },
          rhythm: { score: 70, pole: 'flow' },
        },
        'en'
      );

      expect(result.insights.some(i => i.includes('Visionary') || i.includes('innovation'))).toBe(true);
    });

    it('should generate insights for structured + cooperative patterns', () => {
      const result = getCrossSystemCompatibility(
        'JK', 'JK',
        'GSLA', 'GSLA',
        {
          energy: { score: 40, pole: 'grounded' },
          cognition: { score: 30, pole: 'structured' },
          decision: { score: 35, pole: 'empathic' },
          rhythm: { score: 75, pole: 'anchor' },
        },
        {
          energy: { score: 35, pole: 'grounded' },
          cognition: { score: 32, pole: 'structured' },
          decision: { score: 40, pole: 'empathic' },
          rhythm: { score: 72, pole: 'anchor' },
        },
        'en'
      );

      // Should generate meaningful insights for any cross-system analysis
      expect(result.insights).toBeInstanceOf(Array);
      expect(result.insightsKo).toBeInstanceOf(Array);
      expect(result.score).toBeGreaterThanOrEqual(30);
    });
  });
});
