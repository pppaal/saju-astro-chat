/**
 * Tests for src/lib/prediction/prompt-contexts.ts
 * 프롬프트 컨텍스트 생성 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  generateLifePredictionPromptContext,
  generateEventTimingPromptContext,
  generatePastAnalysisPromptContext,
} from '@/lib/prediction/prompt-contexts';

describe('prompt-contexts', () => {
  describe('generateLifePredictionPromptContext', () => {
    const basePrediction = {
      multiYearTrend: {
        startYear: 2024,
        endYear: 2034,
        overallTrend: '상승세',
        summary: '전반적으로 좋은 흐름',
        yearlyScores: [
          {
            year: 2024, age: 34, grade: 2, score: 78.5,
            sibsin: '정재', twelveStage: { stage: '건록' },
            opportunities: ['투자', '이직'], challenges: ['건강 주의'],
            themes: ['성장'],
          },
          {
            year: 2025, age: 35, grade: 1, score: 85.2,
            sibsin: '식신', twelveStage: { stage: '제왕' },
            opportunities: ['승진'], challenges: [],
            themes: ['최고운'],
          },
        ],
        daeunTransitions: [
          { year: 2026, age: 36, description: '대운 전환', impact: 'positive' },
        ],
        peakYears: [2025],
      },
      upcomingHighlights: [
        {
          type: 'peak',
          title: '최고 운세',
          description: '좋은 해',
          actionItems: ['투자 준비', '새 시작'],
        },
      ],
      confidence: 85,
    } as any;

    it('should generate Korean context', () => {
      const result = generateLifePredictionPromptContext(basePrediction, 'ko');

      expect(result).toContain('종합 인생 예측 분석');
      expect(result).toContain('2024~2034년');
      expect(result).toContain('상승세');
      expect(result).toContain('85%');
      expect(result).toContain('연도별 운세');
      expect(result).toContain('2024년');
      expect(result).toContain('정재');
      expect(result).toContain('기회: 투자');
      expect(result).toContain('주의: 건강 주의');
      expect(result).toContain('대운 전환점');
      expect(result).toContain('다가오는 주요 시점');
      expect(result).toContain('요약:');
    });

    it('should generate English context', () => {
      const result = generateLifePredictionPromptContext(basePrediction, 'en');

      expect(result).toContain('Comprehensive Life Prediction');
      expect(result).toContain('2024-2034');
      expect(result).toContain('Trend:');
      expect(result).toContain('Confidence: 85%');
      expect(result).toContain('Age 34');
      expect(result).toContain('Grade 2');
    });

    it('should default to Korean', () => {
      const result = generateLifePredictionPromptContext(basePrediction);
      expect(result).toContain('종합 인생 예측 분석');
    });

    it('should limit yearly scores to 10', () => {
      const manyYears = Array.from({ length: 15 }, (_, i) => ({
        year: 2024 + i, age: 34 + i, grade: 3, score: 70,
        sibsin: '비견', twelveStage: { stage: '양' },
        opportunities: [], challenges: [], themes: [],
      }));

      const result = generateLifePredictionPromptContext({
        ...basePrediction,
        multiYearTrend: { ...basePrediction.multiYearTrend, yearlyScores: manyYears },
      }, 'ko');

      // Should contain year 2033 (10th) but not 2034+ (11th+)
      expect(result).toContain('2033년');
      expect(result).not.toContain('2038년');
    });

    it('should skip daeun transitions section when empty', () => {
      const result = generateLifePredictionPromptContext({
        ...basePrediction,
        multiYearTrend: { ...basePrediction.multiYearTrend, daeunTransitions: [] },
      }, 'ko');

      expect(result).not.toContain('대운 전환점');
    });
  });

  describe('generateEventTimingPromptContext', () => {
    const baseResult = {
      eventType: 'marriage' as const,
      searchRange: { startYear: 2024, endYear: 2027 },
      optimalPeriods: [
        {
          startDate: new Date(2025, 2, 1),
          grade: 1, score: 90,
          reasons: ['정재운', '용신 월', '천을귀인'],
          specificDays: [new Date(2025, 2, 15), new Date(2025, 2, 22)],
        },
      ],
      avoidPeriods: [
        {
          startDate: new Date(2025, 7, 1),
          reasons: ['충돌', '공망'],
        },
      ],
      advice: '봄에 시작하는 것이 좋습니다',
    } as any;

    it('should generate Korean context for marriage', () => {
      const result = generateEventTimingPromptContext(baseResult, 'ko');

      expect(result).toContain('결혼');
      expect(result).toContain('2024~2027년');
      expect(result).toContain('최적 시기');
      expect(result).toContain('2025년 3월');
      expect(result).toContain('1등급');
      expect(result).toContain('이유: 정재운');
      expect(result).toContain('추천일:');
      expect(result).toContain('피해야 할 시기');
      expect(result).toContain('조언:');
    });

    it('should generate English context', () => {
      const result = generateEventTimingPromptContext(baseResult, 'en');

      expect(result).toContain('Marriage');
      expect(result).toContain('Optimal Timing');
      expect(result).toContain('2024-2027');
      expect(result).toContain('Grade 1');
    });

    it('should skip avoid periods section when empty', () => {
      const result = generateEventTimingPromptContext({
        ...baseResult,
        avoidPeriods: [],
      }, 'ko');

      expect(result).not.toContain('피해야 할 시기');
    });

    it('should handle career event type', () => {
      const result = generateEventTimingPromptContext({
        ...baseResult,
        eventType: 'career',
      }, 'ko');

      expect(result).toContain('취업/이직');
    });

    it('should handle investment event type', () => {
      const result = generateEventTimingPromptContext({
        ...baseResult,
        eventType: 'investment',
      }, 'ko');

      expect(result).toContain('투자');
    });
  });

  describe('generatePastAnalysisPromptContext', () => {
    const baseRetrospective = {
      targetDate: new Date(2024, 5, 15),
      dailyPillar: { stem: '甲', branch: '子' },
      grade: 2,
      score: 78.5,
      twelveStage: { stage: '건록' },
      sibsin: '정재',
      whyItHappened: ['정재운 영향', '건록 에너지'],
      lessonsLearned: ['재물 관리 강화', '안정 추구'],
    } as any;

    it('should generate Korean context', () => {
      const result = generatePastAnalysisPromptContext(baseRetrospective, 'ko');

      expect(result).toContain('과거 분석');
      expect(result).toContain('甲子');
      expect(result).toContain('등급: 2');
      expect(result).toContain('79점');
      expect(result).toContain('건록');
      expect(result).toContain('정재');
      expect(result).toContain('왜 그랬을까?');
      expect(result).toContain('정재운 영향');
      expect(result).toContain('배운 점');
      expect(result).toContain('재물 관리 강화');
    });

    it('should generate English context', () => {
      const result = generatePastAnalysisPromptContext(baseRetrospective, 'en');

      expect(result).toContain('Past Analysis');
      expect(result).toContain('甲子');
      expect(result).toContain('Grade: 2');
    });

    it('should default to Korean', () => {
      const result = generatePastAnalysisPromptContext(baseRetrospective);
      expect(result).toContain('과거 분석');
    });
  });
});
