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
}

type AdapterLatentAxis = {
  id: string
  label: string
  score: number
  group: string
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

function localizeLatentAxis(axisId: string, locale: 'ko' | 'en'): string {
  const ko: Record<string, string> = {
    readiness: '구조 준비도',
    trigger: '촉발 강도',
    convergence: '교차 수렴도',
    timing_conflict: '타이밍 충돌',
    focus_strength: '중심축 강도',
    action_focus_strength: '행동축 강도',
    decision_certainty: '결정 선명도',
    risk_control_intensity: '리스크 통제 강도',
    career: '커리어 압력',
    relationship: '관계 압력',
    wealth: '재정 압력',
    health: '건강 압력',
    move: '이동 압력',
    structure_trigger_mismatch: '구조-촉발 불일치',
    opportunity_sustainability_gap: '기회-지속성 간극',
    focus_ambiguity: '초점 경쟁',
  }
  const en: Record<string, string> = {
    readiness: 'structural readiness',
    trigger: 'trigger pressure',
    convergence: 'cross convergence',
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
    structure_trigger_mismatch: 'structure-trigger mismatch',
    opportunity_sustainability_gap: 'opportunity-sustainability gap',
    focus_ambiguity: 'focus competition',
  }
  return (locale === 'ko' ? ko : en)[axisId] || axisId.replace(/_/g, ' ')
}

function buildArbitrationBrief(core: DestinyCoreResult): AdapterArbitrationBrief {
  return {
    focusWinnerDomain: core.canonical.arbitrationLedger.focusWinner.domain,
    focusWinnerReason: core.canonical.arbitrationLedger.focusWinner.reason,
    focusRunnerUpDomain: core.canonical.arbitrationLedger.focusRunnerUp?.domain || null,
    actionWinnerDomain:
      core.canonical.arbitrationLedger.actionWinner?.domain || core.canonical.actionFocusDomain,
    actionWinnerReason:
      core.canonical.arbitrationLedger.actionWinner?.reason ||
      `${core.canonical.actionFocusDomain} action lead came from fallback action selection`,
    actionRunnerUpDomain: core.canonical.arbitrationLedger.actionRunnerUp?.domain || null,
    conflictReasons: [...(core.canonical.arbitrationLedger.conflictReasons || [])],
  }
}

function buildLatentTopAxes(core: DestinyCoreResult, locale: 'ko' | 'en'): AdapterLatentAxis[] {
  const axisGroupEntries = Object.entries(core.latentState?.groups || {}) as Array<
    [string, string[]]
  >
  return (core.latentState?.topAxes || []).slice(0, 5).map((axis) => ({
    id: axis.id,
    label: localizeLatentAxis(axis.id, locale),
    score: axis.value,
    group: axisGroupEntries.find(([, ids]) => ids.includes(axis.id))?.[0] || 'unknown',
  }))
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
    arbitrationBrief: buildArbitrationBrief(core),
    latentTopAxes: buildLatentTopAxes(core, locale),
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
    arbitrationBrief: buildArbitrationBrief(core),
    latentTopAxes: buildLatentTopAxes(core, locale),
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
    arbitrationBrief: buildArbitrationBrief(core),
    latentTopAxes: buildLatentTopAxes(core, locale),
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
