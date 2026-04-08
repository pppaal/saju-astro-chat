import type { SignalDomain } from './signalSynthesizer'
import type { StrategyEngineResult } from './strategyEngine'
import type { MatrixCalculationInputNormalized } from './runDestinyCore'
import type { PatternResult } from './patternEngine'
import type { ActivationEngineResult } from './activationEngine'
import type { RuleEngineResult } from './ruleEngine'
import type { StateEngineResult } from './stateEngine'
import type { ScenarioDefinition, ScenarioWindow, TimingGranularity } from './scenarioEngine'
import {
  resolveScenarioBranchPolicyWeight,
  resolveScenarioTimingPolicyWeight,
} from './scenarioPolicies'

interface ResolvedAstroTimingIndex {
  decade: number
  annual: number
  monthly: number
  daily: number
  confidence: number
  evidenceCount: number
}

interface ScenarioResolvedContext {
  activation?: ActivationEngineResult
  rules?: RuleEngineResult
  states?: StateEngineResult
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function resolveBranchSpecificWeight(input: {
  branch: string
  domain: SignalDomain
  pattern: PatternResult
  activationAxes: string[]
  rule?: RuleEngineResult['domains'][number]
  state?: StateEngineResult['domains'][number]
}): number {
  return resolveScenarioBranchPolicyWeight(input)
}

function resolveTimingPressureWeight(input: {
  domain: SignalDomain
  branch: string
  rule?: RuleEngineResult['domains'][number]
  state?: StateEngineResult['domains'][number]
}): number {
  return resolveScenarioTimingPolicyWeight(input)
}

const DOMAIN_SENSITIVITY: Record<SignalDomain, number> = {
  career: 1.08,
  relationship: 1.04,
  wealth: 1.06,
  health: 1.02,
  timing: 1.05,
  personality: 1,
  spirituality: 1,
  move: 1.03,
}

const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
  {
    id: 'promotion_window',
    patternId: 'career_expansion',
    domain: 'career',
    branch: 'promotion',
    title: 'Promotion branch',
    risk: 'Role scope must be defined before yes.',
    reversible: false,
    actions: ['Clarify role scope', 'Lock deliverables', 'Verify reporting lines'],
  },
  {
    id: 'job_change_window',
    patternId: 'career_expansion',
    domain: 'career',
    branch: 'job_change',
    title: 'Job-change branch',
    risk: 'Fast exit without runway can cut leverage.',
    reversible: false,
    actions: ['Map offer quality', 'Check runway', 'Stage the handoff'],
  },
  {
    id: 'launch_project_window',
    patternId: 'career_expansion',
    domain: 'career',
    branch: 'project_launch',
    title: 'Project-launch branch',
    risk: 'Launching without owner clarity increases rework.',
    reversible: false,
    actions: ['Fix owner map', 'Set scope', 'Publish first milestone'],
  },
  {
    id: 'entry_window',
    patternId: 'career_expansion',
    domain: 'career',
    branch: 'entry',
    title: 'Entry branch',
    risk: 'Entering too fast without role fit can turn momentum into mismatch.',
    reversible: true,
    actions: ['Check role fit', 'Confirm learning curve', 'Secure first 90-day goals'],
  },
  {
    id: 'authority_gain_window',
    patternId: 'career_expansion',
    domain: 'career',
    branch: 'authority_gain',
    title: 'Authority-gain branch',
    risk: 'Authority without boundary or reporting clarity creates backlash.',
    reversible: false,
    actions: ['Define authority boundary', 'Clarify escalation line', 'Protect one decision right'],
  },
  {
    id: 'promotion_review_window',
    patternId: 'career_expansion',
    domain: 'career',
    branch: 'promotion_review',
    title: 'Promotion-review branch',
    risk: 'If promotion review criteria are vague, energy goes into impression management instead of proof.',
    reversible: true,
    actions: [
      '승진 판단 기준을 정리하기',
      '성과를 근거로 문서화하기',
      '무엇이 아직 승진을 막는지 확인하기',
    ],
  },
  {
    id: 'contract_negotiation_window',
    patternId: 'career_expansion',
    domain: 'career',
    branch: 'contract_negotiation',
    title: 'Contract-negotiation branch',
    risk: 'Negotiating without leverage mapping weakens long-term positioning.',
    reversible: true,
    actions: [
      '협상 포인트를 정리하기',
      '역할과 보상 조건을 함께 협의하기',
      '범위가 고정되기 전에는 서명을 미루기',
    ],
  },
  {
    id: 'manager_track_window',
    patternId: 'career_expansion',
    domain: 'career',
    branch: 'manager_track',
    title: 'Manager-track branch',
    risk: 'Stepping into management without delegation structure turns authority into overload.',
    reversible: true,
    actions: ['Define delegation map', 'Clarify decision rights', 'Protect one management rhythm'],
  },
  {
    id: 'specialist_track_window',
    patternId: 'career_expansion',
    domain: 'career',
    branch: 'specialist_track',
    title: 'Specialist-track branch',
    risk: 'Expert positioning without proof of depth looks narrower than it is.',
    reversible: true,
    actions: [
      '자신의 전문 포지션을 명확히 하기',
      '깊이를 보여주는 근거를 제시하기',
      '전문성을 실제 성과와 연결하기',
    ],
  },
  {
    id: 'role_redefinition_window',
    patternId: 'career_reset_rebuild',
    domain: 'career',
    branch: 'role_reset',
    title: 'Role-reset branch',
    risk: 'Reset without thesis becomes drift.',
    reversible: true,
    actions: ['Write role thesis', 'List non-negotiables', 'Remove one legacy load'],
  },
  {
    id: 'internal_reset_window',
    patternId: 'career_reset_rebuild',
    domain: 'career',
    branch: 'internal_reset',
    title: 'Internal reset branch',
    risk: 'Silent frustration can harden into disengagement.',
    reversible: true,
    actions: ['Escalate with facts', 'Redraw scope', 'Request milestone review'],
  },
  {
    id: 'authority_conflict_window',
    patternId: 'career_reset_rebuild',
    domain: 'career',
    branch: 'authority_conflict',
    title: 'Authority-conflict branch',
    risk: 'Power struggle without scope clarity escalates faster than the actual issue.',
    reversible: true,
    actions: [
      'Separate title from scope',
      'Document one conflict point',
      'Resolve through boundary not force',
    ],
  },
  {
    id: 'role_shift_window',
    patternId: 'career_reset_rebuild',
    domain: 'career',
    branch: 'role_shift',
    title: 'Role-shift branch',
    risk: 'Shifting lanes without identity thesis can scatter effort.',
    reversible: true,
    actions: ['Name the new lane', 'Drop one old obligation', 'Stage the transition in writing'],
  },
  {
    id: 'exit_preparation_window',
    patternId: 'career_reset_rebuild',
    domain: 'career',
    branch: 'exit_preparation',
    title: 'Exit-prep branch',
    risk: 'Leaving too early can weaken timing quality.',
    reversible: true,
    actions: ['Build runway', 'Audit options', 'Prepare portfolio evidence'],
  },
  {
    id: 'restart_window',
    patternId: 'career_reset_rebuild',
    domain: 'career',
    branch: 'restart',
    title: 'Restart branch',
    risk: 'Restarting from fatigue instead of clarity repeats the same structure.',
    reversible: true,
    actions: ['Define restart thesis', 'Choose one rebuild asset', 'Set a 4-week reset horizon'],
  },
  {
    id: 'new_connection_window',
    patternId: 'relationship_activation',
    domain: 'relationship',
    branch: 'new_connection',
    title: 'New-connection branch',
    risk: 'Pacing matters more than intensity.',
    reversible: true,
    actions: ['Open one new channel', 'Respond clearly', 'Do not overcommit'],
  },
  {
    id: 'bond_deepening_window',
    patternId: 'relationship_activation',
    domain: 'relationship',
    branch: 'bond_deepening',
    title: 'Bond-deepening branch',
    risk: 'Assumed alignment can create drift.',
    reversible: true,
    actions: ['Name expectations', 'Define next step', 'Repeat key understanding'],
  },
  {
    id: 'commitment_preparation_window',
    patternId: 'relationship_activation',
    domain: 'relationship',
    branch: 'commitment_preparation',
    title: 'Commitment-preparation branch',
    risk: 'Naming commitment too early without daily fit creates future friction.',
    reversible: true,
    actions: [
      'Check daily rhythm fit',
      'Discuss expectation gap',
      'Define what commitment means first',
    ],
  },
  {
    id: 'commitment_execution_window',
    patternId: 'relationship_activation',
    domain: 'relationship',
    branch: 'commitment_execution',
    title: 'Commitment-execution branch',
    risk: 'Formal commitment without timing and support mapping increases pressure later.',
    reversible: false,
    actions: [
      'Confirm timeline',
      'Align family/social expectations',
      'Document practical next steps',
    ],
  },
  {
    id: 'cohabitation_window',
    patternId: 'relationship_activation',
    domain: 'relationship',
    branch: 'cohabitation',
    title: 'Cohabitation branch',
    risk: 'Living together before rhythm and responsibility are named turns affection into friction.',
    reversible: true,
    actions: [
      'Discuss daily rhythm',
      'Assign shared responsibilities',
      'Test practical fit before full move-in',
    ],
  },
  {
    id: 'family_acceptance_window',
    patternId: 'relationship_activation',
    domain: 'relationship',
    branch: 'family_acceptance',
    title: 'Family-acceptance branch',
    risk: 'If external approval is rushed, the relationship starts reacting to pressure instead of building structure.',
    reversible: true,
    actions: [
      'Align internal stance first',
      'Prepare one introduction boundary',
      'Clarify who needs to know and when',
    ],
  },
  {
    id: 'reconciliation_window',
    patternId: 'relationship_activation',
    domain: 'relationship',
    branch: 'reconciliation',
    title: 'Reconciliation branch',
    risk: 'Repair fails if the old trigger is unnamed.',
    reversible: true,
    actions: ['Name the trigger', 'Set one boundary', 'Choose one repair action'],
  },
  {
    id: 'boundary_reset_window',
    patternId: 'relationship_tension',
    domain: 'relationship',
    branch: 'boundary_reset',
    title: 'Boundary-reset branch',
    risk: 'Blurred boundaries will recycle the same problem.',
    reversible: true,
    actions: ['State limits', 'Shorten response loop', 'Keep record of agreements'],
  },
  {
    id: 'clarify_expectations_window',
    patternId: 'relationship_tension',
    domain: 'relationship',
    branch: 'clarify_expectations',
    title: 'Expectation-clarity branch',
    risk: 'Mixed messages increase cost later.',
    reversible: true,
    actions: ['Ask one explicit question', 'Summarize in writing', 'Delay final commitment'],
  },
  {
    id: 'distance_tuning_window',
    patternId: 'relationship_tension',
    domain: 'relationship',
    branch: 'distance_tuning',
    title: 'Distance-tuning branch',
    risk: 'Overexposure can intensify conflict.',
    reversible: true,
    actions: ['Reduce contact frequency', 'Move to calmer channel', 'Review after 24h'],
  },
  {
    id: 'separation_window',
    patternId: 'relationship_tension',
    domain: 'relationship',
    branch: 'separation',
    title: 'Separation branch',
    risk: 'Ending in peak emotion can leave avoidable residue and ambiguity.',
    reversible: false,
    actions: [
      'Separate facts from emotion',
      'Define closure terms clearly',
      'Avoid same-day reversal',
    ],
  },
  {
    id: 'cashflow_swing_window',
    patternId: 'wealth_volatility',
    domain: 'wealth',
    branch: 'cashflow_swing',
    title: 'Cashflow-swing branch',
    risk: 'Short-term optimism can hide downside.',
    reversible: true,
    actions: ['Update cashflow', 'Cap downside', 'Delay nonessential spend'],
  },
  {
    id: 'high_risk_offer_window',
    patternId: 'wealth_volatility',
    domain: 'wealth',
    branch: 'high_risk_offer',
    title: 'High-risk-offer branch',
    risk: 'Promise-heavy offers need hard verification.',
    reversible: false,
    actions: ['Verify counterparty', 'Check terms', 'Use a waiting window'],
  },
  {
    id: 'expense_control_window',
    patternId: 'wealth_volatility',
    domain: 'wealth',
    branch: 'expense_control',
    title: 'Expense-control branch',
    risk: 'Leakage compounds fast under volatility.',
    reversible: true,
    actions: ['Freeze one category', 'Review subscriptions', 'Set a hard cap'],
  },
  {
    id: 'liquidity_defense_window',
    patternId: 'wealth_volatility',
    domain: 'wealth',
    branch: 'liquidity_defense',
    title: 'Liquidity-defense branch',
    risk: 'If liquidity is not protected first, later upside loses practical value.',
    reversible: true,
    actions: ['Increase cash buffer', 'Delay large commitments', 'Rank expenses by survivability'],
  },
  {
    id: 'debt_pressure_window',
    patternId: 'wealth_volatility',
    domain: 'wealth',
    branch: 'debt_pressure',
    title: 'Debt-pressure branch',
    risk: 'Debt stress hides inside small repeated leakage before it becomes visible.',
    reversible: true,
    actions: ['List due dates', 'Refinance if terms improve', 'Stop one compounding leak now'],
  },
  {
    id: 'income_drop_window',
    patternId: 'wealth_volatility',
    domain: 'wealth',
    branch: 'income_drop',
    title: 'Income-drop branch',
    risk: 'If decline is minimized emotionally, adjustment happens later and costs more.',
    reversible: true,
    actions: [
      'Rebuild bottom-line estimate',
      'Cut one weak revenue dependency',
      'Protect baseline liquidity first',
    ],
  },
  {
    id: 'expense_spike_window',
    patternId: 'wealth_volatility',
    domain: 'wealth',
    branch: 'expense_spike',
    title: 'Expense-spike branch',
    risk: 'Sudden expense pressure often breaks systems before it breaks numbers.',
    reversible: true,
    actions: [
      'Separate one-off from recurring costs',
      'Delay noncritical payments',
      'Create a 30-day buffer rule',
    ],
  },
  {
    id: 'debt_restructure_window',
    patternId: 'wealth_volatility',
    domain: 'wealth',
    branch: 'debt_restructure',
    title: 'Debt-restructure branch',
    risk: 'Restructuring without full term visibility can improve cashflow short-term but worsen total burden.',
    reversible: true,
    actions: [
      'Map full debt stack',
      'Compare total cost not just monthly payment',
      'Restructure only after downside check',
    ],
  },
  {
    id: 'income_growth_window',
    patternId: 'wealth_accumulation',
    domain: 'wealth',
    branch: 'income_growth',
    title: 'Income-growth branch',
    risk: 'Too many channels can dilute quality.',
    reversible: true,
    actions: ['Pick one revenue lane', 'Tighten margin', 'Track conversion'],
  },
  {
    id: 'asset_build_window',
    patternId: 'wealth_accumulation',
    domain: 'wealth',
    branch: 'asset_build',
    title: 'Asset-build branch',
    risk: 'Compounding fails when rules are loose.',
    reversible: true,
    actions: ['Set contribution rule', 'Automate a transfer', 'Review monthly'],
  },
  {
    id: 'side_income_window',
    patternId: 'wealth_accumulation',
    domain: 'wealth',
    branch: 'side_income',
    title: 'Side-income branch',
    risk: 'New income without process can drain energy.',
    reversible: true,
    actions: ['Pilot one offer', 'Limit weekly hours', 'Measure retention'],
  },
  {
    id: 'pricing_power_window',
    patternId: 'wealth_accumulation',
    domain: 'wealth',
    branch: 'pricing_power',
    title: 'Pricing-power branch',
    risk: 'Raising value without delivery proof weakens trust.',
    reversible: true,
    actions: ['Gather proof first', 'Test one pricing tier', 'Tie price to scope and outcome'],
  },
  {
    id: 'capital_allocation_window',
    patternId: 'wealth_accumulation',
    domain: 'wealth',
    branch: 'capital_allocation',
    title: 'Capital-allocation branch',
    risk: 'Allocation without rule structure turns compounding into drift.',
    reversible: true,
    actions: [
      'Set allocation bands',
      'Separate long-term and tactical money',
      'Review by rule not mood',
    ],
  },
  {
    id: 'asset_exit_window',
    patternId: 'wealth_accumulation',
    domain: 'wealth',
    branch: 'asset_exit',
    title: 'Asset-exit branch',
    risk: 'Exiting a position without rule clarity turns strategy into reaction.',
    reversible: true,
    actions: [
      'Define exit thesis first',
      'Set one trigger and one invalidation',
      'Separate liquidity need from fear response',
    ],
  },
  {
    id: 'schedule_reduction_window',
    patternId: 'burnout_risk',
    domain: 'health',
    branch: 'schedule_reduction',
    title: 'Schedule-reduction branch',
    risk: 'If load is not cut early, judgment quality usually falls before output does.',
    reversible: true,
    actions: ['Cut one draining block', 'Protect sleep window', 'Reduce stacked obligations'],
  },
  {
    id: 'recovery_reset_window',
    patternId: 'burnout_risk',
    domain: 'health',
    branch: 'recovery_reset',
    title: 'Recovery-reset branch',
    risk: 'Ignoring early warning signs can turn temporary strain into a longer reset.',
    reversible: true,
    actions: [
      'Reset sleep and meals',
      'Restore hydration baseline',
      'Pause nonessential intensity',
    ],
  },
  {
    id: 'load_rebalance_window',
    patternId: 'burnout_risk',
    domain: 'health',
    branch: 'load_rebalance',
    title: 'Load-rebalance branch',
    risk: 'Carrying the same load in a weaker phase increases hidden recovery debt.',
    reversible: true,
    actions: ['Re-sequence the week', 'Move one hard task later', 'Insert a fixed recovery block'],
  },
  {
    id: 'routine_lock_window',
    patternId: 'healing_routine_stabilization',
    domain: 'health',
    branch: 'routine_lock',
    title: 'Routine-lock branch',
    risk: 'Small inconsistency can break momentum more than lack of motivation.',
    reversible: true,
    actions: ['Lock wake/sleep time', 'Repeat one stable routine', 'Track adherence for 7 days'],
  },
  {
    id: 'recovery_window',
    patternId: 'healing_routine_stabilization',
    domain: 'health',
    branch: 'recovery',
    title: 'Recovery branch',
    risk: 'Trying to recover through intensity often backfires in a low-structure phase.',
    reversible: true,
    actions: [
      'Choose low-intensity recovery',
      'Keep meals regular',
      'Protect one quiet block daily',
    ],
  },
  {
    id: 'habit_rebuild_window',
    patternId: 'healing_routine_stabilization',
    domain: 'health',
    branch: 'habit_rebuild',
    title: 'Habit-rebuild branch',
    risk: 'Too many simultaneous fixes reduce compliance.',
    reversible: true,
    actions: ['Rebuild one habit only', 'Use visible cues', 'Review at the end of the week'],
  },
  {
    id: 'early_warning_window',
    patternId: 'healing_routine_stabilization',
    domain: 'health',
    branch: 'early_warning',
    title: 'Early-warning branch',
    risk: 'Missing early signs turns a manageable dip into a longer correction.',
    reversible: true,
    actions: ['Track one warning sign', 'Reduce one stimulant', 'Protect a quiet recovery hour'],
  },
  {
    id: 'burnout_trigger_window',
    patternId: 'burnout_risk',
    domain: 'health',
    branch: 'burnout_trigger',
    title: 'Burnout-trigger branch',
    risk: 'Ignoring the first pattern of depletion usually converts pressure into longer recovery debt.',
    reversible: true,
    actions: ['Name the trigger source', 'Cut one hidden drain', 'Move one deadline if possible'],
  },
  {
    id: 'sleep_disruption_window',
    patternId: 'burnout_risk',
    domain: 'health',
    branch: 'sleep_disruption',
    title: 'Sleep-disruption branch',
    risk: 'When sleep rhythm breaks first, judgment quality drops before motivation does.',
    reversible: true,
    actions: [
      'Stabilize sleep window first',
      'Reduce late stimulation',
      'Protect a non-negotiable wind-down hour',
    ],
  },
  {
    id: 'inflammation_window',
    patternId: 'burnout_risk',
    domain: 'health',
    branch: 'inflammation',
    title: 'Inflammation branch',
    risk: 'Pushing through irritation or heat signals often turns a short warning into a longer slowdown.',
    reversible: true,
    actions: [
      'Lower intensity immediately',
      'Track heat or irritation signs',
      'Simplify food and routine for 72 hours',
    ],
  },
  {
    id: 'recovery_compliance_window',
    patternId: 'healing_routine_stabilization',
    domain: 'health',
    branch: 'recovery_compliance',
    title: 'Recovery-compliance branch',
    risk: 'Knowing the right recovery plan matters less than actually repeating it long enough.',
    reversible: true,
    actions: [
      'Pick one recovery metric',
      'Repeat one protocol daily',
      'Review compliance at the end of the week',
    ],
  },
  {
    id: 'travel_window',
    patternId: 'travel_relocation_activation',
    domain: 'move',
    branch: 'travel',
    title: 'Travel branch',
    risk: 'Unstructured movement increases fatigue and detail errors.',
    reversible: true,
    actions: ['Plan route and buffer', 'Travel light', 'Separate movement from key decisions'],
  },
  {
    id: 'relocation_window',
    patternId: 'travel_relocation_activation',
    domain: 'move',
    branch: 'relocation',
    title: 'Relocation branch',
    risk: 'Relocation without cost and support mapping creates avoidable drag.',
    reversible: false,
    actions: ['Map costs first', 'Check support system', 'Stage the move in phases'],
  },
  {
    id: 'foreign_link_window',
    patternId: 'travel_relocation_activation',
    domain: 'move',
    branch: 'foreign_link',
    title: 'Foreign-link branch',
    risk: 'Cross-border upside can be real, but verification gaps grow quickly.',
    reversible: true,
    actions: [
      'Verify external channel',
      'Document requirements',
      'Run a small test before expansion',
    ],
  },
  {
    id: 'route_recheck_window',
    patternId: 'travel_relocation_activation',
    domain: 'move',
    branch: 'route_recheck',
    title: 'Route-recheck branch',
    risk: 'Moving too fast can produce the wrong move, not just a costly one.',
    reversible: true,
    actions: ['Re-check destination fit', 'Delay final booking', 'Compare one alternative route'],
  },
  {
    id: 'housing_search_window',
    patternId: 'travel_relocation_activation',
    domain: 'move',
    branch: 'housing_search',
    title: 'Housing-search branch',
    risk: 'Picking convenience over fit can create long-term drag.',
    reversible: true,
    actions: [
      'Rank fit factors first',
      'Visit twice if possible',
      'Compare living cost against recovery time',
    ],
  },
  {
    id: 'lease_decision_window',
    patternId: 'travel_relocation_activation',
    domain: 'move',
    branch: 'lease_decision',
    title: 'Lease-decision branch',
    risk: 'A lease chosen under urgency can lock in the wrong base, not just the wrong price.',
    reversible: false,
    actions: [
      'Check contract exits first',
      'Compare commute and recovery cost together',
      'Decide only after one overnight review',
    ],
  },
  {
    id: 'cross_border_move_window',
    patternId: 'travel_relocation_activation',
    domain: 'move',
    branch: 'cross_border_move',
    title: 'Cross-border-move branch',
    risk: 'Cross-border moves fail more often from paperwork and support gaps than from desire alone.',
    reversible: false,
    actions: [
      'Map visa or legal requirements',
      'Verify support system on arrival',
      'Stage the move in two steps if possible',
    ],
  },
  {
    id: 'commute_restructure_window',
    patternId: 'movement_guardrail_window',
    domain: 'move',
    branch: 'commute_restructure',
    title: 'Commute-restructure branch',
    risk: 'A bad commute quietly taxes health and work quality before the cost feels obvious.',
    reversible: true,
    actions: [
      'Measure weekly commute load',
      'Reduce one unnecessary trip',
      'Compare time cost against rent or role benefit',
    ],
  },
  {
    id: 'basecamp_reset_window',
    patternId: 'movement_guardrail_window',
    domain: 'move',
    branch: 'basecamp_reset',
    title: 'Basecamp-reset branch',
    risk: 'If your base is misaligned, every other expansion becomes more expensive than it should be.',
    reversible: true,
    actions: [
      'Define what the base must support',
      'Drop one location mismatch',
      'Reset around recovery, not just convenience',
    ],
  },
]

function buildFallbackDefinitions(pattern: PatternResult): ScenarioDefinition[] {
  const domain = pattern.domains[0] || 'personality'
  return [
    {
      id: `${pattern.id}_main_window`,
      patternId: pattern.id,
      domain,
      branch: 'main',
      title: `${pattern.label} main branch`,
      risk: pattern.risk,
      reversible: false,
      actions: ['Pick one focus', 'Write one verification rule', 'Review after one cycle'],
    },
    {
      id: `${pattern.id}_alt_window`,
      patternId: pattern.id,
      domain,
      branch: 'alt',
      title: `${pattern.label} alternate branch`,
      risk: `Alternate path: ${pattern.risk}`,
      reversible: true,
      actions: ['Reduce scope', 'Keep optionality', 'Collect one more signal'],
    },
    {
      id: `${pattern.id}_defensive_window`,
      patternId: pattern.id,
      domain,
      branch: 'defensive',
      title: `${pattern.label} defensive branch`,
      risk: 'Use a slower sequence if evidence weakens.',
      reversible: true,
      actions: ['Pause final commitment', 'Draft before commit', 'Re-check constraints'],
    },
  ]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function compressScenarioProbability(raw: number): number {
  if (raw <= 82) return raw
  if (raw <= 90) return 82 + (raw - 82) * 0.72
  return 87.76 + (raw - 90) * 0.16
}

function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

function normalizeAstroTimingIndex(raw: unknown): ResolvedAstroTimingIndex | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const record = raw as Record<string, unknown>
  const decade = Number(record.decade)
  const annual = Number(record.annual)
  const monthly = Number(record.monthly)
  const daily = Number(record.daily)
  const confidence = Number(record.confidence)
  const evidenceCount = Number(record.evidenceCount)
  if (
    ![decade, annual, monthly, daily, confidence, evidenceCount].every((value) =>
      Number.isFinite(value)
    )
  ) {
    return undefined
  }
  return {
    decade: clamp01(decade),
    annual: clamp01(annual),
    monthly: clamp01(monthly),
    daily: clamp01(daily),
    confidence: clamp01(confidence),
    evidenceCount: Math.max(0, Math.floor(evidenceCount)),
  }
}

function resolveAstroTimingIndex(
  input: MatrixCalculationInputNormalized
): ResolvedAstroTimingIndex | undefined {
  const direct = normalizeAstroTimingIndex(input.astroTimingIndex)
  if (direct) return direct
  const candidate = input.crossSnapshot?.astroTimingIndex
  return normalizeAstroTimingIndex(candidate)
}

function resolveWindow(
  input: MatrixCalculationInputNormalized,
  pattern: PatternResult,
  astroTimingIndex: ResolvedAstroTimingIndex | undefined
): ScenarioWindow {
  if (
    input.currentIljinElement ||
    input.currentIljinDate ||
    (input.activeTransits.length > 0 && input.currentSaeunElement)
  ) {
    return 'now'
  }
  if (astroTimingIndex && astroTimingIndex.daily >= 0.55) return 'now'
  if (pattern.score >= 75 && input.currentWolunElement) return '1-3m'
  if (astroTimingIndex && astroTimingIndex.monthly >= 0.6 && pattern.score >= 60) return '1-3m'
  if (pattern.score >= 75 && input.currentDaeunElement) return '1-3m'
  if (astroTimingIndex && astroTimingIndex.annual >= 0.55 && pattern.score >= 55) return '3-6m'
  if (pattern.score >= 60) return '3-6m'
  return '6-12m'
}

function resolveTimingRelevance(
  input: MatrixCalculationInputNormalized,
  window: ScenarioWindow,
  astroTimingIndex: ResolvedAstroTimingIndex | undefined
): number {
  const windowBase: Record<ScenarioWindow, number> = {
    now: 0.9,
    '1-3m': 0.76,
    '3-6m': 0.62,
    '6-12m': 0.48,
  }

  const activeTimingBoost =
    (input.currentDaeunElement ? 0.05 : 0) +
    (input.currentSaeunElement ? 0.04 : 0) +
    (input.currentWolunElement ? 0.03 : 0) +
    (input.currentIljinElement || input.currentIljinDate ? 0.03 : 0) +
    (input.activeTransits.length > 0 ? 0.05 : 0)

  const astroBoost = astroTimingIndex
    ? astroTimingIndex.decade * 0.03 +
      astroTimingIndex.annual * 0.04 +
      astroTimingIndex.monthly * 0.05 +
      astroTimingIndex.daily * 0.04
    : 0

  return Number(clamp(windowBase[window] + activeTimingBoost + astroBoost, 0.2, 0.99).toFixed(2))
}

function resolveTimingGranularity(input: {
  normalizedInput: MatrixCalculationInputNormalized
  window: ScenarioWindow
  astroTimingIndex: ResolvedAstroTimingIndex | undefined
}): TimingGranularity {
  const hasIljin = Boolean(
    input.normalizedInput.currentIljinElement || input.normalizedInput.currentIljinDate
  )
  const hasWolun = Boolean(input.normalizedInput.currentWolunElement)
  const hasSeun = Boolean(input.normalizedInput.currentSaeunElement)
  const transitCount = input.normalizedInput.activeTransits.length
  const daily = input.astroTimingIndex?.daily || 0
  const monthly = input.astroTimingIndex?.monthly || 0

  if (input.window === 'now') {
    if (hasIljin && hasWolun && hasSeun && transitCount >= 2 && daily >= 0.68) return 'day'
    if ((hasIljin && transitCount > 0) || daily >= 0.58) return 'week'
    return 'fortnight'
  }
  if (input.window === '1-3m') {
    if ((hasWolun && transitCount > 0) || monthly >= 0.68) return 'fortnight'
    return 'month'
  }
  if (input.window === '3-6m') return 'month'
  return 'season'
}

function buildPrecisionReason(input: {
  lang: 'ko' | 'en'
  granularity: TimingGranularity
  normalizedInput: MatrixCalculationInputNormalized
  astroTimingIndex: ResolvedAstroTimingIndex | undefined
}): string {
  const hasIljin = Boolean(
    input.normalizedInput.currentIljinElement || input.normalizedInput.currentIljinDate
  )
  const hasWolun = Boolean(input.normalizedInput.currentWolunElement)
  const hasSeun = Boolean(input.normalizedInput.currentSaeunElement)
  const hasDaeun = Boolean(input.normalizedInput.currentDaeunElement)
  const transitCount = input.normalizedInput.activeTransits.length
  const daily = input.astroTimingIndex?.daily || 0
  const monthly = input.astroTimingIndex?.monthly || 0

  if (input.lang === 'ko') {
    if (input.granularity === 'day') {
      return '단기 사주 신호와 트랜짓이 함께 맞물린 경우에도, 표현 정밀도는 일 단위 상한으로만 엽니다.'
    }
    if (input.granularity === 'week') {
      return hasIljin || transitCount > 0 || daily >= 0.58
        ? '단기 촉발은 살아 있지만 과잉 정밀 예측을 피하려고 주 단위까지만 여는 편이 맞습니다.'
        : '구조 지지가 더 넓게 깔려 있어 주 단위까지만 열어 두는 편이 안전합니다.'
    }
    if (input.granularity === 'fortnight') {
      return hasWolun || monthly >= 0.6
        ? '월운과 월간 타이밍 지표가 겹치지만, 실제 해석은 2주 단위 상한으로 두는 편이 맞습니다.'
        : '구조는 열려 있지만 촉발이 좁지 않아 2주 단위 상한으로 말하는 편이 안전합니다.'
    }
    if (input.granularity === 'month') {
      return hasDaeun || hasSeun
        ? '대운·세운 지지가 중심이라 월 단위까지는 설명 가능하지만 일 단위로 좁히면 과잉 정밀이 됩니다.'
        : '촉발보다 구조 지지가 우세해 월 단위 상한으로 보는 편이 맞습니다.'
    }
    return '지금은 구조적 흐름을 읽는 구간이라 계절 단위 이상으로 해석하는 편이 안전합니다.'
  }

  if (input.granularity === 'day') {
    return 'Short-cycle Saju and transit triggers stack here, but the wording still caps itself at day-level rather than pretending to know an exact event stamp.'
  }
  if (input.granularity === 'week') {
    return 'Short-cycle triggers are active, but the model caps the statement at week-level to avoid false precision.'
  }
  if (input.granularity === 'fortnight') {
    return 'Monthly activation is visible, but the model keeps the claim at fortnight-level instead of forcing an exact date.'
  }
  if (input.granularity === 'month') {
    return 'Structural support is clearer than short-term triggers, so month-level is the safe precision cap.'
  }
  return 'This is a structural window, so the model keeps timing at a seasonal cap rather than forcing a narrow date.'
}

function windowLabel(window: ScenarioWindow, lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    if (window === 'now') return '지금'
    if (window === '1-3m') return '1~3개월'
    if (window === '3-6m') return '3~6개월'
    return '6~12개월'
  }
  return window
}

function buildWhyNow(input: {
  lang: 'ko' | 'en'
  pattern: PatternResult
  window: ScenarioWindow
  timingRelevance: number
  astroTimingIndex: ResolvedAstroTimingIndex | undefined
  normalizedInput: MatrixCalculationInputNormalized
}): string {
  const timingDrivers: string[] = []
  if (input.normalizedInput.currentDaeunElement)
    timingDrivers.push(input.lang === 'ko' ? '대운' : 'daeun')
  if (input.normalizedInput.currentSaeunElement)
    timingDrivers.push(input.lang === 'ko' ? '세운' : 'seun')
  if (input.normalizedInput.currentWolunElement)
    timingDrivers.push(input.lang === 'ko' ? '월운' : 'wolun')
  if (input.normalizedInput.currentIljinElement || input.normalizedInput.currentIljinDate) {
    timingDrivers.push(input.lang === 'ko' ? '일운' : 'daily timing')
  }
  if (input.normalizedInput.activeTransits.length > 0) {
    timingDrivers.push(input.lang === 'ko' ? '트랜짓' : 'active transits')
  }
  if (input.astroTimingIndex && input.astroTimingIndex.confidence >= 0.55) {
    timingDrivers.push(input.lang === 'ko' ? '점성 타이밍 지수' : 'astro timing index')
  }

  if (input.lang === 'ko') {
    const driverText = timingDrivers.length > 0 ? timingDrivers.join(', ') : '핵심 교차 신호'
    return `${windowLabel(input.window, 'ko')} 구간에 ${driverText}가 겹치며 ${input.pattern.label} 패턴이 활성화됩니다. 타이밍 적합도는 ${Math.round(input.timingRelevance * 100)}% 수준입니다.`
  }

  const driverText = timingDrivers.length > 0 ? timingDrivers.join(', ') : 'core cross-signals'
  return `${windowLabel(input.window, 'en')} is favored because ${driverText} align around the ${input.pattern.label} pattern. Timing relevance is ${Math.round(input.timingRelevance * 100)}%.`
}

function buildWhyNotYet(input: {
  lang: 'ko' | 'en'
  pattern: PatternResult
  timingRelevance: number
}): string {
  const blockers = (input.pattern.blockedBy || []).slice(0, 3)
  if (input.lang === 'ko') {
    const blockerText = blockers.length > 0 ? blockers.join(', ') : '검증 조건'
    return `${blockerText}이 아직 풀리지 않았고, 현재 ${input.pattern.resolvedMode || 'verify'} 모드라 바로 확정보다 단계적 접근이 맞습니다. 타이밍 적합도는 ${Math.round(input.timingRelevance * 100)}% 수준입니다.`
  }
  const blockerText = blockers.length > 0 ? blockers.join(', ') : 'verification conditions'
  return `${blockerText} are still active, and the domain is currently in ${input.pattern.resolvedMode || 'verify'} mode. Stage the move before committing; timing relevance is ${Math.round(input.timingRelevance * 100)}%.`
}

function buildManifestationHints(input: {
  lang: 'ko' | 'en'
  pattern: PatternResult
  definition: ScenarioDefinition
}): string[] {
  const hints: string[] = []
  if (input.pattern.domainState === 'opening') {
    hints.push(
      input.lang === 'ko'
        ? '기회는 열리지만 아직 조건 정리가 먼저입니다.'
        : 'The window is opening, but conditions still need shaping.'
    )
  }
  if (input.pattern.domainState === 'consolidation' || input.pattern.domainState === 'residue') {
    hints.push(
      input.lang === 'ko'
        ? '확장보다 정리와 보존 쪽으로 체감될 수 있습니다.'
        : 'This may feel more like consolidation than expansion.'
    )
  }
  if ((input.pattern.blockedBy || []).includes('commit_now')) {
    hints.push(
      input.lang === 'ko'
        ? '즉시 확정보다 초안·탐색·검증이 더 맞습니다.'
        : 'Drafting and verification fit better than immediate commitment.'
    )
  }
  if (input.definition.reversible) {
    hints.push(
      input.lang === 'ko'
        ? '되돌릴 수 있는 작은 실행부터 시작하는 편이 유리합니다.'
        : 'Start with a reversible step first.'
    )
  }
  if (hints.length === 0) {
    hints.push(
      input.lang === 'ko'
        ? '핵심 조건을 먼저 정리하면 실제 체감이 더 분명하게 나타납니다.'
        : 'The signal becomes clearer once the main conditions are structured first.'
    )
  }
  return hints.slice(0, 3)
}

function buildEntryConditions(input: {
  lang: 'ko' | 'en'
  pattern: PatternResult
  definition: ScenarioDefinition
  probability: number
  confidence: number
  timingRelevance: number
}): string[] {
  if (input.lang === 'ko') {
    return [
      `핵심 근거가 계속 살아 있어야 합니다.`,
      `시나리오 확률 ${input.probability}%와 신뢰도 ${Math.round(input.confidence * 100)}% 수준이 유지돼야 합니다.`,
      `타이밍 적합도 ${Math.round(input.timingRelevance * 100)}% 이상에서 ${input.definition.actions[0]}를 바로 실행할 수 있어야 합니다.`,
    ]
  }

  return [
    `${input.pattern.label} evidence must stay active`,
    `Scenario probability ${input.probability}% and confidence ${Math.round(input.confidence * 100)}% should hold`,
    `Timing relevance ${Math.round(input.timingRelevance * 100)}% should support immediate execution of the first action`,
  ]
}

function buildAbortConditions(input: {
  lang: 'ko' | 'en'
  definition: ScenarioDefinition
  pattern: PatternResult
  probability: number
  timingRelevance: number
}): string[] {
  if (input.lang === 'ko') {
    return [
      `핵심 조건이나 역할 범위가 문서로 정리되지 않으면 멈춰야 합니다.`,
      `시나리오 확률이 ${Math.max(35, input.probability - 22)}% 아래로 떨어지면 보류해야 합니다.`,
      `${input.pattern.risk}`,
    ]
  }

  return [
    'Abort if scope, terms, or owner map cannot be written down clearly',
    `Abort if scenario probability drops below ${Math.max(35, input.probability - 22)}%`,
    input.pattern.risk,
  ]
}

function buildSustainConditions(input: {
  lang: 'ko' | 'en'
  pattern: PatternResult
  definition: ScenarioDefinition
  timingRelevance: number
}): string[] {
  if (input.lang === 'ko') {
    return [
      `첫 단계 이후에도 흐름이 꺾이지 않는지 확인해야 합니다.`,
      `타이밍 적합도 ${Math.round(input.timingRelevance * 100)}% 수준이 급격히 떨어지지 않아야 합니다.`,
      `역할, 범위, 속도 조절 조건이 동시에 유지돼야 합니다.`,
    ]
  }
  return [
    `${input.pattern.label} evidence should stay active after the first move`,
    `Timing relevance should not collapse after the initial step`,
    `Scope, pace, and role alignment should stay intact at the same time`,
  ]
}

function buildReversalRisk(input: {
  lang: 'ko' | 'en'
  pattern: PatternResult
  definition: ScenarioDefinition
}): string {
  if (input.lang === 'ko') {
    return input.definition.reversible
      ? '되돌릴 수는 있지만, 첫 단계에서 조건을 느슨하게 잡으면 방향을 다시 꺾는 비용이 커집니다.'
      : '한 번 확정하면 되돌림 비용이 커서, 초기 판단이 흔들리면 손실이 빠르게 커집니다.'
  }
  return input.definition.reversible
    ? 'This branch can be reversed, but loose conditions in the first step make reversal more expensive.'
    : 'Once committed, reversal gets expensive quickly if the initial judgment was off.'
}

function buildWrongMoveCost(input: {
  lang: 'ko' | 'en'
  pattern: PatternResult
  definition: ScenarioDefinition
}): string {
  if (input.lang === 'ko') {
    return input.definition.reversible
      ? '작은 시간 손실과 재정렬 비용'
      : '시간 손실, 신뢰 저하, 재협상 비용'
  }
  return input.definition.reversible
    ? 'A smaller time loss plus re-alignment cost'
    : 'Time loss, trust erosion, and renegotiation cost'
}

function buildSustainability(input: {
  pattern: PatternResult
  probability: number
  timingRelevance: number
  definition: ScenarioDefinition
}): number {
  const base =
    input.probability * 0.45 +
    input.timingRelevance * 100 * 0.25 +
    input.pattern.confidence * 100 * 0.2 +
    (input.definition.reversible ? 4 : -2)
  return clamp(round1(base / 100), 0.1, 0.98)
}

export {
  DOMAIN_SENSITIVITY,
  SCENARIO_DEFINITIONS,
  buildFallbackDefinitions,
  buildEntryConditions,
  buildAbortConditions,
  buildManifestationHints,
  buildPrecisionReason,
  buildReversalRisk,
  buildSustainability,
  buildSustainConditions,
  buildWhyNotYet,
  buildWhyNow,
  buildWrongMoveCost,
  compressScenarioProbability,
  resolveAstroTimingIndex,
  resolveBranchSpecificWeight,
  resolveTimingGranularity,
  resolveTimingPressureWeight,
  resolveTimingRelevance,
  resolveWindow,
  round1,
  clamp,
}
export type { ResolvedAstroTimingIndex, ScenarioResolvedContext }
