import type { DestinyCoreResult } from './runDestinyCore'
import type { AdapterPersonModel } from './adaptersTypes'
import {
  buildLatentTopAxes,
  getTopDecisionLabel,
  localizeDomain,
  rankRiskAxis,
} from './adaptersPresentation'
import {
  buildAppliedProfile,
  buildBirthTimeHypotheses,
  buildCareerProfile,
  buildCrossConflictMap,
  buildDomainPortraits,
  buildDomainStateGraph,
  buildEvidenceLedger,
  buildEventOutlook,
  buildFormationProfile,
  buildFutureBranches,
  buildPastEventReconstruction,
  buildPersonDimensions,
  buildPersonLayers,
  buildPersonStates,
  buildRelationshipProfile,
  buildTimeProfile,
  buildUncertaintyEnvelope,
} from './adaptersPersonModelSupport'

export function buildPersonModel(core: DestinyCoreResult, locale: 'ko' | 'en'): AdapterPersonModel {
  const focusLabel = localizeDomain(core.canonical.focusDomain, locale)
  const actionLabel = localizeDomain(core.canonical.actionFocusDomain, locale)
  const riskDomain = rankRiskAxis(core)
  const riskLabel = localizeDomain(riskDomain, locale)
  const topDecisionLabel = getTopDecisionLabel(core, locale) || core.canonical.primaryAction
  const latentAxes = buildLatentTopAxes(core, locale)
  const domainStateGraph = buildDomainStateGraph(core, locale)
  const relationshipProfile = buildRelationshipProfile(core, locale)
  const careerProfile = buildCareerProfile(core, locale)
  const appliedProfile = buildAppliedProfile(core, locale, domainStateGraph)
  const eventOutlook = buildEventOutlook(
    core,
    locale,
    domainStateGraph,
    relationshipProfile,
    careerProfile
  )
  const birthTimeHypotheses = buildBirthTimeHypotheses(core, locale, domainStateGraph)
  const crossConflictMap = buildCrossConflictMap(core, locale, domainStateGraph)
  const pastEventReconstruction = buildPastEventReconstruction(core, locale, domainStateGraph)
  const uncertaintyEnvelope = buildUncertaintyEnvelope(core, locale, domainStateGraph)

  return {
    subject: locale === 'ko' ? '다차원 인물 모델' : 'Multidimensional Person Model',
    overview:
      locale === 'ko'
        ? `${focusLabel}이 기본 구조이고 ${actionLabel}이 실제 행동축이며, 현재 가장 예민한 리스크 축은 ${riskLabel}입니다. 기회가 열릴 때는 ${topDecisionLabel} 쪽이 먼저 활성화됩니다.`
        : `${focusLabel} is the baseline structure, ${actionLabel} is the live action axis, and ${riskLabel} is the most sensitive risk axis. When opportunity opens, ${topDecisionLabel} activates first.`,
    structuralCore: {
      focusDomain: core.canonical.focusDomain,
      actionFocusDomain: core.canonical.actionFocusDomain,
      riskAxisDomain: riskDomain,
      gradeLabel: core.canonical.gradeLabel,
      phaseLabel: core.canonical.phaseLabel,
      overview:
        locale === 'ko'
          ? `${focusLabel}이 인물의 뼈대이고 ${actionLabel}이 현재 전면 행동축입니다.`
          : `${focusLabel} is the structural backbone and ${actionLabel} is the front action axis.`,
      latentAxes: latentAxes.slice(0, 6).map((axis) => axis.label),
    },
    formationProfile: buildFormationProfile(core, locale),
    timeProfile: buildTimeProfile(core, locale),
    layers: buildPersonLayers(core, locale),
    dimensions: buildPersonDimensions(core, locale),
    domainStateGraph,
    domainPortraits: buildDomainPortraits(core, locale),
    states: buildPersonStates(core, locale),
    appliedProfile,
    relationshipProfile,
    careerProfile,
    futureBranches: buildFutureBranches(core, locale),
    eventOutlook,
    birthTimeHypotheses,
    crossConflictMap,
    pastEventReconstruction,
    uncertaintyEnvelope,
    evidenceLedger: buildEvidenceLedger(core),
  }
}
