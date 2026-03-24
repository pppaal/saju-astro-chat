import type { DestinyCoreResult } from './runDestinyCore'
import type { SignalDomain } from './signalSynthesizer'
import { formatDecisionActionLabels, formatPolicyCheckLabels } from './actionCopy'

type AdapterProvenance = {
  sourceFields: string[]
  sourceSignalIds: string[]
  sourceRuleIds: string[]
  sourceSetIds: string[]
}

type AdapterArbitrationBrief = {
  focusWinnerDomain: SignalDomain
  focusWinnerReason: string
  focusRunnerUpDomain: SignalDomain | null
  actionWinnerDomain: SignalDomain
  actionWinnerReason: string
  actionRunnerUpDomain: SignalDomain | null
  conflictReasons: string[]
  focusNarrative: string
  actionNarrative: string
  suppressionNarratives: string[]
}

type AdapterLatentAxis = {
  id: string
  label: string
  score: number
  group: string
}

type AdapterProjectionBlock = {
  headline: string
  summary: string
  reasons: string[]
}

type AdapterProjectionSet = {
  structure: AdapterProjectionBlock
  timing: AdapterProjectionBlock
  conflict: AdapterProjectionBlock
  action: AdapterProjectionBlock
  risk: AdapterProjectionBlock
  evidence: AdapterProjectionBlock
}

export interface CalendarCoreAdapterResult {
  coreHash: string
  gradeLabel: string
  gradeReason: string
  phase: string
  phaseLabel: string
  focusDomain: SignalDomain
  actionFocusDomain: SignalDomain
  confidence: number
  crossAgreement: number | null
  arbitrationBrief: AdapterArbitrationBrief
  latentTopAxes: AdapterLatentAxis[]
  projections: AdapterProjectionSet
  attackPercent: number
  defensePercent: number
  thesis: string
  riskControl: string
  primaryAction: string
  primaryCaution: string
  claimIds: string[]
  claimProvenanceById: Record<string, AdapterProvenance>
  cautionIds: string[]
  topSignalIds: string[]
  topPatternIds: string[]
  topScenarioIds: string[]
  topDecisionId: string | null
  topDecisionAction: string | null
  topDecisionLabel: string | null
  judgmentPolicy: {
    mode: 'execute' | 'verify' | 'prepare'
    allowedActions: string[]
    allowedActionLabels: string[]
    blockedActions: string[]
    blockedActionLabels: string[]
    hardStops: string[]
    hardStopLabels: string[]
    softChecks: string[]
    softCheckLabels: string[]
    rationale: string
  }
  domainVerdicts: Array<{
    domain: SignalDomain
    mode: 'execute' | 'verify' | 'prepare'
    confidence: number
    leadPatternId: string | null
    leadPatternFamily: string | null
    leadScenarioId: string | null
    allowedActions: string[]
    allowedActionLabels: string[]
    blockedActions: string[]
    blockedActionLabels: string[]
    rationale: string
    evidenceIds: string[]
    provenance: AdapterProvenance
  }>
  coherenceAudit: {
    verificationBias: boolean
    gatedDecision: boolean
    domainConflictCount: number
    contradictionFlags: string[]
    notes: string[]
  }
  advisories: Array<{
    domain: SignalDomain
    phase: string
    thesis: string
    action: string
    caution: string
    timingHint: string
    strategyLine: string
    leadSignalIds: string[]
    leadPatternIds: string[]
    leadScenarioIds: string[]
    provenance: AdapterProvenance
  }>
  domainTimingWindows: Array<{
    domain: SignalDomain
    window: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'
    confidence: number
    timingRelevance: number
    timingGranularity: 'day' | 'week' | 'fortnight' | 'month' | 'season'
    precisionReason: string
    timingConflictMode: 'aligned' | 'readiness_ahead' | 'trigger_ahead' | 'weak_both'
    timingConflictNarrative: string
    readinessScore: number
    triggerScore: number
    convergenceScore: number
    whyNow: string
    entryConditions: string[]
    abortConditions: string[]
    evidenceIds: string[]
    provenance: AdapterProvenance
  }>
  manifestations: Array<{
    domain: SignalDomain
    baselineThesis: string
    activationThesis: string
    manifestation: string
    likelyExpressions: string[]
    riskExpressions: string[]
    timingWindow: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'
    activationSources: Array<{
      source: string
      active: boolean
      intensity: number
      label: string
      evidenceIds: string[]
    }>
    evidenceIds: string[]
    provenance: AdapterProvenance
  }>
}

export interface CounselorCoreAdapterResult {
  coreHash: string
  focusDomain: SignalDomain
  actionFocusDomain: SignalDomain
  arbitrationBrief: AdapterArbitrationBrief
  latentTopAxes: AdapterLatentAxis[]
  projections: AdapterProjectionSet
  gradeLabel: string
  phase: string
  phaseLabel: string
  answerThesis: string
  riskControl: string
  primaryAction: string
  primaryCaution: string
  timingHint: string
  topClaimId: string | null
  claimIds: string[]
  claimProvenanceById: Record<string, AdapterProvenance>
  topSignalIds: string[]
  topScenarioIds: string[]
  topDecisionId: string | null
  topDecisionAction: string | null
  topDecisionLabel: string | null
  judgmentPolicy: {
    mode: 'execute' | 'verify' | 'prepare'
    allowedActions: string[]
    allowedActionLabels: string[]
    blockedActions: string[]
    blockedActionLabels: string[]
    hardStops: string[]
    hardStopLabels: string[]
    softChecks: string[]
    softCheckLabels: string[]
    rationale: string
  }
  domainVerdicts: Array<{
    domain: SignalDomain
    mode: 'execute' | 'verify' | 'prepare'
    confidence: number
    leadPatternId: string | null
    leadPatternFamily: string | null
    leadScenarioId: string | null
    allowedActions: string[]
    allowedActionLabels: string[]
    blockedActions: string[]
    blockedActionLabels: string[]
    rationale: string
    evidenceIds: string[]
    provenance: AdapterProvenance
  }>
  coherenceAudit: {
    verificationBias: boolean
    gatedDecision: boolean
    domainConflictCount: number
    contradictionFlags: string[]
    notes: string[]
  }
  advisories: Array<{
    domain: SignalDomain
    thesis: string
    action: string
    caution: string
    timingHint: string
    strategyLine: string
    leadSignalIds: string[]
    leadPatternIds: string[]
    leadScenarioIds: string[]
    provenance: AdapterProvenance
  }>
  domainTimingWindows: Array<{
    domain: SignalDomain
    window: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'
    confidence: number
    timingRelevance: number
    timingGranularity: 'day' | 'week' | 'fortnight' | 'month' | 'season'
    precisionReason: string
    timingConflictMode: 'aligned' | 'readiness_ahead' | 'trigger_ahead' | 'weak_both'
    timingConflictNarrative: string
    readinessScore: number
    triggerScore: number
    convergenceScore: number
    whyNow: string
    entryConditions: string[]
    abortConditions: string[]
    evidenceIds: string[]
    provenance: AdapterProvenance
  }>
  manifestations: Array<{
    domain: SignalDomain
    baselineThesis: string
    activationThesis: string
    manifestation: string
    likelyExpressions: string[]
    riskExpressions: string[]
    timingWindow: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'
    activationSources: Array<{
      source: string
      active: boolean
      intensity: number
      label: string
      evidenceIds: string[]
    }>
    evidenceIds: string[]
    provenance: AdapterProvenance
  }>
}

export interface ReportCoreAdapterResult {
  coreHash: string
  focusDomain: SignalDomain
  actionFocusDomain: SignalDomain
  arbitrationBrief: AdapterArbitrationBrief
  latentTopAxes: AdapterLatentAxis[]
  projections: AdapterProjectionSet
  gradeLabel: string
  gradeReason: string
  phase: string
  phaseLabel: string
  thesis: string
  riskControl: string
  primaryAction: string
  primaryCaution: string
  confidence: number
  crossAgreement: number | null
  claimIds: string[]
  claimProvenanceById: Record<string, AdapterProvenance>
  evidenceRefs: Record<string, string[]>
  topSignalIds: string[]
  topPatternIds: string[]
  topScenarioIds: string[]
  topDecisionId: string | null
  topDecisionAction: string | null
  topDecisionLabel: string | null
  judgmentPolicy: {
    mode: 'execute' | 'verify' | 'prepare'
    allowedActions: string[]
    allowedActionLabels: string[]
    blockedActions: string[]
    blockedActionLabels: string[]
    hardStops: string[]
    hardStopLabels: string[]
    softChecks: string[]
    softCheckLabels: string[]
    rationale: string
  }
  domainVerdicts: Array<{
    domain: SignalDomain
    mode: 'execute' | 'verify' | 'prepare'
    confidence: number
    leadPatternId: string | null
    leadPatternFamily: string | null
    leadScenarioId: string | null
    allowedActions: string[]
    allowedActionLabels: string[]
    blockedActions: string[]
    blockedActionLabels: string[]
    rationale: string
    evidenceIds: string[]
    provenance: AdapterProvenance
  }>
  coherenceAudit: {
    verificationBias: boolean
    gatedDecision: boolean
    domainConflictCount: number
    contradictionFlags: string[]
    notes: string[]
  }
  advisories: Array<{
    domain: SignalDomain
    phase: string
    thesis: string
    action: string
    caution: string
    timingHint: string
    strategyLine: string
    leadSignalIds: string[]
    leadPatternIds: string[]
    leadScenarioIds: string[]
    evidenceIds: string[]
    provenance: AdapterProvenance
  }>
  domainTimingWindows: Array<{
    domain: SignalDomain
    window: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'
    confidence: number
    timingRelevance: number
    timingGranularity: 'day' | 'week' | 'fortnight' | 'month' | 'season'
    precisionReason: string
    timingConflictMode: 'aligned' | 'readiness_ahead' | 'trigger_ahead' | 'weak_both'
    timingConflictNarrative: string
    readinessScore: number
    triggerScore: number
    convergenceScore: number
    whyNow: string
    entryConditions: string[]
    abortConditions: string[]
    evidenceIds: string[]
    provenance: AdapterProvenance
  }>
  manifestations: Array<{
    domain: SignalDomain
    baselineThesis: string
    activationThesis: string
    manifestation: string
    likelyExpressions: string[]
    riskExpressions: string[]
    timingWindow: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'
    activationSources: Array<{
      source: string
      active: boolean
      intensity: number
      label: string
      evidenceIds: string[]
    }>
    evidenceIds: string[]
    provenance: AdapterProvenance
  }>
}

function getTimingHint(core: DestinyCoreResult): string {
  const scenarioWindow = core.canonical.topScenarios[0]?.window
  if (scenarioWindow) return scenarioWindow
  const timelineWindow = core.canonical.timelineHits[0]?.window
  return timelineWindow || 'now'
}

function localizeDomain(domain: SignalDomain, locale: 'ko' | 'en'): string {
  if (locale === 'ko') {
    const ko: Record<SignalDomain, string> = {
      personality: '성향',
      career: '커리어',
      relationship: '관계',
      wealth: '재정',
      health: '건강',
      spirituality: '영성',
      timing: '타이밍',
      move: '이동',
    }
    return ko[domain] || domain
  }

  const en: Record<SignalDomain, string> = {
    personality: 'personality',
    career: 'career',
    relationship: 'relationship',
    wealth: 'wealth',
    health: 'health',
    spirituality: 'spirituality',
    timing: 'timing',
    move: 'move',
  }
  return en[domain] || domain
}

function getFocusDomainVerdict(core: DestinyCoreResult) {
  return (
    core.canonical.domainVerdicts.find((item) => item.domain === core.canonical.focusDomain) || null
  )
}

function getActionFocusDomainVerdict(core: DestinyCoreResult) {
  return (
    core.canonical.domainVerdicts.find(
      (item) => item.domain === core.canonical.actionFocusDomain
    ) || null
  )
}

function getTopDecisionAction(core: DestinyCoreResult): string | null {
  const topAction = core.canonical.topDecision?.action || null
  const topDomain = core.canonical.topDecision?.domain || null
  if (topAction && topDomain === core.canonical.actionFocusDomain) return topAction
  const actionVerdict = getActionFocusDomainVerdict(core)
  return actionVerdict?.allowedActions?.[0] || topAction
}

function getTopDecisionLabel(core: DestinyCoreResult, locale: 'ko' | 'en'): string | null {
  const topLabel = core.canonical.topDecision?.label || null
  const topDomain = core.canonical.topDecision?.domain || null
  if (topLabel && topDomain === core.canonical.actionFocusDomain) return topLabel

  const actionVerdict = getActionFocusDomainVerdict(core)
  const action = actionVerdict?.allowedActions?.[0]
  if (!action) return topLabel
  const actionLabel = formatDecisionActionLabels([action], locale, false)[0]
  if (!actionLabel) return topLabel
  return `${localizeDomain(core.canonical.actionFocusDomain, locale)}: ${actionLabel}`
}

function getAllowedActionLabels(actions: string[], locale: 'ko' | 'en'): string[] {
  return formatDecisionActionLabels(actions, locale, false)
}

function getBlockedActionLabels(actions: string[], locale: 'ko' | 'en'): string[] {
  return formatDecisionActionLabels(actions, locale, true)
}

function localizeAdapterFreeText(text: string | undefined | null, locale: 'ko' | 'en'): string {
  const value = String(text || '').trim()
  if (!value) return ''
  if (locale !== 'ko') return value

  let out = value
    .replace(/\bpersonality\b/g, '성향')
    .replace(/\bcareer\b/g, '커리어')
    .replace(/\brelationship\b/g, '관계')
    .replace(/\bwealth\b/g, '재정')
    .replace(/\bhealth\b/g, '건강')
    .replace(/\bmove\b/g, '이동')
    .replace(/\btiming\b/g, '타이밍')
    .replace(/\bweek\b/g, '주 단위')
    .replace(/\bfortnight\b/g, '2주 단위')
    .replace(/\bmonth\b/g, '월 단위')
    .replace(/\bseason\b/g, '분기 단위')
    .replace(/\bweak_both\b/g, '구조와 촉발이 모두 약한 상태')
    .replace(/\baligned\b/g, '구조와 촉발이 함께 맞물린 상태')
    .replace(/\breadiness_ahead\b/g, '구조가 먼저 열린 상태')
    .replace(/\btrigger_ahead\b/g, '촉발이 먼저 앞선 상태')
    .replace(/\bdowngrade pressure\b/gi, '하향 조정 압력')
    .replace(/\brelationship caution\b/gi, '관계 주의 신호')
    .replace(/\bmoney expansion action\b/gi, '재정 확장 실행')
    .replace(
      /action pressure stayed narrow between ([^\s]+) and ([^\s]+)/gi,
      (_, left: string, right: string) =>
        `${localizeDomain(left as SignalDomain, 'ko')}와 ${localizeDomain(right as SignalDomain, 'ko')} 사이의 행동 압력이 좁게 경쟁했습니다`
    )
    .replace(
      /\b\w+\s+stayed secondary because total support remained below the winner\b/gi,
      '최종 지지가 승자축보다 약해 보조축에 머물렀습니다'
    )
    .replace(/\s+/g, ' ')
    .trim()

  out = out.replace(/([가-힣]+)은 /g, '$1은 ')
  out = out.replace(/([가-힣]+)이 /g, '$1이 ')
  return out
}

function buildEvidenceProjectionSummary(
  locale: 'ko' | 'en',
  topSignals: string[],
  topPatterns: string[],
  topScenarios: string[]
): string {
  if (locale === 'ko') {
    const signalCount = topSignals.length
    const patternCount = topPatterns.length
    const scenarioCount = topScenarios.length
    return `상위 신호 ${signalCount}개와 핵심 패턴 ${patternCount}개, 시나리오 ${scenarioCount}개가 이번 해석의 골격입니다.`
  }

  return `Top signals (${topSignals.length}), patterns (${topPatterns.length}), and scenarios (${topScenarios.length}) form the current spine.`
}

function buildEvidenceProjectionReasons(
  locale: 'ko' | 'en',
  topSignals: string[],
  topPatterns: string[],
  topScenarios: string[]
): string[] {
  if (locale === 'ko') {
    return [
      topSignals.length ? `핵심 신호 ${topSignals.length}개가 동시 작동 중입니다.` : '',
      topPatterns.length ? `상위 패턴 ${topPatterns.length}개가 같은 방향으로 겹칩니다.` : '',
      topScenarios.length ? `대표 시나리오 ${topScenarios.length}개가 현재 판단을 지지합니다.` : '',
    ].filter(Boolean)
  }

  return [
    topSignals.length ? `${topSignals.length} lead signals are active together.` : '',
    topPatterns.length ? `${topPatterns.length} lead patterns overlap in the same direction.` : '',
    topScenarios.length ? `${topScenarios.length} lead scenarios are supporting the current read.` : '',
  ].filter(Boolean)
}

function localizeLatentAxis(axisId: string, locale: 'ko' | 'en'): string {
  const ko: Record<string, string> = {
    readiness: '\uad6c\uc870 \uc900\ube44\ub3c4',
    trigger: '\ucd09\ubc1c \uc555\ub825',
    convergence: '\uad50\ucc28 \uc218\ub834\ub3c4',
    timing_reliability: '\ud0c0\uc774\ubc0d \uc2e0\ub8b0\ub3c4',
    timing_reversibility: '\ub418\ub3cc\ub9bc \uac00\ub2a5\uc131',
    timing_sustainability: '\ud0c0\uc774\ubc0d \uc9c0\uc18d\uc131',
    trigger_decay: '\ucd09\ubc1c \uac10\uc1e0',
    timing_consistency: '\ud0c0\uc774\ubc0d \uc77c\uad00\uc131',
    timing_window_width: '\ud0c0\uc774\ubc0d \ucc3d \ud3ed',
    activation_elasticity: '\ud65c\uc131 \ud0c4\ub825\uc131',
    intra_month_concentration: '\uc6d4\uc911 \uc9d1\uc911\ub3c4',
    timing_conflict: '\ud0c0\uc774\ubc0d \ucda9\ub3cc',
    focus_strength: '\uc911\uc2ec\ucd95 \uac15\ub3c4',
    action_focus_strength: '\ud589\ub3d9\ucd95 \uac15\ub3c4',
    decision_certainty: '\uacb0\uc815 \uc120\uba85\ub3c4',
    risk_control_intensity: '\ub9ac\uc2a4\ud06c \ud1b5\uc81c \uac15\ub3c4',
    career: '\ucee4\ub9ac\uc5b4 \uc555\ub825',
    relationship: '\uad00\uacc4 \uc555\ub825',
    wealth: '\uc7ac\uc815 \uc555\ub825',
    health: '\uac74\uac15 \uc555\ub825',
    move: '\uc774\ub3d9 \uc555\ub825',
    career_growth: '\ucee4\ub9ac\uc5b4 \uc131\uc7a5 \uc555\ub825',
    relationship_commitment: '\uad00\uacc4 \ud655\uc815 \uc555\ub825',
    wealth_leakage: '\uc7ac\uc815 \ub204\uc218 \uc555\ub825',
    health_recovery: '\uac74\uac15 \ud68c\ubcf5 \uc555\ub825',
    move_disruption: '\uc774\ub3d9 \uad50\ub780 \uc555\ub825',
    identity_rebuild: '\uc815\uccb4\uc131 \uc7ac\uad6c\uc131 \uc555\ub825',
    career_authority: '\ucee4\ub9ac\uc5b4 \uad8c\ud55c \uc555\ub825',
    relationship_repair: '\uad00\uacc4 \ud68c\ubcf5 \uc555\ub825',
    wealth_accumulation: '\uc7ac\uc815 \ucd95\uc801 \uc555\ub825',
    health_load: '\uac74\uac15 \ubd80\ud558 \uc555\ub825',
    move_opportunity: '\uc774\ub3d9 \uae30\ud68c \uc555\ub825',
    spiritual_opening: '\uc815\uc2e0\uc131 \uac1c\ubc29 \uc555\ub825',
    relation_harmony_density: '\uad00\uacc4 \uc870\ud654 \ubc00\ub3c4',
    relation_conflict_density: '\uad00\uacc4 \ucda9\ub3cc \ubc00\ub3c4',
    shinsal_density: '\uc2e0\uc0b4 \ubc00\ub3c4',
    supportive_cycle_alignment: '\ubcf4\uc870 \uc6b4 \ud750\ub984 \uc815\ub82c',
    cycle_cohesion: '\uc6b4 \ud750\ub984 \uc751\uc9d1\ub3c4',
    house_emphasis: '\ud558\uc6b0\uc2a4 \uac15\uc870\ub3c4',
    relational_capacity: '\uad00\uacc4 \uc218\uc6a9\ub825',
    support_resilience: '\uc9c0\uc9c0 \ud68c\ubcf5\ub825',
    draconic_support: '\ub4dc\ub77c\ucf54\ub2c9 \uc9c0\uc9c0',
    harmonic_resonance: '\ud558\ubaa8\ub2c9 \uacf5\uba85',
    fixed_star_pressure: '\uace0\uc815\uc131 \uc555\ub825',
    midpoint_activation: '\ubbf8\ub4dc\ud3ec\uc778\ud2b8 \ud65c\uc131',
    asteroid_signal_density: '\uc18c\ud589\uc131 \uc2e0\ud638 \ubc00\ub3c4',
    extra_point_density: '\ucd94\uac00 \ud3ec\uc778\ud2b8 \ubc00\ub3c4',
    return_stack_pressure: '\ub9ac\ud134 \uc911\ucca9 \uc555\ub825',
    aspect_cluster_density: '\uc560\uc2a4\ud399\ud2b8 \uad70\uc9d1 \ubc00\ub3c4',
    structure_trigger_mismatch: '\uad6c\uc870-\ucd09\ubc1c \ubd88\uc77c\uce58',
    opportunity_sustainability_gap: '\uae30\ud68c-\uc9c0\uc18d\uc131 \uac04\uadf9',
    focus_ambiguity: '\ucd08\uc810 \uacbd\uc7c1',
    evidence_fragmentation: '\uadfc\uac70 \ubd84\uc0b0',
    signal_competition: '\uc2e0\ud638 \uacbd\uc7c1',
    decision_reversal_risk: '\uacb0\uc815 \ubc18\uc804 \ub9ac\uc2a4\ud06c',
    timing_false_precision_risk: '\ud0c0\uc774\ubc0d \uacfc\uc815\ubc00 \ub9ac\uc2a4\ud06c',
    domain_polarization: '\ub3c4\uba54\uc778 \uc591\uadf9\ud654',
    evidence_mismatch_risk: '\uadfc\uac70 \ubd88\uc77c\uce58 \ub9ac\uc2a4\ud06c',
    cross_system_tension: '\uad50\ucc28 \uc2dc\uc2a4\ud15c \uae34\uc7a5',
    action_overreach_risk: '\ud589\ub3d9 \uacfc\uc2e0 \ub9ac\uc2a4\ud06c',
    evidence_cohesion: '\uadfc\uac70 \uc751\uc9d1\ub3c4',
    narrative_density: '\uc11c\uc0ac \ubc00\ub3c4',
    projection_clarity: '\ud22c\uc601 \uc120\uba85\ub3c4',
    explanation_depth: '\uc124\uba85 \uae4a\uc774',
    yongsin_alignment: '\uc6a9\uc2e0 \uc815\ub82c',
    saju_coverage: '\uc0ac\uc8fc \ud3ec\ucc29\ub3c4',
    advanced_astro_support: '\uace0\uae09 \uc810\uc131 \uc9c0\uc9c0',
    day_master_stability: '\uc77c\uac04 \uc548\uc815\uc131',
    long_cycle_support: '\uc7a5\uae30 \uc6b4 \uc9c0\uc9c0',
  }
  const en: Record<string, string> = {
    readiness: 'structural readiness',
    trigger: 'trigger pressure',
    convergence: 'cross convergence',
    timing_reliability: 'timing reliability',
    timing_reversibility: 'timing reversibility',
    timing_sustainability: 'timing sustainability',
    trigger_decay: 'trigger decay',
    timing_consistency: 'timing consistency',
    timing_window_width: 'timing window width',
    activation_elasticity: 'activation elasticity',
    intra_month_concentration: 'intra-month concentration',
    timing_conflict: 'timing conflict',
    focus_strength: 'focus strength',
    action_focus_strength: 'action focus strength',
    decision_certainty: 'decision certainty',
    risk_control_intensity: 'risk-control intensity',
    career: 'career pressure',
    relationship: 'relationship pressure',
    wealth: 'wealth pressure',
    health: 'health pressure',
    move: 'move pressure',
    career_growth: 'career growth pressure',
    relationship_commitment: 'relationship commitment pressure',
    wealth_leakage: 'wealth leakage pressure',
    health_recovery: 'health recovery pressure',
    move_disruption: 'move disruption pressure',
    identity_rebuild: 'identity rebuild pressure',
    career_authority: 'career authority pressure',
    relationship_repair: 'relationship repair pressure',
    wealth_accumulation: 'wealth accumulation pressure',
    health_load: 'health load pressure',
    move_opportunity: 'move opportunity pressure',
    spiritual_opening: 'spiritual opening pressure',
    relation_harmony_density: 'relationship harmony density',
    relation_conflict_density: 'relationship conflict density',
    shinsal_density: 'shinsal density',
    supportive_cycle_alignment: 'supportive cycle alignment',
    cycle_cohesion: 'cycle cohesion',
    house_emphasis: 'house emphasis',
    relational_capacity: 'relational capacity',
    support_resilience: 'support resilience',
    draconic_support: 'draconic support',
    harmonic_resonance: 'harmonic resonance',
    fixed_star_pressure: 'fixed-star pressure',
    midpoint_activation: 'midpoint activation',
    asteroid_signal_density: 'asteroid signal density',
    extra_point_density: 'extra-point density',
    return_stack_pressure: 'return-stack pressure',
    aspect_cluster_density: 'aspect-cluster density',
    structure_trigger_mismatch: 'structure-trigger mismatch',
    opportunity_sustainability_gap: 'opportunity-sustainability gap',
    focus_ambiguity: 'focus competition',
    evidence_fragmentation: 'evidence fragmentation',
    signal_competition: 'signal competition',
    decision_reversal_risk: 'decision reversal risk',
    timing_false_precision_risk: 'timing false-precision risk',
    domain_polarization: 'domain polarization',
    evidence_mismatch_risk: 'evidence mismatch risk',
    cross_system_tension: 'cross-system tension',
    action_overreach_risk: 'action overreach risk',
    evidence_cohesion: 'evidence cohesion',
    narrative_density: 'narrative density',
    projection_clarity: 'projection clarity',
    explanation_depth: 'explanation depth',
    yongsin_alignment: 'yongsin alignment',
    saju_coverage: 'saju coverage',
    advanced_astro_support: 'advanced astro support',
    day_master_stability: 'day-master stability',
    long_cycle_support: 'long-cycle support',
  }
  return (locale === 'ko' ? ko : en)[axisId] || axisId.replace(/_/g, ' ')
}

function buildArbitrationBrief(
  core: DestinyCoreResult,
  locale: 'ko' | 'en' = 'en'
): AdapterArbitrationBrief {
  const focusWinnerDomain = core.canonical.arbitrationLedger.focusWinner.domain
  const actionWinnerDomain =
    core.canonical.arbitrationLedger.actionWinner?.domain || core.canonical.actionFocusDomain
  const focusRunnerUpDomain = core.canonical.arbitrationLedger.focusRunnerUp?.domain || null
  const actionRunnerUpDomain = core.canonical.arbitrationLedger.actionRunnerUp?.domain || null
  const suppressedDomains = core.canonical.arbitrationLedger.suppressedDomains || []

  return {
    focusWinnerDomain,
    focusWinnerReason: core.canonical.arbitrationLedger.focusWinner.reason,
    focusRunnerUpDomain,
    actionWinnerDomain,
    actionWinnerReason:
      core.canonical.arbitrationLedger.actionWinner?.reason ||
      `${core.canonical.actionFocusDomain} action lead came from fallback action selection`,
    actionRunnerUpDomain,
    conflictReasons: [...(core.canonical.arbitrationLedger.conflictReasons || [])],
    focusNarrative:
      locale === 'ko'
        ? focusRunnerUpDomain
          ? `${localizeDomain(focusWinnerDomain, locale)}이 ${localizeDomain(focusRunnerUpDomain, locale)}보다 앞서 이번 중심축으로 올라왔습니다.`
          : `${localizeDomain(focusWinnerDomain, locale)}이 이번 중심축으로 유지됩니다.`
        : focusRunnerUpDomain
          ? `${focusWinnerDomain} stayed ahead of ${focusRunnerUpDomain} as the lead identity axis.`
          : `${focusWinnerDomain} remained the lead identity axis.`,
    actionNarrative:
      locale === 'ko'
        ? actionRunnerUpDomain
          ? `${localizeDomain(actionWinnerDomain, locale)}이 ${localizeDomain(actionRunnerUpDomain, locale)}보다 앞서 지금의 행동축이 되었습니다.`
          : `${localizeDomain(actionWinnerDomain, locale)}이 지금 실제 움직임을 이끄는 축입니다.`
        : actionRunnerUpDomain
          ? `${actionWinnerDomain} moved ahead of ${actionRunnerUpDomain} as the live action axis.`
          : `${actionWinnerDomain} is carrying the live action pressure.`,
    suppressionNarratives: suppressedDomains.map((item) =>
      locale === 'ko'
        ? `${localizeDomain(item.domain, locale)}은 ${item.scoreGap.toFixed(1)}점 차이로 보조축에 머물렀습니다. ${localizeAdapterFreeText(item.reason, locale)}`
        : `${item.domain} stayed secondary with a ${item.scoreGap.toFixed(1)} gap because ${item.reason}.`
    ),
  }
}

function buildLatentTopAxes(core: DestinyCoreResult, locale: 'ko' | 'en'): AdapterLatentAxis[] {
  const axisGroupEntries = Object.entries(core.latentState?.groups || {}) as Array<
    [string, string[]]
  >
  return (core.latentState?.topAxes || []).slice(0, 8).map((axis) => ({
    id: axis.id,
    label: localizeLatentAxis(axis.id, locale),
    score: axis.value,
    group: axisGroupEntries.find(([, ids]) => ids.includes(axis.id))?.[0] || 'unknown',
  }))
}

function buildProjectionSet(core: DestinyCoreResult, locale: 'ko' | 'en'): AdapterProjectionSet {
  const arbitrationBrief = buildArbitrationBrief(core, locale)
  const focusLabel = localizeDomain(core.canonical.focusDomain, locale)
  const actionLabel = localizeDomain(core.canonical.actionFocusDomain, locale)
  const topAxes = buildLatentTopAxes(core, locale)
  const groupedTopAxes = (group: string, limit = 3) => {
    const groupAxisIds = ((core.latentState?.groups as Record<string, string[]> | undefined)?.[group] || []) as string[]
    return (core.latentState?.topAxes || [])
      .filter((axis) => groupAxisIds.includes(axis.id))
      .slice(0, limit)
      .map((axis) => localizeLatentAxis(axis.id, locale))
  }
  const timingWindow =
    core.canonical.domainTimingWindows.find(
      (item) => item.domain === core.canonical.actionFocusDomain
    ) || core.canonical.domainTimingWindows[0]
  const topSignals = core.canonical.topSignalIds.slice(0, 3)
  const topPatterns = core.canonical.topPatterns.slice(0, 2).map((item) => item.id)
  const topScenarios = core.canonical.topScenarios.slice(0, 2).map((item) => item.id)

  const structureSummary =
    locale === 'ko'
      ? `중심축은 ${focusLabel}, 행동축은 ${actionLabel}이며 지금 판을 미는 층은 ${topAxes
          .slice(0, 3)
          .map((axis) => axis.label)
          .join(', ')}입니다. ${arbitrationBrief.focusNarrative}`
      : `The identity axis is ${focusLabel}, the action axis is ${actionLabel}, and the live drivers are ${topAxes
          .slice(0, 3)
          .map((axis) => axis.label)
          .join(', ')}. ${arbitrationBrief.focusNarrative}`

  const timingSummary =
    locale === 'ko'
      ? `${actionLabel} 쪽 타이밍은 ${localizeAdapterFreeText(timingWindow?.window || 'unknown', locale)} 구간으로 읽히며, ${localizeAdapterFreeText(timingWindow?.timingConflictNarrative || '구조와 촉발을 함께 봐야 합니다.', locale)}`
      : `Timing for ${actionLabel} reads as ${timingWindow?.window || 'unknown'}, and ${timingWindow?.timingConflictNarrative || 'structure and trigger need to be read together.'}`

  const conflictSummary =
    locale === 'ko'
      ? arbitrationBrief.actionNarrative || `${focusLabel} 중심축과 ${actionLabel} 행동축이 분리돼 읽히는 구간입니다.`
      : arbitrationBrief.actionNarrative || `${focusLabel} and ${actionLabel} currently separate into identity and action axes.`

  const actionSummary =
    locale === 'ko'
      ? `${actionLabel} 축에서는 ${getTopDecisionLabel(core, locale) || core.canonical.primaryAction}이 실제 움직임의 중심입니다. ${arbitrationBrief.actionNarrative}`
      : `On the ${actionLabel} axis, ${getTopDecisionLabel(core, locale) || core.canonical.primaryAction} is the live move. ${arbitrationBrief.actionNarrative}`

  const riskSummary = localizeAdapterFreeText(
    locale === 'ko'
      ? [core.canonical.primaryCaution, core.canonical.riskControl].filter(Boolean).join('. ')
      : `${core.canonical.primaryCaution} ${core.canonical.riskControl}`.trim(),
    locale
  )

  const evidenceSummary = buildEvidenceProjectionSummary(
    locale,
    topSignals,
    topPatterns,
    topScenarios
  )

  return {
    structure: {
      headline: locale === 'ko' ? '구조' : 'Structure',
      summary: structureSummary,
      reasons:
        groupedTopAxes('structural').length > 0
          ? groupedTopAxes('structural')
          : topAxes.slice(0, 3).map((axis) => axis.label),
    },
    timing: {
      headline: locale === 'ko' ? '타이밍' : 'Timing',
      summary: timingSummary,
      reasons: [
        ...groupedTopAxes('timing', 3),
        localizeAdapterFreeText(timingWindow?.timingGranularity || 'unknown', locale),
        localizeAdapterFreeText(timingWindow?.precisionReason || '', locale),
        localizeAdapterFreeText(timingWindow?.timingConflictMode || '', locale),
      ].filter(Boolean).slice(0, 5),
    },
    conflict: {
      headline: locale === 'ko' ? '충돌' : 'Conflict',
      summary: localizeAdapterFreeText(conflictSummary, locale),
      reasons: [
        ...groupedTopAxes('conflict', 3),
        ...core.canonical.arbitrationLedger.conflictReasons
          .slice(0, 3)
          .map((item) => localizeAdapterFreeText(item, locale)),
        ...arbitrationBrief.suppressionNarratives.slice(0, 2),
      ].filter(Boolean).slice(0, 5),
    },
    action: {
      headline: locale === 'ko' ? '행동' : 'Action',
      summary: localizeAdapterFreeText(actionSummary, locale),
      reasons: [
        ...groupedTopAxes('domain', 3),
        getTopDecisionLabel(core, locale) || '',
        ...getAllowedActionLabels(core.canonical.judgmentPolicy.allowedActions, locale).slice(0, 2),
      ].filter(Boolean).slice(0, 5),
    },
    risk: {
      headline: locale === 'ko' ? '리스크' : 'Risk',
      summary: riskSummary,
      reasons: [
        ...groupedTopAxes('conflict', 2),
        ...getBlockedActionLabels(core.canonical.judgmentPolicy.blockedActions, locale).slice(0, 2),
        ...formatPolicyCheckLabels(core.canonical.judgmentPolicy.hardStops)
          .slice(0, 2)
          .map((item) => localizeAdapterFreeText(item, locale)),
      ].filter(Boolean).slice(0, 5),
    },
    evidence: {
      headline: locale === 'ko' ? '근거' : 'Evidence',
      summary: localizeAdapterFreeText(evidenceSummary, locale),
      reasons: [
        ...groupedTopAxes('astrology', 2),
        ...groupedTopAxes('narrative', 2),
        ...buildEvidenceProjectionReasons(locale, topSignals, topPatterns, topScenarios),
      ].filter(Boolean).slice(0, 6),
    },
  }
}

export function adaptCoreToCalendar(
  core: DestinyCoreResult,
  locale: 'ko' | 'en' = 'ko'
): CalendarCoreAdapterResult {
  return {
    coreHash: core.coreHash,
    gradeLabel: core.canonical.gradeLabel,
    gradeReason: core.canonical.gradeReason,
    phase: core.canonical.phase,
    phaseLabel: core.canonical.phaseLabel,
    focusDomain: core.canonical.focusDomain,
    actionFocusDomain: core.canonical.actionFocusDomain,
    arbitrationBrief: buildArbitrationBrief(core, locale),
    latentTopAxes: buildLatentTopAxes(core, locale),
    projections: buildProjectionSet(core, locale),
    confidence: core.canonical.confidence,
    crossAgreement: core.canonical.crossAgreement,
    attackPercent: core.canonical.attackPercent,
    defensePercent: core.canonical.defensePercent,
    thesis: core.canonical.thesis,
    riskControl: core.canonical.riskControl,
    primaryAction: core.canonical.primaryAction,
    primaryCaution: core.canonical.primaryCaution,
    claimIds: [...core.canonical.claimIds],
    claimProvenanceById: Object.fromEntries(
      Object.entries(core.canonical.claimProvenanceById || {}).map(([id, provenance]) => [
        id,
        { ...provenance },
      ])
    ),
    cautionIds: [...core.canonical.cautions],
    topSignalIds: [...core.canonical.topSignalIds],
    topPatternIds: core.canonical.topPatterns.map((pattern) => pattern.id),
    topScenarioIds: core.canonical.topScenarios.map((scenario) => scenario.id),
    topDecisionId: core.canonical.topDecision?.id || null,
    topDecisionAction: getTopDecisionAction(core),
    topDecisionLabel: getTopDecisionLabel(core, locale),
    judgmentPolicy: {
      mode: core.canonical.judgmentPolicy.mode,
      allowedActions: [...core.canonical.judgmentPolicy.allowedActions],
      allowedActionLabels: getAllowedActionLabels(
        core.canonical.judgmentPolicy.allowedActions,
        locale
      ),
      blockedActions: [...core.canonical.judgmentPolicy.blockedActions],
      blockedActionLabels: getBlockedActionLabels(
        core.canonical.judgmentPolicy.blockedActions,
        locale
      ),
      hardStops: [...core.canonical.judgmentPolicy.hardStops],
      hardStopLabels: formatPolicyCheckLabels(core.canonical.judgmentPolicy.hardStops),
      softChecks: [...core.canonical.judgmentPolicy.softChecks],
      softCheckLabels: formatPolicyCheckLabels(core.canonical.judgmentPolicy.softChecks),
      rationale: core.canonical.judgmentPolicy.rationale,
    },
    domainVerdicts: core.canonical.domainVerdicts.map((item) => ({
      domain: item.domain,
      mode: item.mode,
      confidence: item.confidence,
      leadPatternId: item.leadPatternId,
      leadPatternFamily: item.leadPatternFamily,
      leadScenarioId: item.leadScenarioId,
      allowedActions: [...item.allowedActions],
      allowedActionLabels: getAllowedActionLabels(item.allowedActions, locale),
      blockedActions: [...item.blockedActions],
      blockedActionLabels: getBlockedActionLabels(item.blockedActions, locale),
      rationale: item.rationale,
      evidenceIds: [...item.evidenceIds],
      provenance: { ...item.provenance },
    })),
    coherenceAudit: {
      verificationBias: core.canonical.coherenceAudit.verificationBias,
      gatedDecision: core.canonical.coherenceAudit.gatedDecision,
      domainConflictCount: core.canonical.coherenceAudit.domainConflictCount,
      contradictionFlags: [...core.canonical.coherenceAudit.contradictionFlags],
      notes: [...core.canonical.coherenceAudit.notes],
    },
    advisories: core.canonical.advisories.map((item) => ({
      domain: item.domain,
      phase: item.phase,
      thesis: item.thesis,
      action: item.action,
      caution: item.caution,
      timingHint: item.timingHint,
      strategyLine: item.strategyLine,
      leadSignalIds: [...item.leadSignalIds],
      leadPatternIds: [...item.leadPatternIds],
      leadScenarioIds: [...item.leadScenarioIds],
      provenance: { ...item.provenance },
    })),
    domainTimingWindows: core.canonical.domainTimingWindows.map((item) => ({
      domain: item.domain,
      window: item.window,
      confidence: item.confidence,
      timingRelevance: item.timingRelevance,
      timingGranularity: item.timingGranularity,
      precisionReason: item.precisionReason,
      timingConflictMode: item.timingConflictMode,
      timingConflictNarrative: item.timingConflictNarrative,
      readinessScore: item.readinessScore,
      triggerScore: item.triggerScore,
      convergenceScore: item.convergenceScore,
      whyNow: item.whyNow,
      entryConditions: [...item.entryConditions],
      abortConditions: [...item.abortConditions],
      evidenceIds: [...item.evidenceIds],
      provenance: { ...item.provenance },
    })),
    manifestations: core.canonical.manifestations.map((item) => ({
      domain: item.domain,
      baselineThesis: item.baselineThesis,
      activationThesis: item.activationThesis,
      manifestation: item.manifestation,
      likelyExpressions: [...item.likelyExpressions],
      riskExpressions: [...item.riskExpressions],
      timingWindow: item.timingWindow,
      activationSources: item.activationSources.map((source) => ({
        source: source.source,
        active: source.active,
        intensity: source.intensity,
        label: source.label,
        evidenceIds: [...source.evidenceIds],
      })),
      evidenceIds: [...item.evidenceIds],
      provenance: { ...item.provenance },
    })),
  }
}

export function adaptCoreToCounselor(
  core: DestinyCoreResult,
  locale: 'ko' | 'en' = 'ko'
): CounselorCoreAdapterResult {
  return {
    coreHash: core.coreHash,
    focusDomain: core.canonical.focusDomain,
    actionFocusDomain: core.canonical.actionFocusDomain,
    arbitrationBrief: buildArbitrationBrief(core, locale),
    latentTopAxes: buildLatentTopAxes(core, locale),
    projections: buildProjectionSet(core, locale),
    gradeLabel: core.canonical.gradeLabel,
    phase: core.canonical.phase,
    phaseLabel: core.canonical.phaseLabel,
    answerThesis: core.canonical.thesis,
    riskControl: core.canonical.riskControl,
    primaryAction: core.canonical.primaryAction,
    primaryCaution: core.canonical.primaryCaution,
    timingHint: getTimingHint(core),
    topClaimId: core.canonical.topClaimId,
    claimIds: [...core.canonical.claimIds],
    claimProvenanceById: Object.fromEntries(
      Object.entries(core.canonical.claimProvenanceById || {}).map(([id, provenance]) => [
        id,
        { ...provenance },
      ])
    ),
    topSignalIds: [...core.canonical.topSignalIds],
    topScenarioIds: core.canonical.topScenarios.map((scenario) => scenario.id),
    topDecisionId: core.canonical.topDecision?.id || null,
    topDecisionAction: getTopDecisionAction(core),
    topDecisionLabel: getTopDecisionLabel(core, locale),
    judgmentPolicy: {
      mode: core.canonical.judgmentPolicy.mode,
      allowedActions: [...core.canonical.judgmentPolicy.allowedActions],
      allowedActionLabels: getAllowedActionLabels(
        core.canonical.judgmentPolicy.allowedActions,
        locale
      ),
      blockedActions: [...core.canonical.judgmentPolicy.blockedActions],
      blockedActionLabels: getBlockedActionLabels(
        core.canonical.judgmentPolicy.blockedActions,
        locale
      ),
      hardStops: [...core.canonical.judgmentPolicy.hardStops],
      hardStopLabels: formatPolicyCheckLabels(core.canonical.judgmentPolicy.hardStops),
      softChecks: [...core.canonical.judgmentPolicy.softChecks],
      softCheckLabels: formatPolicyCheckLabels(core.canonical.judgmentPolicy.softChecks),
      rationale: core.canonical.judgmentPolicy.rationale,
    },
    domainVerdicts: core.canonical.domainVerdicts.map((item) => ({
      domain: item.domain,
      mode: item.mode,
      confidence: item.confidence,
      leadPatternId: item.leadPatternId,
      leadPatternFamily: item.leadPatternFamily,
      leadScenarioId: item.leadScenarioId,
      allowedActions: [...item.allowedActions],
      allowedActionLabels: getAllowedActionLabels(item.allowedActions, locale),
      blockedActions: [...item.blockedActions],
      blockedActionLabels: getBlockedActionLabels(item.blockedActions, locale),
      rationale: item.rationale,
      evidenceIds: [...item.evidenceIds],
      provenance: { ...item.provenance },
    })),
    coherenceAudit: {
      verificationBias: core.canonical.coherenceAudit.verificationBias,
      gatedDecision: core.canonical.coherenceAudit.gatedDecision,
      domainConflictCount: core.canonical.coherenceAudit.domainConflictCount,
      contradictionFlags: [...core.canonical.coherenceAudit.contradictionFlags],
      notes: [...core.canonical.coherenceAudit.notes],
    },
    advisories: core.canonical.advisories.map((item) => ({
      domain: item.domain,
      thesis: item.thesis,
      action: item.action,
      caution: item.caution,
      timingHint: item.timingHint,
      strategyLine: item.strategyLine,
      leadSignalIds: [...item.leadSignalIds],
      leadPatternIds: [...item.leadPatternIds],
      leadScenarioIds: [...item.leadScenarioIds],
      provenance: { ...item.provenance },
    })),
    domainTimingWindows: core.canonical.domainTimingWindows.map((item) => ({
      domain: item.domain,
      window: item.window,
      confidence: item.confidence,
      timingRelevance: item.timingRelevance,
      timingGranularity: item.timingGranularity,
      precisionReason: item.precisionReason,
      timingConflictMode: item.timingConflictMode,
      timingConflictNarrative: item.timingConflictNarrative,
      readinessScore: item.readinessScore,
      triggerScore: item.triggerScore,
      convergenceScore: item.convergenceScore,
      whyNow: item.whyNow,
      entryConditions: [...item.entryConditions],
      abortConditions: [...item.abortConditions],
      evidenceIds: [...item.evidenceIds],
      provenance: { ...item.provenance },
    })),
    manifestations: core.canonical.manifestations.map((item) => ({
      domain: item.domain,
      baselineThesis: item.baselineThesis,
      activationThesis: item.activationThesis,
      manifestation: item.manifestation,
      likelyExpressions: [...item.likelyExpressions],
      riskExpressions: [...item.riskExpressions],
      timingWindow: item.timingWindow,
      activationSources: item.activationSources.map((source) => ({
        source: source.source,
        active: source.active,
        intensity: source.intensity,
        label: source.label,
        evidenceIds: [...source.evidenceIds],
      })),
      evidenceIds: [...item.evidenceIds],
      provenance: { ...item.provenance },
    })),
  }
}

export function adaptCoreToReport(
  core: DestinyCoreResult,
  locale: 'ko' | 'en' = 'ko'
): ReportCoreAdapterResult {
  return {
    coreHash: core.coreHash,
    focusDomain: core.canonical.focusDomain,
    actionFocusDomain: core.canonical.actionFocusDomain,
    arbitrationBrief: buildArbitrationBrief(core, locale),
    latentTopAxes: buildLatentTopAxes(core, locale),
    projections: buildProjectionSet(core, locale),
    gradeLabel: core.canonical.gradeLabel,
    gradeReason: core.canonical.gradeReason,
    phase: core.canonical.phase,
    phaseLabel: core.canonical.phaseLabel,
    thesis: core.canonical.thesis,
    riskControl: core.canonical.riskControl,
    primaryAction: core.canonical.primaryAction,
    primaryCaution: core.canonical.primaryCaution,
    confidence: core.canonical.confidence,
    crossAgreement: core.canonical.crossAgreement,
    claimIds: [...core.canonical.claimIds],
    claimProvenanceById: Object.fromEntries(
      Object.entries(core.canonical.claimProvenanceById || {}).map(([id, provenance]) => [
        id,
        { ...provenance },
      ])
    ),
    evidenceRefs: { ...core.canonical.evidenceRefs },
    topSignalIds: [...core.canonical.topSignalIds],
    topPatternIds: core.canonical.topPatterns.map((pattern) => pattern.id),
    topScenarioIds: core.canonical.topScenarios.map((scenario) => scenario.id),
    topDecisionId: core.canonical.topDecision?.id || null,
    topDecisionAction: getTopDecisionAction(core),
    topDecisionLabel: getTopDecisionLabel(core, locale),
    judgmentPolicy: {
      mode: core.canonical.judgmentPolicy.mode,
      allowedActions: [...core.canonical.judgmentPolicy.allowedActions],
      allowedActionLabels: getAllowedActionLabels(
        core.canonical.judgmentPolicy.allowedActions,
        locale
      ),
      blockedActions: [...core.canonical.judgmentPolicy.blockedActions],
      blockedActionLabels: getBlockedActionLabels(
        core.canonical.judgmentPolicy.blockedActions,
        locale
      ),
      hardStops: [...core.canonical.judgmentPolicy.hardStops],
      hardStopLabels: formatPolicyCheckLabels(core.canonical.judgmentPolicy.hardStops),
      softChecks: [...core.canonical.judgmentPolicy.softChecks],
      softCheckLabels: formatPolicyCheckLabels(core.canonical.judgmentPolicy.softChecks),
      rationale: core.canonical.judgmentPolicy.rationale,
    },
    domainVerdicts: core.canonical.domainVerdicts.map((item) => ({
      domain: item.domain,
      mode: item.mode,
      confidence: item.confidence,
      leadPatternId: item.leadPatternId,
      leadPatternFamily: item.leadPatternFamily,
      leadScenarioId: item.leadScenarioId,
      allowedActions: [...item.allowedActions],
      allowedActionLabels: getAllowedActionLabels(item.allowedActions, locale),
      blockedActions: [...item.blockedActions],
      blockedActionLabels: getBlockedActionLabels(item.blockedActions, locale),
      rationale: item.rationale,
      evidenceIds: [...item.evidenceIds],
      provenance: { ...item.provenance },
    })),
    coherenceAudit: {
      verificationBias: core.canonical.coherenceAudit.verificationBias,
      gatedDecision: core.canonical.coherenceAudit.gatedDecision,
      domainConflictCount: core.canonical.coherenceAudit.domainConflictCount,
      contradictionFlags: [...core.canonical.coherenceAudit.contradictionFlags],
      notes: [...core.canonical.coherenceAudit.notes],
    },
    advisories: core.canonical.advisories.map((item) => ({
      domain: item.domain,
      phase: item.phase,
      thesis: item.thesis,
      action: item.action,
      caution: item.caution,
      timingHint: item.timingHint,
      strategyLine: item.strategyLine,
      leadSignalIds: [...item.leadSignalIds],
      leadPatternIds: [...item.leadPatternIds],
      leadScenarioIds: [...item.leadScenarioIds],
      evidenceIds: [...item.evidenceIds],
      provenance: { ...item.provenance },
    })),
    domainTimingWindows: core.canonical.domainTimingWindows.map((item) => ({
      domain: item.domain,
      window: item.window,
      confidence: item.confidence,
      timingRelevance: item.timingRelevance,
      timingGranularity: item.timingGranularity,
      precisionReason: item.precisionReason,
      timingConflictMode: item.timingConflictMode,
      timingConflictNarrative: item.timingConflictNarrative,
      readinessScore: item.readinessScore,
      triggerScore: item.triggerScore,
      convergenceScore: item.convergenceScore,
      whyNow: item.whyNow,
      entryConditions: [...item.entryConditions],
      abortConditions: [...item.abortConditions],
      evidenceIds: [...item.evidenceIds],
      provenance: { ...item.provenance },
    })),
    manifestations: core.canonical.manifestations.map((item) => ({
      domain: item.domain,
      baselineThesis: item.baselineThesis,
      activationThesis: item.activationThesis,
      manifestation: item.manifestation,
      likelyExpressions: [...item.likelyExpressions],
      riskExpressions: [...item.riskExpressions],
      timingWindow: item.timingWindow,
      activationSources: item.activationSources.map((source) => ({
        source: source.source,
        active: source.active,
        intensity: source.intensity,
        label: source.label,
        evidenceIds: [...source.evidenceIds],
      })),
      evidenceIds: [...item.evidenceIds],
      provenance: { ...item.provenance },
    })),
  }
}
