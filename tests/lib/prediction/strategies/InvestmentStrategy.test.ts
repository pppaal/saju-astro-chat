/**
 * InvestmentStrategy Unit Tests
 * 투자 시기 분석 전략 테스트
 */

import { describe, it, expect } from 'vitest';
import { InvestmentStrategy } from '@/lib/prediction/strategies/InvestmentStrategy';
import type { ScoringContext, ScoreResult } from '@/lib/prediction/strategies/types';
import { EVENT_SCORING } from '@/lib/prediction/constants/scoring';

describe('InvestmentStrategy', () => {
  const strategy = new InvestmentStrategy();

  const createBaseContext = (overrides: Partial<ScoringContext> = {}): ScoringContext => ({
    year: 2024,
    month: 6,
    age: 35,
    dayStem: '갑',
    dayBranch: '자',
    monthBranch: '오',
    yearBranch: '진',
    monthElement: '토',
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
    it('should have eventType as "investment"', () => {
      expect(strategy.eventType).toBe('investment');
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
      ['정재', EVENT_SCORING.BUSINESS_FAVORABLE, '정재운 - 재물운 상승'],
      ['편재', EVENT_SCORING.BUSINESS_FAVORABLE, '편재운 - 재물운 상승'],
      ['식신', EVENT_SCORING.BUSINESS_FAVORABLE, '식신운 - 재물운 상승'],
    ])('should add bonus for favorable sibsin: %s', (sibsin, expectedBonus, expectedReason) => {
      const context = createBaseContext({ sibsin });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);

      expect(result.score).toBe(50 + expectedBonus);
      expect(result.reasons).toContain(expectedReason);
    });

    it.each([
      ['겁재', EVENT_SCORING.BUSINESS_UNFAVORABLE, '겁재운 - 재물 손실 주의'],
      ['양인', EVENT_SCORING.BUSINESS_UNFAVORABLE, '양인운 - 재물 손실 주의'],
    ])('should subtract penalty for unfavorable sibsin: %s', (sibsin, expectedPenalty, expectedReason) => {
      const context = createBaseContext({ sibsin });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);

      expect(result.score).toBe(50 - expectedPenalty);
      expect(result.avoidReasons).toContain(expectedReason);
    });

    it('should not modify score for neutral sibsin', () => {
      const context = createBaseContext({ sibsin: '정관' });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);

      expect(result.score).toBe(50);
      expect(result.reasons).toHaveLength(0);
      expect(result.avoidReasons).toHaveLength(0);
    });
  });

  describe('applyTwelveStageBonus', () => {
    it.each([
      ['건록', '건록 - 재물 증식기'],
      ['제왕', '제왕 - 재물 증식기'],
      ['관대', '관대 - 재물 증식기'],
    ])('should add bonus for favorable stage: %s', (stage, expectedReason) => {
      const context = createBaseContext({
        twelveStage: { stage, energy: 0.8 },
      });
      const result = createBaseResult();

      strategy.applyTwelveStageBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.BUSINESS_FAVORABLE);
      expect(result.reasons).toContain(expectedReason);
    });

    it.each([
      ['사', '사 - 투자 위험'],
      ['묘', '묘 - 투자 위험'],
      ['절', '절 - 투자 위험'],
    ])('should subtract penalty for unfavorable stage: %s', (stage, expectedReason) => {
      const context = createBaseContext({
        twelveStage: { stage, energy: 0.2 },
      });
      const result = createBaseResult();

      strategy.applyTwelveStageBonus(context, result);

      expect(result.score).toBe(50 - EVENT_SCORING.BUSINESS_UNFAVORABLE);
      expect(result.avoidReasons).toContain(expectedReason);
    });

    it('should not modify score for neutral stage', () => {
      const context = createBaseContext({
        twelveStage: { stage: '양', energy: 0.5 },
      });
      const result = createBaseResult();

      strategy.applyTwelveStageBonus(context, result);

      expect(result.score).toBe(50);
    });
  });

  describe('applyElementBonus', () => {
    it.each(['토', '금'] as const)('should add bonus for favorable element: %s', (element) => {
      const context = createBaseContext({ monthElement: element });
      const result = createBaseResult();

      strategy.applyElementBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.FAVORABLE_STAGE);
      expect(result.reasons).toContain(`${element} 기운 - 안정적 수익`);
    });

    it.each(['목', '화', '수'] as const)('should not add bonus for non-favorable element: %s', (element) => {
      const context = createBaseContext({ monthElement: element });
      const result = createBaseResult();

      strategy.applyElementBonus(context, result);

      expect(result.score).toBe(50);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('applyProgressionBonus (inherited default)', () => {
    it('should not modify score (no override in InvestmentStrategy)', () => {
      const context = createBaseContext({
        progression: {
          sun: { house: 10 },
          moon: { phase: 'Full' },
          venus: { sign: 'Libra' },
        },
      });
      const result = createBaseResult();

      strategy.applyProgressionBonus(context, result);

      expect(result.score).toBe(50);
    });
  });

  describe('applyDaeunBonus (inherited default)', () => {
    it('should add daeun-solarTerm sync bonus only', () => {
      const context = createBaseContext({
        daeun: {
          stem: '기',
          branch: '축',
          element: '토',
          startAge: 30,
          endAge: 40,
        },
        solarTerm: {
          name: 'grain-rain',
          nameKo: '곡우',
          element: '토',
        },
      });
      const result = createBaseResult();

      strategy.applyDaeunBonus(context, result);

      expect(result.score).toBe(62); // 50 + 12 (daeun-solarTerm sync)
      expect(result.reasons).toContain('대운-절기 동기화 (토)');
    });

    it('should not modify score when no daeun data', () => {
      const context = createBaseContext();
      const result = createBaseResult();

      strategy.applyDaeunBonus(context, result);

      expect(result.score).toBe(50);
    });
  });

  describe('combined scoring scenarios', () => {
    it('should calculate high score for optimal investment conditions', () => {
      const context = createBaseContext({
        sibsin: '정재',
        twelveStage: { stage: '제왕', energy: 1.0 },
        monthElement: '금',
        yongsin: ['금'],
      });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);
      strategy.applyTwelveStageBonus(context, result);
      strategy.applyElementBonus(context, result);
      strategy.applyYongsinKisinBonus(context, result);

      // 50 + 10 (sibsin) + 10 (stage) + 8 (element) + 15 (yongsin)
      expect(result.score).toBe(93);
      expect(result.reasons.length).toBeGreaterThanOrEqual(4);
    });

    it('should calculate low score for risky investment conditions', () => {
      const context = createBaseContext({
        sibsin: '겁재',
        twelveStage: { stage: '절', energy: 0.1 },
        monthElement: '화',
        kisin: ['화'],
      });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);
      strategy.applyTwelveStageBonus(context, result);
      strategy.applyElementBonus(context, result);
      strategy.applyYongsinKisinBonus(context, result);

      // 50 - 10 (sibsin) - 10 (stage) - 12 (kisin)
      expect(result.score).toBe(18);
      expect(result.avoidReasons.length).toBeGreaterThanOrEqual(3);
    });
  });
});
