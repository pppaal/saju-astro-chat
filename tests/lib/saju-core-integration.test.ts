import { describe, it, expect } from 'vitest'
import path from 'path'
import { existsSync, readFileSync } from 'fs'

const resolveModuleFile = (modulePath: string) => {
  const basePath = path.join(process.cwd(), 'src', modulePath)
  const candidates = [
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.jsx'),
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

const readModule = (modulePath: string) => {
  const filePath = resolveModuleFile(modulePath)
  if (!filePath) {
    throw new Error(`Missing module file for ${modulePath}`)
  }
  return readFileSync(filePath, 'utf8')
}

const assertNamedExports = (modulePath: string, exportNames: string[]) => {
  const content = readModule(modulePath)
  exportNames.forEach((name) => {
    expect(content).toMatch(new RegExp(`\\b${name}\\b`))
  })
}

describe('Saju Core Integration', () => {
  describe('Core Saju Module Exports', () => {
    it('should expose core saju exports', () => {
      assertNamedExports('lib/saju/saju', ['calculateSajuData'])
      assertNamedExports('lib/saju/pillarLookup', [
        'getYearPillar',
        'getPillarInfo',
        'getPillarByIndex',
        'getGongmang',
      ])
      assertNamedExports('lib/saju/relations', ['analyzeRelations', 'toAnalyzeInputFromSaju'])
      assertNamedExports('lib/saju/strengthScore', ['calculateStrengthScore'])
      assertNamedExports('lib/saju/sibsinAnalysis', ['analyzeSibsinComprehensive'])
      assertNamedExports('lib/saju/unse', ['getAnnualCycles', 'getMonthlyCycles'])
    })

    it('should expose pillar lookup utilities', () => {
      assertNamedExports('lib/saju/pillarLookup', [
        'getYearPillar',
        'getPillarInfo',
        'getPillarByIndex',
      ])
    })
  })

  describe('Supporting Module Exports', () => {
    it('should expose supporting modules', () => {
      assertNamedExports('lib/saju/compatibility', ['analyzeComprehensiveCompatibility'])
      // saju/cache — 미사용으로 통째 삭제됨 (2025 정리)
      // visualizationData / fortuneSimulator — 미사용으로 삭제됨 (2025 정리)
      // unseAnalysis / textGenerator / familyLineage / comprehensiveReport — DEAD 정리로 삭제됨
    })

    it('should expose geokguk analysis', () => {
      assertNamedExports('lib/saju/geokguk', ['determineGeokguk', 'getGeokgukDescription'])
    })

    it('should expose tonggeun module', () => {
      assertNamedExports('lib/saju/tonggeun', ['calculateTonggeun', 'analyzeStrength'])
    })

    // healthCareer (analyzeHealthCareer) 모듈 제거됨 — 해당 export 검증 삭제.

    it('should expose pattern matcher', () => {
      assertNamedExports('lib/saju/patternMatcher', ['matchAllPatterns', 'analyzePatterns'])
    })

    // aiPromptGenerator — 미사용으로 삭제됨 (2025 정리)
  })

  describe('Saju Calculation', () => {
    it('should calculate saju data with basic inputs and verify pillar structure', async () => {
      const { calculateSajuData } = await import('@/lib/saju/saju')

      const result = calculateSajuData('1990-01-15', '14:30', 'male', 'solar', 'Asia/Seoul')

      // Verify pillars exist with stem and branch objects
      expect(result.pillars).toBeDefined()
      expect(result.pillars.year).toBeDefined()
      expect(result.pillars.month).toBeDefined()
      expect(result.pillars.day).toBeDefined()
      expect(result.pillars.time).toBeDefined()

      // Verify five elements have numeric values
      expect(result.fiveElements).toEqual(
        expect.objectContaining({
          wood: expect.any(Number),
          fire: expect.any(Number),
          earth: expect.any(Number),
          metal: expect.any(Number),
          water: expect.any(Number),
        })
      )

      // Verify element values are non-negative
      Object.values(result.fiveElements).forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0)
      })
    })

    it('should calculate saju data for female with complete structure', async () => {
      const { calculateSajuData } = await import('@/lib/saju/saju')

      const result = calculateSajuData('1985-06-20', '09:15', 'female', 'solar', 'Asia/Seoul')

      // Verify pillars have valid heavenlyStem and earthlyBranch with name property
      const validStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
      const validBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

      // Pillar structure: { heavenlyStem: { name, element, yin_yang }, earthlyBranch: { name, element, yin_yang } }
      expect(result.pillars.day.heavenlyStem).toBeDefined()
      expect(result.pillars.day.earthlyBranch).toBeDefined()
      expect(validStems).toContain(result.pillars.day.heavenlyStem.name)
      expect(validBranches).toContain(result.pillars.day.earthlyBranch.name)
    })

    it('should calculate saju data with lunar calendar correctly', async () => {
      const { calculateSajuData } = await import('@/lib/saju/saju')

      const result = calculateSajuData('1988-03-10', '22:00', 'male', 'lunar', 'Asia/Seoul')

      // Lunar calendar should produce valid pillars
      expect(result.pillars.year).toBeDefined()
      expect(result.pillars.month).toBeDefined()
      expect(result.pillars.day).toBeDefined()
      expect(result.pillars.time).toBeDefined()
    })

    it('should calculate saju data for different timezones', async () => {
      const { calculateSajuData } = await import('@/lib/saju/saju')

      const seoulResult = calculateSajuData('1990-01-15', '14:30', 'male', 'solar', 'Asia/Seoul')
      const tokyoResult = calculateSajuData('1990-01-15', '14:30', 'male', 'solar', 'Asia/Tokyo')

      // Both should have valid pillars
      expect(seoulResult.pillars).toBeDefined()
      expect(tokyoResult.pillars).toBeDefined()
      expect(seoulResult.pillars.day).toBeDefined()
      expect(tokyoResult.pillars.day).toBeDefined()
    })

    it('should calculate saju data for edge case - midnight', async () => {
      const { calculateSajuData } = await import('@/lib/saju/saju')

      const result = calculateSajuData('1995-12-31', '00:00', 'male', 'solar', 'Asia/Seoul')

      // Should have valid time pillar with heavenlyStem and earthlyBranch objects
      expect(result.pillars.time).toBeDefined()
      expect(result.pillars.time.heavenlyStem).toBeDefined()
      expect(result.pillars.time.earthlyBranch).toBeDefined()
      expect(result.pillars.time.earthlyBranch.name).toBeTruthy()
    })

    it('should calculate saju data for edge case - late night', async () => {
      const { calculateSajuData } = await import('@/lib/saju/saju')

      const result = calculateSajuData('2000-01-01', '23:59', 'female', 'solar', 'Asia/Seoul')

      // Should have valid time pillar with heavenlyStem and earthlyBranch objects
      expect(result.pillars.time).toBeDefined()
      expect(result.pillars.time.heavenlyStem).toBeDefined()
      expect(result.pillars.time.earthlyBranch).toBeDefined()
      expect(result.pillars.time.earthlyBranch.name).toBeTruthy()
    })

    it('should produce consistent results for same input', async () => {
      const { calculateSajuData } = await import('@/lib/saju/saju')

      const result1 = calculateSajuData('1990-05-15', '10:00', 'male', 'solar', 'Asia/Seoul')
      const result2 = calculateSajuData('1990-05-15', '10:00', 'male', 'solar', 'Asia/Seoul')

      // Results should be identical
      expect(result1.pillars).toEqual(result2.pillars)
      expect(result1.fiveElements).toEqual(result2.fiveElements)
    })
  })

  describe('Module File Existence', () => {
    it('should list all core module files', () => {
      const modules = [
        'lib/saju/saju',
        'lib/saju/pillarLookup',
        'lib/saju/relations',
        'lib/saju/strengthScore',
        'lib/saju/sibsinAnalysis',
        'lib/saju/unse',
        'lib/saju/compatibility',
        'lib/saju/geokguk',
        'lib/saju/tonggeun',
        'lib/saju/patternMatcher',
      ]
      // saju/cache — 미사용으로 통째 삭제됨 (2025 정리)
      // visualizationData / fortuneSimulator / aiPromptGenerator — 미사용으로 삭제됨
      // unseAnalysis / textGenerator / familyLineage / comprehensiveReport — DEAD 정리로 삭제됨
      // advancedSajuCore / advancedAnalysis — 미사용으로 통째 삭제됨 (2026-06)

      expect(modules.length).toBe(10)
      modules.forEach((modulePath) => {
        readModule(modulePath)
      })
    })

    it('should verify core calculation module exists', () => {
      const content = readModule('lib/saju/saju')
      expect(content).toBeDefined()
      expect(content.length).toBeGreaterThan(0)
    })

    it('should verify pillar lookup module exists', () => {
      const content = readModule('lib/saju/pillarLookup')
      expect(content).toBeDefined()
      expect(content.length).toBeGreaterThan(0)
    })

    it('should verify relations module exists', () => {
      const content = readModule('lib/saju/relations')
      expect(content).toBeDefined()
      expect(content.length).toBeGreaterThan(0)
    })
  })

  // Cache Integration — saju/cache 통째 삭제됨 (2025 정리)

  // Visualization Data — 미사용으로 삭제됨 (2025 정리)

  // Advanced Analysis — comprehensiveReport / fortuneSimulator / advancedSajuCore
  // 다 미사용으로 삭제됨 (2025/2026 정리). 좀비 검증 제거.
})
