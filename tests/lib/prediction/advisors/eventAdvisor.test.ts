/**
 * EventAdvisor Tests
 * 이벤트별 조언 생성 모듈 테스트
 */

import { describe, it, expect } from 'vitest';
import { EventAdvisor, type AdvisorContext } from '@/lib/prediction/advisors/eventAdvisor';
import type { PeriodClassifierResult, OptimalPeriod, AvoidPeriod } from '@/lib/prediction/analyzers/periodClassifier';

// Helper functions to create test data
function createOptimalPeriod(overrides: Partial<OptimalPeriod> = {}): OptimalPeriod {
  return {
    startDate: '2024-06-01',
    endDate: '2024-06-30',
    score: 85,
    grade: 'excellent',
    reasons: ['좋은 기운', '길한 조합', '흐름 양호'],
    advice: '매우 좋은 시기입니다.',
    ...overrides,
  };
}

function createAvoidPeriod(overrides: Partial<AvoidPeriod> = {}): AvoidPeriod {
  return {
    startDate: '2024-03-01',
    endDate: '2024-03-31',
    score: 35,
    reasons: ['충돌', '기운 약함'],
    ...overrides,
  };
}

function createEmptyPeriods(): PeriodClassifierResult {
  return {
    optimalPeriods: [],
    avoidPeriods: [],
    candidatePeriods: [],
  };
}

function createContext(overrides: Partial<AdvisorContext> = {}): AdvisorContext {
  return {
    eventType: 'marriage',
    periods: createEmptyPeriods(),
    searchRange: {
      startYear: 2024,
      endYear: 2026,
    },
    ...overrides,
  };
}

describe('EventAdvisor', () => {
  describe('generateAdvice', () => {
    describe('with optimal periods', () => {
      it('should generate advice for single optimal period', () => {
        const context = createContext({
          eventType: 'marriage',
          periods: {
            optimalPeriods: [createOptimalPeriod()],
            avoidPeriods: [],
            candidatePeriods: [],
          },
        });

        const advice = EventAdvisor.generateAdvice(context);

        expect(advice).toContain('최적 시기');
        expect(advice).toContain('2024년 6월');
        expect(advice).toContain('결혼');
      });

      it('should generate advice for two optimal periods', () => {
        const context = createContext({
          eventType: 'business',
          periods: {
            optimalPeriods: [
              createOptimalPeriod({ startDate: '2024-06-01' }),
              createOptimalPeriod({ startDate: '2024-09-01' }),
            ],
            avoidPeriods: [],
            candidatePeriods: [],
          },
        });

        const advice = EventAdvisor.generateAdvice(context);

        expect(advice).toContain('최적 시기');
        expect(advice).toContain('2024년 6월');
        expect(advice).toContain('2024년 9월');
        expect(advice).toContain('첫 번째 기간이 가장 유리');
      });

      it('should generate advice for multiple (3+) optimal periods', () => {
        const context = createContext({
          eventType: 'relocation',
          periods: {
            optimalPeriods: [
              createOptimalPeriod({ startDate: '2024-06-01' }),
              createOptimalPeriod({ startDate: '2024-09-01' }),
              createOptimalPeriod({ startDate: '2025-03-01' }),
            ],
            avoidPeriods: [],
            candidatePeriods: [],
          },
        });

        const advice = EventAdvisor.generateAdvice(context);

        expect(advice).toContain('3개');
        expect(advice).toContain('가장 좋은 시기');
        expect(advice).toContain('집중하세요');
      });
    });

    describe('with candidate periods only', () => {
      it('should generate advice for candidate periods', () => {
        const context = createContext({
          eventType: 'investment',
          periods: {
            optimalPeriods: [],
            avoidPeriods: [],
            candidatePeriods: [createOptimalPeriod({ grade: 'good' })],
          },
        });

        const advice = EventAdvisor.generateAdvice(context);

        expect(advice).toContain('적합한 시기');
        expect(advice).toContain('충분한 준비');
        expect(advice).toContain('좋은 결과');
      });
    });

    describe('with avoid periods only', () => {
      it('should generate cautious advice when only avoid periods exist', () => {
        const context = createContext({
          eventType: 'career',
          periods: {
            optimalPeriods: [],
            avoidPeriods: [createAvoidPeriod()],
            candidatePeriods: [],
          },
        });

        const advice = EventAdvisor.generateAdvice(context);

        expect(advice).toContain('최적의 시기를 찾기 어렵');
        expect(advice).toContain('신중한 준비');
      });
    });

    describe('with no periods', () => {
      it('should generate no periods advice', () => {
        const context = createContext({
          eventType: 'marriage',
          periods: createEmptyPeriods(),
          searchRange: { startYear: 2024, endYear: 2026 },
        });

        const advice = EventAdvisor.generateAdvice(context);

        expect(advice).toContain('2024년');
        expect(advice).toContain('2026년');
        expect(advice).toContain('발견되지 않았습니다');
        expect(advice).toContain('개인의 노력과 준비');
      });
    });

    describe('event type names', () => {
      it('should use Korean event names', () => {
        // Use event types that exist in EVENT_TYPE_NAMES_KO
        const eventTypes = ['marriage', 'business', 'move', 'investment', 'career'];

        eventTypes.forEach((eventType) => {
          const context = createContext({
            eventType,
            periods: {
              optimalPeriods: [createOptimalPeriod()],
              avoidPeriods: [],
              candidatePeriods: [],
            },
          });

          const advice = EventAdvisor.generateAdvice(context);
          // Should contain Korean text and not raw event type
          expect(advice).not.toMatch(new RegExp(`${eventType}을`));
        });
      });

      it('should fallback to event type when no Korean name exists', () => {
        const context = createContext({
          eventType: 'unknownEvent',
          periods: {
            optimalPeriods: [createOptimalPeriod()],
            avoidPeriods: [],
            candidatePeriods: [],
          },
        });

        const advice = EventAdvisor.generateAdvice(context);

        expect(advice).toContain('unknownEvent');
      });
    });
  });

  describe('findNextBestWindow', () => {
    it('should return first optimal period when available', () => {
      const periods: PeriodClassifierResult = {
        optimalPeriods: [
          createOptimalPeriod({ startDate: '2024-06-01' }),
          createOptimalPeriod({ startDate: '2024-09-01' }),
        ],
        avoidPeriods: [],
        candidatePeriods: [createOptimalPeriod({ startDate: '2025-01-01' })],
      };

      const result = EventAdvisor.findNextBestWindow(periods);

      expect(result).not.toBeNull();
      expect(result?.startDate).toBe('2024-06-01');
    });

    it('should return first candidate period when no optimal periods', () => {
      const periods: PeriodClassifierResult = {
        optimalPeriods: [],
        avoidPeriods: [],
        candidatePeriods: [
          createOptimalPeriod({ startDate: '2025-01-01', grade: 'good' }),
          createOptimalPeriod({ startDate: '2025-04-01', grade: 'good' }),
        ],
      };

      const result = EventAdvisor.findNextBestWindow(periods);

      expect(result).not.toBeNull();
      expect(result?.startDate).toBe('2025-01-01');
    });

    it('should return null when no optimal or candidate periods', () => {
      const periods: PeriodClassifierResult = {
        optimalPeriods: [],
        avoidPeriods: [createAvoidPeriod()],
        candidatePeriods: [],
      };

      const result = EventAdvisor.findNextBestWindow(periods);

      expect(result).toBeNull();
    });

    it('should return null for completely empty periods', () => {
      const periods = createEmptyPeriods();

      const result = EventAdvisor.findNextBestWindow(periods);

      expect(result).toBeNull();
    });
  });

  describe('generateDetailedAdvice', () => {
    it('should return all advice components', () => {
      const context = createContext({
        eventType: 'marriage',
        periods: {
          optimalPeriods: [createOptimalPeriod()],
          avoidPeriods: [createAvoidPeriod()],
          candidatePeriods: [],
        },
      });

      const result = EventAdvisor.generateDetailedAdvice(context);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('bestPeriodAdvice');
      expect(result).toHaveProperty('avoidanceAdvice');
      expect(result).toHaveProperty('preparationTips');
    });

    it('should generate summary from generateAdvice', () => {
      const context = createContext({
        eventType: 'business',
        periods: {
          optimalPeriods: [createOptimalPeriod()],
          avoidPeriods: [],
          candidatePeriods: [],
        },
      });

      const result = EventAdvisor.generateDetailedAdvice(context);

      expect(result.summary).toContain('최적 시기');
    });

    it('should include best period advice when optimal periods exist', () => {
      const context = createContext({
        eventType: 'investment',
        periods: {
          optimalPeriods: [
            createOptimalPeriod({
              reasons: ['이유1', '이유2', '이유3', '이유4'],
            }),
          ],
          avoidPeriods: [],
          candidatePeriods: [],
        },
      });

      const result = EventAdvisor.generateDetailedAdvice(context);

      expect(result.bestPeriodAdvice).not.toBeNull();
      expect(result.bestPeriodAdvice).toContain('가장 유리');
      // Should include up to 3 reasons
      expect(result.bestPeriodAdvice).toContain('이유1');
      expect(result.bestPeriodAdvice).toContain('이유2');
      expect(result.bestPeriodAdvice).toContain('이유3');
    });

    it('should return null bestPeriodAdvice when no optimal periods', () => {
      const context = createContext({
        eventType: 'career',
        periods: createEmptyPeriods(),
      });

      const result = EventAdvisor.generateDetailedAdvice(context);

      expect(result.bestPeriodAdvice).toBeNull();
    });

    it('should include avoidance advice when avoid periods exist', () => {
      const context = createContext({
        eventType: 'relocation',
        periods: {
          optimalPeriods: [],
          avoidPeriods: [
            createAvoidPeriod({ startDate: '2024-03-01' }),
            createAvoidPeriod({ startDate: '2024-07-01' }),
          ],
          candidatePeriods: [],
        },
      });

      const result = EventAdvisor.generateDetailedAdvice(context);

      expect(result.avoidanceAdvice).not.toBeNull();
      expect(result.avoidanceAdvice).toContain('2개');
      expect(result.avoidanceAdvice).toContain('회피 기간');
      expect(result.avoidanceAdvice).toContain('주의');
    });

    it('should return null avoidanceAdvice when no avoid periods', () => {
      const context = createContext({
        eventType: 'marriage',
        periods: {
          optimalPeriods: [createOptimalPeriod()],
          avoidPeriods: [],
          candidatePeriods: [],
        },
      });

      const result = EventAdvisor.generateDetailedAdvice(context);

      expect(result.avoidanceAdvice).toBeNull();
    });

    describe('preparationTips', () => {
      it('should return marriage tips for marriage event', () => {
        const context = createContext({
          eventType: 'marriage',
          periods: createEmptyPeriods(),
        });

        const result = EventAdvisor.generateDetailedAdvice(context);

        expect(result.preparationTips).toBeInstanceOf(Array);
        expect(result.preparationTips.length).toBeGreaterThan(0);
        expect(result.preparationTips.some(tip => tip.includes('소통'))).toBe(true);
      });

      it('should return business tips for business event', () => {
        const context = createContext({
          eventType: 'business',
          periods: createEmptyPeriods(),
        });

        const result = EventAdvisor.generateDetailedAdvice(context);

        expect(result.preparationTips.some(tip => tip.includes('사업 계획'))).toBe(true);
      });

      it('should return relocation tips for relocation event', () => {
        const context = createContext({
          eventType: 'relocation',
          periods: createEmptyPeriods(),
        });

        const result = EventAdvisor.generateDetailedAdvice(context);

        // Check that one of the relocation tips is included
        expect(result.preparationTips.length).toBeGreaterThan(0);
        // Relocation tips include '답사', '이사', '가족'
        const hasRelocationTip = result.preparationTips.some(
          tip => tip.includes('답사') || tip.includes('이사') || tip.includes('가족')
        );
        expect(hasRelocationTip).toBe(true);
      });

      it('should return investment tips for investment event', () => {
        const context = createContext({
          eventType: 'investment',
          periods: createEmptyPeriods(),
        });

        const result = EventAdvisor.generateDetailedAdvice(context);

        expect(result.preparationTips.some(tip => tip.includes('분산 투자'))).toBe(true);
      });

      it('should return career tips for career event', () => {
        const context = createContext({
          eventType: 'career',
          periods: createEmptyPeriods(),
        });

        const result = EventAdvisor.generateDetailedAdvice(context);

        expect(result.preparationTips.some(tip => tip.includes('자기개발'))).toBe(true);
      });

      it('should return default tips for unknown event type', () => {
        const context = createContext({
          eventType: 'unknownType',
          periods: createEmptyPeriods(),
        });

        const result = EventAdvisor.generateDetailedAdvice(context);

        expect(result.preparationTips.length).toBeGreaterThan(0);
        expect(result.preparationTips.some(tip => tip.includes('준비와 계획'))).toBe(true);
      });
    });
  });

  describe('period formatting', () => {
    it('should format January correctly', () => {
      const context = createContext({
        eventType: 'marriage',
        periods: {
          optimalPeriods: [createOptimalPeriod({ startDate: '2024-01-15' })],
          avoidPeriods: [],
          candidatePeriods: [],
        },
      });

      const advice = EventAdvisor.generateAdvice(context);

      expect(advice).toContain('2024년 1월');
    });

    it('should format December correctly', () => {
      const context = createContext({
        eventType: 'business',
        periods: {
          optimalPeriods: [createOptimalPeriod({ startDate: '2025-12-01' })],
          avoidPeriods: [],
          candidatePeriods: [],
        },
      });

      const advice = EventAdvisor.generateAdvice(context);

      expect(advice).toContain('2025년 12월');
    });
  });

  describe('edge cases', () => {
    it('should handle empty reasons array in optimal period', () => {
      const context = createContext({
        eventType: 'marriage',
        periods: {
          optimalPeriods: [createOptimalPeriod({ reasons: [] })],
          avoidPeriods: [],
          candidatePeriods: [],
        },
      });

      // Should not throw
      expect(() => EventAdvisor.generateDetailedAdvice(context)).not.toThrow();
    });

    it('should handle single reason in optimal period', () => {
      const context = createContext({
        eventType: 'business',
        periods: {
          optimalPeriods: [createOptimalPeriod({ reasons: ['단일 이유'] })],
          avoidPeriods: [],
          candidatePeriods: [],
        },
      });

      const result = EventAdvisor.generateDetailedAdvice(context);

      expect(result.bestPeriodAdvice).toContain('단일 이유');
    });

    it('should prioritize optimal over candidate periods', () => {
      const context = createContext({
        eventType: 'investment',
        periods: {
          optimalPeriods: [createOptimalPeriod({ startDate: '2024-06-01' })],
          avoidPeriods: [],
          candidatePeriods: [createOptimalPeriod({ startDate: '2024-03-01', grade: 'good' })],
        },
      });

      const advice = EventAdvisor.generateAdvice(context);

      expect(advice).toContain('최적 시기');
      expect(advice).toContain('2024년 6월');
    });
  });
});
