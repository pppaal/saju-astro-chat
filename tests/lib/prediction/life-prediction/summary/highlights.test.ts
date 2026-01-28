/**
 * Tests for src/lib/prediction/life-prediction/summary/highlights.ts
 * 하이라이트 추출 테스트
 */

import { describe, it, expect } from 'vitest';
import { extractUpcomingHighlights } from '@/lib/prediction/life-prediction/summary/highlights';

describe('highlights', () => {
  const baseTrend = {
    peakYears: [2025, 2028],
    yearlyScores: [
      {
        year: 2025, age: 35, grade: 1, score: 88,
        themes: ['최고운', '재물운'],
        opportunities: ['투자', '이직'],
        challenges: ['건강 주의'],
      },
      {
        year: 2028, age: 38, grade: 1, score: 92,
        themes: ['대운 전환'],
        opportunities: ['새 시작'],
        challenges: [],
      },
    ],
    daeunTransitions: [
      { year: 2026, age: 36, description: '대운 전환기', impact: 'positive' },
      { year: 2030, age: 40, description: '도전의 시기', impact: 'challenging' },
    ],
  } as any;

  describe('extractUpcomingHighlights', () => {
    it('should extract peak year highlights', () => {
      const highlights = extractUpcomingHighlights(baseTrend, undefined, 2024);

      const peaks = highlights.filter(h => h.type === 'peak');
      expect(peaks.length).toBeGreaterThanOrEqual(1);
      expect(peaks[0].title).toContain('2025');
      expect(peaks[0].score).toBe(88);
    });

    it('should extract daeun transition highlights', () => {
      const highlights = extractUpcomingHighlights(baseTrend, undefined, 2024);

      const transitions = highlights.filter(h => h.type === 'transition');
      expect(transitions.length).toBeGreaterThanOrEqual(1);
      expect(transitions[0].title).toContain('대운 전환');
    });

    it('should assign positive action items for positive transitions', () => {
      const highlights = extractUpcomingHighlights(baseTrend, undefined, 2024);

      const positiveTransition = highlights.find(
        h => h.type === 'transition' && h.title.includes('2026')
      );
      expect(positiveTransition).toBeDefined();
      expect(positiveTransition!.score).toBe(75);
      expect(positiveTransition!.actionItems).toContain('새로운 시작에 적합');
    });

    it('should assign challenging action items for challenging transitions', () => {
      const highlights = extractUpcomingHighlights(baseTrend, undefined, 2024);

      const challengeTransition = highlights.find(
        h => h.type === 'transition' && h.title.includes('2030')
      );
      expect(challengeTransition).toBeDefined();
      expect(challengeTransition!.score).toBe(35);
      expect(challengeTransition!.actionItems).toContain('변화에 대한 준비');
    });

    it('should filter out past years', () => {
      const highlights = extractUpcomingHighlights(baseTrend, undefined, 2027);

      // 2025 and 2026 should be filtered out
      const years2025 = highlights.filter(h => h.title.includes('2025'));
      const years2026 = highlights.filter(h => h.title.includes('2026'));
      expect(years2025).toHaveLength(0);
      expect(years2026).toHaveLength(0);
    });

    it('should sort highlights by date', () => {
      const highlights = extractUpcomingHighlights(baseTrend, undefined, 2024);

      for (let i = 1; i < highlights.length; i++) {
        expect(highlights[i].date.getTime()).toBeGreaterThanOrEqual(
          highlights[i - 1].date.getTime()
        );
      }
    });

    it('should limit to 10 highlights', () => {
      const manyPeaks = {
        ...baseTrend,
        peakYears: Array.from({ length: 12 }, (_, i) => 2025 + i),
        yearlyScores: Array.from({ length: 12 }, (_, i) => ({
          year: 2025 + i, age: 35 + i, grade: 1, score: 80,
          themes: ['테스트'], opportunities: ['기회'], challenges: [],
        })),
      };

      const highlights = extractUpcomingHighlights(manyPeaks, undefined, 2024);
      expect(highlights.length).toBeLessThanOrEqual(10);
    });

    it('should include life sync highlights when provided', () => {
      const lifeSync = {
        majorTransitions: [
          {
            year: 2027, age: 37,
            synergyType: 'amplify',
            synergyScore: 85,
            themes: ['성장', '도약'],
            opportunities: ['대규모 투자'],
            challenges: ['과부하 주의'],
            transits: [],
          },
        ],
      } as any;

      const highlights = extractUpcomingHighlights(baseTrend, lifeSync, 2024);

      const syncHighlight = highlights.find(h => h.title.includes('37세'));
      expect(syncHighlight).toBeDefined();
      expect(syncHighlight!.type).toBe('opportunity');
      expect(syncHighlight!.score).toBe(85);
      expect(syncHighlight!.actionItems).toContain('대규모 투자');
    });

    it('should mark clash sync as challenge type', () => {
      const lifeSync = {
        majorTransitions: [
          {
            year: 2027, age: 37,
            synergyType: 'clash',
            synergyScore: 40,
            themes: ['충돌'],
            opportunities: [],
            challenges: ['갈등 주의'],
            transits: [],
          },
        ],
      } as any;

      const highlights = extractUpcomingHighlights(baseTrend, lifeSync, 2024);

      const clashHighlight = highlights.find(h => h.title.includes('37세'));
      expect(clashHighlight!.type).toBe('challenge');
      expect(clashHighlight!.actionItems).toContain('갈등 주의');
    });

    it('should handle empty trend data', () => {
      const emptyTrend = {
        peakYears: [],
        yearlyScores: [],
        daeunTransitions: [],
      } as any;

      const highlights = extractUpcomingHighlights(emptyTrend, undefined, 2024);
      expect(highlights).toEqual([]);
    });

    it('should skip peak years not found in yearlyScores', () => {
      const trend = {
        ...baseTrend,
        peakYears: [2099], // Not in yearlyScores
      };

      const highlights = extractUpcomingHighlights(trend, undefined, 2024);
      const peaks = highlights.filter(h => h.type === 'peak');
      expect(peaks).toHaveLength(0);
    });
  });
});
