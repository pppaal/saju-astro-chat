/**
 * Saju Character Analysis - Comprehensive Tests
 *
 * Tests for getMoonElement, analyzeYongsin, analyzeGeokguk,
 * analyzeSolarReturn, analyzeProgressions, calculateTotalCharacterScore
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock logger (used inside the source for error handling)
// ---------------------------------------------------------------------------
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// We let the REAL constants + utils through so that the analysis functions
// exercise their actual logic.  We only mock the logger.
// ---------------------------------------------------------------------------

import {
  getMoonElement,
  analyzeYongsin,
  analyzeGeokguk,
  analyzeSolarReturn,
  analyzeProgressions,
  calculateTotalCharacterScore,
  type YongsinInfo,
  type GanzhiInfo,
  type GeokgukInfo,
  type PillarInfo,
} from '@/lib/destiny-map/calendar/saju-character-analysis'

// ═══════════════════════════════════════════════════════════════════════
// getMoonElement
// ═══════════════════════════════════════════════════════════════════════

describe('getMoonElement', () => {
  it('returns an element for every month of the year', () => {
    const validElements = ['wood', 'fire', 'earth', 'metal', 'water']
    for (let m = 0; m < 12; m++) {
      const date = new Date(2024, m, 15)
      const result = getMoonElement(date)
      expect(validElements).toContain(result)
    }
  })

  it('returns earth for January (Capricorn)', () => {
    // Capricorn -> earth in ZODIAC_TO_ELEMENT
    const result = getMoonElement(new Date(2024, 0, 15))
    expect(result).toBe('earth')
  })

  it('returns water for March (Pisces)', () => {
    // Pisces -> water
    const result = getMoonElement(new Date(2024, 2, 15))
    expect(result).toBe('water')
  })

  it('returns fire for April (Aries)', () => {
    // Aries -> fire
    const result = getMoonElement(new Date(2024, 3, 15))
    expect(result).toBe('fire')
  })

  it('returns earth for May (Taurus)', () => {
    // Taurus -> earth
    const result = getMoonElement(new Date(2024, 4, 15))
    expect(result).toBe('earth')
  })

  it('returns metal for June (Gemini mapped to air -> normalized to metal)', () => {
    // Gemini -> "air" -> normalizeElement -> "metal"
    const result = getMoonElement(new Date(2024, 5, 15))
    expect(result).toBe('metal')
  })

  it('returns water for July (Cancer)', () => {
    const result = getMoonElement(new Date(2024, 6, 15))
    expect(result).toBe('water')
  })

  it('returns fire for August (Leo)', () => {
    const result = getMoonElement(new Date(2024, 7, 15))
    expect(result).toBe('fire')
  })

  it('returns earth for September (Virgo)', () => {
    const result = getMoonElement(new Date(2024, 8, 15))
    expect(result).toBe('earth')
  })

  it('returns metal for October (Libra -> air -> metal)', () => {
    const result = getMoonElement(new Date(2024, 9, 15))
    expect(result).toBe('metal')
  })

  it('returns water for November (Scorpio)', () => {
    const result = getMoonElement(new Date(2024, 10, 15))
    expect(result).toBe('water')
  })

  it('returns fire for December (Sagittarius)', () => {
    const result = getMoonElement(new Date(2024, 11, 15))
    expect(result).toBe('fire')
  })

  it('returns metal for February (Aquarius -> air -> metal)', () => {
    const result = getMoonElement(new Date(2024, 1, 15))
    expect(result).toBe('metal')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// analyzeYongsin
// ═══════════════════════════════════════════════════════════════════════

describe('analyzeYongsin', () => {
  const baseDate = new Date(2024, 0, 15)

  // Helper to create a standard ganzhi object
  function ganzhi(stemEl: string, branchEl: string): GanzhiInfo {
    return { stem: '甲', branch: '子', stemElement: stemEl, branchElement: branchEl }
  }

  // ---------- undefined / missing yongsin ----------

  it('returns zero-score result when yongsin is undefined', () => {
    const result = analyzeYongsin(undefined, ganzhi('wood', 'water'), baseDate)
    expect(result.score).toBe(0)
    expect(result.factorKeys).toHaveLength(0)
    expect(result.positive).toBe(false)
    expect(result.negative).toBe(false)
  })

  it('returns zero-score result when yongsin.primary is empty', () => {
    const yongsin: YongsinInfo = { primary: '', type: '억부' }
    const result = analyzeYongsin(yongsin, ganzhi('wood', 'water'), baseDate)
    expect(result.score).toBe(0)
  })

  // ---------- primary yongsin match (stem) ----------

  it('gives +30 when day stem element matches primary yongsin (Korean key)', () => {
    // primary '목' normalizes to 'wood'
    const yongsin: YongsinInfo = { primary: '목', type: '억부' }
    const result = analyzeYongsin(yongsin, ganzhi('wood', 'earth'), baseDate)
    expect(result.score).toBeGreaterThanOrEqual(30)
    expect(result.positive).toBe(true)
    expect(result.matchType).toBe('primaryYongsinMatch')
    expect(result.factorKeys).toContain('yongsinPrimaryMatch')
  })

  it('gives +30 when day stem element matches primary yongsin (English key)', () => {
    const yongsin: YongsinInfo = { primary: 'wood', type: '억부' }
    const result = analyzeYongsin(yongsin, ganzhi('wood', 'earth'), baseDate)
    expect(result.score).toBeGreaterThanOrEqual(30)
    expect(result.matchType).toBe('primaryYongsinMatch')
  })

  // ---------- secondary yongsin match (stem) ----------

  it('gives +18 when day stem element matches secondary yongsin', () => {
    // primary='목' (wood), secondary='화' (fire)
    // day stem = fire => matches secondary (+18)
    // ELEMENT_RELATIONS['wood'].generates = 'fire', so fire is NOT generatedBy or controlledBy for wood
    // Actually ELEMENT_RELATIONS['wood'].generates='fire' => fire === generates means no extra factor hit
    // ELEMENT_RELATIONS['wood'].generatedBy='water', controlledBy='metal' => neither is 'fire'
    // So no yongsinSupport or yongsinHarmed interference
    const yongsin: YongsinInfo = { primary: '목', secondary: '화', type: '조후' }
    const result = analyzeYongsin(yongsin, ganzhi('fire', 'earth'), baseDate)
    expect(result.score).toBeGreaterThanOrEqual(18)
    expect(result.positive).toBe(true)
    expect(result.matchType).toBe('secondaryYongsinMatch')
    expect(result.factorKeys).toContain('yongsinSecondaryMatch')
  })

  // ---------- branch matches ----------

  it('gives +15 branch bonus when branch matches primary yongsin', () => {
    const yongsin: YongsinInfo = { primary: '수', type: '통관' }
    // stem != primary, branch == primary
    const result = analyzeYongsin(yongsin, ganzhi('fire', 'water'), baseDate)
    expect(result.factorKeys).toContain('yongsinBranchMatch')
    expect(result.score).toBeGreaterThanOrEqual(15)
  })

  it('gives +10 branch bonus when branch matches secondary yongsin', () => {
    const yongsin: YongsinInfo = { primary: '화', secondary: '수', type: '통관' }
    // stem != primary or secondary, branch == secondary
    const result = analyzeYongsin(yongsin, ganzhi('earth', 'water'), baseDate)
    expect(result.factorKeys).toContain('yongsinSecondaryBranchMatch')
  })

  // ---------- kibsin (기신) ----------

  it('subtracts 28 when day stem matches kibsin', () => {
    const yongsin: YongsinInfo = { primary: '목', type: '억부', kibsin: '금' }
    const result = analyzeYongsin(yongsin, ganzhi('metal', 'earth'), baseDate)
    expect(result.score).toBeLessThanOrEqual(-28)
    expect(result.negative).toBe(true)
    expect(result.factorKeys).toContain('kibsinMatch')
  })

  it('subtracts 15 when day branch matches kibsin', () => {
    const yongsin: YongsinInfo = { primary: '목', type: '억부', kibsin: '금' }
    const result = analyzeYongsin(yongsin, ganzhi('earth', 'metal'), baseDate)
    expect(result.negative).toBe(true)
    expect(result.factorKeys).toContain('kibsinBranchMatch')
  })

  it('subtracts from both stem and branch when both match kibsin', () => {
    const yongsin: YongsinInfo = { primary: '목', type: '억부', kibsin: '금' }
    const result = analyzeYongsin(yongsin, ganzhi('metal', 'metal'), baseDate)
    expect(result.score).toBeLessThanOrEqual(-43) // -28 + -15
    expect(result.factorKeys).toContain('kibsinMatch')
    expect(result.factorKeys).toContain('kibsinBranchMatch')
  })

  // ---------- supporting / harming element (상생/상극) ----------

  it('gives +12 when day stem generates primary yongsin (yongsinSupport)', () => {
    // wood is generatedBy water: ELEMENT_RELATIONS['wood'].generatedBy === 'water'
    const yongsin: YongsinInfo = { primary: 'wood', type: '억부' }
    // day stem element = water (the thing that generates wood)
    const result = analyzeYongsin(yongsin, ganzhi('water', 'earth'), baseDate)
    expect(result.factorKeys).toContain('yongsinSupport')
  })

  it('gives -10 when day stem controls primary yongsin (yongsinHarmed)', () => {
    // wood is controlledBy metal: ELEMENT_RELATIONS['wood'].controlledBy === 'metal'
    const yongsin: YongsinInfo = { primary: 'wood', type: '억부' }
    const result = analyzeYongsin(yongsin, ganzhi('metal', 'earth'), baseDate)
    expect(result.factorKeys).toContain('yongsinHarmed')
  })

  // ---------- combined scenarios ----------

  it('accumulates both primary stem match and branch match', () => {
    // stem=wood (primary match +30), branch=wood (branch match +15)
    const yongsin: YongsinInfo = { primary: 'wood', type: '억부' }
    const result = analyzeYongsin(yongsin, ganzhi('wood', 'wood'), baseDate)
    expect(result.score).toBeGreaterThanOrEqual(45) // 30 + 15
    expect(result.factorKeys).toContain('yongsinPrimaryMatch')
    expect(result.factorKeys).toContain('yongsinBranchMatch')
  })

  // ---------- Korean hanja character keys (木/火/土/金/水) ----------

  it('normalizes hanja character keys correctly', () => {
    const yongsin: YongsinInfo = { primary: '木', type: '억부' }
    const result = analyzeYongsin(yongsin, ganzhi('wood', 'earth'), baseDate)
    expect(result.score).toBeGreaterThanOrEqual(30)
    expect(result.matchType).toBe('primaryYongsinMatch')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// analyzeGeokguk
// ═══════════════════════════════════════════════════════════════════════

describe('analyzeGeokguk', () => {
  function ganzhi(stem: string, branch: string, stemEl: string, branchEl: string): GanzhiInfo {
    return { stem, branch, stemElement: stemEl, branchElement: branchEl }
  }

  const basePillars: PillarInfo = {
    day: { stem: '甲', branch: '寅' },
  }

  // ---------- missing / undefined ----------

  it('returns zero-score when geokguk is undefined', () => {
    const result = analyzeGeokguk(undefined, ganzhi('己', '午', 'earth', 'fire'), basePillars)
    expect(result.score).toBe(0)
    expect(result.factorKeys).toHaveLength(0)
  })

  it('returns zero-score when geokguk.type is empty', () => {
    const geokguk: GeokgukInfo = { type: '', strength: '신강' }
    const result = analyzeGeokguk(geokguk, ganzhi('己', '午', 'earth', 'fire'), basePillars)
    expect(result.score).toBe(0)
  })

  it('returns zero-score when pillars.day.stem is missing', () => {
    const geokguk: GeokgukInfo = { type: '정관격', strength: '신강' }
    const result = analyzeGeokguk(geokguk, ganzhi('己', '午', 'earth', 'fire'), undefined)
    expect(result.score).toBe(0)
  })

  it('returns zero-score when pillars is empty object', () => {
    const geokguk: GeokgukInfo = { type: '정관격', strength: '신강' }
    const result = analyzeGeokguk(geokguk, ganzhi('己', '午', 'earth', 'fire'), {})
    expect(result.score).toBe(0)
  })

  it('returns zero-score for unknown geokguk type', () => {
    const geokguk: GeokgukInfo = { type: '알수없는격', strength: '신강' }
    const result = analyzeGeokguk(geokguk, ganzhi('己', '午', 'earth', 'fire'), basePillars)
    expect(result.score).toBe(0)
  })

  // ---------- favor matches ----------

  it('gives +20 when 정관격 gets a favored sipsin (정인)', () => {
    // dayMaster=甲, target stem = 壬 => sipsin = 편인 (not favored by 정관격)
    // dayMaster=甲, target stem = 辛 => sipsin = 정관 (not favored)
    // dayMaster=甲, target stem = 癸 => sipsin = 정인 (favored by 정관격!)
    const geokguk: GeokgukInfo = { type: '정관격', strength: '중화' }
    const result = analyzeGeokguk(geokguk, ganzhi('癸', '午', 'water', 'fire'), basePillars)
    expect(result.score).toBe(20)
    expect(result.positive).toBe(true)
    expect(result.factorKeys).toContain('geokgukFavor_정인')
  })

  it('gives +20 when 정관격 gets 정재 (甲 -> 己 = 정재)', () => {
    const geokguk: GeokgukInfo = { type: '정관격', strength: '중화' }
    const result = analyzeGeokguk(geokguk, ganzhi('己', '午', 'earth', 'fire'), basePillars)
    expect(result.score).toBe(20)
    expect(result.positive).toBe(true)
    expect(result.factorKeys).toContain('geokgukFavor_정재')
  })

  // ---------- avoid matches ----------

  it('gives -18 when 정관격 gets an avoided sipsin (상관)', () => {
    // dayMaster=甲, target stem = 丁 => sipsin = 상관 (avoided by 정관격)
    const geokguk: GeokgukInfo = { type: '정관격', strength: '중화' }
    const result = analyzeGeokguk(geokguk, ganzhi('丁', '午', 'fire', 'fire'), basePillars)
    expect(result.score).toBe(-18)
    expect(result.negative).toBe(true)
    expect(result.factorKeys).toContain('geokgukAvoid_상관')
  })

  // ---------- 신강 strength modifiers ----------

  it('adds +8 strength balance for 신강 with 식신/상관/재성/관성', () => {
    // dayMaster=甲, target=丙 => sipsin = 식신 (setting element for 신강)
    // 식신 is favored in 식신격, so let's use 건록격 to avoid favor overlap
    // dayMaster=甲, target=丙 => sipsin=식신 (favored by 건록격 AND setting for 신강)
    const geokguk: GeokgukInfo = { type: '건록격', strength: '신강' }
    const result = analyzeGeokguk(geokguk, ganzhi('丙', '午', 'fire', 'fire'), basePillars)
    // +20 (favor) + +8 (strength balance) = 28
    expect(result.score).toBe(28)
    expect(result.factorKeys).toContain('geokgukFavor_식신')
    expect(result.factorKeys).toContain('geokgukStrengthBalance')
  })

  it('subtracts -6 for 신강 with excess bigyeob/inseong', () => {
    // dayMaster=甲, target=甲 => sipsin = 비견 (excess for 신강)
    const geokguk: GeokgukInfo = { type: '정관격', strength: '신강' }
    const result = analyzeGeokguk(geokguk, ganzhi('甲', '午', 'wood', 'fire'), basePillars)
    // 비견 is not in 정관격 favor or avoid
    // but 비견 is in excessElements for 신강 -> -6
    expect(result.score).toBe(-6)
    expect(result.factorKeys).toContain('geokgukStrengthExcess')
  })

  // ---------- 신약 strength modifiers ----------

  it('adds +8 weak support for 신약 with 비견/겁재/인성', () => {
    // dayMaster=甲, target=甲 => sipsin = 비견 (support for 신약)
    const geokguk: GeokgukInfo = { type: '정관격', strength: '신약' }
    const result = analyzeGeokguk(geokguk, ganzhi('甲', '午', 'wood', 'fire'), basePillars)
    // 비견 is not in 정관격 favor or avoid
    // but 비견 is in supportElements for 신약 -> +8
    expect(result.score).toBe(8)
    expect(result.factorKeys).toContain('geokgukWeakSupport')
  })

  it('subtracts -6 for 신약 under pressure from 관살/재성', () => {
    // dayMaster=甲, target=庚 => sipsin = 편관 (pressure for 신약)
    const geokguk: GeokgukInfo = { type: '정관격', strength: '신약' }
    const result = analyzeGeokguk(geokguk, ganzhi('庚', '午', 'metal', 'fire'), basePillars)
    // 편관 is not in 정관격 favor or avoid list
    // but 편관 is pressure for 신약 -> -6
    expect(result.score).toBe(-6)
    expect(result.factorKeys).toContain('geokgukWeakPressure')
  })

  // ---------- 종격 (special geokguk types) ----------

  it('handles 종아격 favor (식신/상관/정재/편재)', () => {
    // dayMaster=甲, target=丙 => sipsin = 식신 (favored by 종아격)
    const geokguk: GeokgukInfo = { type: '종아격', strength: '신약' }
    const result = analyzeGeokguk(geokguk, ganzhi('丙', '午', 'fire', 'fire'), basePillars)
    expect(result.positive).toBe(true)
    expect(result.factorKeys).toContain('geokgukFavor_식신')
  })

  it('handles 종아격 avoid (정인/편인)', () => {
    // dayMaster=甲, target=癸 => sipsin = 정인 (avoided by 종아격)
    const geokguk: GeokgukInfo = { type: '종아격', strength: '신약' }
    const result = analyzeGeokguk(geokguk, ganzhi('癸', '午', 'water', 'fire'), basePillars)
    expect(result.negative).toBe(true)
    expect(result.factorKeys).toContain('geokgukAvoid_정인')
  })

  // ---------- combined favor + strength ----------

  it('combines favor + avoid from same sipsin when it appears in both lists', () => {
    // 겁재 is in 정관격 avoid list AND 겁재 is excess for 신강
    // dayMaster=甲, target=乙 => sipsin = 겁재
    const geokguk: GeokgukInfo = { type: '정관격', strength: '신강' }
    const result = analyzeGeokguk(geokguk, ganzhi('乙', '午', 'wood', 'fire'), basePillars)
    // -18 (avoid) + -6 (excess) = -24
    expect(result.score).toBe(-24)
    expect(result.factorKeys).toContain('geokgukAvoid_겁재')
    expect(result.factorKeys).toContain('geokgukStrengthExcess')
  })

  // ---------- all defined geokguk types are recognized ----------

  it('recognizes 편관격', () => {
    // dayMaster=甲, 丙=식신 (favored by 편관격)
    const geokguk: GeokgukInfo = { type: '편관격', strength: '중화' }
    const result = analyzeGeokguk(geokguk, ganzhi('丙', '午', 'fire', 'fire'), basePillars)
    expect(result.positive).toBe(true)
  })

  it('recognizes 양인격', () => {
    // dayMaster=甲, 辛=정관 (favored by 양인격)
    const geokguk: GeokgukInfo = { type: '양인격', strength: '중화' }
    const result = analyzeGeokguk(geokguk, ganzhi('辛', '午', 'metal', 'fire'), basePillars)
    expect(result.positive).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// analyzeSolarReturn
// ═══════════════════════════════════════════════════════════════════════

describe('analyzeSolarReturn', () => {
  // ---------- missing birth info ----------

  it('returns zero-score when birthMonth is undefined', () => {
    const result = analyzeSolarReturn(new Date(2024, 2, 15), undefined, 15)
    expect(result.score).toBe(0)
    expect(result.daysFromBirthday).toBe(999)
  })

  it('returns zero-score when birthDay is undefined', () => {
    const result = analyzeSolarReturn(new Date(2024, 2, 15), 3, undefined)
    expect(result.score).toBe(0)
  })

  // ---------- exact birthday ----------

  it('gives +25 for exact birthday match', () => {
    const result = analyzeSolarReturn(new Date(2024, 2, 15), 3, 15)
    expect(result.score).toBe(25)
    expect(result.positive).toBe(true)
    expect(result.isBirthday).toBe(true)
    expect(result.daysFromBirthday).toBe(0)
    expect(result.factorKeys).toContain('solarReturnExact')
  })

  // ---------- +-1 day ----------

  it('gives +18 for 1 day before birthday', () => {
    const result = analyzeSolarReturn(new Date(2024, 2, 14), 3, 15)
    expect(result.score).toBe(18)
    expect(result.positive).toBe(true)
    expect(result.daysFromBirthday).toBe(1)
    expect(result.factorKeys).toContain('solarReturnNear')
  })

  it('gives +18 for 1 day after birthday', () => {
    const result = analyzeSolarReturn(new Date(2024, 2, 16), 3, 15)
    expect(result.score).toBe(18)
    expect(result.positive).toBe(true)
    expect(result.daysFromBirthday).toBe(1)
    expect(result.factorKeys).toContain('solarReturnNear')
  })

  // ---------- +-3 days ----------

  it('gives +10 for 2-3 days from birthday', () => {
    const result = analyzeSolarReturn(new Date(2024, 2, 12), 3, 15)
    expect(result.score).toBe(10)
    expect(result.positive).toBe(true)
    expect(result.daysFromBirthday).toBe(3)
    expect(result.factorKeys).toContain('solarReturnWeak')
  })

  it('gives +10 for exactly 2 days away', () => {
    const result = analyzeSolarReturn(new Date(2024, 2, 17), 3, 15)
    expect(result.score).toBe(10)
    expect(result.daysFromBirthday).toBe(2)
  })

  // ---------- +-7 days ----------

  it('gives +5 for 4-7 days from birthday', () => {
    const result = analyzeSolarReturn(new Date(2024, 2, 20), 3, 15)
    expect(result.score).toBe(5)
    expect(result.daysFromBirthday).toBe(5)
    expect(result.factorKeys).toContain('solarReturnEcho')
  })

  it('gives +5 for exactly 7 days away', () => {
    const result = analyzeSolarReturn(new Date(2024, 2, 22), 3, 15)
    expect(result.score).toBe(5)
    expect(result.daysFromBirthday).toBe(7)
    expect(result.factorKeys).toContain('solarReturnEcho')
  })

  // ---------- far from birthday ----------

  it('gives 0 for more than 7 days from birthday', () => {
    const result = analyzeSolarReturn(new Date(2024, 5, 15), 3, 15)
    expect(result.score).toBe(0)
    expect(result.positive).toBe(false)
    expect(result.isBirthday).toBe(false)
  })

  // ---------- cross-year boundary ----------

  it('handles December birthday checked in January', () => {
    // birth: Dec 31, check: Jan 2 => daysFromBirthday wraps
    const result = analyzeSolarReturn(new Date(2024, 0, 2), 12, 31)
    // The function calculates distance within same year:
    // target = 2024-12-31, date = 2024-01-02 => diffDays = 364
    // result.daysFromBirthday = 364 which is > 7
    expect(result.score).toBe(0)
  })

  // ---------- edge: Feb 29 birthday (leap year) ----------

  it('handles leap year birthday on exact match', () => {
    const result = analyzeSolarReturn(new Date(2024, 1, 29), 2, 29)
    expect(result.score).toBe(25)
    expect(result.isBirthday).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// analyzeProgressions
// ═══════════════════════════════════════════════════════════════════════

describe('analyzeProgressions', () => {
  // ---------- missing birthYear ----------

  it('returns zero-score when birthYear is undefined', () => {
    const result = analyzeProgressions(new Date(2024, 0, 15), undefined, 'fire', 'wood')
    expect(result.score).toBe(0)
    expect(result.currentPhase).toBe('')
  })

  // ---------- age phases ----------

  it('assigns lunar phase for age < 7', () => {
    const result = analyzeProgressions(new Date(2024, 0, 15), 2020, 'fire', 'wood')
    expect(result.currentPhase).toBe('lunar')
    expect(result.factorKeys).toContain('progressionLunar')
  })

  it('assigns mercury phase for ages 7-13', () => {
    const result = analyzeProgressions(new Date(2024, 0, 15), 2014, 'fire', 'wood')
    expect(result.currentPhase).toBe('mercury')
    expect(result.factorKeys).toContain('progressionMercury')
  })

  it('assigns venus phase for ages 14-20', () => {
    const result = analyzeProgressions(new Date(2024, 0, 15), 2006, 'fire', 'wood')
    expect(result.currentPhase).toBe('venus')
    expect(result.factorKeys).toContain('progressionVenus')
  })

  it('assigns solar phase for ages 21-28', () => {
    const result = analyzeProgressions(new Date(2024, 0, 15), 2000, 'fire', 'wood')
    expect(result.currentPhase).toBe('solar')
    expect(result.factorKeys).toContain('progressionSolar')
  })

  it('assigns mars phase for ages 29-41', () => {
    const result = analyzeProgressions(new Date(2024, 0, 15), 1990, 'fire', 'wood')
    expect(result.currentPhase).toBe('mars')
    expect(result.factorKeys).toContain('progressionMars')
  })

  it('assigns jupiter phase for ages 42-55 with +5 bonus', () => {
    const result = analyzeProgressions(new Date(2024, 0, 15), 1975, 'fire', 'wood')
    expect(result.currentPhase).toBe('jupiter')
    expect(result.factorKeys).toContain('progressionJupiter')
    // Base score has +5 for jupiter phase
    expect(result.score).toBeGreaterThanOrEqual(5)
  })

  it('assigns saturn phase for ages 56-69', () => {
    const result = analyzeProgressions(new Date(2024, 0, 15), 1960, 'fire', 'wood')
    expect(result.currentPhase).toBe('saturn')
    expect(result.factorKeys).toContain('progressionSaturn')
  })

  it('assigns outer phase for age >= 70', () => {
    const result = analyzeProgressions(new Date(2024, 0, 15), 1950, 'fire', 'wood')
    expect(result.currentPhase).toBe('outer')
    expect(result.factorKeys).toContain('progressionOuter')
  })

  // ---------- phase-element harmony (progressionSupport / progressionChallenge) ----------

  it('gives progressionSupport when phase element generates day master', () => {
    // Mars phase element = fire, dayMasterElement = 'earth'
    // ELEMENT_RELATIONS['earth'].generatedBy === 'fire' => support!
    const result = analyzeProgressions(new Date(2024, 0, 15), 1990, 'fire', 'earth')
    expect(result.factorKeys).toContain('progressionSupport')
    expect(result.positive).toBe(true)
  })

  it('gives progressionChallenge when phase element controls day master', () => {
    // Mars phase element = fire, dayMasterElement = 'metal'
    // ELEMENT_RELATIONS['metal'].controlledBy === 'fire' => challenge!
    const result = analyzeProgressions(new Date(2024, 0, 15), 1990, 'fire', 'metal')
    expect(result.factorKeys).toContain('progressionChallenge')
    expect(result.negative).toBe(true)
  })

  // ---------- 7-year cycle transition ----------

  it('adds progressionCycleYear at age 7', () => {
    const result = analyzeProgressions(new Date(2024, 0, 15), 2017, 'fire', 'wood')
    expect(result.factorKeys).toContain('progressionCycleYear')
  })

  it('adds progressionCycleYear at age 42', () => {
    const result = analyzeProgressions(new Date(2024, 0, 15), 1982, 'fire', 'wood')
    // age = 42 => jupiter phase + cycle year
    expect(result.factorKeys).toContain('progressionCycleYear')
    expect(result.factorKeys).toContain('progressionJupiter')
  })

  it('does NOT add progressionCycleYear at non-cycle age', () => {
    // age = 34, not in cycleYears
    const result = analyzeProgressions(new Date(2024, 0, 15), 1990, 'fire', 'wood')
    expect(result.factorKeys).not.toContain('progressionCycleYear')
  })

  // ---------- Saturn Return ----------

  it('adds saturnReturnFirst for ages 29-30', () => {
    const result29 = analyzeProgressions(new Date(2024, 0, 15), 1995, 'fire', 'wood')
    expect(result29.factorKeys).toContain('saturnReturnFirst')

    const result30 = analyzeProgressions(new Date(2024, 0, 15), 1994, 'fire', 'wood')
    expect(result30.factorKeys).toContain('saturnReturnFirst')
  })

  it('adds saturnReturnSecond for ages 58-60', () => {
    const result58 = analyzeProgressions(new Date(2024, 0, 15), 1966, 'fire', 'wood')
    expect(result58.factorKeys).toContain('saturnReturnSecond')

    const result60 = analyzeProgressions(new Date(2024, 0, 15), 1964, 'fire', 'wood')
    expect(result60.factorKeys).toContain('saturnReturnSecond')
  })

  it('does NOT add saturnReturn for age 31', () => {
    const result = analyzeProgressions(new Date(2024, 0, 15), 1993, 'fire', 'wood')
    expect(result.factorKeys).not.toContain('saturnReturnFirst')
    expect(result.factorKeys).not.toContain('saturnReturnSecond')
  })

  // ---------- no dayMasterElement ----------

  it('still calculates phase without dayMasterElement', () => {
    const result = analyzeProgressions(new Date(2024, 0, 15), 1990, undefined, undefined)
    expect(result.currentPhase).toBe('mars')
    // No progressionSupport or Challenge since dayMasterElement is undefined
    expect(result.factorKeys).not.toContain('progressionSupport')
    expect(result.factorKeys).not.toContain('progressionChallenge')
  })

  // ---------- combined scores ----------

  it('accumulates jupiter bonus + cycle year + support', () => {
    // age = 49 (jupiter), in cycle years, dayMasterElement = 'fire'
    // jupiter element = wood, ELEMENT_RELATIONS['fire'].generatedBy = 'wood' => support!
    const result = analyzeProgressions(new Date(2024, 0, 15), 1975, 'fire', 'fire')
    expect(result.currentPhase).toBe('jupiter')
    expect(result.factorKeys).toContain('progressionJupiter')
    expect(result.factorKeys).toContain('progressionSupport')
    // +5 (jupiter) + +8 (support) = 13 + potential cycle year
    expect(result.score).toBeGreaterThanOrEqual(13)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// calculateTotalCharacterScore
// ═══════════════════════════════════════════════════════════════════════

describe('calculateTotalCharacterScore', () => {
  it('applies correct weights: 40% yongsin, 35% geokguk, 15% solar, 10% progression', () => {
    // 100 * 0.4 + 100 * 0.35 + 100 * 0.15 + 100 * 0.1 = 100
    const result = calculateTotalCharacterScore(100, 100, 100, 100)
    expect(result).toBe(100)
  })

  it('returns 0 when all inputs are 0', () => {
    const result = calculateTotalCharacterScore(0, 0, 0, 0)
    expect(result).toBe(0)
  })

  it('calculates weighted sum correctly for mixed values', () => {
    // 30*0.4 + 20*0.35 + 25*0.15 + 10*0.1
    // = 12 + 7 + 3.75 + 1 = 23.75 -> rounded to 24
    const result = calculateTotalCharacterScore(30, 20, 25, 10)
    expect(result).toBe(24)
  })

  it('handles negative scores', () => {
    // -28*0.4 + -18*0.35 + 0*0.15 + -5*0.1
    // = -11.2 + -6.3 + 0 + -0.5 = -18 -> rounded to -18
    const result = calculateTotalCharacterScore(-28, -18, 0, -5)
    expect(result).toBe(-18)
  })

  it('rounds to nearest integer', () => {
    // 1*0.4 + 1*0.35 + 1*0.15 + 1*0.1 = 1
    const result = calculateTotalCharacterScore(1, 1, 1, 1)
    expect(result).toBe(1)
  })

  it('handles large positive values', () => {
    const result = calculateTotalCharacterScore(45, 28, 25, 13)
    // 45*0.4 + 28*0.35 + 25*0.15 + 13*0.1
    // = 18 + 9.8 + 3.75 + 1.3 = 32.85 -> 33
    expect(result).toBe(33)
  })

  it('yongsin has the highest weight', () => {
    const yongsinHigh = calculateTotalCharacterScore(50, 0, 0, 0)
    const geokgukHigh = calculateTotalCharacterScore(0, 50, 0, 0)
    expect(yongsinHigh).toBeGreaterThan(geokgukHigh)
  })

  it('progression has the lowest weight', () => {
    const progressionHigh = calculateTotalCharacterScore(0, 0, 0, 50)
    const solarHigh = calculateTotalCharacterScore(0, 0, 50, 0)
    expect(progressionHigh).toBeLessThan(solarHigh)
  })
})
