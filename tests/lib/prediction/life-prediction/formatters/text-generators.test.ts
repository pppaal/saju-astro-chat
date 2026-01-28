/**
 * Tests for src/lib/prediction/life-prediction/formatters/text-generators.ts
 * 텍스트 생성 함수 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  generatePhaseTheme,
  generatePhaseRecommendations,
  generateTrendSummary,
  generateWeeklySummary,
  generateEventAdvice,
} from '@/lib/prediction/life-prediction/formatters/text-generators';

describe('text-generators', () => {
  describe('generatePhaseTheme', () => {
    it('should combine element theme with energy theme', () => {
      const daeun = { element: '목' } as any;
      const result = generatePhaseTheme(daeun, 'peak');
      expect(result).toBe('성장과 확장 - 최고조 활동기');
    });

    it.each([
      ['목', '성장과 확장'],
      ['화', '열정과 표현'],
      ['토', '안정과 축적'],
      ['금', '결실과 정리'],
      ['수', '지혜와 유연함'],
    ] as const)('should map element %s to correct theme', (element, expected) => {
      const daeun = { element } as any;
      const result = generatePhaseTheme(daeun, 'rising');
      expect(result).toContain(expected);
    });

    it.each([
      ['peak', '최고조 활동기'],
      ['rising', '상승 발전기'],
      ['declining', '안정 수확기'],
      ['dormant', '휴식 충전기'],
    ] as const)('should map energy %s to correct theme', (energy, expected) => {
      const daeun = { element: '토' } as any;
      const result = generatePhaseTheme(daeun, energy);
      expect(result).toContain(expected);
    });
  });

  describe('generatePhaseRecommendations', () => {
    it('should return 4 recommendations (3 energy + 1 element)', () => {
      const result = generatePhaseRecommendations('peak', '목');
      expect(result).toHaveLength(4);
    });

    it('should include peak energy recommendations', () => {
      const result = generatePhaseRecommendations('peak', '토');
      expect(result).toContain('중요한 결정과 큰 프로젝트 추진');
      expect(result).toContain('적극적인 도전과 확장');
      expect(result).toContain('리더십 발휘와 책임 수용');
    });

    it('should include rising energy recommendations', () => {
      const result = generatePhaseRecommendations('rising', '토');
      expect(result).toContain('새로운 시작과 계획 수립');
      expect(result).toContain('학습과 자기 개발');
    });

    it('should include declining energy recommendations', () => {
      const result = generatePhaseRecommendations('declining', '토');
      expect(result).toContain('기존 성과의 정리와 보존');
      expect(result).toContain('무리한 확장보다 안정 추구');
    });

    it('should include dormant energy recommendations', () => {
      const result = generatePhaseRecommendations('dormant', '토');
      expect(result).toContain('내면 성찰과 재충전');
      expect(result).toContain('건강 관리와 휴식');
    });

    it.each([
      ['목', '창의적 활동과 새로운 아이디어 개발'],
      ['화', '열정을 표현하되 과열 주의'],
      ['토', '부동산, 안정적 투자에 유리'],
      ['금', '결단력 있는 정리와 선택'],
      ['수', '유연한 대응과 지혜로운 판단'],
    ] as const)('should add element-specific advice for %s', (element, expected) => {
      const result = generatePhaseRecommendations('peak', element);
      expect(result).toContain(expected);
    });
  });

  describe('generateTrendSummary', () => {
    const transitions = [
      { year: 2026, impact: 'positive' },
      { year: 2030, impact: 'challenging' },
    ] as any[];

    it('should describe ascending trend', () => {
      const result = generateTrendSummary('ascending', [2028], [], transitions, 2024);
      expect(result).toContain('상승하는 운세');
    });

    it('should describe descending trend', () => {
      const result = generateTrendSummary('descending', [], [], [], 2024);
      expect(result).toContain('안정을 추구');
    });

    it('should describe stable trend', () => {
      const result = generateTrendSummary('stable', [], [], [], 2024);
      expect(result).toContain('안정적인 운세');
    });

    it('should describe volatile trend', () => {
      const result = generateTrendSummary('volatile', [], [], [], 2024);
      expect(result).toContain('변동이 큰');
    });

    it('should mention upcoming peak year', () => {
      const result = generateTrendSummary('ascending', [2025, 2028], [], [], 2024);
      expect(result).toContain('2025년이 특히 좋은 시기');
    });

    it('should skip past peak years', () => {
      const result = generateTrendSummary('ascending', [2020, 2028], [], [], 2024);
      expect(result).not.toContain('2020');
      expect(result).toContain('2028');
    });

    it('should mention positive upcoming transition', () => {
      const result = generateTrendSummary('ascending', [], [], transitions, 2024);
      expect(result).toContain('2026년 대운 전환이 긍정적');
    });

    it('should mention challenging upcoming transition', () => {
      const result = generateTrendSummary('ascending', [], [], transitions, 2028);
      expect(result).toContain('2030년 대운 전환 시 신중한 대비');
    });

    it('should handle empty arrays', () => {
      const result = generateTrendSummary('stable', [], [], [], 2024);
      expect(result).toBeTruthy();
    });
  });

  describe('generateWeeklySummary', () => {
    const makeBestWeek = (avgScore: number, grade: number = 1) => ({
      startDate: new Date(2025, 2, 10), // March 10
      endDate: new Date(2025, 2, 16),   // March 16
      grade,
      averageScore: avgScore,
      bestDays: [new Date(2025, 2, 12), new Date(2025, 2, 14)],
      bestDay: new Date(2025, 2, 12),
    });

    it('should return no-result message when bestWeek is null', () => {
      const result = generateWeeklySummary('marriage', [], null);
      expect(result).toContain('결혼');
      expect(result).toContain('결과가 없습니다');
    });

    it('should format best week info', () => {
      const bestWeek = makeBestWeek(85);
      const result = generateWeeklySummary('marriage', [bestWeek as any], bestWeek as any);
      expect(result).toContain('3/10~3/16');
      expect(result).toContain('85점');
    });

    it('should include best days', () => {
      const bestWeek = makeBestWeek(85);
      const result = generateWeeklySummary('career', [bestWeek as any], bestWeek as any);
      expect(result).toContain('3/12');
      expect(result).toContain('3/14');
    });

    it('should fallback to bestDay when bestDays is empty', () => {
      const bestWeek = { ...makeBestWeek(85), bestDays: [] };
      const result = generateWeeklySummary('career', [bestWeek as any], bestWeek as any);
      expect(result).toContain('3/12');
    });

    it('should note stable period when variance is low', () => {
      const weeks = [
        { averageScore: 80 },
        { averageScore: 81 },
        { averageScore: 79 },
      ] as any[];
      const result = generateWeeklySummary('investment', weeks, makeBestWeek(80) as any);
      expect(result).toContain('안정적인 시기');
    });

    it('should warn about volatile period when variance is high', () => {
      const weeks = [
        { averageScore: 30 },
        { averageScore: 90 },
        { averageScore: 40 },
        { averageScore: 95 },
      ] as any[];
      const result = generateWeeklySummary('investment', weeks, makeBestWeek(95) as any);
      expect(result).toContain('시기 선택이 중요');
    });
  });

  describe('generateEventAdvice', () => {
    const makeOptimalPeriod = (year: number, month: number, score: number, grade: number = 1) => ({
      startDate: new Date(year, month - 1, 1),
      endDate: new Date(year, month - 1, 28),
      score,
      grade,
    });

    const makeAvoidPeriod = (year: number, month: number) => ({
      startDate: new Date(year, month - 1, 1),
      endDate: new Date(year, month - 1, 28),
    });

    it('should mention event type in advice', () => {
      const result = generateEventAdvice('marriage', [], [], null);
      expect(result).toContain('결혼');
    });

    it('should describe best optimal period', () => {
      const optimal = [makeOptimalPeriod(2025, 6, 92, 1)] as any[];
      const result = generateEventAdvice('career', optimal, [], null);
      expect(result).toContain('2025년 6월');
      expect(result).toContain('92점');
    });

    it('should mention next best period when different from best', () => {
      const optimal = [makeOptimalPeriod(2025, 3, 92)] as any[];
      const nextBest = makeOptimalPeriod(2025, 9, 85) as any;
      const result = generateEventAdvice('investment', optimal, [], nextBest);
      expect(result).toContain('다가오는 최적 시기');
      expect(result).toContain('2025년 9월');
    });

    it('should not duplicate when nextBest is same as best', () => {
      const optimal = [makeOptimalPeriod(2025, 3, 92)] as any[];
      const result = generateEventAdvice('investment', optimal, [], optimal[0]);
      expect(result).not.toContain('다가오는');
    });

    it('should warn about periods to avoid', () => {
      const avoid = [makeAvoidPeriod(2025, 8)] as any[];
      const result = generateEventAdvice('move', [], avoid, null);
      expect(result).toContain('2025년 8월');
      expect(result).toContain('피하는 것이 좋습니다');
    });

    it('should combine all sections', () => {
      const optimal = [makeOptimalPeriod(2025, 6, 90)] as any[];
      const avoid = [makeAvoidPeriod(2025, 11)] as any[];
      const nextBest = makeOptimalPeriod(2025, 9, 82) as any;
      const result = generateEventAdvice('study', optimal, avoid, nextBest);
      expect(result).toContain('학업/시험');
      expect(result).toContain('6월');
      expect(result).toContain('9월');
      expect(result).toContain('11월');
    });
  });
});
