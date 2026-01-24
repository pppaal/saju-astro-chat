/**
 * CareerStrategy Unit Tests
 * 커리어(취업/이직/승진) 시기 분석 전략 테스트
 */

import { describe, it, expect } from 'vitest';
import { CareerStrategy } from '@/lib/prediction/strategies/CareerStrategy';
import type { ScoringContext, ScoreResult } from '@/lib/prediction/strategies/types';
import { EVENT_SCORING } from '@/lib/prediction/constants/scoring';

describe('CareerStrategy', () => {
  const strategy = new CareerStrategy();

  const createBaseContext = (overrides: Partial<ScoringContext> = {}): ScoringContext => ({
    year: 2024,
    month: 6,
    age: 30,
    dayStem: '갑',
    dayBranch: '자',
    monthBranch: '오',
    yearBranch: '진',
    monthElement: '화',
    twelveStage: { stage: '건록', energy: 0.8 },
    sibsin: '정관',
    ...overrides,
  });

  const createBaseResult = (): ScoreResult => ({
    score: 50,
    reasons: [],
    avoidReasons: [],
  });

  describe('eventType', () => {
    it('should have eventType as "career"', () => {
      expect(strategy.eventType).toBe('career');
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
      ['정관', EVENT_SCORING.CAREER_FAVORABLE_SIBSIN, '정관운 - 커리어 발전'],
      ['편관', EVENT_SCORING.CAREER_FAVORABLE_SIBSIN, '편관운 - 커리어 발전'],
      ['정인', EVENT_SCORING.CAREER_FAVORABLE_SIBSIN, '정인운 - 커리어 발전'],
      ['편인', EVENT_SCORING.CAREER_FAVORABLE_SIBSIN, '편인운 - 커리어 발전'],
      ['식신', EVENT_SCORING.CAREER_FAVORABLE_SIBSIN, '식신운 - 커리어 발전'],
      ['상관', EVENT_SCORING.CAREER_FAVORABLE_SIBSIN, '상관운 - 커리어 발전'],
    ])('should add bonus for favorable sibsin: %s', (sibsin, expectedBonus, expectedReason) => {
      const context = createBaseContext({ sibsin });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);

      expect(result.score).toBe(50 + expectedBonus);
      expect(result.reasons).toContain(expectedReason);
    });

    it('should subtract penalty for unfavorable sibsin: 겁재', () => {
      const context = createBaseContext({ sibsin: '겁재' });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);

      expect(result.score).toBe(50 - EVENT_SCORING.CAREER_UNFAVORABLE_SIBSIN);
      expect(result.avoidReasons).toContain('겁재운 - 경쟁 심화');
    });

    it('should not modify score for neutral sibsin', () => {
      const context = createBaseContext({ sibsin: '비견' });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);

      expect(result.score).toBe(50);
      expect(result.reasons).toHaveLength(0);
      expect(result.avoidReasons).toHaveLength(0);
    });
  });

  describe('applyTwelveStageBonus', () => {
    it.each([
      ['관대', '관대 - 왕성한 활동기'],
      ['건록', '건록 - 왕성한 활동기'],
      ['제왕', '제왕 - 왕성한 활동기'],
      ['장생', '장생 - 왕성한 활동기'],
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
      ['사', '사 - 에너지 부족'],
      ['묘', '묘 - 에너지 부족'],
      ['절', '절 - 에너지 부족'],
      ['태', '태 - 에너지 부족'],
    ])('should subtract penalty for unfavorable stage: %s', (stage, expectedReason) => {
      const context = createBaseContext({
        twelveStage: { stage, energy: 0.2 },
      });
      const result = createBaseResult();

      strategy.applyTwelveStageBonus(context, result);

      expect(result.score).toBe(50 - EVENT_SCORING.CAREER_UNFAVORABLE_SIBSIN);
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
    it.each(['목', '화'] as const)('should add bonus for favorable element: %s', (element) => {
      const context = createBaseContext({ monthElement: element });
      const result = createBaseResult();

      strategy.applyElementBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.FAVORABLE_STAGE);
      expect(result.reasons).toContain(`${element} 기운 - 활동력 증가`);
    });

    it.each(['토', '금', '수'] as const)('should not add bonus for non-favorable element: %s', (element) => {
      const context = createBaseContext({ monthElement: element });
      const result = createBaseResult();

      strategy.applyElementBonus(context, result);

      expect(result.score).toBe(50);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('applyProgressionBonus', () => {
    it('should add bonus when sun is in 10th house (career house)', () => {
      const context = createBaseContext({
        progression: {
          sun: { house: 10 },
          moon: { phase: 'Waxing' },
          venus: { sign: 'Aries' },
        },
      });
      const result = createBaseResult();

      strategy.applyProgressionBonus(context, result);

      expect(result.score).toBe(60);
      expect(result.reasons).toContain('진행 태양 10하우스 - 커리어 상승');
    });

    it('should add bonus when sun is in 1st house (self house)', () => {
      const context = createBaseContext({
        progression: {
          sun: { house: 1 },
          moon: { phase: 'Waxing' },
          venus: { sign: 'Aries' },
        },
      });
      const result = createBaseResult();

      strategy.applyProgressionBonus(context, result);

      expect(result.score).toBe(60);
      expect(result.reasons).toContain('진행 태양 1하우스 - 커리어 상승');
    });

    it('should add bonus for full moon phase', () => {
      const context = createBaseContext({
        progression: {
          sun: { house: 5 },
          moon: { phase: 'Full' },
          venus: { sign: 'Aries' },
        },
      });
      const result = createBaseResult();

      strategy.applyProgressionBonus(context, result);

      expect(result.score).toBe(58);
      expect(result.reasons).toContain('진행 보름달 - 성과 결실기');
    });

    it('should stack bonuses for 10th house sun and full moon', () => {
      const context = createBaseContext({
        progression: {
          sun: { house: 10 },
          moon: { phase: 'Full' },
          venus: { sign: 'Aries' },
        },
      });
      const result = createBaseResult();

      strategy.applyProgressionBonus(context, result);

      expect(result.score).toBe(68); // 50 + 10 + 8
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
    it.each(['목', '화'] as const)('should add bonus for favorable daeun element: %s', (element) => {
      const context = createBaseContext({
        daeun: {
          stem: '갑',
          branch: '인',
          element,
          startAge: 25,
          endAge: 35,
        },
      });
      const result = createBaseResult();

      strategy.applyDaeunBonus(context, result);

      expect(result.score).toBe(62); // 50 + 12
      expect(result.reasons).toContain(`대운 ${element} - 커리어 확장기`);
    });

    it('should add daeun-solarTerm sync bonus', () => {
      const context = createBaseContext({
        daeun: {
          stem: '갑',
          branch: '인',
          element: '목',
          startAge: 25,
          endAge: 35,
        },
        solarTerm: {
          name: 'spring-equinox',
          nameKo: '춘분',
          element: '목',
        },
      });
      const result = createBaseResult();

      strategy.applyDaeunBonus(context, result);

      // 12 (daeun-solarTerm sync) + 12 (목 favorable for career)
      expect(result.score).toBe(74);
      expect(result.reasons).toContain('대운-절기 동기화 (목)');
      expect(result.reasons).toContain('대운 목 - 커리어 확장기');
    });

    it('should not modify score when no daeun data', () => {
      const context = createBaseContext();
      const result = createBaseResult();

      strategy.applyDaeunBonus(context, result);

      expect(result.score).toBe(50);
    });
  });

  describe('applyYongsinKisinBonus (inherited)', () => {
    it('should add bonus when month element matches yongsin', () => {
      const context = createBaseContext({
        monthElement: '화',
        yongsin: ['화', '토'],
      });
      const result = createBaseResult();

      strategy.applyYongsinKisinBonus(context, result);

      expect(result.score).toBe(65); // 50 + 15
      expect(result.reasons).toContain('용신 월');
    });

    it('should subtract penalty when month element matches kisin', () => {
      const context = createBaseContext({
        monthElement: '수',
        kisin: ['수', '금'],
      });
      const result = createBaseResult();

      strategy.applyYongsinKisinBonus(context, result);

      expect(result.score).toBe(38); // 50 - 12
      expect(result.avoidReasons).toContain('기신 월');
    });
  });

  describe('applySolarTermBonus (inherited)', () => {
    it('should add bonus when solar term element matches yongsin', () => {
      const context = createBaseContext({
        yongsin: ['화'],
        solarTerm: {
          name: 'summer-solstice',
          nameKo: '하지',
          element: '화',
        },
      });
      const result = createBaseResult();

      strategy.applySolarTermBonus(context, result);

      expect(result.score).toBe(58); // 50 + 8
      expect(result.reasons).toContain('절기 용신 활성 (화)');
    });

    it('should not modify score when no solar term data', () => {
      const context = createBaseContext({
        yongsin: ['화'],
      });
      const result = createBaseResult();

      strategy.applySolarTermBonus(context, result);

      expect(result.score).toBe(50);
    });
  });
});
