import type {
  NormalizedSignal,
  SignalDomain,
  SignalPolarity,
  SignalSynthesisResult,
} from './signalSynthesizer'
import type { DomainStrategy, StrategyEngineResult, StrategyPhaseCode } from './strategyEngine'

export interface PatternMatcher {
  domains?: SignalDomain[]
  polarities?: SignalPolarity[]
  keywords?: string[]
  layers?: number[]
  minScore?: number
}

export interface PatternDefinition {
  id: string
  label: string
  domains: SignalDomain[]
  thesis: string
  risk: string
  activationRules: string[]
  scenarioIds: string[]
  minMatchedSignals: number
  preferredPhases?: StrategyPhaseCode[]
  matchers: PatternMatcher[]
}

export interface PatternResult {
  id: string
  label: string
  domains: SignalDomain[]
  score: number
  confidence: number
  matchedSignalIds: string[]
  matchedKeywords: string[]
  thesis: string
  risk: string
  activationReason: string
  scenarioIds: string[]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function textBlob(signal: NormalizedSignal): string {
  return [
    signal.id,
    signal.keyword,
    signal.rowKey,
    signal.colKey,
    signal.sajuBasis,
    signal.astroBasis,
    ...(signal.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function matchesSignal(signal: NormalizedSignal, matcher: PatternMatcher): boolean {
  if (matcher.domains && !matcher.domains.some((domain) => signal.domainHints.includes(domain))) {
    return false
  }
  if (matcher.polarities && !matcher.polarities.includes(signal.polarity)) return false
  if (matcher.layers && !matcher.layers.includes(signal.layer)) return false
  if (typeof matcher.minScore === 'number' && signal.score < matcher.minScore) return false
  if (matcher.keywords && matcher.keywords.length > 0) {
    const haystack = textBlob(signal)
    if (!matcher.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) return false
  }
  return true
}

function getLeadStrategy(
  strategyEngine: StrategyEngineResult,
  domains: SignalDomain[]
): DomainStrategy | undefined {
  return strategyEngine.domainStrategies.find((item) =>
    domains.includes(item.domain as SignalDomain)
  )
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

const BASE_PATTERN_DEFINITIONS: PatternDefinition[] = [
  {
    id: 'career_expansion',
    label: 'Career Expansion Pattern',
    domains: ['career'],
    thesis: 'Career upside is active and external advancement paths are opening.',
    risk: 'Expansion without role clarity can create delivery strain.',
    activationRules: ['career strength signals', 'public house emphasis'],
    scenarioIds: ['promotion_window', 'job_change_window', 'launch_project_window'],
    minMatchedSignals: 2,
    preferredPhases: ['expansion', 'expansion_guarded', 'high_tension_expansion'],
    matchers: [
      { domains: ['career'], polarities: ['strength'], minScore: 6 },
      { keywords: ['h10', 'jupiter', 'mc', 'career'], minScore: 6 },
    ],
  },
  {
    id: 'career_reset_rebuild',
    label: 'Career Reset Pattern',
    domains: ['career'],
    thesis: 'Career direction is shifting and old role structures need redesign.',
    risk: 'Impatience can turn a strategic reset into unnecessary churn.',
    activationRules: ['career caution signals', 'timing compression'],
    scenarioIds: ['role_redefinition_window', 'internal_reset_window', 'exit_preparation_window'],
    minMatchedSignals: 2,
    preferredPhases: ['defensive_reset', 'high_tension_expansion'],
    matchers: [
      { domains: ['career'], polarities: ['caution'], minScore: 5 },
      { keywords: ['saturn', 'square', 'opposition', 'daeuntransition'], minScore: 5 },
    ],
  },
  {
    id: 'relationship_activation',
    label: 'Relationship Activation Pattern',
    domains: ['relationship'],
    thesis: 'Relationship momentum is rising and direct engagement matters more than passivity.',
    risk: 'Intensity without pacing can create mixed signals.',
    activationRules: ['relationship strength signals', 'venus or h7 support'],
    scenarioIds: ['new_connection_window', 'bond_deepening_window', 'reconciliation_window'],
    minMatchedSignals: 2,
    preferredPhases: ['expansion', 'expansion_guarded'],
    matchers: [
      { domains: ['relationship'], polarities: ['strength'], minScore: 6 },
      { keywords: ['h7', 'venus', 'trine', 'relationship'], minScore: 5 },
    ],
  },
  {
    id: 'relationship_tension',
    label: 'Relationship Tension Pattern',
    domains: ['relationship'],
    thesis: 'Relationship signals are active but interpretation gaps need management.',
    risk: 'Fast commitment can amplify misunderstanding.',
    activationRules: ['relationship caution signals', 'communication friction'],
    scenarioIds: ['boundary_reset_window', 'clarify_expectations_window', 'distance_tuning_window'],
    minMatchedSignals: 2,
    preferredPhases: ['expansion_guarded', 'defensive_reset', 'high_tension_expansion'],
    matchers: [
      { domains: ['relationship'], polarities: ['caution'], minScore: 5 },
      { keywords: ['mars', 'opposition', 'square', 'conflict'], minScore: 4 },
    ],
  },
  {
    id: 'wealth_volatility',
    label: 'Wealth Volatility Pattern',
    domains: ['wealth'],
    thesis: 'Money movement is active, but volatility control matters as much as upside.',
    risk: 'A strong opportunity signal can hide timing and cashflow risk.',
    activationRules: ['wealth caution plus opportunity signals'],
    scenarioIds: ['cashflow_swing_window', 'high_risk_offer_window', 'expense_control_window'],
    minMatchedSignals: 2,
    preferredPhases: ['high_tension_expansion', 'expansion_guarded'],
    matchers: [
      { domains: ['wealth'], minScore: 5 },
      { keywords: ['wealth', 'money', 'budget', 'asset', 'saturn', 'jupiter'], minScore: 4 },
    ],
  },
  {
    id: 'wealth_accumulation',
    label: 'Wealth Accumulation Pattern',
    domains: ['wealth'],
    thesis: 'Steady accumulation is available when execution is disciplined.',
    risk: 'Overconfidence can dilute compounding gains.',
    activationRules: ['wealth strength and structure alignment'],
    scenarioIds: ['income_growth_window', 'asset_build_window', 'side_income_window'],
    minMatchedSignals: 2,
    preferredPhases: ['expansion', 'stabilize'],
    matchers: [
      { domains: ['wealth'], polarities: ['strength'], minScore: 6 },
      { keywords: ['jupiter', 'finance', 'money', 'wealth'], minScore: 5 },
    ],
  },
  {
    id: 'leadership_emergence',
    label: 'Leadership Emergence Pattern',
    domains: ['career', 'personality'],
    thesis: 'Personal authority is surfacing and people will look for direction.',
    risk: 'Visibility without operating rules can trigger pushback.',
    activationRules: ['career strength', 'h1 or h10 emphasis'],
    scenarioIds: ['lead_role_window', 'public_responsibility_window', 'team_anchor_window'],
    minMatchedSignals: 2,
    preferredPhases: ['expansion', 'high_tension_expansion'],
    matchers: [
      { domains: ['career', 'personality'], polarities: ['strength'], minScore: 6 },
      { keywords: ['h1', 'h10', 'saturn', 'jupiter', 'lead'], minScore: 5 },
    ],
  },
  {
    id: 'burnout_risk',
    label: 'Burnout Risk Pattern',
    domains: ['health', 'career'],
    thesis: 'Output is possible, but recovery debt is building in the background.',
    risk: 'Pushing through fatigue can degrade judgment quality.',
    activationRules: ['health caution', 'saturn/moon strain'],
    scenarioIds: ['schedule_reduction_window', 'recovery_reset_window', 'load_rebalance_window'],
    minMatchedSignals: 2,
    preferredPhases: ['defensive_reset', 'expansion_guarded'],
    matchers: [
      { domains: ['health'], polarities: ['caution'], minScore: 5 },
      { keywords: ['h6', 'saturn', 'moon', 'stress', 'fatigue'], minScore: 4 },
    ],
  },
  {
    id: 'hidden_support',
    label: 'Hidden Support Pattern',
    domains: ['career', 'relationship', 'wealth'],
    thesis: 'Indirect support exists and becomes visible when you ask clearly.',
    risk: 'Support stays latent if assumptions replace direct communication.',
    activationRules: ['positive support signals', 'bridge alignment'],
    scenarioIds: ['mentor_support_window', 'referral_window', 'quiet_alliance_window'],
    minMatchedSignals: 2,
    preferredPhases: ['stabilize', 'expansion_guarded'],
    matchers: [
      {
        polarities: ['strength'],
        keywords: ['support', 'samhap', 'sextile', 'helper'],
        minScore: 4,
      },
      { keywords: ['jupiter', 'relationship', 'career'], minScore: 4 },
    ],
  },
  {
    id: 'transformation_through_conflict',
    label: 'Transformation Through Conflict',
    domains: ['career', 'relationship', 'personality'],
    thesis: 'Pressure is forcing a redefinition that can become a long-term upgrade.',
    risk: 'Reacting to friction too quickly can turn a transition into damage.',
    activationRules: ['high tension', 'conflict plus growth'],
    scenarioIds: ['conflict_reframe_window', 'role_upgrade_window', 'boundary_upgrade_window'],
    minMatchedSignals: 2,
    preferredPhases: ['high_tension_expansion', 'defensive_reset'],
    matchers: [
      {
        polarities: ['caution'],
        keywords: ['conflict', 'square', 'opposition', 'chung'],
        minScore: 4,
      },
      { polarities: ['strength'], minScore: 6 },
    ],
  },
  {
    id: 'reputation_risk_window',
    label: 'Reputation Risk Window',
    domains: ['career', 'relationship'],
    thesis: 'Public perception matters more than usual, so precision must lead communication.',
    risk: 'A small wording error can create outsized downstream cost.',
    activationRules: ['visibility plus caution'],
    scenarioIds: ['message_review_window', 'public_check_window', 'stakeholder_alignment_window'],
    minMatchedSignals: 2,
    preferredPhases: ['expansion_guarded', 'defensive_reset'],
    matchers: [
      { domains: ['career', 'relationship'], polarities: ['caution'], minScore: 5 },
      { keywords: ['mercury', 'communication', 'public', 'mc', 'h10'], minScore: 4 },
    ],
  },
  {
    id: 'learning_acceleration',
    label: 'Learning Acceleration Pattern',
    domains: ['career', 'personality', 'spirituality'],
    thesis: 'Study, credentialing, and structured skill gain compound quickly now.',
    risk: 'Consuming too broadly can reduce retention and execution.',
    activationRules: ['learning signals', 'mercury or house 3/9 support'],
    scenarioIds: ['credential_window', 'deep_study_window', 'teaching_window'],
    minMatchedSignals: 2,
    preferredPhases: ['expansion', 'stabilize'],
    matchers: [
      { keywords: ['mercury', 'h3', 'h9', 'study', 'learning', 'credential'], minScore: 4 },
      { domains: ['career', 'personality', 'spirituality'], polarities: ['strength'], minScore: 5 },
    ],
  },
  {
    id: 'travel_relocation_activation',
    label: 'Travel or Relocation Activation',
    domains: ['move'],
    thesis: 'Movement, relocation, or cross-border transitions are becoming more viable.',
    risk: 'Logistics and timing mismatches can absorb gains.',
    activationRules: ['move signals', 'h9 or h12 activation'],
    scenarioIds: ['travel_window', 'relocation_window', 'foreign_link_window'],
    minMatchedSignals: 2,
    preferredPhases: ['expansion', 'expansion_guarded'],
    matchers: [
      { domains: ['move'], minScore: 5 },
      { keywords: ['h9', 'h12', 'move', 'travel', 'foreign', 'relocat'], minScore: 4 },
    ],
  },
  {
    id: 'public_visibility_window',
    label: 'Public Visibility Window',
    domains: ['career', 'personality'],
    thesis: 'Public-facing work can scale faster than back-channel execution right now.',
    risk: 'Visibility without readiness can expose weak edges.',
    activationRules: ['public signals', 'mc or h10'],
    scenarioIds: ['presentation_window', 'brand_window', 'exposure_window'],
    minMatchedSignals: 2,
    preferredPhases: ['expansion', 'high_tension_expansion'],
    matchers: [
      { keywords: ['mc', 'h10', 'sun', 'jupiter', 'visibility'], minScore: 4 },
      { domains: ['career', 'personality'], polarities: ['strength'], minScore: 5 },
    ],
  },
  {
    id: 'deep_partnership_activation',
    label: 'Deep Partnership Activation',
    domains: ['relationship', 'wealth'],
    thesis: 'Trust-based partnership can unlock value if roles are explicit.',
    risk: 'Blurred expectations can turn alignment into tension.',
    activationRules: ['h7/h8 relationship and value overlap'],
    scenarioIds: ['partnership_window', 'joint_commitment_window', 'shared_resource_window'],
    minMatchedSignals: 2,
    preferredPhases: ['expansion_guarded', 'stabilize'],
    matchers: [
      { domains: ['relationship', 'wealth'], minScore: 5 },
      { keywords: ['h7', 'h8', 'venus', 'juno', 'partner'], minScore: 4 },
    ],
  },
  {
    id: 'healing_routine_stabilization',
    label: 'Healing and Routine Stabilization',
    domains: ['health', 'personality'],
    thesis: 'Routine, recovery, and consistency will outperform intensity right now.',
    risk: 'Skipping maintenance will reduce strategic capacity later.',
    activationRules: ['balance signals in health', 'h6 or saturn stabilization'],
    scenarioIds: ['routine_lock_window', 'recovery_window', 'habit_rebuild_window'],
    minMatchedSignals: 2,
    preferredPhases: ['stabilize', 'defensive_reset'],
    matchers: [
      { domains: ['health'], polarities: ['balance', 'strength'], minScore: 4 },
      { keywords: ['h6', 'routine', 'health', 'saturn', 'moon'], minScore: 4 },
    ],
  },
  {
    id: 'structure_over_speed',
    label: 'Structure Over Speed',
    domains: ['career', 'wealth', 'timing'],
    thesis: 'This is a structure-first period where sequencing beats force.',
    risk: 'Rushing the close will cost more than delaying it.',
    activationRules: ['timing caution', 'saturn or delay signals'],
    scenarioIds: ['checklist_first_window', 'draft_then_commit_window', 'terms_review_window'],
    minMatchedSignals: 2,
    preferredPhases: ['stabilize', 'expansion_guarded', 'defensive_reset'],
    matchers: [
      { domains: ['timing'], polarities: ['caution', 'balance'], minScore: 4 },
      { keywords: ['saturn', 'delay', 'timing', 'review', 'verify'], minScore: 4 },
    ],
  },
  {
    id: 'reinvention_cycle',
    label: 'Reinvention Cycle',
    domains: ['personality', 'career', 'move'],
    thesis: 'Identity and direction are reformatting at the same time.',
    risk: 'Changing too many variables at once can blur the signal.',
    activationRules: ['identity shift', 'move or career reset'],
    scenarioIds: ['identity_shift_window', 'portfolio_rebuild_window', 'context_change_window'],
    minMatchedSignals: 2,
    preferredPhases: ['defensive_reset', 'high_tension_expansion'],
    matchers: [
      { domains: ['personality', 'move', 'career'], minScore: 5 },
      { keywords: ['h1', 'node', 'chiron', 'move', 'reset'], minScore: 4 },
    ],
  },
  {
    id: 'mission_alignment',
    label: 'Mission Alignment Pattern',
    domains: ['spirituality', 'personality', 'career'],
    thesis: 'Long-term purpose and present execution are moving closer together.',
    risk: 'Idealism without operating constraints can diffuse the gain.',
    activationRules: ['purpose signals', 'node/chiron/spiritual emphasis'],
    scenarioIds: ['purpose_lock_window', 'meaningful_project_window', 'mentor_track_window'],
    minMatchedSignals: 2,
    preferredPhases: ['expansion', 'stabilize'],
    matchers: [
      { domains: ['spirituality', 'personality'], minScore: 4 },
      { keywords: ['node', 'chiron', 'purpose', 'mission', 'spiritual'], minScore: 4 },
    ],
  },
  {
    id: 'network_leverage',
    label: 'Network Leverage Pattern',
    domains: ['career', 'relationship'],
    thesis: 'Results improve when you use connections, context, and introductions deliberately.',
    risk: 'Passive expectation will hide accessible leverage.',
    activationRules: ['relationship support tied to career'],
    scenarioIds: ['referral_chain_window', 'collab_window', 'network_unlock_window'],
    minMatchedSignals: 2,
    preferredPhases: ['expansion', 'expansion_guarded'],
    matchers: [
      { domains: ['career', 'relationship'], polarities: ['strength'], minScore: 5 },
      { keywords: ['relationship', 'support', 'network', 'friend', 'collab'], minScore: 4 },
    ],
  },
  {
    id: 'timing_compression',
    label: 'Timing Compression Pattern',
    domains: ['timing', 'career', 'relationship'],
    thesis: 'Multiple decisions are clustering together, so sequencing discipline matters.',
    risk: 'Compression increases error cost if everything is treated as urgent.',
    activationRules: ['timing cluster', 'transit load'],
    scenarioIds: ['staggered_decision_window', 'priority_split_window', 'deadline_cluster_window'],
    minMatchedSignals: 2,
    preferredPhases: ['high_tension_expansion', 'expansion_guarded'],
    matchers: [
      { domains: ['timing'], minScore: 4 },
      { keywords: ['transit', 'daeun', 'seun', 'timing', 'return'], minScore: 4 },
    ],
  },
]

const DOMAIN_PATTERN_CONFIG: Record<
  SignalDomain,
  { label: string; keywords: string[]; layers?: number[] }
> = {
  career: {
    label: 'Career',
    keywords: ['career', 'work', 'job', 'h10', 'mc', 'promotion'],
    layers: [2, 3, 4, 6],
  },
  relationship: {
    label: 'Relationship',
    keywords: ['relationship', 'partner', 'love', 'h7', 'venus', 'mars'],
    layers: [3, 5, 6],
  },
  wealth: {
    label: 'Wealth',
    keywords: ['wealth', 'money', 'finance', 'asset', 'budget', 'jupiter', 'saturn'],
    layers: [2, 3, 4],
  },
  health: {
    label: 'Health',
    keywords: ['health', 'routine', 'h6', 'fatigue', 'stress', 'moon', 'saturn'],
    layers: [4, 6],
  },
  timing: {
    label: 'Timing',
    keywords: ['timing', 'transit', 'daeun', 'seun', 'return', 'retrograde'],
    layers: [4],
  },
  personality: {
    label: 'Personality',
    keywords: ['personality', 'identity', 'self', 'h1', 'saturn', 'sun'],
    layers: [1, 2, 6],
  },
  spirituality: {
    label: 'Spirituality',
    keywords: ['spiritual', 'mission', 'purpose', 'node', 'chiron'],
    layers: [7, 10],
  },
  move: {
    label: 'Move',
    keywords: ['move', 'travel', 'relocat', 'foreign', 'h9', 'h12'],
    layers: [4, 9],
  },
}

function createDomainFocusPatterns(): PatternDefinition[] {
  const entries = Object.entries(DOMAIN_PATTERN_CONFIG) as Array<
    [SignalDomain, (typeof DOMAIN_PATTERN_CONFIG)[SignalDomain]]
  >
  return entries.flatMap(([domain, cfg]) => {
    const strengthPreferred: StrategyPhaseCode[] =
      domain === 'timing'
        ? ['expansion_guarded', 'high_tension_expansion']
        : ['expansion', 'expansion_guarded']
    const cautionPreferred: StrategyPhaseCode[] =
      domain === 'timing'
        ? ['defensive_reset', 'stabilize']
        : ['expansion_guarded', 'defensive_reset']

    const strengthPattern: PatternDefinition = {
      id: `${domain}_upside_cluster`,
      label: `${cfg.label} Upside Cluster`,
      domains: [domain],
      thesis: `${cfg.label} signals are clustering on the upside, so deliberate execution can compound.`,
      risk: `If ${domain} decisions are rushed, upside can degrade into preventable rework.`,
      activationRules: [`${domain} strength concentration`, 'signal cluster'],
      scenarioIds: [`${domain}_upside_main`, `${domain}_upside_alt`, `${domain}_upside_guarded`],
      minMatchedSignals: 2,
      preferredPhases: strengthPreferred,
      matchers: [
        { domains: [domain], polarities: ['strength'], minScore: 5, layers: cfg.layers },
        { domains: [domain], minScore: 7 },
        { keywords: cfg.keywords, minScore: 5 },
      ],
    }

    const cautionPattern: PatternDefinition = {
      id: `${domain}_risk_cluster`,
      label: `${cfg.label} Risk Cluster`,
      domains: [domain],
      thesis: `${cfg.label} caution signals are concentrated, so sequencing and validation must lead.`,
      risk: `Ignoring early friction in ${domain} can increase downstream correction cost.`,
      activationRules: [`${domain} caution concentration`, 'guardrail-first execution'],
      scenarioIds: [`${domain}_risk_main`, `${domain}_risk_alt`, `${domain}_risk_guarded`],
      minMatchedSignals: 2,
      preferredPhases: cautionPreferred,
      matchers: [
        { domains: [domain], polarities: ['caution'], minScore: 4, layers: cfg.layers },
        { domains: [domain], polarities: ['balance', 'caution'], minScore: 6 },
        { keywords: [...cfg.keywords, 'square', 'opposition', 'conflict', 'delay'], minScore: 4 },
      ],
    }

    return [strengthPattern, cautionPattern]
  })
}

const PHASE_PATTERN_CONFIG: Array<{
  phase: StrategyPhaseCode
  label: string
  thesis: string
  risk: string
}> = [
  {
    phase: 'expansion',
    label: 'Expansion Bias Window',
    thesis:
      'The strategic phase favors growth moves with clear ownership and measurable milestones.',
    risk: 'Speed can still hide execution debt if governance is weak.',
  },
  {
    phase: 'high_tension_expansion',
    label: 'High-Tension Expansion Window',
    thesis: 'Growth pressure is real, but conflict-management quality determines net gain.',
    risk: 'Escalation without structure can erase upside quickly.',
  },
  {
    phase: 'expansion_guarded',
    label: 'Guarded Expansion Window',
    thesis: 'Selective expansion is available when verification is embedded in the sequence.',
    risk: 'Skipping checkpoints can turn manageable risk into hard reversals.',
  },
  {
    phase: 'stabilize',
    label: 'Stabilization Window',
    thesis:
      'Consolidation and process quality now produce better outcomes than aggressive scaling.',
    risk: 'Under-communicated priorities can create hidden drift.',
  },
  {
    phase: 'defensive_reset',
    label: 'Defensive Reset Window',
    thesis: 'Reset actions have high leverage when constraints are clarified before commitment.',
    risk: 'Emotional over-correction can damage optionality.',
  },
]

function createPhasePatterns(): PatternDefinition[] {
  return PHASE_PATTERN_CONFIG.map((cfg) => ({
    id: `phase_${cfg.phase}`,
    label: cfg.label,
    domains: ['timing'],
    thesis: cfg.thesis,
    risk: cfg.risk,
    activationRules: ['strategy phase alignment', cfg.phase],
    scenarioIds: [
      `phase_${cfg.phase}_main`,
      `phase_${cfg.phase}_alt`,
      `phase_${cfg.phase}_defensive`,
    ],
    minMatchedSignals: 2,
    preferredPhases: [cfg.phase],
    matchers: [
      { domains: ['timing'], minScore: 4 },
      { keywords: ['timing', 'transit', 'daeun', 'seun', 'return', 'window'], minScore: 4 },
    ],
  }))
}

const DERIVED_PATTERN_DEFINITIONS: PatternDefinition[] = [
  ...createDomainFocusPatterns(),
  ...createPhasePatterns(),
]

export const PATTERN_DEFINITIONS: PatternDefinition[] = [
  ...BASE_PATTERN_DEFINITIONS,
  ...DERIVED_PATTERN_DEFINITIONS,
]

function isRiskPattern(pattern: PatternResult): boolean {
  const text = `${pattern.id} ${pattern.label} ${pattern.risk}`.toLowerCase()
  return /(risk|tension|volatility|reset|compression|burnout|guarded|defensive)/.test(text)
}

function hasMixedPolarity(signals: NormalizedSignal[], domains: SignalDomain[]): boolean {
  const relevant = signals.filter((signal) =>
    domains.some((domain) => signal.domainHints.includes(domain))
  )
  const hasStrength = relevant.some((signal) => signal.polarity === 'strength')
  const hasCaution = relevant.some((signal) => signal.polarity === 'caution')
  return hasStrength && hasCaution
}

function buildCompositePatterns(
  basePatterns: PatternResult[],
  signals: NormalizedSignal[],
  strategyEngine: StrategyEngineResult
): PatternResult[] {
  const candidates = basePatterns.filter((pattern) => pattern.score >= 58).slice(0, 8)
  const composites: PatternResult[] = []
  const seen = new Set<string>()

  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const left = candidates[i]
      const right = candidates[j]
      const domains = uniqueStrings(
        [...left.domains, ...right.domains].filter(Boolean)
      ) as SignalDomain[]
      if (domains.length === 0) continue

      const overlapDomainCount = left.domains.filter((domain) =>
        right.domains.includes(domain)
      ).length
      if (overlapDomainCount === 0 && Math.min(left.score, right.score) < 70) continue

      const pairKey = [left.id, right.id].sort().join('__')
      if (seen.has(pairKey)) continue
      seen.add(pairKey)

      const mixedPolarity = hasMixedPolarity(signals, domains)
      const guarded = isRiskPattern(left) || isRiskPattern(right) || mixedPolarity
      const phase = strategyEngine.overallPhase
      const phaseBoost = phase === 'high_tension_expansion' || phase === 'expansion_guarded' ? 6 : 2
      const score = clamp(
        Math.round(left.score * 0.52 + right.score * 0.48 + overlapDomainCount * 4 + phaseBoost),
        1,
        99
      )
      const confidence = clamp(
        Number(((left.confidence + right.confidence) / 2 + (guarded ? 0.04 : 0.02)).toFixed(2)),
        0.1,
        0.98
      )

      composites.push({
        id: `composite_${pairKey}`,
        label: `${left.label} + ${right.label}`,
        domains,
        score,
        confidence,
        matchedSignalIds: uniqueStrings([
          ...left.matchedSignalIds,
          ...right.matchedSignalIds,
        ]).slice(0, 12),
        matchedKeywords: uniqueStrings([...left.matchedKeywords, ...right.matchedKeywords]).slice(
          0,
          10
        ),
        thesis: guarded
          ? 'Upside and caution are both active; progress should be paired with explicit guardrails.'
          : 'Aligned signals are compounding across linked domains.',
        risk: guarded
          ? 'If sequence control is weak, cross-domain coupling can amplify error cost.'
          : 'Ignoring dependency timing can reduce achievable upside.',
        activationReason: uniqueStrings([
          left.activationReason,
          right.activationReason,
          mixedPolarity ? 'mixed-polarity' : 'aligned-polarity',
          phase,
        ]).join(' | '),
        scenarioIds: uniqueStrings([...left.scenarioIds, ...right.scenarioIds]).slice(0, 6),
      })

      if (composites.length >= 8) return composites
    }
  }

  return composites
}

export function buildPatternEngine(
  synthesis: SignalSynthesisResult,
  strategyEngine: StrategyEngineResult
): PatternResult[] {
  const signals =
    synthesis.normalizedSignals.length > 0 ? synthesis.normalizedSignals : synthesis.selectedSignals
  const selectedIdSet = new Set((synthesis.selectedSignals || []).map((signal) => signal.id))
  const basePatterns = PATTERN_DEFINITIONS.map((definition) => {
    const matchedSignals = signals.filter((signal) =>
      definition.matchers.some((matcher) => matchesSignal(signal, matcher))
    )
    const matchedSignalIds = uniqueStrings(matchedSignals.map((signal) => signal.id))
    if (matchedSignalIds.length < definition.minMatchedSignals) return null

    const leadStrategy = getLeadStrategy(strategyEngine, definition.domains)
    const averageSignalScore =
      matchedSignals.reduce((sum, signal) => sum + signal.score, 0) /
      Math.max(1, matchedSignals.length)
    const phaseBonus =
      definition.preferredPhases &&
      leadStrategy &&
      definition.preferredPhases.includes(leadStrategy.phase)
        ? 10
        : 0
    const selectedHitCount = matchedSignals.filter((signal) => selectedIdSet.has(signal.id)).length
    const selectedHitBonus = Math.min(10, selectedHitCount * 3)
    const attackBonus = (leadStrategy?.attackPercent || strategyEngine.attackPercent) * 0.15
    const score = clamp(
      Math.round(
        (averageSignalScore / 10) * 55 +
          matchedSignalIds.length * 8 +
          selectedHitBonus +
          attackBonus +
          phaseBonus
      ),
      1,
      100
    )
    const confidence = clamp(
      Number(
        (
          0.32 +
          Math.min(0.3, matchedSignalIds.length * 0.08) +
          Math.min(0.22, averageSignalScore / 30) +
          (phaseBonus > 0 ? 0.08 : 0)
        ).toFixed(2)
      ),
      0.1,
      0.98
    )
    const matchedKeywords = uniqueStrings(
      matchedSignals.flatMap((signal) => [
        signal.keyword,
        signal.rowKey,
        signal.colKey,
        ...(signal.tags || []),
      ])
    ).slice(0, 8)
    const activationReason = uniqueStrings([
      ...definition.activationRules,
      ...(leadStrategy ? [leadStrategy.phase] : []),
    ]).join(' | ')

    return {
      id: definition.id,
      label: definition.label,
      domains: definition.domains,
      score,
      confidence,
      matchedSignalIds,
      matchedKeywords,
      thesis: definition.thesis,
      risk: definition.risk,
      activationReason,
      scenarioIds: definition.scenarioIds,
    } satisfies PatternResult
  }).filter((value): value is PatternResult => Boolean(value))

  const compositePatterns = buildCompositePatterns(basePatterns, signals, strategyEngine)
  return [...basePatterns, ...compositePatterns].sort(
    (a, b) => b.score - a.score || b.confidence - a.confidence
  )
}
