// tests/contexts/all-contexts.test.tsx
/**
 * Tests for all React Context providers
 * Ensures contexts can be imported and instantiated
 */
import { describe, it, expect } from 'vitest';

describe('Context Providers', () => {
  describe('NotificationContext', () => {
    it('should export NotificationContext and Provider', async () => {
      const module = await import('@/contexts/NotificationContext');

      expect(module.NotificationProvider).toBeDefined();
      expect(module.useNotifications).toBeDefined();
      expect(typeof module.NotificationProvider).toBe('function');
      expect(typeof module.useNotifications).toBe('function');
    });
  });

  describe('CalendarContext', () => {
    it('should export CalendarContext and Provider', async () => {
      const module = await import('@/contexts/CalendarContext');

      expect(module.CalendarProvider).toBeDefined();
      expect(typeof module.CalendarProvider).toBe('function');
    });
  });

  describe('I18nProvider', () => {
    it('should export I18nProvider', async () => {
      const module = await import('@/i18n/I18nProvider');

      expect(module.I18nProvider).toBeDefined();
      expect(module.useI18n).toBeDefined();
      expect(typeof module.I18nProvider).toBe('function');
      expect(typeof module.useI18n).toBe('function');
    });
  });

  describe('All Context Modules', () => {
    it('should import all context modules without errors', async () => {
      const modules = await Promise.all([
        import('@/contexts/NotificationContext'),
        import('@/contexts/CalendarContext'),
        import('@/i18n/I18nProvider'),
      ]);

      expect(modules.length).toBe(3);

      modules.forEach((module) => {
        expect(module).toBeDefined();
        expect(Object.keys(module).length).toBeGreaterThan(0);
      });
    });
  });
});
