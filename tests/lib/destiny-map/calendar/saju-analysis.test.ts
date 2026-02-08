import { describe, it, expect } from 'vitest'
import {
  getYearGanzhi,
  getMonthGanzhi,
  getGanzhiForDate,
  calculateSeunScore,
  calculateWolunScore,
  calculateIljinScore,
  analyzeYongsin,
  analyzeGeokguk,
  analyzeSolarReturn,
  analyzeProgressions,
} from '@/lib/destiny-map/calendar/saju-analysis'

describe('saju-analysis', () => {
  describe('getYearGanzhi', () => {
    it('should return ganzhi for a given year', () => {
      const result = getYearGanzhi(2024)
      expect(result).toHaveProperty('stem')
      expect(result).toHaveProperty('branch')
      expect(result).toHaveProperty('stemElement')
      expect(result).toHaveProperty('branchElement')
    })

    it('should return valid stems and branches', () => {
      const result = getYearGanzhi(1984)
      expect(result.stem).toBe('甲')
      expect(result.branch).toBe('子')
    })
  })

  describe('getMonthGanzhi', () => {
    it('should return ganzhi for a given year and month', () => {
      const result = getMonthGanzhi(2024, 1)
      expect(result).toHaveProperty('stem')
      expect(result).toHaveProperty('branch')
      expect(result).toHaveProperty('stemElement')
      expect(result).toHaveProperty('branchElement')
    })

    it('should handle all 12 months', () => {
      for (let month = 1; month <= 12; month++) {
        const result = getMonthGanzhi(2024, month)
        expect(result.stem).toBeDefined()
        expect(result.branch).toBeDefined()
      }
    })
  })

  describe('getGanzhiForDate', () => {
    it('should return ganzhi for a specific date', () => {
      const result = getGanzhiForDate(new Date(2024, 0, 15))
      expect(result).toHaveProperty('stem')
      expect(result).toHaveProperty('branch')
      expect(result).toHaveProperty('stemElement')
      expect(result).toHaveProperty('branchElement')
    })

    it('should return different results for different dates', () => {
      const result1 = getGanzhiForDate(new Date(2024, 0, 1))
      const result2 = getGanzhiForDate(new Date(2024, 0, 2))
      // Either stem or branch should differ for consecutive days
      const isDifferent = result1.stem !== result2.stem || result1.branch !== result2.branch
      expect(isDifferent).toBe(true)
    })
  })

  describe('calculateSeunScore', () => {
    it('should return a score result object', () => {
      const result = calculateSeunScore('wood', '子', 2024)
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('factorKeys')
      expect(result).toHaveProperty('positive')
      expect(result).toHaveProperty('negative')
    })

    it('should return numeric score', () => {
      const result = calculateSeunScore('fire', '午', 2024)
      expect(typeof result.score).toBe('number')
    })
  })

  describe('calculateWolunScore', () => {
    it('should return a score result object', () => {
      const result = calculateWolunScore('wood', '子', 2024, 6)
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('factorKeys')
      expect(result).toHaveProperty('positive')
      expect(result).toHaveProperty('negative')
    })
  })

  describe('calculateIljinScore', () => {
    it('should return a score result with ganzhi', () => {
      const result = calculateIljinScore('wood', '甲', '子', new Date(2024, 5, 15))
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('factorKeys')
      expect(result).toHaveProperty('ganzhi')
      expect(result.ganzhi).toHaveProperty('stem')
      expect(result.ganzhi).toHaveProperty('branch')
    })
  })

  describe('analyzeYongsin', () => {
    it('should return analysis result', () => {
      const ganzhi = getGanzhiForDate(new Date(2024, 5, 15))
      const result = analyzeYongsin(
        { primary: 'wood', type: '억부' },
        ganzhi,
        new Date(2024, 5, 15)
      )
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('factorKeys')
      expect(result).toHaveProperty('positive')
      expect(result).toHaveProperty('negative')
    })

    it('should handle undefined yongsin', () => {
      const ganzhi = getGanzhiForDate(new Date(2024, 5, 15))
      const result = analyzeYongsin(undefined, ganzhi, new Date(2024, 5, 15))
      expect(result.score).toBe(0)
    })
  })

  describe('analyzeGeokguk', () => {
    it('should return analysis result', () => {
      const ganzhi = getGanzhiForDate(new Date(2024, 5, 15))
      const result = analyzeGeokguk({ type: '정관격', strength: '신강' }, ganzhi, {
        day: { stem: '甲', branch: '子' },
      })
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('factorKeys')
      expect(result).toHaveProperty('positive')
      expect(result).toHaveProperty('negative')
    })

    it('should handle undefined geokguk', () => {
      const ganzhi = getGanzhiForDate(new Date(2024, 5, 15))
      const result = analyzeGeokguk(undefined, ganzhi)
      expect(result.score).toBe(0)
    })
  })

  describe('analyzeSolarReturn', () => {
    it('should return solar return analysis', () => {
      const result = analyzeSolarReturn(new Date(2024, 5, 15), 6, 15)
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('factorKeys')
      expect(result).toHaveProperty('positive')
      expect(result).toHaveProperty('isBirthday')
      expect(result).toHaveProperty('daysFromBirthday')
    })

    it('should detect birthday correctly', () => {
      const result = analyzeSolarReturn(new Date(2024, 5, 15), 6, 15)
      expect(result.isBirthday).toBe(true)
      expect(result.daysFromBirthday).toBe(0)
    })
  })

  describe('analyzeProgressions', () => {
    it('should return progression analysis', () => {
      const result = analyzeProgressions(new Date(2024, 5, 15), 1990, 'fire', 'wood')
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('factorKeys')
      expect(result).toHaveProperty('currentPhase')
    })

    it('should determine current phase based on age', () => {
      const result = analyzeProgressions(new Date(2024, 5, 15), 1990)
      expect(result.currentPhase).toBeDefined()
      expect(result.currentPhase.length).toBeGreaterThan(0)
    })
  })
})
