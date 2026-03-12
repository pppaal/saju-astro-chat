import { describe, expect, it } from 'vitest'
import { buildCoreEnvelope } from '@/lib/destiny-matrix/core'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { FiveElement } from '@/lib/Saju/types'

function createInput(overrides: Partial<MatrixCalculationInput> = {}): MatrixCalculationInput {
  return {
    dayMasterElement: '\uBAA9' as FiveElement,
    pillarElements: ['\uBAA9', '\uD654', '\uD1A0', '\uAE08'] as FiveElement[],
    sibsinDistribution: { '\uBE44\uACAC': 2, '\uC2DD\uC2E0': 1 } as any,
    twelveStages: { '\uC7A5\uC0DD': 1, '\uC655\uC9C0': 1 } as any,
    relations: [] as any,
    planetHouses: { Sun: 1, Moon: 4, Jupiter: 10, Saturn: 6 } as any,
    planetSigns: { Sun: 'Aquarius', Moon: 'Gemini' } as any,
    aspects: [{ planet1: 'Sun', planet2: 'Moon', type: 'trine', angle: 120, orb: 1.4 }] as any,
    lang: 'ko',
    ...overrides,
  }
}

describe('buildCoreEnvelope', () => {
  it('builds a deterministic core envelope from one input', () => {
    const params = {
      mode: 'comprehensive' as const,
      lang: 'ko' as const,
      matrixInput: createInput({
        activeTransits: ['saturnReturn', 'jupiterReturn'] as any,
        currentDaeunElement: '\uC218' as FiveElement,
        currentSaeunElement: '\uD654' as FiveElement,
      }),
    }

    const first = buildCoreEnvelope(params)
    const second = buildCoreEnvelope(params)

    expect(first.coreSeed.coreHash).toBe(second.coreSeed.coreHash)
    expect(first.layerResults.layer1_elementCore).toBeDefined()
    expect(first.layerResults.layer10_extraPointElement).toBeDefined()
    expect(first.matrixReport.topInsights.length).toBeGreaterThanOrEqual(1)
    expect(first.coreSeed.canonical.claimIds.length).toBeGreaterThanOrEqual(1)
    expect(first.coreSeed.strategyEngine.attackPercent + first.coreSeed.strategyEngine.defensePercent).toBe(
      100
    )
  })
})
