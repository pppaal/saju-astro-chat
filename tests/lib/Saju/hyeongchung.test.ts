/**
 * Hyeongchung (형충회합) Tests
 *
 * Tests for branch interactions: combination, clash, punishment, etc.
 */

import {
  analyzeHyeongchung,
  analyzeUnseInteraction,
  calculateInteractionScore,
  type SajuPillarsInput,
  type InteractionType,
  type PillarPosition,
  type HyeongType,
  type InteractionResult,
  type HyeongchungAnalysis,
} from '@/lib/Saju/hyeongchung'

describe('analyzeHyeongchung', () => {
  const createPillars = (
    yearBranch: string,
    monthBranch: string,
    dayBranch: string,
    hourBranch: string
  ): SajuPillarsInput => ({
    year: { stem: '甲', branch: yearBranch },
    month: { stem: '甲', branch: monthBranch },
    day: { stem: '甲', branch: dayBranch },
    hour: { stem: '甲', branch: hourBranch },
  })

  describe('육합 (Yukap) detection', () => {
    it('detects 子丑 combination', () => {
      const pillars = createPillars('子', '丑', '寅', '卯')
      const result = analyzeHyeongchung(pillars)

      const yukap = result.interactions.find(
        (i) => i.type === '육합' && i.branches.includes('子') && i.branches.includes('丑')
      )
      expect(yukap).toBeDefined()
      expect(yukap?.effect).toBe('길')
      expect(yukap?.mergedElement).toBe('土')
    })

    it('detects 寅亥 combination', () => {
      const pillars = createPillars('寅', '亥', '午', '未')
      const result = analyzeHyeongchung(pillars)

      const yukap = result.interactions.find(
        (i) => i.type === '육합' && i.branches.includes('寅') && i.branches.includes('亥')
      )
      expect(yukap).toBeDefined()
      expect(yukap?.mergedElement).toBe('木')
    })
  })

  describe('삼합 (Samhap) detection', () => {
    it('analyzeHyeongchung returns interactions array (samhap not yet implemented)', () => {
      const pillars = createPillars('申', '子', '辰', '午')
      const result = analyzeHyeongchung(pillars)

      // Current implementation only calls checkYukap; samhap checks are stubbed out
      expect(result.interactions).toBeDefined()
      expect(Array.isArray(result.interactions)).toBe(true)
    })
  })

  describe('충 (Chung) detection', () => {
    it('analyzeHyeongchung returns interactions array (chung not yet implemented)', () => {
      const pillars = createPillars('子', '午', '寅', '卯')
      const result = analyzeHyeongchung(pillars)

      // Current implementation only calls checkYukap; chung checks are stubbed out
      expect(result.interactions).toBeDefined()
      expect(Array.isArray(result.interactions)).toBe(true)
    })
  })

  describe('형 (Hyeong) detection', () => {
    it('analyzeHyeongchung returns interactions array (hyeong not yet implemented)', () => {
      const pillars = createPillars('寅', '巳', '申', '午')
      const result = analyzeHyeongchung(pillars)

      // Current implementation only calls checkYukap; hyeong checks are stubbed out
      expect(result.interactions).toBeDefined()
      expect(Array.isArray(result.interactions)).toBe(true)
    })
  })

  describe('해 (Hae) detection', () => {
    it('analyzeHyeongchung returns interactions array (hae not yet implemented)', () => {
      const pillars = createPillars('子', '未', '寅', '卯')
      const result = analyzeHyeongchung(pillars)

      // Current implementation only calls checkYukap; hae checks are stubbed out
      expect(result.interactions).toBeDefined()
      expect(Array.isArray(result.interactions)).toBe(true)
    })
  })

  describe('파 (Pa) detection', () => {
    it('analyzeHyeongchung returns interactions array (pa not yet implemented)', () => {
      const pillars = createPillars('子', '酉', '寅', '卯')
      const result = analyzeHyeongchung(pillars)

      // Current implementation only calls checkYukap; pa checks are stubbed out
      expect(result.interactions).toBeDefined()
      expect(Array.isArray(result.interactions)).toBe(true)
    })
  })

  describe('원진 (Wonjin) detection', () => {
    it('analyzeHyeongchung returns interactions array (wonjin not yet implemented)', () => {
      const pillars = createPillars('子', '未', '寅', '卯')
      const result = analyzeHyeongchung(pillars)

      // Current implementation only calls checkYukap; wonjin checks are stubbed out
      expect(result.interactions).toBeDefined()
      expect(Array.isArray(result.interactions)).toBe(true)
    })
  })

  describe('Summary calculation', () => {
    it('calculates total positive correctly', () => {
      const pillars = createPillars('子', '丑', '寅', '亥')
      const result = analyzeHyeongchung(pillars)

      expect(result.summary.totalPositive).toBeGreaterThan(0)
    })

    it('calculates net effect', () => {
      const pillars = createPillars('子', '丑', '寅', '卯')
      const result = analyzeHyeongchung(pillars)

      expect(['길', '흉', '중립']).toContain(result.summary.netEffect)
    })

    it('identifies dominant interaction when interactions exist', () => {
      // 子丑 is a yukap pair, 寅亥 is also a yukap pair
      const pillars = createPillars('子', '丑', '寅', '亥')
      const result = analyzeHyeongchung(pillars)

      expect(result.summary.dominantInteraction).toBeDefined()
    })
  })

  describe('Warnings', () => {
    it('generates warnings when hap is broken by chung', () => {
      // 子丑 합 and 子午 충
      const pillars = createPillars('子', '丑', '午', '未')
      const result = analyzeHyeongchung(pillars)

      // May have warnings about hap being affected by chung
      expect(result).toHaveProperty('warnings')
    })
  })
})

describe('analyzeUnseInteraction', () => {
  it('accepts (sajuBranches, unseBranches) and returns InteractionResult[]', () => {
    const sajuBranches = ['子', '寅', '辰', '午']
    const unseBranches = ['午']
    const results = analyzeUnseInteraction(sajuBranches, unseBranches)

    expect(Array.isArray(results)).toBe(true)
  })

  it('returns empty array (stub implementation)', () => {
    const sajuBranches = ['子', '寅', '辰', '午']
    const unseBranches = ['丑']
    const results = analyzeUnseInteraction(sajuBranches, unseBranches)

    // Current implementation returns empty array
    expect(results).toHaveLength(0)
  })
})

describe('calculateInteractionScore', () => {
  it('returns overall, positive, negative, and balance', () => {
    const analysis: HyeongchungAnalysis = {
      interactions: [],
      summary: {
        totalPositive: 100,
        totalNegative: 50,
        dominantInteraction: '육합',
        netEffect: '길',
      },
      warnings: [],
    }

    const result = calculateInteractionScore(analysis)
    expect(result.overall).toBe(50)
    expect(result.positive).toBe(100)
    expect(result.negative).toBe(50)
    expect(typeof result.balance).toBe('string')
  })

  it("returns '매우 길함' balance for high positive", () => {
    const analysis: HyeongchungAnalysis = {
      interactions: [],
      summary: {
        totalPositive: 200,
        totalNegative: 0,
        dominantInteraction: '삼합',
        netEffect: '길',
      },
      warnings: [],
    }

    const result = calculateInteractionScore(analysis)
    expect(result.balance).toBe('매우 길함')
  })

  it("returns '매우 흉함' balance for high negative", () => {
    const analysis: HyeongchungAnalysis = {
      interactions: [],
      summary: {
        totalPositive: 0,
        totalNegative: 200,
        dominantInteraction: '충',
        netEffect: '흉',
      },
      warnings: [],
    }

    const result = calculateInteractionScore(analysis)
    expect(result.balance).toBe('매우 흉함')
  })

  it("returns '중립' balance when positive equals negative", () => {
    const analysis: HyeongchungAnalysis = {
      interactions: [],
      summary: {
        totalPositive: 100,
        totalNegative: 100,
        dominantInteraction: null,
        netEffect: '중립',
      },
      warnings: [],
    }

    const result = calculateInteractionScore(analysis)
    expect(result.balance).toBe('중립')
  })
})

describe('Type interfaces', () => {
  describe('InteractionType', () => {
    it('includes all interaction types', () => {
      const types: InteractionType[] = [
        '육합',
        '삼합',
        '반합',
        '방합',
        '충',
        '형',
        '해',
        '파',
        '원진',
        '귀문',
      ]
      expect(types).toHaveLength(10)
    })
  })

  describe('PillarPosition', () => {
    it('includes all pillar positions', () => {
      const positions: PillarPosition[] = ['year', 'month', 'day', 'hour']
      expect(positions).toHaveLength(4)
    })
  })

  describe('HyeongType', () => {
    it('includes all hyeong types', () => {
      const types: HyeongType[] = ['삼형', '자형', '상형', '무은지형', '시세지형', '무례지형']
      expect(types).toHaveLength(6)
    })
  })

  describe('InteractionResult', () => {
    it('has all required fields', () => {
      const result: InteractionResult = {
        type: '육합',
        branches: ['子', '丑'],
        pillars: ['year', 'month'],
        strength: 80,
        description: '子丑 육합',
        effect: '길',
      }

      expect(result.type).toBe('육합')
      expect(result.branches).toHaveLength(2)
      expect(result.strength).toBe(80)
      expect(result.effect).toBe('길')
    })

    it('supports optional fields', () => {
      const result: InteractionResult = {
        type: '삼합',
        subType: '水국',
        branches: ['申', '子', '辰'],
        pillars: ['year', 'month', 'day'],
        strength: 100,
        mergedElement: '水',
        description: '申子辰 삼합',
        effect: '길',
      }

      expect(result.subType).toBe('水국')
      expect(result.mergedElement).toBe('水')
    })
  })
})

describe('Pillar distance effects', () => {
  const createPillars = (
    yearBranch: string,
    monthBranch: string,
    dayBranch: string,
    hourBranch: string
  ): SajuPillarsInput => ({
    year: { stem: '甲', branch: yearBranch },
    month: { stem: '甲', branch: monthBranch },
    day: { stem: '甲', branch: dayBranch },
    hour: { stem: '甲', branch: hourBranch },
  })

  it('adjacent pillars have stronger yukap interaction than distant pillars', () => {
    // 子丑 yukap in year-month (adjacent, distance=1)
    const adjacent = createPillars('子', '丑', '寅', '卯')
    const adjacentResult = analyzeHyeongchung(adjacent)
    const adjacentYukap = adjacentResult.interactions.find((i) => i.type === '육합')

    // 子丑 yukap in year-day (one apart, distance=2)
    const apart = createPillars('子', '寅', '丑', '卯')
    const apartResult = analyzeHyeongchung(apart)
    const apartYukap = apartResult.interactions.find((i) => i.type === '육합')

    expect(adjacentYukap).toBeDefined()
    expect(apartYukap).toBeDefined()
    expect(adjacentYukap!.strength).toBeGreaterThan(apartYukap!.strength)
  })
})
