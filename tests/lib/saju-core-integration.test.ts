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
      assertNamedExports('lib/Saju/tonggeun', ['Tonggeun'])
    })

    it('should expose health and career analysis', () => {
      assertNamedExports('lib/Saju/healthCareer', ['analyzeHealthCareer'])
    })

    it('should expose family lineage analysis', () => {
      assertNamedExports('lib/Saju/familyLineage', ['analyzeParentChild', 'analyzeFamilyDynamic'])
    })

    it('should expose pattern matcher', () => {
      assertNamedExports('lib/Saju/patternMatcher', ['PatternMatcher'])
    })

    it('should expose AI prompt generator', () => {
      assertNamedExports('lib/Saju/aiPromptGenerator', ['generateLLMPrompt', 'generateImagePrompt'])
    })
  })

  describe('Saju Calculation', () => {
    it('should calculate saju data with basic inputs', async () => {
      const { calculateSajuData } = await import('@/lib/Saju/saju')

      const result = calculateSajuData('1990-01-15', '14:30', 'male', 'solar', 'Asia/Seoul')

      expect(result).toBeDefined()
      expect(result.pillars).toHaveProperty('year')
      expect(result.pillars).toHaveProperty('month')
      expect(result.pillars).toHaveProperty('day')
      expect(result.pillars).toHaveProperty('time')
      expect(result.fiveElements).toHaveProperty('wood')
      expect(result.fiveElements).toHaveProperty('fire')
      expect(result.fiveElements).toHaveProperty('earth')
      expect(result.fiveElements).toHaveProperty('metal')
      expect(result.fiveElements).toHaveProperty('water')
    })

    it('should calculate saju data for female', async () => {
      const { calculateSajuData } = await import('@/lib/Saju/saju')

      const result = calculateSajuData('1985-06-20', '09:15', 'female', 'solar', 'Asia/Seoul')

      expect(result).toBeDefined()
      expect(result.pillars).toBeDefined()
      expect(result.fiveElements).toBeDefined()
    })

    it('should calculate saju data with lunar calendar', async () => {
      const { calculateSajuData } = await import('@/lib/Saju/saju')

      const result = calculateSajuData('1988-03-10', '22:00', 'male', 'lunar', 'Asia/Seoul')

      expect(result).toBeDefined()
      expect(result.pillars).toBeDefined()
    })

    it('should calculate saju data for different timezones', async () => {
      const { calculateSajuData } = await import('@/lib/Saju/saju')

      const seoulResult = calculateSajuData('1990-01-15', '14:30', 'male', 'solar', 'Asia/Seoul')

      const tokyoResult = calculateSajuData('1990-01-15', '14:30', 'male', 'solar', 'Asia/Tokyo')

      expect(seoulResult).toBeDefined()
      expect(tokyoResult).toBeDefined()
    })

    it('should calculate saju data for edge case - midnight', async () => {
      const { calculateSajuData } = await import('@/lib/Saju/saju')

      const result = calculateSajuData('1995-12-31', '00:00', 'male', 'solar', 'Asia/Seoul')

      expect(result).toBeDefined()
      expect(result.pillars).toBeDefined()
    })

    it('should calculate saju data for edge case - late night', async () => {
      const { calculateSajuData } = await import('@/lib/Saju/saju')

      const result = calculateSajuData('2000-01-01', '23:59', 'female', 'solar', 'Asia/Seoul')

      expect(result).toBeDefined()
      expect(result.pillars).toBeDefined()
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
