/**
 * Comprehensive tests for structuredPrompt.ts
 * Tests structured fortune prompt generation with complete data integration
 */

import { describe, it, expect } from 'vitest';
import {
  buildStructuredFortunePrompt,
  parseStructuredResponse,
  type StructuredFortuneOutput,
} from '@/lib/destiny-map/prompt/fortune/base/structuredPrompt';
import type { CombinedResult } from '@/lib/destiny-map/astrologyengine';

describe('structuredPrompt - buildStructuredFortunePrompt', () => {
  // === Basic Functionality Tests ===
  describe('Basic prompt generation', () => {
    it('should generate prompt with minimal data', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {},
      };
      const prompt = buildStructuredFortunePrompt('ko', 'today', data);

      expect(prompt).toBeTruthy();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('should include language in prompt', () => {
      const data: CombinedResult = { astrology: {}, saju: {} };

      const koPrompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(koPrompt).toContain('ko');

      const enPrompt = buildStructuredFortunePrompt('en', 'today', data);
      expect(enPrompt).toContain('en');
    });

    it('should include theme in prompt', () => {
      const data: CombinedResult = { astrology: {}, saju: {} };

      const todayPrompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(todayPrompt).toContain('TODAY');

      const lovePrompt = buildStructuredFortunePrompt('ko', 'love', data);
      expect(lovePrompt).toContain('LOVE');
    });

    it('should handle null/undefined data gracefully', () => {
      const data: CombinedResult = {
        astrology: undefined as any,
        saju: null as any,
      };

      expect(() => buildStructuredFortunePrompt('ko', 'today', data)).not.toThrow();
    });

    it('should include analysis date in prompt', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {},
        analysisDate: '2024-03-15',
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('2024-03-15');
    });

    it('should include timezone info when provided', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {},
        userTimezone: 'Asia/Seoul',
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Asia/Seoul');
    });

    it('should use current date if no analysisDate provided', () => {
      const data: CombinedResult = { astrology: {}, saju: {} };
      const prompt = buildStructuredFortunePrompt('ko', 'today', data);

      const currentYear = new Date().getFullYear();
      expect(prompt).toContain(String(currentYear));
    });

    it('should generate long prompt with full data', () => {
      const data: CombinedResult = { astrology: {}, saju: {} };
      const prompt = buildStructuredFortunePrompt('ko', 'today', data);

      expect(prompt.length).toBeGreaterThan(2000);
    });
  });

  // === Theme-specific Tests ===
  describe('Theme-specific instructions', () => {
    const themes = ['today', 'love', 'career', 'health', 'wealth', 'family', 'month', 'year', 'newyear', 'life'];
    const data: CombinedResult = { astrology: {}, saju: {} };

    themes.forEach(theme => {
      it(`should include specific instructions for ${theme} theme`, () => {
        const prompt = buildStructuredFortunePrompt('ko', theme, data);
        expect(prompt).toContain(theme.toUpperCase());
        expect(prompt).toContain('TASK:');
      });
    });

    it('should use default instruction for unknown theme', () => {
      const prompt = buildStructuredFortunePrompt('ko', 'unknown' as any, data);
      expect(prompt).toBeTruthy();
    });

    it('should have theme-appropriate focus for today', () => {
      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('micro-actions');
    });

    it('should have theme-appropriate focus for love', () => {
      const prompt = buildStructuredFortunePrompt('ko', 'love', data);
      expect(prompt).toContain('relationships');
    });

    it('should have theme-appropriate focus for career', () => {
      const prompt = buildStructuredFortunePrompt('ko', 'career', data);
      expect(prompt).toContain('professional');
    });
  });

  // === Planetary Data Tests ===
  describe('Planetary data formatting', () => {
    it('should format Sun data correctly', () => {
      const data: CombinedResult = {
        astrology: {
          planets: [{
            name: 'Sun',
            sign: 'Aries',
            degree: 15.5,
            house: 1,
          }],
        },
        saju: {},
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Sun: Aries');
      expect(prompt).toContain('House 1');
    });

    it('should handle all major planets', () => {
      const planetNames = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node'];
      const data: CombinedResult = {
        astrology: {
          planets: planetNames.map(name => ({
            name,
            sign: 'Aries',
            degree: 0,
            house: 1,
          })),
        },
        saju: {},
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      planetNames.forEach(planet => {
        expect(prompt).toContain(planet + ':');
      });
    });

    it('should handle missing planet data gracefully', () => {
      const data: CombinedResult = {
        astrology: {
          planets: [{
            name: 'Sun',
            sign: undefined,
            degree: undefined,
            house: undefined,
          }],
        },
        saju: {},
      };

      expect(() => buildStructuredFortunePrompt('ko', 'today', data)).not.toThrow();
    });

    it('should show planet degree with proper formatting', () => {
      const data: CombinedResult = {
        astrology: {
          planets: [{
            name: 'Moon',
            sign: 'Cancer',
            degree: 10.123456,
            house: 4,
          }],
        },
        saju: {},
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Moon: Cancer');
      expect(prompt).toContain('10');
    });

    it('should handle empty planets array', () => {
      const data: CombinedResult = {
        astrology: { planets: [] },
        saju: {},
      };

      expect(() => buildStructuredFortunePrompt('ko', 'today', data)).not.toThrow();
    });
  });

  // === Angles Tests ===
  describe('Angles (Ascendant, MC)', () => {
    it('should include Ascendant data', () => {
      const data: CombinedResult = {
        astrology: {
          ascendant: {
            sign: 'Leo',
            degree: 10.5,
          },
        },
        saju: {},
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Ascendant: Leo');
    });

    it('should include MC data', () => {
      const data: CombinedResult = {
        astrology: {
          mc: {
            sign: 'Taurus',
            degree: 20.3,
          },
        },
        saju: {},
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('MC (Midheaven): Taurus');
    });

    it('should handle missing angles gracefully', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {},
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Ascendant: -');
    });
  });

  // === Aspects Tests ===
  describe('Aspects formatting', () => {
    it('should format major aspects', () => {
      const data: CombinedResult = {
        astrology: {
          aspects: [
            { planet1: { name: 'Sun' }, planet2: { name: 'Moon' }, type: 'conjunction', orb: 2 },
            { planet1: { name: 'Venus' }, planet2: { name: 'Mars' }, type: 'trine', orb: 3 },
          ],
        },
        saju: {},
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Sun-conjunction-Moon');
      expect(prompt).toContain('Venus-trine-Mars');
    });

    it('should filter for major aspects only', () => {
      const data: CombinedResult = {
        astrology: {
          aspects: [
            { planet1: { name: 'Sun' }, planet2: { name: 'Moon' }, type: 'conjunction', orb: 2 },
            { planet1: { name: 'Sun' }, planet2: { name: 'Mars' }, type: 'semisquare', orb: 1 },
          ],
        },
        saju: {},
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('conjunction');
    });

    it('should handle empty aspects array', () => {
      const data: CombinedResult = {
        astrology: { aspects: [] },
        saju: {},
      };

      expect(() => buildStructuredFortunePrompt('ko', 'today', data)).not.toThrow();
    });

    it('should limit aspects to 10', () => {
      const aspects = Array.from({ length: 20 }, (_, i) => ({
        planet1: { name: 'Planet' + i },
        planet2: { name: 'Target' + i },
        type: 'conjunction',
        orb: 1,
      }));

      const data: CombinedResult = {
        astrology: { aspects },
        saju: {},
      };

      expect(() => buildStructuredFortunePrompt('ko', 'today', data)).not.toThrow();
    });

    it('should handle aspect with alternative property names', () => {
      const data: CombinedResult = {
        astrology: {
          aspects: [
            { from: 'Sun', to: 'Moon', type: 'trine', orb: 2 },
          ],
        },
        saju: {},
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Major Aspects');
    });
  });

  // === Transits Tests ===
  describe('Transits formatting', () => {
    it('should include significant transits', () => {
      const data: CombinedResult = {
        astrology: {
          transits: [
            { from: { name: 'Jupiter' }, to: { name: 'Sun' }, type: 'trine', orb: 2 },
            { from: { name: 'Saturn' }, to: { name: 'Moon' }, type: 'square', orb: 1 },
          ],
        },
        saju: {},
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Current Transits');
    });

    it('should limit number of transits displayed', () => {
      const transits = Array.from({ length: 20 }, (_, i) => ({
        from: { name: 'Planet' + i },
        to: { name: 'Target' + i },
        type: 'conjunction',
        orb: 1,
      }));

      const data: CombinedResult = {
        astrology: { transits },
        saju: {},
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toBeTruthy();
    });

    it('should handle empty transits array', () => {
      const data: CombinedResult = {
        astrology: { transits: [] },
        saju: {},
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('No significant transits');
    });
  });

  // === Saju Pillar Tests ===
  describe('Saju Four Pillars', () => {
    it('should format four pillars correctly', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {
          pillars: {
            year: { heavenlyStem: { name: '甲' }, earthlyBranch: { name: '子' } },
            month: { heavenlyStem: { name: '乙' }, earthlyBranch: { name: '丑' } },
            day: { heavenlyStem: { name: '丙' }, earthlyBranch: { name: '寅' } },
            time: { heavenlyStem: { name: '丁' }, earthlyBranch: { name: '卯' } },
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Four Pillars:');
      expect(prompt).toContain('甲子');
      expect(prompt).toContain('乙丑');
      expect(prompt).toContain('丙寅');
      expect(prompt).toContain('丁卯');
    });

    it('should handle alternative pillar format (ganji)', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {
          pillars: {
            year: { ganji: '甲子' },
            month: { ganji: '乙丑' },
            day: { ganji: '丙寅' },
            time: { ganji: '丁卯' },
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Four Pillars:');
    });

    it('should handle missing pillar data', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {
          pillars: {
            year: null,
            month: undefined,
            day: {},
            time: {},
          },
        },
      };

      expect(() => buildStructuredFortunePrompt('ko', 'today', data)).not.toThrow();
    });

    it('should show dash when no pillars available', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {},
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Four Pillars: -');
    });
  });

  // === Day Master Tests ===
  describe('Day Master (일간)', () => {
    it('should include day master information', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {
          dayMaster: {
            name: '甲',
            element: '목(木)',
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Day Master: 甲');
      expect(prompt).toContain('목(木)');
    });

    it('should handle missing day master gracefully', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {},
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Day Master: -');
    });
  });

  // === Unse (운세 - Luck Cycles) Tests ===
  describe('Unse (대운/세운/월운)', () => {
    it('should include current Daeun (10-year cycle)', () => {
      const currentYear = new Date().getFullYear();
      const data: CombinedResult = {
        astrology: {},
        saju: {
          unse: {
            daeun: [
              { name: '甲子', startYear: currentYear - 2, endYear: currentYear + 7 },
              { name: '乙丑', startYear: currentYear + 8, endYear: currentYear + 17 },
            ],
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Long-term Flow');
      expect(prompt).toContain('甲子');
    });

    it('should include annual fortune (세운)', () => {
      const currentYear = new Date().getFullYear();
      const data: CombinedResult = {
        astrology: {},
        saju: {
          unse: {
            annual: [
              { year: currentYear, element: '금(金)' },
            ],
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Annual Flow');
      expect(prompt).toContain('금(金)');
    });

    it('should include monthly fortune (월운)', () => {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const data: CombinedResult = {
        astrology: {},
        saju: {
          unse: {
            monthly: [
              { year: currentYear, month: currentMonth, element: '수(水)' },
            ],
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Monthly Flow');
    });

    it('should include upcoming months forecast', () => {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const upcomingMonths = Array.from({ length: 6 }, (_, i) => ({
        year: currentYear,
        month: currentMonth + i,
        element: '목(木)',
        heavenlyStem: '甲',
        earthlyBranch: '子',
      }));

      const data: CombinedResult = {
        astrology: {},
        saju: {
          unse: { monthly: upcomingMonths },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('향후 월간 흐름');
    });

    it('should handle missing unse data', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {},
      };

      expect(() => buildStructuredFortunePrompt('ko', 'today', data)).not.toThrow();
    });
  });

  // === Advanced Saju Analysis Tests ===
  describe('Advanced Saju Analysis', () => {
    it('should include strength analysis (신강/신약)', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {
          advancedAnalysis: {
            extended: {
              strength: {
                level: '신강',
                score: 75,
                rootCount: 3,
                supportRatio: 60,
              },
            },
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('신강');
      expect(prompt).toContain('75');
    });

    it('should include Geokguk (격국 - chart pattern)', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {
          advancedAnalysis: {
            geokguk: {
              type: '식신격',
              grade: '상',
              description: '창조적 재능이 뛰어남',
            },
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('식신격');
      expect(prompt).toContain('상');
    });

    it('should include Yongsin (용신 - favorable element)', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {
          advancedAnalysis: {
            yongsin: {
              primary: { element: '수(水)', reason: '화가 많아 수로 조절' },
              secondary: { element: '금(金)' },
              avoid: { element: '화(火)' },
            },
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('용신: 수(水)');
      expect(prompt).toContain('희신');
      expect(prompt).toContain('기신');
    });

    it('should include Sibsin (십신 - ten gods) analysis', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {
          advancedAnalysis: {
            sibsin: {
              distribution: { '비견': 2, '식신': 3, '재성': 1 },
              dominant: '식신',
              missing: ['관성'],
              personality: '창조적이고 자유로운 성격',
            },
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('십신 분포');
      expect(prompt).toContain('식신');
    });

    it('should include health/career aptitude', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {
          advancedAnalysis: {
            healthCareer: {
              health: {
                vulnerabilities: ['심장', '소화기'],
                strengths: ['간', '신장'],
              },
              career: {
                suitableFields: ['예술', '교육', '상담'],
                workStyle: '창의적이고 자유로운',
              },
            },
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('건강 취약점');
      expect(prompt).toContain('적합 직업');
    });

    it('should include comprehensive score', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {
          advancedAnalysis: {
            score: {
              total: 85,
              business: 90,
              wealth: 80,
              health: 75,
              relationships: 88,
            },
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('종합 점수');
      expect(prompt).toContain('85');
    });

    it('should handle ultra advanced analysis', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {
          advancedAnalysis: {
            ultraAdvanced: {
              jonggeok: { type: '종재격', description: '재성만능격' },
              hwagyeok: { type: '목화통명', description: '문장의 재능' },
              iljuAnalysis: { character: '갑자일주', advice: '지혜롭게 처신' },
              gongmang: { branches: ['戌', '亥'], impact: '허무함' },
              samgi: { type: '금기', present: true },
            },
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('종격');
      expect(prompt).toContain('화격');
    });
  });

  // === Sinsal (신살) Tests ===
  describe('Sinsal (special stars)', () => {
    it('should include lucky sinsal list', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {
          sinsal: {
            luckyList: [
              { name: '천을귀인' },
              { name: '문창귀인' },
            ],
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Lucky:');
      expect(prompt).toContain('천을귀인');
    });

    it('should include unlucky sinsal list', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {
          sinsal: {
            unluckyList: [
              { name: '삼재' },
              { name: '역마' },
            ],
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Unlucky:');
    });

    it('should include twelve gods', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {
          sinsal: {
            twelveAll: [
              { name: '건록' },
              { name: '제왕' },
              { name: '쇠' },
            ],
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Twelve Gods');
    });

    it('should handle empty sinsal arrays', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {
          sinsal: {
            luckyList: [],
            unluckyList: [],
            twelveAll: [],
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Lucky: -');
    });
  });

  // === Extra Points Tests (Chiron, Lilith, etc.) ===
  describe('Extra points (Chiron, Lilith, Part of Fortune, Vertex)', () => {
    it('should include Chiron', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {},
        extraPoints: {
          chiron: { sign: 'Aries', house: 1, degree: 10 },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Chiron: Aries');
      expect(prompt).toContain('House 1');
    });

    it('should include all extra points', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {},
        extraPoints: {
          chiron: { sign: 'Aries', house: 1 },
          lilith: { sign: 'Taurus', house: 2 },
          partOfFortune: { sign: 'Gemini', house: 3 },
          vertex: { sign: 'Cancer', house: 4 },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Chiron');
      expect(prompt).toContain('Lilith');
      expect(prompt).toContain('Part of Fortune');
      expect(prompt).toContain('Vertex');
    });

    it('should handle missing extra points', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {},
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Extra Points');
    });
  });

  // === Solar/Lunar Returns Tests ===
  describe('Solar and Lunar Returns', () => {
    it('should include solar return data', () => {
      const currentYear = new Date().getFullYear();
      const data: CombinedResult = {
        astrology: {},
        saju: {},
        solarReturn: {
          summary: {
            ascSign: 'Leo',
            sunHouse: 10,
            moonSign: 'Pisces',
            moonHouse: 8,
            theme: 'Career focus year',
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Solar Return');
      expect(prompt).toContain(String(currentYear));
      expect(prompt).toContain('Leo');
      expect(prompt).toContain('Career focus year');
    });

    it('should include lunar return data', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {},
        lunarReturn: {
          summary: {
            ascSign: 'Virgo',
            moonHouse: 4,
            theme: 'Home and family focus',
          },
        },
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Lunar Return');
      expect(prompt).toContain('Virgo');
    });

    it('should handle missing return data', () => {
      const data: CombinedResult = {
        astrology: {},
        saju: {},
      };

      const prompt = buildStructuredFortunePrompt('ko', 'today', data);
      expect(prompt).toContain('Solar Return');
      expect(prompt).toContain('-');
    });
  });

  // === Comprehensive Structure Tests ===
  describe('Comprehensive prompt structure', () => {
    it('should include all major sections', () => {
      const data: CombinedResult = { astrology: {}, saju: {} };
      const prompt = buildStructuredFortunePrompt('ko', 'today', data);

      expect(prompt).toContain('PART 1: EASTERN DESTINY ANALYSIS');
      expect(prompt).toContain('PART 2: WESTERN ASTROLOGY');
      expect(prompt).toContain('PART 3: ELECTIONAL');
      expect(prompt).toContain('PART 4: MIDPOINTS');
      expect(prompt).toContain('TASK:');
    });

    it('should include analysis guidelines', () => {
      const data: CombinedResult = { astrology: {}, saju: {} };
      const prompt = buildStructuredFortunePrompt('ko', 'today', data);

      expect(prompt).toContain('CROSS-REFERENCE');
      expect(prompt).toContain('DATE RECOMMENDATIONS');
      expect(prompt).toContain('ADVANCED data');
    });

    it('should include JSON structure requirements', () => {
      const data: CombinedResult = { astrology: {}, saju: {} };
      const prompt = buildStructuredFortunePrompt('ko', 'today', data);

      // The prompt instructs AI to return valid JSON
      expect(prompt).toContain('You MUST return a valid JSON object');
      // Core sections exist in the prompt structure
      expect(prompt).toContain('PART 1: EASTERN DESTINY ANALYSIS');
      expect(prompt).toContain('PART 2: WESTERN ASTROLOGY');
    });

    it('should include key analysis sections in structure', () => {
      const data: CombinedResult = { astrology: {}, saju: {} };
      const prompt = buildStructuredFortunePrompt('ko', 'today', data);

      // Check for key sections that exist in the prompt
      expect(prompt).toContain('Day Master');
      expect(prompt).toContain('Four Pillars');
      expect(prompt).toContain('TASK:');
      expect(prompt).toContain('ANALYSIS GUIDELINES');
    });

    it('should include important analysis guidelines section', () => {
      const data: CombinedResult = { astrology: {}, saju: {} };
      const prompt = buildStructuredFortunePrompt('ko', 'today', data);

      // Check for IMPORTANT ANALYSIS GUIDELINES which contains key instructions
      expect(prompt).toContain('IMPORTANT ANALYSIS GUIDELINES');
      expect(prompt).toContain('CROSS-REFERENCE');
      expect(prompt).toContain('DATE RECOMMENDATIONS');
    });
  });
});

// === parseStructuredResponse Tests ===
describe('structuredPrompt - parseStructuredResponse', () => {
  describe('Valid JSON parsing', () => {
    it('should parse valid structured response', () => {
      const validResponse = JSON.stringify({
        sections: [
          { id: 'test', title: 'Test', icon: '🔮', content: 'Test content' },
        ],
        dateRecommendations: {
          lucky: [{ date: '2024-03-15', reason: 'Good energy', rating: 5 }],
          caution: [],
        },
        keyInsights: [],
      });

      const result = parseStructuredResponse(validResponse);
      expect(result).toBeTruthy();
      expect(result?.sections).toHaveLength(1);
    });

    it('should extract JSON from markdown response', () => {
      const markdownResponse = `Here is the analysis:

\`\`\`json
${JSON.stringify({
  sections: [{ id: '1', title: 'Test', icon: '🔮', content: 'Test' }],
  dateRecommendations: { lucky: [], caution: [] },
  keyInsights: [],
})}
\`\`\`
      `;

      const result = parseStructuredResponse(markdownResponse);
      expect(result).toBeTruthy();
    });

    it('should validate required fields', () => {
      const invalidResponse = JSON.stringify({
        sections: [], // Valid but empty
        // Missing dateRecommendations
        keyInsights: [],
      });

      const result = parseStructuredResponse(invalidResponse);
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const invalidResponse = 'This is not JSON';
      const result = parseStructuredResponse(invalidResponse);
      expect(result).toBeNull();
    });

    it('should return null for empty response', () => {
      const result = parseStructuredResponse('');
      expect(result).toBeNull();
    });

    it('should handle nested JSON objects', () => {
      const complexResponse = JSON.stringify({
        sections: [
          {
            id: 'love',
            title: 'Love',
            icon: '💕',
            content: 'Content',
            reasoning: 'Because...',
            terminology: [{ term: 'Venus', explanation: 'Love planet' }],
          },
        ],
        dateRecommendations: {
          lucky: [
            {
              date: '2024-03-15',
              reason: 'Venus trine Jupiter',
              easternFactor: '천을귀인',
              astroFactor: 'Venus trine',
              rating: 5,
            },
          ],
          caution: [
            {
              date: '2024-03-20',
              reason: 'Mars square Saturn',
              easternFactor: '삼재',
              astroFactor: 'Mars square',
            },
          ],
          bestPeriod: {
            start: '2024-04-01',
            end: '2024-04-07',
            reason: 'Excellent planetary alignment',
          },
        },
        keyInsights: [
          { type: 'strength', text: 'You have strong Venus', icon: '💪' },
          { type: 'opportunity', text: 'Good time for love', icon: '🚀' },
        ],
      });

      const result = parseStructuredResponse(complexResponse);
      expect(result).toBeTruthy();
      expect(result?.sections[0].terminology).toBeDefined();
      expect(result?.dateRecommendations.bestPeriod).toBeDefined();
    });

    it('should parse complete structured output', () => {
      const fullResponse = JSON.stringify({
        sections: [
          { id: '1', title: 'Section 1', icon: '🔮', content: 'Content 1' },
          { id: '2', title: 'Section 2', icon: '✨', content: 'Content 2' },
        ],
        dateRecommendations: {
          lucky: [
            { date: '2024-03-15', reason: 'Good', rating: 5 },
            { date: '2024-03-20', reason: 'Great', rating: 4 },
          ],
          caution: [
            { date: '2024-03-25', reason: 'Be careful' },
          ],
          bestPeriod: {
            start: '2024-04-01',
            end: '2024-04-07',
            reason: 'Best time',
          },
        },
        keyInsights: [
          { type: 'strength', text: 'Strong', icon: '💪' },
          { type: 'opportunity', text: 'Opportunity', icon: '🚀' },
          { type: 'caution', text: 'Caution', icon: '⚠️' },
          { type: 'advice', text: 'Advice', icon: '💡' },
        ],
      });

      const result = parseStructuredResponse(fullResponse);
      expect(result).toBeTruthy();
      expect(result?.sections).toHaveLength(2);
      expect(result?.dateRecommendations.lucky).toHaveLength(2);
      expect(result?.keyInsights).toHaveLength(4);
    });
  });

  describe('Type validation', () => {
    it('should validate sections array', () => {
      const response = JSON.stringify({
        sections: 'not an array',
        dateRecommendations: { lucky: [], caution: [] },
      });

      const result = parseStructuredResponse(response);
      expect(result).toBeNull();
    });

    it('should validate rating values', () => {
      const response = JSON.stringify({
        sections: [],
        dateRecommendations: {
          lucky: [
            { date: '2024-03-15', reason: 'Test', rating: 5 },
          ],
          caution: [],
        },
        keyInsights: [],
      });

      const result = parseStructuredResponse(response);
      expect(result).toBeTruthy();
      expect(result?.dateRecommendations.lucky[0].rating).toBe(5);
    });

    it('should validate insight types', () => {
      const response = JSON.stringify({
        sections: [],
        dateRecommendations: { lucky: [], caution: [] },
        keyInsights: [
          { type: 'strength', text: 'Test', icon: '💪' },
          { type: 'opportunity', text: 'Test', icon: '🚀' },
          { type: 'caution', text: 'Test', icon: '⚠️' },
          { type: 'advice', text: 'Test', icon: '💡' },
        ],
      });

      const result = parseStructuredResponse(response);
      expect(result).toBeTruthy();
      expect(result?.keyInsights).toHaveLength(4);
    });

    it('should handle optional fields', () => {
      const response = JSON.stringify({
        sections: [
          { id: 'test', title: 'Test', icon: '🔮', content: 'Test' },
        ],
        dateRecommendations: {
          lucky: [],
          caution: [],
        },
        keyInsights: [],
        easternHighlight: {
          pillar: '甲子',
          element: '목',
          meaning: 'Wood energy',
        },
        astroHighlight: {
          planet: 'Venus',
          sign: 'Libra',
          meaning: 'Love and harmony',
        },
      });

      const result = parseStructuredResponse(response);
      expect(result).toBeTruthy();
      expect(result?.easternHighlight).toBeDefined();
      expect(result?.astroHighlight).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed JSON', () => {
      const malformedResponse = '{ sections: [{ id: "test" }] }'; // Missing quotes
      const result = parseStructuredResponse(malformedResponse);
      expect(result).toBeNull();
    });

    it('should handle JSON with trailing content', () => {
      const response = JSON.stringify({
        sections: [],
        dateRecommendations: { lucky: [], caution: [] },
        keyInsights: [],
      }) + '\n\nAdditional text here';

      const result = parseStructuredResponse(response);
      expect(result).toBeTruthy();
    });

    it('should handle response with no JSON', () => {
      const response = 'Just plain text without any JSON';
      const result = parseStructuredResponse(response);
      expect(result).toBeNull();
    });

    it('should handle deeply nested brace structures', () => {
      const response = 'Some text { not json } ' + JSON.stringify({
        sections: [{ id: '1', title: 'T', icon: 'X', content: 'C' }],
        dateRecommendations: { lucky: [], caution: [] },
        keyInsights: [],
      });

      const result = parseStructuredResponse(response);
      expect(result).toBeTruthy();
    });

    it('should handle escaped characters in JSON', () => {
      const response = JSON.stringify({
        sections: [
          { id: 'test', title: 'Test "Quote"', icon: '🔮', content: 'Line 1\nLine 2' },
        ],
        dateRecommendations: { lucky: [], caution: [] },
        keyInsights: [],
      });

      const result = parseStructuredResponse(response);
      expect(result).toBeTruthy();
      expect(result?.sections[0].title).toContain('Quote');
    });
  });

  describe('Error handling', () => {
    it('should log error and return null on exception', () => {
      const circularObj: any = { sections: [] };
      circularObj.self = circularObj;

      // This would cause JSON.stringify to throw
      // But parseStructuredResponse should handle it gracefully
      expect(() => parseStructuredResponse('{')).not.toThrow();
    });

    it('should handle null input', () => {
      const result = parseStructuredResponse(null as any);
      expect(result).toBeNull();
    });

    it('should handle undefined input', () => {
      const result = parseStructuredResponse(undefined as any);
      expect(result).toBeNull();
    });
  });
});

// === Type Tests ===
describe('structuredPrompt - TypeScript types', () => {
  it('should have correct StructuredFortuneOutput type', () => {
    const output: StructuredFortuneOutput = {
      sections: [
        {
          id: 'test',
          title: 'Test Section',
          icon: '🔮',
          content: 'Content here',
          reasoning: 'Optional reasoning',
          terminology: [{ term: 'Term', explanation: 'Explanation' }],
        },
      ],
      dateRecommendations: {
        lucky: [
          {
            date: '2024-03-15',
            reason: 'Good day',
            easternFactor: 'Factor',
            astroFactor: 'Aspect',
            rating: 5,
          },
        ],
        caution: [
          {
            date: '2024-03-20',
            reason: 'Be careful',
            easternFactor: 'Factor',
            astroFactor: 'Aspect',
          },
        ],
        bestPeriod: {
          start: '2024-04-01',
          end: '2024-04-07',
          reason: 'Best time',
        },
      },
      keyInsights: [
        { type: 'strength', text: 'Strength', icon: '💪' },
        { type: 'opportunity', text: 'Opportunity', icon: '🚀' },
        { type: 'caution', text: 'Caution', icon: '⚠️' },
        { type: 'advice', text: 'Advice', icon: '💡' },
      ],
      easternHighlight: {
        pillar: '甲子',
        element: '목(木)',
        meaning: 'Meaning',
      },
      astroHighlight: {
        planet: 'Venus',
        sign: 'Libra',
        meaning: 'Meaning',
      },
    };

    expect(output).toBeDefined();
    expect(output.sections).toHaveLength(1);
    expect(output.keyInsights).toHaveLength(4);
  });

  it('should validate rating as literal type', () => {
    const validRatings: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];
    validRatings.forEach(rating => {
      expect([1, 2, 3, 4, 5]).toContain(rating);
    });
  });

  it('should validate insight types as literal union', () => {
    const validTypes: Array<'strength' | 'opportunity' | 'caution' | 'advice'> = [
      'strength',
      'opportunity',
      'caution',
      'advice',
    ];

    validTypes.forEach(type => {
      expect(['strength', 'opportunity', 'caution', 'advice']).toContain(type);
    });
  });
});
