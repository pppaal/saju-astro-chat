import { describe, it, expect } from 'vitest'
import {
  calculateSajuData,
  analyzeStrength,
  STEMS,
  BRANCHES,
  getPillarInfo,
  STEM_LABELS,
  BRANCH_LABELS,
  analyzeSibsinPositions,
} from '@/lib/Saju'

describe('Saju/index exports', () => {
  describe('calculateSajuData', () => {
    it('should be a function', () => {
      expect(typeof calculateSajuData).toBe('function')
    })
  })

  describe('analyzeStrength', () => {
    it('should be a function', () => {
      expect(typeof analyzeStrength).toBe('function')
    })
  })

  describe('STEMS constant', () => {
    it('should contain 10 heavenly stems', () => {
      expect(STEMS).toHaveLength(10)
    })

    it('should contain valid stems', () => {
      // STEMS is an array of StemBranchInfo objects, not strings
      const stemNames = STEMS.map((s) => s.name)
      expect(stemNames).toContain('甲')
      expect(stemNames).toContain('乙')
      expect(stemNames).toContain('丙')
      expect(stemNames).toContain('丁')
      expect(stemNames).toContain('戊')
      expect(stemNames).toContain('己')
      expect(stemNames).toContain('庚')
      expect(stemNames).toContain('辛')
      expect(stemNames).toContain('壬')
      expect(stemNames).toContain('癸')
    })
  })

  describe('BRANCHES constant', () => {
    it('should contain 12 earthly branches', () => {
      expect(BRANCHES).toHaveLength(12)
    })

    it('should contain valid branches', () => {
      // BRANCHES is an array of StemBranchInfo objects, not strings
      const branchNames = BRANCHES.map((b) => b.name)
      expect(branchNames).toContain('子')
      expect(branchNames).toContain('丑')
      expect(branchNames).toContain('寅')
      expect(branchNames).toContain('卯')
      expect(branchNames).toContain('辰')
      expect(branchNames).toContain('巳')
      expect(branchNames).toContain('午')
      expect(branchNames).toContain('未')
      expect(branchNames).toContain('申')
      expect(branchNames).toContain('酉')
      expect(branchNames).toContain('戌')
      expect(branchNames).toContain('亥')
    })
  })

  describe('getPillarInfo', () => {
    it('should be a function', () => {
      expect(typeof getPillarInfo).toBe('function')
    })
  })

  describe('analyzeSibsinPositions', () => {
    it('should be a function', () => {
      // getSipsin is not exported, use analyzeSibsinPositions instead
      expect(typeof analyzeSibsinPositions).toBe('function')
    })
  })

  describe('STEM_LABELS', () => {
    it('should be defined', () => {
      expect(STEM_LABELS).toBeDefined()
    })
  })

  describe('BRANCH_LABELS', () => {
    it('should be defined', () => {
      expect(BRANCH_LABELS).toBeDefined()
    })
  })
})
