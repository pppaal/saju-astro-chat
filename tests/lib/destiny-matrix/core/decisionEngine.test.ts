import { describe, expect, it } from 'vitest'
import { buildDecisionEngine } from '@/lib/destiny-matrix/core/decisionEngine'
import type { PatternResult } from '@/lib/destiny-matrix/core/patternEngine'
import type { ScenarioResult } from '@/lib/destiny-matrix/core/scenarioEngine'
import type { StrategyEngineResult } from '@/lib/destiny-matrix/ai-report/strategyEngine'

function makeStrategy(
  phase: StrategyEngineResult['overallPhase'],
  attackPercent: number,
  defensePercent: number,
  volatility: number
): StrategyEngineResult {
  return {
    overallPhase: phase,
    overallPhaseLabel: phase,
    attackPercent,
    defensePercent,
    thesis: 'test',
    vector: { expansion: 66, volatility, structure: 68 },
    vectorMode: 'v1-multi-domain',
    domainStrategies: [
      {
        domain: 'career',
        phase,
        phaseLabel: phase,
        attackPercent,
        defensePercent,
        thesis: 'career',
        strategy: 'career',
        riskControl: 'risk',
        evidenceIds: ['SIG_A', 'SIG_B'],
        vector: { expansion: 66, volatility, structure: 68 },
        signalContributions: [],
        metrics: {
          strengthScore: 74,
          cautionScore: 52,
          balanceScore: 58,
          effectiveStrength: 74,
          effectiveCaution: 52,
          effectiveBalance: 58,
          volatility: 1.2,
          momentum: 22,
          timeActivation: 1.1,
        },
      },
    ],
  }
}

function makePatterns(risky: boolean): PatternResult[] {
  return [
    {
      id: 'career_expansion',
      label: 'Career Expansion',
      domains: ['career'],
      score: 84,
      confidence: 0.78,
      matchedSignalIds: ['SIG_A'],
      matchedKeywords: ['career'],
      thesis: 'upside',
      risk: risky ? 'conflict risk' : 'manageable',
      activationReason: 'test',
      scenarioIds: ['promotion_window'],
    },
    {
      id: risky ? 'career_reset_rebuild' : 'leadership_emergence',
      label: risky ? 'Career Reset' : 'Leadership Emergence',
      domains: ['career'],
      score: 71,
      confidence: 0.65,
      matchedSignalIds: ['SIG_B'],
      matchedKeywords: ['career'],
      thesis: 'support',
      risk: risky ? 'defensive reset risk' : 'low risk',
      activationReason: 'test',
      scenarioIds: ['job_change_window'],
    },
  ]
}

function makeScenarios(): ScenarioResult[] {
  return [
    {
      id: 'promotion_window',
      patternId: 'career_expansion',
      domain: 'career',
      branch: 'promotion',
      title: 'Promotion',
      probability: 79,
      confidence: 0.74,
      window: '1-3m',
      risk: 'scope drift',
      actions: ['scope'],
    },
    {
      id: 'job_change_window',
      patternId: 'career_expansion',
      domain: 'career',
      branch: 'job_change',
      title: 'Job change',
      probability: 72,
      confidence: 0.69,
      window: '3-6m',
      risk: 'timing',
      actions: ['timing'],
    },
  ]
}

describe('buildDecisionEngine', () => {
  it('prefers staged/prepare options in high tension phases', () => {
    const result = buildDecisionEngine({
      lang: 'ko',
      patterns: makePatterns(true),
      scenarios: makeScenarios(),
      strategyEngine: makeStrategy('high_tension_expansion', 72, 28, 74),
    })

    expect(result.mode).toBe('option-comparison-v1')
    expect(result.options.length).toBeGreaterThanOrEqual(3)
    const top = result.options[0]
    expect(top.domain).toBe('career')
    expect(top.action === 'staged_commit' || top.action === 'prepare_only').toBe(true)
  })

  it('keeps execution-first options on top when volatility is low in expansion phase', () => {
    const result = buildDecisionEngine({
      lang: 'en',
      patterns: makePatterns(false),
      scenarios: makeScenarios(),
      strategyEngine: makeStrategy('expansion', 80, 20, 24),
    })

    expect(
      result.topOptionId === 'career__commit_now' || result.topOptionId === 'career__staged_commit'
    ).toBe(true)
    const top = result.options[0]
    expect(top.action).not.toBe('prepare_only')
    expect(top.scores.total).toBeGreaterThan(60)
  })
})
