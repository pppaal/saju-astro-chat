import { describe, expect, it } from 'vitest'
import { buildPatternEngine } from '@/lib/destiny-matrix/core/patternEngine'
import type { SignalSynthesisResult } from '@/lib/destiny-matrix/core/signalSynthesizer'
import type { StrategyEngineResult } from '@/lib/destiny-matrix/core/strategyEngine'
import type { ActivationEngineResult } from '@/lib/destiny-matrix/core/activationEngine'
import type { RuleEngineResult } from '@/lib/destiny-matrix/core/ruleEngine'
import type { StateEngineResult } from '@/lib/destiny-matrix/core/stateEngine'

function createSynthesisFixture(): SignalSynthesisResult {
  const signals = [
    {
      id: 'L6:imgwan:H10',
      layer: 6,
      rowKey: 'imgwan',
      colKey: 'H10',
      domainHints: ['career'],
      polarity: 'strength' as const,
      score: 10,
      rankScore: 10.15,
      family: 'career_growth',
      keyword: 'career peak',
      sajuBasis: 'imgwan',
      astroBasis: 'H10',
      advice: 'focus career',
      tags: ['h10', 'career'],
    },
    {
      id: 'L5:career_conflict:square',
      layer: 5,
      rowKey: 'career_conflict',
      colKey: 'square',
      domainHints: ['career'],
      polarity: 'caution' as const,
      score: 8,
      rankScore: 8.25,
      family: 'career_guardrail',
      keyword: 'career conflict',
      sajuBasis: 'conflict',
      astroBasis: 'square',
      advice: 'verify',
      tags: ['career', 'square', 'conflict'],
    },
    {
      id: 'L10:visibility:MC',
      layer: 10,
      rowKey: 'visibility',
      colKey: 'MC',
      domainHints: ['career', 'personality'],
      polarity: 'strength' as const,
      score: 8,
      rankScore: 8.15,
      family: 'career_growth',
      keyword: 'visibility',
      sajuBasis: 'public',
      astroBasis: 'MC',
      advice: 'show work',
      tags: ['mc', 'visibility', 'career'],
    },
    {
      id: 'L4:timing:daeun',
      layer: 4,
      rowKey: 'timing',
      colKey: 'daeun',
      domainHints: ['timing', 'career'],
      polarity: 'balance' as const,
      score: 7,
      rankScore: 7,
      family: 'timing_window',
      keyword: 'timing',
      sajuBasis: 'daeun',
      astroBasis: 'return',
      advice: 'sequence',
      tags: ['timing', 'daeun'],
    },
  ]

  return {
    normalizedSignals: signals,
    selectedSignals: signals,
    claims: [
      {
        claimId: 'career_growth_with_guardrails',
        domain: 'career',
        thesis: 'career claim',
        evidence: signals.map((signal) => signal.id),
        riskControl: 'verify before commit',
        actions: ['split execution'],
      },
    ],
    signalsById: signals.reduce<Record<string, (typeof signals)[number]>>((acc, signal) => {
      acc[signal.id] = signal
      return acc
    }, {}),
    leadSignalIds: ['L6:imgwan:H10', 'L5:career_conflict:square', 'L10:visibility:MC'],
    supportSignalIds: ['L4:timing:daeun'],
    suppressedSignalIds: [],
  }
}

function createStrategyFixture(): StrategyEngineResult {
  return {
    overallPhase: 'high_tension_expansion',
    overallPhaseLabel: 'High-Tension Expansion',
    attackPercent: 61,
    defensePercent: 39,
    thesis: 'test',
    vector: { expansion: 42, volatility: 17, structure: 28 },
    vectorMode: 'v1-multi-domain',
    domainStrategies: [
      {
        domain: 'career',
        phase: 'high_tension_expansion',
        phaseLabel: 'High-Tension Expansion',
        attackPercent: 61,
        defensePercent: 39,
        thesis: 'career',
        strategy: 'career',
        riskControl: 'verify',
        evidenceIds: ['L6:imgwan:H10', 'L5:career_conflict:square'],
        vector: { expansion: 42, volatility: 17, structure: 28 },
        signalContributions: [],
        metrics: {
          strengthScore: 9,
          cautionScore: 7,
          balanceScore: 5,
          effectiveStrength: 9,
          effectiveCaution: 7,
          effectiveBalance: 5,
          volatility: 1.6,
          momentum: 2,
          timeActivation: 1.2,
        },
      },
      {
        domain: 'move',
        phase: 'expansion_guarded',
        phaseLabel: 'Guarded Expansion',
        attackPercent: 54,
        defensePercent: 46,
        thesis: 'move',
        strategy: 'move',
        riskControl: 'verify route and fit before booking',
        evidenceIds: ['L4:move:delay', 'L5:move:travel'],
        vector: { expansion: 28, volatility: 18, structure: 32 },
        signalContributions: [],
        metrics: {
          strengthScore: 4,
          cautionScore: 7,
          balanceScore: 4,
          effectiveStrength: 4,
          effectiveCaution: 7,
          effectiveBalance: 4,
          volatility: 1.7,
          momentum: -3,
          timeActivation: 1.1,
        },
      },
    ],
  }
}

function createResolvedContext(): {
  activation: ActivationEngineResult
  rules: RuleEngineResult
  states: StateEngineResult
  crossAgreement: number
} {
  return {
    activation: {
      globalTimePressure: 0.7,
      globalVerificationPressure: 0.42,
      domains: [
        {
          domain: 'career',
          natalScore: 2.2,
          timeScore: 1.8,
          modulationScore: 0.6,
          activationScore: 3.9,
          dominantAxes: ['expansion', 'verification'],
          sources: [],
        },
        {
          domain: 'move',
          natalScore: 1.4,
          timeScore: 1.2,
          modulationScore: 0.5,
          activationScore: 2.6,
          dominantAxes: ['mobility', 'verification'],
          sources: [],
        },
      ],
    },
    rules: {
      globalNotes: ['verification_pressure_high'],
      domains: [
        {
          domain: 'career',
          amplify: ['expansion'],
          suppress: [],
          gate: ['commit_now'],
          delay: [],
          convert: [],
          contradictionPenalty: 0.18,
          priorityScore: 3.72,
          resolvedMode: 'verify',
        },
        {
          domain: 'move',
          amplify: [],
          suppress: ['overextension'],
          gate: ['commit_now'],
          delay: ['high_intensity_push'],
          convert: ['move_fast -> staged_move'],
          contradictionPenalty: 0.2,
          priorityScore: 2.4,
          resolvedMode: 'prepare',
        },
      ],
    },
    states: {
      domains: [
        { domain: 'career', state: 'active', rationale: 'test' },
        { domain: 'move', state: 'consolidation', rationale: 'test' },
      ],
    },
    crossAgreement: 0.62,
  }
}

describe('buildPatternEngine prioritization', () => {
  it('prefers composite pattern and suppresses redundant base siblings', () => {
    const patterns = buildPatternEngine(
      createSynthesisFixture(),
      createStrategyFixture(),
      createResolvedContext()
    )

    expect(patterns[0]?.matchedFamilies.length).toBeGreaterThan(0)

    const careerPatterns = patterns.filter((pattern) => pattern.domains.includes('career'))
    expect(careerPatterns.length).toBeLessThanOrEqual(2)
    expect(
      careerPatterns.some((pattern) => pattern.id.startsWith('composite_')) ||
        careerPatterns.every((pattern) => pattern.matchedFamilies.length > 0)
    ).toBe(true)
  })

  it('detects movement guardrail patterns from move caution signals', () => {
    const synthesis = createSynthesisFixture()
    const moveSignals = [
      {
        id: 'L4:move:delay',
        layer: 4,
        rowKey: 'move_timing',
        colKey: 'delay',
        domainHints: ['move', 'timing'],
        polarity: 'caution' as const,
        score: 7,
        rankScore: 7.25,
        family: 'movement_guardrail',
        keyword: 'travel verification',
        sajuBasis: 'move caution',
        astroBasis: 'h9 square',
        advice: 'verify route first',
        tags: ['move', 'travel', 'verify', 'h9'],
      },
      {
        id: 'L5:move:travel',
        layer: 5,
        rowKey: 'travel',
        colKey: 'foreign',
        domainHints: ['move'],
        polarity: 'caution' as const,
        score: 6,
        rankScore: 6.25,
        family: 'movement_guardrail',
        keyword: 'relocation caution',
        sajuBasis: 'travel strain',
        astroBasis: 'h12',
        advice: 'slow the move',
        tags: ['move', 'relocat', 'foreign', 'h12'],
      },
    ]
    synthesis.normalizedSignals = [...synthesis.normalizedSignals, ...moveSignals]
    synthesis.selectedSignals = [...synthesis.selectedSignals, ...moveSignals]

    const patterns = buildPatternEngine(synthesis, createStrategyFixture(), createResolvedContext())
    expect(
      patterns.some(
        (pattern) =>
          pattern.domains.includes('move') &&
          pattern.profile === 'risk' &&
          pattern.matchedFamilies.some((family) => family.includes('movement_guardrail'))
      )
    ).toBe(true)
  })

  it('attaches resolved mode, state, and cross-agreement to matched patterns', () => {
    const patterns = buildPatternEngine(
      createSynthesisFixture(),
      createStrategyFixture(),
      createResolvedContext()
    )

    const careerPattern = patterns.find((pattern) => pattern.domains.includes('career'))
    expect(careerPattern?.resolvedMode).toBeTruthy()
    expect(careerPattern?.domainState).toBeTruthy()
    expect(typeof careerPattern?.crossAgreement).toBe('number')
    expect(Array.isArray(careerPattern?.blockedBy)).toBe(true)
  })
})
