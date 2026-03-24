import type { MatrixCalculationInput, MatrixSummary } from '@/lib/destiny-matrix/types'
import type { MatrixCalculationInputNormalized, DestinyCoreQuality } from './runDestinyCore'
import type { StrategyEngineResult } from './strategyEngine'
import type { DestinyCoreCanonicalOutput } from './types'

export type DestinyLatentGroup =
  | 'structural'
  | 'timing'
  | 'astrology'
  | 'domain'
  | 'conflict'
  | 'narrative'

export type DestinyLatentAxisId =
  | 'day_master_stability'
  | 'geokguk_strength'
  | 'yongsin_alignment'
  | 'sibsin_concentration'
  | 'stage_pressure'
  | 'branch_harmony'
  | 'branch_conflict'
  | 'shinsal_support'
  | 'shinsal_risk'
  | 'saju_coverage'
  | 'element_balance'
  | 'identity_pressure'
  | 'relation_harmony_density'
  | 'relation_conflict_density'
  | 'shinsal_density'
  | 'supportive_cycle_alignment'
  | 'cycle_cohesion'
  | 'house_emphasis'
  | 'relational_capacity'
  | 'support_resilience'
  | 'readiness'
  | 'trigger'
  | 'convergence'
  | 'granularity_confidence'
  | 'monthly_pulse'
  | 'short_term_volatility'
  | 'long_cycle_support'
  | 'timing_conflict'
  | 'past_stability'
  | 'future_stability'
  | 'timing_reliability'
  | 'timing_reversibility'
  | 'timing_sustainability'
  | 'intra_month_concentration'
  | 'trigger_decay'
  | 'timing_consistency'
  | 'timing_window_width'
  | 'activation_elasticity'
  | 'natal_baseline'
  | 'transit_pressure'
  | 'retrograde_drag'
  | 'progression_drift'
  | 'solar_return_emphasis'
  | 'lunar_return_activation'
  | 'eclipse_sensitivity'
  | 'advanced_astro_support'
  | 'draconic_support'
  | 'harmonic_resonance'
  | 'fixed_star_pressure'
  | 'midpoint_activation'
  | 'asteroid_signal_density'
  | 'extra_point_density'
  | 'return_stack_pressure'
  | 'aspect_cluster_density'
  | 'career'
  | 'relationship'
  | 'wealth'
  | 'health'
  | 'move'
  | 'personality'
  | 'spirituality'
  | 'timing'
  | 'career_growth'
  | 'relationship_commitment'
  | 'wealth_leakage'
  | 'health_recovery'
  | 'move_disruption'
  | 'identity_rebuild'
  | 'career_authority'
  | 'relationship_repair'
  | 'wealth_accumulation'
  | 'health_load'
  | 'move_opportunity'
  | 'spiritual_opening'
  | 'saju_astro_disagreement'
  | 'structure_trigger_mismatch'
  | 'opportunity_sustainability_gap'
  | 'pressure_readiness_gap'
  | 'focus_ambiguity'
  | 'downgrade_pressure'
  | 'evidence_fragmentation'
  | 'signal_competition'
  | 'decision_reversal_risk'
  | 'timing_false_precision_risk'
  | 'domain_polarization'
  | 'evidence_mismatch_risk'
  | 'cross_system_tension'
  | 'action_overreach_risk'
  | 'focus_strength'
  | 'action_focus_strength'
  | 'decision_certainty'
  | 'risk_control_intensity'
  | 'evidence_cohesion'
  | 'narrative_density'
  | 'projection_clarity'
  | 'explanation_depth'

export interface DestinyLatentState {
  version: 'v3-96'
  dimensions: Record<DestinyLatentAxisId, number>
  groups: Record<DestinyLatentGroup, DestinyLatentAxisId[]>
  topAxes: Array<{ id: DestinyLatentAxisId; value: number }>
}

export interface BuildDestinyLatentStateInput {
  normalizedInput: MatrixCalculationInputNormalized
  matrixSummary?: MatrixSummary
  strategyEngine: StrategyEngineResult
  canonical: DestinyCoreCanonicalOutput
  quality: DestinyCoreQuality
}

const GROUPS: Record<DestinyLatentGroup, DestinyLatentAxisId[]> = {
  structural: [
    'day_master_stability',
    'geokguk_strength',
    'yongsin_alignment',
    'sibsin_concentration',
    'stage_pressure',
    'branch_harmony',
    'branch_conflict',
    'shinsal_support',
    'shinsal_risk',
    'saju_coverage',
    'element_balance',
    'identity_pressure',
    'relation_harmony_density',
    'relation_conflict_density',
    'shinsal_density',
    'supportive_cycle_alignment',
    'cycle_cohesion',
    'house_emphasis',
    'relational_capacity',
    'support_resilience',
  ],
  timing: [
    'readiness',
    'trigger',
    'convergence',
    'granularity_confidence',
    'monthly_pulse',
    'short_term_volatility',
    'long_cycle_support',
    'timing_conflict',
    'past_stability',
    'future_stability',
    'timing_reliability',
    'timing_reversibility',
    'timing_sustainability',
    'intra_month_concentration',
    'trigger_decay',
    'timing_consistency',
    'timing_window_width',
    'activation_elasticity',
  ],
  astrology: [
    'natal_baseline',
    'transit_pressure',
    'retrograde_drag',
    'progression_drift',
    'solar_return_emphasis',
    'lunar_return_activation',
    'eclipse_sensitivity',
    'advanced_astro_support',
    'draconic_support',
    'harmonic_resonance',
    'fixed_star_pressure',
    'midpoint_activation',
    'asteroid_signal_density',
    'extra_point_density',
    'return_stack_pressure',
    'aspect_cluster_density',
  ],
  domain: [
    'career',
    'relationship',
    'wealth',
    'health',
    'move',
    'personality',
    'spirituality',
    'timing',
    'career_growth',
    'relationship_commitment',
    'wealth_leakage',
    'health_recovery',
    'move_disruption',
    'identity_rebuild',
    'career_authority',
    'relationship_repair',
    'wealth_accumulation',
    'health_load',
    'move_opportunity',
    'spiritual_opening',
  ],
  conflict: [
    'saju_astro_disagreement',
    'structure_trigger_mismatch',
    'opportunity_sustainability_gap',
    'pressure_readiness_gap',
    'focus_ambiguity',
    'downgrade_pressure',
    'evidence_fragmentation',
    'signal_competition',
    'decision_reversal_risk',
    'timing_false_precision_risk',
    'domain_polarization',
    'evidence_mismatch_risk',
    'cross_system_tension',
    'action_overreach_risk',
  ],
  narrative: [
    'focus_strength',
    'action_focus_strength',
    'decision_certainty',
    'risk_control_intensity',
    'evidence_cohesion',
    'narrative_density',
    'projection_clarity',
    'explanation_depth',
  ],
}

const POSITIVE_SHINSAL = new Set([
  '천을귀인',
  '태극귀인',
  '천덕귀인',
  '월덕귀인',
  '문창귀인',
  '학당귀인',
  '금여록',
  '천주귀인',
  '암록',
  '건록',
  '제왕',
])

const NEGATIVE_SHINSAL = new Set([
  '도화',
  '홍염살',
  '양인',
  '백호',
  '겁살',
  '재살',
  '천살',
  '지살',
  '년살',
  '월살',
  '망신',
  '고신',
  '괴강',
  '현침',
  '귀문관',
  '병부',
  '효신살',
  '상문살',
  '역마',
])

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

function ratio(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0
  return clamp01(part / total)
}

function normalizedCount(count: number, cap: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0
  return clamp01(count / cap)
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function pickTimingWindow(input: BuildDestinyLatentStateInput) {
  return (
    input.canonical.domainTimingWindows.find(
      (item) => item.domain === input.canonical.actionFocusDomain
    ) ||
    input.canonical.domainTimingWindows.find(
      (item) => item.domain === input.canonical.focusDomain
    ) ||
    input.canonical.domainTimingWindows[0]
  )
}

function granularityConfidence(granularity: string | undefined): number {
  switch (granularity) {
    case 'day':
      return 1
    case 'week':
      return 0.84
    case 'fortnight':
      return 0.7
    case 'month':
      return 0.56
    case 'season':
      return 0.38
    default:
      return 0.5
  }
}

function timingConflictLevel(mode: string | undefined): number {
  switch (mode) {
    case 'aligned':
      return 0.12
    case 'readiness_ahead':
    case 'trigger_ahead':
      return 0.72
    case 'weak_both':
      return 0.55
    default:
      return 0.3
  }
}

function extractMatchCount(input: MatrixCalculationInput): number {
  const yongsin = input.yongsin
  if (!yongsin) return 0
  const values = [
    input.currentDaeunElement,
    input.currentSaeunElement,
    input.currentWolunElement,
    input.currentIljinElement,
  ].filter(Boolean)
  return values.filter((value) => value === yongsin).length
}

function computeElementBalance(input: MatrixCalculationInput): number {
  const values = Array.isArray(input.pillarElements) ? input.pillarElements : []
  if (values.length === 0) return 0
  const counts = new Map<string, number>()
  for (const value of values) counts.set(String(value), (counts.get(String(value)) || 0) + 1)
  const uniqueShare = ratio(counts.size, 5)
  const maxCount = Math.max(...counts.values())
  const dominancePenalty = ratio(maxCount - 1, values.length)
  return round3(clamp01(uniqueShare * 0.7 + (1 - dominancePenalty) * 0.3))
}

function computeDomainAxisMap(input: BuildDestinyLatentStateInput): Record<string, number> {
  const leads = input.canonical.domainLeads || []
  const maxScore = Math.max(1, ...leads.map((item) => item.dominanceScore || 0))
  const out: Record<string, number> = {
    career: 0,
    relationship: 0,
    wealth: 0,
    health: 0,
    move: 0,
    personality: 0,
    spirituality: 0,
    timing: 0,
  }
  for (const lead of leads)
    out[lead.domain] = round3(clamp01((lead.dominanceScore || 0) / maxScore))
  return out
}

export function buildDestinyLatentState(input: BuildDestinyLatentStateInput): DestinyLatentState {
  const { normalizedInput, matrixSummary, canonical, quality, strategyEngine } = input
  const timingWindow = pickTimingWindow(input)
  const calibration = matrixSummary?.timingCalibration
  const overlapTimeline = matrixSummary?.overlapTimeline || []
  const domainAxes = computeDomainAxisMap(input)
  const topDecision = canonical.topDecision
  const focusLead = canonical.domainLeads.find((item) => item.domain === canonical.focusDomain)
  const actionLead = canonical.domainLeads.find(
    (item) => item.domain === canonical.actionFocusDomain
  )
  const relationCount = normalizedInput.relations?.length || 0
  const harmonyCount = (normalizedInput.relations || []).filter((item) =>
    ['samhap', 'yukhap', 'banghap', 'harmony'].includes(String(item.kind))
  ).length
  const conflictCount = (normalizedInput.relations || []).filter((item) =>
    ['chung', 'hyeong', 'pa', 'hae', 'wonjin', 'clash', 'conflict'].includes(String(item.kind))
  ).length
  const shinsalTotal = normalizedInput.shinsalList?.length || 0
  const shinsalSupportCount = (normalizedInput.shinsalList || []).filter((item) =>
    POSITIVE_SHINSAL.has(String(item))
  ).length
  const shinsalRiskCount = (normalizedInput.shinsalList || []).filter((item) =>
    NEGATIVE_SHINSAL.has(String(item))
  ).length
  const sibsinValues = Object.values(normalizedInput.sibsinDistribution || {}).map((value) =>
    Number(value || 0)
  )
  const sibsinTotal = sibsinValues.reduce((sum, value) => sum + value, 0)
  const sibsinMax = sibsinValues.length > 0 ? Math.max(...sibsinValues) : 0
  const stageValues = Object.values(normalizedInput.twelveStages || {}).map((value) =>
    Number(value || 0)
  )
  const stageTotal = stageValues.reduce((sum, value) => sum + value, 0)
  const stageMax = stageValues.length > 0 ? Math.max(...stageValues) : 0
  const advancedSignals = Object.values(normalizedInput.advancedAstroSignals || {})
  const advancedTrueCount = advancedSignals.filter(Boolean).length
  const activeTransitCount = normalizedInput.activeTransits.length
  const retrogradeCount = normalizedInput.activeTransits.filter((item) =>
    /retrograde/i.test(String(item))
  ).length
  const monthlyPeak =
    overlapTimeline.length > 0
      ? Math.max(...overlapTimeline.map((item) => item.overlapStrength || 0))
      : 0
  const monthlyAverage =
    overlapTimeline.length > 0
      ? average(overlapTimeline.map((item) => item.overlapStrength || 0))
      : 0
  const baseFieldCoverage = [
    Boolean(normalizedInput.dayMasterElement),
    Boolean(normalizedInput.geokguk),
    Boolean(normalizedInput.yongsin),
    Boolean(sibsinTotal),
    Boolean(stageTotal),
    Boolean(relationCount),
    Boolean(shinsalTotal),
    Boolean(normalizedInput.currentDaeunElement),
    Boolean(normalizedInput.currentSaeunElement),
    Boolean(normalizedInput.currentWolunElement),
    Boolean(normalizedInput.currentIljinElement || normalizedInput.currentIljinDate),
  ].filter(Boolean).length
  const attackPressure = clamp01((canonical.attackPercent || 0) / 100)
  const decisionGap = clamp01(quality.metrics.topDecisionGap || 0)
  const scenarioGap = clamp01(quality.metrics.topScenarioGap || 0)
  const focusGap = clamp01(1 - (quality.metrics.focusDomainAmbiguity || 0))
  const clusterCompression = clamp01(quality.metrics.scenarioClusterCompression || 0)
  const futureStability = calibration?.futureStability ?? 0.5
  const pastStability = calibration?.pastStability ?? 0.5
  const timingReliability =
    calibration?.reliabilityScore ?? clamp01(average([futureStability, pastStability]))
  const readiness =
    timingWindow?.readinessScore ?? strategyEngine.domainStrategies[0]?.metrics.readinessScore ?? 0
  const trigger =
    timingWindow?.triggerScore ?? strategyEngine.domainStrategies[0]?.metrics.triggerScore ?? 0
  const convergence =
    timingWindow?.convergenceScore ??
    strategyEngine.domainStrategies[0]?.metrics.convergenceScore ??
    0
  const longCycleSupport = clamp01(
    (Boolean(normalizedInput.currentDaeunElement) ? 0.6 : 0) +
      (Boolean(normalizedInput.currentSaeunElement) ? 0.25 : 0) +
      readiness * 0.15
  )
  const relationHarmonyDensity = normalizedCount(harmonyCount, 4)
  const relationConflictDensity = normalizedCount(conflictCount, 4)
  const shinsalDensity = normalizedCount(shinsalTotal, 6)
  const supportiveCycleAlignment = clamp01(
    average([ratio(extractMatchCount(normalizedInput), 4), readiness, longCycleSupport])
  )
  const timingReversibility = clamp01(
    (canonical.judgmentPolicy.mode === 'prepare'
      ? 0.72
      : canonical.judgmentPolicy.mode === 'verify'
        ? 0.54
        : 0.24) + canonical.judgmentPolicy.softChecks.length * 0.03
  )
  const timingSustainability = clamp01(
    average([futureStability, readiness, 1 - clusterCompression * 0.2])
  )
  const evidenceFragmentation = clamp01(
    average([
      typeof canonical.crossAgreement === 'number' ? 1 - canonical.crossAgreement : 0.5,
      normalizedCount(canonical.coherenceAudit.domainConflictCount, 4),
      normalizedCount(canonical.coherenceAudit.contradictionFlags.length, 4),
    ])
  )
  const signalCompetition = clamp01(average([1 - scenarioGap, clusterCompression, 1 - focusGap]))
  const decisionReversalRisk = clamp01(
    average([
      1 - decisionGap,
      canonical.judgmentPolicy.mode === 'execute'
        ? 0.2
        : canonical.judgmentPolicy.mode === 'verify'
          ? 0.58
          : 0.72,
      normalizedCount(canonical.judgmentPolicy.softChecks.length, 5),
    ])
  )
  const timingFalsePrecisionRisk = clamp01(1 - granularityConfidence(timingWindow?.timingGranularity))
  const evidenceCohesion = clamp01(
    average([
      typeof canonical.crossAgreement === 'number' ? canonical.crossAgreement : 0.5,
      focusGap,
      decisionGap,
    ])
  )
  const narrativeDensity = clamp01(
    average([
      normalizedCount(canonical.topSignalIds.length, 5),
      normalizedCount(canonical.topPatterns.length, 4),
      normalizedCount(canonical.topScenarios.length, 4),
      normalizedCount(canonical.domainLeads.length, 5),
    ])
  )
  const hardStopPressure = normalizedCount(canonical.judgmentPolicy.hardStops.length, 4)
  const blockedPressure = normalizedCount(canonical.judgmentPolicy.blockedActions.length, 4)
  const careerGrowth = clamp01(
    average([
      domainAxes.career,
      canonical.actionFocusDomain === 'career' ? 0.9 : 0.25,
      topDecision?.domain === 'career' ? 0.88 : 0.2,
    ])
  )
  const relationshipCommitment = clamp01(
    average([
      domainAxes.relationship,
      normalizedCount(
        canonical.topScenarios.filter((item) =>
          /commit|partner|boundary|relationship|expectation|distance/i.test(item.id)
        ).length,
        3
      ),
      canonical.actionFocusDomain === 'relationship' ? 0.85 : 0.2,
    ])
  )
  const wealthLeakage = clamp01(
    average([
      domainAxes.wealth,
      blockedPressure,
      /wealth|money|finance/i.test(canonical.primaryCaution) ? 0.78 : 0.22,
    ])
  )
  const healthRecovery = clamp01(
    average([
      domainAxes.health,
      normalizedCount(
        canonical.topScenarios.filter((item) => /recovery|reset|routine|burnout|health/i.test(item.id))
          .length,
        3
      ),
      canonical.actionFocusDomain === 'health' ? 0.82 : 0.24,
    ])
  )
  const moveDisruption = clamp01(
    average([
      domainAxes.move,
      normalizedCount(
        canonical.topScenarios.filter((item) => /move|route|commute|relocat/i.test(item.id)).length,
        3
      ),
      /move|route|commute|relocat/i.test(canonical.primaryCaution) ? 0.8 : 0.25,
    ])
  )
  const identityRebuild = clamp01(
    average([
      domainAxes.personality,
      domainAxes.spirituality,
      canonical.focusDomain === 'personality' ? 0.88 : 0.28,
    ])
  )
  const cycleCohesion = clamp01(average([longCycleSupport, supportiveCycleAlignment, ratio(extractMatchCount(normalizedInput), 4)]))
  const houseEmphasis = clamp01(average([normalizedCount(Object.keys(normalizedInput.planetHouses || {}).length, 8), normalizedCount(Object.keys(normalizedInput.planetSigns || {}).length, 8)]))
  const relationalCapacity = clamp01(average([relationHarmonyDensity, 1 - relationConflictDensity, domainAxes.relationship]))
  const supportResilience = clamp01(average([ratio(shinsalSupportCount, Math.max(1, shinsalTotal)), 1 - hardStopPressure, evidenceCohesion]))
  const triggerDecay = clamp01(Math.max(0, trigger - futureStability))
  const timingConsistency = clamp01(average([pastStability, futureStability, 1 - Math.abs(pastStability - futureStability)]))
  const timingWindowWidth = clamp01(1 - granularityConfidence(timingWindow?.timingGranularity))
  const activationElasticity = clamp01(average([timingReversibility, 1 - hardStopPressure, 1 - blockedPressure]))
  const asteroidSignalDensity = round3(normalizedInput.advancedAstroSignals?.asteroids ? 0.72 : 0)
  const extraPointDensity = round3(normalizedInput.advancedAstroSignals?.extraPoints ? 0.72 : 0)
  const returnStackPressure = clamp01(average([normalizedInput.advancedAstroSignals?.solarReturn ? 1 : 0, normalizedInput.advancedAstroSignals?.lunarReturn ? 1 : 0]))
  const aspectClusterDensity = clamp01(normalizedCount(normalizedInput.aspects?.length || 0, 10))
  const careerAuthority = clamp01(average([domainAxes.career, careerGrowth, normalizedCount(Object.values(normalizedInput.sibsinDistribution || {}).reduce((sum, value) => sum + Number(value || 0), 0), 8)]))
  const relationshipRepair = clamp01(average([domainAxes.relationship, 1 - relationConflictDensity, normalizedCount(canonical.judgmentPolicy.softChecks.length, 5)]))
  const wealthAccumulation = clamp01(average([domainAxes.wealth, 1 - wealthLeakage, longCycleSupport]))
  const healthLoad = clamp01(average([domainAxes.health, blockedPressure, ratio(conflictCount, Math.max(1, relationCount))]))
  const moveOpportunity = clamp01(average([domainAxes.move, 1 - moveDisruption, trigger]))
  const spiritualOpening = clamp01(average([domainAxes.spirituality, round3(normalizedInput.advancedAstroSignals?.draconic ? 0.78 : 0), round3(normalizedInput.advancedAstroSignals?.harmonics ? 0.76 : 0)]))
  const domainPolarization = clamp01(Math.max(...Object.values(domainAxes)) - average(Object.values(domainAxes)))
  const evidenceMismatchRisk = clamp01(average([evidenceFragmentation, 1 - evidenceCohesion, normalizedCount(canonical.coherenceAudit.contradictionFlags.length, 4)]))
  const crossSystemTension = clamp01(average([typeof canonical.crossAgreement === 'number' ? 1 - canonical.crossAgreement : 0.5, relationConflictDensity, timingConflictLevel(timingWindow?.timingConflictMode)]))
  const actionOverreachRisk = clamp01(average([attackPressure, blockedPressure, 1 - readiness]))
  const projectionClarity = clamp01(average([focusGap, decisionGap, evidenceCohesion]))
  const explanationDepth = clamp01(average([narrativeDensity, evidenceCohesion, signalCompetition]))

  const dimensions: Record<DestinyLatentAxisId, number> = {
    day_master_stability: round3(normalizedInput.dayMasterElement ? 0.9 : 0.2),
    geokguk_strength: round3(normalizedInput.geokguk ? 0.9 : 0.25),
    yongsin_alignment: round3(ratio(extractMatchCount(normalizedInput), 4)),
    sibsin_concentration: round3(ratio(sibsinMax, Math.max(1, sibsinTotal))),
    stage_pressure: round3(ratio(stageMax, Math.max(1, stageTotal))),
    branch_harmony: round3(ratio(harmonyCount, Math.max(1, relationCount))),
    branch_conflict: round3(ratio(conflictCount, Math.max(1, relationCount))),
    shinsal_support: round3(ratio(shinsalSupportCount, Math.max(1, shinsalTotal))),
    shinsal_risk: round3(ratio(shinsalRiskCount, Math.max(1, shinsalTotal))),
    saju_coverage: round3(ratio(baseFieldCoverage, 11)),
    element_balance: computeElementBalance(normalizedInput),
    identity_pressure: round3(domainAxes.personality),
    relation_harmony_density: round3(relationHarmonyDensity),
    relation_conflict_density: round3(relationConflictDensity),
    shinsal_density: round3(shinsalDensity),
    supportive_cycle_alignment: round3(supportiveCycleAlignment),
    cycle_cohesion: round3(cycleCohesion),
    house_emphasis: round3(houseEmphasis),
    relational_capacity: round3(relationalCapacity),
    support_resilience: round3(supportResilience),
    readiness: round3(readiness),
    trigger: round3(trigger),
    convergence: round3(convergence),
    granularity_confidence: round3(granularityConfidence(timingWindow?.timingGranularity)),
    monthly_pulse: round3(clamp01(monthlyPeak)),
    intra_month_concentration: round3(clamp01(Math.max(0, monthlyPeak - monthlyAverage))),
    short_term_volatility: round3(
      clamp01(1 - (pastStability + futureStability) / 2)
    ),
    long_cycle_support: round3(longCycleSupport),
    timing_conflict: round3(timingConflictLevel(timingWindow?.timingConflictMode)),
    past_stability: round3(pastStability),
    future_stability: round3(futureStability),
    timing_reliability: round3(timingReliability),
    timing_reversibility: round3(timingReversibility),
    timing_sustainability: round3(timingSustainability),
    trigger_decay: round3(triggerDecay),
    timing_consistency: round3(timingConsistency),
    timing_window_width: round3(timingWindowWidth),
    activation_elasticity: round3(activationElasticity),
    natal_baseline: round3(
      clamp01(
        (normalizedInput.astrologySnapshot?.natalChart ? 0.45 : 0) +
          (normalizedInput.astrologySnapshot?.natalAspects ? 0.3 : 0) +
          (normalizedInput.planetHouses ? 0.15 : 0) +
          (normalizedInput.planetSigns ? 0.1 : 0)
      )
    ),
    transit_pressure: round3(normalizedCount(activeTransitCount, 6)),
    retrograde_drag: round3(normalizedCount(retrogradeCount, 3)),
    progression_drift: round3(normalizedInput.advancedAstroSignals?.progressions ? 0.88 : 0),
    solar_return_emphasis: round3(normalizedInput.advancedAstroSignals?.solarReturn ? 0.86 : 0),
    lunar_return_activation: round3(normalizedInput.advancedAstroSignals?.lunarReturn ? 0.82 : 0),
    eclipse_sensitivity: round3(normalizedInput.advancedAstroSignals?.eclipses ? 0.84 : 0),
    advanced_astro_support: round3(
      ratio(advancedTrueCount, Math.max(1, advancedSignals.length || 10))
    ),
    draconic_support: round3(normalizedInput.advancedAstroSignals?.draconic ? 0.78 : 0),
    harmonic_resonance: round3(normalizedInput.advancedAstroSignals?.harmonics ? 0.76 : 0),
    fixed_star_pressure: round3(normalizedInput.advancedAstroSignals?.fixedStars ? 0.72 : 0),
    midpoint_activation: round3(normalizedInput.advancedAstroSignals?.midpoints ? 0.74 : 0),
    asteroid_signal_density: round3(asteroidSignalDensity),
    extra_point_density: round3(extraPointDensity),
    return_stack_pressure: round3(returnStackPressure),
    aspect_cluster_density: round3(aspectClusterDensity),
    career: round3(domainAxes.career),
    relationship: round3(domainAxes.relationship),
    wealth: round3(domainAxes.wealth),
    health: round3(domainAxes.health),
    move: round3(domainAxes.move),
    personality: round3(domainAxes.personality),
    spirituality: round3(domainAxes.spirituality),
    timing: round3(domainAxes.timing),
    career_growth: round3(careerGrowth),
    relationship_commitment: round3(relationshipCommitment),
    wealth_leakage: round3(wealthLeakage),
    health_recovery: round3(healthRecovery),
    move_disruption: round3(moveDisruption),
    identity_rebuild: round3(identityRebuild),
    career_authority: round3(careerAuthority),
    relationship_repair: round3(relationshipRepair),
    wealth_accumulation: round3(wealthAccumulation),
    health_load: round3(healthLoad),
    move_opportunity: round3(moveOpportunity),
    spiritual_opening: round3(spiritualOpening),
    saju_astro_disagreement: round3(
      typeof canonical.crossAgreement === 'number' ? clamp01(1 - canonical.crossAgreement) : 0.5
    ),
    structure_trigger_mismatch: round3(clamp01(Math.abs(readiness - trigger))),
    opportunity_sustainability_gap: round3(clamp01(Math.max(0, trigger - futureStability))),
    pressure_readiness_gap: round3(clamp01(Math.max(0, attackPressure - readiness))),
    focus_ambiguity: round3(clamp01(quality.metrics.focusDomainAmbiguity || 0)),
    downgrade_pressure: round3(
      clamp01(
        (canonical.judgmentPolicy.mode === 'execute' ? 0 : 0.45) +
          (canonical.coherenceAudit.verificationBias ? 0.25 : 0) +
          (canonical.coherenceAudit.domainConflictCount > 0 ? 0.2 : 0)
      )
    ),
    evidence_fragmentation: round3(evidenceFragmentation),
    signal_competition: round3(signalCompetition),
    decision_reversal_risk: round3(decisionReversalRisk),
    timing_false_precision_risk: round3(timingFalsePrecisionRisk),
    domain_polarization: round3(domainPolarization),
    evidence_mismatch_risk: round3(evidenceMismatchRisk),
    cross_system_tension: round3(crossSystemTension),
    action_overreach_risk: round3(actionOverreachRisk),
    focus_strength: round3(
      clamp01(
        (focusLead?.dominanceScore || 0) /
          Math.max(1, canonical.domainLeads[0]?.dominanceScore || 1)
      )
    ),
    action_focus_strength: round3(
      clamp01(
        (actionLead?.dominanceScore || 0) /
          Math.max(1, canonical.domainLeads[0]?.dominanceScore || 1)
      )
    ),
    decision_certainty: round3(clamp01((topDecision?.confidence || 0) * 0.6 + decisionGap * 0.4)),
    risk_control_intensity: round3(
      clamp01(
        canonical.judgmentPolicy.hardStops.length * 0.18 +
          canonical.judgmentPolicy.blockedActions.length * 0.08 +
          canonical.judgmentPolicy.softChecks.length * 0.04 +
          (canonical.judgmentPolicy.mode === 'prepare'
            ? 0.18
            : canonical.judgmentPolicy.mode === 'verify'
              ? 0.1
              : 0)
      )
    ),
    evidence_cohesion: round3(evidenceCohesion),
    narrative_density: round3(narrativeDensity),
    projection_clarity: round3(projectionClarity),
    explanation_depth: round3(explanationDepth),
  }

  const topAxes = Object.entries(dimensions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([id, value]) => ({ id: id as DestinyLatentAxisId, value }))

  return {
    version: 'v3-96',
    dimensions,
    groups: GROUPS,
    topAxes,
  }
}
