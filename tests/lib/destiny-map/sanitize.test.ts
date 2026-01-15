import { describe, it, expect } from 'vitest';
import { sanitizeLocaleText } from '@/lib/destiny-map/sanitize';

describe('sanitizeLocaleText', () => {
  it('should return empty string as-is', () => {
    expect(sanitizeLocaleText('', 'en')).toBe('');
  });

  it('should preserve JSON structures', () => {
    const json = '{"lifeTimeline": []}';
    expect(sanitizeLocaleText(json, 'ko')).toBe(json);
  });

  it('should preserve categoryAnalysis JSON', () => {
    const json = '{"categoryAnalysis": {}}';
    expect(sanitizeLocaleText(json, 'en')).toBe(json);
  });

  it('should allow Korean Hangul characters', () => {
    const text = '안녕하세요';
    expect(sanitizeLocaleText(text, 'ko')).toBe(text);
  });

  it('should allow CJK Hanja for Korean', () => {
    const text = '甲子日';
    expect(sanitizeLocaleText(text, 'ko')).toBe(text);
  });

  it('should allow mixed Korean and English', () => {
    const text = 'Hello 안녕';
    expect(sanitizeLocaleText(text, 'ko')).toBe(text);
  });

  it('should allow Japanese Hiragana and Katakana', () => {
    const text = 'こんにちは カタカナ';
    expect(sanitizeLocaleText(text, 'ja')).toBe(text);
  });

  it('should allow Chinese characters', () => {
    const text = '你好世界';
    expect(sanitizeLocaleText(text, 'zh')).toBe(text);
  });

  it('should allow Spanish accents', () => {
    const text = 'Hola ¿Cómo estás?';
    expect(sanitizeLocaleText(text, 'es')).toBe(text);
  });

  it('should use default regex for unknown language', () => {
    const text = 'Hello World';
    expect(sanitizeLocaleText(text, 'unknown')).toBe(text);
  });

  it('should preserve tabs and newlines', () => {
    const text = 'Hello\tWorld\nNext line';
    expect(sanitizeLocaleText(text, 'en')).toBe(text);
  });
});
