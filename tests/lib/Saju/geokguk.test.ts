/**
 * Geokguk (격국) Tests
 * Tests for Korean fortune-telling pattern determination
 */

import {
  determineGeokguk,
  evaluateGeokgukStatus,
  evaluateHwagiGeokguk,
  determineGeokgukAdvanced,
  getStrengthScore,
  type GeokgukType,
  type SajuPillarsInput,
} from '@/lib/saju/geokguk'

// Note: evaluateGeokgukStatus takes (geokguk, pillars) in that order
// Note: evaluateHwagiGeokguk returns { possible, type, conditions, description }

// Helper to create test pillars
function createPillars(
  yearStem: string,
  yearBranch: string,
  monthStem: string,
  monthBranch: string,
  dayStem: string,
  dayBranch: string,
  timeStem: string,
  timeBranch: string
): SajuPillarsInput {
  return {
    year: { stem: yearStem, branch: yearBranch },
    month: { stem: monthStem, branch: monthBranch },
    day: { stem: dayStem, branch: dayBranch },
    time: { stem: timeStem, branch: timeBranch },
  }
}

describe('Geokguk Module', () => {
  describe('determineGeokguk', () => {
    it('returns a valid GeokgukResult structure', () => {
      const pillars = createPillars('甲', '子', '丙', '寅', '戊', '辰', '庚', '午')
      const result = determineGeokguk(pillars)

      expect(result).toHaveProperty('primary')
      expect(result).toHaveProperty('category')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('description')
    })

    it('assigns a category from valid categories', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')
      const result = determineGeokguk(pillars)

      const validCategories = ['정격', '종격', '비격', '화기격국', '특수격국', '미정']
      expect(validCategories).toContain(result.category)
    })

    it('assigns confidence level', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')
      const result = determineGeokguk(pillars)

      expect(['high', 'medium', 'low']).toContain(result.confidence)
    })

    it('provides description for the geokguk', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')
      const result = determineGeokguk(pillars)

      expect(result.description).toBeTruthy()
      expect(typeof result.description).toBe('string')
    })
  })

  describe('evaluateGeokgukStatus', () => {
    it('returns status evaluation object', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')
      const geokguk = determineGeokguk(pillars)
      // Note: evaluateGeokgukStatus takes (geokguk, pillars) in that order
      const status = evaluateGeokgukStatus(geokguk.primary, pillars)

      expect(status).toHaveProperty('status')
      expect(status).toHaveProperty('factors')
      expect(status).toHaveProperty('description')
    })

    it('status is valid value', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')
      const geokguk = determineGeokguk(pillars)
      const status = evaluateGeokgukStatus(geokguk.primary, pillars)

      expect(['성격', '파격', '반성반파']).toContain(status.status)
    })

    it('factors has positive and negative arrays', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')
      const geokguk = determineGeokguk(pillars)
      const status = evaluateGeokgukStatus(geokguk.primary, pillars)

      expect(Array.isArray(status.factors.positive)).toBe(true)
      expect(Array.isArray(status.factors.negative)).toBe(true)
    })
  })

  describe('evaluateHwagiGeokguk', () => {
    it('returns hwagi evaluation object', () => {
      const pillars = createPillars('甲', '子', '己', '丑', '甲', '寅', '己', '卯')
      const result = evaluateHwagiGeokguk(pillars)

      // API returns { possible, type, conditions, description }
      expect(result).toHaveProperty('possible')
      expect(result).toHaveProperty('type')
      expect(result).toHaveProperty('conditions')
      expect(result).toHaveProperty('description')
    })

    it('possible is boolean', () => {
      const pillars = createPillars('甲', '子', '己', '丑', '甲', '寅', '己', '卯')
      const result = evaluateHwagiGeokguk(pillars)

      expect(typeof result.possible).toBe('boolean')
    })

    it('conditions object has required fields', () => {
      const pillars = createPillars('甲', '子', '己', '丑', '甲', '寅', '己', '卯')
      const result = evaluateHwagiGeokguk(pillars)

      expect(result.conditions).toHaveProperty('hasHap')
      expect(result.conditions).toHaveProperty('isDaymasterPart')
      expect(result.conditions).toHaveProperty('monthSupport')
      expect(result.conditions).toHaveProperty('noBreaker')
    })

    it('detects 갑기화토격 when conditions are met', () => {
      // 甲 and 己 together should trigger hwagi detection
      const pillars = createPillars('甲', '辰', '己', '戌', '甲', '丑', '己', '未')
      const result = evaluateHwagiGeokguk(pillars)

      // Should at least detect the 합 exists
      expect(result.conditions.hasHap).toBe(true)
    })
  })

  describe('determineGeokgukAdvanced', () => {
    it('returns extended GeokgukResult', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')
      const result = determineGeokgukAdvanced(pillars)

      expect(result).toHaveProperty('primary')
      expect(result).toHaveProperty('category')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('description')
    })

    it('handles various pillar combinations', () => {
      const testCases = [
        createPillars('甲', '子', '甲', '子', '甲', '子', '甲', '子'),
        createPillars('乙', '丑', '乙', '丑', '乙', '丑', '乙', '丑'),
        createPillars('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳'),
        createPillars('庚', '申', '辛', '酉', '壬', '戌', '癸', '亥'),
      ]

      for (const pillars of testCases) {
        const result = determineGeokgukAdvanced(pillars)
        expect(result).toBeTruthy()
        expect(result.primary).toBeTruthy()
      }
    })
  })

  describe('determineGeokgukAdvanced — month-branch sweep', () => {
    // Sweep every month branch (incl. 진술축미 잡기 months) so the advanced
    // path exercises both the 성패(statusResult) branch and the 잡기격 branch.
    const monthBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

    for (const mb of monthBranches) {
      it(`returns a coherent result for month branch ${mb}`, () => {
        const pillars = createPillars('甲', '子', '戊', mb, '丙', '寅', '丁', '卯')
        const result = determineGeokgukAdvanced(pillars)

        expect(result.primary).toBeTruthy()
        const validCategories = ['정격', '종격', '비격', '화기격국', '특수격국', '미정']
        expect(validCategories).toContain(result.category)
        expect(['high', 'medium', 'low']).toContain(result.confidence)
      })
    }

    it('attaches statusResult for 정격/비격 outcomes', () => {
      // At least one chart in the sweep should land on 정격 or 비격 and carry
      // a 성패 evaluation; verify the shape when present.
      const pillars = createPillars('甲', '子', '辛', '酉', '甲', '寅', '丙', '午')
      const result = determineGeokgukAdvanced(pillars)
      if (result.category === '정격' || result.category === '비격') {
        expect(result.statusResult).toBeDefined()
        expect(['성격', '파격', '반성반파']).toContain(result.statusResult?.status)
      } else {
        expect(result).toHaveProperty('primary')
      }
    })
  })

  describe('getStrengthScore', () => {
    it('returns a number within the 0–100 band', () => {
      const pillars = createPillars('甲', '寅', '甲', '寅', '甲', '寅', '甲', '寅')
      const score = getStrengthScore(pillars)
      expect(typeof score).toBe('number')
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('is deterministic for the same input', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')
      expect(getStrengthScore(pillars)).toBe(getStrengthScore(pillars))
    })

    it('scores a self-reinforcing chart higher than a drained one', () => {
      // day master 甲(목): a chart full of 목/수 (비겁·인성) should be stronger
      // than one surrounded by 금(관성) which controls 목.
      const strong = createPillars('甲', '寅', '甲', '寅', '甲', '寅', '甲', '寅')
      const weak = createPillars('庚', '申', '庚', '申', '甲', '申', '庚', '申')
      expect(getStrengthScore(strong)).toBeGreaterThan(getStrengthScore(weak))
    })
  })

  describe('Edge cases', () => {
    it('produces consistent results for same input', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')

      const result1 = determineGeokguk(pillars)
      const result2 = determineGeokguk(pillars)

      expect(result1.primary).toBe(result2.primary)
      expect(result1.category).toBe(result2.category)
      expect(result1.confidence).toBe(result2.confidence)
    })
  })
})
