/**
 * Local Report Generator Tests
 * 로컬 템플릿 기반 리포트 생성 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import { generateLocalReport } from '@/lib/destiny-map/local-report-generator';
import type { CombinedResult } from '@/lib/destiny-map/astrologyengine';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('LocalReportGenerator', () => {
  // Create mock combined result
  const createMockResult = (
    sajuOverrides: Partial<CombinedResult['saju']> = {},
    astroOverrides: Partial<CombinedResult['astrology']> = {}
  ): CombinedResult => ({
    saju: {
      dayMaster: {
        name: '甲',
        element: 'wood',
      },
      facts: {
        fiveElements: {
          wood: 30,
          fire: 25,
          earth: 20,
          metal: 15,
          water: 10,
        },
      },
      pillars: {
        day: {
          heavenlyStem: { name: '甲', element: 'wood' },
        },
      },
      ...sajuOverrides,
    } as CombinedResult['saju'],
    astrology: {
      planets: {
        sun: { sign: 'aries' },
        moon: { sign: 'cancer' },
      },
      ascendant: { sign: 'leo' },
      facts: {},
      ...astroOverrides,
    } as CombinedResult['astrology'],
  });

  describe('generateLocalReport', () => {
    describe('Korean output', () => {
      it('should generate Korean report', () => {
        const result = createMockResult();
        const report = generateLocalReport(result, 'general', 'ko');

        expect(report).toContain('사주×점성 통합 분석');
        expect(report).toContain('핵심 정체성');
      });

      it('should include day master information in Korean', () => {
        const result = createMockResult();
        const report = generateLocalReport(result, 'general', 'ko');

        expect(report).toContain('일간');
        expect(report).toContain('甲');
      });

      it('should include five elements in Korean', () => {
        const result = createMockResult();
        const report = generateLocalReport(result, 'general', 'ko');

        expect(report).toContain('오행');
        expect(report).toContain('목(木)');
      });

      it('should include astrology signs in Korean', () => {
        const result = createMockResult();
        const report = generateLocalReport(result, 'general', 'ko');

        expect(report).toContain('양자리'); // Aries
        expect(report).toContain('게자리'); // Cancer
        expect(report).toContain('사자자리'); // Leo (ascendant)
      });

      it('should include element distribution', () => {
        const result = createMockResult();
        const report = generateLocalReport(result, 'general', 'ko');

        expect(report).toContain('30%'); // wood
        expect(report).toContain('25%'); // fire
      });

      it('should include fusion insight', () => {
        const result = createMockResult();
        const report = generateLocalReport(result, 'general', 'ko');

        expect(report).toContain('융합 인사이트');
      });
    });

    describe('English output', () => {
      it('should generate English report', () => {
        const result = createMockResult();
        const report = generateLocalReport(result, 'general', 'en');

        expect(report).toContain('Saju × Astrology Fusion Analysis');
        expect(report).toContain('Core Identity');
      });

      it('should include day master information in English', () => {
        const result = createMockResult();
        const report = generateLocalReport(result, 'general', 'en');

        expect(report).toContain('Day Master');
        expect(report).toContain('甲');
      });

      it('should include five elements in English', () => {
        const result = createMockResult();
        const report = generateLocalReport(result, 'general', 'en');

        expect(report).toContain('Wood');
        expect(report).toContain('Element Distribution');
      });

      it('should include astrology signs in English', () => {
        const result = createMockResult();
        const report = generateLocalReport(result, 'general', 'en');

        expect(report).toContain('Aries');
        expect(report).toContain('Cancer');
        expect(report).toContain('Leo');
      });

      it('should include Fusion Insight in English', () => {
        const result = createMockResult();
        const report = generateLocalReport(result, 'general', 'en');

        expect(report).toContain('Fusion Insight');
      });
    });

    describe('element handling', () => {
      it('should identify dominant element correctly', () => {
        const result = createMockResult({
          facts: {
            fiveElements: {
              fire: 40,
              wood: 25,
              earth: 20,
              metal: 10,
              water: 5,
            },
          },
        });
        const report = generateLocalReport(result, 'general', 'ko');

        // Fire should be identified as dominant
        expect(report).toContain('화(火)');
      });

      it('should identify weakest element correctly', () => {
        const result = createMockResult({
          facts: {
            fiveElements: {
              wood: 40,
              fire: 25,
              earth: 20,
              metal: 10,
              water: 5,
            },
          },
        });
        const report = generateLocalReport(result, 'general', 'ko');

        // Water should be weakest
        expect(report).toContain('수(水)');
      });

      it('should handle all five elements', () => {
        const elements = ['wood', 'fire', 'earth', 'metal', 'water'];
        elements.forEach((element) => {
          const fiveElements: Record<string, number> = {};
          elements.forEach((e) => {
            fiveElements[e] = e === element ? 50 : 12;
          });

          const result = createMockResult({
            facts: { fiveElements },
          });
          const report = generateLocalReport(result, 'general', 'en');

          // Should contain the element name
          const elementNames: Record<string, string> = {
            wood: 'Wood',
            fire: 'Fire',
            earth: 'Earth',
            metal: 'Metal',
            water: 'Water',
          };
          expect(report).toContain(elementNames[element]);
        });
      });
    });

    describe('zodiac sign handling', () => {
      const zodiacSigns = [
        { key: 'aries', ko: '양자리', en: 'Aries' },
        { key: 'taurus', ko: '황소자리', en: 'Taurus' },
        { key: 'gemini', ko: '쌍둥이자리', en: 'Gemini' },
        { key: 'cancer', ko: '게자리', en: 'Cancer' },
        { key: 'leo', ko: '사자자리', en: 'Leo' },
        { key: 'virgo', ko: '처녀자리', en: 'Virgo' },
        { key: 'libra', ko: '천칭자리', en: 'Libra' },
        { key: 'scorpio', ko: '전갈자리', en: 'Scorpio' },
        { key: 'sagittarius', ko: '사수자리', en: 'Sagittarius' },
        { key: 'capricorn', ko: '염소자리', en: 'Capricorn' },
        { key: 'aquarius', ko: '물병자리', en: 'Aquarius' },
        { key: 'pisces', ko: '물고기자리', en: 'Pisces' },
      ];

      zodiacSigns.forEach(({ key, ko, en }) => {
        it(`should translate ${key} to Korean`, () => {
          const result = createMockResult(
            {},
            {
              planets: {
                sun: { sign: key },
                moon: { sign: 'aries' },
              },
            }
          );
          const report = generateLocalReport(result, 'general', 'ko');

          expect(report).toContain(ko);
        });

        it(`should use ${key} in English`, () => {
          const result = createMockResult(
            {},
            {
              planets: {
                sun: { sign: key },
                moon: { sign: 'aries' },
              },
            }
          );
          const report = generateLocalReport(result, 'general', 'en');

          expect(report).toContain(en);
        });
      });
    });

    describe('data extraction edge cases', () => {
      it('should handle array-format planets', () => {
        const result = createMockResult(
          {},
          {
            planets: [
              { name: 'Sun', sign: 'taurus' },
              { name: 'Moon', sign: 'virgo' },
            ] as any,
          }
        );
        const report = generateLocalReport(result, 'general', 'ko');

        expect(report).toContain('황소자리');
        expect(report).toContain('처녀자리');
      });

      it('should handle missing five elements gracefully', () => {
        const result = createMockResult({
          facts: {},
        });

        expect(() => generateLocalReport(result, 'general', 'ko')).not.toThrow();
      });

      it('should handle missing day master gracefully', () => {
        const result = createMockResult({
          dayMaster: undefined,
        });

        expect(() => generateLocalReport(result, 'general', 'ko')).not.toThrow();
      });

      it('should handle missing astrology data gracefully', () => {
        const result = createMockResult(
          {},
          {
            planets: {},
            ascendant: undefined,
          }
        );

        expect(() => generateLocalReport(result, 'general', 'ko')).not.toThrow();
      });

      it('should handle unknown elements', () => {
        const result = createMockResult({
          dayMaster: {
            name: 'Unknown',
            element: 'unknown',
          },
        });
        const report = generateLocalReport(result, 'general', 'en');

        // Should still generate report without crashing
        expect(report).toContain('Analysis');
      });
    });

    describe('element traits', () => {
      it('should include wood trait in Korean', () => {
        const result = createMockResult({
          facts: {
            fiveElements: { wood: 50, fire: 20, earth: 15, metal: 10, water: 5 },
          },
        });
        const report = generateLocalReport(result, 'general', 'ko');

        expect(report).toContain('성장');
        expect(report).toContain('창의성');
      });

      it('should include fire trait in English', () => {
        const result = createMockResult({
          facts: {
            fiveElements: { fire: 50, wood: 20, earth: 15, metal: 10, water: 5 },
          },
        });
        const report = generateLocalReport(result, 'general', 'en');

        expect(report).toContain('passion');
        expect(report).toContain('leadership');
      });

      it('should include earth trait', () => {
        const result = createMockResult({
          facts: {
            fiveElements: { earth: 50, wood: 20, fire: 15, metal: 10, water: 5 },
          },
        });
        const report = generateLocalReport(result, 'general', 'ko');

        expect(report).toContain('안정');
      });

      it('should include metal trait', () => {
        const result = createMockResult({
          facts: {
            fiveElements: { metal: 50, wood: 20, fire: 15, earth: 10, water: 5 },
          },
        });
        const report = generateLocalReport(result, 'general', 'ko');

        expect(report).toContain('원칙');
      });

      it('should include water trait', () => {
        const result = createMockResult({
          facts: {
            fiveElements: { water: 50, wood: 20, fire: 15, earth: 10, metal: 5 },
          },
        });
        const report = generateLocalReport(result, 'general', 'ko');

        expect(report).toContain('지혜');
      });
    });

    describe('report structure', () => {
      it('should have markdown headers', () => {
        const result = createMockResult();
        const report = generateLocalReport(result, 'general', 'ko');

        expect(report).toContain('##');
        expect(report).toContain('###');
      });

      it('should include three main sections', () => {
        const result = createMockResult();
        const report = generateLocalReport(result, 'general', 'ko');

        expect(report).toContain('사주 분석');
        expect(report).toContain('점성 분석');
        expect(report).toContain('융합');
      });

      it('should have disclaimer at the end', () => {
        const result = createMockResult();
        const reportKo = generateLocalReport(result, 'general', 'ko');
        const reportEn = generateLocalReport(result, 'general', 'en');

        expect(reportKo).toContain('상담사');
        expect(reportEn).toContain('counselor');
      });
    });

    describe('theme parameter', () => {
      it('should accept theme parameter', () => {
        const result = createMockResult();

        // Theme doesn't affect current implementation but should be accepted
        expect(() => generateLocalReport(result, 'career', 'ko')).not.toThrow();
        expect(() => generateLocalReport(result, 'love', 'en')).not.toThrow();
        expect(() => generateLocalReport(result, 'health', 'ko')).not.toThrow();
      });
    });

    describe('name parameter', () => {
      it('should accept optional name parameter', () => {
        const result = createMockResult();

        expect(() => generateLocalReport(result, 'general', 'ko', '홍길동')).not.toThrow();
        expect(() => generateLocalReport(result, 'general', 'en', 'John')).not.toThrow();
      });
    });
  });
});
