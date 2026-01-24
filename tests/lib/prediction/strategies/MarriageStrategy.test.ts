/**
 * MarriageStrategy Unit Tests
 * 결혼 시기 분석 전략 테스트
 */

import { describe, it, expect } from 'vitest';
import { MarriageStrategy } from '@/lib/prediction/strategies/MarriageStrategy';
import type { ScoringContext, ScoreResult } from '@/lib/prediction/strategies/types';
import { EVENT_SCORING } from '@/lib/prediction/constants/scoring';

describe('MarriageStrategy', () => {
  const strategy = new MarriageStrategy();

  const createBaseContext = (overrides: Partial<ScoringContext> = {}): ScoringContext => ({
    year: 2024,
    month: 6,
    age: 30,
    dayStem: '갑',
    dayBranch: '자',
    monthBranch: '오',
    yearBranch: '진',
    monthElement: '수',
    twelveStage: { stage: '건록', energy: 0.8 },
    sibsin: '정재',
    ...overrides,
  });

  const createBaseResult = (): ScoreResult => ({
    score: 50,
    reasons: [],
    avoidReasons: [],
  });

  describe('eventType', () => {
    it('should have eventType as "marriage"', () => {
      expect(strategy.eventType).toBe('marriage');
    });
  });

  describe('calculateBaseScore', () => {
    it('should return base score of 50', () => {
      const context = createBaseContext();
      const result = strategy.calculateBaseScore(context);

      expect(result.score).toBe(50);
      expect(result.reasons).toEqual([]);
      expect(result.avoidReasons).toEqual([]);
    });
  });

  describe('applySibsinBonus', () => {
    it.each([
      ['정재', EVENT_SCORING.MARRIAGE_FAVORABLE_SIBSIN, '정재운 - 결혼에 유리'],
      ['편재', EVENT_SCORING.MARRIAGE_FAVORABLE_SIBSIN, '편재운 - 결혼에 유리'],
      ['정관', EVENT_SCORING.MARRIAGE_FAVORABLE_SIBSIN, '정관운 - 결혼에 유리'],
      ['편관', EVENT_SCORING.MARRIAGE_FAVORABLE_SIBSIN, '편관운 - 결혼에 유리'],
    ])('should add bonus for favorable sibsin: %s', (sibsin, expectedBonus, expectedReason) => {
      const context = createBaseContext({ sibsin });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);

      expect(result.score).toBe(50 + expectedBonus);
      expect(result.reasons).toContain(expectedReason);
    });

    it.each([
      ['겁재', EVENT_SCORING.MARRIAGE_UNFAVORABLE_SIBSIN, '겁재운 - 결혼에 불리'],
      ['양인', EVENT_SCORING.MARRIAGE_UNFAVORABLE_SIBSIN, '양인운 - 결혼에 불리'],
    ])('should subtract penalty for unfavorable sibsin: %s', (sibsin, expectedPenalty, expectedReason) => {
      const context = createBaseContext({ sibsin });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);

      expect(result.score).toBe(50 - expectedPenalty);
      expect(result.avoidReasons).toContain(expectedReason);
    });

    it('should not modify score for neutral sibsin', () => {
      const context = createBaseContext({ sibsin: '식신' });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);

      expect(result.score).toBe(50);
      expect(result.reasons).toHaveLength(0);
      expect(result.avoidReasons).toHaveLength(0);
    });
  });

  describe('applyTwelveStageBonus', () => {
    it.each([
      ['건록', '건록 - 에너지 상승기'],
      ['제왕', '제왕 - 에너지 상승기'],
      ['관대', '관대 - 에너지 상승기'],
      ['목욕', '목욕 - 에너지 상승기'],
    ])('should add bonus for favorable stage: %s', (stage, expectedReason) => {
      const context = createBaseContext({
        twelveStage: { stage, energy: 0.8 },
      });
      const result = createBaseResult();

      strategy.applyTwelveStageBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.CAREER_FAVORABLE_SIBSIN);
      expect(result.reasons).toContain(expectedReason);
    });

    it.each([
      ['사', '사 - 에너지 저하기'],
      ['묘', '묘 - 에너지 저하기'],
      ['절', '절 - 에너지 저하기'],
    ])('should subtract penalty for unfavorable stage: %s', (stage, expectedReason) => {
      const context = createBaseContext({
        twelveStage: { stage, energy: 0.2 },
      });
      const result = createBaseResult();

      strategy.applyTwelveStageBonus(context, result);

      expect(result.score).toBe(50 - EVENT_SCORING.CAREER_UNFAVORABLE_SIBSIN);
      expect(result.avoidReasons).toContain(expectedReason);
    });
  });

  describe('applyElementBonus', () => {
    it.each(['수', '금'] as const)('should add bonus for favorable element: %s', (element) => {
      const context = createBaseContext({ monthElement: element });
      const result = createBaseResult();

      strategy.applyElementBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.FAVORABLE_STAGE);
      expect(result.reasons).toContain(`${element} 기운 - 조화`);
    });

    it.each(['목', '화', '토'] as const)('should not add bonus for non-favorable element: %s', (element) => {
      const context = createBaseContext({ monthElement: element });
      const result = createBaseResult();

      strategy.applyElementBonus(context, result);

      expect(result.score).toBe(50);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('applyProgressionBonus', () => {
    it('should add bonus when venus is in Libra', () => {
      const context = createBaseContext({
        progression: {
          sun: { house: 5 },
          moon: { phase: 'Waxing' },
          venus: { sign: 'Libra' },
        },
      });
      const result = createBaseResult();

      strategy.applyProgressionBonus(context, result);

      expect(result.score).toBe(58); // 50 + 8
      expect(result.reasons).toContain('진행 금성 Libra - 관계 길');
    });

    it('should add bonus when venus is in Taurus', () => {
      const context = createBaseContext({
        progression: {
          sun: { house: 5 },
          moon: { phase: 'Waxing' },
          venus: { sign: 'Taurus' },
        },
      });
      const result = createBaseResult();

      strategy.applyProgressionBonus(context, result);

      expect(result.score).toBe(58); // 50 + 8
      expect(result.reasons).toContain('진행 금성 Taurus - 관계 길');
    });

    it('should add strong bonus for full moon phase', () => {
      const context = createBaseContext({
        progression: {
          sun: { house: 5 },
          moon: { phase: 'Full' },
          venus: { sign: 'Aries' },
        },
      });
      const result = createBaseResult();

      strategy.applyProgressionBonus(context, result);

      expect(result.score).toBe(60); // 50 + 10
      expect(result.reasons).toContain('진행 보름달 - 결실기');
    });

    it('should add bonus for new moon phase', () => {
      const context = createBaseContext({
        progression: {
          sun: { house: 5 },
          moon: { phase: 'New' },
          venus: { sign: 'Aries' },
        },
      });
      const result = createBaseResult();

      strategy.applyProgressionBonus(context, result);

      expect(result.score).toBe(56); // 50 + 6
      expect(result.reasons).toContain('진행 초승달 - 새 시작');
    });

    it('should stack multiple bonuses', () => {
      const context = createBaseContext({
        progression: {
          sun: { house: 5 },
          moon: { phase: 'Full' },
          venus: { sign: 'Libra' },
        },
      });
      const result = createBaseResult();

      strategy.applyProgressionBonus(context, result);

      expect(result.score).toBe(68); // 50 + 8 + 10
      expect(result.reasons).toHaveLength(2);
    });

    it('should not modify score when no progression data', () => {
      const context = createBaseContext();
      const result = createBaseResult();

      strategy.applyProgressionBonus(context, result);

      expect(result.score).toBe(50);
    });
  });

  describe('applyDaeunBonus', () => {
    it.each(['수', '금'] as const)('should add bonus for favorable daeun element: %s', (element) => {
      const context = createBaseContext({
        daeun: {
          stem: '갑',
          branch: '자',
          element,
          startAge: 25,
          endAge: 35,
        },
      });
      const result = createBaseResult();

      strategy.applyDaeunBonus(context, result);

      expect(result.score).toBe(60); // 50 + 10
      expect(result.reasons).toContain(`대운 ${element} - 결혼운 상승`);
    });

    it('should add daeun-solarTerm sync bonus', () => {
      const context = createBaseContext({
        daeun: {
          stem: '임',
          branch: '자',
          element: '수',
          startAge: 25,
          endAge: 35,
        },
        solarTerm: {
          name: 'winter-solstice',
          nameKo: '동지',
          element: '수',
        },
      });
      const result = createBaseResult();

      strategy.applyDaeunBonus(context, result);

      // 12 (daeun-solarTerm sync) + 10 (수 favorable for marriage)
      expect(result.score).toBe(72);
      expect(result.reasons).toContain('대운-절기 동기화 (수)');
      expect(result.reasons).toContain('대운 수 - 결혼운 상승');
    });

    it('should not add marriage bonus for non-favorable daeun element', () => {
      const context = createBaseContext({
        daeun: {
          stem: '갑',
          branch: '인',
          element: '목',
          startAge: 25,
          endAge: 35,
        },
      });
      const result = createBaseResult();

      strategy.applyDaeunBonus(context, result);

      expect(result.score).toBe(50);
      expect(result.reasons.filter(r => r.includes('결혼운'))).toHaveLength(0);
    });
  });
});
