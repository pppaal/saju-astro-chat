/**
 * Destiny Matrix Engine Tests
 *
 * Tests for the Destiny Fusion Matrix calculation engine
 */

import {
  calculateDestinyMatrix,
  getElementCoreInteraction,
  getSibsinPlanetInteraction,
  getSibsinHouseInteraction,
  getTimingInteraction,
  getRelationAspectInteraction,
  getStageHouseInteraction,
  getAdvancedAnalysisInteraction,
  getShinsalPlanetInteraction,
  getAsteroidHouseInteraction,
  getAsteroidElementInteraction,
  getExtraPointElementInteraction,
  getExtraPointSibsinInteraction,
  getInteractionColor,
  getInteractionEmoji,
  scoreToLevel,
} from '@/lib/destiny-matrix/engine'

import type {
  MatrixCalculationInput,
  InteractionLevel,
  FiveElement,
  WesternElement,
  PlanetName,
  HouseNumber,
  SibsinKind,
  TransitCycle,
  BranchRelation,
  TwelveStageStandard,
  GeokgukType,
  ProgressionType,
  ShinsalKind,
  AsteroidName,
  ExtraPointName,
} from '@/lib/destiny-matrix/types'

describe('calculateDestinyMatrix', () => {
  const createMinimalInput = (): MatrixCalculationInput => ({
    dayMasterElement: '목',
    pillarElements: ['목', '화', '토', '금'],
    sibsinDistribution: { 비견: 2, 식신: 1 },
    twelveStages: { 장생: 1, 왕지: 1 },
    relations: [],
    planetHouses: { Sun: 1, Moon: 4 },
    planetSigns: {},
    aspects: [],
  })

  it('returns all 10 layers', () => {
    const input = createMinimalInput()
    const result = calculateDestinyMatrix(input)

    expect(result).toHaveProperty('layer1_elementCore')
    expect(result).toHaveProperty('layer2_sibsinPlanet')
    expect(result).toHaveProperty('layer3_sibsinHouse')
    expect(result).toHaveProperty('layer4_timing')
    expect(result).toHaveProperty('layer5_relationAspect')
    expect(result).toHaveProperty('layer6_stageHouse')
    expect(result).toHaveProperty('layer7_advanced')
    expect(result).toHaveProperty('layer8_shinsalPlanet')
    expect(result).toHaveProperty('layer9_asteroidHouse')
    expect(result).toHaveProperty('layer10_extraPointElement')
    expect(result).toHaveProperty('summary')
  })

  it('returns summary with required fields', () => {
    const input = createMinimalInput()
    const result = calculateDestinyMatrix(input)

    expect(result.summary).toHaveProperty('totalScore')
    expect(result.summary).toHaveProperty('strengthPoints')
    expect(result.summary).toHaveProperty('balancePoints')
    expect(result.summary).toHaveProperty('cautionPoints')
    expect(result.summary).toHaveProperty('topSynergies')
  })

  it('calculates layer1 from saju and western elements', () => {
    const input: MatrixCalculationInput = {
      ...createMinimalInput(),
      dominantWesternElement: 'fire',
    }
    const result = calculateDestinyMatrix(input)

    expect(Object.keys(result.layer1_elementCore).length).toBeGreaterThan(0)
  })

  it('calculates layer2 from sibsin and planets', () => {
    const input: MatrixCalculationInput = {
      ...createMinimalInput(),
      sibsinDistribution: { 정관: 2, 정재: 1, 식신: 1 },
      planetHouses: { Sun: 1, Moon: 4, Venus: 7, Mars: 10 },
    }
    const result = calculateDestinyMatrix(input)

    // Should have cells for sibsin-planet combinations
    expect(Object.keys(result.layer2_sibsinPlanet).length).toBeGreaterThan(0)
  })

  it('calculates layer3 from sibsin and houses', () => {
    const input: MatrixCalculationInput = {
      ...createMinimalInput(),
      sibsinDistribution: { 편관: 1, 정인: 1 },
      planetHouses: { Jupiter: 9, Saturn: 10 },
    }
    const result = calculateDestinyMatrix(input)

    expect(Object.keys(result.layer3_sibsinHouse).length).toBeGreaterThan(0)
  })

  it('calculates layer4 from timing cycles', () => {
    const input: MatrixCalculationInput = {
      ...createMinimalInput(),
      activeTransits: ['saturnReturn', 'jupiterReturn'],
      currentDaeunElement: '화',
    }
    const result = calculateDestinyMatrix(input)

    expect(Object.keys(result.layer4_timing).length).toBeGreaterThan(0)
  })

  it('calculates layer5 from relations and aspects', () => {
    const input: MatrixCalculationInput = {
      ...createMinimalInput(),
      relations: [{ kind: '지지삼합', detail: '寅午戌' }],
      aspects: [{ planet1: 'Sun', planet2: 'Moon', type: 'conjunction' }],
    }
    const result = calculateDestinyMatrix(input)

    expect(Object.keys(result.layer5_relationAspect).length).toBeGreaterThan(0)
  })

  it('maps stem and gongmang relations into layer5 instead of dropping', () => {
    const input: MatrixCalculationInput = {
      ...createMinimalInput(),
      relations: [
        { kind: '\uCC9C\uAC04\uD569', detail: '\u7532-\u5DF1' },
        { kind: '\uCC9C\uAC04\uCDA9', detail: '\u7532-\u5E9A' },
        { kind: '\uACF5\uB9DD', detail: '\u5BC5-\u5378' },
      ],
      aspects: [{ planet1: 'Sun', planet2: 'Moon', type: 'conjunction' }],
    }
    const result = calculateDestinyMatrix(input)

    expect(Object.keys(result.layer5_relationAspect).length).toBeGreaterThan(0)
  })

  it('calculates layer6 from twelve stages and houses', () => {
    const input: MatrixCalculationInput = {
      ...createMinimalInput(),
      twelveStages: { 장생: 1, 관대: 1, 왕지: 1, 쇠: 1 },
    }
    const result = calculateDestinyMatrix(input)

    expect(Object.keys(result.layer6_stageHouse).length).toBeGreaterThan(0)
  })

  it('calculates layer7 from geokguk and progressions', () => {
    const input: MatrixCalculationInput = {
      ...createMinimalInput(),
      geokguk: 'jeonggwan',
      yongsin: '수',
    }
    const result = calculateDestinyMatrix(input)

    expect(Object.keys(result.layer7_advanced).length).toBeGreaterThan(0)
  })

  it('calculates layer8 from shinsals', () => {
    const input: MatrixCalculationInput = {
      ...createMinimalInput(),
      shinsalList: ['천을귀인', '역마', '도화'],
    }
    const result = calculateDestinyMatrix(input)

    expect(Object.keys(result.layer8_shinsalPlanet).length).toBeGreaterThan(0)
  })

  it('calculates layer9 from asteroids', () => {
    const input: MatrixCalculationInput = {
      ...createMinimalInput(),
      asteroidHouses: { Ceres: 6, Pallas: 9, Juno: 7, Vesta: 4 },
    }
    const result = calculateDestinyMatrix(input)

    expect(Object.keys(result.layer9_asteroidHouse).length).toBeGreaterThan(0)
  })

  it('calculates layer10 from extra points', () => {
    const input: MatrixCalculationInput = {
      ...createMinimalInput(),
      extraPointSigns: { Chiron: '양자리', Lilith: '전갈자리', NorthNode: '쌍둥이자리' },
    }
    const result = calculateDestinyMatrix(input)

    expect(Object.keys(result.layer10_extraPointElement).length).toBeGreaterThan(0)
  })

  it('summary totalScore is a number', () => {
    const input = createMinimalInput()
    const result = calculateDestinyMatrix(input)

    expect(typeof result.summary.totalScore).toBe('number')
  })

  it('strength points are sorted by score descending', () => {
    const input: MatrixCalculationInput = {
      ...createMinimalInput(),
      sibsinDistribution: { 정관: 3, 정재: 2, 식신: 2, 비견: 1 },
      planetHouses: { Sun: 1, Moon: 4, Venus: 7, Mars: 10, Jupiter: 9 },
    }
    const result = calculateDestinyMatrix(input)

    if (result.summary.strengthPoints.length > 1) {
      for (let i = 1; i < result.summary.strengthPoints.length; i++) {
        expect(result.summary.strengthPoints[i - 1].cell.interaction.score).toBeGreaterThanOrEqual(
          result.summary.strengthPoints[i].cell.interaction.score
        )
      }
    }
  })

  it('caution points are sorted by score ascending', () => {
    const input: MatrixCalculationInput = {
      ...createMinimalInput(),
      relations: [{ kind: '지지충', detail: '子午' }],
      aspects: [{ planet1: 'Mars', planet2: 'Saturn', type: 'square' }],
    }
    const result = calculateDestinyMatrix(input)

    if (result.summary.cautionPoints.length > 1) {
      for (let i = 1; i < result.summary.cautionPoints.length; i++) {
        expect(result.summary.cautionPoints[i - 1].cell.interaction.score).toBeLessThanOrEqual(
          result.summary.cautionPoints[i].cell.interaction.score
        )
      }
    }
  })
})

describe('getElementCoreInteraction', () => {
  it('returns interaction for valid saju-western element pair', () => {
    const result = getElementCoreInteraction('목', 'fire')

    expect(result).not.toBeNull()
    if (result) {
      expect(result).toHaveProperty('level')
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('icon')
    }
  })

  it('returns null for invalid elements', () => {
    const result = getElementCoreInteraction('invalid' as FiveElement, 'fire')
    expect(result).toBeNull()
  })

  const elements: FiveElement[] = ['목', '화', '토', '금', '수']
  const westElements: WesternElement[] = ['fire', 'earth', 'air', 'water']

  elements.forEach((sajuEl) => {
    westElements.forEach((westEl) => {
      it(`has interaction for ${sajuEl} - ${westEl}`, () => {
        const result = getElementCoreInteraction(sajuEl, westEl)
        expect(result).not.toBeNull()
      })
    })
  })
})

describe('getSibsinPlanetInteraction', () => {
  const sibsinList: SibsinKind[] = [
    '비견',
    '겁재',
    '식신',
    '상관',
    '편재',
    '정재',
    '편관',
    '정관',
    '편인',
    '정인',
  ]
  const planets: PlanetName[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars']

  it('returns interaction for valid sibsin-planet pair', () => {
    const result = getSibsinPlanetInteraction('정관', 'Sun')

    expect(result).not.toBeNull()
  })

  it('returns null for invalid sibsin', () => {
    const result = getSibsinPlanetInteraction('invalid' as SibsinKind, 'Sun')
    expect(result).toBeNull()
  })

  sibsinList.forEach((sibsin) => {
    planets.forEach((planet) => {
      it(`has interaction for ${sibsin} - ${planet}`, () => {
        const result = getSibsinPlanetInteraction(sibsin, planet)
        expect(result).not.toBeNull()
      })
    })
  })
})

describe('getSibsinHouseInteraction', () => {
  const houses: HouseNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  it('returns interaction for valid sibsin-house pair', () => {
    const result = getSibsinHouseInteraction('정재', 2)

    expect(result).not.toBeNull()
  })

  it('returns null for invalid house', () => {
    const result = getSibsinHouseInteraction('비견', 0 as HouseNumber)
    expect(result).toBeNull()
  })

  houses.forEach((house) => {
    it(`has interaction for 정관 - house ${house}`, () => {
      const result = getSibsinHouseInteraction('정관', house)
      expect(result).not.toBeNull()
    })
  })
})

describe('getTimingInteraction', () => {
  const transits: TransitCycle[] = ['saturnReturn', 'jupiterReturn', 'mercuryRetrograde']

  it('returns interaction for valid timing-transit pair', () => {
    const result = getTimingInteraction('목', 'saturnReturn')

    expect(result).not.toBeNull()
  })

  transits.forEach((transit) => {
    it(`has interaction for shortTerm - ${transit}`, () => {
      const result = getTimingInteraction('shortTerm', transit)
      expect(result).not.toBeNull()
    })
  })
})

describe('getRelationAspectInteraction', () => {
  const relations: BranchRelation[] = ['samhap', 'yukhap', 'chung', 'hyeong']
  const aspects = ['conjunction', 'opposition', 'trine', 'square', 'sextile'] as const

  it('returns interaction for valid relation-aspect pair', () => {
    const result = getRelationAspectInteraction('samhap', 'conjunction')

    expect(result).not.toBeNull()
  })

  relations.forEach((relation) => {
    aspects.forEach((aspect) => {
      it(`has interaction for ${relation} - ${aspect}`, () => {
        const result = getRelationAspectInteraction(relation, aspect)
        expect(result).not.toBeNull()
      })
    })
  })
})

describe('getStageHouseInteraction', () => {
  const stages: TwelveStageStandard[] = [
    '장생',
    '목욕',
    '관대',
    '임관',
    '왕지',
    '쇠',
    '병',
    '사',
    '묘',
    '절',
    '태',
    '양',
  ]
  const houses: HouseNumber[] = [1, 5, 10]

  it('returns interaction for valid stage-house pair', () => {
    const result = getStageHouseInteraction('장생', 1)

    expect(result).not.toBeNull()
  })

  stages.forEach((stage) => {
    houses.forEach((house) => {
      it(`has interaction for ${stage} - house ${house}`, () => {
        const result = getStageHouseInteraction(stage, house)
        expect(result).not.toBeNull()
      })
    })
  })
})

describe('getAdvancedAnalysisInteraction', () => {
  const geokguks: GeokgukType[] = ['jeonggwan', 'pyeongwan', 'siksin', 'geonrok']
  const progressions: ProgressionType[] = ['secondary', 'solarArc', 'solarReturn']

  it('returns interaction for valid geokguk-progression pair', () => {
    const result = getAdvancedAnalysisInteraction('jeonggwan', 'secondary')

    expect(result).not.toBeNull()
  })

  geokguks.forEach((geokguk) => {
    progressions.forEach((progression) => {
      it(`has interaction for ${geokguk} - ${progression}`, () => {
        const result = getAdvancedAnalysisInteraction(geokguk, progression)
        expect(result).not.toBeNull()
      })
    })
  })

  it('returns interaction for yongsin rows', () => {
    const result = getAdvancedAnalysisInteraction('yongsin_수', 'secondary')
    expect(result).not.toBeNull()
  })
})

describe('getShinsalPlanetInteraction', () => {
  const shinsals: ShinsalKind[] = ['천을귀인', '역마', '도화', '양인']
  const planets: PlanetName[] = ['Sun', 'Moon', 'Mars']

  it('returns interaction for valid shinsal-planet pair', () => {
    const result = getShinsalPlanetInteraction('천을귀인', 'Sun')

    expect(result).not.toBeNull()
  })

  shinsals.forEach((shinsal) => {
    planets.forEach((planet) => {
      it(`has interaction for ${shinsal} - ${planet}`, () => {
        const result = getShinsalPlanetInteraction(shinsal, planet)
        expect(result).not.toBeNull()
      })
    })
  })
})

describe('getAsteroidHouseInteraction', () => {
  const asteroids: AsteroidName[] = ['Ceres', 'Pallas', 'Juno', 'Vesta']
  const houses: HouseNumber[] = [1, 4, 7, 10]

  it('returns interaction for valid asteroid-house pair', () => {
    const result = getAsteroidHouseInteraction('Ceres', 6)

    expect(result).not.toBeNull()
  })

  asteroids.forEach((asteroid) => {
    houses.forEach((house) => {
      it(`has interaction for ${asteroid} - house ${house}`, () => {
        const result = getAsteroidHouseInteraction(asteroid, house)
        expect(result).not.toBeNull()
      })
    })
  })
})

describe('getAsteroidElementInteraction', () => {
  const asteroids: AsteroidName[] = ['Ceres', 'Pallas', 'Juno', 'Vesta']
  const elements: FiveElement[] = ['목', '화', '토', '금', '수']

  it('returns interaction for valid asteroid-element pair', () => {
    const result = getAsteroidElementInteraction('Ceres', '목')

    expect(result).not.toBeNull()
  })

  asteroids.forEach((asteroid) => {
    elements.forEach((element) => {
      it(`has interaction for ${asteroid} - ${element}`, () => {
        const result = getAsteroidElementInteraction(asteroid, element)
        expect(result).not.toBeNull()
      })
    })
  })
})

describe('getExtraPointElementInteraction', () => {
  const points: ExtraPointName[] = ['Chiron', 'Lilith', 'PartOfFortune', 'NorthNode']
  const elements: FiveElement[] = ['목', '화', '토']

  it('returns interaction for valid extrapoint-element pair', () => {
    const result = getExtraPointElementInteraction('Chiron', '수')

    expect(result).not.toBeNull()
  })

  points.forEach((point) => {
    elements.forEach((element) => {
      it(`has interaction for ${point} - ${element}`, () => {
        const result = getExtraPointElementInteraction(point, element)
        expect(result).not.toBeNull()
      })
    })
  })
})

describe('getExtraPointSibsinInteraction', () => {
  const points: ExtraPointName[] = ['Chiron', 'Lilith']
  const sibsins: SibsinKind[] = ['정관', '정재', '식신']

  it('returns interaction for valid extrapoint-sibsin pair', () => {
    const result = getExtraPointSibsinInteraction('Chiron', '정인')

    // May or may not have interaction for all combinations
    if (result) {
      expect(result).toHaveProperty('level')
    }
  })

  points.forEach((point) => {
    sibsins.forEach((sibsin) => {
      it(`checks interaction for ${point} - ${sibsin}`, () => {
        const result = getExtraPointSibsinInteraction(point, sibsin)
        // Partial matrix - some may be null
        if (result) {
          expect(result).toHaveProperty('score')
        }
      })
    })
  })
})

describe('getInteractionColor', () => {
  const levels: InteractionLevel[] = ['extreme', 'amplify', 'balance', 'clash', 'conflict']

  it('returns color string for each level', () => {
    levels.forEach((level) => {
      const color = getInteractionColor(level)
      expect(typeof color).toBe('string')
      expect(color).toMatch(/^#[0-9a-f]{6}$/)
    })
  })

  it('returns purple for extreme', () => {
    expect(getInteractionColor('extreme')).toBe('#9333ea')
  })

  it('returns green for amplify', () => {
    expect(getInteractionColor('amplify')).toBe('#22c55e')
  })

  it('returns blue for balance', () => {
    expect(getInteractionColor('balance')).toBe('#3b82f6')
  })

  it('returns yellow for clash', () => {
    expect(getInteractionColor('clash')).toBe('#eab308')
  })

  it('returns red for conflict', () => {
    expect(getInteractionColor('conflict')).toBe('#ef4444')
  })
})

describe('getInteractionEmoji', () => {
  const levels: InteractionLevel[] = ['extreme', 'amplify', 'balance', 'clash', 'conflict']

  it('returns emoji for each level', () => {
    levels.forEach((level) => {
      const emoji = getInteractionEmoji(level)
      expect(typeof emoji).toBe('string')
      expect(emoji.length).toBeGreaterThan(0)
    })
  })

  it('returns 💥 for extreme', () => {
    expect(getInteractionEmoji('extreme')).toBe('💥')
  })

  it('returns 🚀 for amplify', () => {
    expect(getInteractionEmoji('amplify')).toBe('🚀')
  })

  it('returns ⚖️ for balance', () => {
    expect(getInteractionEmoji('balance')).toBe('⚖️')
  })

  it('returns ⚡ for clash', () => {
    expect(getInteractionEmoji('clash')).toBe('⚡')
  })

  it('returns ❌ for conflict', () => {
    expect(getInteractionEmoji('conflict')).toBe('❌')
  })
})

describe('scoreToLevel', () => {
  it('returns extreme for score >= 9', () => {
    expect(scoreToLevel(9)).toBe('extreme')
    expect(scoreToLevel(10)).toBe('extreme')
  })

  it('returns amplify for score 7-8', () => {
    expect(scoreToLevel(7)).toBe('amplify')
    expect(scoreToLevel(8)).toBe('amplify')
  })

  it('returns balance for score 5-6', () => {
    expect(scoreToLevel(5)).toBe('balance')
    expect(scoreToLevel(6)).toBe('balance')
  })

  it('returns clash for score 3-4', () => {
    expect(scoreToLevel(3)).toBe('clash')
    expect(scoreToLevel(4)).toBe('clash')
  })

  it('returns conflict for score < 3', () => {
    expect(scoreToLevel(0)).toBe('conflict')
    expect(scoreToLevel(1)).toBe('conflict')
    expect(scoreToLevel(2)).toBe('conflict')
  })
})

describe('InteractionCode structure', () => {
  it('has all required fields in element core interaction', () => {
    const result = getElementCoreInteraction('목', 'fire')

    expect(result).not.toBeNull()
    if (result) {
      expect(result).toHaveProperty('level')
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('icon')
      expect(result).toHaveProperty('colorCode')
      expect(result).toHaveProperty('keyword')
      expect(result).toHaveProperty('keywordEn')
    }
  })

  it('score is between 1-10', () => {
    const result = getElementCoreInteraction('화', 'earth')

    if (result) {
      expect(result.score).toBeGreaterThanOrEqual(1)
      expect(result.score).toBeLessThanOrEqual(10)
    }
  })

  it('level is one of valid values', () => {
    const validLevels: InteractionLevel[] = ['extreme', 'amplify', 'balance', 'clash', 'conflict']
    const result = getElementCoreInteraction('수', 'water')

    if (result) {
      expect(validLevels).toContain(result.level)
    }
  })

  it('colorCode is one of valid values', () => {
    const validColors = ['purple', 'green', 'blue', 'yellow', 'red']
    const result = getElementCoreInteraction('금', 'air')

    if (result) {
      expect(validColors).toContain(result.colorCode)
    }
  })
})

describe('MatrixCell structure', () => {
  it('computed cells have interaction and basis info', () => {
    const input: MatrixCalculationInput = {
      dayMasterElement: '목',
      pillarElements: ['화', '토'],
      sibsinDistribution: { 정관: 1 },
      twelveStages: { 장생: 1 },
      relations: [],
      planetHouses: { Sun: 1 },
      planetSigns: {},
      aspects: [],
      dominantWesternElement: 'fire',
    }

    const result = calculateDestinyMatrix(input)
    const cells = Object.values(result.layer1_elementCore)

    if (cells.length > 0) {
      const cell = cells[0]
      expect(cell).toHaveProperty('interaction')
      expect(cell.interaction).toHaveProperty('level')
      expect(cell.interaction).toHaveProperty('score')
    }
  })
})
