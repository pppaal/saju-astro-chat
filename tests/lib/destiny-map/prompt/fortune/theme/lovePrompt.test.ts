import { describe, it, expect } from 'vitest';
import { buildLovePrompt } from '@/lib/destiny-map/prompt/fortune/theme/lovePrompt';
import type { CombinedResult } from '@/lib/destiny-map/astrologyengine';

/**
 * Tests for love/relationship prompt generation
 * Validates romantic analysis prompt structure and content
 */

describe('destiny-map/prompt/fortune/theme/lovePrompt', () => {
  const mockData: CombinedResult = {
    dayMaster: { stem: '乙', element: '목', yinYang: '음' },
    analysisDate: '2024-02-14',
    userTimezone: 'Asia/Seoul',
    category: 'love',
  } as CombinedResult;

  describe('buildLovePrompt', () => {
    it('should return a string prompt', () => {
      const result = buildLovePrompt('ko', mockData);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include analysis date', () => {
      const result = buildLovePrompt('ko', mockData);

      expect(result).toContain('Date: 2024-02-14');
    });

    it('should include timezone information', () => {
      const result = buildLovePrompt('ko', mockData);

      expect(result).toContain('Asia/Seoul');
    });

    it('should handle missing timezone', () => {
      const dataWithoutTz = { ...mockData, userTimezone: undefined };
      const result = buildLovePrompt('ko', dataWithoutTz);

      expect(result).toContain('Date:');
      expect(result).not.toContain('undefined');
    });

    it('should include locale information', () => {
      const result = buildLovePrompt('ko', mockData);

      expect(result).toContain('Locale: ko');
    });

    it('should support Korean language', () => {
      const result = buildLovePrompt('ko', mockData);

      expect(result).toContain('연애');
      expect(result).toContain('배우자');
    });

    it('should support English language', () => {
      const result = buildLovePrompt('en', mockData);

      expect(result).toContain('love');
      expect(result).toContain('Locale: en');
    });

    it('should include task description', () => {
      const result = buildLovePrompt('ko', mockData);

      expect(result).toContain('[TASK]');
    });

    it('should include love-specific analysis sections', () => {
      const result = buildLovePrompt('ko', mockData);

      // Love/relationship specific content
      expect(result).toContain('연애');
      expect(result).toContain('배우자');
    });

    it('should include analysis rules', () => {
      const result = buildLovePrompt('ko', mockData);

      expect(result).toContain('[분석 규칙]');
    });

    it('should use current date when analysisDate is missing', () => {
      const dataWithoutDate = { ...mockData, analysisDate: undefined };
      const result = buildLovePrompt('ko', dataWithoutDate);

      expect(result).toContain('Date:');
      expect(result).toMatch(/Date: \d{4}-\d{2}-\d{2}/);
    });

    it('should include structured separators', () => {
      const result = buildLovePrompt('ko', mockData);

      expect(result).toContain('═══');
    });

    it('should generate different content for different languages', () => {
      const koResult = buildLovePrompt('ko', mockData);
      const enResult = buildLovePrompt('en', mockData);

      expect(koResult).not.toBe(enResult);
    });

    it('should handle useStructured parameter', () => {
      const structured = buildLovePrompt('ko', mockData, true);
      const unstructured = buildLovePrompt('ko', mockData, false);

      expect(typeof structured).toBe('string');
      expect(typeof unstructured).toBe('string');
    });

    it('should not contain undefined values', () => {
      const result = buildLovePrompt('ko', mockData);

      expect(result).not.toContain('undefined');
      expect(result).not.toContain('null');
    });

    it('should include love-specific keywords', () => {
      const result = buildLovePrompt('ko', mockData);

      expect(result).toContain('연애');
      expect(result).toContain('관계');
    });

    it('should have substantial content', () => {
      const result = buildLovePrompt('ko', mockData);

      expect(result.length).toBeGreaterThan(500);
    });

    it('should not have empty lines at start', () => {
      const result = buildLovePrompt('ko', mockData);

      expect(result).not.toMatch(/^\n/);
    });

    it('should include relationship guidance', () => {
      const result = buildLovePrompt('ko', mockData);

      // Should mention relationship aspects
      expect(result).toMatch(/연애|관계|배우자/);
    });
  });
});
