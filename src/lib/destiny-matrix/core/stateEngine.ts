import type { SignalDomain } from './signalSynthesizer'
import type { ActivationEngineResult } from './activationEngine'
import type { RuleEngineResult } from './ruleEngine'

export type DomainState =
  | 'dormant'
  | 'primed'
  | 'opening'
  | 'active'
  | 'peak'
  | 'consolidation'
  | 'closure'
  | 'residue'

export interface DomainStateResult {
  domain: SignalDomain
  state: DomainState
  rationale: string
}

export interface StateEngineResult {
  domains: DomainStateResult[]
}

function promoteState(state: DomainState): DomainState {
  if (state === 'dormant') return 'primed'
  if (state === 'primed') return 'opening'
  if (state === 'opening') return 'active'
  if (state === 'active') return 'peak'
  return state
}

function transitionToSaferState(state: DomainState): DomainState {
  if (state === 'peak') return 'consolidation'
  if (state === 'active') return 'opening'
  if (state === 'opening') return 'primed'
  return state
}

function hasSignal(values: string[] | undefined, pattern: RegExp): boolean {
  return (values || []).some((value) => pattern.test(value))
}

export function buildStateEngine(input: {
  lang: 'ko' | 'en'
  activation: ActivationEngineResult
  rules: RuleEngineResult
}): StateEngineResult {
  const domains = input.activation.domains.map((activation) => {
    const rules = input.rules.domains.find((item) => item.domain === activation.domain)
    const score = activation.activationScore
    const mode = rules?.resolvedMode || 'verify'

    let state: DomainState = 'primed'
    if (score < 0.8) state = 'dormant'
    else if (score < 1.6) state = 'primed'
    else if (score < 2.4) state = 'opening'
    else if (score < 3.4) state = mode === 'prepare' ? 'consolidation' : 'active'
    else if (score < 4.6) state = mode === 'prepare' ? 'consolidation' : 'peak'
    else state = mode === 'prepare' ? 'residue' : 'peak'

    if (rules?.delay.length) state = state === 'peak' ? 'active' : state
    if (rules?.contradictionPenalty && rules.contradictionPenalty >= 0.24) {
      state = state === 'peak' ? 'consolidation' : state === 'active' ? 'opening' : state
    }

    const amplify = rules?.amplify || []
    const suppress = rules?.suppress || []
    const gate = rules?.gate || []
    const delay = rules?.delay || []
    const convert = rules?.convert || []

    if (activation.domain === 'career') {
      const strongStructure = hasSignal(amplify, /authority_visibility|strategy_planning|contract_alignment|precision_planning/i)
      const reviewPressure =
        hasSignal(gate, /commit_now|blind_spot_commitment|authority_conflict/i) ||
        hasSignal(delay, /finalize_terms|announcement_timing|certainty/i)
      if (mode === 'execute' && strongStructure && score >= 2.4) state = promoteState(state)
      if ((mode === 'verify' || reviewPressure) && state === 'peak') state = 'active'
      if ((mode === 'prepare' || reviewPressure) && state === 'active') state = 'opening'
    }

    if (activation.domain === 'relationship') {
      const bondingSupport = hasSignal(amplify, /bond_definition|contact_window|chemistry_window|mutual_attraction_window/i)
      const boundaryPressure =
        hasSignal(gate, /forced_closeness|projection_bias|boundary_breach|instant_commitment|shadow_reactivity/i) ||
        hasSignal(delay, /premature_definition|confirmation_before_labeling|slow_trust_build|emotionally_loaded_decision/i) ||
        hasSignal(convert, /selective_distance/i)
      if (boundaryPressure) state = transitionToSaferState(state)
      if (bondingSupport && !boundaryPressure && mode === 'execute' && score >= 2.2) state = promoteState(state)
      if (mode === 'prepare' && state === 'opening') state = 'consolidation'
    }

    if (activation.domain === 'wealth') {
      const gainStructure = hasSignal(amplify, /structured_gain_window|pricing_power|resource_buffer|fortune_window/i)
      const leakagePressure =
        hasSignal(gate, /blind_spot_spending|commit_now/i) ||
        hasSignal(delay, /finalize_terms|certainty/i) ||
        hasSignal(suppress, /volatility_chasing/i)
      if (gainStructure && mode === 'execute' && score >= 2.4) state = promoteState(state)
      if (leakagePressure) state = transitionToSaferState(state)
      if (mode === 'prepare' && score >= 3.4 && state === 'residue') state = 'consolidation'
    }

    if (activation.domain === 'health') {
      const recoveryFrame = hasSignal(amplify, /recovery_protocol|nourishment_routine|healing_routine|care_routine_grid/i)
      const overloadPressure =
        hasSignal(delay, /high_intensity_push|recovery_skipping|slow_trust_build/i) ||
        hasSignal(gate, /reckless_push|inflammation_spike/i) ||
        hasSignal(suppress, /overload/i)
      if (overloadPressure) {
        state = state === 'peak' ? 'closure' : transitionToSaferState(state)
      }
      if (recoveryFrame && mode !== 'execute') {
        state = state === 'dormant'
          ? 'primed'
          : state === 'primed'
            ? 'opening'
            : state === 'residue'
              ? 'consolidation'
              : state
      }
    }

    if (activation.domain === 'move') {
      const mobilitySupport = hasSignal(amplify, /movement_window|travel_for_opportunity|housing_search_momentum/i)
      const routeGuard =
        hasSignal(gate, /route_assumption|impulsive_move|commit_now/i) ||
        hasSignal(delay, /housing_commitment|announcement_timing|finalize_terms/i) ||
        hasSignal(convert, /staged_move/i)
      if (routeGuard) state = transitionToSaferState(state)
      if (mobilitySupport && !routeGuard && score >= 2.2) state = promoteState(state)
      if (mode === 'prepare' && state === 'active') state = 'opening'
    }

    if (activation.domain === 'timing') {
      const hotWindow = hasSignal(amplify, /phase_window|transition_window|transit_trigger_window|fated_crossroad_window/i)
      const slowWindow = hasSignal(delay, /announcement_timing|finalize_terms|emotionally_loaded_decision/i)
      const hardGate = hasSignal(gate, /commit_now|route_assumption|premature_statement/i)
      if (hardGate) state = transitionToSaferState(state)
      if (slowWindow && state === 'peak') state = 'consolidation'
      if (hotWindow && !hardGate && mode === 'execute') state = promoteState(state)
    }

    const rationale =
      input.lang === 'ko'
        ? `${activation.domain} ??? ?? ?? ${activation.activationScore}? ?? ?? ${mode} ???? ${state} ??? ?????.`
        : `${activation.domain} resolves to ${state} from activation ${activation.activationScore} and rule mode ${mode}.`

    return {
      domain: activation.domain,
      state,
      rationale,
    }
  })

  return { domains }
}
