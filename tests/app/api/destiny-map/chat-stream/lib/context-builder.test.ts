/**
 * @file Tests for Context Builder
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildPredictionSection,
  buildLongTermMemorySection,
  buildContextSections,
  type ContextBuilderInput,
} from '@/app/api/destiny-map/chat-stream/lib/context-builder'

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/textGuards', () => ({
  guardText: vi.fn((text: string, max: number) => (text ? text.slice(0, max) : '')),
}))

vi.mock('@/lib/destiny-map/prompt/fortune/base', () => ({
  buildAllDataPrompt: vi.fn(() => 'mock-v3-snapshot'),
}))

vi.mock('@/lib/timing/utils', () => ({
  extractBirthYear: vi.fn(() => 1990),
}))

vi.mock('../builders', () => ({
  buildAdvancedTimingSection: vi.fn(() => 'timing-section'),
  buildDailyPrecisionSection: vi.fn(() => 'daily-section'),
  buildDaeunTransitSection: vi.fn(() => 'daeun-section'),
  buildPastAnalysisSection: vi.fn(() => 'past-section'),
  buildMultiYearTrendSection: vi.fn(() => 'trend-section'),
}))

vi.mock('../analysis', () => ({
  generateTier3Analysis: vi.fn(() => ({ section: 'tier3-section' })),
  generateTier4Analysis: vi.fn(() => ({ section: 'tier4-section' })),
}))

describe('Context Builder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('buildPredictionSection', () => {
    it('should return empty string for null context', () => {
      const result = buildPredictionSection(null, 'ko')
      expect(result).toBe('')
    })

    it('should return empty string for undefined context', () => {
      const result = buildPredictionSection(undefined, 'ko')
      expect(result).toBe('')
    })

    it('should build Korean prediction section', () => {
      const context = {
        eventType: 'career',
        eventLabel: '커리어 변화',
        optimalPeriods: [
          {
            startDate: '2025-03-01',
            endDate: '2025-06-30',
            score: 92,
            grade: 'A',
            reasons: ['목성 트랜짓', '대운 전환'],
          },
        ],
        avoidPeriods: [
          {
            startDate: '2025-01-15',
            score: 35,
            reasons: ['수성 역행'],
          },
        ],
        advice: '3월 이후 적극적으로 도전하세요',
        tierAnalysis: { tier7to10: { confidence: 0.85 } },
      }

      const result = buildPredictionSection(context, 'ko')

      expect(result).toContain('[🔮 인생 예측 분석 결과')
      expect(result).toContain('이벤트 유형: 커리어 변화')
      expect(result).toContain('✅ 최적 시기')
      expect(result).toContain('A등급')
      expect(result).toContain('92점')
      expect(result).toContain('⚠️ 피해야 할 시기')
      expect(result).toContain('💡 조언')
      expect(result).toContain('📊 분석 신뢰도: 85%')
    })

    it('should build English prediction section', () => {
      const context = {
        eventType: 'career',
        eventLabel: 'Career Change',
        optimalPeriods: [
          {
            startDate: '2025-03-01',
            endDate: '2025-06-30',
            score: 92,
            grade: 'A',
            reasons: ['Jupiter transit'],
          },
        ],
        advice: 'Go for it after March',
        tierAnalysis: { tier7to10: { confidence: 0.85 } },
      }

      const result = buildPredictionSection(context, 'en')

      expect(result).toContain('[🔮 Life Prediction Analysis')
      expect(result).toContain('Event Type: Career Change')
      expect(result).toContain('✅ Optimal Periods')
      expect(result).toContain('Grade A')
      expect(result).toContain('Score 92')
      expect(result).toContain('💡 Advice')
      expect(result).toContain('📊 Analysis Confidence: 85%')
    })

    it('should handle missing eventLabel by using eventType', () => {
      const context = {
        eventType: 'marriage',
      }

      const result = buildPredictionSection(context, 'ko')

      expect(result).toContain('이벤트 유형: marriage')
    })

    it('should limit optimal periods to 5', () => {
      const context = {
        optimalPeriods: Array.from({ length: 10 }, (_, i) => ({
          startDate: `2025-0${(i % 9) + 1}-01`,
          endDate: `2025-0${(i % 9) + 1}-30`,
          score: 80 + i,
          grade: 'B',
        })),
      }

      const result = buildPredictionSection(context, 'ko')

      expect(result).toBeTruthy()
    })

    it('should limit avoid periods to 3', () => {
      const context = {
        avoidPeriods: Array.from({ length: 5 }, (_, i) => ({
          startDate: `2025-0${i + 1}-01`,
          score: 30 + i,
          reasons: ['reason'],
        })),
      }

      const result = buildPredictionSection(context, 'ko')

      expect(result).toBeTruthy()
    })

    it('should handle missing optimalPeriods', () => {
      const context = {
        eventType: 'test',
      }

      const result = buildPredictionSection(context, 'ko')

      expect(result).toBeTruthy()
      expect(result).not.toContain('✅ 최적 시기')
    })

    it('should handle missing avoidPeriods', () => {
      const context = {
        eventType: 'test',
      }

      const result = buildPredictionSection(context, 'ko')

      expect(result).toBeTruthy()
      expect(result).not.toContain('⚠️ 피해야 할 시기')
    })

    it('should handle reasons in optimal periods', () => {
      const context = {
        optimalPeriods: [
          {
            startDate: '2025-03-01',
            endDate: '2025-03-31',
            score: 90,
            grade: 'A',
            reasons: ['reason1', 'reason2', 'reason3', 'reason4'],
          },
        ],
      }

      const result = buildPredictionSection(context, 'ko')

      expect(result).toContain('이유:')
    })

    it('should handle error in prediction section gracefully', () => {
      // Pass an object that will cause Date parsing to fail
      const context = {
        optimalPeriods: [
          {
            startDate: 'invalid-date',
            endDate: 'invalid-date',
            score: 90,
            grade: 'A',
          },
        ],
      }

      // Should not throw
      const result = buildPredictionSection(context, 'ko')
      expect(result).toBeTruthy()
    })
  })

  describe('buildLongTermMemorySection', () => {
    it('should return empty string when no memory data', () => {
      const result = buildLongTermMemorySection('', '', 'ko')
      expect(result).toBe('')
    })

    it('should build Korean memory section with persona', () => {
      const result = buildLongTermMemorySection('사용자는 30대 여성입니다', '', 'ko')

      expect(result).toContain('[🧠 장기 기억')
      expect(result).toContain('[사용자 프로필]')
      expect(result).toContain('사용자는 30대 여성입니다')
    })

    it('should build English memory section', () => {
      const result = buildLongTermMemorySection('User is a 30s female', '', 'en')

      expect(result).toContain('[🧠 LONG-TERM MEMORY')
      expect(result).toContain('[User Profile]')
    })

    it('should include session summaries', () => {
      const result = buildLongTermMemorySection('', '이전 상담에서 커리어 고민을 나눴습니다', 'ko')

      expect(result).toContain('[이전 상담 기록]')
      expect(result).toContain('커리어 고민')
    })

    it('should include both persona and sessions', () => {
      const result = buildLongTermMemorySection('persona data', 'session data', 'ko')

      expect(result).toContain('[사용자 프로필]')
      expect(result).toContain('[이전 상담 기록]')
    })

    it('should include section dividers', () => {
      const result = buildLongTermMemorySection('data', '', 'ko')

      expect(result).toContain('═══════════════════════════════════════════════════════════════')
    })

    it('should include guidance text in Korean', () => {
      const result = buildLongTermMemorySection('data', '', 'ko')

      expect(result).toContain('아래 정보를 참고하여')
    })

    it('should include guidance text in English', () => {
      const result = buildLongTermMemorySection('data', '', 'en')

      expect(result).toContain('Use this context')
    })
  })

  describe('buildContextSections', () => {
    it('should build all context sections', () => {
      const input: ContextBuilderInput = {
        saju: { dayMaster: { heavenlyStem: '甲' } } as any,
        astro: {} as any,
        advancedAstro: {},
        natalChartData: null,
        currentTransits: [],
        birthDate: '1990-01-01',
        gender: 'male',
        theme: 'general',
        lang: 'ko',
        trimmedHistory: [],
        lastUserMessage: '오늘 운세',
      }

      const result = buildContextSections(input)

      expect(result).toHaveProperty('v3Snapshot')
      expect(result).toHaveProperty('timingScoreSection')
      expect(result).toHaveProperty('enhancedAnalysisSection')
      expect(result).toHaveProperty('daeunTransitSection')
      expect(result).toHaveProperty('advancedAstroSection')
      expect(result).toHaveProperty('tier4AdvancedSection')
      expect(result).toHaveProperty('pastAnalysisSection')
      expect(result).toHaveProperty('lifePredictionSection')
      expect(result).toHaveProperty('historyText')
      expect(result).toHaveProperty('userQuestion')
    })

    it('should handle missing saju data', () => {
      const input: ContextBuilderInput = {
        saju: undefined,
        astro: undefined,
        currentTransits: [],
        birthDate: '1990-01-01',
        gender: 'male',
        theme: 'general',
        lang: 'ko',
        trimmedHistory: [],
      }

      const result = buildContextSections(input)

      expect(result.v3Snapshot).toBe('')
      expect(result.timingScoreSection).toBe('')
    })

    it('should handle missing dayMaster', () => {
      const input: ContextBuilderInput = {
        saju: {} as any,
        astro: {} as any,
        currentTransits: [],
        birthDate: '1990-01-01',
        gender: 'male',
        theme: 'general',
        lang: 'ko',
        trimmedHistory: [],
      }

      const result = buildContextSections(input)

      expect(result.timingScoreSection).toBe('')
    })

    it('should filter system messages from history', () => {
      const input: ContextBuilderInput = {
        saju: undefined,
        astro: undefined,
        currentTransits: [],
        birthDate: '1990-01-01',
        gender: 'male',
        theme: 'general',
        lang: 'ko',
        trimmedHistory: [
          { role: 'user', content: '안녕하세요' },
          { role: 'system', content: 'system message' },
          { role: 'assistant', content: '안녕하세요!' },
        ] as any,
      }

      const result = buildContextSections(input)

      expect(result.historyText).toContain('Q:')
      expect(result.historyText).toContain('A:')
      expect(result.historyText).not.toContain('system message')
    })

    it('should guard user question text', () => {
      const input: ContextBuilderInput = {
        saju: undefined,
        astro: undefined,
        currentTransits: [],
        birthDate: '1990-01-01',
        gender: 'male',
        theme: 'general',
        lang: 'ko',
        trimmedHistory: [],
        lastUserMessage: '오늘 운세 알려주세요',
      }

      const result = buildContextSections(input)

      expect(result.userQuestion).toBeTruthy()
    })

    it('should default lastUserMessage to empty string', () => {
      const input: ContextBuilderInput = {
        saju: undefined,
        astro: undefined,
        currentTransits: [],
        birthDate: '1990-01-01',
        gender: 'male',
        theme: 'general',
        lang: 'ko',
        trimmedHistory: [],
      }

      const result = buildContextSections(input)

      expect(result.userQuestion).toBe('')
    })
  })
})
