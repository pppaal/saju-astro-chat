/**
 * Date Analysis Orchestrator - Comprehensive Tests
 *
 * Tests the analyzeDate() orchestrator and its helper functions
 * (getMoonElement, formatDateString) by mocking all sub-analyzer modules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════
// Mock all sub-analyzer dependencies
// ═══════════════════════════════════════════════════════════════════════

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// --- planetary-hours (getSunSign) ---
vi.mock('@/lib/destiny-map/calendar/planetary-hours', () => ({
  getSunSign: vi.fn(() => 'Aries'),
}))

// --- temporal-scoring (getGanzhiForDate) ---
vi.mock('@/lib/destiny-map/calendar/temporal-scoring', () => ({
  getGanzhiForDate: vi.fn(() => ({ stem: '甲', branch: '子' })),
}))

// --- utils ---
vi.mock('@/lib/destiny-map/calendar/utils', () => ({
  normalizeElement: vi.fn((el: string) => (el === 'air' ? 'metal' : el)),
  getStemElement: vi.fn((stem: string) => {
    const map: Record<string, string> = {
      甲: 'wood',
      乙: 'wood',
      丙: 'fire',
      丁: 'fire',
      戊: 'earth',
      己: 'earth',
      庚: 'metal',
      辛: 'metal',
      壬: 'water',
      癸: 'water',
    }
    return map[stem] || ''
  }),
  getBranchElement: vi.fn((branch: string) => {
    const map: Record<string, string> = {
      子: 'water',
      丑: 'earth',
      寅: 'wood',
      卯: 'wood',
      辰: 'earth',
      巳: 'fire',
      午: 'fire',
      未: 'earth',
      申: 'metal',
      酉: 'metal',
      戌: 'earth',
      亥: 'water',
    }
    return map[branch] || ''
  }),
}))

// --- constants ---
vi.mock('@/lib/destiny-map/calendar/constants', () => ({
  ELEMENT_RELATIONS: {
    wood: { generates: 'fire', controls: 'earth', generatedBy: 'water', controlledBy: 'metal' },
    fire: { generates: 'earth', controls: 'metal', generatedBy: 'wood', controlledBy: 'water' },
    earth: { generates: 'metal', controls: 'water', generatedBy: 'fire', controlledBy: 'wood' },
    metal: { generates: 'water', controls: 'wood', generatedBy: 'earth', controlledBy: 'fire' },
    water: { generates: 'wood', controls: 'fire', generatedBy: 'metal', controlledBy: 'earth' },
  },
  ZODIAC_TO_ELEMENT: {
    Aries: 'fire',
    Taurus: 'earth',
    Gemini: 'air',
    Cancer: 'water',
    Leo: 'fire',
    Virgo: 'earth',
    Libra: 'air',
    Scorpio: 'water',
    Sagittarius: 'fire',
    Capricorn: 'earth',
    Aquarius: 'air',
    Pisces: 'water',
  },
}))

// --- analyzers ---
const mockSajuResult = {
  daeunAnalysis: { score: 5, factorKeys: [], positive: true, negative: false },
  seunAnalysis: { score: 3, factorKeys: [], positive: true, negative: false },
  wolunAnalysis: { score: 2, factorKeys: [], positive: false, negative: false },
  iljinAnalysis: { score: 4, factorKeys: [], positive: true, negative: false },
  yongsinAnalysis: {
    score: 10,
    factorKeys: ['yongsinPrimaryMatch'],
    positive: true,
    negative: false,
    matchType: 'primary',
  },
  geokgukAnalysis: { score: 5, factorKeys: [], positive: true, negative: false },
  specialFactors: {
    hasCheoneulGwiin: false,
    hasGeonrok: false,
    hasSonEomneun: false,
    hasYeokma: false,
    hasDohwa: false,
    isSamjaeYear: false,
    approxLunarDay: 15,
  },
  shinsalForScoring: { active: [], score: 0 },
}

vi.mock('@/lib/destiny-map/calendar/analyzers/saju-analyzer', () => ({
  analyzeSaju: vi.fn(() => ({ ...mockSajuResult })),
}))

const mockAstroResult = {
  moonPhaseDetailed: { phaseName: 'fullMoon', illumination: 1.0, age: 15 },
  retrogradePlanets: [] as string[],
  voidOfCourse: { isVoid: false, start: null, end: null },
  solarReturnAnalysis: {
    score: 0,
    factorKeys: [],
    positive: false,
    isBirthday: false,
    daysFromBirthday: 200,
  },
  progressionAnalysis: {
    score: 0,
    factorKeys: [],
    positive: false,
    negative: false,
    currentPhase: 'mars',
  },
  planetTransits: { score: 5, factorKeys: [], positive: true, negative: false, aspectEvidence: [] },
  eclipseImpact: 0,
}

vi.mock('@/lib/destiny-map/calendar/analyzers/astrology-analyzer', () => ({
  analyzeAstrology: vi.fn(() => ({ ...mockAstroResult })),
}))

vi.mock('@/lib/destiny-map/calendar/analyzers/multilayer-analyzer', () => ({
  analyzeMultiLayer: vi.fn(() => ({
    advancedMultiLayerScore: 0,
    advancedBranchInteractions: [],
  })),
}))

vi.mock('@/lib/destiny-map/calendar/analyzers/advanced-predictor', () => ({
  analyzeAdvancedPrediction: vi.fn(() => ({
    gongmangStatus: { isEmpty: false, emptyBranches: [], affectedAreas: [] },
    shinsalActive: [],
    energyFlow: {
      strength: 'moderate',
      dominantElement: 'wood',
      tonggeunCount: 1,
      tuechulCount: 0,
    },
    bestHours: [{ hour: 9, siGan: '巳', quality: 'good' }],
    transitSync: { isMajorTransitYear: false },
  })),
}))

vi.mock('@/lib/destiny-map/calendar/analyzers/factor-generator', () => ({
  generateFactors: vi.fn(() => ({
    sajuFactorKeys: ['stemBijeon'],
    astroFactorKeys: ['sameElement'],
    recommendationKeys: ['business'],
    warningKeys: [],
    categories: ['career'],
    titleKey: 'calendar.bijeon',
    descKey: 'calendar.bijeonDesc',
  })),
}))

vi.mock('@/lib/destiny-map/calendar/analyzers/confidence-calculator', () => ({
  calculateConfidence: vi.fn(() => ({ confidence: 75, confidenceNote: '제한: 대운 정보 없음' })),
}))

vi.mock('@/lib/destiny-map/calendar/analyzers/time-context-analyzer', () => ({
  analyzeTimeContext: vi.fn(() => ({
    isPast: false,
    isFuture: true,
    isToday: false,
    daysFromToday: 30,
  })),
}))

// --- scoring ---
vi.mock('@/lib/destiny-map/calendar/scoring', () => ({
  calculateTotalScore: vi.fn(() => ({
    totalScore: 65,
    crossVerified: true,
    sajuPositive: true,
    sajuNegative: false,
    astroPositive: true,
    astroNegative: false,
    crossAgreementPercent: 72,
  })),
}))

// --- scoring-adapter ---
vi.mock('@/lib/destiny-map/calendar/scoring-adapter', () => ({
  adaptDaeunResult: vi.fn(() => ({ score: 5, positive: true, negative: false })),
  adaptSeunResult: vi.fn(() => ({ score: 3, positive: true, negative: false })),
  adaptWolunResult: vi.fn(() => ({ score: 2, positive: false, negative: false })),
  adaptIljinResult: vi.fn(() => ({ score: 4, positive: true, negative: false })),
  adaptYongsinResult: vi.fn(() => ({ score: 10, positive: true, negative: false })),
  adaptPlanetTransits: vi.fn(() => ({
    sunTransit: { score: 3, positive: true, negative: false },
    moonPhase: { score: 2, positive: true, negative: false },
    retrograde: { score: 0, positive: false, negative: false },
    voidOfCourse: { score: 0, positive: false, negative: false },
    solarReturn: { score: 0, positive: false, negative: false },
  })),
}))

// --- grading ---
vi.mock('@/lib/destiny-map/calendar/grading', () => ({
  calculateGrade: vi.fn(() => ({ grade: 1, adjustedScore: 65, gradeBonus: 0, gradeReasons: [] })),
  getGradeKeys: vi.fn(() => ({ titleKey: 'calendar.grade1', descKey: 'calendar.grade1Desc' })),
  getGradeRecommendations: vi.fn(() => ['enjoy', 'celebrate']),
  filterWarningsByGrade: vi.fn((_grade: number, warnings: string[]) => warnings),
}))

// --- activity-scoring ---
vi.mock('@/lib/destiny-map/calendar/activity-scoring', () => ({
  calculateActivityScore: vi.fn(() => 70),
}))

// ═══════════════════════════════════════════════════════════════════════
// Import after mocks
// ═══════════════════════════════════════════════════════════════════════

import {
  analyzeDate,
  type UserSajuProfile,
  type UserAstroProfile,
} from '@/lib/destiny-map/calendar/date-analysis-orchestrator'

// Import mocked functions for assertions
import { analyzeSaju } from '@/lib/destiny-map/calendar/analyzers/saju-analyzer'
import { analyzeAstrology } from '@/lib/destiny-map/calendar/analyzers/astrology-analyzer'
import { analyzeMultiLayer } from '@/lib/destiny-map/calendar/analyzers/multilayer-analyzer'
import { analyzeAdvancedPrediction } from '@/lib/destiny-map/calendar/analyzers/advanced-predictor'
import { generateFactors } from '@/lib/destiny-map/calendar/analyzers/factor-generator'
import { calculateConfidence } from '@/lib/destiny-map/calendar/analyzers/confidence-calculator'
import { analyzeTimeContext } from '@/lib/destiny-map/calendar/analyzers/time-context-analyzer'
import { calculateTotalScore } from '@/lib/destiny-map/calendar/scoring'
import {
  calculateGrade,
  getGradeKeys,
  getGradeRecommendations,
  filterWarningsByGrade,
} from '@/lib/destiny-map/calendar/grading'
import { calculateActivityScore } from '@/lib/destiny-map/calendar/activity-scoring'
import { getGanzhiForDate } from '@/lib/destiny-map/calendar/temporal-scoring'
import { getSunSign } from '@/lib/destiny-map/calendar/planetary-hours'

// ═══════════════════════════════════════════════════════════════════════
// Test Data Fixtures
// ═══════════════════════════════════════════════════════════════════════

function makeSajuProfile(overrides: Partial<UserSajuProfile> = {}): UserSajuProfile {
  return {
    dayMaster: '甲',
    dayMasterElement: 'wood',
    dayBranch: '寅',
    yearBranch: '子',
    birthYear: 1990,
    ...overrides,
  }
}

function makeAstroProfile(overrides: Partial<UserAstroProfile> = {}): UserAstroProfile {
  return {
    sunSign: 'Aries',
    sunElement: 'fire',
    birthMonth: 3,
    birthDay: 15,
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════════════
// analyzeDate Tests
// ═══════════════════════════════════════════════════════════════════════

describe('date-analysis-orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('analyzeDate - basic behavior', () => {
    it('returns a non-null ImportantDate result', () => {
      const date = new Date(2024, 2, 15)
      const result = analyzeDate(date, makeSajuProfile(), makeAstroProfile())
      expect(result).not.toBeNull()
    })

    it('formats date as YYYY-MM-DD', () => {
      const date = new Date(2024, 2, 5) // March 5
      const result = analyzeDate(date, makeSajuProfile(), makeAstroProfile())
      expect(result?.date).toBe('2024-03-05')
    })

    it('includes ganzhi string from getGanzhiForDate', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(result?.ganzhi).toBe('甲子')
      expect(getGanzhiForDate).toHaveBeenCalled()
    })

    it('includes transitSunSign from getSunSign', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(result?.transitSunSign).toBe('Aries')
      expect(getSunSign).toHaveBeenCalled()
    })
  })

  describe('analyzeDate - calls all sub-analyzers', () => {
    it('calls analyzeSaju with correct profile data', () => {
      const sajuProfile = makeSajuProfile({
        dayMaster: '丙',
        dayMasterElement: 'fire',
        dayBranch: '午',
      })
      analyzeDate(new Date(2024, 0, 1), sajuProfile, makeAstroProfile())
      expect(analyzeSaju).toHaveBeenCalledTimes(1)
      const args = (analyzeSaju as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(args.dayMasterElement).toBe('fire')
      expect(args.dayBranch).toBe('午')
      expect(args.dayMasterStem).toBe('丙')
    })

    it('calls analyzeAstrology with correct profile data', () => {
      const astroProfile = makeAstroProfile({ sunElement: 'water' })
      analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), astroProfile)
      expect(analyzeAstrology).toHaveBeenCalledTimes(1)
      const args = (analyzeAstrology as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(args.natalSunElement).toBe('water')
    })

    it('calls analyzeMultiLayer', () => {
      analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(analyzeMultiLayer).toHaveBeenCalledTimes(1)
    })

    it('calls calculateTotalScore', () => {
      analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(calculateTotalScore).toHaveBeenCalledTimes(1)
    })

    it('calls generateFactors', () => {
      analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(generateFactors).toHaveBeenCalledTimes(1)
    })

    it('calls calculateGrade', () => {
      analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(calculateGrade).toHaveBeenCalledTimes(1)
    })

    it('calls analyzeAdvancedPrediction', () => {
      analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(analyzeAdvancedPrediction).toHaveBeenCalledTimes(1)
    })

    it('calls calculateConfidence', () => {
      analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(calculateConfidence).toHaveBeenCalledTimes(1)
    })

    it('calls calculateActivityScore for all 6 activities', () => {
      analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(calculateActivityScore).toHaveBeenCalledTimes(6)
    })

    it('calls analyzeTimeContext', () => {
      analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(analyzeTimeContext).toHaveBeenCalledTimes(1)
    })
  })

  describe('analyzeDate - result structure', () => {
    it('includes all required fields', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(result).toBeDefined()
      expect(result).toHaveProperty('date')
      expect(result).toHaveProperty('grade')
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('categories')
      expect(result).toHaveProperty('titleKey')
      expect(result).toHaveProperty('descKey')
      expect(result).toHaveProperty('ganzhi')
      expect(result).toHaveProperty('crossVerified')
      expect(result).toHaveProperty('transitSunSign')
      expect(result).toHaveProperty('sajuFactorKeys')
      expect(result).toHaveProperty('astroFactorKeys')
      expect(result).toHaveProperty('recommendationKeys')
      expect(result).toHaveProperty('warningKeys')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('confidenceNote')
    })

    it('includes advanced prediction fields', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(result).toHaveProperty('gongmangStatus')
      expect(result).toHaveProperty('shinsalActive')
      expect(result).toHaveProperty('energyFlow')
      expect(result).toHaveProperty('bestHours')
      expect(result).toHaveProperty('transitSync')
    })

    it('includes activity scores', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(result).toHaveProperty('activityScores')
      expect(result?.activityScores).toHaveProperty('marriage')
      expect(result?.activityScores).toHaveProperty('career')
      expect(result?.activityScores).toHaveProperty('investment')
      expect(result?.activityScores).toHaveProperty('moving')
      expect(result?.activityScores).toHaveProperty('surgery')
      expect(result?.activityScores).toHaveProperty('study')
    })

    it('includes time context', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(result).toHaveProperty('timeContext')
      expect(result?.timeContext).toHaveProperty('isPast')
      expect(result?.timeContext).toHaveProperty('isFuture')
      expect(result?.timeContext).toHaveProperty('isToday')
      expect(result?.timeContext).toHaveProperty('daysFromToday')
    })
  })

  describe('analyzeDate - score and grade integration', () => {
    it('uses the score from calculateTotalScore', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(result?.score).toBe(65)
    })

    it('returns raw/adjusted/display score fields consistently', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(result?.rawScore).toBe(65)
      expect(result?.adjustedScore).toBe(65)
      expect(result?.displayScore).toBe(65)
      expect(result?.crossAgreementPercent).toBe(72)
    })

    it('uses the grade from calculateGrade', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(result?.grade).toBe(1)
    })

    it('downgrades top-grade outputs when cross agreement is extremely low', () => {
      ;(calculateTotalScore as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        totalScore: 74,
        crossVerified: true,
        sajuPositive: true,
        sajuNegative: false,
        astroPositive: true,
        astroNegative: false,
        crossAgreementPercent: 3,
      })
      ;(calculateGrade as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        grade: 0,
        adjustedScore: 74,
        gradeBonus: 0,
        gradeReasons: [],
      })

      const result = analyzeDate(new Date(2024, 0, 2), makeSajuProfile(), makeAstroProfile())
      expect(result?.grade).toBe(3)
      expect((result?.displayScore ?? 100) <= 41).toBe(true)
      expect(result?.warningKeys).toContain('confusion')
    })

    it('uses crossVerified from calculateTotalScore', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(result?.crossVerified).toBe(true)
    })

    it('uses confidence from calculateConfidence', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(result?.confidence).toBe(75)
      expect(result?.confidenceNote).toBe('제한: 대운 정보 없음')
    })
  })

  describe('analyzeDate - factor key integration', () => {
    it('propagates sajuFactorKeys from generateFactors', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(result?.sajuFactorKeys).toContain('stemBijeon')
    })

    it('propagates astroFactorKeys from generateFactors', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(result?.astroFactorKeys).toContain('sameElement')
    })

    it('propagates categories from generateFactors', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(result?.categories).toContain('career')
    })
  })

  describe('analyzeDate - recommendation/warning integration', () => {
    it('prepends grade recommendations for good grades (grade <= 1)', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      // grade 1 => grade recs come first: ['enjoy', 'celebrate', ...factor recs]
      expect(result?.recommendationKeys).toContain('enjoy')
      expect(result?.recommendationKeys).toContain('celebrate')
      expect(result?.recommendationKeys).toContain('business') // from factors
    })

    it('passes warningKeys through filterWarningsByGrade', () => {
      analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(filterWarningsByGrade).toHaveBeenCalled()
    })
  })

  describe('analyzeDate - titleKey/descKey resolution', () => {
    it('uses titleKey from factors when available and grade > 0', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      // grade=1 and factors.titleKey='calendar.bijeon' is set
      expect(result?.titleKey).toBe('calendar.bijeon')
    })

    it('falls back to grade keys when grade is 0 or titleKey is empty', () => {
      // Override calculateGrade to return grade 0
      ;(calculateGrade as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        grade: 0,
        reason: 'excellent',
      })
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(getGradeKeys).toHaveBeenCalled()
      expect(result?.titleKey).toBe('calendar.grade1') // from getGradeKeys mock
    })

    it('falls back to grade keys when factors have empty titleKey', () => {
      ;(generateFactors as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        sajuFactorKeys: [],
        astroFactorKeys: [],
        recommendationKeys: [],
        warningKeys: [],
        categories: [],
        titleKey: '',
        descKey: '',
      })
      // Grade = 1 but titleKey is empty => falls through to getGradeKeys
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(getGradeKeys).toHaveBeenCalled()
    })
  })

  describe('analyzeDate - profile edge cases', () => {
    it('handles missing dayBranch', () => {
      const sajuProfile = makeSajuProfile({ dayBranch: undefined })
      const result = analyzeDate(new Date(2024, 0, 1), sajuProfile, makeAstroProfile())
      expect(result).not.toBeNull()
      // analyzeSaju should receive empty string for dayBranch
      const args = (analyzeSaju as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(args.dayBranch).toBe('')
    })

    it('handles missing dayMaster', () => {
      const sajuProfile = makeSajuProfile({ dayMaster: undefined as any })
      const result = analyzeDate(new Date(2024, 0, 1), sajuProfile, makeAstroProfile())
      expect(result).not.toBeNull()
    })

    it('handles missing yearBranch', () => {
      const sajuProfile = makeSajuProfile({ yearBranch: undefined })
      const result = analyzeDate(new Date(2024, 0, 1), sajuProfile, makeAstroProfile())
      expect(result).not.toBeNull()
    })

    it('handles missing birthYear', () => {
      const sajuProfile = makeSajuProfile({ birthYear: undefined })
      const result = analyzeDate(new Date(2024, 0, 1), sajuProfile, makeAstroProfile())
      expect(result).not.toBeNull()
    })
  })

  describe('analyzeDate - retrograde detection', () => {
    it('detects mercury retrograde in grade input', () => {
      ;(analyzeAstrology as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...mockAstroResult,
        retrogradePlanets: ['mercury'],
      })

      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(result).not.toBeNull()

      // The grading input should include retrogradeCount > 0
      const gradeArgs = (calculateGrade as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(gradeArgs.retrogradeCount).toBeGreaterThan(0)
      expect(gradeArgs.hasNoMajorRetrograde).toBe(false)
    })

    it('detects no retrograde in grade input when retrogradePlanets is empty', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      expect(result).not.toBeNull()

      const gradeArgs = (calculateGrade as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(gradeArgs.retrogradeCount).toBe(0)
      expect(gradeArgs.hasNoMajorRetrograde).toBe(true)
    })

    it('counts multiple retrograde planets', () => {
      ;(analyzeAstrology as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...mockAstroResult,
        retrogradePlanets: ['mercury', 'venus', 'mars'],
      })

      analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())

      const gradeArgs = (calculateGrade as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(gradeArgs.retrogradeCount).toBe(3)
    })
  })

  describe('analyzeDate - chung/xing detection in factors', () => {
    it('detects chung in factor keys', () => {
      ;(generateFactors as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        sajuFactorKeys: ['branchChung'],
        astroFactorKeys: [],
        recommendationKeys: [],
        warningKeys: ['avoidTravel'],
        categories: ['travel'],
        titleKey: 'calendar.chung',
        descKey: 'calendar.chungDesc',
      })

      analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())

      const gradeArgs = (calculateGrade as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(gradeArgs.hasChung).toBe(true)
    })

    it('detects xing in factor keys', () => {
      ;(generateFactors as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        sajuFactorKeys: ['branchXing'],
        astroFactorKeys: [],
        recommendationKeys: [],
        warningKeys: ['legal'],
        categories: [],
        titleKey: '',
        descKey: '',
      })

      analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())

      const gradeArgs = (calculateGrade as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(gradeArgs.hasXing).toBe(true)
    })
  })

  describe('analyzeDate - activity scores', () => {
    it('calculates activity scores for all 6 activities', () => {
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())

      expect(result?.activityScores?.marriage).toBe(70)
      expect(result?.activityScores?.career).toBe(70)
      expect(result?.activityScores?.investment).toBe(70)
      expect(result?.activityScores?.moving).toBe(70)
      expect(result?.activityScores?.surgery).toBe(70)
      expect(result?.activityScores?.study).toBe(70)
    })

    it('passes correct area type to calculateActivityScore', () => {
      analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())

      const calls = (calculateActivityScore as ReturnType<typeof vi.fn>).mock.calls
      const areas = calls.map((c: any[]) => c[0])
      expect(areas).toContain('love')
      expect(areas).toContain('career')
      expect(areas).toContain('wealth')
      expect(areas).toContain('travel')
      expect(areas).toContain('health')
      expect(areas).toContain('study')
    })
  })

  describe('analyzeDate - different dates produce different results', () => {
    it('formats date correctly for different months', () => {
      const jan = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())
      const dec = analyzeDate(new Date(2024, 11, 31), makeSajuProfile(), makeAstroProfile())
      expect(jan?.date).toBe('2024-01-01')
      expect(dec?.date).toBe('2024-12-31')
    })

    it('passes correct year and month to sub-analyzers', () => {
      analyzeDate(new Date(2024, 5, 15), makeSajuProfile(), makeAstroProfile())

      const sajuArgs = (analyzeSaju as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(sajuArgs.year).toBe(2024)
      expect(sajuArgs.month).toBe(6) // 0-indexed month + 1

      const multiLayerArgs = (analyzeMultiLayer as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(multiLayerArgs.year).toBe(2024)
      expect(multiLayerArgs.month).toBe(6)
    })
  })

  describe('analyzeDate - birthday detection in grade input', () => {
    it('marks isBirthdaySpecial when solar return is birthday and crossVerified', () => {
      ;(analyzeAstrology as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...mockAstroResult,
        solarReturnAnalysis: {
          score: 25,
          factorKeys: ['solarReturnExact'],
          positive: true,
          isBirthday: true,
          daysFromBirthday: 0,
        },
      })

      analyzeDate(new Date(2024, 2, 15), makeSajuProfile(), makeAstroProfile())

      const gradeArgs = (calculateGrade as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(gradeArgs.isBirthdaySpecial).toBe(true)
    })

    it('does not mark isBirthdaySpecial when not birthday', () => {
      analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())

      const gradeArgs = (calculateGrade as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(gradeArgs.isBirthdaySpecial).toBe(false)
    })
  })

  describe('analyzeDate - recommendation ordering by grade', () => {
    it('for good grade (<= 1), grade recs come first', () => {
      ;(calculateGrade as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        grade: 1,
        reason: 'positive',
      })
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())

      // Grade recs should come first: ['enjoy', 'celebrate', 'business']
      expect(result?.recommendationKeys?.[0]).toBe('enjoy')
      expect(result?.recommendationKeys?.[1]).toBe('celebrate')
    })

    it('for bad grade (> 1), factor recs come first', () => {
      ;(calculateGrade as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        grade: 3,
        reason: 'negative',
      })
      const result = analyzeDate(new Date(2024, 0, 1), makeSajuProfile(), makeAstroProfile())

      // Factor recs should come first: ['business', 'enjoy', 'celebrate']
      expect(result?.recommendationKeys?.[0]).toBe('business')
    })
  })
})
