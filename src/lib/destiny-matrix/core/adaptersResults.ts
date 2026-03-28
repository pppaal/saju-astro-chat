import type { DestinyCoreResult } from './runDestinyCore'
import type {
  CalendarCoreAdapterResult,
  CounselorCoreAdapterResult,
  ReportCoreAdapterResult,
} from './adaptersTypes'
import { getTopDecisionAction, getTopDecisionLabel } from './adaptersPresentation'
import {
  buildCoherenceAudit,
  buildDomainTimingWindows,
  buildDomainVerdicts,
  buildJudgmentPolicy,
  buildManifestations,
  buildSharedSurface,
  cloneClaimProvenanceById,
  getTimingHint,
} from './adaptersPayload'

export function adaptCoreToCalendar(
  core: DestinyCoreResult,
  locale: 'ko' | 'en' = 'ko'
): CalendarCoreAdapterResult {
  const sharedSurface = buildSharedSurface(core, locale)
  return {
    coreHash: core.coreHash,
    gradeLabel: core.canonical.gradeLabel,
    gradeReason: core.canonical.gradeReason,
    phase: core.canonical.phase,
    phaseLabel: core.canonical.phaseLabel,
    focusDomain: core.canonical.focusDomain,
    actionFocusDomain: core.canonical.actionFocusDomain,
    ...sharedSurface,
    confidence: core.canonical.confidence,
    crossAgreement: core.canonical.crossAgreement,
    attackPercent: core.canonical.attackPercent,
    defensePercent: core.canonical.defensePercent,
    thesis: core.canonical.thesis,
    riskControl: core.canonical.riskControl,
    primaryAction: core.canonical.primaryAction,
    primaryCaution: core.canonical.primaryCaution,
    claimIds: [...core.canonical.claimIds],
    claimProvenanceById: cloneClaimProvenanceById(core),
    cautionIds: [...core.canonical.cautions],
    topSignalIds: [...core.canonical.topSignalIds],
    topPatternIds: core.canonical.topPatterns.map((pattern) => pattern.id),
    topScenarioIds: core.canonical.topScenarios.map((scenario) => scenario.id),
    topDecisionId: core.canonical.topDecision?.id || null,
    topDecisionAction: getTopDecisionAction(core),
    topDecisionLabel: getTopDecisionLabel(core, locale),
    judgmentPolicy: buildJudgmentPolicy(core, locale),
    domainVerdicts: buildDomainVerdicts(core, locale),
    coherenceAudit: buildCoherenceAudit(core),
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
    domainTimingWindows: buildDomainTimingWindows(core),
    manifestations: buildManifestations(core),
  }
}

export function adaptCoreToCounselor(
  core: DestinyCoreResult,
  locale: 'ko' | 'en' = 'ko'
): CounselorCoreAdapterResult {
  const sharedSurface = buildSharedSurface(core, locale)
  return {
    coreHash: core.coreHash,
    focusDomain: core.canonical.focusDomain,
    actionFocusDomain: core.canonical.actionFocusDomain,
    ...sharedSurface,
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
    claimProvenanceById: cloneClaimProvenanceById(core),
    topSignalIds: [...core.canonical.topSignalIds],
    topScenarioIds: core.canonical.topScenarios.map((scenario) => scenario.id),
    topDecisionId: core.canonical.topDecision?.id || null,
    topDecisionAction: getTopDecisionAction(core),
    topDecisionLabel: getTopDecisionLabel(core, locale),
    judgmentPolicy: buildJudgmentPolicy(core, locale),
    domainVerdicts: buildDomainVerdicts(core, locale),
    coherenceAudit: buildCoherenceAudit(core),
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
    domainTimingWindows: buildDomainTimingWindows(core),
    manifestations: buildManifestations(core),
  }
}

export function adaptCoreToReport(
  core: DestinyCoreResult,
  locale: 'ko' | 'en' = 'ko'
): ReportCoreAdapterResult {
  const sharedSurface = buildSharedSurface(core, locale)
  return {
    coreHash: core.coreHash,
    focusDomain: core.canonical.focusDomain,
    actionFocusDomain: core.canonical.actionFocusDomain,
    ...sharedSurface,
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
    claimProvenanceById: cloneClaimProvenanceById(core),
    evidenceRefs: { ...core.canonical.evidenceRefs },
    topSignalIds: [...core.canonical.topSignalIds],
    topPatternIds: core.canonical.topPatterns.map((pattern) => pattern.id),
    topScenarioIds: core.canonical.topScenarios.map((scenario) => scenario.id),
    topDecisionId: core.canonical.topDecision?.id || null,
    topDecisionAction: getTopDecisionAction(core),
    topDecisionLabel: getTopDecisionLabel(core, locale),
    judgmentPolicy: buildJudgmentPolicy(core, locale),
    domainVerdicts: buildDomainVerdicts(core, locale),
    coherenceAudit: buildCoherenceAudit(core),
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
    domainTimingWindows: buildDomainTimingWindows(core),
    manifestations: buildManifestations(core),
  }
}
