/**
 * Score Calculators Tests
 * AI 리포트 점수 계산 유틸리티 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generatePeriodLabel,
  calculatePeriodScore,
  calculateThemeScore,
  extractKeywords,
  type PeriodScoreResult,
  type ThemeScoreResult,
} from '@/lib/destiny-matrix/ai-report/scoreCalculators';
import type { ReportPeriod, ReportTheme, TimingData, ThemedReportSections } from '@/lib/destiny-matrix/ai-report/types';

describe('ScoreCalculators', () => {
  describe('generatePeriodLabel', () => {
    describe('Korean labels', () => {
      it('should generate daily label in Korean', () => {
        const result = generatePeriodLabel('daily', '2024-03-15', 'ko');
        expect(result).toBe('2024년 3월 15일');
      });

      it('should generate monthly label in Korean', () => {
        const result = generatePeriodLabel('monthly', '2024-06-01', 'ko');
        expect(result).toBe('2024년 6월');
      });

      it('should generate yearly label in Korean', () => {
        const result = generatePeriodLabel('yearly', '2024-01-01', 'ko');
        expect(result).toBe('2024년');
      });

      it('should generate comprehensive label for unknown period', () => {
        const result = generatePeriodLabel('comprehensive' as ReportPeriod, '2024-01-01', 'ko');
        expect(result).toBe('2024년 종합');
      });
    });

    describe('English labels', () => {
      it('should generate daily label in English', () => {
        const result = generatePeriodLabel('daily', '2024-03-15', 'en');
        expect(result).toBe('Mar 15, 2024');
      });

      it('should generate monthly label in English', () => {
        const result = generatePeriodLabel('monthly', '2024-06-01', 'en');
        expect(result).toBe('Jun 2024');
      });

      it('should generate yearly label in English', () => {
        const result = generatePeriodLabel('yearly', '2024-01-01', 'en');
        expect(result).toBe('2024');
      });

      it('should generate comprehensive label for unknown period', () => {
        const result = generatePeriodLabel('comprehensive' as ReportPeriod, '2024-01-01', 'en');
        expect(result).toBe('2024 Comprehensive');
      });
    });

    describe('month names', () => {
      it('should use correct month abbreviations', () => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let m = 1; m <= 12; m++) {
          const date = `2024-${String(m).padStart(2, '0')}-15`;
          const result = generatePeriodLabel('monthly', date, 'en');
          expect(result).toContain(months[m - 1]);
        }
      });
    });

    describe('edge cases', () => {
      it('should handle January correctly', () => {
        const result = generatePeriodLabel('daily', '2024-01-01', 'ko');
        expect(result).toBe('2024년 1월 1일');
      });

      it('should handle December correctly', () => {
        const result = generatePeriodLabel('daily', '2024-12-31', 'ko');
        expect(result).toBe('2024년 12월 31일');
      });
    });
  });

  describe('calculatePeriodScore', () => {
    describe('score calculation', () => {
      it('should return all score categories', () => {
        const timingData: TimingData = {
          seun: { element: '수' },
        };
        const result = calculatePeriodScore(timingData, '목');

        expect(result).toHaveProperty('overall');
        expect(result).toHaveProperty('career');
        expect(result).toHaveProperty('love');
        expect(result).toHaveProperty('wealth');
        expect(result).toHaveProperty('health');
      });

      it('should return scores between 0 and 100', () => {
        const timingData: TimingData = { seun: { element: '화' } };
        const result = calculatePeriodScore(timingData, '토');

        expect(result.overall).toBeGreaterThanOrEqual(0);
        expect(result.overall).toBeLessThanOrEqual(100);
        expect(result.career).toBeGreaterThanOrEqual(0);
        expect(result.career).toBeLessThanOrEqual(100);
      });

      it('should apply element bonus for favorable relationship (상생)', () => {
        // 수 generates 목 = +15 bonus
        const timingData: TimingData = { seun: { element: '수' } };
        const results: number[] = [];
        for (let i = 0; i < 10; i++) {
          results.push(calculatePeriodScore(timingData, '목').overall);
        }
        const avg = results.reduce((a, b) => a + b, 0) / results.length;
        expect(avg).toBeGreaterThan(65); // Base 60 + 15 bonus = 75 expected
      });

      it('should apply negative bonus for unfavorable relationship (상극)', () => {
        // 금 controls 목 = -10 penalty
        const timingData: TimingData = { seun: { element: '금' } };
        const results: number[] = [];
        for (let i = 0; i < 10; i++) {
          results.push(calculatePeriodScore(timingData, '목').overall);
        }
        const avg = results.reduce((a, b) => a + b, 0) / results.length;
        expect(avg).toBeLessThan(65); // Base 60 - 10 penalty = 50 expected
      });
    });

    describe('element relationships', () => {
      const elements = ['목', '화', '토', '금', '수'];

      it('should handle all element combinations', () => {
        for (const dayMaster of elements) {
          for (const seun of elements) {
            const timingData: TimingData = { seun: { element: seun } };
            const result = calculatePeriodScore(timingData, dayMaster);
            expect(result.overall).toBeGreaterThanOrEqual(0);
            expect(result.overall).toBeLessThanOrEqual(100);
          }
        }
      });
    });

    describe('fallback behavior', () => {
      it('should use 토 as default when element is missing', () => {
        const timingData: TimingData = {};
        const result = calculatePeriodScore(timingData, '목');
        expect(result).toHaveProperty('overall');
      });

      it('should handle unknown element gracefully', () => {
        const timingData: TimingData = { seun: { element: 'unknown' } };
        const result = calculatePeriodScore(timingData, '목');
        expect(result.overall).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('calculateThemeScore', () => {
    describe('theme score structure', () => {
      it('should return all score components', () => {
        const result = calculateThemeScore('love');

        expect(result).toHaveProperty('overall');
        expect(result).toHaveProperty('potential');
        expect(result).toHaveProperty('timing');
        expect(result).toHaveProperty('compatibility');
      });

      it('should return scores between 0 and 100', () => {
        const themes: ReportTheme[] = ['love', 'career', 'wealth', 'health', 'family'];
        for (const theme of themes) {
          const result = calculateThemeScore(theme);
          expect(result.overall).toBeGreaterThanOrEqual(0);
          expect(result.overall).toBeLessThanOrEqual(100);
          expect(result.potential).toBeGreaterThanOrEqual(0);
          expect(result.potential).toBeLessThanOrEqual(100);
        }
      });
    });

    describe('sibsin bonus calculation', () => {
      it('should apply bonus for relevant sibsin (love theme)', () => {
        const sibsinDistribution = {
          '정재': 3,
          '편재': 2,
          '정관': 1,
        };
        const result = calculateThemeScore('love', sibsinDistribution);
        // (3 + 2 + 1) * 2 = 12 bonus
        expect(result.overall).toBeGreaterThan(65);
      });

      it('should apply bonus for relevant sibsin (career theme)', () => {
        const sibsinDistribution = {
          '정관': 4,
          '식신': 2,
        };
        const result = calculateThemeScore('career', sibsinDistribution);
        expect(result.overall).toBeGreaterThan(65);
      });

      it('should not exceed 100', () => {
        const sibsinDistribution = {
          '정재': 10,
          '편재': 10,
          '정관': 10,
          '편관': 10,
        };
        const result = calculateThemeScore('love', sibsinDistribution);
        expect(result.overall).toBeLessThanOrEqual(100);
      });
    });

    describe('theme-specific sibsin weights', () => {
      it('should consider 정재/편재 for love theme', () => {
        const withJaeSung = calculateThemeScore('love', { '정재': 5 });
        const withoutJaeSung = calculateThemeScore('love', { '비견': 5 });
        // 정재 is relevant for love, 비견 is not
        expect(withJaeSung.overall).toBeGreaterThanOrEqual(withoutJaeSung.overall - 10);
      });

      it('should consider 정인/편인 for health theme', () => {
        const sibsinDistribution = { '정인': 3, '편인': 2 };
        const result = calculateThemeScore('health', sibsinDistribution);
        expect(result.overall).toBeGreaterThan(65);
      });
    });

    describe('without sibsin distribution', () => {
      it('should use base score when no sibsin provided', () => {
        const result = calculateThemeScore('career');
        expect(result.overall).toBe(65);
      });
    });
  });

  describe('extractKeywords', () => {
    const mockSections: ThemedReportSections = {
      overview: 'Overview text',
      analysis: 'Analysis text',
      advice: 'Advice text',
      timing: 'Timing text',
    };

    describe('Korean keywords', () => {
      it('should return love keywords in Korean', () => {
        const keywords = extractKeywords(mockSections, 'love', 'ko');
        expect(keywords).toContain('인연');
        expect(keywords).toContain('만남');
        expect(keywords).toContain('소통');
      });

      it('should return career keywords in Korean', () => {
        const keywords = extractKeywords(mockSections, 'career', 'ko');
        expect(keywords).toContain('성장');
        expect(keywords).toContain('도전');
        expect(keywords).toContain('리더십');
      });

      it('should return wealth keywords in Korean', () => {
        const keywords = extractKeywords(mockSections, 'wealth', 'ko');
        expect(keywords).toContain('저축');
        expect(keywords).toContain('투자');
      });

      it('should return health keywords in Korean', () => {
        const keywords = extractKeywords(mockSections, 'health', 'ko');
        expect(keywords).toContain('균형');
        expect(keywords).toContain('활력');
      });

      it('should return family keywords in Korean', () => {
        const keywords = extractKeywords(mockSections, 'family', 'ko');
        expect(keywords).toContain('화합');
        expect(keywords).toContain('소통');
      });
    });

    describe('English keywords', () => {
      it('should return love keywords in English', () => {
        const keywords = extractKeywords(mockSections, 'love', 'en');
        expect(keywords).toContain('Connection');
        expect(keywords).toContain('Meeting');
        expect(keywords).toContain('Trust');
      });

      it('should return career keywords in English', () => {
        const keywords = extractKeywords(mockSections, 'career', 'en');
        expect(keywords).toContain('Growth');
        expect(keywords).toContain('Leadership');
      });

      it('should return wealth keywords in English', () => {
        const keywords = extractKeywords(mockSections, 'wealth', 'en');
        expect(keywords).toContain('Investment');
        expect(keywords).toContain('Opportunity');
      });
    });

    describe('keyword count', () => {
      it('should return 5 keywords for each theme', () => {
        const themes: ReportTheme[] = ['love', 'career', 'wealth', 'health', 'family'];
        const languages: ('ko' | 'en')[] = ['ko', 'en'];

        for (const theme of themes) {
          for (const lang of languages) {
            const keywords = extractKeywords(mockSections, theme, lang);
            expect(keywords.length).toBe(5);
          }
        }
      });
    });

    describe('unknown theme handling', () => {
      it('should return empty array for unknown theme', () => {
        const keywords = extractKeywords(mockSections, 'unknown' as ReportTheme, 'ko');
        expect(keywords).toEqual([]);
      });
    });
  });
});
