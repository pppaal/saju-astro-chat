import { describe, expect, it } from 'vitest'
import {
  shouldForceComprehensiveNarrativeFallback,
  shouldForceThemedNarrativeFallback,
} from '@/lib/destiny-matrix/ai-report/aiReportServicePolishSupport'

describe('aiReportServicePolishSupport hard gates', () => {
  it('forces themed fallback on blocking core-quality warnings', () => {
    expect(
      shouldForceThemedNarrativeFallback({
        tokenIntegrityPass: true,
        structurePass: true,
        forbiddenAdditionsPass: true,
        evidenceCoverageRatio: 0.9,
        minEvidenceSatisfiedRatio: 0.9,
        scenarioBundleCoverage: 0.9,
        genericAdviceDensity: 0.1,
        personalizationDensity: 0.9,
        coreQualityScore: 96,
        coreQualityBlockingWarningCount: 1,
        coreQualityPass: false,
      })
    ).toBe(true)
  })

  it('forces comprehensive fallback when a critical domain is missing from event coverage', () => {
    expect(
      shouldForceComprehensiveNarrativeFallback({
        tokenIntegrityPass: true,
        structurePass: true,
        forbiddenAdditionsPass: true,
        evidenceCoverageRatio: 0.9,
        genericAdviceDensity: 0.1,
        eventCountByDomain: {
          career: 1,
          love: 1,
          money: 1,
          health: 1,
          move: 0,
          timing: 6,
          life: 4,
        },
      })
    ).toBe(true)
  })
})
