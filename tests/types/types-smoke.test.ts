// tests/types/types-smoke.test.ts
/**
 * Smoke tests for TypeScript type definitions
 * Validates that all type files can be imported
 */
import { describe, it, expect } from 'vitest';

describe('Types Smoke Tests', () => {
  describe('Component Types (4)', () => {
    it('should import compatibility types', async () => {
      const types = await import('@/components/compatibility/fun-insights/types');

      expect(types).toBeDefined();
    });

    it('should import destiny map fun insights types', async () => {
      const types = await import('@/components/destiny-map/fun-insights/types');

      expect(types).toBeDefined();
    });

    it('should import destiny map tabs types', async () => {
      const types = await import('@/components/destiny-map/fun-insights/tabs/types');

      expect(types).toBeDefined();
    });

    it('should import iching types', async () => {
      const types = await import('@/components/iching/types');

      expect(types).toBeDefined();
    });
  });

  describe('Library Types (12)', () => {
    it('should import astrology types', async () => {
      const types = await import('@/lib/astrology/foundation/types');

      expect(types).toBeDefined();
    });

    it('should import destiny map calendar types', async () => {
      const types = await import('@/lib/destiny-map/calendar/types');

      expect(types).toBeDefined();
    });

    it('should import destiny map core types', async () => {
      const types = await import('@/lib/destiny-map/types');

      expect(types).toBeDefined();
    });

    it('should import destiny matrix interpreter types', async () => {
      const types = await import('@/lib/destiny-matrix/interpreter/types');

      expect(types).toBeDefined();
    });

    it('should import destiny matrix core types', async () => {
      const types = await import('@/lib/destiny-matrix/types');

      expect(types).toBeDefined();
    });

    it('should import email types', async () => {
      const types = await import('@/lib/email/types');

      expect(types).toBeDefined();
    });

    it('should import i18n types', async () => {
      const types = await import('@/lib/i18n/types');

      expect(types).toBeDefined();
    });

    it('should import icp types', async () => {
      const types = await import('@/lib/icp/types');

      expect(types).toBeDefined();
    });

    it('should import persona types', async () => {
      const types = await import('@/lib/persona/types');

      expect(types).toBeDefined();
    });

    it('should import life prediction types', async () => {
      const types = await import('@/lib/prediction/life-prediction/types');

      expect(types).toBeDefined();
    });

    it('should import saju types', async () => {
      const types = await import('@/lib/Saju/types');

      expect(types).toBeDefined();
    });

    it('should import tarot types', async () => {
      const types = await import('@/lib/Tarot/tarot.types');

      expect(types).toBeDefined();
    });
  });

  describe('Types Summary', () => {
    it('should import all type modules without errors', async () => {
      const types = await Promise.all([
        // Component types (4)
        import('@/components/compatibility/fun-insights/types'),
        import('@/components/destiny-map/fun-insights/types'),
        import('@/components/destiny-map/fun-insights/tabs/types'),
        import('@/components/iching/types'),

        // Library types (12)
        import('@/lib/astrology/foundation/types'),
        import('@/lib/destiny-map/calendar/types'),
        import('@/lib/destiny-map/types'),
        import('@/lib/destiny-matrix/interpreter/types'),
        import('@/lib/destiny-matrix/types'),
        import('@/lib/email/types'),
        import('@/lib/i18n/types'),
        import('@/lib/icp/types'),
        import('@/lib/persona/types'),
        import('@/lib/prediction/life-prediction/types'),
        import('@/lib/Saju/types'),
        import('@/lib/Tarot/tarot.types'),
      ]);

      expect(types.length).toBe(16);
      types.forEach((typeModule) => {
        expect(typeModule).toBeDefined();
      });
    });
  });
});
