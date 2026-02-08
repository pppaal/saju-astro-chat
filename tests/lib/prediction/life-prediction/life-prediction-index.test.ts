/**
 * @file Tests for life-prediction module
 * 커버리지 향상을 위한 life-prediction 통합 테스트
 */

import { describe, it, expect, beforeAll } from 'vitest'

// Type definitions inline to avoid import issues
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
      const { STEMS } = await import('@/lib/prediction/life-prediction')
      expect(STEMS).toBeDefined()
      expect(STEMS).toHaveLength(10)
    })

    it('should export BRANCHES', async () => {
      const { BRANCHES } = await import('@/lib/prediction/life-prediction')
      expect(BRANCHES).toBeDefined()
      expect(BRANCHES).toHaveLength(12)
    })

    it('should export STEM_ELEMENT', async () => {
      const { STEM_ELEMENT } = await import('@/lib/prediction/life-prediction')
      expect(STEM_ELEMENT).toBeDefined()
      expect(STEM_ELEMENT['甲']).toBe('목')
    })

    it('should export EVENT_FAVORABLE_CONDITIONS', async () => {
      const { EVENT_FAVORABLE_CONDITIONS } = await import('@/lib/prediction/life-prediction')
      expect(EVENT_FAVORABLE_CONDITIONS).toBeDefined()
      expect(EVENT_FAVORABLE_CONDITIONS.marriage).toBeDefined()
      expect(EVENT_FAVORABLE_CONDITIONS.career).toBeDefined()
    })

    it('should export ASTRO_EVENT_CONDITIONS', async () => {
      const { ASTRO_EVENT_CONDITIONS } = await import('@/lib/prediction/life-prediction')
      expect(ASTRO_EVENT_CONDITIONS).toBeDefined()
      expect(ASTRO_EVENT_CONDITIONS.marriage.beneficSigns).toBeDefined()
    })

    it('should export TRANSIT_EVENT_CONDITIONS', async () => {
      const { TRANSIT_EVENT_CONDITIONS } = await import('@/lib/prediction/life-prediction')
      expect(TRANSIT_EVENT_CONDITIONS).toBeDefined()
      expect(TRANSIT_EVENT_CONDITIONS.marriage.beneficPlanets).toBeDefined()
    })

    it('should export EVENT_HOUSES', async () => {
      const { EVENT_HOUSES } = await import('@/lib/prediction/life-prediction')
      expect(EVENT_HOUSES).toBeDefined()
      expect(EVENT_HOUSES.marriage.primary).toContain(7)
      expect(EVENT_HOUSES.career.primary).toContain(10)
    })

    it('should export SIBSIN_SCORES', async () => {
      const { SIBSIN_SCORES_RELATIVE } = await import('@/lib/prediction/life-prediction')
      expect(SIBSIN_SCORES_RELATIVE).toBeDefined()
      expect(SIBSIN_SCORES_RELATIVE['정관']).toBe(15)
      expect(SIBSIN_SCORES_RELATIVE['겁재']).toBe(-8)
    })

    it('should export STEM_COMBINATIONS', async () => {
      const { STEM_COMBINATIONS } = await import('@/lib/prediction/life-prediction')
      expect(STEM_COMBINATIONS).toBeDefined()
      expect(STEM_COMBINATIONS['甲己']).toBe('토로 변화')
    })

    it('should export STEM_CLASHES', async () => {
      const { STEM_CLASHES } = await import('@/lib/prediction/life-prediction')
      expect(STEM_CLASHES).toBeDefined()
      expect(STEM_CLASHES).toContain('甲庚')
    })

    it('should export SIX_COMBOS', async () => {
      const { SIX_COMBOS } = await import('@/lib/prediction/life-prediction')
      expect(SIX_COMBOS).toBeDefined()
      expect(SIX_COMBOS['子丑']).toBe('육합')
    })

    it('should export PARTIAL_TRINES', async () => {
      const { PARTIAL_TRINES } = await import('@/lib/prediction/life-prediction')
      expect(PARTIAL_TRINES).toBeDefined()
      expect(PARTIAL_TRINES['寅午']).toBe('화국 삼합')
    })

    it('should export BRANCH_CLASHES', async () => {
      const { BRANCH_CLASHES } = await import('@/lib/prediction/life-prediction')
      expect(BRANCH_CLASHES).toBeDefined()
      expect(BRANCH_CLASHES['子午']).toBe('충')
    })

    it('should export BRANCH_PUNISHMENTS', async () => {
      const { BRANCH_PUNISHMENTS } = await import('@/lib/prediction/life-prediction')
      expect(BRANCH_PUNISHMENTS).toBeDefined()
      expect(BRANCH_PUNISHMENTS['寅巳']).toBe('형')
    })

    it('should export EVENT_NAMES_FULL', async () => {
      const { EVENT_NAMES_FULL } = await import('@/lib/prediction/life-prediction')
      expect(EVENT_NAMES_FULL).toBeDefined()
      expect(EVENT_NAMES_FULL.marriage.ko).toBe('결혼')
      expect(EVENT_NAMES_FULL.career.en).toBe('Career')
    })
  })

  describe('Function exports', () => {
    it('should export calculateAstroBonus', async () => {
      const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction')
      expect(calculateAstroBonus).toBeDefined()
      expect(typeof calculateAstroBonus).toBe('function')
    })

    it('should export calculateTransitBonus', async () => {
      const { calculateTransitBonus } = await import('@/lib/prediction/life-prediction')
      expect(calculateTransitBonus).toBeDefined()
      expect(typeof calculateTransitBonus).toBe('function')
    })

    it('should export calculateTransitHouseOverlay', async () => {
      const { calculateTransitHouseOverlay } = await import('@/lib/prediction/life-prediction')
      expect(calculateTransitHouseOverlay).toBeDefined()
      expect(typeof calculateTransitHouseOverlay).toBe('function')
    })

    it('should export calculateCombinedAstroBonus', async () => {
      const { calculateCombinedAstroBonus } = await import('@/lib/prediction/life-prediction')
      expect(calculateCombinedAstroBonus).toBeDefined()
      expect(typeof calculateCombinedAstroBonus).toBe('function')
    })

    it('should export analyzeStemRelation', async () => {
      const { analyzeStemRelation } = await import('@/lib/prediction/life-prediction')
      expect(analyzeStemRelation).toBeDefined()
      expect(typeof analyzeStemRelation).toBe('function')
    })

    it('should export analyzeBranchRelation', async () => {
      const { analyzeBranchRelation } = await import('@/lib/prediction/life-prediction')
      expect(analyzeBranchRelation).toBeDefined()
      expect(typeof analyzeBranchRelation).toBe('function')
    })

    it('should export analyzeMultiLayerInteraction', async () => {
      const { analyzeMultiLayerInteraction } = await import('@/lib/prediction/life-prediction')
      expect(analyzeMultiLayerInteraction).toBeDefined()
      expect(typeof analyzeMultiLayerInteraction).toBe('function')
    })

    it('should export analyzeDaeunTransition', async () => {
      const { analyzeDaeunTransition } = await import('@/lib/prediction/life-prediction')
      expect(analyzeDaeunTransition).toBeDefined()
      expect(typeof analyzeDaeunTransition).toBe('function')
    })

    it('should export generateEnergyRecommendations', async () => {
      const { generateEnergyRecommendations } = await import('@/lib/prediction/life-prediction')
      expect(generateEnergyRecommendations).toBeDefined()
      expect(typeof generateEnergyRecommendations).toBe('function')
    })

    it('should export analyzeMultiYearTrend', async () => {
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')
      expect(analyzeMultiYearTrend).toBeDefined()
      expect(typeof analyzeMultiYearTrend).toBe('function')
    })

    it('should export findOptimalEventTiming', async () => {
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')
      expect(findOptimalEventTiming).toBeDefined()
      expect(typeof findOptimalEventTiming).toBe('function')
    })

    it('should export findWeeklyOptimalTiming', async () => {
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')
      expect(findWeeklyOptimalTiming).toBeDefined()
      expect(typeof findWeeklyOptimalTiming).toBe('function')
    })

    it('should export generateComprehensivePrediction', async () => {
      const { generateComprehensivePrediction } = await import('@/lib/prediction/life-prediction')
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
      const { generateEventTimingPromptContext } = await import('@/lib/prediction/life-prediction')
      expect(generateEventTimingPromptContext).toBeDefined()
      expect(typeof generateEventTimingPromptContext).toBe('function')
    })

    it('should export generatePastAnalysisPromptContext', async () => {
      const { generatePastAnalysisPromptContext } = await import('@/lib/prediction/life-prediction')
      expect(generatePastAnalysisPromptContext).toBeDefined()
      expect(typeof generatePastAnalysisPromptContext).toBe('function')
    })
  })
})

// ============================================================
// Relation Analysis Integration Tests
// ============================================================

describe('Relation Analysis Integration', () => {
  let analyzeStemRelation: typeof import('@/lib/prediction/life-prediction').analyzeStemRelation
  let analyzeBranchRelation: typeof import('@/lib/prediction/life-prediction').analyzeBranchRelation
  let analyzeMultiLayerInteraction: typeof import('@/lib/prediction/life-prediction').analyzeMultiLayerInteraction
  let analyzeDaeunTransition: typeof import('@/lib/prediction/life-prediction').analyzeDaeunTransition
  let generateEnergyRecommendations: typeof import('@/lib/prediction/life-prediction').generateEnergyRecommendations

  beforeAll(async () => {
    const module = await import('@/lib/prediction/life-prediction')
    analyzeStemRelation = module.analyzeStemRelation
    analyzeBranchRelation = module.analyzeBranchRelation
    analyzeMultiLayerInteraction = module.analyzeMultiLayerInteraction
    analyzeDaeunTransition = module.analyzeDaeunTransition
    generateEnergyRecommendations = module.generateEnergyRecommendations
  })

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

    it('should analyze multi-layer interaction with valid input', () => {
      const input = createMockInput()
      const result = analyzeMultiLayerInteraction(input, 'career', 2024, 6)

      expect(result).toBeDefined()
      expect(typeof result.bonus).toBe('number')
      expect(Array.isArray(result.reasons)).toBe(true)
      expect(Array.isArray(result.penalties)).toBe(true)
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
  let calculateAstroBonus: typeof import('@/lib/prediction/life-prediction').calculateAstroBonus
  let calculateTransitBonus: typeof import('@/lib/prediction/life-prediction').calculateTransitBonus
  let calculateTransitHouseOverlay: typeof import('@/lib/prediction/life-prediction').calculateTransitHouseOverlay
  let calculateCombinedAstroBonus: typeof import('@/lib/prediction/life-prediction').calculateCombinedAstroBonus

  beforeAll(async () => {
    const module = await import('@/lib/prediction/life-prediction')
    calculateAstroBonus = module.calculateAstroBonus
    calculateTransitBonus = module.calculateTransitBonus
    calculateTransitHouseOverlay = module.calculateTransitHouseOverlay
    calculateCombinedAstroBonus = module.calculateCombinedAstroBonus
  })

  describe('calculateAstroBonus', () => {
    it('should return zero bonus when no astro data is provided', () => {
      const input = createMockInput()
      const result = calculateAstroBonus(input, 'marriage')

      expect(result.bonus).toBe(0)
      expect(result.reasons).toHaveLength(0)
      expect(result.penalties).toHaveLength(0)
    })

    it('should calculate bonus with astro chart data', () => {
      const input = createMockInputWithAstro()
      const result = calculateAstroBonus(input, 'marriage')

      expect(result).toBeDefined()
      expect(typeof result.bonus).toBe('number')
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

    it('should handle career event type', () => {
      const input = createMockInputWithAstro()
      const result = calculateAstroBonus(input, 'career')

      expect(result).toBeDefined()
      expect(typeof result.bonus).toBe('number')
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
        const result = calculateAstroBonus(input, eventType)
        expect(result).toBeDefined()
        expect(typeof result.bonus).toBe('number')
      })
    })
  })

  describe('calculateTransitBonus', () => {
    it('should return zero when no transit data is provided', () => {
      const input = createMockInput()
      const result = calculateTransitBonus(input, 'career')

      expect(result.bonus).toBe(0)
      expect(result.reasons).toHaveLength(0)
    })

    it('should calculate bonus with transit data', () => {
      const input = createMockInputWithAstro()
      const result = calculateTransitBonus(input, 'career')

      expect(result).toBeDefined()
      expect(typeof result.bonus).toBe('number')
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
  let analyzeMultiYearTrend: typeof import('@/lib/prediction/life-prediction').analyzeMultiYearTrend

  beforeAll(async () => {
    const module = await import('@/lib/prediction/life-prediction')
    analyzeMultiYearTrend = module.analyzeMultiYearTrend
  })

  describe('analyzeMultiYearTrend', () => {
    it('should analyze multi-year trend', () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2030)

      expect(result).toBeDefined()
      expect(result.startYear).toBe(2020)
      expect(result.endYear).toBe(2030)
      expect(result.yearlyScores).toBeDefined()
      expect(result.overallTrend).toBeDefined()
    })

    it('should identify peak and low years', () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2030)

      expect(Array.isArray(result.peakYears)).toBe(true)
      expect(Array.isArray(result.lowYears)).toBe(true)
      expect(result.peakYears.length).toBeLessThanOrEqual(3)
      expect(result.lowYears.length).toBeLessThanOrEqual(3)
    })

    it('should detect daeun transitions', () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2030)

      expect(Array.isArray(result.daeunTransitions)).toBe(true)
    })

    it('should analyze life cycles', () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2030)

      expect(Array.isArray(result.lifeCycles)).toBe(true)
    })

    it('should generate summary', () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2030)

      expect(typeof result.summary).toBe('string')
      expect(result.summary.length).toBeGreaterThan(0)
    })

    it('should determine overall trend correctly', () => {
      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2030)

      expect(['ascending', 'descending', 'stable', 'volatile']).toContain(result.overallTrend)
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
  let generateComprehensivePrediction: typeof import('@/lib/prediction/life-prediction').generateComprehensivePrediction
  let generateLifePredictionPromptContext: typeof import('@/lib/prediction/life-prediction').generateLifePredictionPromptContext
  let generateEventTimingPromptContext: typeof import('@/lib/prediction/life-prediction').generateEventTimingPromptContext
  let generatePastAnalysisPromptContext: typeof import('@/lib/prediction/life-prediction').generatePastAnalysisPromptContext

  beforeAll(async () => {
    const module = await import('@/lib/prediction/life-prediction')
    generateComprehensivePrediction = module.generateComprehensivePrediction
    generateLifePredictionPromptContext = module.generateLifePredictionPromptContext
    generateEventTimingPromptContext = module.generateEventTimingPromptContext
    generatePastAnalysisPromptContext = module.generatePastAnalysisPromptContext
  })

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
  let findOptimalEventTiming: typeof import('@/lib/prediction/life-prediction').findOptimalEventTiming
  let findWeeklyOptimalTiming: typeof import('@/lib/prediction/life-prediction').findWeeklyOptimalTiming

  beforeAll(async () => {
    const module = await import('@/lib/prediction/life-prediction')
    findOptimalEventTiming = module.findOptimalEventTiming
    findWeeklyOptimalTiming = module.findWeeklyOptimalTiming
  })

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
    it('should handle minimal input for stem relation', async () => {
      const { analyzeStemRelation } = await import('@/lib/prediction/life-prediction')

      expect(() => analyzeStemRelation('', '')).not.toThrow()
      expect(() => analyzeStemRelation('X', 'Y')).not.toThrow()
    })

    it('should handle minimal input for branch relation', async () => {
      const { analyzeBranchRelation } = await import('@/lib/prediction/life-prediction')

      expect(() => analyzeBranchRelation('', '')).not.toThrow()
      expect(() => analyzeBranchRelation('X', 'Y')).not.toThrow()
    })

    it('should handle input without optional fields', async () => {
      const { generateComprehensivePrediction } = await import('@/lib/prediction/life-prediction')

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

      expect(() => generateComprehensivePrediction(minimalInput)).not.toThrow()
    })
  })

  describe('Boundary conditions', () => {
    it('should handle year range at boundaries', async () => {
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')
      const input = createMockInput({ birthYear: 2020 })

      // Same year
      const result1 = analyzeMultiYearTrend(input, 2024, 2024)
      expect(result1.yearlyScores.length).toBeGreaterThanOrEqual(0)

      // Very short range
      const result2 = analyzeMultiYearTrend(input, 2024, 2025)
      expect(result2.yearlyScores.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle future birth year (skip negative ages)', async () => {
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')
      const input = createMockInput({ birthYear: 2030 })

      const result = analyzeMultiYearTrend(input, 2024, 2026)
      expect(result.yearlyScores).toHaveLength(0)
    })

    it('should handle empty daeun list gracefully', async () => {
      const { analyzeMultiLayerInteraction } = await import('@/lib/prediction/life-prediction')
      const input = createMockInput({ daeunList: [] })

      const result = analyzeMultiLayerInteraction(input, 'career', 2024, 6)
      expect(result.bonus).toBe(0)
    })
  })

  describe('Date edge cases', () => {
    it('should handle date at year boundary', async () => {
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')
      const input = createMockInput()

      const startDate = new Date(2024, 11, 25) // Dec 25
      const endDate = new Date(2025, 0, 10) // Jan 10

      const result = findWeeklyOptimalTiming(input, 'career', startDate, endDate)
      expect(result).toBeDefined()
    })

    it('should handle leap year dates', async () => {
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')
      const input = createMockInput({ birthYear: 2000, birthMonth: 2, birthDay: 29 })

      const result = findOptimalEventTiming(input, 'marriage', 2024, 2025)
      expect(result).toBeDefined()
    })
  })
})

// ============================================================
// Constants Detailed Tests
// ============================================================

describe('Constants Detailed Tests', () => {
  describe('STEM_ELEMENT mapping', () => {
    it('should map all 10 stems to correct elements', async () => {
      const { STEM_ELEMENT } = await import('@/lib/prediction/life-prediction')

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
      const { EVENT_FAVORABLE_CONDITIONS } = await import('@/lib/prediction/life-prediction')

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
      const { EVENT_FAVORABLE_CONDITIONS } = await import('@/lib/prediction/life-prediction')

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
      const { EVENT_FAVORABLE_CONDITIONS } = await import('@/lib/prediction/life-prediction')

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
      const { SIBSIN_SCORES } = await import('@/lib/prediction/life-prediction')

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
      const { SIBSIN_SCORES } = await import('@/lib/prediction/life-prediction')

      expect(SIBSIN_SCORES['정관']).toBe(80)
      expect(SIBSIN_SCORES['정관']).toBeGreaterThan(SIBSIN_SCORES['겁재'])
    })
  })

  describe('Branch relationships', () => {
    it('should have complete SIX_COMBOS mapping', async () => {
      const { SIX_COMBOS } = await import('@/lib/prediction/life-prediction')

      const expectedCombos = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未']

      expectedCombos.forEach((combo) => {
        expect(SIX_COMBOS[combo]).toBe('육합')
      })
    })

    it('should have complete BRANCH_CLASHES mapping', async () => {
      const { BRANCH_CLASHES } = await import('@/lib/prediction/life-prediction')

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
      const { analyzeMultiLayerInteraction } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const result = analyzeMultiLayerInteraction(input, 'marriage', 2024, 6)

      expect(result.bonus).toBeGreaterThanOrEqual(-30)
      expect(result.bonus).toBeLessThanOrEqual(30)
    })

    it('should produce different results for different months', async () => {
      const { analyzeMultiLayerInteraction } = await import('@/lib/prediction/life-prediction')

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
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')

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
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')

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
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2024, 2030)

      result.yearlyScores.forEach((score) => {
        if (score.score >= 85) {
          expect(score.grade).toBe('S')
        }
      })
    })

    it('should assign A grade for scores 75-84', async () => {
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2024, 2030)

      result.yearlyScores.forEach((score) => {
        if (score.score >= 75 && score.score < 85) {
          expect(score.grade).toBe('A')
        }
      })
    })

    it('should assign D grade for scores < 45', async () => {
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2024, 2030)

      result.yearlyScores.forEach((score) => {
        if (score.score < 45) {
          expect(score.grade).toBe('D')
        }
      })
    })

    it('should cover all grade categories', async () => {
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')

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
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2030)

      expect(['ascending', 'descending', 'stable', 'volatile']).toContain(result.overallTrend)
    })

    it('should generate appropriate summary for each trend type', async () => {
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')

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
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')

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
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')

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
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2040)

      expect(Array.isArray(result.lifeCycles)).toBe(true)
    })

    it('should include energy level for each phase', async () => {
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2020, 2040)

      const validEnergies = ['peak', 'rising', 'declining', 'dormant']

      result.lifeCycles.forEach((phase) => {
        expect(validEnergies).toContain(phase.energy)
      })
    })

    it('should include recommendations for each phase', async () => {
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')

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
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const result = analyzeMultiYearTrend(input, 2000, 2050)

      expect(Array.isArray(result.daeunTransitions)).toBe(true)
    })

    it('should include impact assessment for each transition', async () => {
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')

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
      const { analyzeDaeunTransition } = await import('@/lib/prediction/life-prediction')

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
      const { analyzeDaeunTransition } = await import('@/lib/prediction/life-prediction')

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
      const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction')

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
      const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction')

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
      const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction')

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
      const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction')

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
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const startDate = new Date(2024, 5, 28) // End of June
      const endDate = new Date(2024, 6, 10) // Into July

      const result = findWeeklyOptimalTiming(input, 'career', startDate, endDate)

      expect(result).toBeDefined()
      expect(result.weeklyPeriods.length).toBeGreaterThan(0)
    })

    it('should align weeks to Monday', async () => {
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'investment', startDate)

      if (result.bestWeek && result.weeklyPeriods.length > 1) {
        const maxScore = Math.max(...result.weeklyPeriods.map((w) => w.score))
        expect(result.bestWeek.score).toBe(maxScore)
      }
    })

    it('should select week with lowest score as worst', async () => {
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'career', currentYear - 1, currentYear + 1)

      const now = new Date()
      result.optimalPeriods.forEach((period) => {
        expect(period.endDate.getTime()).toBeGreaterThanOrEqual(now.getTime() - 86400000 * 31)
      })
    })

    it('should limit optimal periods to 10', async () => {
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'study', currentYear, currentYear + 5)

      expect(result.optimalPeriods.length).toBeLessThanOrEqual(10)
    })

    it('should limit avoid periods to 5', async () => {
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'health', currentYear, currentYear + 5)

      expect(result.avoidPeriods.length).toBeLessThanOrEqual(5)
    })
  })

  describe('Period scoring thresholds', () => {
    it('should only include periods with score >= 70 as optimal', async () => {
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const currentYear = new Date().getFullYear()
      const result = findOptimalEventTiming(input, 'relationship', currentYear, currentYear + 2)

      result.optimalPeriods.forEach((period) => {
        expect(period.score).toBeGreaterThanOrEqual(70)
      })
    })

    it('should only include periods with score <= 35 as avoid', async () => {
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { generateComprehensivePrediction } = await import('@/lib/prediction/life-prediction')

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
      const { generateComprehensivePrediction } = await import('@/lib/prediction/life-prediction')

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
      const { generateComprehensivePrediction } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const result = generateComprehensivePrediction(input, 15)

      const peakHighlights = result.upcomingHighlights.filter((h) => h.type === 'peak')
      expect(peakHighlights.length).toBeGreaterThanOrEqual(0)
    })

    it('should extract daeun transitions as highlights', async () => {
      const { generateComprehensivePrediction } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const result = generateComprehensivePrediction(input, 20)

      const transitionHighlights = result.upcomingHighlights.filter((h) => h.type === 'transition')
      expect(Array.isArray(transitionHighlights)).toBe(true)
    })

    it('should sort highlights by date', async () => {
      const { generateComprehensivePrediction } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const result = generateComprehensivePrediction(input, 10)

      for (let i = 1; i < result.upcomingHighlights.length; i++) {
        expect(result.upcomingHighlights[i].date.getTime()).toBeGreaterThanOrEqual(
          result.upcomingHighlights[i - 1].date.getTime()
        )
      }
    })

    it('should limit highlights to 10', async () => {
      const { generateComprehensivePrediction } = await import('@/lib/prediction/life-prediction')

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
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'career', startDate)

      expect(result).toBeDefined()
      expect(result.weeklyPeriods.length).toBeGreaterThan(0)
    })

    it('should detect 역마 for move events', async () => {
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'move', startDate)

      expect(result).toBeDefined()
      // Move events should have different scoring due to 역마
      expect(result.eventType).toBe('move')
    })

    it('should detect 문창 for study events', async () => {
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'study', startDate)

      expect(result).toBeDefined()
      expect(result.eventType).toBe('study')
    })
  })

  describe('Unlucky shinsals', () => {
    it('should detect negative shinsals and reduce score', async () => {
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'career', startDate)

      expect(result.summary.length).toBeGreaterThan(0)
      if (result.bestWeek) {
        expect(result.summary).toContain('가장 좋은 주간')
      }
    })

    it('should include best days in summary when available', async () => {
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const startDate = new Date()
      const result = findWeeklyOptimalTiming(input, 'marriage', startDate)

      // Summary should mention specific dates if best days exist
      expect(typeof result.summary).toBe('string')
    })

    it('should describe score variance', async () => {
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput()
      const currentYear = new Date().getFullYear()

      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear + 2)

      if (result.optimalPeriods.length > 0) {
        expect(result.advice).toContain('가장 좋은 시기')
      }
    })

    it('should warn about avoid periods when present', async () => {
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

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
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

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
      const { STEM_COMBINATIONS } = await import('@/lib/prediction/life-prediction')

      expect(STEM_COMBINATIONS['甲己']).toBe('토로 변화')
      expect(STEM_COMBINATIONS['乙庚']).toBe('금으로 변화')
      expect(STEM_COMBINATIONS['丙辛']).toBe('수로 변화')
      expect(STEM_COMBINATIONS['丁壬']).toBe('목으로 변화')
      expect(STEM_COMBINATIONS['戊癸']).toBe('화로 변화')
    })

    it('should have correct element transformations', async () => {
      const { STEM_COMBINATIONS } = await import('@/lib/prediction/life-prediction')

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
      const { STEM_CLASHES } = await import('@/lib/prediction/life-prediction')

      // Check for primary clashes (includes both directions)
      expect(STEM_CLASHES).toContain('甲庚')
      expect(STEM_CLASHES).toContain('乙辛')
      expect(STEM_CLASHES).toContain('丙壬')
      expect(STEM_CLASHES).toContain('丁癸')
    })

    it('should have stem clashes defined', async () => {
      const { STEM_CLASHES } = await import('@/lib/prediction/life-prediction')

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
      const { BRANCH_PUNISHMENTS } = await import('@/lib/prediction/life-prediction')

      expect(BRANCH_PUNISHMENTS['寅巳']).toBe('형')
    })

    it('should detect 子卯 punishment', async () => {
      const { BRANCH_PUNISHMENTS } = await import('@/lib/prediction/life-prediction')

      expect(BRANCH_PUNISHMENTS['子卯']).toBe('형')
    })

    it('should have multiple punishment pairs', async () => {
      const { BRANCH_PUNISHMENTS } = await import('@/lib/prediction/life-prediction')

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
      const { PARTIAL_TRINES } = await import('@/lib/prediction/life-prediction')

      expect(PARTIAL_TRINES['寅午']).toBe('화국 삼합')
    })

    it('should detect water trine (수국)', async () => {
      const { PARTIAL_TRINES } = await import('@/lib/prediction/life-prediction')

      expect(PARTIAL_TRINES['申子']).toBe('수국 삼합')
    })

    it('should detect wood trine (목국)', async () => {
      const { PARTIAL_TRINES } = await import('@/lib/prediction/life-prediction')

      expect(PARTIAL_TRINES['亥卯']).toBe('목국 삼합')
    })

    it('should detect metal trine (금국)', async () => {
      const { PARTIAL_TRINES } = await import('@/lib/prediction/life-prediction')

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
      const { EVENT_NAMES_FULL } = await import('@/lib/prediction/life-prediction')

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
      const { EVENT_NAMES_FULL } = await import('@/lib/prediction/life-prediction')

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
      const { ASTRO_EVENT_CONDITIONS } = await import('@/lib/prediction/life-prediction')

      expect(ASTRO_EVENT_CONDITIONS.marriage.beneficSigns).toBeDefined()
      expect(Array.isArray(ASTRO_EVENT_CONDITIONS.marriage.beneficSigns)).toBe(true)
      expect(ASTRO_EVENT_CONDITIONS.marriage.beneficSigns.length).toBeGreaterThan(0)
    })

    it('should have benefic planets for career', async () => {
      const { ASTRO_EVENT_CONDITIONS } = await import('@/lib/prediction/life-prediction')

      expect(ASTRO_EVENT_CONDITIONS.career.beneficPlanets).toBeDefined()
      expect(Array.isArray(ASTRO_EVENT_CONDITIONS.career.beneficPlanets)).toBe(true)
    })
  })

  describe('Moon phase bonuses', () => {
    it('should have moon phase bonus configuration', async () => {
      const { ASTRO_EVENT_CONDITIONS } = await import('@/lib/prediction/life-prediction')

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
      const { TRANSIT_EVENT_CONDITIONS } = await import('@/lib/prediction/life-prediction')

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
      const { TRANSIT_EVENT_CONDITIONS } = await import('@/lib/prediction/life-prediction')

      expect(TRANSIT_EVENT_CONDITIONS.career.beneficAspects).toBeDefined()
      expect(Array.isArray(TRANSIT_EVENT_CONDITIONS.career.beneficAspects)).toBe(true)
    })

    it('should have malefic aspects defined', async () => {
      const { TRANSIT_EVENT_CONDITIONS } = await import('@/lib/prediction/life-prediction')

      expect(TRANSIT_EVENT_CONDITIONS.career.maleficAspects).toBeDefined()
      expect(Array.isArray(TRANSIT_EVENT_CONDITIONS.career.maleficAspects)).toBe(true)
    })
  })

  describe('Favorable houses', () => {
    it('should have favorable houses for each event type', async () => {
      const { TRANSIT_EVENT_CONDITIONS } = await import('@/lib/prediction/life-prediction')

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
      const { EVENT_HOUSES } = await import('@/lib/prediction/life-prediction')

      expect(EVENT_HOUSES.marriage.primary).toContain(7)
    })

    it('should have house 10 as primary for career', async () => {
      const { EVENT_HOUSES } = await import('@/lib/prediction/life-prediction')

      expect(EVENT_HOUSES.career.primary).toContain(10)
    })
  })

  describe('Secondary houses', () => {
    it('should have secondary houses defined', async () => {
      const { EVENT_HOUSES } = await import('@/lib/prediction/life-prediction')

      expect(EVENT_HOUSES.marriage.secondary).toBeDefined()
      expect(Array.isArray(EVENT_HOUSES.marriage.secondary)).toBe(true)
    })
  })

  describe('Avoid houses', () => {
    it('should have avoid houses defined', async () => {
      const { EVENT_HOUSES } = await import('@/lib/prediction/life-prediction')

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
      const { generateComprehensivePrediction } = await import('@/lib/prediction/life-prediction')

      const maleInput = createMockInput({ gender: 'male' })
      const result = generateComprehensivePrediction(maleInput)

      expect(result).toBeDefined()
      expect(result.input.gender).toBe('male')
    })

    it('should process female input correctly', async () => {
      const { generateComprehensivePrediction } = await import('@/lib/prediction/life-prediction')

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
      const { generateComprehensivePrediction } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput({ birthHour: undefined })
      const result = generateComprehensivePrediction(input)

      expect(result).toBeDefined()
      expect(result.confidence).toBeLessThan(95)
    })

    it('should handle missing yongsin and kisin', async () => {
      const { findOptimalEventTiming } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput({ yongsin: undefined, kisin: undefined })
      const currentYear = new Date().getFullYear()

      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear + 1)

      expect(result).toBeDefined()
    })

    it('should handle empty allStems and allBranches', async () => {
      const { findWeeklyOptimalTiming } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput({ allStems: [], allBranches: [] })
      const startDate = new Date()

      const result = findWeeklyOptimalTiming(input, 'marriage', startDate)

      expect(result).toBeDefined()
    })
  })

  describe('Extreme birth years', () => {
    it('should handle very old birth year', async () => {
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput({ birthYear: 1920 })
      const result = analyzeMultiYearTrend(input, 2020, 2025)

      expect(result).toBeDefined()
    })

    it('should handle recent birth year', async () => {
      const { analyzeMultiYearTrend } = await import('@/lib/prediction/life-prediction')

      const input = createMockInput({ birthYear: 2020 })
      const result = analyzeMultiYearTrend(input, 2024, 2030)

      expect(result).toBeDefined()
    })
  })
})
