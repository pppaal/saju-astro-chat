import { describe, expect, it } from 'vitest'
import { buildDecisionEngine } from '@/lib/destiny-matrix/core/decisionEngine'
import type { PatternResult } from '@/lib/destiny-matrix/core/patternEngine'
import type { ScenarioResult } from '@/lib/destiny-matrix/core/scenarioEngine'
import type { StrategyEngineResult } from '@/lib/destiny-matrix/core/strategyEngine'

function makeStrategy(
  overrides: Partial<StrategyEngineResult['domainStrategies'][number]> = {}
): StrategyEngineResult {
  return {
    overallPhase: 'stabilize',
    overallPhaseLabel: 'Stabilization Phase',
    attackPercent: 48,
    defensePercent: 52,
    thesis: 'test',
    vector: { expansion: 30, volatility: 12, structure: 34 },
    vectorMode: 'v1-multi-domain',
    domainStrategies: [
      {
        domain: 'career',
        phase: 'stabilize',
        phaseLabel: 'Stabilization Phase',
        attackPercent: 48,
        defensePercent: 52,
        thesis: 'test',
        strategy: 'test',
        riskControl: 'test',
        evidenceIds: ['sig-1', 'sig-2'],
        vector: { expansion: 30, volatility: 12, structure: 34 },
        signalContributions: [],
        metrics: {
          strengthScore: 6,
          cautionScore: 6,
          balanceScore: 5,
          effectiveStrength: 6,
          effectiveCaution: 6,
          effectiveBalance: 5,
          volatility: 1.4,
          momentum: 0,
          timeActivation: 1,
        },
        ...overrides,
      },
    ],
  }
}

function makePattern(overrides: Partial<PatternResult> = {}): PatternResult {
  return {
    id: 'career_reset_rebuild',
    label: 'Career Reset Pattern',
    family: 'career_rebuild',
    profile: 'risk',
    domains: ['career'],
    score: 84,
    confidence: 0.78,
    matchedSignalIds: ['sig-1', 'sig-2'],
    matchedFamilies: ['career_rebuild', 'timing_guardrail'],
    matchedKeywords: ['career', 'reset'],
    thesis: 'test',
    risk: 'reset risk',
    activationReason: 'test',
    scenarioIds: ['role_redefinition_window'],
    blockedBy: [],
    resolvedMode: 'verify',
    domainState: 'opening',
    crossAgreement: 0.52,
    ...overrides,
  }
}

function makeScenario(overrides: Partial<ScenarioResult> = {}): ScenarioResult {
  return {
    id: 'role_redefinition_window',
    patternId: 'career_reset_rebuild',
    domain: 'career',
    branch: 'role_reset',
    title: 'Role reset',
    probability: 82,
    confidence: 0.74,
    window: '1-3m',
    timingRelevance: 0.72,
    risk: 'test',
    reversible: true,
    actions: ['a', 'b'],
    whyNow: 'timing window active',
    whyNotYet: 'verification still required',
    entryConditions: ['condition-a'],
    abortConditions: ['abort-a'],
    manifestationHints: ['start with a reversible step'],
    supportingSignalIds: ['sig-1', 'sig-2'],
    evidenceIds: ['career_reset_rebuild', 'sig-1'],
    ...overrides,
  }
}

describe('decision engine gating', () => {
  it('blocks commit_now as top option in defensive reset contexts', () => {
    const result = buildDecisionEngine({
      lang: 'ko',
      patterns: [makePattern()],
      scenarios: [makeScenario()],
      strategyEngine: makeStrategy({
        phase: 'defensive_reset',
        attackPercent: 35,
        defensePercent: 65,
        vector: { expansion: 22, volatility: 19, structure: 21 },
      }),
    })

    const commitNow = result.options.find((option) => option.action === 'commit_now')
    expect(commitNow?.gated).toBe(true)
    expect(commitNow?.gateReason).toBeTruthy()
    expect(result.topOptionId).not.toBe(commitNow?.id)
  })

  it('keeps commit_now available when expansion has enough structure', () => {
    const result = buildDecisionEngine({
      lang: 'en',
      patterns: [
        makePattern({
          id: 'career_expansion',
          label: 'Career Expansion Pattern',
          risk: 'execution risk',
          scenarioIds: ['promotion_window'],
        }),
      ],
      scenarios: [
        makeScenario({
          id: 'promotion_window',
          patternId: 'career_expansion',
          branch: 'promotion',
          probability: 90,
          confidence: 0.82,
        }),
      ],
      strategyEngine: makeStrategy({
        phase: 'expansion',
        attackPercent: 71,
        defensePercent: 29,
        vector: { expansion: 47, volatility: 10, structure: 32 },
      }),
    })

    const commitNow = result.options.find((option) => option.action === 'commit_now')
    expect(commitNow?.gated).toBe(false)
    expect(commitNow?.gateReason).toBeNull()
  })

  it('blocks commit_now when blocked by rule-layer context', () => {
    const result = buildDecisionEngine({
      lang: 'ko',
      patterns: [
        makePattern({
          id: 'relationship_activation',
          label: 'Relationship Activation Pattern',
          domains: ['relationship'],
          profile: 'upside',
          blockedBy: ['commit_now'],
          resolvedMode: 'verify',
          domainState: 'opening',
          crossAgreement: 0.31,
          scenarioIds: ['new_connection_window'],
        }),
      ],
      scenarios: [
        makeScenario({
          id: 'new_connection_window',
          patternId: 'relationship_activation',
          domain: 'relationship',
          branch: 'new_connection',
          reversible: true,
        }),
      ],
      strategyEngine: {
        ...makeStrategy(),
        domainStrategies: [
          {
            ...makeStrategy().domainStrategies[0],
            domain: 'relationship',
            phase: 'expansion_guarded',
            attackPercent: 58,
            defensePercent: 42,
            vector: { expansion: 34, volatility: 16, structure: 29 },
          },
        ],
      },
    })

    const commitNow = result.options.find(
      (option) => option.domain === 'relationship' && option.action === 'commit_now'
    )
    expect(commitNow?.gated).toBe(true)
    expect(commitNow?.gateReason).toBeTruthy()
  })

  it('prefers the focus-domain best option as top option', () => {
    const result = buildDecisionEngine({
      lang: 'en',
      patterns: [
        makePattern({
          id: 'career_expansion',
          label: 'Career Expansion Pattern',
          domains: ['career'],
          profile: 'upside',
          scenarioIds: ['promotion_window'],
          resolvedMode: 'execute',
          domainState: 'active',
          crossAgreement: 0.72,
        }),
        makePattern({
          id: 'relationship_activation',
          label: 'Relationship Activation Pattern',
          domains: ['relationship'],
          profile: 'upside',
          scenarioIds: ['new_connection_window'],
          resolvedMode: 'execute',
          domainState: 'peak',
          crossAgreement: 0.82,
        }),
      ],
      scenarios: [
        makeScenario({
          id: 'promotion_window',
          patternId: 'career_expansion',
          domain: 'career',
          branch: 'promotion',
          probability: 84,
          confidence: 0.78,
          timingRelevance: 0.76,
        }),
        makeScenario({
          id: 'new_connection_window',
          patternId: 'relationship_activation',
          domain: 'relationship',
          branch: 'new_connection',
          probability: 92,
          confidence: 0.84,
          timingRelevance: 0.86,
        }),
      ],
      strategyEngine: {
        ...makeStrategy(),
        domainStrategies: [
          {
            ...makeStrategy().domainStrategies[0],
            domain: 'career',
            phase: 'expansion_guarded',
            attackPercent: 63,
            defensePercent: 37,
            vector: { expansion: 39, volatility: 13, structure: 31 },
          },
          {
            ...makeStrategy().domainStrategies[0],
            domain: 'relationship',
            phase: 'expansion',
            attackPercent: 74,
            defensePercent: 26,
            vector: { expansion: 46, volatility: 10, structure: 29 },
            evidenceIds: ['sig-r1', 'sig-r2'],
          },
        ],
      },
    })

    expect(result.topOptionId?.startsWith('career__')).toBe(true)
  })

  it('adds richer intermediate decision actions for verify-heavy contexts', () => {
    const result = buildDecisionEngine({
      lang: 'ko',
      patterns: [
        makePattern({
          id: 'career_expansion',
          label: 'Career Expansion Pattern',
          domains: ['career'],
          profile: 'upside',
          matchedKeywords: ['career', 'authority', 'research'],
          scenarioIds: ['promotion_review_window', 'contract_negotiation_window', 'specialist_track_window'],
          resolvedMode: 'verify',
          domainState: 'active',
          crossAgreement: 0.48,
        }),
      ],
      scenarios: [
        makeScenario({
          id: 'promotion_review_window',
          patternId: 'career_expansion',
          domain: 'career',
          branch: 'promotion_review',
          probability: 86,
          confidence: 0.82,
          reversible: true,
        }),
        makeScenario({
          id: 'contract_negotiation_window',
          patternId: 'career_expansion',
          domain: 'career',
          branch: 'contract_negotiation',
          probability: 84,
          confidence: 0.8,
          reversible: true,
        }),
      ],
      strategyEngine: {
        ...makeStrategy({
          phase: 'expansion_guarded',
          attackPercent: 61,
          defensePercent: 39,
          vector: { expansion: 38, volatility: 13, structure: 30 },
        }),
      },
    })

    const review = result.options.find((option) => option.action === 'review_first')
    const negotiate = result.options.find((option) => option.action === 'negotiate_first')
    expect(review).toBeTruthy()
    expect(negotiate).toBeTruthy()
    expect(result.topOptionId).not.toBe('career__commit_now')
  })

  it('surfaces move-specific actions for route and lease-heavy move contexts', () => {
    const result = buildDecisionEngine({
      lang: 'en',
      patterns: [
        makePattern({
          id: 'move_reset',
          label: 'Move Reset Pattern',
          domains: ['move'],
          profile: 'timing',
          matchedKeywords: ['move', 'route', 'lease'],
          scenarioIds: ['route_recheck_window', 'lease_decision_window', 'basecamp_reset_window'],
          resolvedMode: 'verify',
          domainState: 'opening',
          crossAgreement: 0.46,
        }),
      ],
      scenarios: [
        makeScenario({
          id: 'route_recheck_window',
          patternId: 'move_reset',
          domain: 'move',
          branch: 'route_recheck',
          probability: 88,
          confidence: 0.84,
          timingRelevance: 0.82,
          reversible: true,
        }),
        makeScenario({
          id: 'lease_decision_window',
          patternId: 'move_reset',
          domain: 'move',
          branch: 'lease_decision',
          probability: 85,
          confidence: 0.8,
          timingRelevance: 0.79,
          reversible: true,
        }),
        makeScenario({
          id: 'basecamp_reset_window',
          patternId: 'move_reset',
          domain: 'move',
          branch: 'basecamp_reset',
          probability: 86,
          confidence: 0.81,
          timingRelevance: 0.8,
          reversible: true,
        }),
      ],
      strategyEngine: {
        ...makeStrategy({
          domain: 'move',
          phase: 'expansion_guarded',
          attackPercent: 56,
          defensePercent: 44,
          vector: { expansion: 34, volatility: 14, structure: 29 },
        }),
        domainStrategies: [
          {
            ...makeStrategy().domainStrategies[0],
            domain: 'move',
            phase: 'expansion_guarded',
            attackPercent: 56,
            defensePercent: 44,
            vector: { expansion: 34, volatility: 14, structure: 29 },
            evidenceIds: ['sig-m1', 'sig-m2'],
          },
        ],
      },
    })

    expect(result.options.some((option) => option.action === 'route_recheck_first')).toBe(true)
    expect(result.options.some((option) => option.action === 'lease_review_first')).toBe(true)
    expect(result.options.some((option) => option.action === 'basecamp_reset_first')).toBe(true)
    expect(result.topOptionId?.startsWith('move__')).toBe(true)
    expect(result.topOptionId).not.toBe('move__prepare_only')
  })
})
