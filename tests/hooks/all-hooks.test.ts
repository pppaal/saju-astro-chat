// tests/hooks/all-hooks.test.ts
/**
 * Comprehensive tests for all React hooks
 * Validates hook exports and structure
 */
import { describe, it, expect } from 'vitest';

describe('All Hooks Tests', () => {
  describe('Calendar Hooks (6)', () => {
    it('should export useCalendarData', async () => {
      const module = await import('@/hooks/calendar/useCalendarData');

      expect(module.useCalendarData).toBeDefined();
      expect(typeof module.useCalendarData).toBe('function');
    });

    it('should export useSavedDates', async () => {
      const module = await import('@/hooks/calendar/useSavedDates');

      expect(module.useSavedDates).toBeDefined();
      expect(typeof module.useSavedDates).toBe('function');
    });

    it('should export useCitySearch', async () => {
      const module = await import('@/hooks/calendar/useCitySearch');

      expect(module.useCitySearch).toBeDefined();
      expect(typeof module.useCitySearch).toBe('function');
    });

    it('should export useProfileLoader', async () => {
      const module = await import('@/hooks/calendar/useProfileLoader');

      expect(module.useProfileLoader).toBeDefined();
      expect(typeof module.useProfileLoader).toBe('function');
    });

    it('should export useMonthNavigation', async () => {
      const module = await import('@/hooks/calendar/useMonthNavigation');

      expect(module.useMonthNavigation).toBeDefined();
      expect(typeof module.useMonthNavigation).toBe('function');
    });

    it('should export useParticleAnimation', async () => {
      const module = await import('@/hooks/calendar/useParticleAnimation');

      expect(module.useParticleAnimation).toBeDefined();
      expect(typeof module.useParticleAnimation).toBe('function');
    });
  });

  describe('Chat Session Hook (1)', () => {
    it('should export useChatSession', async () => {
      // useChatSession.ts was renamed to useChatSession.unified.ts
      const module = await import('@/hooks/useChatSession.unified');

      expect(module.useChatSession).toBeDefined();
      expect(typeof module.useChatSession).toBe('function');
    }, 60_000);
  });

  describe('All Hooks Summary', () => {
    it('should import all hooks without errors', async () => {
      const hooks = await Promise.all([
        // Calendar hooks (6)
        import('@/hooks/calendar/useCalendarData'),
        import('@/hooks/calendar/useSavedDates'),
        import('@/hooks/calendar/useCitySearch'),
        import('@/hooks/calendar/useProfileLoader'),
        import('@/hooks/calendar/useMonthNavigation'),
        import('@/hooks/calendar/useParticleAnimation'),

        // Chat hook (1) - useChatSession.unified.ts
        import('@/hooks/useChatSession.unified'),
      ]);

      expect(hooks.length).toBe(7);
      hooks.forEach((hook) => {
        expect(hook).toBeDefined();
        expect(Object.keys(hook).length).toBeGreaterThan(0);
      });
    });
  });
});
