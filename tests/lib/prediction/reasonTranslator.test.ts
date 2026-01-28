/**
 * Tests for src/lib/prediction/reasonTranslator.ts
 * 사주 용어 → 사용자 친화적 설명 변환 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  translateReasons,
  REASON_TRANSLATIONS,
  COMMON_TRANSLATIONS,
} from '@/lib/prediction/reasonTranslator';

describe('reasonTranslator', () => {
  describe('REASON_TRANSLATIONS', () => {
    it('should have event type categories', () => {
      expect(REASON_TRANSLATIONS).toHaveProperty('investment');
      expect(REASON_TRANSLATIONS).toHaveProperty('marriage');
      expect(REASON_TRANSLATIONS).toHaveProperty('career');
      expect(REASON_TRANSLATIONS).toHaveProperty('study');
      expect(REASON_TRANSLATIONS).toHaveProperty('move');
      expect(REASON_TRANSLATIONS).toHaveProperty('health');
      expect(REASON_TRANSLATIONS).toHaveProperty('relationship');
    });

    it('should have translations for each category', () => {
      for (const category of Object.keys(REASON_TRANSLATIONS)) {
        expect(Object.keys(REASON_TRANSLATIONS[category]).length).toBeGreaterThan(0);
      }
    });
  });

  describe('COMMON_TRANSLATIONS', () => {
    it('should have 12운성 translations', () => {
      expect(COMMON_TRANSLATIONS).toHaveProperty('건록 - 에너지 상승기');
      expect(COMMON_TRANSLATIONS).toHaveProperty('제왕 - 에너지 상승기');
    });

    it('should have 오행 translations', () => {
      expect(COMMON_TRANSLATIONS).toHaveProperty('화 기운 - 조화');
      expect(COMMON_TRANSLATIONS).toHaveProperty('수 기운 - 조화');
      expect(COMMON_TRANSLATIONS).toHaveProperty('목 기운 - 조화');
    });

    it('should have 용신 translations', () => {
      expect(COMMON_TRANSLATIONS).toHaveProperty('용신 월');
      expect(COMMON_TRANSLATIONS).toHaveProperty('용신일');
    });
  });

  describe('translateReasons', () => {
    it('should translate event-specific reasons first', () => {
      const result = translateReasons(['정재운'], 'investment');
      expect(result[0]).toBe('💰 재물운이 안정되어 재테크하기 좋은 시기');
    });

    it('should translate same reason differently per event type', () => {
      const investResult = translateReasons(['정재운'], 'investment');
      const marriageResult = translateReasons(['정재운'], 'marriage');
      const careerResult = translateReasons(['정재운'], 'career');

      expect(investResult[0]).toContain('재물운');
      expect(marriageResult[0]).toContain('만남');
      expect(careerResult[0]).toContain('급여');
    });

    it('should fall back to COMMON_TRANSLATIONS', () => {
      const result = translateReasons(['용신 월'], 'investment');
      expect(result[0]).toBe('⭐ 당신에게 가장 유리한 기운의 달');
    });

    it('should try partial match for common translations', () => {
      const result = translateReasons(['건록'], 'investment');
      expect(result[0]).toContain('에너지');
    });

    it('should handle 육합/삼합 with element', () => {
      const result = translateReasons(['육합 - 화 기운 활성화'], 'career');
      expect(result[0]).toContain('열정');
    });

    it('should handle 육합/삼합 with 수 element', () => {
      const result = translateReasons(['삼합 - 수 기운 조화'], 'career');
      expect(result[0]).toContain('지혜');
    });

    it('should handle 육합/삼합 without recognized element', () => {
      const result = translateReasons(['육합 결합'], 'career');
      expect(result[0]).toBe('✨ 긍정적인 기운 결합');
    });

    it('should handle 절기 reasons', () => {
      const result = translateReasons(['절기 변화'], 'career');
      expect(result[0]).toBe('🌸 계절 에너지와 조화');
    });

    it('should fall back with ✨ prefix for unknown reasons', () => {
      const result = translateReasons(['알 수 없는 용어'], 'career');
      expect(result[0]).toBe('✨ 알 수 없는 용어');
    });

    it('should strip ✦ prefix from unknown reasons', () => {
      const result = translateReasons(['✦ 특수한 이유'], 'career');
      expect(result[0]).toBe('✨ 특수한 이유');
    });

    it('should handle multiple reasons', () => {
      const result = translateReasons(
        ['정관운', '용신 월', '절기 춘분'],
        'career'
      );
      expect(result).toHaveLength(3);
      expect(result[0]).toContain('승진');
      expect(result[1]).toContain('유리한 기운');
      expect(result[2]).toContain('계절');
    });

    it('should handle empty reasons array', () => {
      const result = translateReasons([], 'career');
      expect(result).toEqual([]);
    });

    it('should handle unknown event type gracefully', () => {
      const result = translateReasons(['용신 월'], 'unknown_type');
      // Should fall back to common translations
      expect(result[0]).toBe('⭐ 당신에게 가장 유리한 기운의 달');
    });

    it('should match partial event-specific keys', () => {
      const result = translateReasons(['정재운 상승'], 'investment');
      // includes('정재운') should match
      expect(result[0]).toBe('💰 재물운이 안정되어 재테크하기 좋은 시기');
    });

    it('should handle study event type', () => {
      const result = translateReasons(['정인운'], 'study');
      expect(result[0]).toContain('학습');
    });

    it('should handle move event type', () => {
      const result = translateReasons(['역마'], 'move');
      expect(result[0]).toContain('이동');
    });

    it('should handle health event type', () => {
      const result = translateReasons(['식신운'], 'health');
      expect(result[0]).toContain('체력');
    });

    it('should handle 육합 with 목 element', () => {
      const result = translateReasons(['육합 - 목 기운 합'], 'career');
      expect(result[0]).toContain('성장');
    });

    it('should handle 삼합 with 금 element', () => {
      const result = translateReasons(['삼합 - 금 기운 결합'], 'career');
      expect(result[0]).toContain('결단');
    });

    it('should handle 육합 with 토 element', () => {
      const result = translateReasons(['육합 - 토 기운 안정'], 'career');
      expect(result[0]).toContain('안정');
    });

    it('should handle 삼합 with unrecognized element', () => {
      const result = translateReasons(['삼합 - 공 기운 결합'], 'career');
      expect(result[0]).toContain('공 기운 활성화');
    });
  });
});
