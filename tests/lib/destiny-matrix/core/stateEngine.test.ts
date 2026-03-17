import { describe, expect, it } from 'vitest'
import { buildStateEngine } from '@/lib/destiny-matrix/core/stateEngine'
import type { ActivationEngineResult } from '@/lib/destiny-matrix/core/activationEngine'
import type { RuleEngineResult } from '@/lib/destiny-matrix/core/ruleEngine'

function activationDomain(
  domain: ActivationEngineResult['domains'][number]['domain'],
  activationScore: number,
  dominantAxes: string[] = []
): ActivationEngineResult['domains'][number] {
  return {
    domain,
    activationScore,
    dominantAxes,
    topSources: [],
  }
}

function ruleDomain(
  domain: RuleEngineResult['domains'][number]['domain'],
  overrides: Partial<RuleEngineResult['domains'][number]> = {}
): RuleEngineResult['domains'][number] {
  return {
    domain,
    amplify: [],
    suppress: [],
    gate: [],
    delay: [],
    convert: [],
    contradictionPenalty: 0,
    priorityScore: 0.7,
    resolvedMode: 'verify',
    ...overrides,
  }
}

describe('stateEngine', () => {
  it('pushes relationship into safer state under boundary pressure', () => {
    const result = buildStateEngine({
      lang: 'en',
      activation: {
        domains: [activationDomain('relationship', 3.6, ['bonding'])],
      },
      rules: {
        domains: [
          ruleDomain('relationship', {
            resolvedMode: 'execute',
            gate: ['forced_closeness', 'projection_bias'],
          }),
        ],
        globalNotes: [],
      },
    })

    expect(result.domains[0]?.state).toBe('consolidation')
  })

  it('promotes move when mobility support exists without route guard', () => {
    const result = buildStateEngine({
      lang: 'en',
      activation: {
        domains: [activationDomain('move', 2.8, ['mobility'])],
      },
      rules: {
        domains: [
          ruleDomain('move', {
            resolvedMode: 'execute',
            amplify: ['movement_window', 'housing_search_momentum'],
          }),
        ],
        globalNotes: [],
      },
    })

    expect(result.domains[0]?.state).toBe('peak')
  })

  it('keeps health in safer recovery-oriented state under overload pressure', () => {
    const result = buildStateEngine({
      lang: 'en',
      activation: {
        domains: [activationDomain('health', 3.8, ['recovery'])],
      },
      rules: {
        domains: [
          ruleDomain('health', {
            resolvedMode: 'prepare',
            amplify: ['recovery_protocol'],
            delay: ['high_intensity_push'],
            suppress: ['overload'],
          }),
        ],
        globalNotes: [],
      },
    })

    expect(result.domains[0]?.state).toBe('consolidation')
  })
})
