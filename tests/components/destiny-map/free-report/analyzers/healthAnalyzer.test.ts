/**
 * Health Analyzer Tests
 * 건강 분석 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHealthAnalysis } from '@/components/destiny-map/free-report/analyzers/healthAnalyzer';
import type { SajuData } from '@/components/destiny-map/free-report/types';

// Mock the data module
vi.mock('@/components/destiny-map/free-report/data', () => ({
  elementTraits: {
    wood: { ko: '목', en: 'Wood' },
    fire: { ko: '화', en: 'Fire' },
    earth: { ko: '토', en: 'Earth' },
    metal: { ko: '금', en: 'Metal' },
    water: { ko: '수', en: 'Water' },
  },
}));

describe('getHealthAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic analysis', () => {
    it('should return empty array if fiveElements is not available', () => {
      const result = getHealthAnalysis({} as SajuData, 'ko');
      expect(result).toEqual([]);
    });

    it('should return empty array if saju is undefined', () => {
      const result = getHealthAnalysis(undefined, 'ko');
      expect(result).toEqual([]);
    });

    it('should identify weak wood element health concerns', () => {
      const saju: SajuData = {
        fiveElements: { wood: 10, fire: 25, earth: 25, metal: 20, water: 20 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'ko');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].organ).toContain('간');
      expect(result[0].emoji).toBe('👁️');
      expect(result[0].advice).toContain('녹색 채소');
    });

    it('should identify weak fire element health concerns', () => {
      const saju: SajuData = {
        fiveElements: { wood: 25, fire: 10, earth: 25, metal: 20, water: 20 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'ko');

      expect(result.length).toBeGreaterThan(0);
      const fireRelated = result.find(r => r.organ.includes('심장'));
      expect(fireRelated).toBeDefined();
      expect(fireRelated?.emoji).toBe('❤️');
      expect(fireRelated?.advice).toContain('스트레스');
    });

    it('should identify weak earth element health concerns', () => {
      const saju: SajuData = {
        fiveElements: { wood: 25, fire: 25, earth: 10, metal: 20, water: 20 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'ko');

      expect(result.length).toBeGreaterThan(0);
      const earthRelated = result.find(r => r.organ.includes('위장'));
      expect(earthRelated).toBeDefined();
      expect(earthRelated?.advice).toContain('규칙적');
    });

    it('should identify weak metal element health concerns', () => {
      const saju: SajuData = {
        fiveElements: { wood: 25, fire: 25, earth: 20, metal: 10, water: 20 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'ko');

      expect(result.length).toBeGreaterThan(0);
      const metalRelated = result.find(r => r.organ.includes('폐'));
      expect(metalRelated).toBeDefined();
      expect(metalRelated?.advice).toContain('호흡기');
    });

    it('should identify weak water element health concerns', () => {
      const saju: SajuData = {
        fiveElements: { wood: 25, fire: 25, earth: 20, metal: 20, water: 10 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'ko');

      expect(result.length).toBeGreaterThan(0);
      const waterRelated = result.find(r => r.organ.includes('신장'));
      expect(waterRelated).toBeDefined();
      expect(waterRelated?.emoji).toBe('💧');
      expect(waterRelated?.advice).toContain('수분');
    });
  });

  describe('language support', () => {
    it('should return Korean text when lang is ko', () => {
      const saju: SajuData = {
        fiveElements: { wood: 10, fire: 25, earth: 25, metal: 20, water: 20 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'ko');

      expect(result[0].organ).toContain('간');
      expect(result[0].status).toContain('부족');
    });

    it('should return English text when lang is en', () => {
      const saju: SajuData = {
        fiveElements: { wood: 10, fire: 25, earth: 25, metal: 20, water: 20 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'en');

      expect(result[0].organ).toContain('Liver');
      expect(result[0].status).toContain('weak');
    });
  });

  describe('multiple weak elements', () => {
    it('should identify up to 2 weakest elements', () => {
      const saju: SajuData = {
        fiveElements: { wood: 5, fire: 10, earth: 25, metal: 30, water: 30 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'ko');

      expect(result.length).toBe(2);
      expect(result[0].organ).toContain('간'); // wood weakest
      expect(result[1].organ).toContain('심장'); // fire second weakest
    });

    it('should not include elements above 15% threshold', () => {
      const saju: SajuData = {
        fiveElements: { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'ko');

      expect(result.length).toBe(0);
    });
  });

  describe('threshold behavior', () => {
    it('should include elements at exactly 15%', () => {
      const saju: SajuData = {
        fiveElements: { wood: 15, fire: 25, earth: 25, metal: 20, water: 15 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'ko');

      expect(result.length).toBe(2);
    });

    it('should not include elements above 15%', () => {
      const saju: SajuData = {
        fiveElements: { wood: 16, fire: 21, earth: 21, metal: 21, water: 21 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'ko');

      expect(result.length).toBe(0);
    });
  });

  describe('status formatting', () => {
    it('should format status with element name and percentage in Korean', () => {
      const saju: SajuData = {
        fiveElements: { wood: 10, fire: 25, earth: 25, metal: 20, water: 20 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'ko');

      expect(result[0].status).toMatch(/목.*부족.*10%/);
    });

    it('should format status with element name and percentage in English', () => {
      const saju: SajuData = {
        fiveElements: { wood: 10, fire: 25, earth: 25, metal: 20, water: 20 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'en');

      expect(result[0].status).toMatch(/Wood.*weak.*10%/);
    });
  });

  describe('sorting', () => {
    it('should return weakest elements first', () => {
      const saju: SajuData = {
        fiveElements: { wood: 15, fire: 5, earth: 25, metal: 25, water: 30 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'ko');

      expect(result[0].organ).toContain('심장'); // fire at 5%
      expect(result[1].organ).toContain('간'); // wood at 15%
    });
  });

  describe('edge cases', () => {
    it('should handle zero values', () => {
      const saju: SajuData = {
        fiveElements: { wood: 0, fire: 25, earth: 25, metal: 25, water: 25 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'ko');

      expect(result.length).toBe(1);
      expect(result[0].organ).toContain('간');
    });

    it('should handle only one weak element', () => {
      const saju: SajuData = {
        fiveElements: { wood: 10, fire: 20, earth: 25, metal: 25, water: 20 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'ko');

      expect(result.length).toBe(1);
    });

    it('should handle all elements below threshold', () => {
      const saju: SajuData = {
        fiveElements: { wood: 10, fire: 10, earth: 10, metal: 10, water: 10 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'ko');

      // Should only return 2 (limited by Math.min(2, sorted.length))
      expect(result.length).toBe(2);
    });

    it('should handle single element in fiveElements', () => {
      const saju: SajuData = {
        fiveElements: { wood: 10 },
      } as unknown as SajuData;

      const result = getHealthAnalysis(saju, 'ko');

      expect(result.length).toBe(1);
    });
  });
});
