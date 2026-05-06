/**
 * Yongsin Analyzer Tests
 * 용신 분석기 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import { getYongsinAnalysis } from '@/components/destiny-map/free-report/analyzers/yongsinAnalyzer';
import type { SajuData } from '@/components/destiny-map/free-report/types';

// Mock elementTraits
vi.mock('@/components/destiny-map/free-report/data', () => ({
  elementTraits: {
    wood: { ko: '목', en: 'Wood', emoji: '🌿' },
    fire: { ko: '화', en: 'Fire', emoji: '🔥' },
    earth: { ko: '토', en: 'Earth', emoji: '🏔️' },
    metal: { ko: '금', en: 'Metal', emoji: '⚔️' },
    water: { ko: '수', en: 'Water', emoji: '💧' },
  },
}));

describe('getYongsinAnalysis', () => {
  const createSajuWithElements = (elements: Record<string, number>): SajuData => ({
    fiveElements: elements,
  } as unknown as SajuData);

  describe('basic functionality', () => {
    it('should identify weakest element as yongsin', () => {
      const saju = createSajuWithElements({
        wood: 30,
        fire: 25,
        earth: 20,
        metal: 15,
        water: 10,
      });

      const result = getYongsinAnalysis(saju, 'ko');

      expect(result).not.toBeNull();
      expect(result?.element).toContain('수');
    });

    it('should return null if no fiveElements', () => {
      const result = getYongsinAnalysis({} as SajuData, 'ko');
      expect(result).toBeNull();
    });

    it('should return null if saju is undefined', () => {
      const result = getYongsinAnalysis(undefined, 'ko');
      expect(result).toBeNull();
    });
  });

  describe('Korean output', () => {
    it('should return Korean title for yongsin', () => {
      const saju = createSajuWithElements({
        wood: 30,
        fire: 25,
        earth: 20,
        metal: 15,
        water: 10,
      });

      const result = getYongsinAnalysis(saju, 'ko');

      expect(result?.title).toBe('용신 (필요한 에너지)');
    });

    it('should return Korean element name', () => {
      const saju = createSajuWithElements({
        wood: 30,
        fire: 25,
        earth: 20,
        metal: 15,
        water: 10,
      });

      const result = getYongsinAnalysis(saju, 'ko');

      expect(result?.element).toBe('수 기운');
    });

    it('should include Korean why explanation with percentage', () => {
      const saju = createSajuWithElements({
        wood: 30,
        fire: 25,
        earth: 20,
        metal: 15,
        water: 10,
      });

      const result = getYongsinAnalysis(saju, 'ko');

      expect(result?.why).toContain('수');
      expect(result?.why).toContain('10%');
      expect(result?.why).toContain('부족');
    });

    it('should return Korean how-to-boost advice', () => {
      const saju = createSajuWithElements({
        wood: 10,
        fire: 25,
        earth: 25,
        metal: 20,
        water: 20,
      });

      const result = getYongsinAnalysis(saju, 'ko');

      expect(result?.how).toContain('녹색');
      expect(result?.how).toContain('산책');
    });
  });

  describe('English output', () => {
    it('should return English title for yongsin', () => {
      const saju = createSajuWithElements({
        wood: 30,
        fire: 25,
        earth: 20,
        metal: 15,
        water: 10,
      });

      const result = getYongsinAnalysis(saju, 'en');

      expect(result?.title).toBe('Yongsin (Needed Energy)');
    });

    it('should return English element name', () => {
      const saju = createSajuWithElements({
        wood: 30,
        fire: 25,
        earth: 20,
        metal: 15,
        water: 10,
      });

      const result = getYongsinAnalysis(saju, 'en');

      expect(result?.element).toBe('Water energy');
    });

    it('should include English why explanation with percentage', () => {
      const saju = createSajuWithElements({
        wood: 30,
        fire: 25,
        earth: 20,
        metal: 15,
        water: 10,
      });

      const result = getYongsinAnalysis(saju, 'en');

      expect(result?.why).toContain('Water');
      expect(result?.why).toContain('10%');
      expect(result?.why).toContain('low');
    });

    it('should return English how-to-boost advice', () => {
      const saju = createSajuWithElements({
        wood: 10,
        fire: 25,
        earth: 25,
        metal: 20,
        water: 20,
      });

      const result = getYongsinAnalysis(saju, 'en');

      expect(result?.how).toContain('Green');
      expect(result?.how).toContain('walks');
    });
  });

  describe('different weakest elements', () => {
    it('should handle wood as weakest element', () => {
      const saju = createSajuWithElements({
        wood: 5,
        fire: 25,
        earth: 25,
        metal: 25,
        water: 20,
      });

      const result = getYongsinAnalysis(saju, 'ko');

      expect(result?.element).toContain('목');
      expect(result?.how).toContain('녹색');
      expect(result?.emoji).toBe('🌿');
    });

    it('should handle fire as weakest element', () => {
      const saju = createSajuWithElements({
        wood: 25,
        fire: 5,
        earth: 25,
        metal: 25,
        water: 20,
      });

      const result = getYongsinAnalysis(saju, 'ko');

      expect(result?.element).toContain('화');
      expect(result?.how).toContain('붉은색');
      expect(result?.emoji).toBe('🔥');
    });

    it('should handle earth as weakest element', () => {
      const saju = createSajuWithElements({
        wood: 25,
        fire: 25,
        earth: 5,
        metal: 25,
        water: 20,
      });

      const result = getYongsinAnalysis(saju, 'ko');

      expect(result?.element).toContain('토');
      expect(result?.how).toContain('황토색');
      expect(result?.emoji).toBe('🏔️');
    });

    it('should handle metal as weakest element', () => {
      const saju = createSajuWithElements({
        wood: 25,
        fire: 25,
        earth: 25,
        metal: 5,
        water: 20,
      });

      const result = getYongsinAnalysis(saju, 'ko');

      expect(result?.element).toContain('금');
      expect(result?.how).toContain('흰색');
      expect(result?.emoji).toBe('⚔️');
    });

    it('should handle water as weakest element', () => {
      const saju = createSajuWithElements({
        wood: 25,
        fire: 25,
        earth: 25,
        metal: 20,
        water: 5,
      });

      const result = getYongsinAnalysis(saju, 'ko');

      expect(result?.element).toContain('수');
      expect(result?.how).toContain('검은색');
      expect(result?.emoji).toBe('💧');
    });
  });

  describe('edge cases', () => {
    it('should handle equal elements (first in sort order wins)', () => {
      const saju = createSajuWithElements({
        wood: 20,
        fire: 20,
        earth: 20,
        metal: 20,
        water: 20,
      });

      const result = getYongsinAnalysis(saju, 'ko');

      // Should not be null - one of them will be "weakest"
      expect(result).not.toBeNull();
    });

    it('should handle zero percentage', () => {
      const saju = createSajuWithElements({
        wood: 40,
        fire: 30,
        earth: 20,
        metal: 10,
        water: 0,
      });

      const result = getYongsinAnalysis(saju, 'ko');

      expect(result?.why).toContain('0%');
    });

    it('should handle single element', () => {
      const saju = createSajuWithElements({
        wood: 100,
      });

      const result = getYongsinAnalysis(saju, 'ko');

      expect(result).not.toBeNull();
      expect(result?.element).toContain('목');
    });
  });

  describe('return structure', () => {
    it('should have all required fields', () => {
      const saju = createSajuWithElements({
        wood: 30,
        fire: 25,
        earth: 20,
        metal: 15,
        water: 10,
      });

      const result = getYongsinAnalysis(saju, 'ko');

      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('element');
      expect(result).toHaveProperty('why');
      expect(result).toHaveProperty('how');
      expect(result).toHaveProperty('emoji');
    });
  });
});
