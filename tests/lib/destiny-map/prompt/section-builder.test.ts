import { describe, it, expect } from 'vitest';
import {
  createSectionHeader,
  createSectionDivider,
  wrapInSection,
  createSubsectionTitle,
} from '@/lib/destiny-map/prompt/section-builder';

describe('section-builder', () => {
  const SEPARATOR = '═══════════════════════════════════════════════════════════════';

  describe('createSectionHeader', () => {
    it('should create header with Korean title when lang is ko', () => {
      const result = createSectionHeader('한국어 제목', 'English Title', 'ko');

      expect(result).toBe(`${SEPARATOR}\n한국어 제목\n${SEPARATOR}`);
    });

    it('should create header with English title when lang is en', () => {
      const result = createSectionHeader('한국어 제목', 'English Title', 'en');

      expect(result).toBe(`${SEPARATOR}\nEnglish Title\n${SEPARATOR}`);
    });

    it('should default to English for unknown lang', () => {
      const result = createSectionHeader('한국어 제목', 'English Title', 'fr');

      expect(result).toBe(`${SEPARATOR}\nEnglish Title\n${SEPARATOR}`);
    });

    it('should include separator lines', () => {
      const result = createSectionHeader('제목', 'Title', 'ko');

      expect(result).toContain(SEPARATOR);
      expect(result.split(SEPARATOR).length).toBe(3); // separator appears twice
    });

    it('should handle empty titles', () => {
      const result = createSectionHeader('', '', 'ko');

      expect(result).toBe(`${SEPARATOR}\n\n${SEPARATOR}`);
    });

    it('should handle special characters in titles', () => {
      const result = createSectionHeader('제목 [특수]', 'Title [Special]', 'ko');

      expect(result).toContain('제목 [특수]');
    });
  });

  describe('createSectionDivider', () => {
    it('should return separator line', () => {
      const result = createSectionDivider();

      expect(result).toBe(SEPARATOR);
    });

    it('should be consistent across calls', () => {
      const result1 = createSectionDivider();
      const result2 = createSectionDivider();

      expect(result1).toBe(result2);
    });

    it('should have correct length', () => {
      const result = createSectionDivider();

      expect(result.length).toBe(63);
    });
  });

  describe('wrapInSection', () => {
    it('should wrap content with Korean header', () => {
      const result = wrapInSection('한국어 제목', 'English Title', 'ko', 'Content here');

      expect(result).toContain('한국어 제목');
      expect(result).toContain('Content here');
      expect(result).toContain(SEPARATOR);
    });

    it('should wrap content with English header', () => {
      const result = wrapInSection('한국어 제목', 'English Title', 'en', 'Content here');

      expect(result).toContain('English Title');
      expect(result).toContain('Content here');
      expect(result).toContain(SEPARATOR);
    });

    it('should start with newline', () => {
      const result = wrapInSection('제목', 'Title', 'ko', 'Content');

      expect(result.startsWith('\n')).toBe(true);
    });

    it('should end with newline', () => {
      const result = wrapInSection('제목', 'Title', 'ko', 'Content');

      expect(result.endsWith('\n')).toBe(true);
    });

    it('should handle multiline content', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const result = wrapInSection('제목', 'Title', 'ko', content);

      expect(result).toContain('Line 1\nLine 2\nLine 3');
    });

    it('should handle empty content', () => {
      const result = wrapInSection('제목', 'Title', 'ko', '');

      expect(result).toContain(SEPARATOR);
      expect(result).toContain('제목');
    });

    it('should preserve content formatting', () => {
      const content = '  Indented\n    More indented';
      const result = wrapInSection('제목', 'Title', 'ko', content);

      expect(result).toContain('  Indented');
      expect(result).toContain('    More indented');
    });
  });

  describe('createSubsectionTitle', () => {
    it('should create subsection with Korean title when lang is ko', () => {
      const result = createSubsectionTitle('소제목', 'Subtitle', 'ko');

      expect(result).toBe('--- 소제목 ---');
    });

    it('should create subsection with English title when lang is en', () => {
      const result = createSubsectionTitle('소제목', 'Subtitle', 'en');

      expect(result).toBe('--- Subtitle ---');
    });

    it('should use dashes as delimiters', () => {
      const result = createSubsectionTitle('제목', 'Title', 'ko');

      expect(result.startsWith('---')).toBe(true);
      expect(result.endsWith('---')).toBe(true);
    });

    it('should have spaces around title', () => {
      const result = createSubsectionTitle('제목', 'Title', 'ko');

      expect(result).toBe('--- 제목 ---');
    });

    it('should handle empty titles', () => {
      const result = createSubsectionTitle('', '', 'ko');

      expect(result).toBe('---  ---');
    });

    it('should handle long titles', () => {
      const longTitle = '매우 긴 제목입니다. 정말 긴 제목입니다.';
      const result = createSubsectionTitle(longTitle, 'Long Title', 'ko');

      expect(result).toContain(longTitle);
      expect(result.startsWith('---')).toBe(true);
      expect(result.endsWith('---')).toBe(true);
    });

    it('should default to English for unknown lang', () => {
      const result = createSubsectionTitle('소제목', 'Subtitle', 'unknown');

      expect(result).toBe('--- Subtitle ---');
    });
  });

  describe('integration', () => {
    it('should combine header and divider correctly', () => {
      const header = createSectionHeader('제목', 'Title', 'ko');
      const divider = createSectionDivider();

      expect(header).toContain(divider);
    });

    it('should create nested sections', () => {
      const outerSection = wrapInSection('외부', 'Outer', 'ko', '내용');
      const subsection = createSubsectionTitle('내부', 'Inner', 'ko');

      expect(outerSection).toContain(SEPARATOR);
      expect(subsection).toContain('---');
    });

    it('should build complex multi-section content', () => {
      const section1 = wrapInSection('섹션 1', 'Section 1', 'ko', 'Content 1');
      const section2 = wrapInSection('섹션 2', 'Section 2', 'ko', 'Content 2');
      const combined = section1 + section2;

      expect(combined).toContain('섹션 1');
      expect(combined).toContain('섹션 2');
      expect(combined).toContain('Content 1');
      expect(combined).toContain('Content 2');
    });
  });
});
