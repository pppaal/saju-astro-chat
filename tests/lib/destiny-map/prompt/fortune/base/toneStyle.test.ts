/**
 * Tone Style Tests
 * Tests for the buildTonePrompt function
 */

import { describe, it, expect } from 'vitest';
import { buildTonePrompt } from '@/lib/destiny-map/prompt/fortune/base/toneStyle';

describe('buildTonePrompt', () => {
  describe('basic functionality', () => {
    it('should return a string', () => {
      const result = buildTonePrompt('ko', 'today');
      expect(typeof result).toBe('string');
    });

    it('should return non-empty string', () => {
      const result = buildTonePrompt('ko', 'today');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include common tone guidance', () => {
      const result = buildTonePrompt('ko', 'today');
      expect(result).toContain('TONE & STYLE');
      expect(result).toContain('KOREAN SPEECH STYLE');
      expect(result).toContain('PERSONALIZATION');
    });
  });

  describe('theme-specific tones', () => {
    it('should include love theme guidance', () => {
      const result = buildTonePrompt('ko', 'love');
      expect(result).toContain('Love & Relationships');
      expect(result).toContain('emotionally attuned');
    });

    it('should include career theme guidance', () => {
      const result = buildTonePrompt('ko', 'career');
      expect(result).toContain('Career & Purpose');
      expect(result).toContain('Pragmatic yet inspiring');
    });

    it('should include family theme guidance', () => {
      const result = buildTonePrompt('ko', 'family');
      expect(result).toContain('Family & Roots');
      expect(result).toContain('generational patterns');
    });

    it('should include health theme guidance', () => {
      const result = buildTonePrompt('ko', 'health');
      expect(result).toContain('Wellbeing & Vitality');
      expect(result).toContain('healthcare professionals');
    });

    it('should include year theme guidance', () => {
      const result = buildTonePrompt('ko', 'year');
      expect(result).toContain('Yearly Journey');
      expect(result).toContain('Big-picture perspective');
    });

    it('should include month theme guidance', () => {
      const result = buildTonePrompt('ko', 'month');
      expect(result).toContain('Monthly Focus');
      expect(result).toContain('Key dates');
    });

    it('should include today theme guidance', () => {
      const result = buildTonePrompt('ko', 'today');
      expect(result).toContain('Daily Guidance');
      expect(result).toContain('immediately applicable');
    });

    it('should include newyear theme guidance', () => {
      const result = buildTonePrompt('ko', 'newyear');
      expect(result).toContain('New Year Intentions');
      expect(result).toContain('Fresh start energy');
    });
  });

  describe('unknown theme fallback', () => {
    it('should fall back to today theme for unknown theme', () => {
      const result = buildTonePrompt('ko', 'unknown_theme');
      expect(result).toContain('Daily Guidance');
    });

    it('should fall back to today theme for empty theme', () => {
      const result = buildTonePrompt('ko', '');
      expect(result).toContain('Daily Guidance');
    });
  });

  describe('language support', () => {
    it('should work with Korean language', () => {
      const result = buildTonePrompt('ko', 'today');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should work with English language', () => {
      const result = buildTonePrompt('en', 'today');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include Korean speech style guidance', () => {
      const result = buildTonePrompt('ko', 'today');
      expect(result).toContain('한국어 말투');
      expect(result).toContain('~해요');
    });
  });

  describe('source citation style', () => {
    it('should include citation guidelines', () => {
      const result = buildTonePrompt('ko', 'today');
      expect(result).toContain('SOURCE CITATION STYLE');
      expect(result).toContain('융');
    });
  });

  describe('length and structure guidance', () => {
    it('should include length guidelines', () => {
      const result = buildTonePrompt('ko', 'today');
      expect(result).toContain('LENGTH & STRUCTURE');
      expect(result).toContain('600-1000 characters');
    });
  });

  describe('all themes coverage', () => {
    const themes = ['love', 'career', 'family', 'health', 'year', 'month', 'today', 'newyear'];

    themes.forEach((theme) => {
      it(`should generate valid output for ${theme} theme`, () => {
        const result = buildTonePrompt('ko', theme);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(100);
        expect(result).toContain('TONE & STYLE');
        expect(result).toContain('THEME:');
      });
    });
  });
});
