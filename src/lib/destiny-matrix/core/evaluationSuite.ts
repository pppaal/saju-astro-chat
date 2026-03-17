import type { FeatureCompilationResult } from './tokenCompiler'
import type { ActivationEngineResult } from './activationEngine'
import type { RuleEngineResult } from './ruleEngine'
import type { StateEngineResult } from './stateEngine'
import type { DestinyCoreCanonicalOutput } from './types'
import type { PatternResult } from './patternEngine'
import type { ScenarioResult } from './scenarioEngine'
import type { DecisionEngineResult } from './decisionEngine'

export interface EvaluationSuiteResult {
  coverage: {
    tokenCount: number
    domainActivationCount: number
    ruledDomainCount: number
    stateCount: number
  }
  replay: {
    verdictAligned: boolean
    focusDomainAligned: boolean
    stateRuleAlignmentRate: number
    patternScenarioAlignmentRate: number
    focusScenarioDomainAligned: boolean
    topDecisionDomainAligned: boolean
  }
  calibration: {
    confidenceBand: 'low' | 'medium' | 'high'
    crossAgreementBand: 'low' | 'medium' | 'high' | 'unknown'
    cautionPressure: number
    overcommitRisk: number
    irreversibilityPressure: number
    domainConcentration: number
    timingSharpness: number
    topScenarioGap: number
    topDecisionGap: number
    scenarioClusterCompression: number
  }
  audit: {
    contradictions: string[]
    notes: string[]
  }
  influence: {
    topRuleDrivers: Array<{
      domain: string
      mode: 'execute' | 'verify' | 'prepare'
      score: number
      reasons: string[]
      breakdown: {
        baseScore: number
        focusBonus: number
        modeBonus: number
        reasonBonus: number
        contradictionPenalty: number
        finalScore: number
      }
    }>
    topPatternDrivers: Array<{
      id: string
      domainMatch: boolean
      score: number
      clusterRank: number
      tieBreakRank: number
      topGap: number
      breakdown: {
        baseScore: number
        focusBonus: number
        leadBonus: number
        modeBonus: number
        profileBonus: number
        stateBonus: number
        agreementBonus: number
        blockedPenalty: number
        gapBonus: number
        finalScore: number
      }
    }>
    topScenarioDrivers: Array<{
      id: string
      domainMatch: boolean
      score: number
      reversible: boolean
      clusterRank: number
      tieBreakRank: number
      topGap: number
      breakdown: {
        baseScore: number
        focusBonus: number
        leadBonus: number
        windowBonus: number
        reversibleBonus: number
        branchPolicyBonus: number
        specificityBonus: number
        whyNowBonus: number
        entryBonus: number
        abortPenalty: number
        whyNotYetPenalty: number
        gapBonus: number
        finalScore: number
      }
    }>
    decisionDriver: {
      id: string | null
      domainMatch: boolean
      score: number
      gated: boolean
      topGap: number
      breakdown: {
        baseScore: number
        focusBonus: number
        actionFitBonus: number
        reversibleBonus: number
        supportBonus: number
        gatedPenalty: number
        gapBonus: number
        finalScore: number
      }
    } | null
  }
  warnings: string[]
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

function softCap(value: number, max = 1): number {
  const positive = Math.max(0, value)
  return max * (positive / (positive + 1))
}

function normalizedBreakdownBase(raw: number): number {
  return round3(clamp01(softCap(raw)))
}

function relativeGapBonus(current: number, top: number, next: number): number {
  if (top <= 0) return 0
  const distanceFromTop = Math.max(0, top - current) / top
  const topGap = Math.max(0, top - next) / top
  return Math.max(0, topGap * 0.35 - distanceFromTop * 0.22)
}

function policyProfileBonus(
  profile: PatternResult['profile'],
  mode: 'execute' | 'verify' | 'prepare'
): number {
  if (mode === 'execute') {
    if (profile === 'upside') return 0.045
    if (profile === 'support') return 0.03
    if (profile === 'identity') return 0.02
    if (profile === 'timing') return 0.015
    return -0.01
  }
  if (mode === 'verify') {
    if (profile === 'timing') return 0.04
    if (profile === 'support') return 0.03
    if (profile === 'identity') return 0.025
    if (profile === 'risk') return 0.015
    return 0.01
  }
  if (profile === 'support') return 0.04
  if (profile === 'timing') return 0.035
  if (profile === 'identity') return 0.025
  if (profile === 'risk') return 0.02
  return -0.015
}

function stateTieBreakBonus(
  state: PatternResult['domainState'],
  mode: 'execute' | 'verify' | 'prepare'
): number {
  if (!state) return 0
  if (mode === 'execute') {
    if (state === 'peak') return 0.045
    if (state === 'active') return 0.04
    if (state === 'opening') return 0.03
    if (state === 'primed') return 0.01
    return -0.02
  }
  if (mode === 'verify') {
    if (state === 'opening') return 0.04
    if (state === 'active') return 0.03
    if (state === 'consolidation') return 0.025
    if (state === 'primed') return 0.02
    return -0.01
  }
  if (state === 'primed') return 0.04
  if (state === 'consolidation') return 0.035
  if (state === 'closure') return 0.025
  if (state === 'residue') return 0.015
  return -0.015
}

function windowTieBreakBonus(
  window: ScenarioResult['window'],
  mode: 'execute' | 'verify' | 'prepare'
): number {
  if (mode === 'execute') {
    if (window === 'now') return 0.04
    if (window === '1-3m') return 0.02
    if (window === '3-6m') return 0.01
    return 0
  }
  if (mode === 'verify') {
    if (window === '1-3m') return 0.035
    if (window === 'now') return 0.025
    if (window === '3-6m') return 0.015
    return 0.005
  }
  if (window === '3-6m') return 0.035
  if (window === '1-3m') return 0.025
  if (window === '6-12m') return 0.02
  return 0.005
}

function reversibilityTieBreakBonus(
  reversible: boolean,
  mode: 'execute' | 'verify' | 'prepare'
): number {
  if (mode === 'execute') return reversible ? 0.008 : 0.018
  if (mode === 'verify') return reversible ? 0.025 : -0.01
  return reversible ? 0.03 : -0.015
}

function scenarioBranchPolicyBonus(
  branch: string,
  mode: 'execute' | 'verify' | 'prepare'
): number {
  const key = branch.toLowerCase()
  if (mode === 'execute') {
    if (/(execution|promotion|authority_gain|cohabitation|lease_decision|cross_border_move)/.test(key)) return 0.03
    if (/(entry|launch|restart|travel)/.test(key)) return 0.018
    if (/(review|clarify|recheck|preparation|search)/.test(key)) return 0.008
    return 0.012
  }
  if (mode === 'verify') {
    if (/(review|clarify|negotiation|recheck|expectations|distance_tuning|boundary_reset)/.test(key)) return 0.03
    if (/(search|preparation|role_shift|authority_conflict|debt_restructure)/.test(key)) return 0.02
    if (/(execution|promotion|cohabitation|relocation)/.test(key)) return -0.006
    return 0.01
  }
  if (/(review|preparation|reset|restructure|search|compliance|recheck|clarify)/.test(key)) return 0.032
  if (/(execution|promotion|authority_gain|cohabitation|asset_exit|cross_border_move)/.test(key)) return -0.012
  return 0.012
}

function scenarioSpecificityBonus(branch: string): number {
  const key = branch.toLowerCase()
  if (/(review|negotiation|restructure|compliance|acceptance|decision|conflict|disruption)/.test(key)) {
    return 0.024
  }
  if (/(manager|specialist|authority|cohabitation|cross_border|lease|allocation|execution)/.test(key)) {
    return 0.018
  }
  if (/(entry|travel|new_connection|recovery|bond_deepening)/.test(key)) {
    return 0.008
  }
  return 0.012
}

function decisionActionFitBonus(
  action: string,
  mode: 'execute' | 'verify' | 'prepare'
): number {
  if (mode === 'execute') {
    if (action === 'commit_now') return 0.045
    if (action === 'pilot_first') return 0.036
    if (action === 'staged_commit') return 0.03
    if (action === 'negotiate_first') return 0.024
    if (action === 'route_recheck_first') return 0.04
    if (action === 'lease_review_first') return 0.038
    if (action === 'basecamp_reset_first') return 0.039
    return -0.015
  }
  if (mode === 'verify') {
    if (action === 'review_first') return 0.05
    if (action === 'negotiate_first') return 0.04
    if (action === 'boundary_first') return 0.035
    if (action === 'staged_commit') return 0.045
    if (action === 'pilot_first') return 0.03
    if (action === 'route_recheck_first') return 0.055
    if (action === 'lease_review_first') return 0.05
    if (action === 'basecamp_reset_first') return 0.052
    if (action === 'prepare_only') return 0.025
    return -0.02
  }
  if (action === 'prepare_only') return 0.05
  if (action === 'boundary_first') return 0.04
  if (action === 'review_first') return 0.035
  if (action === 'staged_commit') return 0.03
  if (action === 'route_recheck_first') return 0.045
  if (action === 'lease_review_first') return 0.04
  if (action === 'basecamp_reset_first') return 0.043
  return -0.03
}

function isTimingSensitiveBranch(branch: string): boolean {
  return /(review|negotiation|clarify|boundary|distance|allocation|asset_exit|debt_restructure|recovery|sleep_disruption|burnout|lease|relocation|route_recheck|cross_border|execution|preparation)/i.test(
    branch
  )
}

export function evaluateCoreArchitecture(input: {
  features: FeatureCompilationResult
  activation: ActivationEngineResult
  rules: RuleEngineResult
  states: StateEngineResult
  patterns?: PatternResult[]
  scenarios?: ScenarioResult[]
  decisionEngine?: DecisionEngineResult
  canonical?: DestinyCoreCanonicalOutput
}): EvaluationSuiteResult {
  const warnings: string[] = []
  if (input.features.tokens.length < 10) warnings.push('token_count_low')
  if (input.activation.domains.filter((item) => item.activationScore >= 1).length < 3) {
    warnings.push('active_domain_count_low')
  }
  if (input.rules.domains.some((item) => item.priorityScore <= 0.5)) {
    warnings.push('low_priority_domain_present')
  }
  if (input.states.domains.some((item) => item.state === 'dormant')) {
    warnings.push('dormant_domain_present')
  }

  const canonical = input.canonical
  const patterns = input.patterns || []
  const scenarios = input.scenarios || []
  const focusActivation = canonical
    ? input.activation.domains.find((item) => item.domain === canonical.focusDomain)
    : null
  const focusRule = canonical
    ? input.rules.domains.find((item) => item.domain === canonical.focusDomain)
    : null
  const focusState = canonical
    ? input.states.domains.find((item) => item.domain === canonical.focusDomain)
    : null
  const focusScenarios = canonical ? scenarios.filter((scenario) => scenario.domain === canonical.focusDomain) : []
  const topDecisionOption = canonical && input.decisionEngine?.topOptionId
    ? input.decisionEngine.options.find((option) => option.id === input.decisionEngine?.topOptionId)
    : null

  const alignedStates = input.states.domains.filter((state) => {
    const rule = input.rules.domains.find((item) => item.domain === state.domain)
    if (!rule) return false
    if (rule.resolvedMode === 'prepare') {
      return ['consolidation', 'closure', 'residue', 'primed', 'opening'].includes(state.state)
    }
    if (rule.resolvedMode === 'verify') {
      return ['opening', 'active', 'consolidation', 'primed'].includes(state.state)
    }
    return ['active', 'peak', 'opening'].includes(state.state)
  }).length
  const stateRuleAlignmentRate =
    input.states.domains.length > 0 ? alignedStates / input.states.domains.length : 0

  const patternScenarioAlignedCount = scenarios.filter((scenario) =>
    patterns.some((pattern) => pattern.id === scenario.patternId && pattern.domains.includes(scenario.domain))
  ).length
  const patternScenarioAlignmentRate = scenarios.length > 0 ? patternScenarioAlignedCount / scenarios.length : 1

  const confidence = canonical?.confidence ?? 0.5
  const crossAgreement = canonical?.crossAgreement ?? null
  const cautionPressure = canonical
    ? clamp01(
        canonical.cautions.length * 0.08 +
          (canonical.coherenceAudit.gatedDecision ? 0.18 : 0) +
          canonical.coherenceAudit.domainConflictCount * 0.1
      )
    : 0
  const overcommitRisk = clamp01(
    (focusRule?.resolvedMode === 'prepare' ? 0.45 : focusRule?.resolvedMode === 'verify' ? 0.22 : 0) +
      (focusActivation && focusActivation.activationScore >= 3.5 ? 0.1 : 0) +
      (crossAgreement !== null && crossAgreement < 0.35 ? 0.2 : 0) +
      cautionPressure * 0.35
  )
  const irreversibilityPressure = clamp01(
    (scenarios.filter((scenario) => !scenario.reversible).length / Math.max(1, scenarios.length)) * 0.7 +
      (topDecisionOption && !topDecisionOption.reversible ? 0.25 : 0) +
      (canonical?.judgmentPolicy.mode === 'execute' ? 0.1 : 0)
  )
  const domainConcentration = clamp01(
    canonical?.domainLeads?.length
      ? (canonical.domainLeads[0]?.dominanceScore || 0) /
        Math.max(0.01, canonical.domainLeads.reduce((sum, lead) => sum + lead.dominanceScore, 0))
      : 0
  )

  const contradictions: string[] = []
  const notes: string[] = []
  if (canonical) {
    if (focusRule && focusRule.resolvedMode === 'prepare' && canonical.judgmentPolicy.mode === 'execute') {
      contradictions.push('focus_rule_prepare_but_execute_verdict')
    }
    if (focusState?.state === 'residue' && canonical.judgmentPolicy.mode === 'execute') {
      contradictions.push('residue_state_execute_conflict')
    }
    if (crossAgreement !== null && crossAgreement < 0.35 && canonical.judgmentPolicy.mode === 'execute') {
      contradictions.push('low_cross_agreement_execute_policy')
    }
    if (focusScenarios.length === 0) {
      contradictions.push('focus_domain_without_scenarios')
    }
    if (topDecisionOption && topDecisionOption.domain !== canonical.focusDomain) {
      contradictions.push('top_decision_domain_focus_mismatch')
    }
    if (canonical.judgmentPolicy.mode === 'execute' && focusRule?.resolvedMode === 'verify') {
      contradictions.push('verify_rule_execute_policy_conflict')
    }
    if (patternScenarioAlignmentRate < 0.8) {
      contradictions.push('pattern_scenario_alignment_low')
    }
    if (stateRuleAlignmentRate < 0.6) {
      warnings.push('state_rule_alignment_low')
    }
    if (domainConcentration >= 0.72 && canonical.domainLeads.length >= 3) {
      warnings.push('single_domain_concentration_high')
    }
    if (irreversibilityPressure >= 0.65 && canonical.judgmentPolicy.mode !== 'prepare') {
      warnings.push('irreversibility_pressure_high')
    }
    notes.push(`focus:${canonical.focusDomain}`)
    notes.push(`policy:${canonical.judgmentPolicy.mode}`)
    notes.push(`focus_scenarios:${focusScenarios.length}`)
  }

  const topRuleDrivers = input.rules.domains
    .map((rule) => {
      const reasons = [
        ...(rule.amplify.slice(0, 2) || []),
        ...(rule.gate.slice(0, 2) || []),
        ...(rule.delay.slice(0, 1) || []),
        ...(rule.convert.slice(0, 1) || []),
      ].filter(Boolean)
      const focusBonus = canonical && rule.domain === canonical.focusDomain ? 0.25 : 0
      const modeBonus = rule.resolvedMode === 'execute' ? 0.12 : rule.resolvedMode === 'verify' ? 0.08 : 0.05
      const baseScore = rule.priorityScore / 3.6
      const reasonBonus = Math.min(reasons.length, 4) * 0.05
      const contradictionPenalty = rule.contradictionPenalty * 0.28
      const score = round2(clamp01(softCap(baseScore + focusBonus + modeBonus + reasonBonus - contradictionPenalty)))
      return {
        domain: rule.domain,
        mode: rule.resolvedMode,
        score,
        reasons,
        breakdown: {
          baseScore: round2(baseScore),
          focusBonus: round2(focusBonus),
          modeBonus: round2(modeBonus),
          reasonBonus: round2(reasonBonus),
          contradictionPenalty: round2(contradictionPenalty),
          finalScore: score,
        },
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  const policyMode = canonical?.judgmentPolicy.mode ?? 'verify'
  const patternBaseScores = patterns.map((pattern) => ({
    pattern,
    raw:
      pattern.score / 20 +
      pattern.confidence * 0.24 +
      (canonical && pattern.domains.includes(canonical.focusDomain) ? 0.08 : 0) +
      (canonical?.leadPatternId === pattern.id ? 0.12 : 0) +
      (pattern.resolvedMode === policyMode ? 0.04 : 0.01) +
      policyProfileBonus(pattern.profile, policyMode) +
      stateTieBreakBonus(pattern.domainState, policyMode) +
      (pattern.crossAgreement !== null ? clamp01(pattern.crossAgreement) * 0.025 : 0) -
      Math.min(pattern.blockedBy.length, 4) * 0.018,
  }))
  const sortedPatternRaw = patternBaseScores.map((item) => item.raw).sort((a, b) => b - a)
  const topPatternRaw = sortedPatternRaw[0] || 0
  const secondPatternRaw = sortedPatternRaw[1] || 0
  const topPatternDrivers = patternBaseScores
    .map(({ pattern, raw }, index) => {
      const domainMatch = canonical ? pattern.domains.includes(canonical.focusDomain) : false
      const focusBonus = canonical && pattern.domains.includes(canonical.focusDomain) ? 0.08 : 0
      const leadBonus = canonical?.leadPatternId === pattern.id ? 0.12 : 0
      const modeBonus = pattern.resolvedMode === policyMode ? 0.04 : 0.01
      const profileBonus = policyProfileBonus(pattern.profile, policyMode)
      const stateBonus = stateTieBreakBonus(pattern.domainState, policyMode)
      const agreementBonus = pattern.crossAgreement !== null ? clamp01(pattern.crossAgreement) * 0.025 : 0
      const blockedPenalty = Math.min(pattern.blockedBy.length, 4) * 0.018
      const gapBonus = relativeGapBonus(raw, topPatternRaw, secondPatternRaw)
      const score = round2(clamp01(softCap(raw + gapBonus)))
      return {
        id: pattern.id,
        domainMatch,
        score,
        raw,
        clusterRank: index + 1,
        topGap: round3(topPatternRaw > 0 ? Math.max(0, (topPatternRaw - raw) / topPatternRaw) : 0),
        breakdown: {
          baseScore: normalizedBreakdownBase(
            raw - focusBonus - leadBonus - modeBonus - profileBonus - stateBonus - agreementBonus + blockedPenalty
          ),
          focusBonus: round2(focusBonus),
          leadBonus: round2(leadBonus),
          modeBonus: round2(modeBonus),
          profileBonus: round2(profileBonus),
          stateBonus: round2(stateBonus),
          agreementBonus: round2(agreementBonus),
          blockedPenalty: round2(blockedPenalty),
          gapBonus: round2(gapBonus),
          finalScore: score,
        },
      }
    })
    .sort((a, b) => (b.raw - a.raw) || (b.score - a.score) || a.id.localeCompare(b.id))
    .map((item, index) => ({
      id: item.id,
      domainMatch: item.domainMatch,
      score: item.score,
      clusterRank: item.clusterRank,
      tieBreakRank: index + 1,
      topGap: item.topGap,
      breakdown: item.breakdown,
    }))
    .slice(0, 5)

  const scenarioBaseScores = scenarios.map((scenario) => ({
    scenario,
    raw:
      (scenario.rawScore ?? scenario.probability) * 0.34 +
      scenario.confidence * 0.18 +
      scenario.timingRelevance * 0.14 +
      (canonical && scenario.domain === canonical.focusDomain ? 0.08 : 0) +
      (canonical?.leadScenarioId === scenario.id ? 0.14 : 0) +
      windowTieBreakBonus(scenario.window, policyMode) +
      reversibilityTieBreakBonus(scenario.reversible, policyMode) +
      scenarioBranchPolicyBonus(scenario.branch, policyMode) +
      scenarioSpecificityBonus(scenario.branch) +
      (scenario.whyNow ? 0.03 : 0) +
      Math.min(scenario.entryConditions.length, 4) * 0.014 -
      Math.min(scenario.abortConditions.length, 4) * 0.018 -
      (scenario.whyNotYet ? 0.028 : 0),
  }))
  const sortedScenarioRaw = scenarioBaseScores.map((item) => item.raw).sort((a, b) => b - a)
  const topScenarioRaw = sortedScenarioRaw[0] || 0
  const secondScenarioRaw = sortedScenarioRaw[1] || 0
  const thirdScenarioRaw = sortedScenarioRaw[2] || 0
  const topScenarioDrivers = scenarioBaseScores
    .map(({ scenario, raw }, index) => {
      const domainMatch = canonical ? scenario.domain === canonical.focusDomain : false
      const focusBonus = canonical && scenario.domain === canonical.focusDomain ? 0.08 : 0
      const leadBonus = canonical?.leadScenarioId === scenario.id ? 0.14 : 0
      const windowBonus = windowTieBreakBonus(scenario.window, policyMode)
      const reversibleBonus = reversibilityTieBreakBonus(scenario.reversible, policyMode)
      const branchPolicyBonus = scenarioBranchPolicyBonus(scenario.branch, policyMode)
      const specificityBonus = scenarioSpecificityBonus(scenario.branch)
      const whyNowBonus = scenario.whyNow ? 0.03 : 0
      const entryBonus = Math.min(scenario.entryConditions.length, 4) * 0.014
      const abortPenalty = Math.min(scenario.abortConditions.length, 4) * 0.018
      const whyNotYetPenalty = scenario.whyNotYet ? 0.028 : 0
      const gapBonus = relativeGapBonus(raw, topScenarioRaw, secondScenarioRaw)
      const score = round2(clamp01(softCap(raw + gapBonus)))
      return {
        id: scenario.id,
        domainMatch,
        score,
        reversible: scenario.reversible,
        raw,
        clusterRank: index + 1,
        topGap: round3(topScenarioRaw > 0 ? Math.max(0, (topScenarioRaw - raw) / topScenarioRaw) : 0),
        breakdown: {
          baseScore: normalizedBreakdownBase(
            raw -
              focusBonus -
              leadBonus -
              windowBonus -
              reversibleBonus -
              branchPolicyBonus -
              specificityBonus -
              whyNowBonus -
              entryBonus +
              abortPenalty +
              whyNotYetPenalty
          ),
          focusBonus: round2(focusBonus),
          leadBonus: round2(leadBonus),
          windowBonus: round2(windowBonus),
          reversibleBonus: round2(reversibleBonus),
          branchPolicyBonus: round2(branchPolicyBonus),
          specificityBonus: round2(specificityBonus),
          whyNowBonus: round2(whyNowBonus),
          entryBonus: round2(entryBonus),
          abortPenalty: round2(abortPenalty),
          whyNotYetPenalty: round2(whyNotYetPenalty),
          gapBonus: round2(gapBonus),
          finalScore: score,
        },
      }
    })
    .sort((a, b) => {
      if (b.raw !== a.raw) return b.raw - a.raw
      if (b.score !== a.score) return b.score - a.score
      if (a.reversible !== b.reversible) return Number(a.reversible) - Number(b.reversible)
      return a.id.localeCompare(b.id)
    })
    .map((item, index) => ({
      id: item.id,
      domainMatch: item.domainMatch,
      score: item.score,
      reversible: item.reversible,
      clusterRank: item.clusterRank,
      tieBreakRank: index + 1,
      topGap: item.topGap,
      breakdown: item.breakdown,
    }))
    .slice(0, 5)
  const topScenarioGap =
    topScenarioDrivers.length >= 2
      ? round3(
          Math.max(0, topScenarioRaw - secondScenarioRaw) /
            Math.max(0.001, topScenarioRaw)
        )
      : 0
  const scenarioClusterCompression =
    topScenarioDrivers.length >= 3
      ? round3(
          1 -
            Math.max(
              0,
              (topScenarioRaw - thirdScenarioRaw) /
                Math.max(0.001, topScenarioRaw)
            )
        )
      : 0
  const topTimingScenarios = scenarios
    .slice()
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5)
  const timingSensitiveTopCount = topTimingScenarios.filter((scenario) => isTimingSensitiveBranch(scenario.branch)).length
  const timingRelevanceMean =
    topTimingScenarios.length > 0
      ? topTimingScenarios.reduce((sum, scenario) => sum + scenario.timingRelevance, 0) / topTimingScenarios.length
      : 0
  const timingSharpness = round3(
    clamp01(timingRelevanceMean * 0.65 + (timingSensitiveTopCount / Math.max(1, topTimingScenarios.length)) * 0.35)
  )

  const sortedDecisionRaw = (input.decisionEngine?.options || [])
    .map((option) =>
      option.scores.total / 20 +
      option.confidence * 0.24 +
      (canonical && option.domain === canonical.focusDomain ? 0.12 : 0) +
      decisionActionFitBonus(option.action, policyMode) +
      reversibilityTieBreakBonus(option.reversible, policyMode) +
      (option.id === input.decisionEngine?.topOptionId ? 0.04 : 0) +
      Math.min(option.supportingScenarioIds.length, 4) * 0.01 +
      (option.gated ? -0.18 : 0)
    )
    .sort((a, b) => b - a)
  const topDecisionRaw = sortedDecisionRaw[0] || 0
  const secondDecisionRaw = sortedDecisionRaw[1] || 0
  const decisionDriver =
    canonical && topDecisionOption
      ? (() => {
          const raw =
            topDecisionOption.scores.total / 20 +
            topDecisionOption.confidence * 0.24 +
            (topDecisionOption.domain === canonical.focusDomain ? 0.12 : 0) +
            decisionActionFitBonus(topDecisionOption.action, policyMode) +
            reversibilityTieBreakBonus(topDecisionOption.reversible, policyMode) +
            Math.min(topDecisionOption.supportingScenarioIds.length, 4) * 0.01 +
            (topDecisionOption.gated ? -0.18 : 0)
          return {
            id: topDecisionOption.id,
            domainMatch: topDecisionOption.domain === canonical.focusDomain,
            score: round2(clamp01(softCap(raw + relativeGapBonus(raw, topDecisionRaw, secondDecisionRaw)))),
            gated: Boolean(topDecisionOption.gated),
            topGap: round3(topDecisionRaw > 0 ? Math.max(0, (topDecisionRaw - secondDecisionRaw) / topDecisionRaw) : 0),
            breakdown: {
              baseScore: normalizedBreakdownBase(topDecisionOption.scores.total / 20 + topDecisionOption.confidence * 0.24),
              focusBonus: round2(topDecisionOption.domain === canonical.focusDomain ? 0.12 : 0),
              actionFitBonus: round2(decisionActionFitBonus(topDecisionOption.action, policyMode)),
              reversibleBonus: round2(reversibilityTieBreakBonus(topDecisionOption.reversible, policyMode)),
              supportBonus: round2(Math.min(topDecisionOption.supportingScenarioIds.length, 4) * 0.01),
              gatedPenalty: round2(topDecisionOption.gated ? 0.18 : 0),
              gapBonus: round2(relativeGapBonus(raw, topDecisionRaw, secondDecisionRaw)),
              finalScore: round2(clamp01(softCap(raw + relativeGapBonus(raw, topDecisionRaw, secondDecisionRaw)))),
            },
          }
        })()
      : null
  const topDecisionGap =
    decisionDriver && sortedDecisionRaw.length >= 2
      ? round3(Math.max(0, (topDecisionRaw - secondDecisionRaw) / Math.max(0.001, topDecisionRaw)))
      : 0

  return {
    coverage: {
      tokenCount: input.features.tokens.length,
      domainActivationCount: input.activation.domains.length,
      ruledDomainCount: input.rules.domains.length,
      stateCount: input.states.domains.length,
    },
    replay: {
      verdictAligned: contradictions.length === 0,
      focusDomainAligned: Boolean(canonical?.focusDomain && focusActivation && focusRule && focusState),
      stateRuleAlignmentRate: Math.round(stateRuleAlignmentRate * 100) / 100,
      patternScenarioAlignmentRate: Math.round(patternScenarioAlignmentRate * 100) / 100,
      focusScenarioDomainAligned: Boolean(canonical?.focusDomain && focusScenarios.length > 0),
      topDecisionDomainAligned: Boolean(!canonical || !topDecisionOption || topDecisionOption.domain === canonical.focusDomain),
    },
    calibration: {
      confidenceBand: confidence >= 0.7 ? 'high' : confidence >= 0.45 ? 'medium' : 'low',
      crossAgreementBand:
        crossAgreement === null
          ? 'unknown'
          : crossAgreement >= 0.65
            ? 'high'
            : crossAgreement >= 0.4
              ? 'medium'
              : 'low',
      cautionPressure: Math.round(cautionPressure * 100) / 100,
      overcommitRisk: Math.round(overcommitRisk * 100) / 100,
      irreversibilityPressure: Math.round(irreversibilityPressure * 100) / 100,
      domainConcentration: Math.round(domainConcentration * 100) / 100,
      timingSharpness,
      topScenarioGap,
      topDecisionGap,
      scenarioClusterCompression,
    },
    audit: {
      contradictions,
      notes,
    },
    influence: {
      topRuleDrivers,
      topPatternDrivers,
      topScenarioDrivers,
      decisionDriver,
    },
    warnings,
  }
}
