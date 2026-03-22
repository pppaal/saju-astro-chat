import { describe, expect, it } from 'vitest'
import { buildScenarioEngine } from '@/lib/destiny-matrix/core/scenarioEngine'
import type { PatternResult } from '@/lib/destiny-matrix/core/patternEngine'
import type { StrategyEngineResult } from '@/lib/destiny-matrix/core/strategyEngine'
import type { MatrixCalculationInputNormalized } from '@/lib/destiny-matrix/core/runDestinyCore'
import type { ActivationEngineResult } from '@/lib/destiny-matrix/core/activationEngine'
import type { RuleEngineResult } from '@/lib/destiny-matrix/core/ruleEngine'
import type { StateEngineResult } from '@/lib/destiny-matrix/core/stateEngine'

function createPattern(overrides: Partial<PatternResult> = {}): PatternResult {
  return {
    id: 'career_expansion',
    label: 'Career Expansion Pattern',
    family: 'career_growth',
    profile: 'upside',
    domains: ['career'],
    score: 82,
    confidence: 0.78,
    matchedSignalIds: ['sig-1', 'sig-2', 'sig-3'],
    matchedFamilies: ['career_growth', 'visibility'],
    matchedKeywords: ['career', 'h10', 'jupiter'],
    thesis: 'career expansion',
    risk: 'role clarity is required',
    activationReason: 'career strength | h10',
    scenarioIds: ['promotion_window'],
    blockedBy: [],
    resolvedMode: 'execute',
    domainState: 'active',
    crossAgreement: 0.68,
    ...overrides,
  }
}

function createStrategy(): StrategyEngineResult {
  return {
    overallPhase: 'expansion_guarded',
    overallPhaseLabel: 'Guarded Expansion',
    attackPercent: 63,
    defensePercent: 37,
    thesis: 'test',
    vector: { expansion: 41, volatility: 12, structure: 31 },
    vectorMode: 'v1-multi-domain',
    domainStrategies: [
      {
        domain: 'career',
        phase: 'expansion_guarded',
        phaseLabel: 'Guarded Expansion',
        attackPercent: 63,
        defensePercent: 37,
        thesis: 'career',
        strategy: 'career',
        riskControl: 'verify scope before final commitment',
        evidenceIds: ['sig-1', 'sig-2', 'sig-3'],
        vector: { expansion: 41, volatility: 12, structure: 31 },
        signalContributions: [],
        metrics: {
          strengthScore: 9,
          cautionScore: 4,
          balanceScore: 5,
          effectiveStrength: 9,
          effectiveCaution: 4,
          effectiveBalance: 5,
          volatility: 1.1,
          momentum: 4,
          timeActivation: 1.15,
        },
      },
    ],
  }
}

function createInput(): MatrixCalculationInputNormalized {
  return {
    dayMasterElement: '목' as any,
    pillarElements: ['목', '화', '토', '금'] as any,
    sibsinDistribution: {} as any,
    twelveStages: {} as any,
    relations: [] as any,
    geokguk: 'jeonggwan' as any,
    yongsin: '화' as any,
    currentDaeunElement: '수' as any,
    currentSaeunElement: '화' as any,
    currentWolunElement: '목' as any,
    currentIljinElement: '금' as any,
    shinsalList: ['천을귀인'] as any,
    dominantWesternElement: 'air',
    planetHouses: {} as any,
    planetSigns: {} as any,
    aspects: [],
    activeTransits: ['jupiterReturn'],
    advancedAstroSignals: { solarReturn: true },
    crossSnapshot: {
      astroTimingIndex: {
        decade: 0.66,
        annual: 0.72,
        monthly: 0.74,
        daily: 0.61,
        confidence: 0.8,
        evidenceCount: 5,
      },
    } as any,
    profileContext: {
      birthDate: '1995-02-09',
      birthTime: '06:40',
      birthCity: 'Seoul',
      timezone: 'Asia/Seoul',
      latitude: 37.5665,
      longitude: 126.978,
      houseSystem: 'placidus',
      analysisAt: '2026-03-12T00:00:00.000Z',
    },
    availability: {
      shinsal: 'present',
      activeTransits: 'present',
      advancedAstroSignals: 'present',
    },
  } as MatrixCalculationInputNormalized
}

describe('buildScenarioEngine realism contract', () => {
  it('emits actionable scenario branches with timing and stop conditions', () => {
    const scenarios = buildScenarioEngine(
      [createPattern()],
      createStrategy(),
      createInput(),
      'ko'
    )

    expect(scenarios.length).toBeGreaterThan(0)
    expect(scenarios[0].timingRelevance).toBeGreaterThan(0.5)
    expect(['day', 'week', 'fortnight', 'month', 'season']).toContain(scenarios[0].timingGranularity)
    expect(scenarios[0].precisionReason.length).toBeGreaterThan(0)
    expect(scenarios[0].whyNow.length).toBeGreaterThan(0)
    expect(scenarios[0].whyNotYet.length).toBeGreaterThan(0)
    expect(scenarios[0].entryConditions.length).toBeGreaterThan(0)
    expect(scenarios[0].abortConditions.length).toBeGreaterThan(0)
    expect(scenarios[0].manifestationHints.length).toBeGreaterThan(0)
    expect(scenarios[0].supportingSignalIds.length).toBeGreaterThan(0)
    expect(scenarios[0].evidenceIds[0]).toBe('career_expansion')
  })

  it('caps timing precision instead of forcing exact-date claims', () => {
    const scenarios = buildScenarioEngine(
      [createPattern()],
      createStrategy(),
      createInput(),
      'ko'
    )

    const lead = scenarios[0]
    expect(lead.window).toBe('now')
    expect(['day', 'week', 'fortnight']).toContain(lead.timingGranularity)
    expect(lead.precisionReason).toMatch(/상한|정밀/)
  })

  it('covers health and move domains with concrete scenario branches', () => {
    const patterns = [
      createPattern({
        id: 'burnout_risk',
        family: 'health_guardrail',
        profile: 'risk',
        domains: ['health', 'career'],
        score: 73,
        confidence: 0.74,
        scenarioIds: [
          'schedule_reduction_window',
          'recovery_reset_window',
          'load_rebalance_window',
          'burnout_trigger_window',
          'sleep_disruption_window',
          'inflammation_window',
        ],
      }),
      createPattern({
        id: 'healing_routine_stabilization',
        family: 'health_recovery',
        profile: 'support',
        domains: ['health'],
        score: 69,
        confidence: 0.71,
        scenarioIds: ['routine_lock_window', 'recovery_window', 'habit_rebuild_window', 'early_warning_window', 'recovery_compliance_window'],
      }),
      createPattern({
        id: 'travel_relocation_activation',
        family: 'movement',
        profile: 'timing',
        domains: ['move'],
        score: 71,
        confidence: 0.72,
        scenarioIds: ['travel_window', 'relocation_window', 'foreign_link_window', 'housing_search_window', 'lease_decision_window', 'cross_border_move_window'],
      }),
      createPattern({
        id: 'movement_guardrail_window',
        family: 'movement_guardrail',
        profile: 'risk',
        domains: ['move', 'timing'],
        score: 68,
        confidence: 0.69,
        scenarioIds: ['route_recheck_window', 'travel_window', 'relocation_window', 'commute_restructure_window', 'basecamp_reset_window'],
      }),
    ]

    const scenarios = buildScenarioEngine(patterns, createStrategy(), createInput(), 'ko')
    const healthScenarios = scenarios.filter((scenario) => scenario.domain === 'health')
    const moveScenarios = scenarios.filter((scenario) => scenario.domain === 'move')

    expect(healthScenarios.some((scenario) => scenario.id === 'schedule_reduction_window')).toBe(true)
    expect(healthScenarios.some((scenario) => scenario.id === 'recovery_reset_window')).toBe(true)
    expect(healthScenarios.some((scenario) => scenario.id === 'burnout_trigger_window')).toBe(true)
    expect(healthScenarios.some((scenario) => scenario.id === 'sleep_disruption_window')).toBe(true)
    expect(healthScenarios.some((scenario) => scenario.id === 'inflammation_window')).toBe(true)
    expect(healthScenarios.some((scenario) => scenario.id === 'recovery_compliance_window')).toBe(true)
    expect(moveScenarios.some((scenario) => scenario.id === 'travel_window')).toBe(true)
    expect(moveScenarios.some((scenario) => scenario.id === 'route_recheck_window')).toBe(true)
    expect(moveScenarios.some((scenario) => scenario.id === 'housing_search_window')).toBe(true)
    expect(moveScenarios.some((scenario) => scenario.id === 'lease_decision_window')).toBe(true)
    expect(moveScenarios.some((scenario) => scenario.id === 'cross_border_move_window')).toBe(true)
    expect(moveScenarios.some((scenario) => scenario.id === 'commute_restructure_window')).toBe(true)
    expect(moveScenarios.some((scenario) => scenario.id === 'basecamp_reset_window')).toBe(true)
    expect(moveScenarios.some((scenario) => scenario.reversible === false)).toBe(true)
  })

  it('expands relationship and career ontology into finer event branches', () => {
    const patterns = [
      createPattern({
        id: 'career_expansion',
        domains: ['career'],
        scenarioIds: [
          'entry_window',
          'promotion_window',
          'promotion_review_window',
          'authority_gain_window',
          'contract_negotiation_window',
          'manager_track_window',
          'specialist_track_window',
        ],
      }),
      createPattern({
        id: 'career_reset_rebuild',
        family: 'career_guardrail',
        profile: 'risk',
        domains: ['career'],
        scenarioIds: ['role_shift_window', 'exit_preparation_window', 'restart_window', 'authority_conflict_window'],
      }),
      createPattern({
        id: 'relationship_activation',
        family: 'relationship_growth',
        profile: 'upside',
        domains: ['relationship'],
        scenarioIds: [
          'new_connection_window',
          'bond_deepening_window',
          'commitment_preparation_window',
          'commitment_execution_window',
          'cohabitation_window',
          'family_acceptance_window',
        ],
      }),
      createPattern({
        id: 'relationship_tension',
        family: 'relationship_guardrail',
        profile: 'risk',
        domains: ['relationship'],
        scenarioIds: ['distance_tuning_window', 'boundary_reset_window', 'separation_window'],
      }),
    ]

    const scenarios = buildScenarioEngine(patterns, createStrategy(), createInput(), 'ko')
    const careerScenarios = scenarios.filter((scenario) => scenario.domain === 'career')
    const relationshipScenarios = scenarios.filter((scenario) => scenario.domain === 'relationship')

    expect(careerScenarios.some((scenario) => scenario.id === 'entry_window')).toBe(true)
    expect(careerScenarios.some((scenario) => scenario.id === 'authority_gain_window')).toBe(true)
    expect(careerScenarios.some((scenario) => scenario.id === 'contract_negotiation_window')).toBe(true)
    expect(careerScenarios.some((scenario) => scenario.id === 'promotion_review_window')).toBe(true)
    expect(careerScenarios.some((scenario) => scenario.id === 'manager_track_window')).toBe(true)
    expect(careerScenarios.some((scenario) => scenario.id === 'specialist_track_window')).toBe(true)
    expect(careerScenarios.some((scenario) => scenario.id === 'role_shift_window')).toBe(true)
    expect(careerScenarios.some((scenario) => scenario.id === 'restart_window')).toBe(true)
    expect(careerScenarios.some((scenario) => scenario.id === 'authority_conflict_window')).toBe(true)

    expect(relationshipScenarios.some((scenario) => scenario.id === 'commitment_preparation_window')).toBe(true)
    expect(relationshipScenarios.some((scenario) => scenario.id === 'commitment_execution_window')).toBe(true)
    expect(relationshipScenarios.some((scenario) => scenario.id === 'cohabitation_window')).toBe(true)
    expect(relationshipScenarios.some((scenario) => scenario.id === 'family_acceptance_window')).toBe(true)
    expect(relationshipScenarios.some((scenario) => scenario.id === 'separation_window')).toBe(true)
  })

  it('expands wealth ontology into defensive and allocation events', () => {
    const patterns = [
      createPattern({
        id: 'wealth_volatility',
        family: 'wealth_guardrail',
        profile: 'risk',
        domains: ['wealth'],
        scenarioIds: ['liquidity_defense_window', 'debt_pressure_window', 'income_drop_window', 'expense_spike_window', 'debt_restructure_window'],
      }),
      createPattern({
        id: 'wealth_accumulation',
        family: 'wealth_growth',
        profile: 'upside',
        domains: ['wealth'],
        scenarioIds: ['income_growth_window', 'asset_build_window', 'pricing_power_window', 'capital_allocation_window', 'asset_exit_window'],
      }),
    ]

    const scenarios = buildScenarioEngine(patterns, createStrategy(), createInput(), 'ko')
    const wealthScenarios = scenarios.filter((scenario) => scenario.domain === 'wealth')

    expect(wealthScenarios.some((scenario) => scenario.id === 'liquidity_defense_window')).toBe(true)
    expect(wealthScenarios.some((scenario) => scenario.id === 'income_drop_window')).toBe(true)
    expect(wealthScenarios.some((scenario) => scenario.id === 'expense_spike_window')).toBe(true)
    expect(wealthScenarios.some((scenario) => scenario.id === 'debt_restructure_window')).toBe(true)
    expect(wealthScenarios.some((scenario) => scenario.id === 'pricing_power_window')).toBe(true)
    expect(wealthScenarios.some((scenario) => scenario.id === 'capital_allocation_window')).toBe(true)
    expect(wealthScenarios.some((scenario) => scenario.id === 'asset_exit_window')).toBe(true)
  })

  it('directly reflects activation, rule, and state context in scenario probability', () => {
    const pattern = createPattern({
      score: 76,
      confidence: 0.76,
      resolvedMode: 'execute',
      domainState: 'active',
      scenarioIds: ['promotion_window'],
    })

    const baseline = buildScenarioEngine([pattern], createStrategy(), createInput(), 'ko')[0]
    const resolvedContext: {
      activation: ActivationEngineResult
      rules: RuleEngineResult
      states: StateEngineResult
    } = {
      activation: {
        domains: [
          {
            domain: 'career',
            natalScore: 0.4,
            timeScore: 0.2,
            modulationScore: 0.1,
            activationScore: 0.6,
            dominantAxes: ['verification'],
            sources: [],
          },
        ],
        globalTimePressure: 0.2,
        globalVerificationPressure: 0.4,
      },
      rules: {
        domains: [
          {
            domain: 'career',
            amplify: [],
            suppress: ['overextension'],
            gate: ['commit_now'],
            delay: ['signature'],
            convert: [],
            contradictionPenalty: 0.3,
            priorityScore: 0.4,
            resolvedMode: 'prepare',
          },
        ],
        globalNotes: [],
      },
      states: {
        domains: [
          {
            domain: 'career',
            state: 'residue',
            rationale: 'test',
          },
        ],
      },
    }

    const resolved = buildScenarioEngine(
      [pattern],
      createStrategy(),
      createInput(),
      'ko',
      resolvedContext
    )[0]

    expect(resolved.probability).toBeLessThan(baseline.probability)
    expect(resolved.confidence).toBeLessThanOrEqual(baseline.confidence)
  })

  it('breaks career scenario ties using branch-specific context', () => {
    const pattern = createPattern({
      score: 64,
      confidence: 0.78,
      resolvedMode: 'verify',
      domainState: 'active',
      matchedKeywords: ['career', 'authority', 'research', 'visibility'],
      scenarioIds: [
        'entry_window',
        'promotion_review_window',
        'contract_negotiation_window',
        'manager_track_window',
        'specialist_track_window',
      ],
    })

    const scenarios = buildScenarioEngine(
      [pattern],
      createStrategy(),
      createInput(),
      'ko',
      {
        activation: {
          domains: [
            {
              domain: 'career',
              natalScore: 2.2,
              timeScore: 1.7,
              modulationScore: 0.8,
              activationScore: 3.4,
              dominantAxes: ['expansion', 'verification', 'deep_work'],
              sources: [],
            },
          ],
          globalTimePressure: 0.5,
          globalVerificationPressure: 0.6,
        },
        rules: {
          domains: [
            {
              domain: 'career',
              amplify: ['research_planning', 'strategy_planning'],
              suppress: [],
              gate: ['commit_now', 'blind_spot_commitment'],
              delay: ['finalize_terms', 'certainty -> recheck'],
              convert: [],
              contradictionPenalty: 0.08,
              priorityScore: 0.7,
              resolvedMode: 'verify',
            },
          ],
          globalNotes: [],
        },
        states: {
          domains: [
            {
              domain: 'career',
              state: 'active',
              rationale: 'test',
            },
          ],
        },
      }
    )

    const byId = new Map(scenarios.map((scenario) => [scenario.id, scenario]))
    expect(byId.get('promotion_review_window')?.probability).toBeGreaterThan(
      byId.get('entry_window')?.probability || 0
    )
    expect(byId.get('contract_negotiation_window')?.probability).toBeGreaterThan(
      byId.get('entry_window')?.probability || 0
    )
    expect(byId.get('specialist_track_window')?.confidence).toBeGreaterThan(
      byId.get('manager_track_window')?.confidence || 0
    )
  })

  it('applies timing pressure directly to timing-sensitive branches', () => {
    const patterns = [
      createPattern({
        id: 'wealth_accumulation',
        family: 'wealth_growth',
        profile: 'upside',
        domains: ['wealth'],
        score: 74,
        confidence: 0.76,
        resolvedMode: 'verify',
        domainState: 'opening',
        scenarioIds: ['income_growth_window', 'capital_allocation_window', 'asset_exit_window'],
      }),
      createPattern({
        id: 'relationship_activation',
        family: 'relationship_growth',
        profile: 'upside',
        domains: ['relationship'],
        score: 73,
        confidence: 0.75,
        resolvedMode: 'verify',
        domainState: 'opening',
        scenarioIds: ['commitment_preparation_window', 'commitment_execution_window'],
      }),
    ]

    const scenarios = buildScenarioEngine(
      patterns,
      createStrategy(),
      createInput(),
      'ko',
      {
        activation: {
          domains: [
            {
              domain: 'wealth',
              natalScore: 1.2,
              timeScore: 1.2,
              modulationScore: 0.6,
              activationScore: 3.0,
              dominantAxes: ['verification', 'transition'],
              sources: [],
            },
            {
              domain: 'relationship',
              natalScore: 1.1,
              timeScore: 1.2,
              modulationScore: 0.6,
              activationScore: 2.8,
              dominantAxes: ['verification', 'transition'],
              sources: [],
            },
          ],
          globalTimePressure: 0.7,
          globalVerificationPressure: 0.7,
        } as ActivationEngineResult,
        rules: {
          domains: [
            {
              domain: 'wealth',
              amplify: ['phase_window'],
              suppress: [],
              gate: ['commit_now'],
              delay: ['finalize_terms'],
              convert: [],
              contradictionPenalty: 0.14,
              priorityScore: 2.1,
              resolvedMode: 'verify',
            },
            {
              domain: 'relationship',
              amplify: ['transition_window'],
              suppress: [],
              gate: ['projection_bias'],
              delay: ['emotionally_loaded_decision', 'slow_trust_build'],
              convert: [],
              contradictionPenalty: 0.15,
              priorityScore: 2,
              resolvedMode: 'verify',
            },
          ],
          globalNotes: [],
        } as RuleEngineResult,
        states: {
          domains: [
            { domain: 'wealth', state: 'opening', rationale: 'test' },
            { domain: 'relationship', state: 'opening', rationale: 'test' },
          ],
        } as StateEngineResult,
      }
    )

    const byId = new Map(scenarios.map((scenario) => [scenario.id, scenario]))
    expect(byId.get('capital_allocation_window')?.probability).toBeGreaterThan(
      byId.get('income_growth_window')?.probability || 0
    )
    expect(byId.get('commitment_preparation_window')?.probability).toBeGreaterThan(
      byId.get('commitment_execution_window')?.probability || 0
    )
  })

  it('separates health recovery branches from burnout-trigger branches under recovery pressure', () => {
    const patterns = [
      createPattern({
        id: 'burnout_risk',
        family: 'health_guardrail',
        profile: 'risk',
        domains: ['health'],
        score: 72,
        confidence: 0.74,
        matchedKeywords: ['burnout', 'sleep', 'load', 'trigger'],
        resolvedMode: 'prepare',
        domainState: 'opening',
        scenarioIds: ['burnout_trigger_window', 'sleep_disruption_window', 'recovery_reset_window', 'load_rebalance_window'],
      }),
      createPattern({
        id: 'healing_routine_stabilization',
        family: 'health_recovery',
        profile: 'support',
        domains: ['health'],
        score: 71,
        confidence: 0.73,
        matchedKeywords: ['routine', 'habit', 'recovery', 'daily'],
        resolvedMode: 'verify',
        domainState: 'consolidation',
        scenarioIds: ['recovery_window', 'routine_lock_window', 'recovery_compliance_window'],
      }),
    ]

    const scenarios = buildScenarioEngine(patterns, createStrategy(), createInput(), 'ko', {
      activation: {
        domains: [
          {
            domain: 'health',
            natalScore: 1.15,
            timeScore: 1.25,
            modulationScore: 0.7,
            activationScore: 3.1,
            dominantAxes: ['recovery', 'verification', 'pressure'],
            sources: [],
          },
        ],
        globalTimePressure: 0.74,
        globalVerificationPressure: 0.71,
      } as ActivationEngineResult,
      rules: {
        domains: [
          {
            domain: 'health',
            amplify: ['recovery_protocol', 'nourishment_routine', 'phase_window'],
            suppress: ['overextension'],
            gate: ['commit_now'],
            delay: ['overload', 'high_intensity_push', 'recovery_skipping'],
            convert: [],
            contradictionPenalty: 0.16,
            priorityScore: 2.2,
            resolvedMode: 'prepare',
          },
        ],
        globalNotes: [],
      } as RuleEngineResult,
      states: {
        domains: [{ domain: 'health', state: 'consolidation', rationale: 'test' }],
      } as StateEngineResult,
    })

    const byId = new Map(scenarios.map((scenario) => [scenario.id, scenario]))
    expect(byId.get('recovery_reset_window')?.probability).toBeGreaterThan(
      byId.get('burnout_trigger_window')?.probability || 0
    )
  })

  it('separates relationship verification branches by boundary, distance, clarity, and preparation context', () => {
    const patterns = [
      createPattern({
        id: 'relationship_tension',
        family: 'relationship_guardrail',
        profile: 'risk',
        domains: ['relationship'],
        matchedKeywords: ['boundary', 'distance', 'clarify', 'expectation', 'space'],
        scenarioIds: ['boundary_reset_window', 'distance_tuning_window', 'clarify_expectations_window'],
      }),
      createPattern({
        id: 'relationship_activation',
        family: 'relationship_growth',
        profile: 'upside',
        domains: ['relationship'],
        matchedKeywords: ['commitment', 'prepare', 'daily_fit'],
        scenarioIds: ['commitment_preparation_window', 'commitment_execution_window'],
      }),
    ]

    const scenarios = buildScenarioEngine(
      patterns,
      createStrategy(),
      createInput(),
      'en',
      {
        activation: {
          domains: [
            {
              domain: 'relationship',
              natalScore: 1.2,
              timeScore: 1.3,
              modulationScore: 0.7,
              activationScore: 3.2,
              dominantAxes: ['bonding', 'verification', 'retreat'],
              sources: [],
            },
          ],
          globalTimePressure: 0.72,
          globalVerificationPressure: 0.74,
        } as ActivationEngineResult,
        rules: {
          domains: [
            {
              domain: 'relationship',
              amplify: ['bond_definition'],
              suppress: [],
              gate: ['boundary_breach', 'projection_bias', 'forced_closeness'],
              delay: ['confirmation_before_labeling', 'slow_trust_build'],
              convert: ['relationship_growth -> selective_distance'],
              contradictionPenalty: 0.18,
              priorityScore: 2.2,
              resolvedMode: 'verify',
            },
          ],
          globalNotes: [],
        } as RuleEngineResult,
        states: {
          domains: [{ domain: 'relationship', state: 'consolidation', rationale: 'test' }],
        } as StateEngineResult,
      }
    )

    const byId = new Map(scenarios.map((scenario) => [scenario.id, scenario]))
    expect(byId.get('boundary_reset_window')?.probability).toBeGreaterThan(
      byId.get('commitment_execution_window')?.probability || 0
    )
    expect(byId.get('distance_tuning_window')?.probability).toBeGreaterThan(
      byId.get('commitment_execution_window')?.probability || 0
    )
    expect(byId.get('clarify_expectations_window')?.probability).toBeGreaterThan(
      byId.get('commitment_execution_window')?.probability || 0
    )
    expect(byId.get('commitment_preparation_window')?.probability).toBeGreaterThan(
      byId.get('commitment_execution_window')?.probability || 0
    )
  })

  it('prioritizes move-domain scenarios when move is the focus domain', () => {
    const strategy = createStrategy()
    strategy.domainStrategies = [
      {
        ...strategy.domainStrategies[0],
        domain: 'move',
        phase: 'expansion_guarded',
        phaseLabel: 'Guarded Expansion',
        attackPercent: 58,
        defensePercent: 42,
        thesis: 'move',
        strategy: 'move',
        riskControl: 'recheck route before moving',
        evidenceIds: ['sig-m1', 'sig-m2'],
        vector: { expansion: 35, volatility: 12, structure: 30 },
      },
    ]

    const patterns = [
      createPattern({
        id: 'travel_relocation_activation',
        family: 'movement',
        profile: 'timing',
        domains: ['move'],
        score: 66,
        confidence: 0.73,
        matchedKeywords: ['move', 'route', 'lease', 'basecamp'],
        scenarioIds: ['route_recheck_window', 'lease_decision_window', 'basecamp_reset_window'],
      }),
      createPattern({
        id: 'relationship_tension',
        family: 'relationship_guardrail',
        profile: 'risk',
        domains: ['relationship'],
        score: 68,
        confidence: 0.74,
        matchedKeywords: ['boundary', 'distance', 'expectation'],
        scenarioIds: ['boundary_reset_window', 'distance_tuning_window', 'clarify_expectations_window'],
      }),
    ]

    const scenarios = buildScenarioEngine(patterns, strategy, createInput(), 'en', {
      activation: {
        domains: [
          {
            domain: 'move',
            natalScore: 1.3,
            timeScore: 1.4,
            modulationScore: 0.7,
            activationScore: 3.4,
            dominantAxes: ['mobility', 'verification', 'transition'],
            sources: [],
          },
          {
            domain: 'relationship',
            natalScore: 1.1,
            timeScore: 1.1,
            modulationScore: 0.5,
            activationScore: 2.7,
            dominantAxes: ['verification'],
            sources: [],
          },
        ],
        globalTimePressure: 0.7,
        globalVerificationPressure: 0.72,
      } as ActivationEngineResult,
      rules: {
        domains: [
          {
            domain: 'move',
            amplify: ['phase_window', 'movement_window'],
            suppress: [],
            gate: ['commit_now'],
            delay: ['finalize_terms', 'housing_commitment'],
            convert: ['move_fast -> staged_move'],
            contradictionPenalty: 0.1,
            priorityScore: 2.1,
            resolvedMode: 'verify',
          },
          {
            domain: 'relationship',
            amplify: [],
            suppress: [],
            gate: ['projection_bias'],
            delay: ['slow_trust_build'],
            convert: ['relationship_growth -> selective_distance'],
            contradictionPenalty: 0.14,
            priorityScore: 1.8,
            resolvedMode: 'verify',
          },
        ],
        globalNotes: [],
      } as RuleEngineResult,
      states: {
        domains: [
          { domain: 'move', state: 'opening', rationale: 'test' },
          { domain: 'relationship', state: 'consolidation', rationale: 'test' },
        ],
      } as StateEngineResult,
    })

    expect(scenarios[0].domain).toBe('move')
    expect(
      ['route_recheck_window', 'lease_decision_window', 'basecamp_reset_window'].includes(
        scenarios[0].id
      )
    ).toBe(true)
  })
})
