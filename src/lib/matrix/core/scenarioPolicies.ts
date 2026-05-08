import type { SignalDomain } from './signalSynthesizer'
import type { PatternResult } from './patternEngine'
import type { RuleEngineResult } from './ruleEngine'
import type { StateEngineResult } from './stateEngine'

interface ScenarioPolicyInput {
  branch: string
  domain: SignalDomain
  pattern: PatternResult
  activationAxes: string[]
  rule?: RuleEngineResult['domains'][number]
  state?: StateEngineResult['domains'][number]
}

interface ScenarioTimingPolicyInput {
  domain: SignalDomain
  branch: string
  rule?: RuleEngineResult['domains'][number]
  state?: StateEngineResult['domains'][number]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function hasRuleSignal(values: string[] | undefined, pattern: RegExp): boolean {
  return (values || []).some((value) => pattern.test(value))
}

function applyCareerBranchPolicy(input: ScenarioPolicyInput, weight: number): number {
  const branch = input.branch.toLowerCase()
  const amplify = input.rule?.amplify || []
  const gate = input.rule?.gate || []
  const delay = input.rule?.delay || []
  const suppress = input.rule?.suppress || []
  const convert = input.rule?.convert || []
  const axes = input.activationAxes || []
  const keywords = input.pattern.matchedKeywords || []
  const mode = input.rule?.resolvedMode || input.pattern.resolvedMode
  const state = input.state?.state || input.pattern.domainState
  const hasAxis = (axis: string) => axes.includes(axis)
  const hasKeyword = (pattern: RegExp) => keywords.some((keyword) => pattern.test(keyword))

  if (branch === 'entry') {
    if (mode === 'execute' && (state === 'opening' || state === 'active')) weight += 0.04
    if (hasAxis('expansion')) weight += 0.02
    if (gate.length > 0 || delay.length > 0) weight -= 0.03
  }
  if (branch === 'promotion_review') {
    if (mode === 'verify' || mode === 'prepare') weight += 0.05
    if (hasRuleSignal(gate, /commit_now|blind_spot_commitment|authority_conflict/i)) weight += 0.03
    if (hasRuleSignal(delay, /finalize_terms|signature|certainty/i)) weight += 0.02
    if (state === 'peak') weight -= 0.01
  }
  if (branch === 'contract_negotiation') {
    if (mode === 'verify') weight += 0.05
    if (hasRuleSignal(gate, /blind_spot_commitment|commit_now/i)) weight += 0.035
    if (hasRuleSignal(delay, /finalize_terms|certainty|signature/i)) weight += 0.03
    if (hasAxis('verification')) weight += 0.02
  }
  if (branch === 'manager_track') {
    if (state === 'active' || state === 'peak') weight += 0.03
    if (hasKeyword(/leadership|authority|visibility|manager/i)) weight += 0.035
    if (hasRuleSignal(amplify, /strategy_planning|expansion/i)) weight += 0.015
    if (mode === 'verify') weight -= 0.01
    if (hasRuleSignal(suppress, /overextension/i)) weight -= 0.02
  }
  if (branch === 'specialist_track') {
    if (hasAxis('deep_work')) weight += 0.035
    if (hasRuleSignal(amplify, /research_planning|study_specialization|craft_refinement|service_specialization/i)) {
      weight += 0.045
    }
    if (mode === 'verify') weight += 0.012
    if (hasKeyword(/research|craft|specialist|expert/i)) weight += 0.02
    if (hasRuleSignal(convert, /selective_distance/i)) weight += 0.01
  }

  return weight
}

function applyRelationshipBranchPolicy(input: ScenarioPolicyInput, weight: number): number {
  const branch = input.branch.toLowerCase()
  const gate = input.rule?.gate || []
  const delay = input.rule?.delay || []
  const convert = input.rule?.convert || []
  const keywords = input.pattern.matchedKeywords || []
  const mode = input.rule?.resolvedMode || input.pattern.resolvedMode
  const state = input.state?.state || input.pattern.domainState
  const hasKeyword = (pattern: RegExp) => keywords.some((keyword) => pattern.test(keyword))

  if (branch === 'commitment_preparation') {
    if (mode === 'verify' || mode === 'prepare') weight += 0.05
    if (hasRuleSignal(gate, /instant_commitment|forced_closeness|projection_bias/i)) weight += 0.035
    if (hasRuleSignal(delay, /premature_definition|confirmation_before_labeling/i)) weight += 0.03
    if (hasKeyword(/commitment|prepare|daily|fit|expectation/i)) weight += 0.02
    if (state === 'opening' || state === 'consolidation') weight += 0.015
  }
  if (branch === 'commitment_execution') {
    if (mode === 'execute' && (state === 'active' || state === 'peak')) weight += 0.03
    if (hasRuleSignal(gate, /instant_commitment|forced_closeness|boundary_breach/i)) weight -= 0.05
    if (hasRuleSignal(delay, /premature_definition|emotionally_loaded_decision/i)) weight -= 0.03
  }
  if (branch === 'cohabitation') {
    if (hasRuleSignal(gate, /forced_closeness|boundary_breach/i)) weight -= 0.05
    if (hasRuleSignal(delay, /premature_definition/i)) weight -= 0.03
    if (hasKeyword(/daily|shared|home|cohabit/i)) weight += 0.02
  }
  if (branch === 'family_acceptance') {
    if (mode === 'verify') weight += 0.05
    if (hasRuleSignal(gate, /projection_bias|forced_closeness/i)) weight += 0.02
    if (hasKeyword(/family|acceptance|approval/i)) weight += 0.025
  }
  if (branch === 'clarify_expectations') {
    if (mode === 'verify' || mode === 'prepare') weight += 0.045
    if (hasRuleSignal(delay, /confirmation_before_labeling|premature_definition|emotionally_loaded_decision/i)) {
      weight += 0.04
    }
    if (hasRuleSignal(gate, /projection_bias|forced_closeness/i)) weight += 0.02
    if (hasKeyword(/clarify|expectation|define|question|summary/i)) weight += 0.03
    if (state === 'opening' || state === 'consolidation') weight += 0.015
  }
  if (branch === 'boundary_reset') {
    if (hasRuleSignal(gate, /boundary_breach|shadow_reactivity|projection_bias/i)) weight += 0.05
    if (hasRuleSignal(convert, /selective_distance/i)) weight += 0.03
    if (mode === 'verify' || mode === 'prepare') weight += 0.02
    if (state === 'consolidation' || state === 'residue' || state === 'opening') weight += 0.02
    if (hasKeyword(/boundary|reset|limit|agreement|space/i)) weight += 0.03
  }
  if (branch === 'distance_tuning') {
    if (hasRuleSignal(gate, /boundary_breach|shadow_reactivity|projection_bias/i)) weight += 0.035
    if (hasRuleSignal(convert, /selective_distance/i)) weight += 0.045
    if (hasRuleSignal(delay, /slow_trust_build|emotionally_loaded_decision/i)) weight += 0.02
    if (mode === 'verify' || mode === 'prepare') weight += 0.02
    if (state === 'consolidation' || state === 'opening' || state === 'residue') weight += 0.02
    if (hasKeyword(/distance|space|tuning|pause|cool/i)) weight += 0.03
  }
  if (branch === 'separation') {
    if (hasRuleSignal(gate, /shadow_reactivity|forced_closeness|projection_bias/i)) weight += 0.04
    if (hasRuleSignal(delay, /emotionally_loaded_decision/i)) weight -= 0.03
  }

  return weight
}

function applyWealthBranchPolicy(input: ScenarioPolicyInput, weight: number): number {
  const branch = input.branch.toLowerCase()
  const gate = input.rule?.gate || []
  const delay = input.rule?.delay || []
  const axes = input.activationAxes || []
  const keywords = input.pattern.matchedKeywords || []
  const mode = input.rule?.resolvedMode || input.pattern.resolvedMode
  const hasAxis = (axis: string) => axes.includes(axis)
  const hasKeyword = (pattern: RegExp) => keywords.some((keyword) => pattern.test(keyword))

  if (branch === 'income_growth') {
    if (hasAxis('expansion')) weight += 0.03
    if (mode === 'execute' || mode === 'verify') weight += 0.02
  }
  if (branch === 'capital_allocation') {
    if (mode === 'verify') weight += 0.05
    if (hasRuleSignal(delay, /finalize_terms|certainty/i)) weight += 0.03
    if (hasRuleSignal(gate, /blind_spot_spending|commit_now/i)) weight += 0.03
  }
  if (branch === 'asset_exit') {
    if (mode === 'verify' || mode === 'prepare') weight += 0.04
    if (hasRuleSignal(delay, /finalize_terms|certainty/i)) weight += 0.02
    if (hasRuleSignal(gate, /blind_spot_spending/i)) weight += 0.02
  }
  if (branch === 'debt_restructure') {
    if (mode === 'prepare' || mode === 'verify') weight += 0.05
    if (hasRuleSignal(gate, /blind_spot_spending/i)) weight += 0.03
    if (hasKeyword(/debt|restructure|liquidity/i)) weight += 0.025
  }
  if (branch === 'expense_spike' || branch === 'liquidity_defense') {
    if (mode === 'prepare') weight += 0.04
    if (hasRuleSignal(gate, /blind_spot_spending/i)) weight += 0.03
  }

  return weight
}

function applyMoveBranchPolicy(input: ScenarioPolicyInput, weight: number): number {
  const branch = input.branch.toLowerCase()
  const gate = input.rule?.gate || []
  const delay = input.rule?.delay || []
  const convert = input.rule?.convert || []
  const axes = input.activationAxes || []
  const keywords = input.pattern.matchedKeywords || []
  const mode = input.rule?.resolvedMode || input.pattern.resolvedMode
  const state = input.state?.state || input.pattern.domainState
  const hasAxis = (axis: string) => axes.includes(axis)
  const hasKeyword = (pattern: RegExp) => keywords.some((keyword) => pattern.test(keyword))

  if (branch === 'route_recheck') {
    if (mode === 'verify' || mode === 'prepare') weight += 0.05
    if (hasRuleSignal(delay, /housing_commitment|finalize_terms/i)) weight += 0.03
    if (hasRuleSignal(gate, /route_assumption|impulsive_move|commit_now/i)) weight += 0.03
    if (hasKeyword(/route|recheck|review|commute/i)) weight += 0.025
    if (state === 'opening' || state === 'consolidation') weight += 0.015
  }
  if (branch === 'commute_restructure') {
    if (mode === 'verify' || mode === 'prepare') weight += 0.045
    if (hasRuleSignal(delay, /housing_commitment|announcement_timing/i)) weight += 0.025
    if (hasKeyword(/commute|route|daily|travel/i)) weight += 0.02
    if (hasAxis('mobility') || hasAxis('transition')) weight += 0.02
    if (state === 'opening' || state === 'consolidation') weight += 0.015
  }
  if (branch === 'basecamp_reset') {
    if (mode === 'prepare') weight += 0.05
    if (state === 'consolidation' || state === 'residue' || state === 'opening') weight += 0.02
    if (hasRuleSignal(convert, /staged_move/i)) weight += 0.03
    if (hasKeyword(/basecamp|home|reset|stability/i)) weight += 0.025
  }
  if (branch === 'relocation' || branch === 'cross_border_move' || branch === 'lease_decision') {
    if (hasRuleSignal(gate, /route_assumption|impulsive_move|commit_now/i)) weight -= 0.04
    if (hasRuleSignal(delay, /housing_commitment|finalize_terms|announcement_timing/i)) weight -= 0.03
  }

  return weight
}

function applyHealthBranchPolicy(input: ScenarioPolicyInput, weight: number): number {
  const branch = input.branch.toLowerCase()
  const amplify = input.rule?.amplify || []
  const gate = input.rule?.gate || []
  const delay = input.rule?.delay || []
  const suppress = input.rule?.suppress || []
  const keywords = input.pattern.matchedKeywords || []
  const mode = input.rule?.resolvedMode || input.pattern.resolvedMode
  const state = input.state?.state || input.pattern.domainState
  const hasKeyword = (pattern: RegExp) => keywords.some((keyword) => pattern.test(keyword))

  if (branch === 'recovery_reset') {
    if (mode === 'prepare' || mode === 'verify') weight += 0.05
    if (hasRuleSignal(delay, /overload|high_intensity_push|recovery_skipping/i)) weight += 0.035
    if (hasKeyword(/reset|sleep|meal|hydration|recovery/i)) weight += 0.025
    if (state === 'opening' || state === 'consolidation') weight += 0.015
  }
  if (branch === 'load_rebalance' || branch === 'schedule_reduction') {
    if (mode === 'prepare' || mode === 'verify') weight += 0.04
    if (hasRuleSignal(suppress, /overextension|reckless_push/i)) weight += 0.025
    if (hasRuleSignal(delay, /overload|high_intensity_push/i)) weight += 0.03
    if (hasKeyword(/load|schedule|reduce|rebalance|drain/i)) weight += 0.025
  }
  if (branch === 'routine_lock' || branch === 'habit_rebuild' || branch === 'recovery_compliance') {
    if (mode === 'prepare' || mode === 'verify') weight += 0.035
    if (hasRuleSignal(amplify, /recovery_protocol|nourishment_routine|habit_devotion/i)) weight += 0.04
    if (hasKeyword(/routine|habit|compliance|repeat|daily/i)) weight += 0.025
    if (state === 'consolidation' || state === 'opening') weight += 0.015
    if (branch === 'recovery_compliance') weight += 0.02
  }
  if (branch === 'recovery') {
    if (mode === 'prepare' || mode === 'verify') weight += 0.03
    if (hasRuleSignal(amplify, /recovery_protocol|healing_routine|nourishment_routine/i)) weight += 0.035
    if (hasRuleSignal(delay, /high_intensity_push|overload/i)) weight += 0.02
  }
  if (branch === 'early_warning') {
    if (mode === 'verify' || mode === 'prepare') weight += 0.04
    if (hasRuleSignal(delay, /stress_spike|inflammation_spike|recovery_skipping/i)) weight += 0.02
    if (hasKeyword(/warning|signal|track|quiet/i)) weight += 0.02
  }
  if (branch === 'burnout_trigger' || branch === 'sleep_disruption' || branch === 'inflammation') {
    if (hasRuleSignal(gate, /reckless_push|commit_now/i)) weight += 0.03
    if (hasRuleSignal(delay, /overload|high_intensity_push|stress_spike|inflammation_spike/i)) weight += 0.03
    if (mode === 'prepare' || mode === 'verify') weight += 0.015
    if (hasKeyword(/burnout|sleep|inflammation|heat|trigger/i)) weight += 0.025
  }

  return weight
}

function applyCareerTimingPolicy(input: ScenarioTimingPolicyInput, weight: number, timingHot: boolean, timingSlow: boolean, timingGate: boolean): number {
  const branch = input.branch.toLowerCase()
  if ((branch === 'promotion_review' || branch === 'contract_negotiation') && timingSlow) weight += 0.03
  if ((branch === 'entry' || branch === 'promotion' || branch === 'project_launch') && timingGate) weight -= 0.03
  if ((branch === 'manager_track' || branch === 'specialist_track') && timingHot) weight += 0.02
  return weight
}

function applyRelationshipTimingPolicy(input: ScenarioTimingPolicyInput, weight: number, timingSlow: boolean, timingGate: boolean): number {
  const branch = input.branch.toLowerCase()
  if ((branch === 'commitment_execution' || branch === 'cohabitation') && (timingSlow || timingGate)) weight -= 0.04
  if (branch === 'commitment_preparation' && timingSlow) weight += 0.035
  if (branch === 'clarify_expectations' && (timingSlow || timingGate)) weight += 0.04
  if (branch === 'boundary_reset' && timingGate) weight += 0.04
  if (branch === 'distance_tuning' && (timingGate || timingSlow)) weight += 0.045
  return weight
}

function applyWealthTimingPolicy(input: ScenarioTimingPolicyInput, weight: number, timingHot: boolean, timingSlow: boolean, timingGate: boolean): number {
  const branch = input.branch.toLowerCase()
  if ((branch === 'capital_allocation' || branch === 'asset_exit') && (timingSlow || timingGate)) weight += 0.03
  if ((branch === 'income_growth' || branch === 'side_income') && timingHot) weight += 0.02
  return weight
}

function applyHealthTimingPolicy(input: ScenarioTimingPolicyInput, weight: number, timingSlow: boolean, timingGate: boolean): number {
  const branch = input.branch.toLowerCase()
  if ((branch === 'recovery' || branch === 'recovery_reset' || branch === 'recovery_compliance') && timingSlow) weight += 0.03
  if ((branch === 'burnout_trigger' || branch === 'sleep_disruption') && timingGate) weight += 0.02
  if ((branch === 'routine_lock' || branch === 'habit_rebuild') && timingSlow) weight += 0.02
  return weight
}

function applyMoveTimingPolicy(input: ScenarioTimingPolicyInput, weight: number, timingHot: boolean, timingSlow: boolean, timingGate: boolean): number {
  const branch = input.branch.toLowerCase()
  if ((branch === 'lease_decision' || branch === 'relocation' || branch === 'cross_border_move') && (timingSlow || timingGate)) weight -= 0.03
  if ((branch === 'housing_search' || branch === 'route_recheck') && timingSlow) weight += 0.03
  if (branch === 'travel' && timingHot) weight += 0.02
  return weight
}

export function resolveScenarioBranchPolicyWeight(input: ScenarioPolicyInput): number {
  const branch = input.branch.toLowerCase()
  const mode = input.rule?.resolvedMode || input.pattern.resolvedMode

  let weight = 1

  if (branch === 'alt') weight -= 0.08
  if (branch === 'defensive') weight -= mode === 'prepare' ? 0.04 : 0.06
  if (branch === 'main' && /_cluster$/i.test(input.pattern.id)) weight -= 0.03
  if (/_cluster$/i.test(input.pattern.id)) {
    if (branch === 'alt') weight -= 0.035
    if (branch === 'defensive') weight -= 0.025
    if (input.domain === 'personality' || input.domain === 'spirituality') weight -= 0.015
  }

  if (input.domain === 'career') weight = applyCareerBranchPolicy(input, weight)
  if (input.domain === 'relationship') weight = applyRelationshipBranchPolicy(input, weight)
  if (input.domain === 'wealth') weight = applyWealthBranchPolicy(input, weight)
  if (input.domain === 'health') weight = applyHealthBranchPolicy(input, weight)
  if (input.domain === 'move') weight = applyMoveBranchPolicy(input, weight)

  return clamp(weight, 0.88, 1.14)
}

export function resolveScenarioTimingPolicyWeight(input: ScenarioTimingPolicyInput): number {
  const branch = input.branch.toLowerCase()
  const amplify = input.rule?.amplify || []
  const gate = input.rule?.gate || []
  const delay = input.rule?.delay || []
  const state = input.state?.state
  const has = (values: string[], pattern: RegExp) => values.some((value) => pattern.test(value))

  const timingHot = has(amplify, /transition_window|phase_window|transit_trigger_window|fated_crossroad_window/i)
  const timingSlow = has(delay, /announcement_timing|finalize_terms|emotionally_loaded_decision|slow_trust_build/i)
  const timingGate = has(gate, /commit_now|route_assumption|premature_statement|projection_bias/i)

  let weight = 1

  if (timingHot && (state === 'opening' || state === 'active')) weight += 0.03
  if (timingSlow) weight -= 0.02
  if (timingGate && branch !== 'boundary_reset' && branch !== 'distance_tuning') weight -= 0.02

  if (input.domain === 'career') weight = applyCareerTimingPolicy(input, weight, timingHot, timingSlow, timingGate)
  if (input.domain === 'relationship') weight = applyRelationshipTimingPolicy(input, weight, timingSlow, timingGate)
  if (input.domain === 'wealth') weight = applyWealthTimingPolicy(input, weight, timingHot, timingSlow, timingGate)
  if (input.domain === 'health') weight = applyHealthTimingPolicy(input, weight, timingSlow, timingGate)
  if (input.domain === 'move') weight = applyMoveTimingPolicy(input, weight, timingHot, timingSlow, timingGate)

  return clamp(weight, 0.9, 1.1)
}
