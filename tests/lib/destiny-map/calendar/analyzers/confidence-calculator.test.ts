/**
 * Tests for src/lib/destiny-map/calendar/analyzers/confidence-calculator.ts
 * 분석 신뢰도 계산 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  calculateConfidence,
  type ConfidenceInput,
} from '@/lib/destiny-map/calendar/analyzers/confidence-calculator';

describe('confidence-calculator', () => {
  const fullProfile = {
    pillars: {
      year: { stem: '甲', branch: '子' },
      month: { stem: '丙', branch: '寅' },
      day: { stem: '戊', branch: '辰' },
      time: { stem: '庚', branch: '午' },
    },
    daeunCycles: [{ age: 5, heavenlyStem: '甲', earthlyBranch: '子' }],
    yongsin: '水',
  } as any;

  describe('full profile with all data', () => {
    it('should return max confidence (100) for complete profile with cross-verification', () => {
      const input: ConfidenceInput = {
        sajuProfile: fullProfile,
        crossVerified: true,
      };

      const result = calculateConfidence(input);

      // base(60) + timePillar(15) + daeun(10) + yongsin(10) + crossVerified(5) = 100
      expect(result.confidence).toBe(100);
      expect(result.confidenceNote).toBe('완전한 분석');
    });

    it('should return 95 without cross-verification', () => {
      const input: ConfidenceInput = {
        sajuProfile: fullProfile,
        crossVerified: false,
      };

      const result = calculateConfidence(input);

      // base(60) + timePillar(15) + daeun(10) + yongsin(10) = 95
      expect(result.confidence).toBe(95);
      expect(result.confidenceNote).toBe('완전한 분석');
    });
  });

  describe('missing time pillar', () => {
    it('should subtract 15 and note missing time pillar', () => {
      const input: ConfidenceInput = {
        sajuProfile: {
          ...fullProfile,
          pillars: {
            year: { stem: '甲', branch: '子' },
            month: { stem: '丙', branch: '寅' },
            day: { stem: '戊', branch: '辰' },
            // no time pillar
          },
        },
        crossVerified: false,
      };

      const result = calculateConfidence(input);

      // base(60) + daeun(10) + yongsin(10) = 80
      expect(result.confidence).toBe(80);
      expect(result.confidenceNote).toContain('시주 없음');
    });
  });

  describe('missing daeun cycles', () => {
    it('should subtract 10 and note missing daeun', () => {
      const input: ConfidenceInput = {
        sajuProfile: {
          ...fullProfile,
          daeunCycles: [],
        },
        crossVerified: false,
      };

      const result = calculateConfidence(input);

      // base(60) + timePillar(15) + yongsin(10) = 85
      expect(result.confidence).toBe(85);
      expect(result.confidenceNote).toContain('대운 정보 없음');
    });

    it('should handle undefined daeun cycles', () => {
      const input: ConfidenceInput = {
        sajuProfile: {
          ...fullProfile,
          daeunCycles: undefined,
        },
        crossVerified: false,
      };

      const result = calculateConfidence(input);
      expect(result.confidence).toBe(85);
      expect(result.confidenceNote).toContain('대운 정보 없음');
    });
  });

  describe('missing yongsin', () => {
    it('should subtract 10 and note missing yongsin', () => {
      const input: ConfidenceInput = {
        sajuProfile: {
          ...fullProfile,
          yongsin: undefined,
        },
        crossVerified: false,
      };

      const result = calculateConfidence(input);

      // base(60) + timePillar(15) + daeun(10) = 85
      expect(result.confidence).toBe(85);
      expect(result.confidenceNote).toContain('용신 정보 없음');
    });
  });

  describe('minimal profile', () => {
    it('should return base confidence (60) with all limitations noted', () => {
      const input: ConfidenceInput = {
        sajuProfile: {
          pillars: {
            year: { stem: '甲', branch: '子' },
            month: { stem: '丙', branch: '寅' },
            day: { stem: '戊', branch: '辰' },
          },
        } as any,
        crossVerified: false,
      };

      const result = calculateConfidence(input);

      expect(result.confidence).toBe(60);
      expect(result.confidenceNote).toContain('시주 없음');
      expect(result.confidenceNote).toContain('대운 정보 없음');
      expect(result.confidenceNote).toContain('용신 정보 없음');
      expect(result.confidenceNote).toMatch(/^제한:/);
    });
  });

  describe('confidence capping', () => {
    it('should not exceed 100', () => {
      const input: ConfidenceInput = {
        sajuProfile: fullProfile,
        crossVerified: true,
      };

      const result = calculateConfidence(input);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('multiple missing fields', () => {
    it('should combine multiple limitation notes', () => {
      const input: ConfidenceInput = {
        sajuProfile: {
          pillars: {
            year: { stem: '甲', branch: '子' },
            month: { stem: '丙', branch: '寅' },
            day: { stem: '戊', branch: '辰' },
          },
          yongsin: undefined,
          daeunCycles: undefined,
        } as any,
        crossVerified: false,
      };

      const result = calculateConfidence(input);

      // All three limitations should be in the note, comma-separated
      const notes = result.confidenceNote.replace('제한: ', '').split(', ');
      expect(notes).toHaveLength(3);
    });
  });
});
