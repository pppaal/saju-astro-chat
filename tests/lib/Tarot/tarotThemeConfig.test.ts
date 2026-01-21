/**
 * Tests for Tarot Theme Configuration
 * src/lib/Tarot/tarotThemeConfig.ts
 */

import { describe, it, expect } from 'vitest';
import {
  CARD_COLORS,
  THEME_DISPLAY_INFO,
  getThemeDisplayInfo,
  type CardColorOption,
  type ThemeDisplayInfo,
} from '@/lib/Tarot/tarotThemeConfig';
import { DECK_STYLES } from '@/lib/Tarot/tarot.types';

describe('CARD_COLORS', () => {
  it('should have the same length as DECK_STYLES', () => {
    expect(CARD_COLORS.length).toBe(DECK_STYLES.length);
  });

  it('should have all required properties for each color option', () => {
    CARD_COLORS.forEach((color: CardColorOption) => {
      expect(color).toHaveProperty('id');
      expect(color).toHaveProperty('name');
      expect(color).toHaveProperty('nameKo');
      expect(color).toHaveProperty('description');
      expect(color).toHaveProperty('descriptionKo');
      expect(color).toHaveProperty('gradient');
      expect(color).toHaveProperty('border');
      expect(color).toHaveProperty('accent');
      expect(color).toHaveProperty('backImage');
    });
  });

  it('should have valid color values', () => {
    CARD_COLORS.forEach((color: CardColorOption) => {
      expect(typeof color.gradient).toBe('string');
      expect(typeof color.border).toBe('string');
      expect(typeof color.accent).toBe('string');
    });
  });

  it('should have non-empty names', () => {
    CARD_COLORS.forEach((color: CardColorOption) => {
      expect(color.name.length).toBeGreaterThan(0);
      expect(color.nameKo.length).toBeGreaterThan(0);
    });
  });

  it('should have valid IDs matching DECK_STYLES', () => {
    const ids = CARD_COLORS.map(c => c.id);
    DECK_STYLES.forEach(style => {
      expect(ids).toContain(style);
    });
  });
});

describe('THEME_DISPLAY_INFO', () => {
  const expectedThemes = [
    'general-insight',
    'love-relationships',
    'career-work',
    'money-finance',
    'well-being-health',
    'spiritual-growth',
    'decisions-crossroads',
    'self-discovery',
    'daily-reading',
  ];

  it('should have all expected themes', () => {
    expectedThemes.forEach(theme => {
      expect(THEME_DISPLAY_INFO).toHaveProperty(theme);
    });
  });

  it('should have all required properties for each theme', () => {
    Object.values(THEME_DISPLAY_INFO).forEach((info: ThemeDisplayInfo) => {
      expect(info).toHaveProperty('guidanceIcon');
      expect(info).toHaveProperty('guidanceTitle');
      expect(info).toHaveProperty('guidanceTitleKo');
      expect(info).toHaveProperty('guidanceFooter');
      expect(info).toHaveProperty('guidanceFooterKo');
      expect(info).toHaveProperty('affirmationIcon');
      expect(info).toHaveProperty('affirmationTitle');
      expect(info).toHaveProperty('affirmationTitleKo');
    });
  });

  it('should have non-empty strings for all text fields', () => {
    Object.values(THEME_DISPLAY_INFO).forEach((info: ThemeDisplayInfo) => {
      expect(info.guidanceTitle.length).toBeGreaterThan(0);
      expect(info.guidanceTitleKo.length).toBeGreaterThan(0);
      expect(info.guidanceFooter.length).toBeGreaterThan(0);
      expect(info.guidanceFooterKo.length).toBeGreaterThan(0);
      expect(info.affirmationTitle.length).toBeGreaterThan(0);
      expect(info.affirmationTitleKo.length).toBeGreaterThan(0);
    });
  });

  it('should have emoji icons', () => {
    Object.values(THEME_DISPLAY_INFO).forEach((info: ThemeDisplayInfo) => {
      expect(info.guidanceIcon.length).toBeGreaterThan(0);
      expect(info.affirmationIcon.length).toBeGreaterThan(0);
    });
  });
});

describe('getThemeDisplayInfo', () => {
  it('should return correct info for general-insight', () => {
    const result = getThemeDisplayInfo('general-insight');
    expect(result.guidanceTitle).toBe('Key Insight');
    expect(result.guidanceTitleKo).toBe('핵심 조언');
  });

  it('should return correct info for love-relationships', () => {
    const result = getThemeDisplayInfo('love-relationships');
    expect(result.guidanceTitle).toBe('Relationship Advice');
    expect(result.guidanceTitleKo).toBe('관계 조언');
  });

  it('should return correct info for career-work', () => {
    const result = getThemeDisplayInfo('career-work');
    expect(result.guidanceTitle).toBe('Career Advice');
    expect(result.guidanceTitleKo).toBe('커리어 조언');
  });

  it('should return correct info for money-finance', () => {
    const result = getThemeDisplayInfo('money-finance');
    expect(result.guidanceTitle).toBe('Financial Advice');
    expect(result.guidanceTitleKo).toBe('재정 조언');
  });

  it('should return correct info for well-being-health', () => {
    const result = getThemeDisplayInfo('well-being-health');
    expect(result.guidanceTitle).toBe('Health Advice');
    expect(result.guidanceTitleKo).toBe('건강 조언');
  });

  it('should return correct info for spiritual-growth', () => {
    const result = getThemeDisplayInfo('spiritual-growth');
    expect(result.guidanceTitle).toBe('Growth Advice');
    expect(result.guidanceTitleKo).toBe('성장 조언');
  });

  it('should return correct info for decisions-crossroads', () => {
    const result = getThemeDisplayInfo('decisions-crossroads');
    expect(result.guidanceTitle).toBe('Decision Advice');
    expect(result.guidanceTitleKo).toBe('결정 조언');
  });

  it('should return correct info for self-discovery', () => {
    const result = getThemeDisplayInfo('self-discovery');
    expect(result.guidanceTitle).toBe('Self Advice');
    expect(result.guidanceTitleKo).toBe('자기 이해 조언');
  });

  it('should return correct info for daily-reading', () => {
    const result = getThemeDisplayInfo('daily-reading');
    expect(result.guidanceTitle).toBe("Today's Advice");
    expect(result.guidanceTitleKo).toBe('오늘의 조언');
  });

  it('should return general-insight as default for unknown category', () => {
    const result = getThemeDisplayInfo('unknown-category');
    expect(result).toEqual(THEME_DISPLAY_INFO['general-insight']);
  });

  it('should return general-insight for undefined category', () => {
    const result = getThemeDisplayInfo(undefined);
    expect(result).toEqual(THEME_DISPLAY_INFO['general-insight']);
  });

  it('should return general-insight for empty string', () => {
    const result = getThemeDisplayInfo('');
    expect(result).toEqual(THEME_DISPLAY_INFO['general-insight']);
  });
});

describe('Theme Consistency', () => {
  it('should have matching English and Korean content structure', () => {
    Object.entries(THEME_DISPLAY_INFO).forEach(([, info]) => {
      // Both should exist
      expect(info.guidanceTitle).toBeDefined();
      expect(info.guidanceTitleKo).toBeDefined();
      expect(info.guidanceFooter).toBeDefined();
      expect(info.guidanceFooterKo).toBeDefined();
      expect(info.affirmationTitle).toBeDefined();
      expect(info.affirmationTitleKo).toBeDefined();
    });
  });

  it('should use consistent icon pattern', () => {
    Object.values(THEME_DISPLAY_INFO).forEach((info: ThemeDisplayInfo) => {
      // All guidance icons should be the same (lightbulb)
      expect(info.guidanceIcon).toBe('💡');
      // All affirmation icons should be the same (checkmark)
      expect(info.affirmationIcon).toBe('✓');
    });
  });
});