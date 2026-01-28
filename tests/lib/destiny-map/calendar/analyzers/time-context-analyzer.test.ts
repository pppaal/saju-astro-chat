/**
 * Tests for src/lib/destiny-map/calendar/analyzers/time-context-analyzer.ts
 * 시간 맥락 분석 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeTimeContext, type TimeContextInput } from '@/lib/destiny-map/calendar/analyzers/time-context-analyzer';

describe('time-context-analyzer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set "today" to 2024-06-15
    vi.setSystemTime(new Date(2024, 5, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseInput: TimeContextInput = {
    date: new Date(2024, 5, 15),
    grade: 3 as any,
    gongmangStatus: { isEmpty: false },
    shinsalActive: [],
    transitSync: { isMajorTransitYear: false },
  };

  describe('basic time context', () => {
    it('should identify today', () => {
      const result = analyzeTimeContext(baseInput);

      expect(result.isToday).toBe(true);
      expect(result.isPast).toBe(false);
      expect(result.isFuture).toBe(false);
      expect(result.daysFromToday).toBe(0);
    });

    it('should identify past date', () => {
      const result = analyzeTimeContext({
        ...baseInput,
        date: new Date(2024, 5, 10), // 5 days ago
      });

      expect(result.isPast).toBe(true);
      expect(result.isFuture).toBe(false);
      expect(result.isToday).toBe(false);
      expect(result.daysFromToday).toBe(-5);
    });

    it('should identify future date', () => {
      const result = analyzeTimeContext({
        ...baseInput,
        date: new Date(2024, 5, 20), // 5 days from now
      });

      expect(result.isFuture).toBe(true);
      expect(result.isPast).toBe(false);
      expect(result.isToday).toBe(false);
      expect(result.daysFromToday).toBe(5);
    });
  });

  describe('retrospective notes', () => {
    it('should not generate note for future dates', () => {
      const result = analyzeTimeContext({
        ...baseInput,
        date: new Date(2024, 5, 20),
        grade: 1 as any,
      });

      expect(result.retrospectiveNote).toBeUndefined();
    });

    it('should not generate note for today', () => {
      const result = analyzeTimeContext({
        ...baseInput,
        grade: 1 as any,
      });

      expect(result.retrospectiveNote).toBeUndefined();
    });

    it('should generate note for very good past day (grade <= 1)', () => {
      const result = analyzeTimeContext({
        ...baseInput,
        date: new Date(2024, 5, 10),
        grade: 1 as any,
      });

      expect(result.retrospectiveNote).toContain('매우 좋은 기운');
    });

    it('should generate note for challenging past day (grade >= 4)', () => {
      const result = analyzeTimeContext({
        ...baseInput,
        date: new Date(2024, 5, 10),
        grade: 4 as any,
      });

      expect(result.retrospectiveNote).toContain('도전적인 기운');
    });

    it('should generate gongmang note for past day with isEmpty', () => {
      const result = analyzeTimeContext({
        ...baseInput,
        date: new Date(2024, 5, 10),
        grade: 3 as any,
        gongmangStatus: { isEmpty: true },
      });

      expect(result.retrospectiveNote).toContain('공망');
    });

    it('should generate lucky shinsal note for past day', () => {
      const result = analyzeTimeContext({
        ...baseInput,
        date: new Date(2024, 5, 10),
        grade: 3 as any,
        shinsalActive: [{ type: 'lucky' }],
      });

      expect(result.retrospectiveNote).toContain('길신');
    });

    it('should generate transit note for major transit year', () => {
      const result = analyzeTimeContext({
        ...baseInput,
        date: new Date(2024, 5, 10),
        grade: 3 as any,
        transitSync: { isMajorTransitYear: true, transitType: '대운 전환' },
      });

      expect(result.retrospectiveNote).toContain('대운 전환');
      expect(result.retrospectiveNote).toContain('전환점');
    });

    it('should prioritize grade notes over other factors', () => {
      // grade <= 1 should take priority
      const result = analyzeTimeContext({
        ...baseInput,
        date: new Date(2024, 5, 10),
        grade: 1 as any,
        gongmangStatus: { isEmpty: true },
        shinsalActive: [{ type: 'lucky' }],
        transitSync: { isMajorTransitYear: true, transitType: '대운' },
      });

      expect(result.retrospectiveNote).toContain('매우 좋은 기운');
    });

    it('should return no note for neutral past day', () => {
      const result = analyzeTimeContext({
        ...baseInput,
        date: new Date(2024, 5, 10),
        grade: 2 as any,
        gongmangStatus: { isEmpty: false },
        shinsalActive: [{ type: 'special' }],
        transitSync: { isMajorTransitYear: false },
      });

      expect(result.retrospectiveNote).toBeUndefined();
    });
  });
});
