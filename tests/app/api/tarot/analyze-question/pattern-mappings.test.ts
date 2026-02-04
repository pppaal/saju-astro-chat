/**
 * @file Tests for Pattern Mappings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  PATTERN_MAPPINGS,
  getExamInterviewMapping,
  type PatternMapping,
} from '@/app/api/tarot/analyze-question/pattern-mappings'

// Mock all question classifiers
vi.mock('@/lib/Tarot/questionClassifiers', () => ({
  isYesNoQuestion: vi.fn((q: string) => /할까|할지|좋을까|should|will/i.test(q)),
  isCrushQuestion: vi.fn((q: string) => /좋아하|마음|crush|feelings/i.test(q)),
  isReconciliationQuestion: vi.fn((q: string) => /재회|다시|reconcil/i.test(q)),
  isExamInterviewQuestion: vi.fn((q: string) => /시험|면접|합격|exam|interview|test|pass/i.test(q)),
  isJobChangeQuestion: vi.fn((q: string) => /이직|퇴사|job.*change|quit/i.test(q)),
  isComparisonQuestion: vi.fn((q: string) => /비교|어느.*쪽|compare|which.*one/i.test(q)),
  isTimingQuestion: vi.fn((q: string) => /언제|시기|timing|when/i.test(q)),
  isFindingPartnerQuestion: vi.fn((q: string) => /인연|만남|partner|soulmate/i.test(q)),
  isTodayFortuneQuestion: vi.fn((q: string) => /오늘|today/i.test(q)),
  isWeeklyMonthlyQuestion: vi.fn((q: string) =>
    /이번.*주|이번.*달|this.*week|this.*month/i.test(q)
  ),
  isMoneyFortuneQuestion: vi.fn((q: string) => /돈|재물|money|finance/i.test(q)),
  isHealthFortuneQuestion: vi.fn((q: string) => /건강|health/i.test(q)),
  isFamilyRelationQuestion: vi.fn((q: string) => /가족|family/i.test(q)),
  isBusinessQuestion: vi.fn((q: string) => /사업|창업|business/i.test(q)),
  isGeneralFortuneQuestion: vi.fn((q: string) => /운세|fortune/i.test(q)),
  isStudyFortuneQuestion: vi.fn((q: string) => /학업|공부|study/i.test(q)),
  isTravelQuestion: vi.fn((q: string) => /여행|travel/i.test(q)),
  isWorkRelationQuestion: vi.fn((q: string) => /직장.*관계|workplace/i.test(q)),
  isLegalQuestion: vi.fn((q: string) => /법적|소송|legal/i.test(q)),
  isDrivingQuestion: vi.fn((q: string) => /운전|driving/i.test(q)),
  isPetQuestion: vi.fn((q: string) => /반려|pet/i.test(q)),
  isFriendRelationQuestion: vi.fn((q: string) => /친구|friend/i.test(q)),
  isMarriageRelationQuestion: vi.fn((q: string) => /결혼|연애|marriage|dating/i.test(q)),
  isBeautyFashionQuestion: vi.fn((q: string) => /외모|패션|beauty|fashion/i.test(q)),
  isMovingRealEstateQuestion: vi.fn((q: string) => /이사|부동산|moving|realestate/i.test(q)),
  isParentCareQuestion: vi.fn((q: string) => /부모|parent/i.test(q)),
  isSleepRestQuestion: vi.fn((q: string) => /수면|sleep/i.test(q)),
  isOnlineShoppingQuestion: vi.fn((q: string) => /쇼핑|shopping/i.test(q)),
  isRentalLeaseQuestion: vi.fn((q: string) => /임대|rental/i.test(q)),
  isPhoneDeviceQuestion: vi.fn((q: string) => /핸드폰|phone|device/i.test(q)),
  isHairAppearanceQuestion: vi.fn((q: string) => /머리|hair/i.test(q)),
  isGiftPresentQuestion: vi.fn((q: string) => /선물|gift/i.test(q)),
  isDietWeightQuestion: vi.fn((q: string) => /다이어트|diet|weight/i.test(q)),
  isLanguageLearningQuestion: vi.fn((q: string) => /외국어|language.*learn/i.test(q)),
  isDriverLicenseQuestion: vi.fn((q: string) => /면허|license/i.test(q)),
  isVolunteerCharityQuestion: vi.fn((q: string) => /봉사|volunteer/i.test(q)),
  isCoupleFightQuestion: vi.fn((q: string) => /싸움|화해|fight.*couple/i.test(q)),
}))

describe('Pattern Mappings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('PATTERN_MAPPINGS structure', () => {
    it('should be an array of PatternMapping objects', () => {
      expect(Array.isArray(PATTERN_MAPPINGS)).toBe(true)
      expect(PATTERN_MAPPINGS.length).toBeGreaterThan(0)
    })

    it('should have required fields in each mapping', () => {
      for (const mapping of PATTERN_MAPPINGS) {
        expect(mapping).toHaveProperty('check')
        expect(mapping).toHaveProperty('targetSpread')
        expect(mapping).toHaveProperty('themeId')
        expect(mapping).toHaveProperty('reason')
        expect(mapping).toHaveProperty('koExplanation')
        expect(mapping).toHaveProperty('enExplanation')
        expect(mapping).toHaveProperty('priority')
        expect(typeof mapping.check).toBe('function')
        expect(typeof mapping.targetSpread).toBe('string')
        expect(typeof mapping.priority).toBe('number')
      }
    })

    it('should be sorted by priority (ascending)', () => {
      for (let i = 1; i < PATTERN_MAPPINGS.length; i++) {
        expect(PATTERN_MAPPINGS[i].priority).toBeGreaterThanOrEqual(
          PATTERN_MAPPINGS[i - 1].priority
        )
      }
    })

    it('should have celtic-cross as highest priority spread', () => {
      expect(PATTERN_MAPPINGS[0].targetSpread).toBe('celtic-cross')
      expect(PATTERN_MAPPINGS[0].priority).toBe(1)
    })

    it('should have yes-no as lowest priority (catch-all)', () => {
      const lastMapping = PATTERN_MAPPINGS[PATTERN_MAPPINGS.length - 1]
      expect(lastMapping.targetSpread).toBe('yes-no-why')
      expect(lastMapping.priority).toBe(99)
    })
  })

  describe('Celtic Cross pattern check', () => {
    it('should match Korean comprehensive queries', () => {
      const celticCross = PATTERN_MAPPINGS.find((m) => m.targetSpread === 'celtic-cross')!
      expect(celticCross.check('종합적으로 봐주세요')).toBe(true)
      expect(celticCross.check('전체적인 분석')).toBe(true)
      expect(celticCross.check('상세하게 알려주세요')).toBe(true)
      expect(celticCross.check('심층 분석')).toBe(true)
    })

    it('should match English comprehensive queries', () => {
      const celticCross = PATTERN_MAPPINGS.find((m) => m.targetSpread === 'celtic-cross')!
      expect(celticCross.check('comprehensive reading')).toBe(true)
      expect(celticCross.check('detailed analysis')).toBe(true)
      expect(celticCross.check('full picture please')).toBe(true)
      expect(celticCross.check('all aspects')).toBe(true)
      expect(celticCross.check('in-depth reading')).toBe(true)
    })

    it('should not match simple queries', () => {
      const celticCross = PATTERN_MAPPINGS.find((m) => m.targetSpread === 'celtic-cross')!
      expect(celticCross.check('오늘 운세')).toBe(false)
      expect(celticCross.check('hello')).toBe(false)
    })
  })

  describe('Spread type coverage', () => {
    it('should include two-paths spread for comparison', () => {
      const match = PATTERN_MAPPINGS.find((m) => m.targetSpread === 'two-paths')
      expect(match).toBeDefined()
      expect(match!.themeId).toBe('decisions-crossroads')
    })

    it('should include finding-a-partner spread', () => {
      const match = PATTERN_MAPPINGS.find((m) => m.targetSpread === 'finding-a-partner')
      expect(match).toBeDefined()
      expect(match!.themeId).toBe('love-relationships')
    })

    it('should include job-change spread', () => {
      const match = PATTERN_MAPPINGS.find((m) => m.targetSpread === 'job-change')
      expect(match).toBeDefined()
      expect(match!.themeId).toBe('career-work')
    })

    it('should include day-card spread', () => {
      const match = PATTERN_MAPPINGS.find((m) => m.targetSpread === 'day-card')
      expect(match).toBeDefined()
      expect(match!.themeId).toBe('daily-reading')
    })

    it('should include financial-snapshot spread', () => {
      const matches = PATTERN_MAPPINGS.filter((m) => m.targetSpread === 'financial-snapshot')
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })

    it('should include relationship-cross spread', () => {
      const matches = PATTERN_MAPPINGS.filter((m) => m.targetSpread === 'relationship-cross')
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })

    it('should include healing-path spread', () => {
      const matches = PATTERN_MAPPINGS.filter((m) => m.targetSpread === 'healing-path')
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Interview/Exam specific mappings', () => {
    it('should have interview-result spread', () => {
      const match = PATTERN_MAPPINGS.find((m) => m.targetSpread === 'interview-result')
      expect(match).toBeDefined()
      expect(match!.check('면접 결과')).toBe(true)
    })

    it('should have exam-pass spread', () => {
      const match = PATTERN_MAPPINGS.find((m) => m.targetSpread === 'exam-pass')
      expect(match).toBeDefined()
      expect(match!.check('시험 합격')).toBe(true)
    })

    it('should not match interview spread for non-interview exam', () => {
      const interviewMapping = PATTERN_MAPPINGS.find((m) => m.targetSpread === 'interview-result')
      expect(interviewMapping!.check('시험 합격할까요')).toBe(false)
    })
  })

  describe('Priority ordering', () => {
    it('should have comparison before timing', () => {
      const comparison = PATTERN_MAPPINGS.find((m) => m.targetSpread === 'two-paths')!
      const timing = PATTERN_MAPPINGS.find((m) => m.targetSpread === 'timing-window')!
      expect(comparison.priority).toBeLessThan(timing.priority)
    })

    it('should have job-change before timing', () => {
      const jobChange = PATTERN_MAPPINGS.find((m) => m.targetSpread === 'job-change')!
      const timing = PATTERN_MAPPINGS.find((m) => m.targetSpread === 'timing-window')!
      expect(jobChange.priority).toBeLessThan(timing.priority)
    })

    it('should have specialized spreads before category spreads', () => {
      const reconciliation = PATTERN_MAPPINGS.find((m) => m.targetSpread === 'reconciliation')!
      const financial = PATTERN_MAPPINGS.find((m) => m.targetSpread === 'financial-snapshot')!
      expect(reconciliation.priority).toBeLessThan(financial.priority)
    })

    it('should have yes-no after all other spreads', () => {
      const yesNo = PATTERN_MAPPINGS.find((m) => m.targetSpread === 'yes-no-why')!
      const allOther = PATTERN_MAPPINGS.filter((m) => m.targetSpread !== 'yes-no-why')
      for (const m of allOther) {
        expect(m.priority).toBeLessThan(yesNo.priority)
      }
    })
  })

  describe('getExamInterviewMapping', () => {
    it('should return null for non-exam questions', () => {
      const result = getExamInterviewMapping('오늘 날씨 어때', 'ko')
      expect(result).toBeNull()
    })

    it('should return interview mapping for interview questions', () => {
      const result = getExamInterviewMapping('면접 결과 어떨까요', 'ko')

      expect(result).toBeDefined()
      expect(result!.spreadId).toBe('interview-result')
      expect(result!.themeId).toBe('career-work')
      expect(result!.reason).toBe('면접 결과 확인')
    })

    it('should return exam mapping for exam questions', () => {
      const result = getExamInterviewMapping('시험 합격할까요', 'ko')

      expect(result).toBeDefined()
      expect(result!.spreadId).toBe('exam-pass')
      expect(result!.reason).toBe('시험 합격 확인')
    })

    it('should return Korean explanation for ko language', () => {
      const result = getExamInterviewMapping('면접 결과', 'ko')

      expect(result!.userFriendlyExplanation).toContain('면접 결과를 카드로')
    })

    it('should return English explanation for en language', () => {
      const result = getExamInterviewMapping('면접', 'en')

      expect(result!.userFriendlyExplanation).toContain('interview outcome')
    })

    it('should return exam Korean explanation', () => {
      const result = getExamInterviewMapping('시험', 'ko')

      expect(result!.userFriendlyExplanation).toContain('시험 합격 가능성')
    })

    it('should return exam English explanation', () => {
      const result = getExamInterviewMapping('시험', 'en')

      expect(result!.userFriendlyExplanation).toContain('exam result')
    })
  })

  describe('Explanation text', () => {
    it('should have non-empty koExplanation for all mappings', () => {
      for (const mapping of PATTERN_MAPPINGS) {
        expect(mapping.koExplanation.length).toBeGreaterThan(0)
      }
    })

    it('should have non-empty enExplanation for all mappings', () => {
      for (const mapping of PATTERN_MAPPINGS) {
        expect(mapping.enExplanation.length).toBeGreaterThan(0)
      }
    })

    it('should have non-empty reason for all mappings', () => {
      for (const mapping of PATTERN_MAPPINGS) {
        expect(mapping.reason.length).toBeGreaterThan(0)
      }
    })
  })
})
