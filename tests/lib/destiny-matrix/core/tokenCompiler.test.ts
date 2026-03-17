import { describe, expect, it } from 'vitest'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import { compileFeatureTokens } from '@/lib/destiny-matrix/core/tokenCompiler'

function createInput(): MatrixCalculationInput {
  return {
    dayMasterElement: '금' as any,
    pillarElements: ['목', '목', '화', '토'] as any,
    sibsinDistribution: { 편재: 2, 정관: 1, 정인: 1 } as any,
    twelveStages: { 제왕: 1, 건록: 1, 병: 1 } as any,
    relations: [
      { kind: 'harmony', detail: 'samhap', note: 'support' },
      { kind: 'clash', detail: 'wonjin', note: 'tension' },
    ] as any,
    geokguk: 'jeonggwan' as any,
    yongsin: '화' as any,
    currentDaeunElement: '수' as any,
    currentSaeunElement: '화' as any,
    currentWolunElement: '목' as any,
    currentIljinElement: '금' as any,
    currentIljinDate: '2026-03-14',
    shinsalList: ['화개', '역마', '천을귀인'] as any,
    dominantWesternElement: 'air',
    planetHouses: { Sun: 1, Moon: 7, Jupiter: 10, Saturn: 6 } as any,
    planetSigns: { Sun: 'Aquarius', Moon: 'Gemini', Jupiter: 'Sagittarius', Saturn: 'Pisces' } as any,
    aspects: [
      { planet1: 'Sun', planet2: 'Jupiter', type: 'trine' as any },
      { planet1: 'Moon', planet2: 'Saturn', type: 'square' as any },
    ],
    activeTransits: ['saturnReturn', 'mercuryRetrograde'],
    asteroidHouses: { Juno: 7, Ceres: 2 } as any,
    extraPointSigns: { Chiron: 'Cancer', Vertex: 'Libra' } as any,
    advancedAstroSignals: {
      solarReturn: true,
      progressions: { secondary: true, station: 'direct' },
      eclipses: [{ sign: 'Aries', house: 7 }],
      draconic: { moon: 'Pisces' },
      asteroids: { Juno: { aspect: 'trine' } },
    },
    sajuSnapshot: {
      unse: { daeun: [] },
      pillars: { day: '신미' },
      advancedAnalysis: { geokguk: '정관' },
    },
    astrologySnapshot: {
      natalChart: { asc: 'Aquarius' },
      natalAspects: [],
      transits: [],
    },
    crossSnapshot: {
      crossAgreement: 0.68,
      crossEvidence: ['career'],
      astroTimingIndex: { annual: 0.8 },
    },
    profileContext: {
      birthDate: '1995-02-09',
      birthTime: '06:40',
      birthCity: 'Seoul',
      timezone: 'Asia/Seoul',
      houseSystem: 'placidus',
    },
    currentDateIso: '2026-03-15',
    startYearMonth: '2026-03',
    lang: 'ko',
  }
}

describe('compileFeatureTokens', () => {
  it('covers broad saju/astro/cross inputs instead of only a narrow subset', () => {
    const compiled = compileFeatureTokens(createInput())

    expect(compiled.tokens.length).toBeGreaterThan(25)
    expect(compiled.sourceCoverage.day_master).toBe(1)
    expect(compiled.sourceCoverage.pillar_element).toBeGreaterThanOrEqual(1)
    expect(compiled.sourceCoverage.dominant_element).toBe(1)
    expect(compiled.sourceCoverage.sibsin).toBeGreaterThanOrEqual(3)
    expect(compiled.sourceCoverage.twelve_stage).toBeGreaterThanOrEqual(3)
    expect(compiled.sourceCoverage.relation).toBeGreaterThanOrEqual(2)
    expect(compiled.sourceCoverage.planet_house).toBeGreaterThanOrEqual(4)
    expect(compiled.sourceCoverage.planet_sign).toBeGreaterThanOrEqual(4)
    expect(compiled.sourceCoverage.asteroid_house).toBeGreaterThanOrEqual(2)
    expect(compiled.sourceCoverage.extra_point).toBeGreaterThanOrEqual(2)
    expect(compiled.sourceCoverage.advanced_astro).toBeGreaterThanOrEqual(7)
    expect(compiled.sourceCoverage.snapshot).toBeGreaterThanOrEqual(12)
    expect(compiled.domainCoverage.career).toBeGreaterThan(0)
    expect(compiled.domainCoverage.relationship).toBeGreaterThan(0)
    expect(compiled.domainCoverage.wealth).toBeGreaterThan(0)
    expect(compiled.domainCoverage.health).toBeGreaterThan(0)
    expect(compiled.domainCoverage.move).toBeGreaterThan(0)
    expect(compiled.domainCoverage.spirituality).toBeGreaterThan(0)
    expect(compiled.tokens.some((token) => token.id === 'advanced:progressions.secondary')).toBe(true)
    expect(compiled.tokens.some((token) => token.id === 'advanced:eclipses[].house')).toBe(true)
    expect(compiled.tokens.some((token) => token.id === 'profileContext:birthCity')).toBe(true)
    expect(compiled.tokens.some((token) => token.id === 'crossSnapshot:astroTimingIndex.annual')).toBe(true)
  })
})
