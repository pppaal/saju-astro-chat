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
      assertNamedExports('lib/Saju/saju', ['calculateSajuData'])
      assertNamedExports('lib/Saju/pillarLookup', [
        'getYearPillar',
        'getPillarInfo',
        'getPillarByIndex',
        'getGongmang',
      ])
      assertNamedExports('lib/Saju/relations', ['analyzeRelations', 'toAnalyzeInputFromSaju'])
      assertNamedExports('lib/Saju/strengthScore', ['calculateStrengthScore'])
      assertNamedExports('lib/Saju/sibsinAnalysis', ['analyzeSibsinComprehensive'])
      assertNamedExports('lib/Saju/unse', ['getDaeunCycles', 'getAnnualCycles', 'getMonthlyCycles'])
    })

    it('should expose pillar lookup utilities', () => {
      assertNamedExports('lib/Saju/pillarLookup', [
        'getYearPillar',
        'getPillarInfo',
        'getPillarByIndex',
      ])
    })

    it('should expose unse analysis types', () => {
      assertNamedExports('lib/Saju/unseAnalysis', ['UnseType', 'UnseInfo'])
    })
  })

  describe('Supporting Module Exports', () => {
    it('should expose supporting modules', async () => {
      assertNamedExports('lib/Saju/textGenerator', ['generateFortuneText'])
      assertNamedExports('lib/Saju/compatibility', ['analyzeComprehensiveCompatibility'])
      const sajuCache = await import('@/lib/Saju/cache')
      expect(sajuCache.getSajuFromCache).toBeDefined()
      expect(sajuCache.setSajuToCache).toBeDefined()
      assertNamedExports('lib/Saju/visualizationData', ['generateElementDistribution'])
    })

    it('should expose geokguk analysis', () => {
      assertNamedExports('lib/Saju/geokguk', ['determineGeokguk', 'getGeokgukDescription'])
    })

    it('should expose tonggeun module', () => {
      assertNamedExports('lib/Saju/tonggeun', ['calculateTonggeun', 'analyzeStrength'])
    })

    it('should expose health and career analysis', () => {
      assertNamedExports('lib/Saju/healthCareer', ['analyzeHealthCareer'])
    })

    it('should expose family lineage analysis', () => {
      assertNamedExports('lib/Saju/familyLineage', ['analyzeParentChild', 'analyzeFamilyDynamic'])
    })

    it('should expose pattern matcher', () => {
      assertNamedExports('lib/Saju/patternMatcher', ['matchAllPatterns', 'analyzePatterns'])
    })

    it('should expose AI prompt generator', () => {
      assertNamedExports('lib/Saju/aiPromptGenerator', ['generateLLMPrompt', 'generateImagePrompt'])
    })
  })

  describe('Saju Calculation', () => {
    it('should calculate saju data with basic inputs and verify pillar structure', async () => {
      const { calculateSajuData } = await import('@/lib/Saju/saju')

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
      const { calculateSajuData } = await import('@/lib/Saju/saju')

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
      const { calculateSajuData } = await import('@/lib/Saju/saju')

      const result = calculateSajuData('1988-03-10', '22:00', 'male', 'lunar', 'Asia/Seoul')

      // Lunar calendar should produce valid pillars
      expect(result.pillars.year).toBeDefined()
      expect(result.pillars.month).toBeDefined()
      expect(result.pillars.day).toBeDefined()
      expect(result.pillars.time).toBeDefined()
    })

    it('should calculate saju data for different timezones', async () => {
      const { calculateSajuData } = await import('@/lib/Saju/saju')

      const seoulResult = calculateSajuData('1990-01-15', '14:30', 'male', 'solar', 'Asia/Seoul')
      const tokyoResult = calculateSajuData('1990-01-15', '14:30', 'male', 'solar', 'Asia/Tokyo')

      // Both should have valid pillars
      expect(seoulResult.pillars).toBeDefined()
      expect(tokyoResult.pillars).toBeDefined()
      expect(seoulResult.pillars.day).toBeDefined()
      expect(tokyoResult.pillars.day).toBeDefined()
    })

    it('should calculate saju data for edge case - midnight', async () => {
      const { calculateSajuData } = await import('@/lib/Saju/saju')

      const result = calculateSajuData('1995-12-31', '00:00', 'male', 'solar', 'Asia/Seoul')

      // Should have valid time pillar with heavenlyStem and earthlyBranch objects
      expect(result.pillars.time).toBeDefined()
      expect(result.pillars.time.heavenlyStem).toBeDefined()
      expect(result.pillars.time.earthlyBranch).toBeDefined()
      expect(result.pillars.time.earthlyBranch.name).toBeTruthy()
    })

    it('should calculate saju data for edge case - late night', async () => {
      const { calculateSajuData } = await import('@/lib/Saju/saju')

      const result = calculateSajuData('2000-01-01', '23:59', 'female', 'solar', 'Asia/Seoul')

      // Should have valid time pillar with heavenlyStem and earthlyBranch objects
      expect(result.pillars.time).toBeDefined()
      expect(result.pillars.time.heavenlyStem).toBeDefined()
      expect(result.pillars.time.earthlyBranch).toBeDefined()
      expect(result.pillars.time.earthlyBranch.name).toBeTruthy()
    })

    it('should produce consistent results for same input', async () => {
      const { calculateSajuData } = await import('@/lib/Saju/saju')

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
        'lib/Saju/saju',
        'lib/Saju/pillarLookup',
        'lib/Saju/relations',
        'lib/Saju/strengthScore',
        'lib/Saju/sibsinAnalysis',
        'lib/Saju/unse',
        'lib/Saju/unseAnalysis',
        'lib/Saju/textGenerator',
        'lib/Saju/compatibility',
        'lib/Saju/cache',
        'lib/Saju/visualizationData',
        'lib/Saju/geokguk',
        'lib/Saju/tonggeun',
        'lib/Saju/healthCareer',
        'lib/Saju/familyLineage',
        'lib/Saju/patternMatcher',
        'lib/Saju/aiPromptGenerator',
        'lib/Saju/advancedSajuCore',
        'lib/Saju/comprehensiveReport',
        'lib/Saju/fortuneSimulator',
      ]

      expect(modules.length).toBe(20)
      modules.forEach((modulePath) => {
        readModule(modulePath)
      })
    })

    it('should verify core calculation module exists', () => {
      const content = readModule('lib/Saju/saju')
      expect(content).toBeDefined()
      expect(content.length).toBeGreaterThan(0)
    })

    it('should verify pillar lookup module exists', () => {
      const content = readModule('lib/Saju/pillarLookup')
      expect(content).toBeDefined()
      expect(content.length).toBeGreaterThan(0)
    })

    it('should verify relations module exists', () => {
      const content = readModule('lib/Saju/relations')
      expect(content).toBeDefined()
      expect(content.length).toBeGreaterThan(0)
    })
  })

  describe('Cache Integration', () => {
    it('should have cache get and set functions', async () => {
      const sajuCache = await import('@/lib/Saju/cache')
      expect(typeof sajuCache.getSajuFromCache).toBe('function')
      expect(typeof sajuCache.setSajuToCache).toBe('function')
    })
  })

  describe('Visualization Data', () => {
    it('should expose visualization data generator', () => {
      assertNamedExports('lib/Saju/visualizationData', ['generateElementDistribution'])
    })
  })

  describe('Advanced Analysis', () => {
    it('should expose comprehensive report generator', () => {
      assertNamedExports('lib/Saju/comprehensiveReport', ['generateComprehensiveReport'])
    })

    it('should expose fortune simulator', () => {
      assertNamedExports('lib/Saju/fortuneSimulator', [
        'simulateFortuneFlow',
        'generateFortuneSnapshot',
      ])
    })

    it('should expose advanced saju core', () => {
      assertNamedExports('lib/Saju/advancedSajuCore', [
        'analyzeJonggeok',
        'performUltraAdvancedAnalysis',
      ])
    })
  })
})
