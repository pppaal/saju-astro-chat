import type { DestinyCoreResult } from './runDestinyCore'
import { formatPolicyCheckLabels } from './actionCopy'
import type {
  AdapterArbitrationBrief,
  AdapterLatentAxis,
  AdapterProjectionSet,
  AdapterProvenance,
  AdapterTimingMatrixRow,
} from './adaptersTypes'
import {
  buildArbitrationBrief,
  buildLatentTopAxes,
  buildProjectionSet,
  buildTimingMatrix,
  getAllowedActionLabels,
  getBlockedActionLabels,
  localizeDomain,
  rankRiskAxis,
} from './adaptersPresentation'

export function getTimingHint(core: DestinyCoreResult): string {
  const scenarioWindow = core.canonical.topScenarios[0]?.window
  if (scenarioWindow) return scenarioWindow
  const timelineWindow = core.canonical.timelineHits[0]?.window
  return timelineWindow || 'now'
}

export function cloneClaimProvenanceById(
  core: DestinyCoreResult
): Record<string, AdapterProvenance> {
  return Object.fromEntries(
    Object.entries(core.canonical.claimProvenanceById || {}).map(([id, provenance]) => [
      id,
      { ...provenance },
    ])
  )
}

export function buildSharedSurface(
  core: DestinyCoreResult,
  locale: 'ko' | 'en'
): {
  riskAxisDomain: ReturnType<typeof rankRiskAxis>
  riskAxisLabel: string
  timingMatrix: AdapterTimingMatrixRow[]
  crossAgreementMatrix: DestinyCoreResult['canonical']['crossAgreementMatrix']
  arbitrationBrief: AdapterArbitrationBrief
  latentTopAxes: AdapterLatentAxis[]
  projections: AdapterProjectionSet
} {
  const riskAxisDomain = rankRiskAxis(core)
  return {
    riskAxisDomain,
    riskAxisLabel: localizeDomain(riskAxisDomain, locale),
    timingMatrix: buildTimingMatrix(core, locale),
    crossAgreementMatrix: [...(core.canonical.crossAgreementMatrix || [])],
    arbitrationBrief: buildArbitrationBrief(core, locale),
    latentTopAxes: buildLatentTopAxes(core, locale),
    projections: buildProjectionSet(core, locale),
  }
}

export function buildJudgmentPolicy(core: DestinyCoreResult, locale: 'ko' | 'en') {
  return {
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
  }
}

export function buildDomainVerdicts(core: DestinyCoreResult, locale: 'ko' | 'en') {
  return core.canonical.domainVerdicts.map((item) => ({
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
  }))
}

export function buildCoherenceAudit(core: DestinyCoreResult) {
  return {
    verificationBias: core.canonical.coherenceAudit.verificationBias,
    gatedDecision: core.canonical.coherenceAudit.gatedDecision,
    domainConflictCount: core.canonical.coherenceAudit.domainConflictCount,
    contradictionFlags: [...core.canonical.coherenceAudit.contradictionFlags],
    notes: [...core.canonical.coherenceAudit.notes],
  }
}

export function buildDomainTimingWindows(core: DestinyCoreResult) {
  return core.canonical.domainTimingWindows.map((item) => ({
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
  }))
}

export function buildManifestations(core: DestinyCoreResult) {
  return core.canonical.manifestations.map((item) => ({
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
  }))
}
