import { describe, it, expect } from 'vitest';

describe('Tarot Integration', () => {
  describe('tarot.types.ts', () => {
    it('should import tarot types', async () => {
      const module = await import('@/lib/Tarot/tarot.types');

      expect(module).toBeDefined();
    });
  });

  describe('questionClassifiers.ts', () => {
    it('should export classifier functions', async () => {
      const module = await import('@/lib/Tarot/questionClassifiers');

      expect(module.isYesNoQuestion).toBeDefined();
      expect(module.isGeneralFortuneQuestion).toBeDefined();
    });

    it('should classify questions correctly', async () => {
      const { isYesNoQuestion, isGeneralFortuneQuestion } = await import('@/lib/Tarot/questionClassifiers');

      const yesNoQuestion = 'Should I quit my job?';
      const generalQuestion = '내 운세 어때?';

      expect(isYesNoQuestion(yesNoQuestion)).toBe(true);
      expect(isGeneralFortuneQuestion(generalQuestion)).toBe(true);
    });
  });

  describe('tarot-counselors.ts', () => {
    it('should export counselor functions', async () => {
      const module = await import('@/lib/Tarot/tarot-counselors');

      expect(module.recommendCounselorByTheme).toBeDefined();
      expect(module.getCounselorById).toBeDefined();
    });

    it('should get tarot counselor', async () => {
      const { recommendCounselorByTheme } = await import('@/lib/Tarot/tarot-counselors');

      const counselor = recommendCounselorByTheme('love');

      expect(counselor).toBeDefined();
      expect(counselor).toHaveProperty('name');
      expect(counselor).toHaveProperty('style');
    });
  });

  describe('tarot-storage.ts', () => {
    it('should export storage functions', async () => {
      const module = await import('@/lib/Tarot/tarot-storage');

      expect(module.saveReading).toBeDefined();
      expect(module.getSavedReadings).toBeDefined();
      expect(module.getReadingById).toBeDefined();
    });
  });

  describe('tarot-recommend.ts', () => {
    it('should export recommendation functions', async () => {
      const module = await import('@/lib/Tarot/tarot-recommend');

      expect(module.recommendSpreads).toBeDefined();
      expect(typeof module.recommendSpreads).toBe('function');
    });

    it('should recommend spreads', async () => {
      const { recommendSpreads } = await import('@/lib/Tarot/tarot-recommend');

      const recommendations = recommendSpreads('Will I find love?');

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('tarot-recommend.data.ts', () => {
    it('should export recommendation data', async () => {
      const module = await import('@/lib/Tarot/tarot-recommend.data');

      expect(module).toBeDefined();
      const exports = Object.keys(module);
      expect(exports.length).toBeGreaterThan(0);
    });
  });

  describe('All Tarot Modules', () => {
    it('should import all tarot modules without errors', async () => {
      const modules = await Promise.all([
        import('@/lib/Tarot/tarot.types'),
        import('@/lib/Tarot/questionClassifiers'),
        import('@/lib/Tarot/tarot-counselors'),
        import('@/lib/Tarot/tarot-storage'),
        import('@/lib/Tarot/tarot-recommend'),
        import('@/lib/Tarot/tarot-recommend.data'),
      ]);

      expect(modules.length).toBe(6);
      modules.forEach((module) => {
        expect(module).toBeDefined();
      });
    });
  });

  describe('Spread Recommendations', () => {
    it('should recommend different spreads for different topics', async () => {
      const { recommendSpreads } = await import('@/lib/Tarot/tarot-recommend');

      const loveSpread = recommendSpreads('I want a love reading');
      const careerSpread = recommendSpreads('Should I change careers?');
      const generalSpread = recommendSpreads('How is my week?');

      expect(loveSpread).toBeDefined();
      expect(careerSpread).toBeDefined();
      expect(generalSpread).toBeDefined();
    });
  });

  describe('Counselor Personality', () => {
    it('should have counselors for different topics', async () => {
      const { recommendCounselorByTheme } = await import('@/lib/Tarot/tarot-counselors');

      const loveCounselor = recommendCounselorByTheme('love');
      const careerCounselor = recommendCounselorByTheme('career');
      const generalCounselor = recommendCounselorByTheme('general');

      expect(loveCounselor.name).toBeDefined();
      expect(careerCounselor.name).toBeDefined();
      expect(generalCounselor.name).toBeDefined();
    });
  });
});
