// tests/i18n/i18n-smoke.test.ts
/**
 * Smoke tests for i18n localization files
 * Validates that all locale files exist and can be imported
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';

describe('i18n Smoke Tests', () => {
  const localesDir = resolve(process.cwd(), 'src/i18n/locales');

  describe('Locale Files (8)', () => {
    it('should have Korean locale', () => {
      const filePath = resolve(localesDir, 'ko.json');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have English locale', () => {
      const filePath = resolve(localesDir, 'en.json');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have Japanese locale', () => {
      const filePath = resolve(localesDir, 'ja.json');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have Chinese locale', () => {
      const filePath = resolve(localesDir, 'zh.json');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have Spanish locale', () => {
      const filePath = resolve(localesDir, 'es.json');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have French locale', () => {
      const filePath = resolve(localesDir, 'fr.json');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have German locale', () => {
      const filePath = resolve(localesDir, 'de.json');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have Portuguese locale', () => {
      const filePath = resolve(localesDir, 'pt.json');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('i18n Core Modules (1)', () => {
    it('should import i18n provider', async () => {
      const provider = await import('@/i18n/I18nProvider');

      expect(provider.I18nProvider).toBeDefined();
      expect(typeof provider.I18nProvider).toBe('function');
    });
  });

  describe('i18n Summary', () => {
    it('should have all supported locale files', () => {
      const locales = ['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'pt'];

      locales.forEach((locale) => {
        const filePath = resolve(localesDir, `${locale}.json`);
        expect(existsSync(filePath)).toBe(true);
      });

      expect(locales.length).toBe(8);
    });
  });
});
