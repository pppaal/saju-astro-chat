import { describe, expect, it } from 'vitest'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import { compileFeatureTokens } from '@/lib/destiny-matrix/core/tokenCompiler'
import { buildActivationEngine } from '@/lib/destiny-matrix/core/activationEngine'

function createInput(overrides: Partial<MatrixCalculationInput> = {}): MatrixCalculationInput {
  return {
    dayMasterElement: '목' as any,
    pillarElements: ['목', '화', '토', '금'] as any,
    sibsinDistribution: { pyeonjae: 2, jeonggwan: 1 } as any,
    twelveStages: { imgwan: 1, jewang: 1 } as any,
    relations: [] as any,
    geokguk: 'jeonggwan' as any,
    yongsin: '화' as any,
    currentDaeunElement: '수' as any,
    currentSaeunElement: '화' as any,
    currentWolunElement: '목' as any,
    currentIljinElement: '금' as any,
    planetHouses: { Mercury: 10, Saturn: 6, Moon: 7, Uranus: 9 } as any,
    planetSigns: { Mercury: 'Aquarius', Saturn: 'Pisces', Moon: 'Gemini', Uranus: 'Sagittarius' } as any,
    activeTransits: ['saturnReturn', 'mercuryRetrograde', 'crossBorderMove'],
    advancedAstroSignals: {
      progressions: true,
      eclipses: true,
      fixedStars: true,
    } as any,
    astroTimingIndex: {
      decade: 0.32,
      annual: 0.51,
      monthly: 0.66,
      daily: 0.58,
      confidence: 0.82,
      evidenceCount: 5,
    },
    ...overrides,
  }
}

describe('buildActivationEngine', () => {
  it('applies timing pressure more specifically to timing and move domains than personality', () => {
    const input = createInput()
    const tokens = compileFeatureTokens(input).tokens
    const activation = buildActivationEngine({ matrixInput: input, tokens })

    const timing = activation.domains.find((domain) => domain.domain === 'timing')
    const move = activation.domains.find((domain) => domain.domain === 'move')
    const personality = activation.domains.find((domain) => domain.domain === 'personality')

    expect(timing?.timeScore || 0).toBeGreaterThan(personality?.timeScore || 0)
    expect(move?.timeScore || 0).toBeGreaterThan(personality?.timeScore || 0)
    expect(activation.globalTimePressure).toBeGreaterThan(0)
  })
})
