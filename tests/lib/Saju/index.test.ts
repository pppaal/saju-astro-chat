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

    it('should calculate saju data for a valid date', () => {
      const result = calculateSajuData('1990-05-15', '14:30', 'male', 'solar', 'Asia/Seoul')

      expect(result).toBeDefined()
      expect(result.pillars).toBeDefined()
      expect(result.pillars.year).toBeDefined()
      expect(result.pillars.month).toBeDefined()
      expect(result.pillars.day).toBeDefined()
      expect(result.pillars.time).toBeDefined()
    })

    it('should return five elements distribution', () => {
      const result = calculateSajuData('1985-03-20', '09:00', 'female', 'solar', 'Asia/Seoul')

      expect(result.fiveElements).toBeDefined()
      expect(result.fiveElements.wood).toBeGreaterThanOrEqual(0)
      expect(result.fiveElements.fire).toBeGreaterThanOrEqual(0)
      expect(result.fiveElements.earth).toBeGreaterThanOrEqual(0)
      expect(result.fiveElements.metal).toBeGreaterThanOrEqual(0)
      expect(result.fiveElements.water).toBeGreaterThanOrEqual(0)
    })

    it('should handle lunar calendar input', () => {
      const result = calculateSajuData('1988-01-15', '12:00', 'male', 'lunar', 'Asia/Seoul')

      expect(result).toBeDefined()
      expect(result.pillars).toBeDefined()
    })

    it('should handle different timezones', () => {
      const seoulResult = calculateSajuData('1990-01-01', '00:00', 'male', 'solar', 'Asia/Seoul')
      const tokyoResult = calculateSajuData('1990-01-01', '00:00', 'male', 'solar', 'Asia/Tokyo')

      expect(seoulResult).toBeDefined()
      expect(tokyoResult).toBeDefined()
    })

    it('should handle edge case - midnight', () => {
      const result = calculateSajuData('2000-06-15', '00:00', 'female', 'solar', 'Asia/Seoul')

      expect(result).toBeDefined()
      expect(result.pillars.time).toBeDefined()
    })

    it('should handle edge case - late night (23:30)', () => {
      const result = calculateSajuData('1995-12-31', '23:30', 'male', 'solar', 'Asia/Seoul')

      expect(result).toBeDefined()
      expect(result.pillars).toBeDefined()
    })
  })

  describe('analyzeStrength', () => {
    it('should be a function', () => {
      expect(typeof analyzeStrength).toBe('function')
    })

    it('should analyze strength for given pillars', () => {
      // Use calculateSajuData to get proper pillar structure
      const sajuData = calculateSajuData('1990-05-15', '14:30', 'male', 'solar', 'Asia/Seoul')
      const dayMaster = sajuData.pillars.day.heavenlyStem
      const pillars = {
        yearPillar: {
          heavenlyStem: sajuData.pillars.year.heavenlyStem,
          earthlyBranch: sajuData.pillars.year.earthlyBranch,
        },
        monthPillar: {
          heavenlyStem: sajuData.pillars.month.heavenlyStem,
          earthlyBranch: sajuData.pillars.month.earthlyBranch,
        },
        dayPillar: {
          heavenlyStem: sajuData.pillars.day.heavenlyStem,
          earthlyBranch: sajuData.pillars.day.earthlyBranch,
        },
        timePillar: {
          heavenlyStem: sajuData.pillars.time.heavenlyStem,
          earthlyBranch: sajuData.pillars.time.earthlyBranch,
        },
      }

      const result = analyzeStrength(dayMaster, pillars)

      expect(result).toBeDefined()
      expect(typeof result.score).toBe('number')
    })
  })

  describe('STEMS constant', () => {
    it('should contain 10 heavenly stems', () => {
      expect(STEMS).toHaveLength(10)
    })

    it('should contain valid stems', () => {
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

    it('should have correct element for each stem', () => {
      const woodStems = STEMS.filter((s) => s.element === '목')
      const fireStems = STEMS.filter((s) => s.element === '화')
      const earthStems = STEMS.filter((s) => s.element === '토')
      const metalStems = STEMS.filter((s) => s.element === '금')
      const waterStems = STEMS.filter((s) => s.element === '수')

      expect(woodStems).toHaveLength(2) // 甲, 乙
      expect(fireStems).toHaveLength(2) // 丙, 丁
      expect(earthStems).toHaveLength(2) // 戊, 己
      expect(metalStems).toHaveLength(2) // 庚, 辛
      expect(waterStems).toHaveLength(2) // 壬, 癸
    })

    it('should have yin/yang polarity', () => {
      const yangStems = STEMS.filter((s) => s.yin_yang === '양')
      const yinStems = STEMS.filter((s) => s.yin_yang === '음')

      expect(yangStems).toHaveLength(5)
      expect(yinStems).toHaveLength(5)
    })
  })

  describe('BRANCHES constant', () => {
    it('should contain 12 earthly branches', () => {
      expect(BRANCHES).toHaveLength(12)
    })

    it('should contain valid branches', () => {
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

    it('should have correct elements for branches', () => {
      const ratBranch = BRANCHES.find((b) => b.name === '子')
      const tigerBranch = BRANCHES.find((b) => b.name === '寅')
      const dragonBranch = BRANCHES.find((b) => b.name === '辰')

      // BRANCHES have element and yin_yang, not animal
      expect(ratBranch?.element).toBe('수')
      expect(tigerBranch?.element).toBe('목')
      expect(dragonBranch?.element).toBe('토')
    })

    it('should have elements assigned to branches', () => {
      BRANCHES.forEach((branch) => {
        expect(['목', '화', '토', '금', '수']).toContain(branch.element)
      })
    })
  })

  describe('getPillarInfo', () => {
    it('should be a function', () => {
      expect(typeof getPillarInfo).toBe('function')
    })

    it('should return pillar info for valid stem and branch', () => {
      const info = getPillarInfo('甲', '子')

      expect(info).toBeDefined()
    })

    it('should return info for different stem-branch combinations', () => {
      const combinations = [
        { stem: '甲', branch: '子' },
        { stem: '乙', branch: '丑' },
        { stem: '丙', branch: '寅' },
        { stem: '庚', branch: '午' },
      ]

      combinations.forEach(({ stem, branch }) => {
        const info = getPillarInfo(stem, branch)
        expect(info).toBeDefined()
      })
    })
  })

  describe('analyzeSibsinPositions', () => {
    it('should be a function', () => {
      expect(typeof analyzeSibsinPositions).toBe('function')
    })

    it('should analyze sibsin for given pillars', () => {
      const pillars = {
        year: { stem: '庚', branch: '午' },
        month: { stem: '戊', branch: '寅' },
        day: { stem: '甲', branch: '子' },
        hour: { stem: '丙', branch: '寅' },
      }

      const result = analyzeSibsinPositions(pillars)

      expect(result).toBeDefined()
    })
  })

  describe('STEM_LABELS', () => {
    it('should be defined', () => {
      expect(STEM_LABELS).toBeDefined()
    })

    it('should have labels for all stems', () => {
      const stemNames = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

      stemNames.forEach((stem) => {
        expect(STEM_LABELS[stem]).toBeDefined()
      })
    })

    it('should have hangul and roman transliterations', () => {
      const label = STEM_LABELS['甲']

      expect(label.hangul).toBeDefined()
      expect(label.roman).toBeDefined()
      expect(typeof label.hangul).toBe('string')
      expect(typeof label.roman).toBe('string')
    })
  })

  describe('BRANCH_LABELS', () => {
    it('should be defined', () => {
      expect(BRANCH_LABELS).toBeDefined()
    })

    it('should have labels for all branches', () => {
      const branchNames = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

      branchNames.forEach((branch) => {
        expect(BRANCH_LABELS[branch]).toBeDefined()
      })
    })

    it('should have hangul and roman transliterations', () => {
      const label = BRANCH_LABELS['子']

      expect(label.hangul).toBeDefined()
      expect(label.roman).toBeDefined()
      expect(typeof label.hangul).toBe('string')
      expect(typeof label.roman).toBe('string')
    })
  })

  describe('Calculation Consistency', () => {
    it('should return consistent results for same input', () => {
      const input = {
        date: '1990-05-15',
        time: '14:30',
        gender: 'male' as const,
        calendar: 'solar' as const,
        timezone: 'Asia/Seoul',
      }

      const result1 = calculateSajuData(
        input.date,
        input.time,
        input.gender,
        input.calendar,
        input.timezone
      )
      const result2 = calculateSajuData(
        input.date,
        input.time,
        input.gender,
        input.calendar,
        input.timezone
      )

      // PillarData has heavenlyStem and earthlyBranch objects with name property
      expect(result1.pillars.year.heavenlyStem.name).toBe(result2.pillars.year.heavenlyStem.name)
      expect(result1.pillars.year.earthlyBranch.name).toBe(result2.pillars.year.earthlyBranch.name)
      expect(result1.pillars.month.heavenlyStem.name).toBe(result2.pillars.month.heavenlyStem.name)
      expect(result1.pillars.month.earthlyBranch.name).toBe(result2.pillars.month.earthlyBranch.name)
      expect(result1.pillars.day.heavenlyStem.name).toBe(result2.pillars.day.heavenlyStem.name)
      expect(result1.pillars.day.earthlyBranch.name).toBe(result2.pillars.day.earthlyBranch.name)
    })

    it('should return different pillars for different dates', () => {
      const result1 = calculateSajuData('1990-01-01', '12:00', 'male', 'solar', 'Asia/Seoul')
      const result2 = calculateSajuData('1991-01-01', '12:00', 'male', 'solar', 'Asia/Seoul')

      // Year pillars should be different for different years
      expect(result1.pillars.year.heavenlyStem.name).not.toBe(result2.pillars.year.heavenlyStem.name)
    })
  })
})
