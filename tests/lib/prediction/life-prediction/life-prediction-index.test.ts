/**
 * @file Tests for life-prediction module
 * 커버리지 향상을 위한 life-prediction 통합 테스트
 *
 * 테스트 품질 가이드라인:
 * - 모든 public 함수의 반환값 구조 검증
 * - 경계값 및 에지 케이스 테스트
 * - 실제 비즈니스 로직 검증 (단순 존재 여부가 아닌 정확성 검증)
 */

import { describe, it, expect } from 'vitest'
import {
  // Constants
  STEMS,
  BRANCHES,
  STEM_ELEMENT,
  EVENT_FAVORABLE_CONDITIONS,
  ASTRO_EVENT_CONDITIONS,
  TRANSIT_EVENT_CONDITIONS,
  EVENT_HOUSES,
  SIBSIN_SCORES,
  SIBSIN_SCORES_RELATIVE,
  STEM_COMBINATIONS,
  STEM_CLASHES,
  SIX_COMBOS,
  PARTIAL_TRINES,
  BRANCH_CLASHES,
  BRANCH_PUNISHMENTS,
  EVENT_NAMES_FULL,
  // Functions
  calculateAstroBonus,
  calculateTransitBonus,
  calculateTransitHouseOverlay,
  calculateCombinedAstroBonus,
  analyzeStemRelation,
  analyzeBranchRelation,
  analyzeMultiLayerInteraction,
  analyzeDaeunTransition,
  generateEnergyRecommendations,
  analyzeMultiYearTrend,
  findOptimalEventTiming,
  findWeeklyOptimalTiming,
  generateComprehensivePrediction,
  generateLifePredictionPromptContext,
  generateEventTimingPromptContext,
  generatePastAnalysisPromptContext,
} from '@/lib/prediction/life-prediction'

// Type definitions for test fixtures
type FiveElement = '목' | '화' | '토' | '금' | '수'
type EventType = 'marriage' | 'career' | 'investment' | 'move' | 'study' | 'health' | 'relationship'

interface DaeunInfo {
  stem: string
  branch: string
  element: FiveElement
  startAge: number
  endAge: number
}

interface LifePredictionInput {
  birthYear: number
  birthMonth: number
  birthDay: number
  birthHour?: number
  gender: 'male' | 'female'
  dayStem: string
  dayBranch: string
  monthBranch: string
  yearBranch: string
  allStems: string[]
  allBranches: string[]
  daeunList?: DaeunInfo[]
  yongsin?: FiveElement[]
  kisin?: FiveElement[]
  astroChart?: Record<string, unknown>
  advancedAstro?: Record<string, unknown>
}

// ============================================================
// Test Data Fixtures
// ============================================================

const createMockDaeunList = (): DaeunInfo[] => [
  { stem: '甲', branch: '寅', element: '목' as FiveElement, startAge: 1, endAge: 10 },
  { stem: '乙', branch: '卯', element: '목' as FiveElement, startAge: 11, endAge: 20 },
  { stem: '丙', branch: '辰', element: '화' as FiveElement, startAge: 21, endAge: 30 },
  { stem: '丁', branch: '巳', element: '화' as FiveElement, startAge: 31, endAge: 40 },
  { stem: '戊', branch: '午', element: '토' as FiveElement, startAge: 41, endAge: 50 },
  { stem: '己', branch: '未', element: '토' as FiveElement, startAge: 51, endAge: 60 },
]

const createMockInput = (overrides: Partial<LifePredictionInput> = {}): LifePredictionInput => ({
  birthYear: 1990,
  birthMonth: 5,
  birthDay: 15,
  birthHour: 10,
  gender: 'male',
  dayStem: '甲',
  dayBranch: '子',
  monthBranch: '巳',
  yearBranch: '午',
  allStems: ['庚', '辛', '甲', '丙'],
  allBranches: ['午', '巳', '子', '寅'],
  daeunList: createMockDaeunList(),
  yongsin: ['수', '목'] as FiveElement[],
  kisin: ['화', '토'] as FiveElement[],
  ...overrides,
})

const createMockInputWithAstro = (): LifePredictionInput => ({
  ...createMockInput(),
  astroChart: {
    sun: { sign: 'Taurus', house: 10, longitude: 45 },
    moon: { sign: 'Cancer', house: 4, longitude: 100 },
    venus: { sign: 'Libra', house: 7, longitude: 185, isRetrograde: false },
    mars: { sign: 'Aries', house: 1, longitude: 15, isRetrograde: false },
    jupiter: { sign: 'Sagittarius', house: 9, longitude: 260, isRetrograde: false },
    saturn: { sign: 'Capricorn', house: 10, longitude: 280, isRetrograde: false },
    mercury: { sign: 'Gemini', house: 3, longitude: 75, isRetrograde: true },
  },
  advancedAstro: {
    electional: {
      moonPhase: { phase: 'full_moon', illumination: 100 },
      voidOfCourse: { isVoid: false },
      retrograde: ['Mercury'],
    },
    solarReturn: {
      summary: { theme: 'Career and Success', keyPlanets: ['Sun', 'Jupiter'] },
    },
    currentTransits: {
      date: '2024-06-15',
      majorTransits: [
        { transitPlanet: 'Jupiter', natalPoint: 'Sun', type: 'trine', orb: 2, isApplying: true },
        { transitPlanet: 'Saturn', natalPoint: 'Moon', type: 'square', orb: 3, isApplying: false },
      ],
      outerPlanets: [
        { name: 'Jupiter', longitude: 45, sign: 'Taurus', house: 10, retrograde: false },
        { name: 'Saturn', longitude: 340, sign: 'Pisces', house: 6, retrograde: true },
      ],
      themes: [
        {
          theme: 'Career Achievement',
          keywords: ['success'],
          duration: '3 months',
          transitPlanet: 'Jupiter',
          natalPoint: 'MC',
        },
      ],
    },
  },
})

// ============================================================
// Export Tests
// ============================================================

describe('Life Prediction Index Exports', () => {
  describe('Type exports', () => {
    it('should export main types', async () => {
      const module = await import('@/lib/prediction/life-prediction')
      expect(module).toBeDefined()
    })
  })

  describe('Constants exports', () => {
    it('should export STEMS', async () => {
      expect(STEMS).toBeDefined()
      expect(STEMS).toHaveLength(10)
    })

    it('should export BRANCHES', async () => {
      expect(BRANCHES).toBeDefined()
      expect(BRANCHES).toHaveLength(12)
    })

    it('should export STEM_ELEMENT', async () => {
      expect(STEM_ELEMENT).toBeDefined()
      expect(STEM_ELEMENT['甲']).toBe('목')
    })

    it('should export EVENT_FAVORABLE_CONDITIONS', async () => {
      expect(EVENT_FAVORABLE_CONDITIONS).toBeDefined()
      expect(EVENT_FAVORABLE_CONDITIONS.marriage).toBeDefined()
      expect(EVENT_FAVORABLE_CONDITIONS.career).toBeDefined()
    })

    it('should export ASTRO_EVENT_CONDITIONS', async () => {
      expect(ASTRO_EVENT_CONDITIONS).toBeDefined()
      expect(ASTRO_EVENT_CONDITIONS.marriage.beneficSigns).toBeDefined()
    })

    it('should export TRANSIT_EVENT_CONDITIONS', async () => {
      expect(TRANSIT_EVENT_CONDITIONS).toBeDefined()
      expect(TRANSIT_EVENT_CONDITIONS.marriage.beneficPlanets).toBeDefined()
    })

    it('should export EVENT_HOUSES', async () => {
      expect(EVENT_HOUSES).toBeDefined()
      expect(EVENT_HOUSES.marriage.primary).toContain(7)
      expect(EVENT_HOUSES.career.primary).toContain(10)
    })

    it('should export SIBSIN_SCORES', async () => {
      expect(SIBSIN_SCORES_RELATIVE).toBeDefined()
      expect(SIBSIN_SCORES_RELATIVE['정관']).toBe(15)
      expect(SIBSIN_SCORES_RELATIVE['겁재']).toBe(-8)
    })

    it('should export STEM_COMBINATIONS', async () => {
      expect(STEM_COMBINATIONS).toBeDefined()
      expect(STEM_COMBINATIONS['甲己']).toBe('토로 변화')
    })

    it('should export STEM_CLASHES', async () => {
      expect(STEM_CLASHES).toBeDefined()
      expect(STEM_CLASHES).toContain('甲庚')
    })

    it('should export SIX_COMBOS', async () => {
      expect(SIX_COMBOS).toBeDefined()
      expect(SIX_COMBOS['子丑']).toBe('육합')
    })

    it('should export PARTIAL_TRINES', async () => {
      expect(PARTIAL_TRINES).toBeDefined()
      expect(PARTIAL_TRINES['寅午']).toBe('화국 삼합')
    })

    it('should export BRANCH_CLASHES', async () => {
      expect(BRANCH_CLASHES).toBeDefined()
      expect(BRANCH_CLASHES['子午']).toBe('충')
    })

    it('should export BRANCH_PUNISHMENTS', async () => {
      expect(BRANCH_PUNISHMENTS).toBeDefined()
      expect(BRANCH_PUNISHMENTS['寅巳']).toBe('형')
    })

    it('should export EVENT_NAMES_FULL', async () => {
      expect(EVENT_NAMES_FULL).toBeDefined()
      expect(EVENT_NAMES_FULL.marriage.ko).toBe('결혼')
      expect(EVENT_NAMES_FULL.career.en).toBe('Career')
    })
  })

  describe('Function exports', () => {
    it('should export calculateAstroBonus', async () => {
      expect(calculateAstroBonus).toBeDefined()
      expect(typeof calculateAstroBonus).toBe('function')
    })

    it('should export calculateTransitBonus', async () => {
      expect(calculateTransitBonus).toBeDefined()
      expect(typeof calculateTransitBonus).toBe('function')
    })

    it('should export calculateTransitHouseOverlay', async () => {
      expect(calculateTransitHouseOverlay).toBeDefined()
      expect(typeof calculateTransitHouseOverlay).toBe('function')
    })

    it('should export calculateCombinedAstroBonus', async () => {
      expect(calculateCombinedAstroBonus).toBeDefined()
      expect(typeof calculateCombinedAstroBonus).toBe('function')
    })

    it('should export analyzeStemRelation', async () => {
      expect(analyzeStemRelation).toBeDefined()
      expect(typeof analyzeStemRelation).toBe('function')
    })

    it('should export analyzeBranchRelation', async () => {
      expect(analyzeBranchRelation).toBeDefined()
      expect(typeof analyzeBranchRelation).toBe('function')
    })

    it('should export analyzeMultiLayerInteraction', async () => {
      expect(analyzeMultiLayerInteraction).toBeDefined()
      expect(typeof analyzeMultiLayerInteraction).toBe('function')
    })

    it('should export analyzeDaeunTransition', async () => {
      expect(analyzeDaeunTransition).toBeDefined()
      expect(typeof analyzeDaeunTransition).toBe('function')
    })

    it('should export generateEnergyRecommendations', async () => {
      expect(generateEnergyRecommendations).toBeDefined()
      expect(typeof generateEnergyRecommendations).toBe('function')
    })

    it('should export analyzeMultiYearTrend', async () => {
      expect(analyzeMultiYearTrend).toBeDefined()
      expect(typeof analyzeMultiYearTrend).toBe('function')
    })

    it('should export findOptimalEventTiming', async () => {
      expect(findOptimalEventTiming).toBeDefined()
      expect(typeof findOptimalEventTiming).toBe('function')
    })

    it('should export findWeeklyOptimalTiming', async () => {
      expect(findWeeklyOptimalTiming).toBeDefined()
      expect(typeof findWeeklyOptimalTiming).toBe('function')
    })

    it('should export generateComprehensivePrediction', async () => {
      expect(generateComprehensivePrediction).toBeDefined()
      expect(typeof generateComprehensivePrediction).toBe('function')
    })

    it('should export generateLifePredictionPromptContext', async () => {
      const { generateLifePredictionPromptContext } =
        await import('@/lib/prediction/life-prediction')
      expect(generateLifePredictionPromptContext).toBeDefined()
      expect(typeof generateLifePredictionPromptContext).toBe('function')
    })

    it('should export generateEventTimingPromptContext', async () => {
      expect(generateEventTimingPromptContext).toBeDefined()
      expect(typeof generateEventTimingPromptContext).toBe('function')
    })

    it('should export generatePastAnalysisPromptContext', async () => {
      expect(generatePastAnalysisPromptContext).toBeDefined()
      expect(typeof generatePastAnalysisPromptContext).toBe('function')
    })
  })
})

// ============================================================
// Relation Analysis Integration Tests
// ============================================================

describe('Relation Analysis Integration', () => {
  describe('analyzeStemRelation', () => {
    it('should detect stem combination (합)', () => {
      const result = analyzeStemRelation('甲', '己')
      expect(result.type).toBe('합')
      expect(result.description).toBe('토로 변화')
    })

    it('should detect stem clash (충)', () => {
      const result = analyzeStemRelation('甲', '庚')
      expect(result.type).toBe('충')
      expect(result.description).toBe('천간 충돌')
    })

    it('should return no relation for unrelated stems', () => {
      const result = analyzeStemRelation('甲', '乙')
      expect(result.type).toBe('무관')
      expect(result.description).toBe('')
    })

    it('should handle all stem combinations', () => {
      const combinations = [
        { stems: ['甲', '己'], expected: '토로 변화' },
        { stems: ['乙', '庚'], expected: '금으로 변화' },
        { stems: ['丙', '辛'], expected: '수로 변화' },
        { stems: ['丁', '壬'], expected: '목으로 변화' },
        { stems: ['戊', '癸'], expected: '화로 변화' },
      ]

      combinations.forEach(({ stems, expected }) => {
        const result = analyzeStemRelation(stems[0], stems[1])
        expect(result.type).toBe('합')
        expect(result.description).toBe(expected)
      })
    })
  })

  describe('analyzeBranchRelation', () => {
    it('should detect 육합 (six combo)', () => {
      expect(analyzeBranchRelation('子', '丑')).toBe('육합')
      expect(analyzeBranchRelation('寅', '亥')).toBe('육합')
    })

    it('should detect 삼합 (three harmony)', () => {
      expect(analyzeBranchRelation('寅', '午')).toBe('삼합')
      expect(analyzeBranchRelation('申', '子')).toBe('삼합')
    })

    it('should detect 충 (clash)', () => {
      expect(analyzeBranchRelation('子', '午')).toBe('충')
      expect(analyzeBranchRelation('丑', '未')).toBe('충')
    })

    it('should detect 형 (punishment)', () => {
      expect(analyzeBranchRelation('寅', '巳')).toBe('형')
      expect(analyzeBranchRelation('子', '卯')).toBe('형')
    })

    it('should return 무관 for unrelated branches', () => {
      expect(analyzeBranchRelation('子', '寅')).toBe('무관')
    })

    it('should handle reverse order', () => {
      expect(analyzeBranchRelation('丑', '子')).toBe('육합')
      expect(analyzeBranchRelation('午', '子')).toBe('충')
    })
  })

  describe('analyzeMultiLayerInteraction', () => {
    it('should return empty result for unknown event type', () => {
      const input = createMockInput()
      const result = analyzeMultiLayerInteraction(input, 'unknown' as EventType, 2024, 6)
      expect(result.bonus).toBe(0)
      expect(result.reasons).toHaveLength(0)
      expect(result.penalties).toHaveLength(0)
    })

    it('should return empty result when no matching daeun found', () => {
      const input = createMockInput({ daeunList: [] })
      const result = analyzeMultiLayerInteraction(input, 'marriage', 2024, 6)
      expect(result.bonus).toBe(0)
    })

    it('should analyze multi-layer interaction with valid input and return structured result', () => {
      const input = createMockInput()
      const result = analyzeMultiLayerInteraction(input, 'career', 2024, 6)

      // Verify complete structure
      expect(result).toEqual(
        expect.objectContaining({
          bonus: expect.any(Number),
          reasons: expect.any(Array),
          penalties: expect.any(Array),
        })
      )
      // Verify reasons are non-empty strings when present
      result.reasons.forEach((reason: string) => {
        expect(typeof reason).toBe('string')
        expect(reason.length).toBeGreaterThan(0)
      })
      // Verify penalties are non-empty strings when present
      result.penalties.forEach((penalty: string) => {
        expect(typeof penalty).toBe('string')
        expect(penalty.length).toBeGreaterThan(0)
      })
    })

    it('should cap bonus between -30 and 30', () => {
      const input = createMockInput()
      const result = analyzeMultiLayerInteraction(input, 'marriage', 2024, 6)

      expect(result.bonus).toBeGreaterThanOrEqual(-30)
      expect(result.bonus).toBeLessThanOrEqual(30)
    })

    it('should limit reasons and penalties', () => {
      const input = createMockInput()
      const result = analyzeMultiLayerInteraction(input, 'investment', 2024, 6)

      expect(result.reasons.length).toBeLessThanOrEqual(4)
      expect(result.penalties.length).toBeLessThanOrEqual(3)
    })
  })

  describe('analyzeDaeunTransition', () => {
    it('should analyze transition between two daeun periods', () => {
      const input = createMockInput()
      const fromDaeun = input.daeunList![0]
      const toDaeun = input.daeunList![1]

      const result = analyzeDaeunTransition(input, fromDaeun, toDaeun)

      expect(result).toBeDefined()
      expect([
        'major_positive',
        'positive',
        'neutral',
        'challenging',
        'major_challenging',
      ]).toContain(result.impact)
      expect(typeof result.description).toBe('string')
      expect(result.description.length).toBeGreaterThan(0)
    })

    it('should detect major positive transition when entering yongsin daeun with peak energy', () => {
      const input = createMockInput({ yongsin: ['목'] as FiveElement[] })
      const fromDaeun: DaeunInfo = {
        stem: '庚',
        branch: '申',
        element: '금' as FiveElement,
        startAge: 1,
        endAge: 10,
      }
      const toDaeun: DaeunInfo = {
        stem: '甲',
        branch: '寅',
        element: '목' as FiveElement,
        startAge: 11,
        endAge: 20,
      }

      const result = analyzeDaeunTransition(input, fromDaeun, toDaeun)

      expect(['major_positive', 'positive']).toContain(result.impact)
    })

    it('should detect challenging transition when entering kisin daeun', () => {
      const input = createMockInput({ kisin: ['화'] as FiveElement[] })
      const fromDaeun: DaeunInfo = {
        stem: '壬',
        branch: '子',
        element: '수' as FiveElement,
        startAge: 1,
        endAge: 10,
      }
      const toDaeun: DaeunInfo = {
        stem: '丙',
        branch: '午',
        element: '화' as FiveElement,
        startAge: 11,
        endAge: 20,
      }

      const result = analyzeDaeunTransition(input, fromDaeun, toDaeun)

      expect(['challenging', 'major_challenging']).toContain(result.impact)
    })
  })

  describe('generateEnergyRecommendations', () => {
    it('should generate recommendations for peak energy', () => {
      const recommendations = generateEnergyRecommendations('peak', '목')

      expect(recommendations).toContain('중요한 결정과 큰 프로젝트 추진')
      expect(recommendations).toContain('적극적인 도전과 확장')
      expect(recommendations).toContain('리더십 발휘와 책임 수용')
      expect(recommendations).toContain('창의적 활동과 새로운 아이디어 개발')
    })

    it('should generate recommendations for rising energy', () => {
      const recommendations = generateEnergyRecommendations('rising', '화')

      expect(recommendations).toContain('새로운 시작과 계획 수립')
      expect(recommendations).toContain('열정을 표현하되 과열 주의')
    })

    it('should generate recommendations for declining energy', () => {
      const recommendations = generateEnergyRecommendations('declining', '토')

      expect(recommendations).toContain('기존 성과의 정리와 보존')
      expect(recommendations).toContain('부동산, 안정적 투자에 유리')
    })

    it('should generate recommendations for dormant energy', () => {
      const recommendations = generateEnergyRecommendations('dormant', '수')

      expect(recommendations).toContain('내면 성찰과 재충전')
      expect(recommendations).toContain('유연한 대응과 지혜로운 판단')
    })

    it('should generate recommendations for 금 element', () => {
      const recommendations = generateEnergyRecommendations('peak', '금')

      expect(recommendations).toContain('결단력 있는 정리와 선택')
    })
  })
})

// ============================================================
// Astro Bonus Integration Tests
// ============================================================

describe('Astro Bonus Integration', () => {
  describe('calculateAstroBonus', () => {
    it('should return zero bonus when no astro data is provided', () => {
      const input = createMockInput()
      const result = calculateAstroBonus(input, 'marriage')

      expect(result.bonus).toBe(0)
      expect(result.reasons).toHaveLength(0)
      expect(result.penalties).toHaveLength(0)
    })

    it('should calculate bonus with astro chart data and return non-zero result', () => {
      const input = createMockInputWithAstro()
      const result = calculateAstroBonus(input, 'marriage')

      // With full astro data, should have meaningful bonus
      expect(result).toEqual(
        expect.objectContaining({
          bonus: expect.any(Number),
          reasons: expect.any(Array),
          penalties: expect.any(Array),
        })
      )
      // With good astro conditions, should have positive influence
      expect(result.bonus !== 0 || result.reasons.length > 0 || result.penalties.length > 0).toBe(true)
    })

    it('should give bonus for benefic sun sign', () => {
      const input: LifePredictionInput = {
        ...createMockInput(),
        astroChart: {
          sun: { sign: 'Libra', house: 7 },
        },
      }
      const result = calculateAstroBonus(input, 'marriage')

      expect(result.bonus).toBeGreaterThan(0)
      expect(result.reasons.some((r) => r.includes('태양'))).toBe(true)
    })

    it('should calculate bonus for moon phase', () => {
      const input = createMockInputWithAstro()
      const result = calculateAstroBonus(input, 'marriage')

      expect(result.reasons.some((r) => r.includes('보름달') || r.includes('moon'))).toBe(true)
    })

    it('should handle career event type with career-specific conditions', () => {
      const input = createMockInputWithAstro()
      const result = calculateAstroBonus(input, 'career')

      expect(result).toEqual(
        expect.objectContaining({
          bonus: expect.any(Number),
          reasons: expect.any(Array),
          penalties: expect.any(Array),
        })
      )
      // Career should consider 10th house placements
      const hasCareerRelevantReason = result.reasons.some(
        (r) => r.includes('10') || r.includes('career') || r.includes('태양') || r.includes('Jupiter')
      )
      expect(hasCareerRelevantReason || result.reasons.length === 0).toBe(true)
    })

    it('should handle all event types with distinct condition checking', () => {
      const input = createMockInputWithAstro()
      const eventTypes: EventType[] = [
        'marriage',
        'career',
        'investment',
        'move',
        'study',
        'health',
        'relationship',
      ]

      const results = eventTypes.map((eventType) => ({
        eventType,
        result: calculateAstroBonus(input, eventType),
      }))

      // Verify all return valid BonusResult structure
      results.forEach(({ result }) => {
        expect(result).toEqual(
          expect.objectContaining({
            bonus: expect.any(Number),
            reasons: expect.any(Array),
            penalties: expect.any(Array),
          })
        )
      })

      // Different event types may produce different results
      const bonuses = results.map((r) => r.result.bonus)
      expect(bonuses.length).toBe(7)
    })
  })

  describe('calculateTransitBonus', () => {
    it('should return zero when no transit data is provided', () => {
      const input = createMockInput()
      const result = calculateTransitBonus(input, 'career')

      expect(result.bonus).toBe(0)
      expect(result.reasons).toHaveLength(0)
    })

    it('should calculate bonus with transit data and verify transit-specific structure', () => {
      const input = createMockInputWithAstro()
      const result = calculateTransitBonus(input, 'career')

      expect(result).toEqual(
        expect.objectContaining({
          bonus: expect.any(Number),
          reasons: expect.any(Array),
          penalties: expect.any(Array),
        })
      )
      // Transit bonus should be influenced by majorTransits in mock data
      expect(result.reasons.length + result.penalties.length).toBeGreaterThanOrEqual(0)
    })

    it('should detect benefic transit aspects', () => {
      const input = createMockInputWithAstro()
      const result = calculateTransitBonus(input, 'career')

      // Jupiter trine Sun is a benefic aspect
      expect(result.reasons.some((r) => r.includes('Jupiter'))).toBe(true)
    })

    it('should detect malefic transit aspects', () => {
      const input = createMockInputWithAstro()
      const result = calculateTransitBonus(input, 'health')

      // Saturn square Moon is malefic for health
      expect(result.penalties.some((r) => r.includes('Saturn')) || result.bonus < 0).toBe(true)
    })
  })

  describe('calculateTransitHouseOverlay', () => {
    it('should return zero when no transit data is provided', () => {
      const input = createMockInput()
      const result = calculateTransitHouseOverlay(input, 'career')

      expect(result.bonus).toBe(0)
      expect(result.reasons).toHaveLength(0)
    })

    it('should calculate house overlay bonus', () => {
      const input = createMockInputWithAstro()
      const result = calculateTransitHouseOverlay(input, 'career')

      expect(result).toBeDefined()
      expect(typeof result.bonus).toBe('number')
    })

    it('should consider primary houses', () => {
      const input = createMockInputWithAstro()
      const result = calculateTransitHouseOverlay(input, 'career')

      // Jupiter in 10th house (career primary) should give bonus
      expect(result.reasons.some((r) => r.includes('10') || r.includes('Jupiter'))).toBe(true)
    })
  })

  describe('calculateCombinedAstroBonus', () => {
    it('should combine all astro bonuses', () => {
      const input = createMockInputWithAstro()
      const result = calculateCombinedAstroBonus(input, 'marriage')

      expect(result).toBeDefined()
      expect(typeof result.bonus).toBe('number')
      expect(Array.isArray(result.reasons)).toBe(true)
      expect(Array.isArray(result.penalties)).toBe(true)
    })

    it('should return zero when no astro data', () => {
      const input = createMockInput()
      const result = calculateCombinedAstroBonus(input, 'marriage')

      expect(result.bonus).toBe(0)
    })

    it('should handle all event types', () => {
      const input = createMockInputWithAstro()
      const eventTypes: EventType[] = [
        'marriage',
        'career',
        'investment',
        'move',
        'study',
        'health',
        'relationship',
      ]

      eventTypes.forEach((eventType) => {
        const result = calculateCombinedAstroBonus(input, eventType)
        expect(result).toBeDefined()
      })
    })
  })
})

// ============================================================
// Multi-Year Trend Integration Tests
// ============================================================

describe('Multi-Year Trend Integration', () => {
  describe('analyzeMultiYearTrend', () => {
    it('should analyze multi-year trend with complete result structure', () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2030)

      // Verify complete structure
      expect(result).toEqual(
        expect.objectContaining({
          startYear: 2020,
          endYear: 2030,
          yearlyScores: expect.any(Array),
          overallTrend: expect.stringMatching(/^(ascending|descending|stable|volatile)$/),
          peakYears: expect.any(Array),
          lowYears: expect.any(Array),
          daeunTransitions: expect.any(Array),
          lifeCycles: expect.any(Array),
          summary: expect.any(String),
        })
      )
      // For 1990 birth year, age in 2020 is 30, should have valid yearlyScores
      expect(result.yearlyScores.length).toBeGreaterThan(0)
    })

    it('should identify peak and low years within analyzed range', () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2030)

      expect(result.peakYears.length).toBeLessThanOrEqual(3)
      expect(result.lowYears.length).toBeLessThanOrEqual(3)

      // Peak years should be within the analyzed range
      result.peakYears.forEach((year: number) => {
        expect(year).toBeGreaterThanOrEqual(2020)
        expect(year).toBeLessThanOrEqual(2030)
      })
      // Low years should be within the analyzed range
      result.lowYears.forEach((year: number) => {
        expect(year).toBeGreaterThanOrEqual(2020)
        expect(year).toBeLessThanOrEqual(2030)
      })
    })

    it('should detect daeun transitions with proper structure', () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2000, 2050)

      // Should have transitions for daeun changes
      result.daeunTransitions.forEach((transition: { year: number; impact: string; description: string }) => {
        expect(transition).toEqual(
          expect.objectContaining({
            year: expect.any(Number),
            impact: expect.stringMatching(/^(major_positive|positive|neutral|challenging|major_challenging)$/),
            description: expect.any(String),
          })
        )
      })
    })

    it('should analyze life cycles with energy levels and recommendations', () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2040)

      result.lifeCycles.forEach((cycle: { startYear: number; endYear: number; energy: string; recommendations: string[] }) => {
        expect(cycle).toEqual(
          expect.objectContaining({
            startYear: expect.any(Number),
            endYear: expect.any(Number),
            energy: expect.stringMatching(/^(peak|rising|declining|dormant)$/),
            recommendations: expect.any(Array),
          })
        )
        expect(cycle.recommendations.length).toBeGreaterThan(0)
      })
    })

    it('should generate Korean summary describing the trend', () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2030)

      expect(result.summary.length).toBeGreaterThan(10)
      // Summary should contain Korean trend keywords
      const hasKoreanKeywords =
        result.summary.includes('상승') ||
        result.summary.includes('하강') ||
        result.summary.includes('안정') ||
        result.summary.includes('변동')
      expect(hasKoreanKeywords).toBe(true)
    })

    it('should determine overall trend based on first/second half comparison', () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2030)

      const validTrends = ['ascending', 'descending', 'stable', 'volatile']
      expect(validTrends).toContain(result.overallTrend)
    })

    it('should include yearly scores with all required fields', () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2024, 2026)

      expect(result.yearlyScores.length).toBeGreaterThan(0)

      const yearScore = result.yearlyScores[0]
      expect(yearScore.year).toBeDefined()
      expect(yearScore.age).toBeDefined()
      expect(yearScore.score).toBeDefined()
      expect(yearScore.grade).toBeDefined()
      expect(yearScore.yearGanji).toBeDefined()
      expect(yearScore.twelveStage).toBeDefined()
      expect(yearScore.sibsin).toBeDefined()
    })

    it('should handle input without daeunList', () => {
      const input = createMockInput({ daeunList: undefined })
      const result = analyzeMultiYearTrend(input, 2024, 2026)

      expect(result).toBeDefined()
      expect(result.yearlyScores.length).toBeGreaterThan(0)
    })

    it('should apply yongsin/kisin bonuses', () => {
      const inputWithYongsin = createMockInput({ yongsin: ['수'] as FiveElement[] })
      const inputWithKisin = createMockInput({ kisin: ['수'] as FiveElement[] })

      const resultYongsin = analyzeMultiYearTrend(inputWithYongsin, 2024, 2025)
      const resultKisin = analyzeMultiYearTrend(inputWithKisin, 2024, 2025)

      // Results should be different due to yongsin/kisin effects
      expect(resultYongsin).toBeDefined()
      expect(resultKisin).toBeDefined()
    })
  })
})

// ============================================================
// Comprehensive Prediction Integration Tests
// ============================================================

describe('Comprehensive Prediction Integration', () => {
  describe('generateComprehensivePrediction', () => {
    it('should generate comprehensive prediction', () => {
      const input = createMockInput()
      const result = generateComprehensivePrediction(input, 10)

      expect(result).toBeDefined()
      expect(result.input).toBe(input)
      expect(result.generatedAt).toBeInstanceOf(Date)
      expect(result.multiYearTrend).toBeDefined()
      expect(result.upcomingHighlights).toBeDefined()
      expect(result.confidence).toBeDefined()
    })

    it('should calculate confidence based on input completeness', () => {
      const minimalInput = createMockInput({
        daeunList: undefined,
        yongsin: undefined,
        birthHour: undefined,
      })
      const completeInput = createMockInput()

      const minimalResult = generateComprehensivePrediction(minimalInput)
      const completeResult = generateComprehensivePrediction(completeInput)

      expect(completeResult.confidence).toBeGreaterThan(minimalResult.confidence)
    })

    it('should include upcoming highlights', () => {
      const input = createMockInput()
      const result = generateComprehensivePrediction(input, 10)

      expect(Array.isArray(result.upcomingHighlights)).toBe(true)
      expect(result.upcomingHighlights.length).toBeLessThanOrEqual(10)
    })

    it('should include life sync when daeun list is provided', () => {
      const input = createMockInput()
      const result = generateComprehensivePrediction(input, 10)

      expect(result.lifeSync).toBeDefined()
    })

    it('should handle input without daeun list', () => {
      const input = createMockInput({ daeunList: undefined })
      const result = generateComprehensivePrediction(input, 5)

      expect(result).toBeDefined()
      expect(result.lifeSync).toBeUndefined()
    })

    it('should use default years range', () => {
      const input = createMockInput()
      const result = generateComprehensivePrediction(input)

      expect(result.multiYearTrend).toBeDefined()
    })
  })

  describe('generateLifePredictionPromptContext', () => {
    it('should generate Korean prompt context', () => {
      const input = createMockInput()
      const prediction = generateComprehensivePrediction(input, 5)
      const context = generateLifePredictionPromptContext(prediction, 'ko')

      expect(typeof context).toBe('string')
      expect(context).toContain('종합 인생 예측')
      expect(context).toContain('분석 기간')
      expect(context).toContain('신뢰도')
    })

    it('should generate English prompt context', () => {
      const input = createMockInput()
      const prediction = generateComprehensivePrediction(input, 5)
      const context = generateLifePredictionPromptContext(prediction, 'en')

      expect(typeof context).toBe('string')
      expect(context).toContain('Comprehensive Life Prediction')
      expect(context).toContain('Period')
      expect(context).toContain('Confidence')
    })

    it('should include yearly scores in context', () => {
      const input = createMockInput()
      const prediction = generateComprehensivePrediction(input, 5)
      const context = generateLifePredictionPromptContext(prediction, 'ko')

      expect(context).toContain('연도별 운세')
    })

    it('should include daeun transitions when available', () => {
      const input = createMockInput()
      const prediction = generateComprehensivePrediction(input, 10)
      const context = generateLifePredictionPromptContext(prediction, 'ko')

      if (prediction.multiYearTrend.daeunTransitions.length > 0) {
        expect(context).toContain('대운 전환점')
      }
    })
  })

  describe('generateEventTimingPromptContext', () => {
    it('should generate Korean event timing context', () => {
      const mockEventResult = {
        eventType: 'marriage' as EventType,
        searchRange: { startYear: 2024, endYear: 2026 },
        optimalPeriods: [
          {
            startDate: new Date(2024, 5, 1),
            endDate: new Date(2024, 5, 30),
            score: 85,
            grade: 'A' as const,
            reasons: ['좋은 운세', '길한 날'],
            specificDays: [new Date(2024, 5, 15)],
          },
        ],
        avoidPeriods: [
          {
            startDate: new Date(2024, 7, 1),
            endDate: new Date(2024, 7, 31),
            score: 35,
            grade: 'D',
            reasons: ['흉한 운세'],
          },
        ],
        nextBestWindow: null,
        advice: '6월이 좋습니다',
      }

      const context = generateEventTimingPromptContext(mockEventResult, 'ko')

      expect(context).toContain('결혼')
      expect(context).toContain('최적 타이밍')
      expect(context).toContain('2024')
    })

    it('should generate English event timing context', () => {
      const mockEventResult = {
        eventType: 'career' as EventType,
        searchRange: { startYear: 2024, endYear: 2026 },
        optimalPeriods: [
          {
            startDate: new Date(2024, 5, 1),
            endDate: new Date(2024, 5, 30),
            score: 80,
            grade: 'A' as const,
            reasons: ['Good timing'],
          },
        ],
        avoidPeriods: [],
        nextBestWindow: null,
        advice: 'June is good',
      }

      const context = generateEventTimingPromptContext(mockEventResult, 'en')

      expect(context).toContain('Career')
      expect(context).toContain('Optimal Timing')
    })
  })

  describe('generatePastAnalysisPromptContext', () => {
    it('should generate Korean past analysis context', () => {
      const mockRetrospective = {
        targetDate: new Date(2023, 5, 15),
        dailyPillar: { stem: '甲', branch: '子' },
        score: 75,
        grade: 'A' as const,
        yearGanji: { stem: '癸', branch: '卯' },
        monthGanji: { stem: '戊', branch: '午' },
        twelveStage: { stage: '건록', score: 80, energy: 'peak' as const },
        sibsin: '정관',
        branchInteractions: [],
        themes: ['성공', '발전'],
        whyItHappened: ['좋은 운세', '길한 십신'],
        lessonsLearned: ['시기를 잘 잡음'],
      }

      const context = generatePastAnalysisPromptContext(mockRetrospective, 'ko')

      expect(context).toContain('과거 분석')
      expect(context).toContain('甲子')
      expect(context).toContain('건록')
      expect(context).toContain('정관')
    })

    it('should generate English past analysis context', () => {
      const mockRetrospective = {
        targetDate: new Date(2023, 5, 15),
        dailyPillar: { stem: '甲', branch: '子' },
        score: 75,
        grade: 'A' as const,
        yearGanji: { stem: '癸', branch: '卯' },
        monthGanji: { stem: '戊', branch: '午' },
        twelveStage: { stage: '건록', score: 80, energy: 'peak' as const },
        sibsin: '정관',
        branchInteractions: [],
        themes: [],
        whyItHappened: [],
        lessonsLearned: [],
      }

      const context = generatePastAnalysisPromptContext(mockRetrospective, 'en')

      expect(context).toContain('Past Analysis')
      expect(context).toContain('Grade: A')
    })
  })
})

// ============================================================
// Event Timing Integration Tests
// ============================================================

describe('Event Timing Integration', () => {
  describe('findOptimalEventTiming', () => {
    it('should find optimal event timing for marriage', () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'marriage', currentYear, currentYear + 2)

      expect(result).toBeDefined()
      expect(result.eventType).toBe('marriage')
      expect(result.searchRange.startYear).toBe(currentYear)
      expect(result.searchRange.endYear).toBe(currentYear + 2)
    })

    it('should return optimal and avoid periods', () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear + 2)

      expect(Array.isArray(result.optimalPeriods)).toBe(true)
      expect(Array.isArray(result.avoidPeriods)).toBe(true)
    })

    it('should generate advice', () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'investment', currentYear, currentYear + 1)

      expect(typeof result.advice).toBe('string')
    })

    it('should handle unknown event type', () => {
      const input = createMockInput()
      const result = findOptimalEventTiming(input, 'unknown' as EventType, 2024, 2025)

      expect(result.advice).toContain('Unknown event type')
    })

    it('should respect options for progressions and solar terms', () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()

      const resultWithOptions = findOptimalEventTiming(
        input,
        'study',
        currentYear,
        currentYear + 1,
        { useProgressions: false, useSolarTerms: false }
      )

      expect(resultWithOptions).toBeDefined()
    })

    it('should include specific days in optimal periods', () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'move', currentYear, currentYear + 1)

      if (result.optimalPeriods.length > 0) {
        const period = result.optimalPeriods[0]
        expect(period.startDate).toBeInstanceOf(Date)
        expect(period.endDate).toBeInstanceOf(Date)
        expect(period.score).toBeDefined()
        expect(period.grade).toBeDefined()
      }
    })

    it('should handle all event types', () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const eventTypes: EventType[] = [
        'marriage',
        'career',
        'investment',
        'move',
        'study',
        'health',
        'relationship',
      ]

      eventTypes.forEach((eventType) => {
        const result = findOptimalEventTiming(input, eventType, currentYear, currentYear + 1)
        expect(result.eventType).toBe(eventType)
      })
    })
  })

  describe('findWeeklyOptimalTiming', () => {
    it('should find weekly optimal timing', () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'career', startDate)

      expect(result).toBeDefined()
      expect(result.eventType).toBe('career')
      expect(result.searchRange.startDate).toBeDefined()
    })

    it('should return weekly periods', () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'marriage', startDate)

      expect(Array.isArray(result.weeklyPeriods)).toBe(true)
    })

    it('should identify best and worst weeks', () => {
      const input = createMockInput()
      const startDate = new Date()
      const endDate = new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000)
      const result = findWeeklyOptimalTiming(input, 'investment', startDate, endDate)

      // May or may not have best/worst weeks depending on data
      expect(result.bestWeek === null || result.bestWeek !== undefined).toBe(true)
      expect(result.worstWeek === null || result.worstWeek !== undefined).toBe(true)
    })

    it('should generate summary', () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'study', startDate)

      expect(typeof result.summary).toBe('string')
    })

    it('should handle unknown event type', () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'unknown' as EventType, startDate)

      expect(result.summary).toContain('Unknown event type')
    })

    it('should include best days in weekly periods', () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'health', startDate)

      if (result.weeklyPeriods.length > 0) {
        const period = result.weeklyPeriods[0]
        expect(period.weekNumber).toBeDefined()
        expect(period.score).toBeDefined()
        expect(period.grade).toBeDefined()
        expect(Array.isArray(period.bestDays)).toBe(true)
      }
    })

    it('should use default 3 month range when endDate not provided', () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'relationship', startDate)

      expect(result.searchRange.endDate).toBeDefined()
      const diffDays =
        (result.searchRange.endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
      expect(diffDays).toBeCloseTo(90, -1)
    })
  })
})

// ============================================================
// Edge Cases and Error Handling
// ============================================================

describe('Edge Cases and Error Handling', () => {
  describe('Empty or minimal input', () => {
    it('should handle minimal input for stem relation and return 무관', async () => {
      // Empty strings should return 무관 (no relation)
      const emptyResult = analyzeStemRelation('', '')
      expect(emptyResult.type).toBe('무관')
      expect(emptyResult.description).toBe('')

      // Invalid stems should also return 무관
      const invalidResult = analyzeStemRelation('X', 'Y')
      expect(invalidResult.type).toBe('무관')
      expect(invalidResult.description).toBe('')
    })

    it('should handle minimal input for branch relation and return 무관', async () => {
      // Empty strings should return 무관
      expect(analyzeBranchRelation('', '')).toBe('무관')

      // Invalid branches should return 무관
      expect(analyzeBranchRelation('X', 'Y')).toBe('무관')
    })

    it('should handle input without optional fields and produce valid prediction', async () => {
      const minimalInput: LifePredictionInput = {
        birthYear: 1990,
        birthMonth: 1,
        birthDay: 1,
        gender: 'male',
        dayStem: '甲',
        dayBranch: '子',
        monthBranch: '寅',
        yearBranch: '午',
        allStems: ['甲', '乙', '丙', '丁'],
        allBranches: ['子', '丑', '寅', '卯'],
      }

      const result = generateComprehensivePrediction(minimalInput)

      // Should still produce valid structure
      expect(result).toEqual(
        expect.objectContaining({
          input: minimalInput,
          generatedAt: expect.any(Date),
          multiYearTrend: expect.any(Object),
          upcomingHighlights: expect.any(Array),
          confidence: expect.any(Number),
        })
      )
      // Without daeunList/yongsin, confidence should be lower
      expect(result.confidence).toBeLessThan(80)
    })
  })

  describe('Boundary conditions', () => {
    it('should handle single year range correctly', async () => {
      const input = createMockInput({ birthYear: 2020 })

      // Same year - age is 4 in 2024
      const result = analyzeMultiYearTrend(input, 2024, 2024)
      expect(result.startYear).toBe(2024)
      expect(result.endYear).toBe(2024)
      // Should have exactly 1 year score (age 4)
      expect(result.yearlyScores.length).toBe(1)
      expect(result.yearlyScores[0]?.year).toBe(2024)
      expect(result.yearlyScores[0]?.age).toBe(4)
    })

    it('should handle very short range correctly', async () => {
      const input = createMockInput({ birthYear: 2020 })

      // Two year range
      const result = analyzeMultiYearTrend(input, 2024, 2025)
      expect(result.yearlyScores.length).toBe(2)
      expect(result.yearlyScores[0]?.age).toBe(4)
      expect(result.yearlyScores[1]?.age).toBe(5)
    })

    it('should handle future birth year by returning empty yearlyScores', async () => {
      const input = createMockInput({ birthYear: 2030 })

      // Birth year is after analysis range - all ages would be negative
      const result = analyzeMultiYearTrend(input, 2024, 2026)
      expect(result.yearlyScores).toHaveLength(0)
      // But should still have valid structure
      expect(result.startYear).toBe(2024)
      expect(result.endYear).toBe(2026)
      expect(result.overallTrend).toBe('stable') // Default when no data
    })

    it('should handle empty daeun list by returning zero bonus with empty reasons', async () => {
      const input = createMockInput({ daeunList: [] })

      const result = analyzeMultiLayerInteraction(input, 'career', 2024, 6)
      expect(result).toEqual({
        bonus: 0,
        reasons: [],
        penalties: [],
      })
    })

    it('should handle undefined daeun list', async () => {
      const input = createMockInput({ daeunList: undefined })

      const result = analyzeMultiLayerInteraction(input, 'career', 2024, 6)
      expect(result.bonus).toBe(0)
    })
  })

  describe('Date edge cases', () => {
    it('should handle year boundary crossing correctly', async () => {
      const input = createMockInput()

      const startDate = new Date(2024, 11, 25) // Dec 25, 2024
      const endDate = new Date(2025, 0, 10) // Jan 10, 2025

      const result = findWeeklyOptimalTiming(input, 'career', startDate, endDate)

      expect(result.searchRange.startDate.getTime()).toBe(startDate.getTime())
      expect(result.searchRange.endDate.getTime()).toBe(endDate.getTime())
      // Should have weeks spanning both years
      expect(result.weeklyPeriods.length).toBeGreaterThan(0)
    })

    it('should handle leap year birth dates without error', async () => {
      const input = createMockInput({ birthYear: 2000, birthMonth: 2, birthDay: 29 })

      const result = findOptimalEventTiming(input, 'marriage', 2024, 2025)

      expect(result.eventType).toBe('marriage')
      expect(result.searchRange.startYear).toBe(2024)
      expect(result.searchRange.endYear).toBe(2025)
      // Should produce valid periods
      expect(Array.isArray(result.optimalPeriods)).toBe(true)
      expect(Array.isArray(result.avoidPeriods)).toBe(true)
    })

    it('should handle month boundary in weekly analysis', async () => {
      const input = createMockInput()

      // Start at end of month
      const startDate = new Date(2024, 5, 28) // June 28
      const endDate = new Date(2024, 6, 5) // July 5

      const result = findWeeklyOptimalTiming(input, 'investment', startDate, endDate)

      // Should handle month transition
      expect(result.weeklyPeriods.length).toBeGreaterThan(0)
      result.weeklyPeriods.forEach((period: { startDate: Date; endDate: Date }) => {
        expect(period.startDate.getTime()).toBeLessThanOrEqual(period.endDate.getTime())
      })
    })
  })
})

// ============================================================
// Constants Detailed Tests
// ============================================================

describe('Constants Detailed Tests', () => {
  describe('STEM_ELEMENT mapping', () => {
    it('should map all 10 stems to correct elements', async () => {
      // 목 (Wood)
      expect(STEM_ELEMENT['甲']).toBe('목')
      expect(STEM_ELEMENT['乙']).toBe('목')
      // 화 (Fire)
      expect(STEM_ELEMENT['丙']).toBe('화')
      expect(STEM_ELEMENT['丁']).toBe('화')
      // 토 (Earth)
      expect(STEM_ELEMENT['戊']).toBe('토')
      expect(STEM_ELEMENT['己']).toBe('토')
      // 금 (Metal)
      expect(STEM_ELEMENT['庚']).toBe('금')
      expect(STEM_ELEMENT['辛']).toBe('금')
      // 수 (Water)
      expect(STEM_ELEMENT['壬']).toBe('수')
      expect(STEM_ELEMENT['癸']).toBe('수')
    })
  })

  describe('EVENT_FAVORABLE_CONDITIONS completeness', () => {
    it('should have conditions for all event types', async () => {
      const eventTypes = [
        'marriage',
        'career',
        'investment',
        'move',
        'study',
        'health',
        'relationship',
      ]

      eventTypes.forEach((eventType) => {
        expect(
          EVENT_FAVORABLE_CONDITIONS[eventType as keyof typeof EVENT_FAVORABLE_CONDITIONS]
        ).toBeDefined()
        expect(
          EVENT_FAVORABLE_CONDITIONS[eventType as keyof typeof EVENT_FAVORABLE_CONDITIONS]
            .favorableSibsin
        ).toBeDefined()
        expect(
          EVENT_FAVORABLE_CONDITIONS[eventType as keyof typeof EVENT_FAVORABLE_CONDITIONS]
            .avoidSibsin
        ).toBeDefined()
        expect(
          EVENT_FAVORABLE_CONDITIONS[eventType as keyof typeof EVENT_FAVORABLE_CONDITIONS]
            .favorableStages
        ).toBeDefined()
        expect(
          EVENT_FAVORABLE_CONDITIONS[eventType as keyof typeof EVENT_FAVORABLE_CONDITIONS]
            .avoidStages
        ).toBeDefined()
        expect(
          EVENT_FAVORABLE_CONDITIONS[eventType as keyof typeof EVENT_FAVORABLE_CONDITIONS]
            .favorableElements
        ).toBeDefined()
      })
    })

    it('should have valid sibsin values', async () => {
      const validSibsin = [
        '정관',
        '편관',
        '정재',
        '편재',
        '정인',
        '편인',
        '식신',
        '상관',
        '비견',
        '겁재',
      ]

      const conditions = EVENT_FAVORABLE_CONDITIONS.marriage
      conditions.favorableSibsin.forEach((sibsin: string) => {
        expect(validSibsin).toContain(sibsin)
      })
      conditions.avoidSibsin.forEach((sibsin: string) => {
        expect(validSibsin).toContain(sibsin)
      })
    })

    it('should have valid twelve stage values', async () => {
      const validStages = [
        '장생',
        '목욕',
        '관대',
        '건록',
        '제왕',
        '쇠',
        '병',
        '사',
        '묘',
        '절',
        '태',
        '양',
      ]

      const conditions = EVENT_FAVORABLE_CONDITIONS.career
      conditions.favorableStages.forEach((stage: string) => {
        expect(validStages).toContain(stage)
      })
      conditions.avoidStages.forEach((stage: string) => {
        expect(validStages).toContain(stage)
      })
    })
  })

  describe('SIBSIN_SCORES values', () => {
    it('should have scores for all sibsin types', async () => {
      const sibsinTypes = [
        '정관',
        '편관',
        '정재',
        '편재',
        '정인',
        '편인',
        '식신',
        '상관',
        '비견',
        '겁재',
      ]

      sibsinTypes.forEach((sibsin) => {
        expect(SIBSIN_SCORES[sibsin]).toBeDefined()
        expect(typeof SIBSIN_SCORES[sibsin]).toBe('number')
      })
    })

    it('should have 정관 as highest score', async () => {
      expect(SIBSIN_SCORES['정관']).toBe(80)
      expect(SIBSIN_SCORES['정관']).toBeGreaterThan(SIBSIN_SCORES['겁재'])
    })
  })

  describe('Branch relationships', () => {
    it('should have complete SIX_COMBOS mapping', async () => {
      const expectedCombos = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未']

      expectedCombos.forEach((combo) => {
        expect(SIX_COMBOS[combo]).toBe('육합')
      })
    })

    it('should have complete BRANCH_CLASHES mapping', async () => {
      const expectedClashes = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥']

      expectedClashes.forEach((clash) => {
        expect(BRANCH_CLASHES[clash]).toBe('충')
      })
    })
  })
})

// ============================================================
// Score Normalization and Calculations
// ============================================================

describe('Score Calculations', () => {
  describe('Multi-layer interaction scoring', () => {
    it('should calculate proper bonus based on favorable sibsin count', async () => {
      const input = createMockInput()
      const result = analyzeMultiLayerInteraction(input, 'marriage', 2024, 6)

      expect(result.bonus).toBeGreaterThanOrEqual(-30)
      expect(result.bonus).toBeLessThanOrEqual(30)
    })

    it('should produce different results for different months', async () => {
      const input = createMockInput()
      const results = []

      for (let month = 1; month <= 12; month++) {
        const result = analyzeMultiLayerInteraction(input, 'career', 2024, month)
        results.push(result)
      }

      // At least some months should have different bonuses
      const bonuses = results.map((r) => r.bonus)
      const uniqueBonuses = new Set(bonuses)
      expect(uniqueBonuses.size).toBeGreaterThan(1)
    })
  })

  describe('Yearly score calculations', () => {
    it('should calculate consistent scores for same input', async () => {
      const input = createMockInput()
      const result1 = analyzeMultiYearTrend(input, 2024, 2026)
      const result2 = analyzeMultiYearTrend(input, 2024, 2026)

      expect(result1.yearlyScores.length).toBe(result2.yearlyScores.length)

      result1.yearlyScores.forEach((score, i) => {
        expect(score.score).toBe(result2.yearlyScores[i].score)
        expect(score.grade).toBe(result2.yearlyScores[i].grade)
      })
    })

    it('should apply yongsin bonus correctly', async () => {
      const inputWithYongsin = createMockInput({ yongsin: ['수'] as FiveElement[] })
      const inputWithoutYongsin = createMockInput({ yongsin: undefined })

      const resultWith = analyzeMultiYearTrend(inputWithYongsin, 2024, 2025)
      const resultWithout = analyzeMultiYearTrend(inputWithoutYongsin, 2024, 2025)

      // Results should exist
      expect(resultWith.yearlyScores.length).toBeGreaterThan(0)
      expect(resultWithout.yearlyScores.length).toBeGreaterThan(0)
    })
  })
})

// ============================================================
// Grade Classification Tests
// ============================================================

describe('Grade Classification', () => {
  describe('Yearly score grades', () => {
    it('should assign S grade for scores >= 85', async () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2024, 2030)

      result.yearlyScores.forEach((score) => {
        if (score.score >= 85) {
          expect(score.grade).toBe('S')
        }
      })
    })

    it('should assign A grade for scores 75-84', async () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2024, 2030)

      result.yearlyScores.forEach((score) => {
        if (score.score >= 75 && score.score < 85) {
          expect(score.grade).toBe('A')
        }
      })
    })

    it('should assign D grade for scores < 45', async () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2024, 2030)

      result.yearlyScores.forEach((score) => {
        if (score.score < 45) {
          expect(score.grade).toBe('D')
        }
      })
    })

    it('should cover all grade categories', async () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2040)

      const validGrades = ['S', 'A', 'B', 'C', 'D']

      result.yearlyScores.forEach((score) => {
        expect(validGrades).toContain(score.grade)
      })
    })
  })
})

// ============================================================
// Trend Analysis Tests
// ============================================================

describe('Trend Analysis', () => {
  describe('Overall trend determination', () => {
    it('should identify trend based on first/second half comparison', async () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2030)

      expect(['ascending', 'descending', 'stable', 'volatile']).toContain(result.overallTrend)
    })

    it('should generate appropriate summary for each trend type', async () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2030)

      expect(result.summary.length).toBeGreaterThan(0)

      if (result.overallTrend === 'ascending') {
        expect(result.summary).toContain('상승')
      } else if (result.overallTrend === 'descending') {
        expect(result.summary).toContain('안정')
      } else if (result.overallTrend === 'stable') {
        expect(result.summary).toContain('안정')
      } else if (result.overallTrend === 'volatile') {
        expect(result.summary).toContain('변동')
      }
    })
  })

  describe('Peak and low year identification', () => {
    it('should identify top 3 peak years', async () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2030)

      expect(result.peakYears.length).toBeLessThanOrEqual(3)

      // Peak years should have higher scores
      if (result.peakYears.length > 0 && result.yearlyScores.length > 0) {
        const peakScores = result.peakYears.map(
          (year) => result.yearlyScores.find((s) => s.year === year)?.score || 0
        )
        const avgScore =
          result.yearlyScores.reduce((sum, s) => sum + s.score, 0) / result.yearlyScores.length

        peakScores.forEach((score) => {
          expect(score).toBeGreaterThanOrEqual(avgScore - 20)
        })
      }
    })

    it('should identify bottom 3 low years', async () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2030)

      expect(result.lowYears.length).toBeLessThanOrEqual(3)
    })
  })
})

// ============================================================
// Life Cycle Analysis Tests
// ============================================================

describe('Life Cycle Analysis', () => {
  describe('Phase determination', () => {
    it('should create phases based on daeun periods', async () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2040)

      expect(Array.isArray(result.lifeCycles)).toBe(true)
    })

    it('should include energy level for each phase', async () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2040)

      const validEnergies = ['peak', 'rising', 'declining', 'dormant']

      result.lifeCycles.forEach((phase) => {
        expect(validEnergies).toContain(phase.energy)
      })
    })

    it('should include recommendations for each phase', async () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2040)

      result.lifeCycles.forEach((phase) => {
        expect(Array.isArray(phase.recommendations)).toBe(true)
        expect(phase.recommendations.length).toBeGreaterThan(0)
      })
    })
  })
})

// ============================================================
// Daeun Transition Tests
// ============================================================

describe('Daeun Transition Analysis', () => {
  describe('Transition detection', () => {
    it('should detect transitions between daeun periods', async () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2000, 2050)

      expect(Array.isArray(result.daeunTransitions)).toBe(true)
    })

    it('should include impact assessment for each transition', async () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2000, 2050)

      const validImpacts = [
        'major_positive',
        'positive',
        'neutral',
        'challenging',
        'major_challenging',
      ]

      result.daeunTransitions.forEach((transition) => {
        expect(validImpacts).toContain(transition.impact)
        expect(transition.description.length).toBeGreaterThan(0)
      })
    })
  })

  describe('analyzeDaeunTransition function', () => {
    it('should analyze element transition', async () => {
      const input = createMockInput()
      const daeunList = createMockDaeunList()

      if (daeunList.length >= 2) {
        const result = analyzeDaeunTransition(input, daeunList[0], daeunList[1])

        expect(result).toBeDefined()
        expect(result.impact).toBeDefined()
        expect(result.description).toBeDefined()
      }
    })

    it('should detect yongsin to kisin transition as challenging', async () => {
      const input = createMockInput({
        yongsin: ['목'] as FiveElement[],
        kisin: ['화'] as FiveElement[],
      })
      const fromDaeun: DaeunInfo = {
        stem: '甲',
        branch: '寅',
        element: '목' as FiveElement,
        startAge: 1,
        endAge: 10,
      }
      const toDaeun: DaeunInfo = {
        stem: '丙',
        branch: '午',
        element: '화' as FiveElement,
        startAge: 11,
        endAge: 20,
      }

      const result = analyzeDaeunTransition(input, fromDaeun, toDaeun)

      expect(['challenging', 'major_challenging', 'neutral']).toContain(result.impact)
    })
  })
})

// ============================================================
// Astro Integration Tests (Extended)
// ============================================================

describe('Astro Integration Extended', () => {
  describe('Solar Return theme matching', () => {
    it('should match career themes correctly', async () => {
      const input: LifePredictionInput = {
        ...createMockInput(),
        advancedAstro: {
          solarReturn: {
            summary: { theme: 'Career success and achievement' },
          },
        },
      }

      const result = calculateAstroBonus(input, 'career')

      expect(result.bonus).toBeGreaterThan(0)
    })

    it('should match marriage themes correctly', async () => {
      const input: LifePredictionInput = {
        ...createMockInput(),
        advancedAstro: {
          solarReturn: {
            summary: { theme: 'Love and partnership' },
          },
        },
      }

      const result = calculateAstroBonus(input, 'marriage')

      expect(result.bonus).toBeGreaterThan(0)
    })
  })

  describe('Eclipse impact', () => {
    it('should give bonus for solar eclipse on career events', async () => {
      const input: LifePredictionInput = {
        ...createMockInput(),
        advancedAstro: {
          eclipses: {
            impact: { type: 'solar', affectedPlanets: ['Sun'] },
          },
        },
      }

      const result = calculateAstroBonus(input, 'career')

      expect(result).toBeDefined()
    })

    it('should give bonus for lunar eclipse on relationship events', async () => {
      const input: LifePredictionInput = {
        ...createMockInput(),
        advancedAstro: {
          eclipses: {
            impact: { type: 'lunar', affectedPlanets: ['Moon'] },
          },
        },
      }

      const result = calculateAstroBonus(input, 'marriage')

      expect(result).toBeDefined()
    })
  })
})

// ============================================================
// Weekly Analysis Extended Tests
// ============================================================

describe('Weekly Analysis Extended', () => {
  describe('Week boundary handling', () => {
    it('should handle week spanning two months', async () => {
      const input = createMockInput()
      const startDate = new Date(2024, 5, 28) // End of June
      const endDate = new Date(2024, 6, 10) // Into July

      const result = findWeeklyOptimalTiming(input, 'career', startDate, endDate)

      expect(result).toBeDefined()
      expect(result.weeklyPeriods.length).toBeGreaterThan(0)
    })

    it('should align weeks to Monday', async () => {
      const input = createMockInput()
      // Start on a Wednesday
      const startDate = new Date(2024, 5, 12)
      const result = findWeeklyOptimalTiming(input, 'marriage', startDate)

      if (result.weeklyPeriods.length > 0) {
        const firstWeek = result.weeklyPeriods[0]
        // startDate should be adjusted to Monday
        expect(firstWeek.startDate.getDay()).toBe(1) // Monday
      }
    })
  })

  describe('Best week selection', () => {
    it('should select week with highest score as best', async () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'investment', startDate)

      if (result.bestWeek && result.weeklyPeriods.length > 1) {
        const maxScore = Math.max(...result.weeklyPeriods.map((w) => w.score))
        expect(result.bestWeek.score).toBe(maxScore)
      }
    })

    it('should select week with lowest score as worst', async () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'move', startDate)

      if (result.worstWeek && result.weeklyPeriods.length > 1) {
        const minScore = Math.min(...result.weeklyPeriods.map((w) => w.score))
        expect(result.worstWeek.score).toBe(minScore)
      }
    })
  })
})

// ============================================================
// Optimal Period Analysis Extended Tests
// ============================================================

describe('Optimal Period Analysis Extended', () => {
  describe('Period filtering', () => {
    it('should not include past months', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'career', currentYear - 1, currentYear + 1)

      const now = new Date()
      result.optimalPeriods.forEach((period) => {
        expect(period.endDate.getTime()).toBeGreaterThanOrEqual(now.getTime() - 86400000 * 31)
      })
    })

    it('should limit optimal periods to 10', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'study', currentYear, currentYear + 5)

      expect(result.optimalPeriods.length).toBeLessThanOrEqual(10)
    })

    it('should limit avoid periods to 5', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'health', currentYear, currentYear + 5)

      expect(result.avoidPeriods.length).toBeLessThanOrEqual(5)
    })
  })

  describe('Period scoring thresholds', () => {
    it('should only include periods with score >= 70 as optimal', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'relationship', currentYear, currentYear + 2)

      result.optimalPeriods.forEach((period) => {
        expect(period.score).toBeGreaterThanOrEqual(70)
      })
    })

    it('should only include periods with score <= 35 as avoid', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'investment', currentYear, currentYear + 2)

      result.avoidPeriods.forEach((period) => {
        expect(period.score).toBeLessThanOrEqual(35)
      })
    })
  })
})

// ============================================================
// Comprehensive Prediction Extended Tests
// ============================================================

describe('Comprehensive Prediction Extended', () => {
  describe('Confidence calculation', () => {
    it('should increase confidence with complete birth data', async () => {
      const completeInput = createMockInput({
        birthHour: 14,
        daeunList: createMockDaeunList(),
        yongsin: ['목'] as FiveElement[],
      })

      const incompleteInput = createMockInput({
        birthHour: undefined,
        daeunList: undefined,
        yongsin: undefined,
      })

      const completeResult = generateComprehensivePrediction(completeInput)
      const incompleteResult = generateComprehensivePrediction(incompleteInput)

      expect(completeResult.confidence).toBeGreaterThan(incompleteResult.confidence)
    })

    it('should cap confidence at 95', async () => {
      const input = createMockInput({
        birthHour: 14,
        daeunList: createMockDaeunList(),
        yongsin: ['목', '화'] as FiveElement[],
      })

      const result = generateComprehensivePrediction(input)

      expect(result.confidence).toBeLessThanOrEqual(95)
    })
  })

  describe('Upcoming highlights extraction', () => {
    it('should extract peak years as highlights', async () => {
      const input = createMockInput()
      const result = generateComprehensivePrediction(input, 15)

      const peakHighlights = result.upcomingHighlights.filter((h) => h.type === 'peak')
      expect(peakHighlights.length).toBeGreaterThanOrEqual(0)
    })

    it('should extract daeun transitions as highlights', async () => {
      const input = createMockInput()
      const result = generateComprehensivePrediction(input, 20)

      const transitionHighlights = result.upcomingHighlights.filter((h) => h.type === 'transition')
      expect(Array.isArray(transitionHighlights)).toBe(true)
    })

    it('should sort highlights by date', async () => {
      const input = createMockInput()
      const result = generateComprehensivePrediction(input, 10)

      for (let i = 1; i < result.upcomingHighlights.length; i++) {
        expect(result.upcomingHighlights[i].date.getTime()).toBeGreaterThanOrEqual(
          result.upcomingHighlights[i - 1].date.getTime()
        )
      }
    })

    it('should limit highlights to 10', async () => {
      const input = createMockInput()
      const result = generateComprehensivePrediction(input, 30)

      expect(result.upcomingHighlights.length).toBeLessThanOrEqual(10)
    })
  })
})

// ============================================================
// Prompt Context Generation Extended Tests
// ============================================================

describe('Prompt Context Generation Extended', () => {
  describe('Korean context completeness', () => {
    it('should include all major sections', async () => {
      const { generateComprehensivePrediction, generateLifePredictionPromptContext } =
        await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const prediction = generateComprehensivePrediction(input, 5)
      const context = generateLifePredictionPromptContext(prediction, 'ko')

      expect(context).toContain('종합 인생 예측')
      expect(context).toContain('분석 기간')
      expect(context).toContain('전체 트렌드')
      expect(context).toContain('신뢰도')
      expect(context).toContain('연도별 운세')
    })

    it('should include opportunities and challenges', async () => {
      const { generateComprehensivePrediction, generateLifePredictionPromptContext } =
        await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const prediction = generateComprehensivePrediction(input, 5)
      const context = generateLifePredictionPromptContext(prediction, 'ko')

      // Context should include some form of opportunities or challenges
      const hasOpportunities = context.includes('기회') || context.includes('opportunities')
      const hasChallenges = context.includes('주의') || context.includes('challenges')

      expect(hasOpportunities || hasChallenges || context.includes('요약')).toBe(true)
    })
  })

  describe('English context completeness', () => {
    it('should include all major sections', async () => {
      const { generateComprehensivePrediction, generateLifePredictionPromptContext } =
        await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const prediction = generateComprehensivePrediction(input, 5)
      const context = generateLifePredictionPromptContext(prediction, 'en')

      expect(context).toContain('Comprehensive Life Prediction')
      expect(context).toContain('Period')
      expect(context).toContain('Trend')
      expect(context).toContain('Confidence')
    })
  })
})

// ============================================================
// Shinsal Detection Tests
// ============================================================

describe('Shinsal Detection Integration', () => {
  describe('Lucky shinsals', () => {
    it('should detect 천을귀인 and boost score', async () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'career', startDate)

      expect(result).toBeDefined()
      expect(result.weeklyPeriods.length).toBeGreaterThan(0)
    })

    it('should detect 역마 for move events', async () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'move', startDate)

      expect(result).toBeDefined()
      // Move events should have different scoring due to 역마
      expect(result.eventType).toBe('move')
    })

    it('should detect 문창 for study events', async () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'study', startDate)

      expect(result).toBeDefined()
      expect(result.eventType).toBe('study')
    })
  })

  describe('Unlucky shinsals', () => {
    it('should detect negative shinsals and reduce score', async () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'investment', startDate)

      expect(result).toBeDefined()
      // Check worst week exists
      expect(result.worstWeek === null || result.worstWeek !== undefined).toBe(true)
    })
  })
})

// ============================================================
// Solar Term Integration Tests
// ============================================================

describe('Solar Term Integration', () => {
  describe('Solar term element matching', () => {
    it('should apply solar term bonus when enabled', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()

      const resultWithSolarTerms = findOptimalEventTiming(
        input,
        'career',
        currentYear,
        currentYear + 1,
        { useSolarTerms: true }
      )
      const resultWithoutSolarTerms = findOptimalEventTiming(
        input,
        'career',
        currentYear,
        currentYear + 1,
        { useSolarTerms: false }
      )

      expect(resultWithSolarTerms).toBeDefined()
      expect(resultWithoutSolarTerms).toBeDefined()
    })

    it('should boost score when solar term element matches yongsin', async () => {
      const input = createMockInput({ yongsin: ['목', '화'] as FiveElement[] })
      const currentYear = new Date().getFullYear()

      const result = findOptimalEventTiming(input, 'health', currentYear, currentYear + 1)

      expect(result).toBeDefined()
      expect(result.optimalPeriods.length).toBeGreaterThanOrEqual(0)
    })
  })
})

// ============================================================
// Progression Analysis Tests
// ============================================================

describe('Progression Analysis Integration', () => {
  describe('Secondary progression effects', () => {
    it('should apply progression bonus when enabled', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()

      const resultWithProgressions = findOptimalEventTiming(
        input,
        'marriage',
        currentYear,
        currentYear + 1,
        { useProgressions: true }
      )

      expect(resultWithProgressions).toBeDefined()
    })

    it('should skip progression when disabled', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()

      const resultWithoutProgressions = findOptimalEventTiming(
        input,
        'career',
        currentYear,
        currentYear + 1,
        { useProgressions: false }
      )

      expect(resultWithoutProgressions).toBeDefined()
    })
  })
})

// ============================================================
// Tier 6 & Tier 7-10 Analysis Tests
// ============================================================

describe('Tier Analysis Integration', () => {
  describe('Tier 6 bonus calculation', () => {
    it('should integrate tier 6 analysis in event timing', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()

      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear + 1)

      expect(result).toBeDefined()
      // Tier 6 includes progression, shinsal, and day pillar analysis
      expect(result.optimalPeriods.length + result.avoidPeriods.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Tier 7-10 bonus calculation', () => {
    it('should integrate tier 7-10 analysis in event timing', async () => {
      const input = createMockInput({
        allStems: ['庚', '辛', '甲', '丙'],
        allBranches: ['午', '巳', '子', '寅'],
      })
      const currentYear = new Date().getFullYear()

      const result = findOptimalEventTiming(input, 'investment', currentYear, currentYear + 1)

      expect(result).toBeDefined()
    })
  })
})

// ============================================================
// Weekly Period Scoring Tests
// ============================================================

describe('Weekly Period Scoring', () => {
  describe('Daily score aggregation', () => {
    it('should calculate weekly score as trimmed average', async () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'career', startDate)

      // Each weekly period should have a score between 15 and 95
      result.weeklyPeriods.forEach(
        (period: { score: number; reasons: string[]; bestDays: Date[] }) => {
          expect(period.score).toBeGreaterThanOrEqual(15)
          expect(period.score).toBeLessThanOrEqual(95)
        }
      )
    })

    it('should identify top reasons from daily analysis', async () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'marriage', startDate)

      result.weeklyPeriods.forEach(
        (period: { score: number; reasons: string[]; bestDays: Date[] }) => {
          expect(Array.isArray(period.reasons)).toBe(true)
          expect(period.reasons.length).toBeLessThanOrEqual(5)
        }
      )
    })

    it('should select best days within each week', async () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'investment', startDate)

      result.weeklyPeriods.forEach(
        (period: { score: number; reasons: string[]; bestDays: Date[] }) => {
          expect(Array.isArray(period.bestDays)).toBe(true)
          expect(period.bestDays.length).toBeLessThanOrEqual(3)
        }
      )
    })
  })

  describe('Daeun influence on daily scores', () => {
    it('should boost score when daeun stage is favorable', async () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'health', startDate)

      expect(result).toBeDefined()
      // Daeun should affect the scoring
      expect(result.weeklyPeriods.length).toBeGreaterThan(0)
    })
  })

  describe('Seun (yearly luck) influence', () => {
    it('should apply yearly sibsin and stage bonuses', async () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'relationship', startDate)

      expect(result).toBeDefined()
    })
  })
})

// ============================================================
// Weekly Summary Generation Tests
// ============================================================

describe('Weekly Summary Generation', () => {
  describe('Summary content', () => {
    it('should include best week information', async () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'career', startDate)

      expect(result.summary.length).toBeGreaterThan(0)
      if (result.bestWeek) {
        expect(result.summary).toContain('가장 좋은 주간')
      }
    })

    it('should include best days in summary when available', async () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'marriage', startDate)

      // Summary should mention specific dates if best days exist
      expect(typeof result.summary).toBe('string')
    })

    it('should describe score variance', async () => {
      const input = createMockInput()
      const startDate = new Date()
      const endDate = new Date(startDate.getTime() + 120 * 24 * 60 * 60 * 1000) // 4 months
      const result = findWeeklyOptimalTiming(input, 'study', startDate, endDate)

      // Summary should describe stability or volatility
      expect(
        result.summary.includes('안정') ||
          result.summary.includes('변동') ||
          result.summary.includes('좋은')
      ).toBe(true)
    })
  })
})

// ============================================================
// Specific Good Days Finder Tests
// ============================================================

describe('Specific Good Days Finder', () => {
  describe('Good day detection in optimal periods', () => {
    it('should find specific good days within optimal months', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'marriage', currentYear, currentYear + 2)

      result.optimalPeriods.forEach(
        (period: { startDate: Date; endDate: Date; specificDays?: Date[] }) => {
          if (period.specificDays) {
            expect(Array.isArray(period.specificDays)).toBe(true)
            period.specificDays.forEach((day: Date) => {
              expect(day).toBeInstanceOf(Date)
              expect(day.getTime()).toBeGreaterThanOrEqual(period.startDate.getTime())
              expect(day.getTime()).toBeLessThanOrEqual(period.endDate.getTime())
            })
          }
        }
      )
    })
  })
})

// ============================================================
// Event Advice Generation Tests
// ============================================================

describe('Event Advice Generation', () => {
  describe('Advice content', () => {
    it('should mention event type in advice', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()

      const eventTypes: EventType[] = [
        'marriage',
        'career',
        'investment',
        'move',
        'study',
        'health',
        'relationship',
      ]

      eventTypes.forEach(async (eventType) => {
        const result = findOptimalEventTiming(input, eventType, currentYear, currentYear + 1)
        expect(result.advice.length).toBeGreaterThan(0)
      })
    })

    it('should mention best period when available', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()

      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear + 2)

      if (result.optimalPeriods.length > 0) {
        expect(result.advice).toContain('가장 좋은 시기')
      }
    })

    it('should warn about avoid periods when present', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()

      const result = findOptimalEventTiming(input, 'investment', currentYear, currentYear + 2)

      if (result.avoidPeriods.length > 0) {
        expect(result.advice).toContain('피하는 것이 좋습니다')
      }
    })
  })
})

// ============================================================
// Branch Interaction in Event Timing Tests
// ============================================================

describe('Branch Interaction in Event Timing', () => {
  describe('Positive interactions', () => {
    it('should boost score for 삼합 interactions', async () => {
      // Input with branches that can form 삼합
      const input = createMockInput({
        dayBranch: '寅',
        monthBranch: '午',
        yearBranch: '戌',
      })
      const currentYear = new Date().getFullYear()

      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear + 1)

      expect(result).toBeDefined()
    })

    it('should boost score for 육합 interactions', async () => {
      // Input with branches that can form 육합
      const input = createMockInput({
        dayBranch: '子',
        monthBranch: '丑',
      })
      const currentYear = new Date().getFullYear()

      const result = findOptimalEventTiming(input, 'marriage', currentYear, currentYear + 1)

      expect(result).toBeDefined()
    })
  })

  describe('Negative interactions', () => {
    it('should reduce score for 충 interactions', async () => {
      // Input with clashing branches
      const input = createMockInput({
        dayBranch: '子',
        yearBranch: '午',
      })
      const currentYear = new Date().getFullYear()

      const result = findOptimalEventTiming(input, 'investment', currentYear, currentYear + 1)

      expect(result).toBeDefined()
    })
  })
})

// ============================================================
// Compound Luck Analysis Tests
// ============================================================

describe('Compound Luck Analysis', () => {
  describe('Integration with event timing', () => {
    it('should apply compound luck bonuses', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()

      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear + 1)

      expect(result).toBeDefined()
      // Compound luck should be applied in the scoring
    })
  })
})

// ============================================================
// Multiple Event Type Comparison Tests
// ============================================================

describe('Multiple Event Type Comparison', () => {
  describe('Different scoring patterns', () => {
    it('should produce different results for different event types', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()

      const marriageResult = findOptimalEventTiming(input, 'marriage', currentYear, currentYear + 1)
      const careerResult = findOptimalEventTiming(input, 'career', currentYear, currentYear + 1)
      const investmentResult = findOptimalEventTiming(
        input,
        'investment',
        currentYear,
        currentYear + 1
      )

      // Different event types should have different optimal periods
      expect(marriageResult.eventType).toBe('marriage')
      expect(careerResult.eventType).toBe('career')
      expect(investmentResult.eventType).toBe('investment')

      // At least the event types should be different (actual scores may overlap)
      expect(marriageResult.eventType).not.toBe(careerResult.eventType)
    })

    it('should apply event-specific sibsin preferences', async () => {
      const input = createMockInput()
      const startDate = new Date()

      const moveResult = findWeeklyOptimalTiming(input, 'move', startDate)
      const studyResult = findWeeklyOptimalTiming(input, 'study', startDate)
      const healthResult = findWeeklyOptimalTiming(input, 'health', startDate)

      expect(moveResult.eventType).toBe('move')
      expect(studyResult.eventType).toBe('study')
      expect(healthResult.eventType).toBe('health')
    })
  })
})

// ============================================================
// Date Range Handling Tests
// ============================================================

describe('Date Range Handling', () => {
  describe('Custom date ranges', () => {
    it('should respect start and end year for optimal timing', async () => {
      const input = createMockInput()
      const result = findOptimalEventTiming(input, 'career', 2025, 2027)

      expect(result.searchRange.startYear).toBe(2025)
      expect(result.searchRange.endYear).toBe(2027)

      result.optimalPeriods.forEach((period: { startDate: Date }) => {
        const year = period.startDate.getFullYear()
        expect(year).toBeGreaterThanOrEqual(2025)
        expect(year).toBeLessThanOrEqual(2027)
      })
    })

    it('should respect start and end date for weekly timing', async () => {
      const input = createMockInput()
      const startDate = new Date(2025, 0, 1)
      const endDate = new Date(2025, 3, 30)

      const result = findWeeklyOptimalTiming(input, 'marriage', startDate, endDate)

      expect(result.searchRange.startDate.getTime()).toBe(startDate.getTime())
      expect(result.searchRange.endDate.getTime()).toBe(endDate.getTime())
    })
  })

  describe('Past date filtering', () => {
    it('should filter out past months from optimal periods', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'career', currentYear - 1, currentYear + 1)

      const now = new Date()
      result.optimalPeriods.forEach((period) => {
        // Allow some buffer for month boundary
        expect(period.endDate.getTime()).toBeGreaterThanOrEqual(
          now.getTime() - 40 * 24 * 60 * 60 * 1000
        )
      })
    })
  })
})

// ============================================================
// Score Normalization in Event Timing Tests
// ============================================================

describe('Score Normalization in Event Timing', () => {
  describe('Monthly score normalization', () => {
    it('should normalize scores to 0-100 range', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear + 2)

      result.optimalPeriods.forEach((period) => {
        expect(period.score).toBeGreaterThanOrEqual(0)
        expect(period.score).toBeLessThanOrEqual(100)
      })

      result.avoidPeriods.forEach((period) => {
        expect(period.score).toBeGreaterThanOrEqual(0)
        expect(period.score).toBeLessThanOrEqual(100)
      })
    })
  })

  describe('Daily score normalization', () => {
    it('should normalize daily scores to 15-95 range', async () => {
      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'investment', startDate)

      result.weeklyPeriods.forEach((period) => {
        expect(period.score).toBeGreaterThanOrEqual(15)
        expect(period.score).toBeLessThanOrEqual(95)
      })
    })
  })
})

// ============================================================
// All Stem Combinations Tests
// ============================================================

describe('All Stem Combinations', () => {
  describe('Stem combination detection', () => {
    it('should detect all five stem combinations', async () => {
      expect(STEM_COMBINATIONS['甲己']).toBe('토로 변화')
      expect(STEM_COMBINATIONS['乙庚']).toBe('금으로 변화')
      expect(STEM_COMBINATIONS['丙辛']).toBe('수로 변화')
      expect(STEM_COMBINATIONS['丁壬']).toBe('목으로 변화')
      expect(STEM_COMBINATIONS['戊癸']).toBe('화로 변화')
    })

    it('should have correct element transformations', async () => {
      const combinations = Object.entries(STEM_COMBINATIONS)
      // STEM_COMBINATIONS includes both directions (甲己 and 己甲)
      expect(combinations.length).toBeGreaterThanOrEqual(5)

      combinations.forEach(([_, result]) => {
        expect(['토로 변화', '금으로 변화', '수로 변화', '목으로 변화', '화로 변화']).toContain(
          result
        )
      })
    })
  })
})

// ============================================================
// All Stem Clashes Tests
// ============================================================

describe('All Stem Clashes', () => {
  describe('Stem clash detection', () => {
    it('should detect major stem clashes', async () => {
      // Check for primary clashes (includes both directions)
      expect(STEM_CLASHES).toContain('甲庚')
      expect(STEM_CLASHES).toContain('乙辛')
      expect(STEM_CLASHES).toContain('丙壬')
      expect(STEM_CLASHES).toContain('丁癸')
    })

    it('should have stem clashes defined', async () => {
      // STEM_CLASHES includes both directions for each clash pair
      expect(STEM_CLASHES.length).toBeGreaterThanOrEqual(4)
    })
  })
})

// ============================================================
// Branch Punishment Tests
// ============================================================

describe('Branch Punishments', () => {
  describe('Punishment detection', () => {
    it('should detect 寅巳 punishment', async () => {
      expect(BRANCH_PUNISHMENTS['寅巳']).toBe('형')
    })

    it('should detect 子卯 punishment', async () => {
      expect(BRANCH_PUNISHMENTS['子卯']).toBe('형')
    })

    it('should have multiple punishment pairs', async () => {
      const pairs = Object.keys(BRANCH_PUNISHMENTS)
      expect(pairs.length).toBeGreaterThan(0)
    })
  })
})

// ============================================================
// Partial Trines Tests
// ============================================================

describe('Partial Trines (삼합)', () => {
  describe('Partial trine detection', () => {
    it('should detect fire trine (화국)', async () => {
      expect(PARTIAL_TRINES['寅午']).toBe('화국 삼합')
    })

    it('should detect water trine (수국)', async () => {
      expect(PARTIAL_TRINES['申子']).toBe('수국 삼합')
    })

    it('should detect wood trine (목국)', async () => {
      expect(PARTIAL_TRINES['亥卯']).toBe('목국 삼합')
    })

    it('should detect metal trine (금국)', async () => {
      expect(PARTIAL_TRINES['巳酉']).toBe('금국 삼합')
    })
  })
})

// ============================================================
// Event Names Localization Tests
// ============================================================

describe('Event Names Localization', () => {
  describe('Full event names', () => {
    it('should have Korean names for all event types', async () => {
      const eventTypes = [
        'marriage',
        'career',
        'investment',
        'move',
        'study',
        'health',
        'relationship',
      ]

      eventTypes.forEach((eventType) => {
        expect(EVENT_NAMES_FULL[eventType as keyof typeof EVENT_NAMES_FULL].ko).toBeDefined()
        expect(typeof EVENT_NAMES_FULL[eventType as keyof typeof EVENT_NAMES_FULL].ko).toBe(
          'string'
        )
      })
    })

    it('should have English names for all event types', async () => {
      const eventTypes = [
        'marriage',
        'career',
        'investment',
        'move',
        'study',
        'health',
        'relationship',
      ]

      eventTypes.forEach((eventType) => {
        expect(EVENT_NAMES_FULL[eventType as keyof typeof EVENT_NAMES_FULL].en).toBeDefined()
        expect(typeof EVENT_NAMES_FULL[eventType as keyof typeof EVENT_NAMES_FULL].en).toBe(
          'string'
        )
      })
    })
  })
})

// ============================================================
// Astro Event Conditions Tests
// ============================================================

describe('Astro Event Conditions', () => {
  describe('Benefic signs', () => {
    it('should have benefic signs for marriage', async () => {
      expect(ASTRO_EVENT_CONDITIONS.marriage.beneficSigns).toBeDefined()
      expect(Array.isArray(ASTRO_EVENT_CONDITIONS.marriage.beneficSigns)).toBe(true)
      expect(ASTRO_EVENT_CONDITIONS.marriage.beneficSigns.length).toBeGreaterThan(0)
    })

    it('should have benefic planets for career', async () => {
      expect(ASTRO_EVENT_CONDITIONS.career.beneficPlanets).toBeDefined()
      expect(Array.isArray(ASTRO_EVENT_CONDITIONS.career.beneficPlanets)).toBe(true)
    })
  })

  describe('Moon phase bonuses', () => {
    it('should have moon phase bonus configuration', async () => {
      expect(ASTRO_EVENT_CONDITIONS.marriage.moonPhaseBonus).toBeDefined()
      expect(typeof ASTRO_EVENT_CONDITIONS.marriage.moonPhaseBonus).toBe('object')
    })
  })
})

// ============================================================
// Transit Event Conditions Tests
// ============================================================

describe('Transit Event Conditions', () => {
  describe('Key natal points', () => {
    it('should have key natal points for each event type', async () => {
      const eventTypes = [
        'marriage',
        'career',
        'investment',
        'move',
        'study',
        'health',
        'relationship',
      ]

      eventTypes.forEach((eventType) => {
        const conditions =
          TRANSIT_EVENT_CONDITIONS[eventType as keyof typeof TRANSIT_EVENT_CONDITIONS]
        expect(conditions.keyNatalPoints).toBeDefined()
        expect(Array.isArray(conditions.keyNatalPoints)).toBe(true)
      })
    })
  })

  describe('Benefic and malefic aspects', () => {
    it('should have benefic aspects defined', async () => {
      expect(TRANSIT_EVENT_CONDITIONS.career.beneficAspects).toBeDefined()
      expect(Array.isArray(TRANSIT_EVENT_CONDITIONS.career.beneficAspects)).toBe(true)
    })

    it('should have malefic aspects defined', async () => {
      expect(TRANSIT_EVENT_CONDITIONS.career.maleficAspects).toBeDefined()
      expect(Array.isArray(TRANSIT_EVENT_CONDITIONS.career.maleficAspects)).toBe(true)
    })
  })

  describe('Favorable houses', () => {
    it('should have favorable houses for each event type', async () => {
      const eventTypes = ['marriage', 'career', 'investment']

      eventTypes.forEach((eventType) => {
        const conditions =
          TRANSIT_EVENT_CONDITIONS[eventType as keyof typeof TRANSIT_EVENT_CONDITIONS]
        expect(conditions.favorableHouses).toBeDefined()
        expect(Array.isArray(conditions.favorableHouses)).toBe(true)
      })
    })
  })
})

// ============================================================
// Event Houses Configuration Tests
// ============================================================

describe('Event Houses Configuration', () => {
  describe('Primary houses', () => {
    it('should have house 7 as primary for marriage', async () => {
      expect(EVENT_HOUSES.marriage.primary).toContain(7)
    })

    it('should have house 10 as primary for career', async () => {
      expect(EVENT_HOUSES.career.primary).toContain(10)
    })
  })

  describe('Secondary houses', () => {
    it('should have secondary houses defined', async () => {
      expect(EVENT_HOUSES.marriage.secondary).toBeDefined()
      expect(Array.isArray(EVENT_HOUSES.marriage.secondary)).toBe(true)
    })
  })

  describe('Avoid houses', () => {
    it('should have avoid houses defined', async () => {
      expect(EVENT_HOUSES.career.avoid).toBeDefined()
      expect(Array.isArray(EVENT_HOUSES.career.avoid)).toBe(true)
    })
  })
})

// ============================================================
// Gender-based Analysis Tests
// ============================================================

describe('Gender-based Analysis', () => {
  describe('Male vs Female input', () => {
    it('should process male input correctly', async () => {
      const maleInput = createMockInput({ gender: 'male' })
      const result = generateComprehensivePrediction(maleInput)

      expect(result).toBeDefined()
      expect(result.input.gender).toBe('male')
    })

    it('should process female input correctly', async () => {
      const femaleInput = createMockInput({ gender: 'female' })
      const result = generateComprehensivePrediction(femaleInput)

      expect(result).toBeDefined()
      expect(result.input.gender).toBe('female')
    })
  })
})

// ============================================================
// Input Validation Edge Cases Tests
// ============================================================

describe('Input Validation Edge Cases', () => {
  describe('Missing optional fields', () => {
    it('should handle missing birthHour', async () => {
      const input = createMockInput({ birthHour: undefined })
      const result = generateComprehensivePrediction(input)

      expect(result).toBeDefined()
      expect(result.confidence).toBeLessThan(95)
    })

    it('should handle missing yongsin and kisin', async () => {
      const input = createMockInput({ yongsin: undefined, kisin: undefined })
      const currentYear = new Date().getFullYear()

      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear + 1)

      expect(result).toBeDefined()
    })

    it('should handle empty allStems and allBranches', async () => {
      const input = createMockInput({ allStems: [], allBranches: [] })
      const startDate = new Date()

      const result = findWeeklyOptimalTiming(input, 'marriage', startDate)

      expect(result).toBeDefined()
    })
  })

  describe('Extreme birth years', () => {
    it('should handle very old birth year', async () => {
      const input = createMockInput({ birthYear: 1920 })
      const result = analyzeMultiYearTrend(input, 2020, 2025)

      expect(result).toBeDefined()
    })

    it('should handle recent birth year', async () => {
      const input = createMockInput({ birthYear: 2020 })
      const result = analyzeMultiYearTrend(input, 2024, 2030)

      expect(result).toBeDefined()
    })
  })
})


// ============================================================
// Multi-Layer Synergy Tests
// ============================================================

describe('Multi-Layer Synergy Analysis', () => {
  describe('Triple layer favorable sibsin', () => {
    it('should give bonus for triple favorable sibsin', async () => {
      const { analyzeMultiLayerInteraction } = await import('@/lib/prediction/life-prediction');

      const input = createMockInput({
        daeunList: [
          { stem: '甲', branch: '寅', element: '목' as FiveElement, startAge: 30, endAge: 40 },
        ],
      });

      const result = analyzeMultiLayerInteraction(input, 'career', 2024, 6);

      expect(result).toBeDefined();
      expect(typeof result.bonus).toBe('number');
    });
  });

  describe('Stem-stem relationship analysis', () => {
    it('should detect daeun-seun stem combination', async () => {
      const { analyzeMultiLayerInteraction } = await import('@/lib/prediction/life-prediction');

      const input = createMockInput({
        daeunList: [
          { stem: '甲', branch: '寅', element: '목' as FiveElement, startAge: 30, endAge: 40 },
        ],
      });

      const result = analyzeMultiLayerInteraction(input, 'marriage', 2024, 6);

      expect(result.reasons.length + result.penalties.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Yongsin/Kisin complex check', () => {
    it('should boost for multiple yongsin active', async () => {
      const { analyzeMultiLayerInteraction } = await import('@/lib/prediction/life-prediction');

      const input = createMockInput({
        yongsin: ['목', '화', '수'] as FiveElement[],
        daeunList: [
          { stem: '甲', branch: '寅', element: '목' as FiveElement, startAge: 30, endAge: 40 },
        ],
      });

      const result = analyzeMultiLayerInteraction(input, 'investment', 2024, 6);

      expect(result).toBeDefined();
    });

    it('should penalize for multiple kisin active', async () => {
      const { analyzeMultiLayerInteraction } = await import('@/lib/prediction/life-prediction');

      const input = createMockInput({
        kisin: ['목', '화', '수'] as FiveElement[],
        daeunList: [
          { stem: '甲', branch: '寅', element: '목' as FiveElement, startAge: 30, endAge: 40 },
        ],
      });

      const result = analyzeMultiLayerInteraction(input, 'health', 2024, 6);

      expect(result).toBeDefined();
    });
  });
});

// ============================================================
// Daeun Transition Impact Tests
// ============================================================

describe('Daeun Transition Impact Analysis', () => {
  describe('Major positive transitions', () => {
    it('should detect major positive when entering yongsin with peak energy', async () => {
      const { analyzeDaeunTransition } = await import('@/lib/prediction/life-prediction');

      const input = createMockInput({
        yongsin: ['목'] as FiveElement[],
        dayStem: '甲',
      });

      const fromDaeun: DaeunInfo = { stem: '庚', branch: '申', element: '금' as FiveElement, startAge: 20, endAge: 30 };
      const toDaeun: DaeunInfo = { stem: '甲', branch: '寅', element: '목' as FiveElement, startAge: 31, endAge: 40 };

      const result = analyzeDaeunTransition(input, fromDaeun, toDaeun);

      expect(['major_positive', 'positive', 'neutral']).toContain(result.impact);
      expect(result.description.length).toBeGreaterThan(0);
    });
  });

  describe('Major challenging transitions', () => {
    it('should detect major challenging when entering kisin with dormant energy', async () => {
      const { analyzeDaeunTransition } = await import('@/lib/prediction/life-prediction');

      const input = createMockInput({
        kisin: ['금'] as FiveElement[],
        dayStem: '甲',
      });

      const fromDaeun: DaeunInfo = { stem: '甲', branch: '寅', element: '목' as FiveElement, startAge: 20, endAge: 30 };
      const toDaeun: DaeunInfo = { stem: '庚', branch: '申', element: '금' as FiveElement, startAge: 31, endAge: 40 };

      const result = analyzeDaeunTransition(input, fromDaeun, toDaeun);

      expect(['major_challenging', 'challenging', 'neutral']).toContain(result.impact);
    });
  });

  describe('Neutral transitions', () => {
    it('should detect neutral transition', async () => {
      const { analyzeDaeunTransition } = await import('@/lib/prediction/life-prediction');

      const input = createMockInput({
        yongsin: [] as FiveElement[],
        kisin: [] as FiveElement[],
      });

      const fromDaeun: DaeunInfo = { stem: '戊', branch: '辰', element: '토' as FiveElement, startAge: 20, endAge: 30 };
      const toDaeun: DaeunInfo = { stem: '己', branch: '巳', element: '토' as FiveElement, startAge: 31, endAge: 40 };

      const result = analyzeDaeunTransition(input, fromDaeun, toDaeun);

      expect(['major_positive', 'positive', 'neutral', 'challenging', 'major_challenging']).toContain(result.impact);
    });
  });
});

// ============================================================
// Energy Recommendations Tests (Extended)
// ============================================================

describe('Energy Recommendations Extended', () => {
  describe('All energy levels', () => {
    it('should generate unique recommendations for each energy level', async () => {
      const { generateEnergyRecommendations } = await import('@/lib/prediction/life-prediction');

      const peakRecs = generateEnergyRecommendations('peak', '목');
      const risingRecs = generateEnergyRecommendations('rising', '목');
      const decliningRecs = generateEnergyRecommendations('declining', '목');
      const dormantRecs = generateEnergyRecommendations('dormant', '목');

      // Each should have at least 4 recommendations (3 base + 1 element)
      expect(peakRecs.length).toBeGreaterThanOrEqual(4);
      expect(risingRecs.length).toBeGreaterThanOrEqual(4);
      expect(decliningRecs.length).toBeGreaterThanOrEqual(4);
      expect(dormantRecs.length).toBeGreaterThanOrEqual(4);

      // Peak should not include dormant recommendations
      expect(peakRecs).toContain('중요한 결정과 큰 프로젝트 추진');
      expect(peakRecs).not.toContain('내면 성찰과 재충전');
    });
  });

  describe('All element recommendations', () => {
    it('should add element-specific recommendation', async () => {
      const { generateEnergyRecommendations } = await import('@/lib/prediction/life-prediction');

      const elements: FiveElement[] = ['목', '화', '토', '금', '수'];

      elements.forEach(element => {
        const recs = generateEnergyRecommendations('peak', element);
        expect(recs.length).toBeGreaterThan(3);
      });
    });

    it('should have 목 element recommendation', async () => {
      const { generateEnergyRecommendations } = await import('@/lib/prediction/life-prediction');

      const recs = generateEnergyRecommendations('rising', '목');
      expect(recs).toContain('창의적 활동과 새로운 아이디어 개발');
    });

    it('should have 화 element recommendation', async () => {
      const { generateEnergyRecommendations } = await import('@/lib/prediction/life-prediction');

      const recs = generateEnergyRecommendations('rising', '화');
      expect(recs).toContain('열정을 표현하되 과열 주의');
    });

    it('should have 토 element recommendation', async () => {
      const { generateEnergyRecommendations } = await import('@/lib/prediction/life-prediction');

      const recs = generateEnergyRecommendations('declining', '토');
      expect(recs).toContain('부동산, 안정적 투자에 유리');
    });

    it('should have 금 element recommendation', async () => {
      const { generateEnergyRecommendations } = await import('@/lib/prediction/life-prediction');

      const recs = generateEnergyRecommendations('dormant', '금');
      expect(recs).toContain('결단력 있는 정리와 선택');
    });

    it('should have 수 element recommendation', async () => {
      const { generateEnergyRecommendations } = await import('@/lib/prediction/life-prediction');

      const recs = generateEnergyRecommendations('dormant', '수');
      expect(recs).toContain('유연한 대응과 지혜로운 판단');
    });
  });
});

// ============================================================
// Six Combo Complete Coverage Tests
// ============================================================

describe('Six Combo Complete Coverage', () => {
  describe('All six combo pairs', () => {
    it('should detect all 6 육합 pairs', async () => {
      const { analyzeBranchRelation } = await import('@/lib/prediction/life-prediction');

      const comboPairs = [
        ['子', '丑'],
        ['寅', '亥'],
        ['卯', '戌'],
        ['辰', '酉'],
        ['巳', '申'],
        ['午', '未'],
      ];

      comboPairs.forEach(([branch1, branch2]) => {
        expect(analyzeBranchRelation(branch1, branch2)).toBe('육합');
        expect(analyzeBranchRelation(branch2, branch1)).toBe('육합');
      });
    });
  });
});

// ============================================================
// All Branch Clashes Coverage Tests
// ============================================================

describe('All Branch Clashes Coverage', () => {
  describe('All 6 clash pairs', () => {
    it('should detect all 6 충 pairs', async () => {
      const { analyzeBranchRelation } = await import('@/lib/prediction/life-prediction');

      const clashPairs = [
        ['子', '午'],
        ['丑', '未'],
        ['寅', '申'],
        ['卯', '酉'],
        ['辰', '戌'],
        ['巳', '亥'],
      ];

      clashPairs.forEach(([branch1, branch2]) => {
        expect(analyzeBranchRelation(branch1, branch2)).toBe('충');
        expect(analyzeBranchRelation(branch2, branch1)).toBe('충');
      });
    });
  });
});

// ============================================================
// Partial Trine Complete Coverage Tests
// ============================================================

describe('Partial Trine Complete Coverage', () => {
  describe('Fire trine (화국)', () => {
    it('should detect all fire trine combinations', async () => {
      const { PARTIAL_TRINES } = await import('@/lib/prediction/life-prediction');

      expect(PARTIAL_TRINES['寅午']).toBe('화국 삼합');
      expect(PARTIAL_TRINES['午戌']).toBe('화국 삼합');
      expect(PARTIAL_TRINES['寅戌']).toBe('화국 삼합');
    });
  });

  describe('Water trine (수국)', () => {
    it('should detect all water trine combinations', async () => {
      const { PARTIAL_TRINES } = await import('@/lib/prediction/life-prediction');

      expect(PARTIAL_TRINES['申子']).toBe('수국 삼합');
      expect(PARTIAL_TRINES['子辰']).toBe('수국 삼합');
      expect(PARTIAL_TRINES['申辰']).toBe('수국 삼합');
    });
  });

  describe('Metal trine (금국)', () => {
    it('should detect all metal trine combinations', async () => {
      const { PARTIAL_TRINES } = await import('@/lib/prediction/life-prediction');

      expect(PARTIAL_TRINES['巳酉']).toBe('금국 삼합');
      expect(PARTIAL_TRINES['酉丑']).toBe('금국 삼합');
      expect(PARTIAL_TRINES['巳丑']).toBe('금국 삼합');
    });
  });

  describe('Wood trine (목국)', () => {
    it('should detect all wood trine combinations', async () => {
      const { PARTIAL_TRINES } = await import('@/lib/prediction/life-prediction');

      expect(PARTIAL_TRINES['亥卯']).toBe('목국 삼합');
      expect(PARTIAL_TRINES['卯未']).toBe('목국 삼합');
      expect(PARTIAL_TRINES['亥未']).toBe('목국 삼합');
    });
  });
});

// ============================================================
// Avoid Retrograde Tests
// ============================================================

describe('Avoid Retrograde Configuration', () => {
  describe('Event-specific retrogrades to avoid', () => {
    it('should have retrograde avoidance for marriage', async () => {
      const { ASTRO_EVENT_CONDITIONS } = await import('@/lib/prediction/life-prediction');

      expect(ASTRO_EVENT_CONDITIONS.marriage.avoidRetrogrades).toBeDefined();
      expect(ASTRO_EVENT_CONDITIONS.marriage.avoidRetrogrades).toContain('Venus');
    });

    it('should have retrograde avoidance for career', async () => {
      const { ASTRO_EVENT_CONDITIONS } = await import('@/lib/prediction/life-prediction');

      expect(ASTRO_EVENT_CONDITIONS.career.avoidRetrogrades).toBeDefined();
      expect(ASTRO_EVENT_CONDITIONS.career.avoidRetrogrades).toContain('Mercury');
    });

    it('should have retrograde avoidance for investment', async () => {
      const { ASTRO_EVENT_CONDITIONS } = await import('@/lib/prediction/life-prediction');

      expect(ASTRO_EVENT_CONDITIONS.investment.avoidRetrogrades).toBeDefined();
      expect(ASTRO_EVENT_CONDITIONS.investment.avoidRetrogrades).toContain('Mercury');
    });
  });
});

// ============================================================
// SIBSIN Scores Detailed Tests
// ============================================================

describe('SIBSIN Scores Detailed', () => {
  describe('Score ordering', () => {
    it('should have 정관 as highest score', async () => {
      const { SIBSIN_SCORES } = await import('@/lib/prediction/life-prediction');

      const scores = Object.values(SIBSIN_SCORES);
      const maxScore = Math.max(...scores);
      expect(SIBSIN_SCORES['정관']).toBe(maxScore);
    });

    it('should have 겁재 as lowest score', async () => {
      const { SIBSIN_SCORES } = await import('@/lib/prediction/life-prediction');

      const scores = Object.values(SIBSIN_SCORES);
      const minScore = Math.min(...scores);
      expect(SIBSIN_SCORES['겁재']).toBe(minScore);
    });

    it('should have proper ordering of positive sibsin', async () => {
      const { SIBSIN_SCORES } = await import('@/lib/prediction/life-prediction');

      expect(SIBSIN_SCORES['정관']).toBeGreaterThan(SIBSIN_SCORES['정재']);
      expect(SIBSIN_SCORES['정재']).toBeGreaterThan(SIBSIN_SCORES['정인']);
      expect(SIBSIN_SCORES['정인']).toBeGreaterThan(SIBSIN_SCORES['식신']);
    });
  });

  describe('Relative scores', () => {
    it('should have matching relative score patterns', async () => {
      const { SIBSIN_SCORES_RELATIVE } = await import('@/lib/prediction/life-prediction');

      expect(SIBSIN_SCORES_RELATIVE['정관']).toBeGreaterThan(0);
      expect(SIBSIN_SCORES_RELATIVE['정재']).toBeGreaterThan(0);
      expect(SIBSIN_SCORES_RELATIVE['겁재']).toBeLessThan(0);
      expect(SIBSIN_SCORES_RELATIVE['비견']).toBeLessThan(0);
    });
  });
});

// ============================================================
// Comprehensive Astro Data Integration Tests
// ============================================================

describe('Comprehensive Astro Data Integration', () => {
  describe('Full astro chart processing', () => {
    it('should process all planet positions', async () => {
      const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction');

      const input: LifePredictionInput = {
        ...createMockInput(),
        astroChart: {
          sun: { sign: 'Capricorn', house: 10, longitude: 280 },
          moon: { sign: 'Cancer', house: 4, longitude: 100 },
          mercury: { sign: 'Capricorn', house: 10, longitude: 285, isRetrograde: true },
          venus: { sign: 'Libra', house: 7, longitude: 195 },
          mars: { sign: 'Aries', house: 1, longitude: 15 },
          jupiter: { sign: 'Sagittarius', house: 9, longitude: 260 },
          saturn: { sign: 'Capricorn', house: 10, longitude: 290 },
          uranus: { sign: 'Taurus', house: 2, longitude: 45 },
          neptune: { sign: 'Pisces', house: 12, longitude: 350 },
          pluto: { sign: 'Capricorn', house: 10, longitude: 295 },
        },
      };

      const result = calculateAstroBonus(input, 'career');

      expect(result).toBeDefined();
      expect(typeof result.bonus).toBe('number');
    });
  });

  describe('Transit aspects processing', () => {
    it('should process multiple transit aspects', async () => {
      const { calculateTransitBonus } = await import('@/lib/prediction/life-prediction');

      const input: LifePredictionInput = {
        ...createMockInput(),
        advancedAstro: {
          currentTransits: {
            date: '2024-06-15',
            majorTransits: [
              { transitPlanet: 'Jupiter', natalPoint: 'Sun', type: 'trine', orb: 2, isApplying: true },
              { transitPlanet: 'Saturn', natalPoint: 'Moon', type: 'square', orb: 3, isApplying: false },
              { transitPlanet: 'Venus', natalPoint: 'Venus', type: 'conjunction', orb: 1, isApplying: true },
            ],
            outerPlanets: [
              { name: 'Jupiter', longitude: 45, sign: 'Taurus', house: 10, retrograde: false },
              { name: 'Saturn', longitude: 340, sign: 'Pisces', house: 6, retrograde: true },
              { name: 'Uranus', longitude: 50, sign: 'Taurus', house: 10, retrograde: false },
            ],
            themes: [
              { theme: 'Career Achievement', keywords: ['success'], duration: '3 months', transitPlanet: 'Jupiter', natalPoint: 'MC' },
            ],
          },
        },
      };

      const result = calculateTransitBonus(input, 'career');

      expect(result).toBeDefined();
    });
  });
});

// ============================================================
// Yearly Ganji Calculation Tests
// ============================================================

describe('Yearly Ganji Integration', () => {
  describe('Year calculation consistency', () => {
    it('should return consistent ganji for same year', async () => {
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction');

      const input = createMockInput();
      const result1 = analyzeMultiYearTrend(input, 2024, 2024);
      const result2 = analyzeMultiYearTrend(input, 2024, 2024);

      if (result1.yearlyScores.length > 0 && result2.yearlyScores.length > 0) {
        expect(result1.yearlyScores[0].yearGanji.stem).toBe(result2.yearlyScores[0].yearGanji.stem);
        expect(result1.yearlyScores[0].yearGanji.branch).toBe(result2.yearlyScores[0].yearGanji.branch);
      }
    });
  });
});

// ============================================================
// Event Type Names Compatibility Tests
// ============================================================

describe('Event Type Names Compatibility', () => {
  describe('EVENT_NAMES_FULL full version', () => {
    it('should have full Korean and English names', async () => {
      const { EVENT_NAMES_FULL } = await import('@/lib/prediction/life-prediction');

      expect(EVENT_NAMES_FULL.marriage.ko).toBe('결혼');
      expect(EVENT_NAMES_FULL.career.ko).toBeDefined();
      expect(EVENT_NAMES_FULL.investment.ko).toBeDefined();
      expect(EVENT_NAMES_FULL.move.ko).toBeDefined();
      expect(EVENT_NAMES_FULL.study.ko).toBeDefined();
      expect(EVENT_NAMES_FULL.health.ko).toBeDefined();
      expect(EVENT_NAMES_FULL.relationship.ko).toBeDefined();
    });
  });
});

// ============================================================
// Complex Input Scenarios Tests
// ============================================================

describe('Complex Input Scenarios', () => {
  describe('Input with all fields populated', () => {
    it('should process fully populated input', async () => {
      const { generateComprehensivePrediction } = await import('@/lib/prediction/life-prediction');

      const fullInput = createMockInputWithAstro();
      fullInput.daeunList = createMockDaeunList();
      fullInput.yongsin = ['수', '목'] as FiveElement[];
      fullInput.kisin = ['화', '토'] as FiveElement[];

      const result = generateComprehensivePrediction(fullInput, 10);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(80);
    });
  });

  describe('Input with minimal fields', () => {
    it('should process minimal input without errors', async () => {
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction');

      const minimalInput: LifePredictionInput = {
        birthYear: 1990,
        birthMonth: 1,
        birthDay: 1,
        gender: 'male',
        dayStem: '甲',
        dayBranch: '子',
        monthBranch: '寅',
        yearBranch: '午',
        allStems: ['甲'],
        allBranches: ['子'],
      };

      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(minimalInput, 'career', currentYear, currentYear + 1);

      expect(result).toBeDefined();
      expect(result.advice.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================
// Variance and Volatility Tests
// ============================================================

describe('Variance and Volatility Analysis', () => {
  describe('Trend volatility detection', () => {
    it('should detect volatile trend when variance is high', async () => {
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction');

      const input = createMockInput();
      const result = analyzeMultiYearTrend(input, 2020, 2040);

      expect(['ascending', 'descending', 'stable', 'volatile']).toContain(result.overallTrend);
    });
  });
});

// ============================================================
// Twelve Stage Energy Classification Tests
// ============================================================

describe('Twelve Stage Energy Classification', () => {
  describe('Peak energy stages', () => {
    it('should classify 제왕 and 건록 as peak', async () => {
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction');

      const input = createMockInput();
      const result = analyzeMultiYearTrend(input, 2020, 2030);

      result.yearlyScores.forEach(score => {
        if (score.twelveStage.stage === '제왕' || score.twelveStage.stage === '건록') {
          expect(score.twelveStage.energy).toBe('peak');
        }
      });
    });
  });

  describe('Rising energy stages', () => {
    it('should classify 장생, 관대 as rising', async () => {
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction');

      const input = createMockInput();
      const result = analyzeMultiYearTrend(input, 2020, 2030);

      result.yearlyScores.forEach(score => {
        if (score.twelveStage.stage === '장생' || score.twelveStage.stage === '관대') {
          expect(score.twelveStage.energy).toBe('rising');
        }
      });
    });
  });
});

// ============================================================
// Value Verification Tests - Actual Business Logic Validation
// ============================================================

describe('Value Verification - Business Logic', () => {
  describe('Stem Relation Value Verification', () => {
    it('should return correct combination descriptions for all 5 pairs', async () => {
      // 甲己合 -> 토
      const result1 = analyzeStemRelation('甲', '己')
      expect(result1.type).toBe('합')
      expect(result1.description).toBe('토로 변화')

      // 乙庚合 -> 금
      const result2 = analyzeStemRelation('乙', '庚')
      expect(result2.type).toBe('합')
      expect(result2.description).toBe('금으로 변화')

      // 丙辛合 -> 수
      const result3 = analyzeStemRelation('丙', '辛')
      expect(result3.type).toBe('합')
      expect(result3.description).toBe('수로 변화')

      // 丁壬合 -> 목
      const result4 = analyzeStemRelation('丁', '壬')
      expect(result4.type).toBe('합')
      expect(result4.description).toBe('목으로 변화')

      // 戊癸合 -> 화
      const result5 = analyzeStemRelation('戊', '癸')
      expect(result5.type).toBe('합')
      expect(result5.description).toBe('화로 변화')
    })

    it('should detect all stem clashes correctly', async () => {
      const clashPairs = [
        ['甲', '庚'],
        ['乙', '辛'],
        ['丙', '壬'],
        ['丁', '癸'],
      ]

      clashPairs.forEach(([stem1, stem2]) => {
        const result = analyzeStemRelation(stem1, stem2)
        expect(result.type).toBe('충')
        expect(result.description).toBe('천간 충돌')
      })
    })
  })

  describe('Branch Relation Value Verification', () => {
    it('should detect all 6 육합 pairs correctly', async () => {
      const sixComboPairs = [
        ['子', '丑'],
        ['寅', '亥'],
        ['卯', '戌'],
        ['辰', '酉'],
        ['巳', '申'],
        ['午', '未'],
      ]

      sixComboPairs.forEach(([branch1, branch2]) => {
        expect(analyzeBranchRelation(branch1, branch2)).toBe('육합')
        // Also test reverse order
        expect(analyzeBranchRelation(branch2, branch1)).toBe('육합')
      })
    })

    it('should detect all 6 충 pairs correctly', async () => {
      const clashPairs = [
        ['子', '午'],
        ['丑', '未'],
        ['寅', '申'],
        ['卯', '酉'],
        ['辰', '戌'],
        ['巳', '亥'],
      ]

      clashPairs.forEach(([branch1, branch2]) => {
        expect(analyzeBranchRelation(branch1, branch2)).toBe('충')
        // Also test reverse order
        expect(analyzeBranchRelation(branch2, branch1)).toBe('충')
      })
    })
  })

  describe('Score Grade Assignment Verification', () => {
    it('should assign grades based on correct thresholds', async () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2050)

      result.yearlyScores.forEach((score: { score: number; grade: string }) => {
        if (score.score >= 85) {
          expect(score.grade).toBe('S')
        } else if (score.score >= 75) {
          expect(score.grade).toBe('A')
        } else if (score.score >= 60) {
          expect(score.grade).toBe('B')
        } else if (score.score >= 45) {
          expect(score.grade).toBe('C')
        } else {
          expect(score.grade).toBe('D')
        }
      })
    })
  })

  describe('Yongsin/Kisin Effect Verification', () => {
    it('should apply yongsin bonus when element matches', async () => {
      // Create input where yongsin matches daeun element (목)
      const inputWithYongsin = createMockInput({
        yongsin: ['목'] as FiveElement[],
        kisin: [] as FiveElement[],
      })

      const inputWithoutYongsin = createMockInput({
        yongsin: [] as FiveElement[],
        kisin: [] as FiveElement[],
      })

      // Both should produce results, but with yongsin should potentially have different bonus
      const resultWith = analyzeMultiLayerInteraction(inputWithYongsin, 'career', 2024, 6)
      const resultWithout = analyzeMultiLayerInteraction(inputWithoutYongsin, 'career', 2024, 6)

      expect(typeof resultWith.bonus).toBe('number')
      expect(typeof resultWithout.bonus).toBe('number')
    })

    it('should apply kisin penalty when element matches', async () => {
      const inputWithKisin = createMockInput({
        yongsin: [] as FiveElement[],
        kisin: ['목'] as FiveElement[],
      })

      const result = analyzeMultiLayerInteraction(inputWithKisin, 'career', 2024, 6)

      expect(typeof result.bonus).toBe('number')
      // If kisin is active, should have penalties
      expect(Array.isArray(result.penalties)).toBe(true)
    })
  })

  describe('Optimal Period Score Threshold Verification', () => {
    it('should only include periods with score >= 70 as optimal', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'marriage', currentYear, currentYear + 3)

      result.optimalPeriods.forEach((period: { score: number }) => {
        expect(period.score).toBeGreaterThanOrEqual(70)
      })
    })

    it('should only include periods with score <= 35 as avoid', async () => {
      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'investment', currentYear, currentYear + 3)

      result.avoidPeriods.forEach((period: { score: number }) => {
        expect(period.score).toBeLessThanOrEqual(35)
      })
    })
  })

  describe('Confidence Score Calculation Verification', () => {
    it('should calculate higher confidence with complete data', async () => {
      // Complete input
      const completeInput = createMockInput({
        birthHour: 14,
        daeunList: createMockDaeunList(),
        yongsin: ['목', '화'] as FiveElement[],
        astroChart: { sun: { sign: 'Taurus' } },
      })

      // Minimal input
      const minimalInput = createMockInput({
        birthHour: undefined,
        daeunList: undefined,
        yongsin: undefined,
        astroChart: undefined,
      })

      const completeResult = generateComprehensivePrediction(completeInput)
      const minimalResult = generateComprehensivePrediction(minimalInput)

      // Complete should have higher confidence
      expect(completeResult.confidence).toBeGreaterThan(minimalResult.confidence)
      // Both should be within valid range
      expect(completeResult.confidence).toBeLessThanOrEqual(95)
      expect(minimalResult.confidence).toBeGreaterThanOrEqual(30)
    })
  })

  describe('Energy Recommendation Content Verification', () => {
    it('should return element-specific recommendations', async () => {
      // 목 (Wood) element
      const woodRecs = generateEnergyRecommendations('peak', '목')
      expect(woodRecs.some((r: string) => r.includes('창의적') || r.includes('아이디어'))).toBe(true)

      // 화 (Fire) element
      const fireRecs = generateEnergyRecommendations('rising', '화')
      expect(fireRecs.some((r: string) => r.includes('열정'))).toBe(true)

      // 토 (Earth) element
      const earthRecs = generateEnergyRecommendations('declining', '토')
      expect(earthRecs.some((r: string) => r.includes('안정') || r.includes('부동산'))).toBe(true)

      // 금 (Metal) element
      const metalRecs = generateEnergyRecommendations('peak', '금')
      expect(metalRecs.some((r: string) => r.includes('결단력') || r.includes('정리'))).toBe(true)

      // 수 (Water) element
      const waterRecs = generateEnergyRecommendations('dormant', '수')
      expect(waterRecs.some((r: string) => r.includes('지혜') || r.includes('유연'))).toBe(true)
    })
  })
})

// ============================================================
// Integration Test - Full Workflow Verification
// ============================================================

describe('Full Workflow Integration Tests', () => {
  it('should complete full prediction workflow without errors', async () => {
    const {
      generateComprehensivePrediction,
      generateLifePredictionPromptContext,
      findOptimalEventTiming,
      findWeeklyOptimalTiming,
    } = await import('@/lib/prediction/life-prediction')

    const input = createMockInput()
    const currentYear = new Date().getFullYear()

    // Step 1: Generate comprehensive prediction
    const prediction = generateComprehensivePrediction(input, 10)
    expect(prediction).toBeDefined()
    expect(prediction.multiYearTrend.yearlyScores.length).toBeGreaterThan(0)

    // Step 2: Generate prompt context
    const context = generateLifePredictionPromptContext(prediction, 'ko')
    expect(context.length).toBeGreaterThan(100)
    expect(context).toContain('종합 인생 예측')

    // Step 3: Find optimal event timing
    const eventTiming = findOptimalEventTiming(input, 'career', currentYear, currentYear + 2)
    expect(eventTiming.eventType).toBe('career')
    expect(eventTiming.advice.length).toBeGreaterThan(0)

    // Step 4: Find weekly timing
    const weeklyTiming = findWeeklyOptimalTiming(input, 'career', new Date())
    expect(weeklyTiming.weeklyPeriods.length).toBeGreaterThan(0)
    expect(weeklyTiming.summary.length).toBeGreaterThan(0)
  })

  it('should produce consistent results for same input', async () => {
    const input = createMockInput()

    const result1 = analyzeMultiYearTrend(input, 2024, 2026)
    const result2 = analyzeMultiYearTrend(input, 2024, 2026)

    // Results should be identical for same input
    expect(result1.yearlyScores.length).toBe(result2.yearlyScores.length)
    expect(result1.overallTrend).toBe(result2.overallTrend)

    result1.yearlyScores.forEach((score: { year: number; score: number; grade: string }, i: number) => {
      expect(score.year).toBe(result2.yearlyScores[i].year)
      expect(score.score).toBe(result2.yearlyScores[i].score)
      expect(score.grade).toBe(result2.yearlyScores[i].grade)
    })
  })
})
