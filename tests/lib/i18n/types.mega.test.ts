/**
 * Comprehensive tests for src/lib/i18n/types.ts
 * Tests i18n type definitions and interfaces
 */

import { describe, it, expect } from 'vitest';
import type {
  SupportedLocale,
  LocaleExtension,
  UnifiedAnalysisLabels,
  DailyRitualLabels,
  PsychologyLabels,
  MeditationLabels,
} from '@/lib/i18n/types';

describe('i18n types', () => {
  describe('SupportedLocale', () => {
    it('should accept all supported locale values', () => {
      const locales: SupportedLocale[] = ['en', 'ko', 'es', 'fr', 'ja', 'zh', 'ru', 'ar'];
      expect(locales).toHaveLength(8);
    });

    it('should compile with en locale', () => {
      const locale: SupportedLocale = 'en';
      expect(locale).toBe('en');
    });

    it('should compile with ko locale', () => {
      const locale: SupportedLocale = 'ko';
      expect(locale).toBe('ko');
    });

    it('should compile with es locale', () => {
      const locale: SupportedLocale = 'es';
      expect(locale).toBe('es');
    });

    it('should compile with fr locale', () => {
      const locale: SupportedLocale = 'fr';
      expect(locale).toBe('fr');
    });

    it('should compile with ja locale', () => {
      const locale: SupportedLocale = 'ja';
      expect(locale).toBe('ja');
    });

    it('should compile with zh locale', () => {
      const locale: SupportedLocale = 'zh';
      expect(locale).toBe('zh');
    });

    it('should compile with ru locale', () => {
      const locale: SupportedLocale = 'ru';
      expect(locale).toBe('ru');
    });

    it('should compile with ar locale', () => {
      const locale: SupportedLocale = 'ar';
      expect(locale).toBe('ar');
    });

    it('should work in arrays', () => {
      const locales: SupportedLocale[] = ['en', 'ko'];
      expect(locales).toContain('en');
      expect(locales).toContain('ko');
    });

    it('should work as object keys', () => {
      const obj: Record<SupportedLocale, string> = {
        en: 'English',
        ko: 'Korean',
        es: 'Spanish',
        fr: 'French',
        ja: 'Japanese',
        zh: 'Chinese',
        ru: 'Russian',
        ar: 'Arabic',
      };
      expect(obj.en).toBe('English');
    });
  });

  describe('LocaleExtension', () => {
    it('should allow locale strings as keys', () => {
      const extension: LocaleExtension = {
        en: {
          common: { hello: 'Hello' },
        },
      };
      expect(extension.en.common.hello).toBe('Hello');
    });

    it('should allow multiple locales', () => {
      const extension: LocaleExtension = {
        en: { common: { hello: 'Hello' } },
        ko: { common: { hello: '안녕하세요' } },
      };
      expect(extension.en.common.hello).toBe('Hello');
      expect(extension.ko.common.hello).toBe('안녕하세요');
    });

    it('should allow multiple namespaces', () => {
      const extension: LocaleExtension = {
        en: {
          common: { hello: 'Hello' },
          errors: { notFound: 'Not found' },
        },
      };
      expect(extension.en.common.hello).toBe('Hello');
      expect(extension.en.errors.notFound).toBe('Not found');
    });

    it('should allow nested values', () => {
      const extension: LocaleExtension = {
        en: {
          common: {
            greeting: { formal: 'Good day', casual: 'Hey' },
          },
        },
      };
      expect(extension.en.common.greeting).toBeDefined();
    });

    it('should allow empty namespace', () => {
      const extension: LocaleExtension = {
        en: {},
      };
      expect(extension.en).toBeDefined();
    });

    it('should allow string values', () => {
      const extension: LocaleExtension = {
        en: {
          messages: { test: 'value' },
        },
      };
      expect(extension.en.messages.test).toBe('value');
    });

    it('should allow number values', () => {
      const extension: LocaleExtension = {
        en: {
          counts: { max: 100 },
        },
      };
      expect(extension.en.counts.max).toBe(100);
    });

    it('should allow boolean values', () => {
      const extension: LocaleExtension = {
        en: {
          features: { enabled: true },
        },
      };
      expect(extension.en.features.enabled).toBe(true);
    });
  });

  describe('UnifiedAnalysisLabels', () => {
    it('should have diagnose section', () => {
      const labels: UnifiedAnalysisLabels = {
        diagnose: { title: 'Diagnose', description: 'Analysis' },
        analyze: { title: 'Analyze', description: 'Deep analysis' },
        heal: { title: 'Heal', description: 'Healing' },
      };
      expect(labels.diagnose.title).toBe('Diagnose');
    });

    it('should have analyze section', () => {
      const labels: UnifiedAnalysisLabels = {
        diagnose: { title: 'Diagnose', description: 'Analysis' },
        analyze: { title: 'Analyze', description: 'Deep analysis' },
        heal: { title: 'Heal', description: 'Healing' },
      };
      expect(labels.analyze.title).toBe('Analyze');
    });

    it('should have heal section', () => {
      const labels: UnifiedAnalysisLabels = {
        diagnose: { title: 'Diagnose', description: 'Analysis' },
        analyze: { title: 'Analyze', description: 'Deep analysis' },
        heal: { title: 'Heal', description: 'Healing' },
      };
      expect(labels.heal.title).toBe('Heal');
    });

    it('should require title and description for each section', () => {
      const labels: UnifiedAnalysisLabels = {
        diagnose: { title: 'Test', description: 'Desc' },
        analyze: { title: 'Test', description: 'Desc' },
        heal: { title: 'Test', description: 'Desc' },
      };
      expect(labels.diagnose.title).toBeDefined();
      expect(labels.diagnose.description).toBeDefined();
    });

    it('should work with Korean text', () => {
      const labels: UnifiedAnalysisLabels = {
        diagnose: { title: '진단', description: '상태 진단' },
        analyze: { title: '분석', description: '심층 분석' },
        heal: { title: '치유', description: '치유 방법' },
      };
      expect(labels.diagnose.title).toBe('진단');
    });
  });

  describe('DailyRitualLabels', () => {
    it('should have all required fields', () => {
      const labels: DailyRitualLabels = {
        title: 'Daily Ritual',
        subtitle: 'Your practice',
        todayRitual: "Today's ritual",
        meditation: 'Meditation',
        journaling: 'Journaling',
        gratitude: 'Gratitude',
        elementBoost: 'Element boost',
        duration: 'Duration',
        complete: 'Complete',
        skip: 'Skip',
      };

      expect(labels.title).toBe('Daily Ritual');
      expect(labels.subtitle).toBe('Your practice');
      expect(labels.todayRitual).toBe("Today's ritual");
      expect(labels.meditation).toBe('Meditation');
      expect(labels.journaling).toBe('Journaling');
      expect(labels.gratitude).toBe('Gratitude');
      expect(labels.elementBoost).toBe('Element boost');
      expect(labels.duration).toBe('Duration');
      expect(labels.complete).toBe('Complete');
      expect(labels.skip).toBe('Skip');
    });

    it('should work with Korean labels', () => {
      const labels: DailyRitualLabels = {
        title: '일일 의식',
        subtitle: '당신의 수행',
        todayRitual: '오늘의 의식',
        meditation: '명상',
        journaling: '일기',
        gratitude: '감사',
        elementBoost: '원소 강화',
        duration: '시간',
        complete: '완료',
        skip: '건너뛰기',
      };

      expect(labels.title).toBe('일일 의식');
      expect(labels.meditation).toBe('명상');
    });

    it('should handle empty strings', () => {
      const labels: DailyRitualLabels = {
        title: '',
        subtitle: '',
        todayRitual: '',
        meditation: '',
        journaling: '',
        gratitude: '',
        elementBoost: '',
        duration: '',
        complete: '',
        skip: '',
      };

      expect(labels.title).toBe('');
    });
  });

  describe('PsychologyLabels', () => {
    it('should have mbti section', () => {
      const labels: PsychologyLabels = {
        mbti: { title: 'MBTI', description: 'Personality type' },
        big5: {
          title: 'Big 5',
          openness: 'Openness',
          conscientiousness: 'Conscientiousness',
          extraversion: 'Extraversion',
          agreeableness: 'Agreeableness',
          neuroticism: 'Neuroticism',
        },
      };

      expect(labels.mbti.title).toBe('MBTI');
      expect(labels.mbti.description).toBe('Personality type');
    });

    it('should have big5 section with all traits', () => {
      const labels: PsychologyLabels = {
        mbti: { title: 'MBTI', description: 'Type' },
        big5: {
          title: 'Big Five',
          openness: 'Openness to Experience',
          conscientiousness: 'Conscientiousness',
          extraversion: 'Extraversion',
          agreeableness: 'Agreeableness',
          neuroticism: 'Neuroticism',
        },
      };

      expect(labels.big5.title).toBe('Big Five');
      expect(labels.big5.openness).toBe('Openness to Experience');
      expect(labels.big5.conscientiousness).toBe('Conscientiousness');
      expect(labels.big5.extraversion).toBe('Extraversion');
      expect(labels.big5.agreeableness).toBe('Agreeableness');
      expect(labels.big5.neuroticism).toBe('Neuroticism');
    });

    it('should work with Korean text', () => {
      const labels: PsychologyLabels = {
        mbti: { title: 'MBTI', description: '성격 유형' },
        big5: {
          title: '빅파이브',
          openness: '개방성',
          conscientiousness: '성실성',
          extraversion: '외향성',
          agreeableness: '친화성',
          neuroticism: '신경성',
        },
      };

      expect(labels.mbti.description).toBe('성격 유형');
      expect(labels.big5.openness).toBe('개방성');
    });
  });

  describe('MeditationLabels', () => {
    it('should have all meditation types', () => {
      const labels: MeditationLabels = {
        title: 'Meditation',
        guided: 'Guided',
        breathing: 'Breathing',
        singingBowl: 'Singing Bowl',
        nature: 'Nature',
        duration: '10 min',
        start: 'Start',
        pause: 'Pause',
        complete: 'Complete',
      };

      expect(labels.title).toBe('Meditation');
      expect(labels.guided).toBe('Guided');
      expect(labels.breathing).toBe('Breathing');
      expect(labels.singingBowl).toBe('Singing Bowl');
      expect(labels.nature).toBe('Nature');
    });

    it('should have control buttons', () => {
      const labels: MeditationLabels = {
        title: 'Meditation',
        guided: 'Guided',
        breathing: 'Breathing',
        singingBowl: 'Singing Bowl',
        nature: 'Nature',
        duration: '10 min',
        start: 'Start',
        pause: 'Pause',
        complete: 'Complete',
      };

      expect(labels.start).toBe('Start');
      expect(labels.pause).toBe('Pause');
      expect(labels.complete).toBe('Complete');
    });

    it('should have duration field', () => {
      const labels: MeditationLabels = {
        title: 'Meditation',
        guided: 'Guided',
        breathing: 'Breathing',
        singingBowl: 'Singing Bowl',
        nature: 'Nature',
        duration: '15 minutes',
        start: 'Start',
        pause: 'Pause',
        complete: 'Complete',
      };

      expect(labels.duration).toBe('15 minutes');
    });

    it('should work with Korean labels', () => {
      const labels: MeditationLabels = {
        title: '명상',
        guided: '안내 명상',
        breathing: '호흡 명상',
        singingBowl: '싱잉볼',
        nature: '자연 소리',
        duration: '10분',
        start: '시작',
        pause: '일시정지',
        complete: '완료',
      };

      expect(labels.title).toBe('명상');
      expect(labels.guided).toBe('안내 명상');
      expect(labels.singingBowl).toBe('싱잉볼');
    });
  });

  describe('Type compatibility', () => {
    it('should allow UnifiedAnalysisLabels in Record', () => {
      const locales: Record<SupportedLocale, UnifiedAnalysisLabels> = {
        en: {
          diagnose: { title: 'Diagnose', description: 'Analyze' },
          analyze: { title: 'Analyze', description: 'Deep' },
          heal: { title: 'Heal', description: 'Healing' },
        },
        ko: {
          diagnose: { title: '진단', description: '분석' },
          analyze: { title: '분석', description: '심층' },
          heal: { title: '치유', description: '치유법' },
        },
        es: {
          diagnose: { title: 'Diagnosticar', description: 'Analizar' },
          analyze: { title: 'Analizar', description: 'Profundo' },
          heal: { title: 'Sanar', description: 'Sanación' },
        },
        fr: {
          diagnose: { title: 'Diagnostiquer', description: 'Analyser' },
          analyze: { title: 'Analyser', description: 'Profond' },
          heal: { title: 'Guérir', description: 'Guérison' },
        },
        ja: {
          diagnose: { title: '診断', description: '分析' },
          analyze: { title: '分析', description: '深い' },
          heal: { title: '癒し', description: '治癒' },
        },
        zh: {
          diagnose: { title: '诊断', description: '分析' },
          analyze: { title: '分析', description: '深度' },
          heal: { title: '治愈', description: '疗愈' },
        },
        ru: {
          diagnose: { title: 'Диагностика', description: 'Анализ' },
          analyze: { title: 'Анализ', description: 'Глубокий' },
          heal: { title: 'Исцеление', description: 'Лечение' },
        },
        ar: {
          diagnose: { title: 'تشخيص', description: 'تحليل' },
          analyze: { title: 'تحليل', description: 'عميق' },
          heal: { title: 'شفاء', description: 'علاج' },
        },
      };

      expect(locales.en.diagnose.title).toBe('Diagnose');
      expect(locales.ko.diagnose.title).toBe('진단');
    });

    it('should work with Partial types', () => {
      const partial: Partial<DailyRitualLabels> = {
        title: 'Daily',
        meditation: 'Meditate',
      };

      expect(partial.title).toBe('Daily');
      expect(partial.subtitle).toBeUndefined();
    });

    it('should work with Pick utility type', () => {
      type MeditationType = Pick<MeditationLabels, 'guided' | 'breathing' | 'singingBowl' | 'nature'>;

      const types: MeditationType = {
        guided: 'Guided',
        breathing: 'Breathing',
        singingBowl: 'Bowl',
        nature: 'Nature',
      };

      expect(types.guided).toBe('Guided');
    });

    it('should work with Omit utility type', () => {
      type BasicRitual = Omit<DailyRitualLabels, 'complete' | 'skip'>;

      const ritual: BasicRitual = {
        title: 'Ritual',
        subtitle: 'Daily',
        todayRitual: 'Today',
        meditation: 'Meditate',
        journaling: 'Journal',
        gratitude: 'Thanks',
        elementBoost: 'Boost',
        duration: '10min',
      };

      expect(ritual.title).toBe('Ritual');
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle Unicode in all string fields', () => {
      const labels: MeditationLabels = {
        title: '🧘‍♀️ 명상',
        guided: '✨ 안내',
        breathing: '💨 호흡',
        singingBowl: '🔔 싱잉볼',
        nature: '🌿 자연',
        duration: '⏱ 10분',
        start: '▶️ 시작',
        pause: '⏸ 일시정지',
        complete: '✅ 완료',
      };

      expect(labels.title).toContain('명상');
      expect(labels.guided).toContain('안내');
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000);
      const labels: DailyRitualLabels = {
        title: longString,
        subtitle: longString,
        todayRitual: longString,
        meditation: longString,
        journaling: longString,
        gratitude: longString,
        elementBoost: longString,
        duration: longString,
        complete: longString,
        skip: longString,
      };

      expect(labels.title.length).toBe(1000);
    });

    it('should handle special characters', () => {
      const labels: UnifiedAnalysisLabels = {
        diagnose: { title: 'Diagnose!', description: '@#$%^&*()' },
        analyze: { title: 'Analyze?', description: '<>[]{}' },
        heal: { title: 'Heal~', description: '`|\\/' },
      };

      expect(labels.diagnose.title).toBe('Diagnose!');
    });
  });
});