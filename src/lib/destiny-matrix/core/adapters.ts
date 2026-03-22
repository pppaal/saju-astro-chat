import type { DestinyCoreResult } from './runDestinyCore'
import type { SignalDomain } from './signalSynthesizer'
import { formatDecisionActionLabels, formatPolicyCheckLabels } from './actionCopy'

type AdapterProvenance = {
  sourceFields: string[]
  sourceSignalIds: string[]
  sourceRuleIds: string[]
  sourceSetIds: string[]
}

export interface CalendarCoreAdapterResult {
  coreHash: string
  gradeLabel: string
  gradeReason: string
  phase: string
  phaseLabel: string
  focusDomain: SignalDomain
  confidence: number
  crossAgreement: number | null
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
  return core.canonical.domainVerdicts.find(
    (item) => item.domain === core.canonical.focusDomain
  ) || null
}

function getTopDecisionAction(core: DestinyCoreResult): string | null {
  const topAction = core.canonical.topDecision?.action || null
  const topDomain = core.canonical.topDecision?.domain || null
  if (topAction && topDomain === core.canonical.focusDomain) return topAction
  const focusVerdict = getFocusDomainVerdict(core)
  return focusVerdict?.allowedActions?.[0] || topAction
}

function getTopDecisionLabel(core: DestinyCoreResult, locale: 'ko' | 'en'): string | null {
  const topLabel = core.canonical.topDecision?.label || null
  const topDomain = core.canonical.topDecision?.domain || null
  if (topLabel && topDomain === core.canonical.focusDomain) return topLabel

  const focusVerdict = getFocusDomainVerdict(core)
  const action = focusVerdict?.allowedActions?.[0]
  if (!action) return topLabel
  const actionLabel = formatDecisionActionLabels([action], locale, false)[0]
  if (!actionLabel) return topLabel
  return `${localizeDomain(core.canonical.focusDomain, locale)}: ${actionLabel}`
}

function getAllowedActionLabels(actions: string[], locale: 'ko' | 'en'): string[] {
  return formatDecisionActionLabels(actions, locale, false)
}

function getBlockedActionLabels(actions: string[], locale: 'ko' | 'en'): string[] {
  return formatDecisionActionLabels(actions, locale, true)
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
      allowedActionLabels: getAllowedActionLabels(core.canonical.judgmentPolicy.allowedActions, locale),
      blockedActions: [...core.canonical.judgmentPolicy.blockedActions],
      blockedActionLabels: getBlockedActionLabels(core.canonical.judgmentPolicy.blockedActions, locale),
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
      allowedActionLabels: getAllowedActionLabels(core.canonical.judgmentPolicy.allowedActions, locale),
      blockedActions: [...core.canonical.judgmentPolicy.blockedActions],
      blockedActionLabels: getBlockedActionLabels(core.canonical.judgmentPolicy.blockedActions, locale),
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
      allowedActionLabels: getAllowedActionLabels(core.canonical.judgmentPolicy.allowedActions, locale),
      blockedActions: [...core.canonical.judgmentPolicy.blockedActions],
      blockedActionLabels: getBlockedActionLabels(core.canonical.judgmentPolicy.blockedActions, locale),
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
