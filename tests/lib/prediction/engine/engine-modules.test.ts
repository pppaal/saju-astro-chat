/**
 * @file Tests for prediction/engine modules
 * 커버리지 향상을 위한 engine 모듈 테스트
 */

import { describe, it, expect } from 'vitest';

describe('Prediction Engine Modules', () => {
  describe('constants.ts', () => {
    it('should export STEMS', async () => {
      const { STEMS } = await import('@/lib/prediction/engine/constants');
      expect(STEMS).toBeDefined();
      expect(STEMS).toHaveLength(10);
      expect(STEMS).toContain('甲');
      expect(STEMS).toContain('癸');
    });

    it('should export BRANCHES', async () => {
      const { BRANCHES } = await import('@/lib/prediction/engine/constants');
      expect(BRANCHES).toBeDefined();
      expect(BRANCHES).toHaveLength(12);
      expect(BRANCHES).toContain('子');
      expect(BRANCHES).toContain('亥');
    });

    it('should export STEM_ELEMENT mapping', async () => {
      const { STEM_ELEMENT } = await import('@/lib/prediction/engine/constants');
      expect(STEM_ELEMENT).toBeDefined();
      expect(STEM_ELEMENT['甲']).toBe('목');
      expect(STEM_ELEMENT['丙']).toBe('화');
      expect(STEM_ELEMENT['戊']).toBe('토');
      expect(STEM_ELEMENT['庚']).toBe('금');
      expect(STEM_ELEMENT['壬']).toBe('수');
    });

    it('should export EVENT_FAVORABLE_CONDITIONS for all event types', async () => {
      const { EVENT_FAVORABLE_CONDITIONS } = await import('@/lib/prediction/engine/constants');
      expect(EVENT_FAVORABLE_CONDITIONS).toBeDefined();

      const eventTypes = ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'];
      for (const eventType of eventTypes) {
        const condition = EVENT_FAVORABLE_CONDITIONS[eventType as keyof typeof EVENT_FAVORABLE_CONDITIONS];
        expect(condition).toBeDefined();
        expect(condition.favorableSibsin).toBeDefined();
        expect(condition.favorableStages).toBeDefined();
        expect(condition.favorableElements).toBeDefined();
        expect(condition.avoidSibsin).toBeDefined();
        expect(condition.avoidStages).toBeDefined();
      }
    });

    it('should have correct marriage favorable conditions', async () => {
      const { EVENT_FAVORABLE_CONDITIONS } = await import('@/lib/prediction/engine/constants');
      const marriage = EVENT_FAVORABLE_CONDITIONS.marriage;
      expect(marriage.favorableSibsin).toContain('정관');
      expect(marriage.favorableSibsin).toContain('정재');
      expect(marriage.avoidSibsin).toContain('겁재');
      expect(marriage.favorableStages).toContain('건록');
    });

    it('should have correct career favorable conditions', async () => {
      const { EVENT_FAVORABLE_CONDITIONS } = await import('@/lib/prediction/engine/constants');
      const career = EVENT_FAVORABLE_CONDITIONS.career;
      expect(career.favorableSibsin).toContain('정관');
      expect(career.favorableSibsin).toContain('편관');
      expect(career.favorableElements).toContain('금');
    });

    it('should export ASTRO_EVENT_CONDITIONS for all event types', async () => {
      const { ASTRO_EVENT_CONDITIONS } = await import('@/lib/prediction/engine/constants');
      expect(ASTRO_EVENT_CONDITIONS).toBeDefined();

      const eventTypes = ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'];
      for (const eventType of eventTypes) {
        const condition = ASTRO_EVENT_CONDITIONS[eventType as keyof typeof ASTRO_EVENT_CONDITIONS];
        expect(condition).toBeDefined();
        expect(condition.favorableSigns).toBeDefined();
        expect(condition.keyPlanets).toBeDefined();
        expect(condition.favorableHouses).toBeDefined();
        expect(condition.avoidRetrogrades).toBeDefined();
        expect(condition.moonPhaseBonus).toBeDefined();
      }
    });

    it('should have correct marriage astro conditions', async () => {
      const { ASTRO_EVENT_CONDITIONS } = await import('@/lib/prediction/engine/constants');
      const marriage = ASTRO_EVENT_CONDITIONS.marriage;
      expect(marriage.favorableSigns).toContain('Libra');
      expect(marriage.keyPlanets).toContain('Venus');
      expect(marriage.favorableHouses).toContain(7);
      expect(marriage.avoidRetrogrades).toContain('Venus');
      expect(marriage.moonPhaseBonus['full_moon']).toBe(8);
    });

    it('should have correct investment astro conditions', async () => {
      const { ASTRO_EVENT_CONDITIONS } = await import('@/lib/prediction/engine/constants');
      const investment = ASTRO_EVENT_CONDITIONS.investment;
      expect(investment.favorableSigns).toContain('Taurus');
      expect(investment.keyPlanets).toContain('Jupiter');
      expect(investment.favorableHouses).toContain(2);
    });
  });

  describe('index.ts exports', () => {
    it('should re-export types', async () => {
      const exports = await import('@/lib/prediction/engine');
      expect(exports).toBeDefined();
    });

    it('should re-export constants', async () => {
      const { STEMS, BRANCHES, STEM_ELEMENT } = await import('@/lib/prediction/engine');
      expect(STEMS).toBeDefined();
      expect(BRANCHES).toBeDefined();
      expect(STEM_ELEMENT).toBeDefined();
    });

    it('should re-export EVENT_FAVORABLE_CONDITIONS', async () => {
      const { EVENT_FAVORABLE_CONDITIONS } = await import('@/lib/prediction/engine');
      expect(EVENT_FAVORABLE_CONDITIONS).toBeDefined();
      expect(EVENT_FAVORABLE_CONDITIONS.marriage).toBeDefined();
    });

    it('should re-export ASTRO_EVENT_CONDITIONS', async () => {
      const { ASTRO_EVENT_CONDITIONS } = await import('@/lib/prediction/engine');
      expect(ASTRO_EVENT_CONDITIONS).toBeDefined();
      expect(ASTRO_EVENT_CONDITIONS.career).toBeDefined();
    });

    it('should re-export main functions from lifePredictionEngine', async () => {
      const {
        analyzeMultiYearTrend,
        analyzePastDate,
        findOptimalEventTiming,
        findWeeklyOptimalTiming,
        generateComprehensivePrediction,
        generateLifePredictionPromptContext,
      } = await import('@/lib/prediction/engine');

      expect(analyzeMultiYearTrend).toBeDefined();
      expect(typeof analyzeMultiYearTrend).toBe('function');
      expect(analyzePastDate).toBeDefined();
      expect(typeof analyzePastDate).toBe('function');
      expect(findOptimalEventTiming).toBeDefined();
      expect(typeof findOptimalEventTiming).toBe('function');
      expect(findWeeklyOptimalTiming).toBeDefined();
      expect(typeof findWeeklyOptimalTiming).toBe('function');
      expect(generateComprehensivePrediction).toBeDefined();
      expect(typeof generateComprehensivePrediction).toBe('function');
      expect(generateLifePredictionPromptContext).toBeDefined();
      expect(typeof generateLifePredictionPromptContext).toBe('function');
    });

    it('should re-export convertSajuDaeunToInfo', async () => {
      const { convertSajuDaeunToInfo } = await import('@/lib/prediction/engine');
      expect(convertSajuDaeunToInfo).toBeDefined();
      expect(typeof convertSajuDaeunToInfo).toBe('function');
    });

    it('should re-export prompt context generators', async () => {
      const {
        generateEventTimingPromptContext,
        generatePastAnalysisPromptContext,
      } = await import('@/lib/prediction/engine');

      expect(generateEventTimingPromptContext).toBeDefined();
      expect(typeof generateEventTimingPromptContext).toBe('function');
      expect(generatePastAnalysisPromptContext).toBeDefined();
      expect(typeof generatePastAnalysisPromptContext).toBe('function');
    });
  });

  describe('types.ts', () => {
    it('should export type definitions (compile-time check)', async () => {
      // Type imports are checked at compile time
      // This test ensures the module loads without errors
      const types = await import('@/lib/prediction/engine/types');
      expect(types).toBeDefined();
    });
  });
});