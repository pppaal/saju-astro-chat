import type { MatrixCalculationInput, MatrixSummary } from '../types'
import type { DestinyCoreQuality } from '@/lib/destiny-matrix/core/runDestinyCore'
import type { AIPremiumReport } from './reportTypes'
import type { ReportCoreViewModel } from './reportCoreHelpers'
import type { ReportSectionRendererDeps } from './reportSectionRenderers'
import type { ReportLifeSectionDeps } from './reportLifeSections'
import {
  attachTrustNarrativeToSections as attachTrustNarrativeToSectionsExternal,
  buildReportTrustNarratives as buildReportTrustNarrativesExternal,
  renderActionPlanSection as renderActionPlanSectionExternal,
  renderCareerPathSection as renderCareerPathSectionExternal,
  renderConclusionSection as renderConclusionSectionExternal,
  renderHealthGuidanceSection as renderHealthGuidanceSectionExternal,
  renderIntroductionSection as renderIntroductionSectionExternal,
  renderLifeMissionSection as renderLifeMissionSectionExternal,
  renderPersonalityDeepSection as renderPersonalityDeepSectionExternal,
  renderRelationshipDynamicsSection as renderRelationshipDynamicsSectionExternal,
  renderTimingAdviceSection as renderTimingAdviceSectionExternal,
  renderWealthPotentialSection as renderWealthPotentialSectionExternal,
} from './reportSectionRenderers'
import {
  renderComprehensiveFutureOutlookSection as renderComprehensiveFutureOutlookSectionExternal,
  renderComprehensiveLifeStagesSection as renderComprehensiveLifeStagesSectionExternal,
  renderComprehensiveSpouseProfileSection as renderComprehensiveSpouseProfileSectionExternal,
  renderComprehensiveTurningPointsSection as renderComprehensiveTurningPointsSectionExternal,
} from './reportLifeSections'
import {
  getElementLabel,
  getReportDomainLabel,
  getWesternElementLabel,
  localizeGeokgukLabel,
  localizeReportNarrativeText,
  normalizeNarrativeCoreText,
  sanitizeEvidenceToken,
} from './reportTextHelpers'
import { sanitizeUserFacingNarrative } from './reportNarrativeSanitizer'

interface AiReportSectionSupportDeps {
  reportSectionRendererDeps: ReportSectionRendererDeps
  reportLifeSectionDeps: ReportLifeSectionDeps
  buildProjectionMoveSentence: (
    moves: string[] | undefined,
    lang: 'ko' | 'en',
    fallback: string
  ) => string
  collectProjectionDriverLabels: (drivers: string[] | undefined, lang: 'ko' | 'en') => string[]
}

export function isMeaningfulEvidenceToken(value: string | undefined | null): boolean {
  const token = String(value || '').trim()
  if (!token) return false
  const normalized = token.toLowerCase()
  if (['?', '-', 'unknown', '??', 'none', 'n/a'].includes(normalized)) return false
  if (/^[?\s.-]+$/.test(token)) return false
  return true
}

export function buildEvidenceLine(input: MatrixCalculationInput, lang: 'ko' | 'en'): string {
  const dayMaster = sanitizeEvidenceToken(getElementLabel(input.dayMasterElement, lang), lang)
  const yongsin = sanitizeEvidenceToken(getElementLabel(input.yongsin, lang), lang)
  const western = sanitizeEvidenceToken(
    getWesternElementLabel(input.dominantWesternElement, lang),
    lang
  )
  const geokguk = sanitizeEvidenceToken(localizeGeokgukLabel(input.geokguk, lang), lang)
  if (lang === 'ko') {
    const parts = [
      dayMaster ? `일간 ${dayMaster}` : '',
      geokguk ? `격국 ${geokguk}` : '',
      yongsin ? `용신 ${yongsin}` : '',
      western ? `서양 원소 ${western}` : '',
    ].filter(Boolean)
    return parts.length > 0 ? `${parts.join(', ')} 기준으로 같은 방향의 근거가 반복됩니다.` : ''
  }
  const parts = [
    dayMaster ? `day master ${dayMaster}` : '',
    geokguk ? `frame ${geokguk}` : '',
    yongsin ? `useful element ${yongsin}` : '',
    western ? `dominant western element ${western}` : '',
  ].filter(Boolean)
  return parts.length > 0
    ? `This reading comes from the same directional push across ${parts.join(', ')}.`
    : ''
}

export function buildEvidenceFooter(input: MatrixCalculationInput, lang: 'ko' | 'en'): string {
  const dayMaster = sanitizeEvidenceToken(getElementLabel(input.dayMasterElement, lang), lang)
  const yongsin = sanitizeEvidenceToken(getElementLabel(input.yongsin, lang), lang)
  const western = sanitizeEvidenceToken(
    getWesternElementLabel(input.dominantWesternElement, lang),
    lang
  )
  const geokguk = sanitizeEvidenceToken(localizeGeokgukLabel(input.geokguk, lang), lang)

  if (lang === 'ko') {
    const parts = [
      dayMaster ? `일간 ${dayMaster}` : '',
      geokguk ? `격국 ${geokguk}` : '',
      yongsin ? `용신 ${yongsin}` : '',
      western ? `서양 원소 ${western}` : '',
    ].filter(Boolean)
    return parts.length > 0 ? `핵심 근거는 ${parts.join(', ')}입니다.` : ''
  }

  const parts = [
    dayMaster ? `day master ${dayMaster}` : '',
    geokguk ? `frame ${geokguk}` : '',
    yongsin ? `useful element ${yongsin}` : '',
    western ? `dominant western element ${western}` : '',
  ].filter(Boolean)
  return parts.length > 0
    ? normalizeNarrativeCoreText(`Key grounding comes from ${parts.join(', ')}.`, lang)
    : ''
}

export function appendEvidenceFooter(
  body: string,
  input: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const evidence = buildEvidenceFooter(input, lang)
  if (!evidence) return body
  return `${body} ${evidence}`.trim()
}

export function sanitizeNarrativeReason(
  value: string | null | undefined,
  lang: 'ko' | 'en',
  fallback = ''
): string {
  const text = String(value || '').trim()
  if (!text) return fallback
  return normalizeNarrativeCoreText(text, lang) || fallback
}

export function buildReportTrustNarratives(
  reportCore: ReportCoreViewModel,
  coreQuality: DestinyCoreQuality | undefined,
  lang: 'ko' | 'en',
  deps: AiReportSectionSupportDeps
): { trust: string; provenance: string } {
  return buildReportTrustNarrativesExternal(
    reportCore,
    coreQuality,
    lang,
    deps.reportSectionRendererDeps
  )
}

export function attachTrustNarrativeToSections<T extends Record<string, unknown>>(
  mode: 'comprehensive' | 'timing' | 'themed',
  sections: T,
  trust: string,
  provenance: string
): T {
  return attachTrustNarrativeToSectionsExternal(mode, sections, trust, provenance)
}

export function renderIntroductionSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: AiReportSectionSupportDeps
): string {
  const base = renderIntroductionSectionExternal(
    reportCore,
    matrixInput,
    lang,
    deps.reportSectionRendererDeps
  )
  const focusLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const actionLabel = getReportDomainLabel(
    reportCore.actionFocusDomain || reportCore.focusDomain,
    lang
  )
  const focusRunnerUpLabel = reportCore.arbitrationBrief?.focusRunnerUpDomain
    ? getReportDomainLabel(reportCore.arbitrationBrief.focusRunnerUpDomain, lang)
    : ''
  const arbitrationLine =
    lang === 'ko'
      ? reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
        ? `배경 축은 ${focusLabel}이지만, 지금 먼저 손을 대야 할 곳은 ${actionLabel}입니다.`
        : focusRunnerUpLabel
          ? `${focusLabel}이 ${focusRunnerUpLabel}보다 조금 더 앞에 서면서 이번 흐름의 중심을 잡습니다.`
          : ''
      : reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
        ? `${actionLabel} is the axis that answers the question most directly, and it is carrying the actionable pressure in this phase.`
        : focusRunnerUpLabel
          ? `${focusLabel} stayed ahead of ${focusRunnerUpLabel} as the lead axis in this phase.`
          : ''
  const latentLine = reportCore.latentTopAxes?.length
    ? lang === 'ko'
      ? `지금 가장 강하게 켜진 층은 ${reportCore.latentTopAxes
          .slice(0, 3)
          .map((axis) => axis.label)
          .join(', ')}입니다.`
      : `The strongest active layers right now are ${reportCore.latentTopAxes
          .slice(0, 3)
          .map((axis) => axis.label)
          .join(', ')}.`
    : ''
  const riskAxisLine = reportCore.riskAxisLabel
    ? lang === 'ko'
      ? `동시에 가장 민감하게 관리해야 할 변수는 ${reportCore.riskAxisLabel}입니다.`
      : `At the same time, the most sensitive risk axis is ${reportCore.riskAxisLabel}.`
    : ''
  const timingMatrixLine = reportCore.timingMatrix?.length
    ? lang === 'ko'
      ? `분야별 시간창은 ${reportCore.timingMatrix
          .slice(0, 3)
          .map((row) => `${getReportDomainLabel(row.domain, lang)}=${row.window}`)
          .join(', ')}처럼 갈립니다.`
      : `By domain, windows split as ${reportCore.timingMatrix
          .slice(0, 3)
          .map((row) => `${getReportDomainLabel(row.domain, lang)}=${row.window}`)
          .join(', ')}.`
    : ''
  const structureProjection = reportCore.projections?.structure
  const structureDetailLine = localizeReportNarrativeText(
    structureProjection?.detailLines?.[0] || '',
    lang
  )
  const structureBackgroundLine =
    reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
      ? lang === 'ko'
        ? `${focusLabel}은 이번 해석에서 배경 구조를 설명하는 축으로 남아 있습니다.`
        : `${focusLabel} remains the background structural axis behind this reading.`
      : ''
  const structureDriversLine = structureProjection?.drivers?.length
    ? lang === 'ko'
      ? `이 흐름을 직접 밀고 있는 구조 신호는 ${structureProjection.drivers
          .slice(0, 3)
          .map((item) => localizeReportNarrativeText(item, lang))
          .join(', ')}입니다.`
      : `The direct structural drivers are ${structureProjection.drivers.slice(0, 3).join(', ')}.`
    : ''
  const structureCounterweightLine =
    reportCore.arbitrationBrief?.suppressionNarratives?.length ||
    structureProjection?.counterweights?.length
      ? lang === 'ko'
        ? `반대편에서는 ${(reportCore.arbitrationBrief?.suppressionNarratives?.length
            ? reportCore.arbitrationBrief.suppressionNarratives
            : structureProjection?.counterweights || []
          )
            .slice(0, 2)
            .map((item) => localizeReportNarrativeText(item, lang))
            .join(' 그리고 ')} 같은 제동도 함께 작동합니다.`
        : `Counterweights are still coming from ${(reportCore.arbitrationBrief
            ?.suppressionNarratives?.length
            ? reportCore.arbitrationBrief.suppressionNarratives
            : structureProjection?.counterweights || []
          )
            .slice(0, 2)
            .join(', ')}.`
      : ''
  const branchProjection = reportCore.projections?.branches
  const branchLeadLine = localizeReportNarrativeText(branchProjection?.detailLines?.[0] || '', lang)
  return [
    arbitrationLine,
    latentLine,
    structureDetailLine,
    structureBackgroundLine,
    structureDriversLine,
    structureCounterweightLine,
    branchLeadLine,
    riskAxisLine,
    timingMatrixLine,
    base,
  ]
    .filter(Boolean)
    .join(' ')
}

export function renderLifeMissionSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: AiReportSectionSupportDeps
): string {
  return renderLifeMissionSectionExternal(
    reportCore,
    matrixInput,
    lang,
    deps.reportSectionRendererDeps
  )
}

export function renderPersonalityDeepSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: AiReportSectionSupportDeps
): string {
  return renderPersonalityDeepSectionExternal(
    reportCore,
    matrixInput,
    lang,
    deps.reportSectionRendererDeps
  )
}

export function renderTimingAdviceSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  matrixSummary: MatrixSummary | undefined,
  deps: AiReportSectionSupportDeps
): string {
  const base = renderTimingAdviceSectionExternal(
    reportCore,
    matrixInput,
    lang,
    deps.reportSectionRendererDeps,
    matrixSummary
  )
  const timingProjection = reportCore.projections?.timing
  const preferredTimingRow =
    reportCore.timingMatrix?.find(
      (row) => row.domain === (reportCore.actionFocusDomain || reportCore.focusDomain)
    ) || reportCore.timingMatrix?.[0]
  const timingDetailLine = localizeReportNarrativeText(
    preferredTimingRow?.summary || timingProjection?.detailLines?.[0] || '',
    lang
  )
  const timingDriverLine = timingProjection?.drivers?.length
    ? lang === 'ko'
      ? `지금 시간 흐름을 밀고 있는 신호는 ${timingProjection.drivers
          .slice(0, 3)
          .map((item) => localizeReportNarrativeText(item, lang))
          .join(', ')}입니다.`
      : `The live timing drivers are ${timingProjection.drivers.slice(0, 3).join(', ')}.`
    : ''
  const timingCounterweightLine = timingProjection?.counterweights?.length
    ? lang === 'ko'
      ? `반대로 ${timingProjection.counterweights
          .slice(0, 2)
          .map((item) => localizeReportNarrativeText(item, lang))
          .join(', ')} 같은 제동도 함께 붙어 있어 속도를 무조건 올리긴 어렵습니다.`
      : `Counterweights still come from ${timingProjection.counterweights.slice(0, 2).join(', ')}.`
    : ''
  const timingNextLine = timingProjection?.nextMoves?.length
    ? deps.buildProjectionMoveSentence(
        timingProjection.nextMoves.slice(0, 2),
        lang,
        lang === 'ko'
          ? '지금은 조건을 다시 맞추는 쪽에서 실제 실행력이 붙습니다.'
          : 'To use this timing well, realign the live execution conditions first.'
      )
    : ''
  const timingMatrixLine = reportCore.timingMatrix?.length
    ? lang === 'ko'
      ? `분야별 시간창은 ${reportCore.timingMatrix
          .slice(0, 3)
          .map((row) => `${getReportDomainLabel(row.domain, lang)}=${row.window}`)
          .join(', ')}처럼 갈립니다.`
      : `Across domains, timing splits into ${reportCore.timingMatrix
          .slice(0, 3)
          .map((row) => `${getReportDomainLabel(row.domain, lang)}=${row.window}`)
          .join(', ')}.`
    : ''
  const branchProjection = reportCore.projections?.branches
  const branchTimingLine =
    localizeReportNarrativeText(branchProjection?.detailLines?.[0] || '', lang) ||
    (branchProjection?.summary && lang === 'ko'
      ? `분기 측면에서는 ${localizeReportNarrativeText(branchProjection.summary, lang)}`
      : localizeReportNarrativeText(branchProjection?.summary || '', lang) || '')
  const enriched = [
    timingDetailLine,
    timingDriverLine,
    timingCounterweightLine,
    timingNextLine,
    timingMatrixLine,
    branchTimingLine,
  ].filter(Boolean)
  return sanitizeUserFacingNarrative(
    [...enriched, ...(enriched.length < 4 ? [base] : [])].filter(Boolean).join(' ')
  )
}

export function renderActionPlanSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: AiReportSectionSupportDeps
): string {
  void matrixInput
  const actionDomain = reportCore.actionFocusDomain || reportCore.focusDomain
  if (lang === 'ko' && actionDomain === 'move') {
    const decision = reportCore.topDecisionLabel || reportCore.primaryAction || '경로 비교 우선'
    const riskControl = reportCore.riskControl || '큰 이동은 미루고, 작은 확인부터 진행하세요.'
    const branchLine = reportCore.projections?.branches?.nextMoves?.length
      ? deps.buildProjectionMoveSentence(
          reportCore.projections.branches.nextMoves.slice(0, 2),
          lang,
          '이동 전 확인 절차를 먼저 두고, 생활 거점 조건을 단계별로 검증하세요.'
        )
      : '이동 전 확인 절차를 먼저 두고, 생활 거점 조건을 단계별로 검증하세요.'

    return sanitizeUserFacingNarrative(
      [
        `이번 이동·변화 실행 기준은 ${decision}입니다.`,
        '지금은 계약, 통근, 생활비, 일정 같은 현실 조건을 먼저 비교해야 합니다.',
        '바로 확정하기보다 후보를 좁혀가며 작은 확인부터 반복하는 쪽이 손실을 줄입니다.',
        branchLine,
        riskControl,
      ].join(' ')
    )
  }
  const base = renderActionPlanSectionExternal(reportCore, lang, deps.reportSectionRendererDeps)
  const actionLabel = getReportDomainLabel(
    reportCore.actionFocusDomain || reportCore.focusDomain,
    lang
  )
  const topDecisionLabel = reportCore.topDecisionLabel || reportCore.primaryAction
  const openingLine =
    lang === 'ko'
      ? `지금 ${actionLabel}에서 가장 맞는 기본 자세는 ${topDecisionLabel}입니다.`
      : actionDomain === 'move'
        ? 'On the relocation axis, compare the route, the living base, and the lease terms before you commit.'
        : actionDomain === 'relationship'
          ? 'On the relationship axis, clarify pace, boundaries, and commitment conditions before you move closer.'
          : actionDomain === 'career'
            ? 'On the career axis, verify role scope, evaluation criteria, and decision authority before you accept the next step.'
            : actionDomain === 'wealth'
              ? 'On the wealth axis, review cashflow, contract terms, and downside limits before you expand or commit.'
              : actionDomain === 'health'
                ? 'On the health axis, stabilize recovery rhythm and load limits before you push output higher.'
                : `The operating rule on the ${actionLabel} axis is ${topDecisionLabel}.`
  const guardrailLine = reportCore.riskControl
  const actionProjection = reportCore.projections?.action
  const actionDriverLabels = deps.collectProjectionDriverLabels(actionProjection?.drivers, lang)
  const actionDriverLine = actionDriverLabels.length
    ? lang === 'ko'
      ? `현재 실행을 미는 축은 ${actionDriverLabels.join(', ')}입니다.`
      : actionDomain === 'move'
        ? `Right now, relocation pressure is being shaped by ${actionDriverLabels.join(', ')}.`
        : actionDomain === 'relationship'
          ? `Right now, the relationship climate is being shaped by ${actionDriverLabels.join(', ')}.`
          : actionDomain === 'career'
            ? `Right now, career execution is being shaped by ${actionDriverLabels.join(', ')}.`
            : actionDomain === 'wealth'
              ? `Right now, wealth decisions are being shaped by ${actionDriverLabels.join(', ')}.`
              : actionDomain === 'health'
                ? `Right now, recovery capacity is being shaped by ${actionDriverLabels.join(', ')}.`
                : `The current execution drivers are ${actionDriverLabels.join(', ')}.`
    : ''
  const actionCounterweightLine = actionProjection?.counterweights?.length
    ? lang === 'ko'
      ? `${actionProjection.counterweights
          .slice(0, 2)
          .map((item) => localizeReportNarrativeText(item, lang))
          .join(', ')} 같은 제동이 남아 있어 속도를 조절해야 합니다.`
      : `${actionProjection.counterweights.slice(0, 2).join(', ')} still signal that pace should stay controlled.`
    : ''
  const actionNextLine = actionProjection?.nextMoves?.length
    ? deps.buildProjectionMoveSentence(
        actionProjection.nextMoves.slice(0, 2),
        lang,
        lang === 'ko'
          ? '지금은 기준을 다시 세우고 작은 단계부터 실행하는 편이 맞습니다.'
          : actionDomain === 'career'
            ? 'Start by narrowing the role definition and placing one review checkpoint before commitment.'
            : actionDomain === 'wealth'
              ? 'Start by checking payment terms, loss limits, and one hold condition before you move money.'
              : actionDomain === 'health'
                ? 'Start by reducing load and locking one repeatable recovery block before you push harder.'
                : 'The next move should begin by resetting execution criteria in smaller steps.'
      )
    : ''
  const riskAxisLine = reportCore.riskAxisLabel
    ? lang === 'ko'
      ? `동시에 ${reportCore.riskAxisLabel} 문제를 같이 관리해야 실행 품질이 흔들리지 않습니다.`
      : `Even while acting, ${reportCore.riskAxisLabel} should be managed as the primary risk axis first.`
    : ''
  const branchProjection = reportCore.projections?.branches
  const branchActionLine = branchProjection?.nextMoves?.length
    ? deps.buildProjectionMoveSentence(
        branchProjection.nextMoves.slice(0, 2),
        lang,
        lang === 'ko'
          ? '분기별로는 실행 전 기준과 중단 조건을 먼저 정리하는 편이 안전합니다.'
          : 'Across the live branches, reset criteria and guardrails before execution.'
      )
    : ''
  const enriched = [
    openingLine,
    actionDriverLine,
    actionCounterweightLine,
    actionNextLine,
    riskAxisLine,
    branchActionLine,
    guardrailLine,
  ].filter(Boolean)
  return sanitizeUserFacingNarrative(
    [...enriched, ...(enriched.length < 5 ? [base] : [])].filter(Boolean).join(' ')
  )
}

export function renderCareerPathSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: AiReportSectionSupportDeps
): string {
  return renderCareerPathSectionExternal(
    reportCore,
    matrixInput,
    lang,
    deps.reportSectionRendererDeps
  )
}

export function renderRelationshipDynamicsSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: AiReportSectionSupportDeps
): string {
  return renderRelationshipDynamicsSectionExternal(
    reportCore,
    matrixInput,
    lang,
    deps.reportSectionRendererDeps
  )
}

export function renderWealthPotentialSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: AiReportSectionSupportDeps
): string {
  return renderWealthPotentialSectionExternal(
    reportCore,
    matrixInput,
    lang,
    deps.reportSectionRendererDeps
  )
}

export function renderConclusionSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: AiReportSectionSupportDeps
): string {
  const actionDomain = reportCore.actionFocusDomain || reportCore.focusDomain
  if (lang === 'ko' && actionDomain === 'move') {
    const branchLabel =
      reportCore.branchSet?.[0]?.label ||
      reportCore.projections?.branches?.detailLines?.[0] ||
      '경로 재확인'
    return sanitizeUserFacingNarrative(
      [
        `지금은 ${localizeReportNarrativeText(String(branchLabel), lang)} 쪽이 가장 현실적인 1안입니다.`,
        '이번 승부는 서두르지 않고 순서를 지키는 데 달려 있습니다.',
        '생활 거점을 바꾸더라도 기준을 먼저 세운 사람이 결과를 더 안정적으로 가져갑니다.',
      ].join(' ')
    )
  }
  const base = renderConclusionSectionExternal(
    reportCore,
    matrixInput,
    lang,
    deps.reportSectionRendererDeps
  )
  const riskAxisLine = reportCore.riskAxisLabel
    ? lang === 'ko'
      ? `마지막까지 가장 민감하게 관리해야 할 축은 ${reportCore.riskAxisLabel}입니다.`
      : `The axis that must be managed most carefully through the close is ${reportCore.riskAxisLabel}.`
    : ''
  const branchLine = reportCore.projections?.branches?.detailLines?.[0] || ''
  return sanitizeUserFacingNarrative([riskAxisLine, branchLine, base].filter(Boolean).join(' '))
}

export function renderHealthGuidanceSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: AiReportSectionSupportDeps
): string {
  return renderHealthGuidanceSectionExternal(
    reportCore,
    matrixInput,
    lang,
    deps.reportSectionRendererDeps
  )
}

export function renderComprehensiveSpouseProfileSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: AiReportSectionSupportDeps
): string {
  return renderComprehensiveSpouseProfileSectionExternal(
    reportCore,
    matrixInput,
    lang,
    deps.reportLifeSectionDeps
  )
}

export function renderComprehensiveLifeStagesSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: AiReportSectionSupportDeps
): string {
  return renderComprehensiveLifeStagesSectionExternal(
    reportCore,
    matrixInput,
    lang,
    undefined,
    deps.reportLifeSectionDeps
  )
}

export function renderComprehensiveTurningPointsSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: AiReportSectionSupportDeps
): string {
  return renderComprehensiveTurningPointsSectionExternal(
    reportCore,
    matrixInput,
    lang,
    deps.reportLifeSectionDeps
  )
}

export function renderComprehensiveFutureOutlookSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: AiReportSectionSupportDeps
): string {
  return renderComprehensiveFutureOutlookSectionExternal(
    reportCore,
    matrixInput,
    lang,
    deps.reportLifeSectionDeps
  )
}

export function buildExtendedComprehensiveSections(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: AiReportSectionSupportDeps
): Partial<AIPremiumReport['sections']> {
  return {
    spouseProfile: renderComprehensiveSpouseProfileSection(reportCore, matrixInput, lang, deps),
    lifeStages: renderComprehensiveLifeStagesSection(reportCore, matrixInput, lang, deps),
    turningPoints: renderComprehensiveTurningPointsSection(reportCore, matrixInput, lang, deps),
    futureOutlook: renderComprehensiveFutureOutlookSection(reportCore, matrixInput, lang, deps),
  }
}

export function getComprehensiveRenderPaths(
  sections: Partial<AIPremiumReport['sections']>
): string[] {
  return [
    'introduction',
    'personalityDeep',
    'careerPath',
    'relationshipDynamics',
    'wealthPotential',
    'healthGuidance',
    'lifeMission',
    'timingAdvice',
    'actionPlan',
    'conclusion',
    ...(sections.spouseProfile ? ['spouseProfile'] : []),
    ...(sections.lifeStages ? ['lifeStages'] : []),
    ...(sections.turningPoints ? ['turningPoints'] : []),
    ...(sections.futureOutlook ? ['futureOutlook'] : []),
  ]
}
