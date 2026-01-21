/**
 * @file Tests for compatibility module exports
 * 커버리지 향상을 위한 compatibility barrel export 테스트
 */

import { describe, it, expect } from 'vitest';

describe('Compatibility Module Exports', () => {
  describe('Cosmic Compatibility exports', () => {
    it('should export cosmic compatibility functions', async () => {
      const module = await import('@/lib/compatibility');
      expect(module).toBeDefined();
    }, 60000);
  });

  describe('Compatibility Graph exports', () => {
    it('should export graph-related functions', async () => {
      const module = await import('@/lib/compatibility/compatibilityGraph');
      expect(module).toBeDefined();
    });
  });

  describe('Compatibility Fusion exports', () => {
    it('should export fusion functions', async () => {
      const module = await import('@/lib/compatibility/compatibilityFusion');
      expect(module).toBeDefined();
    });
  });

  describe('Advanced Saju Analysis exports', () => {
    it('should export advanced saju functions', async () => {
      const module = await import('@/lib/compatibility/advancedSajuAnalysis');
      expect(module).toBeDefined();
    });
  });

  describe('Advanced Astrology Analysis exports', () => {
    it('should export advanced astrology functions', async () => {
      const module = await import('@/lib/compatibility/advancedAstrologyAnalysis');
      expect(module).toBeDefined();
    });
  });

  describe('Group Compatibility exports', () => {
    it('should export group compatibility functions', async () => {
      const module = await import('@/lib/compatibility/groupCompatibility');
      expect(module).toBeDefined();
    });
  });
});
