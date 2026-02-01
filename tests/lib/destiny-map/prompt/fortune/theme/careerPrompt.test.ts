import { describe, it, expect } from 'vitest';
import { buildCareerPrompt } from '@/lib/destiny-map/prompt/fortune/theme/careerPrompt';
import type { CombinedResult } from '@/lib/destiny-map/astrologyengine';

/**
 * Tests for career prompt generation
 * Validates prompt structure, content, and localization
 */

describe('destiny-map/prompt/fortune/theme/careerPrompt', () => {
  const mockData: CombinedResult = {
    dayMaster: { stem: '甲', element: '목', yinYang: '양' },
    analysisDate: '2024-01-15',
    userTimezone: 'Asia/Seoul',
    category: 'career',
  } as CombinedResult;

  describe('buildCareerPrompt', () => {
    it('should return a string prompt', () => {
      const result = buildCareerPrompt('ko', mockData);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include analysis date', () => {
      const result = buildCareerPrompt('ko', mockData);

      expect(result).toContain('Date: 2024-01-15');
    });

    it('should include timezone when provided', () => {
      const result = buildCareerPrompt('ko', mockData);

      expect(result).toContain('Asia/Seoul');
    });

    it('should handle missing timezone gracefully', () => {
      const dataWithoutTz = { ...mockData, userTimezone: undefined };
      const result = buildCareerPrompt('ko', dataWithoutTz);

      expect(result).toContain('Date:');
      expect(result).not.toContain('undefined');
    });

    it('should include locale information', () => {
      const result = buildCareerPrompt('ko', mockData);

      expect(result).toContain('Locale: ko');
    });

    it('should support Korean language', () => {
      const result = buildCareerPrompt('ko', mockData);

      expect(result).toContain('직업');
      expect(result).toContain('커리어');
    });

    it('should support English language', () => {
      const result = buildCareerPrompt('en', mockData);

      expect(result).toContain('career');
      expect(result).toContain('Locale: en');
    });

    it('should include task description', () => {
      const result = buildCareerPrompt('ko', mockData);

      expect(result).toContain('[TASK]');
      expect(result).toContain('분석');
    });

    it('should include required analysis sections', () => {
      const result = buildCareerPrompt('ko', mockData);

      // Core sections
      expect(result).toContain('직업 적성');
      expect(result).toContain('추천 직종');
      expect(result).toContain('사업 vs 직장');
      expect(result).toContain('성공 패턴');
      expect(result).toContain('타이밍');
    });

    it('should include analysis rules', () => {
      const result = buildCareerPrompt('ko', mockData);

      expect(result).toContain('[분석 규칙]');
      expect(result).toContain('근거');
    });

    it('should use current date when analysisDate is missing', () => {
      const dataWithoutDate = { ...mockData, analysisDate: undefined };
      const result = buildCareerPrompt('ko', dataWithoutDate);

      expect(result).toContain('Date:');
      // Should contain a valid date format (YYYY-MM-DD)
      expect(result).toMatch(/Date: \d{4}-\d{2}-\d{2}/);
    });

    it('should include structured format separators', () => {
      const result = buildCareerPrompt('ko', mockData);

      expect(result).toContain('═══');
    });

    it('should generate different content for different languages', () => {
      const koResult = buildCareerPrompt('ko', mockData);
      const enResult = buildCareerPrompt('en', mockData);

      expect(koResult).not.toBe(enResult);
      expect(koResult).toContain('Locale: ko');
      expect(enResult).toContain('Locale: en');
    });

    it('should handle useStructured parameter', () => {
      const structured = buildCareerPrompt('ko', mockData, true);
      const unstructured = buildCareerPrompt('ko', mockData, false);

      expect(typeof structured).toBe('string');
      expect(typeof unstructured).toBe('string');
    });

    it('should not contain undefined values in output', () => {
      const result = buildCareerPrompt('ko', mockData);

      expect(result).not.toContain('undefined');
      expect(result).not.toContain('null');
    });

    it('should include career-specific keywords', () => {
      const result = buildCareerPrompt('ko', mockData);

      expect(result).toContain('직업');
      expect(result).toContain('사업');
      expect(result).toContain('커리어');
    });

    it('should include actionable advice sections', () => {
      const result = buildCareerPrompt('ko', mockData);

      expect(result).toContain('조언');
      expect(result).toContain('액션');
    });

    it('should have minimum content length', () => {
      const result = buildCareerPrompt('ko', mockData);

      // Career prompt should be substantial
      expect(result.length).toBeGreaterThan(500);
    });

    it('should not have empty lines at start', () => {
      const result = buildCareerPrompt('ko', mockData);

      expect(result).not.toMatch(/^\n/);
    });

    it('should have proper section structure', () => {
      const result = buildCareerPrompt('ko', mockData);

      // Should have numbered sections
      expect(result).toMatch(/##\s+\d+\./);
    });
  });
});
