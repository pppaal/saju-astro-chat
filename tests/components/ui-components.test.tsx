// tests/components/ui-components.test.tsx
/**
 * Smoke tests for UI components
 * Ensures all components can be imported without errors
 */
import { describe, it, expect } from 'vitest';

describe('UI Components', () => {
  describe('Shared UI Components', () => {
    it('should export ShareButton', async () => {
      const module = await import('@/components/ui/ShareButton');

      expect(module.default).toBeDefined();
    });

    it('should export PageLoading', async () => {
      const module = await import('@/components/ui/PageLoading');

      expect(module.default).toBeDefined();
    });
  });

  describe('Calendar Components', () => {
    it('should export all calendar components', async () => {
      const modules = await Promise.all([
        import('@/components/calendar/DestinyCalendar'),
        import('@/components/calendar/BirthInfoForm'),
        import('@/components/calendar/ParticleBackground'),
        import('@/components/calendar/CalendarHeader'),
        import('@/components/calendar/DayCell'),
        import('@/components/calendar/CalendarGrid'),
        import('@/components/calendar/FortuneGraph'),
        import('@/components/calendar/SelectedDatePanel'),
        import('@/components/calendar/MonthNavigation'),
        import('@/components/calendar/CategoryFilter'),
      ]);

      expect(modules.length).toBe(10);

      modules.forEach((module) => {
        expect(module.default).toBeDefined();
      });
    });
  });

  describe('Astrology Components', () => {
    it('should export AstrologyChat', async () => {
      const module = await import('@/components/astrology/AstrologyChat');

      expect(module.default).toBeDefined();
    });

    it('should export ResultDisplay', async () => {
      const module = await import('@/components/astrology/ResultDisplay');

      expect(module.default).toBeDefined();
    });
  });

  describe('Saju Components', () => {
    it('should export SajuChat', async () => {
      const module = await import('@/components/saju/SajuChat');

      expect(module.default).toBeDefined();
    });

    it('should export SajuResultDisplay', async () => {
      const module = await import('@/components/saju/SajuResultDisplay');

      expect(module.default).toBeDefined();
    });
  });

  describe('Tarot Components', () => {
    it('should export TarotChat', async () => {
      const module = await import('@/components/tarot/TarotChat');

      expect(module.default).toBeDefined();
    });
  });

  describe('Destiny Map Components', () => {
    it('should export Analyzer', async () => {
      const module = await import('@/components/destiny-map/Analyzer');

      expect(module).toBeDefined();
    });

    it('should export Chat', async () => {
      const module = await import('@/components/destiny-map/Chat');

      expect(module.default).toBeDefined();
    });

    it('should export DestinyMatrixStory', async () => {
      const module = await import('@/components/destiny-map/DestinyMatrixStory');

      expect(module.default).toBeDefined();
    });

    it('should export InlineTarotModal', async () => {
      const module = await import('@/components/destiny-map/InlineTarotModal');

      expect(module.default).toBeDefined();
    });
  });

  describe('Destiny Map Fun Insights', () => {
    it('should export career analyzer', async () => {
      const module = await import('@/components/destiny-map/fun-insights/analyzers/careerAnalyzer');

      expect(module.getCareerAnalysis).toBeDefined();
      expect(typeof module.getCareerAnalysis).toBe('function');
    });

    it('should export PentagonChart', async () => {
      const module = await import('@/components/destiny-map/fun-insights/tabs/PentagonChart');

      expect(module.default).toBeDefined();
    });

    it('should export PersonalityTab', async () => {
      const module = await import('@/components/destiny-map/fun-insights/tabs/PersonalityTab');

      expect(module.default).toBeDefined();
    });

    it('should export fun insights types', async () => {
      const module = await import('@/components/destiny-map/fun-insights/types/core');

      expect(module).toBeDefined();
    });

    it('should export helpers', async () => {
      const module = await import('@/components/destiny-map/fun-insights/utils/helpers');

      expect(module).toBeDefined();
    });
  });

  describe('Compatibility Components', () => {
    it('should export compatibility types', async () => {
      const module = await import('@/components/compatibility/fun-insights/types');

      expect(module).toBeDefined();
    });
  });

  describe('Life Prediction Components', () => {
    it('should export AdvisorChat', async () => {
      const module = await import('@/components/life-prediction/AdvisorChat/index');

      expect(module.default).toBeDefined();
    }, 60000);

    it('should export BirthInfoForm', async () => {
      const module = await import('@/components/life-prediction/BirthInfoForm/index');

      expect(module.default).toBeDefined();
    });

    it('should export ResultShare', async () => {
      const module = await import('@/components/life-prediction/ResultShare/index');

      expect(module.default).toBeDefined();
    });
  });

  describe('Numerology Components', () => {
    it('should export CompatibilityAnalyzer', async () => {
      const module = await import('@/components/numerology/CompatibilityAnalyzer');

      expect(module.default).toBeDefined();
    });

    it('should export NumerologyAnalyzer', async () => {
      const module = await import('@/components/numerology/NumerologyAnalyzer');

      expect(module.default).toBeDefined();
    });
  });

  describe('Share Components', () => {
    it('should export ShareButton', async () => {
      const module = await import('@/components/share/ShareButton');

      expect(module.ShareButton).toBeDefined();
    });

    it('should export ShareResultButton', async () => {
      const module = await import('@/components/sharing/ShareResultButton');

      expect(module.default).toBeDefined();
    });
  });

  describe('iChing Components', () => {
    it('should export ResultDisplay', async () => {
      const module = await import('@/components/iching/ResultDisplay');

      expect(module.default).toBeDefined();
    });
  });

  describe('ErrorBoundary', () => {
    it('should export ErrorBoundary', async () => {
      const module = await import('@/components/ErrorBoundary');

      expect(module.ErrorBoundary).toBeDefined();
    });
  });

  describe('All Component Modules', () => {
    it('should import all major component modules without errors', async () => {
      const modules = await Promise.all([
        // Calendar (10)
        import('@/components/calendar/DestinyCalendar'),
        import('@/components/calendar/BirthInfoForm'),
        import('@/components/calendar/ParticleBackground'),
        import('@/components/calendar/CalendarHeader'),
        import('@/components/calendar/DayCell'),
        import('@/components/calendar/CalendarGrid'),
        import('@/components/calendar/FortuneGraph'),
        import('@/components/calendar/SelectedDatePanel'),
        import('@/components/calendar/MonthNavigation'),
        import('@/components/calendar/CategoryFilter'),

        // Astrology (2)
        import('@/components/astrology/AstrologyChat'),
        import('@/components/astrology/ResultDisplay'),

        // Saju (2)
        import('@/components/saju/SajuChat'),
        import('@/components/saju/SajuResultDisplay'),

        // Tarot (1)
        import('@/components/tarot/TarotChat'),

        // Destiny Map (4)
        import('@/components/destiny-map/Chat'),
        import('@/components/destiny-map/DestinyMatrixStory'),
        import('@/components/destiny-map/InlineTarotModal'),
        import('@/components/destiny-map/Analyzer'),

        // Life Prediction (3)
        import('@/components/life-prediction/AdvisorChat/index'),
        import('@/components/life-prediction/BirthInfoForm/index'),
        import('@/components/life-prediction/ResultShare/index'),

        // Numerology (2)
        import('@/components/numerology/CompatibilityAnalyzer'),
        import('@/components/numerology/NumerologyAnalyzer'),

        // Share (2)
        import('@/components/share/ShareButton'),
        import('@/components/sharing/ShareResultButton'),

        // iChing (1)
        import('@/components/iching/ResultDisplay'),

        // UI (2)
        import('@/components/ui/ShareButton'),
        import('@/components/ui/PageLoading'),

        // ErrorBoundary (1)
        import('@/components/ErrorBoundary'),
      ]);

      // Total: 30 component modules
      expect(modules.length).toBe(30);

      // Verify all imported successfully
      modules.forEach((module) => {
        expect(module).toBeDefined();
      });
    });
  });
});
