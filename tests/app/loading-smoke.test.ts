// tests/app/loading-smoke.test.ts
/**
 * Smoke tests for all Next.js loading components
 * Validates that all loading.tsx files can be imported
 */
import { describe, it, expect } from 'vitest';

describe('Loading Components Smoke Tests', () => {
  describe('Main Loading (1)', () => {
    it('should import main loading', async () => {
      const loading = await import('@/app/(main)/loading');

      expect(loading.default).toBeDefined();
      expect(typeof loading.default).toBe('function');
    });
  });

  describe('Feature Loading Components (46)', () => {
    it('should import admin loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/admin/feedback/loading'),
        import('@/app/admin/refunds/loading'),
      ]);

      expect(loadings.length).toBe(2);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import astrology loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/astrology/loading'),
        import('@/app/astrology/counselor/loading'),
      ]);

      expect(loadings.length).toBe(2);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import auth loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/auth/signin/loading'),
      ]);

      expect(loadings.length).toBe(1);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import blog loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/blog/loading'),
      ]);

      expect(loadings.length).toBe(1);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import calendar loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/calendar/loading'),
      ]);

      expect(loadings.length).toBe(1);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import community loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/community/loading'),
      ]);

      expect(loadings.length).toBe(1);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import compatibility loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/compatibility/loading'),
        import('@/app/compatibility/chat/loading'),
        import('@/app/compatibility/counselor/loading'),
        import('@/app/compatibility/insights/loading'),
      ]);

      expect(loadings.length).toBe(4);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import contact loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/contact/loading'),
      ]);

      expect(loadings.length).toBe(1);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import destiny-map loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/destiny-map/loading'),
        import('@/app/destiny-map/counselor/loading'),
        import('@/app/destiny-map/result/loading'),
      ]);

      expect(loadings.length).toBe(3);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import destiny-match loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/destiny-match/loading'),
        import('@/app/destiny-match/matches/loading'),
        import('@/app/destiny-match/setup/loading'),
      ]);

      expect(loadings.length).toBe(3);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import destiny-matrix loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/destiny-matrix/themed-reports/loading'),
        import('@/app/destiny-matrix/viewer/loading'),
      ]);

      expect(loadings.length).toBe(2);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import destiny-pal loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/destiny-pal/loading'),
      ]);

      expect(loadings.length).toBe(1);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import dream loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/dream/loading'),
      ]);

      expect(loadings.length).toBe(1);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import faq loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/faq/loading'),
      ]);

      expect(loadings.length).toBe(1);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import iching loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/iching/loading'),
      ]);

      expect(loadings.length).toBe(1);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import icp loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/icp/loading'),
        import('@/app/icp/quiz/loading'),
        import('@/app/icp/result/loading'),
      ]);

      expect(loadings.length).toBe(3);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import life-prediction loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/life-prediction/loading'),
        import('@/app/life-prediction/result/loading'),
      ]);

      expect(loadings.length).toBe(2);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import myjourney loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/myjourney/loading'),
        import('@/app/myjourney/circle/loading'),
        import('@/app/myjourney/history/loading'),
        import('@/app/myjourney/profile/loading'),
      ]);

      expect(loadings.length).toBe(4);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import notifications loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/notifications/loading'),
      ]);

      expect(loadings.length).toBe(1);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import numerology loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/numerology/loading'),
      ]);

      expect(loadings.length).toBe(1);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import personality loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/personality/loading'),
        import('@/app/personality/quiz/loading'),
        import('@/app/personality/result/loading'),
      ]);

      expect(loadings.length).toBe(3);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import pricing loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/pricing/loading'),
      ]);

      expect(loadings.length).toBe(1);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import profile loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/profile/loading'),
      ]);

      expect(loadings.length).toBe(1);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import saju loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/saju/loading'),
        import('@/app/saju/counselor/loading'),
      ]);

      expect(loadings.length).toBe(2);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import tarot loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/tarot/loading'),
        import('@/app/tarot/history/loading'),
      ]);

      expect(loadings.length).toBe(2);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });

    it('should import about loading components', async () => {
      const loadings = await Promise.all([
        import('@/app/about/loading'),
      ]);

      expect(loadings.length).toBe(1);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
      });
    });
  });

  describe('Loading Components Summary', () => {
    it('should import all loading components without errors', async () => {
      const loadings = await Promise.all([
        // Main
        import('@/app/(main)/loading'),

        // Admin (2)
        import('@/app/admin/feedback/loading'),
        import('@/app/admin/refunds/loading'),

        // Astrology (2)
        import('@/app/astrology/loading'),
        import('@/app/astrology/counselor/loading'),

        // Auth (1)
        import('@/app/auth/signin/loading'),

        // About (1)
        import('@/app/about/loading'),

        // Blog (1)
        import('@/app/blog/loading'),

        // Calendar (1)
        import('@/app/calendar/loading'),

        // Community (1)
        import('@/app/community/loading'),

        // Compatibility (4)
        import('@/app/compatibility/loading'),
        import('@/app/compatibility/chat/loading'),
        import('@/app/compatibility/counselor/loading'),
        import('@/app/compatibility/insights/loading'),

        // Contact (1)
        import('@/app/contact/loading'),

        // Destiny Map (3)
        import('@/app/destiny-map/loading'),
        import('@/app/destiny-map/counselor/loading'),
        import('@/app/destiny-map/result/loading'),

        // Destiny Match (3)
        import('@/app/destiny-match/loading'),
        import('@/app/destiny-match/matches/loading'),
        import('@/app/destiny-match/setup/loading'),

        // Destiny Matrix (2)
        import('@/app/destiny-matrix/themed-reports/loading'),
        import('@/app/destiny-matrix/viewer/loading'),

        // Destiny Pal (1)
        import('@/app/destiny-pal/loading'),

        // Dream (1)
        import('@/app/dream/loading'),

        // FAQ (1)
        import('@/app/faq/loading'),

        // iChing (1)
        import('@/app/iching/loading'),

        // ICP (3)
        import('@/app/icp/loading'),
        import('@/app/icp/quiz/loading'),
        import('@/app/icp/result/loading'),

        // Life Prediction (2)
        import('@/app/life-prediction/loading'),
        import('@/app/life-prediction/result/loading'),

        // My Journey (4)
        import('@/app/myjourney/loading'),
        import('@/app/myjourney/circle/loading'),
        import('@/app/myjourney/history/loading'),
        import('@/app/myjourney/profile/loading'),

        // Notifications (1)
        import('@/app/notifications/loading'),

        // Numerology (1)
        import('@/app/numerology/loading'),

        // Personality (3)
        import('@/app/personality/loading'),
        import('@/app/personality/quiz/loading'),
        import('@/app/personality/result/loading'),

        // Pricing (1)
        import('@/app/pricing/loading'),

        // Profile (1)
        import('@/app/profile/loading'),

        // Saju (2)
        import('@/app/saju/loading'),
        import('@/app/saju/counselor/loading'),

        // Tarot (2)
        import('@/app/tarot/loading'),
        import('@/app/tarot/history/loading'),
      ]);

      expect(loadings.length).toBe(47);
      loadings.forEach((loading) => {
        expect(loading.default).toBeDefined();
        expect(typeof loading.default).toBe('function');
      });
    });
  });
});
