import type { CalendarCoreAdapterResult } from '@/lib/destiny-matrix/core/adapters'
import type {
  DomainKey,
  DomainScore,
  MonthlyOverlapPoint,
  TimingCalibrationSummary,
} from '@/lib/destiny-matrix/types'
import {
  describeDataTrustSummary,
  describeIntraMonthPeakWindow,
  describeProvenanceSummary,
  describeSajuAstroConflictByDomain,
  describeTimingCalibrationSummary,
  describeTimingWindowBrief,
} from '@/lib/destiny-matrix/interpretation/humanSemantics'
import type { FormattedDate } from './types'

import {
  addDaysIso,
  buildAgreementCardData,
  buildBranchCardData,
  buildDomainSummaryFrame,
  buildTopDomains,
  buildTopDomainsFromCanonical,
  dedupe,
  getDomainLabel,
  getReliabilityText,
  isDefensivePhase,
  mapCoreDomainToPresentationDomain,
  mapPresentationDomainToDomainKey,
  pickDomainAlignedDate,
  pickSelectedDate,
  prioritizeTopDomains,
  scoreToWeatherGrade,
  softenForDefensivePhase,
  verdictModeToWeatherGrade,
  weatherSummaryText,
  type CalendarPresentationView,
  type DaySummary,
  type Locale,
  type MonthSummary,
  type PresentationDomain,
  type SurfaceCard,
  type WeatherSummary,
  type WeekSummary,
} from './presentationAdapter.support'

export type { CalendarPresentationView } from './presentationAdapter.support'

export function buildCalendarPresentationView(input: {
  allDates: FormattedDate[]
  locale: Locale
  timeZone: string
  canonicalCore?: CalendarCoreAdapterResult
  preferredFocusDomain?: PresentationDomain
  matrixContract?: {
    overallPhase?: string
    overallPhaseLabel?: string
    focusDomain?: string
  }
  dataQuality?: {
    missingFields: string[]
    derivedFields: string[]
    conflictingFields: string[]
    qualityPenalties: string[]
    confidenceReason: string
  }
  timingCalibration?: TimingCalibrationSummary
  overlapTimelineByDomain?: Record<DomainKey, MonthlyOverlapPoint[]>
  domainScores?: Record<DomainKey, DomainScore>
}): CalendarPresentationView {
  const {
    allDates,
    locale,
    timeZone,
    canonicalCore,
    preferredFocusDomain,
    matrixContract,
    dataQuality,
    timingCalibration,
    overlapTimelineByDomain,
    domainScores,
  } = input
  const selected = pickSelectedDate(allDates, timeZone)

  if (!selected) {
    const emptySummary =
      locale === 'ko'
        ? '데이터가 부족해 요약을 만들지 못했습니다.'
        : 'Not enough data to build the summary.'
    return {
      daySummary: {
        date: '',
        summary: emptySummary,
        focusDomain: getDomainLabel('general', locale),
        actionFocusDomain: getDomainLabel('general', locale),
        reliability: emptySummary,
      },
      weekSummary: { rangeStart: '', rangeEnd: '', summary: emptySummary },
      monthSummary: { month: '', summary: emptySummary },
      surfaceCards: [],
      topDomains: [],
      timingSignals: [],
      cautions: [],
      recommendedActions: [],
      relationshipWeather: { grade: 'neutral', summary: emptySummary },
      workMoneyWeather: { grade: 'neutral', summary: emptySummary },
    }
  }

  const defensivePhase = isDefensivePhase(
    canonicalCore?.phaseLabel || matrixContract?.overallPhaseLabel || matrixContract?.overallPhase
  )
  const canonicalTopDomains = buildTopDomainsFromCanonical(locale, canonicalCore)
  const rawTopDomains =
    canonicalTopDomains.length > 0
      ? canonicalTopDomains
      : buildTopDomains(locale, allDates, domainScores)
  const focusDomain =
    preferredFocusDomain ||
    mapCoreDomainToPresentationDomain(canonicalCore?.focusDomain) ||
    (selected.evidence?.matrix?.domain as PresentationDomain | undefined) ||
    rawTopDomains[0]?.domain ||
    'general'
  const actionFocusDomain =
    mapCoreDomainToPresentationDomain(canonicalCore?.actionFocusDomain) || focusDomain
  const topDomains = prioritizeTopDomains(rawTopDomains, focusDomain).slice(0, 3)
  const focusDomainLabel = getDomainLabel(focusDomain, locale)
  const actionFocusDomainLabel = getDomainLabel(actionFocusDomain, locale)
  const singleSubjectView = canonicalCore?.singleSubjectView
  const personModel = canonicalCore?.personModel
  const focusPersonState =
    personModel?.domainStateGraph?.find(
      (item) => mapCoreDomainToPresentationDomain(item.domain) === focusDomain
    ) || personModel?.domainStateGraph?.[0]
  const actionPersonState =
    personModel?.domainStateGraph?.find(
      (item) => mapCoreDomainToPresentationDomain(item.domain) === actionFocusDomain
    ) || focusPersonState
  const actionEvent =
    personModel?.eventOutlook?.find(
      (item) => mapCoreDomainToPresentationDomain(item.domain) === actionFocusDomain
    ) || personModel?.eventOutlook?.[0]
  const detailSelected = pickDomainAlignedDate(allDates, focusDomain, selected)
  const canonicalAdvisories =
    canonicalCore?.advisories?.filter(
      (item) => mapCoreDomainToPresentationDomain(item.domain) === focusDomain
    ) || []
  const canonicalTimingWindows =
    canonicalCore?.domainTimingWindows?.filter(
      (item) => mapCoreDomainToPresentationDomain(item.domain) === focusDomain
    ) || []
  const actionTimingWindow =
    canonicalCore?.domainTimingWindows?.find(
      (item) => mapCoreDomainToPresentationDomain(item.domain) === actionFocusDomain
    ) || canonicalTimingWindows[0]
  const primaryProvenance =
    canonicalTimingWindows[0]?.provenance ||
    canonicalAdvisories[0]?.provenance ||
    canonicalCore?.domainVerdicts?.find(
      (item) => mapCoreDomainToPresentationDomain(item.domain) === focusDomain
    )?.provenance
  const reliability = dedupe([
    getReliabilityText(
      locale,
      typeof canonicalCore?.confidence === 'number'
        ? Math.round(canonicalCore.confidence * 100)
        : selected.evidence?.confidence,
      typeof canonicalCore?.crossAgreement === 'number'
        ? Math.round(canonicalCore.crossAgreement * 100)
        : selected.evidence?.crossAgreementPercent
    ),
    describeDataTrustSummary({
      score:
        typeof canonicalCore?.confidence === 'number'
          ? Math.round(canonicalCore.confidence * 100)
          : undefined,
      missingFields: dataQuality?.missingFields || [],
      derivedFields: dataQuality?.derivedFields || [],
      conflictingFields: dataQuality?.conflictingFields || [],
      confidenceReason: dataQuality?.confidenceReason,
      lang: locale,
    }),
    describeProvenanceSummary({
      sourceFields: primaryProvenance?.sourceFields || [],
      sourceSetIds: primaryProvenance?.sourceSetIds || [],
      sourceRuleIds: primaryProvenance?.sourceRuleIds || [],
      lang: locale,
    }),
    describeTimingCalibrationSummary({
      reliabilityBand: timingCalibration?.reliabilityBand,
      reliabilityScore: timingCalibration?.reliabilityScore,
      pastStability: timingCalibration?.pastStability,
      futureStability: timingCalibration?.futureStability,
      backtestConsistency: timingCalibration?.backtestConsistency,
      calibratedFromHistory: timingCalibration?.calibratedFromHistory,
      calibrationSampleSize: timingCalibration?.calibrationSampleSize,
      calibrationMatchedRate: timingCalibration?.calibrationMatchedRate,
      lang: locale,
    }),
    describeIntraMonthPeakWindow({
      domainLabel: getDomainLabel(focusDomain, locale),
      points:
        mapPresentationDomainToDomainKey(focusDomain) && overlapTimelineByDomain
          ? overlapTimelineByDomain[mapPresentationDomainToDomainKey(focusDomain) as DomainKey]
          : undefined,
      lang: locale,
    }),
  ]).join(' ')
  const projectionStructure =
    canonicalCore?.projections?.structure?.detailLines?.[0] ||
    canonicalCore?.projections?.structure?.summary ||
    ''
  const projectionTiming =
    canonicalCore?.projections?.timing?.detailLines?.[0] ||
    canonicalCore?.projections?.timing?.summary ||
    ''
  const projectionConflict =
    canonicalCore?.projections?.conflict?.detailLines?.[0] ||
    canonicalCore?.projections?.conflict?.summary ||
    ''
  const projectionAction =
    canonicalCore?.projections?.action?.detailLines?.[0] ||
    canonicalCore?.projections?.action?.summary ||
    ''
  const projectionRisk =
    canonicalCore?.projections?.risk?.detailLines?.[0] ||
    canonicalCore?.projections?.risk?.summary ||
    ''
  const projectionBranch =
    canonicalCore?.projections?.branches?.detailLines?.[0] ||
    canonicalCore?.projections?.branches?.summary ||
    ''
  const singleSubjectTimingSummary = dedupe(
    [
      singleSubjectView?.timingState?.bestWindow
        ? locale === 'ko'
          ? `강한 창 ${singleSubjectView.timingState.bestWindow}`
          : `Best window ${singleSubjectView.timingState.bestWindow}`
        : '',
      singleSubjectView?.timingState?.whyNow || '',
      singleSubjectView?.timingState?.whyNotYet || '',
    ].filter(Boolean)
  ).join(' ')
  const singleSubjectBranchSummary = dedupe(
    [
      singleSubjectView?.branches?.[0]?.summary || '',
      singleSubjectView?.branches?.[0]?.nextMove || '',
    ].filter(Boolean)
  ).join(' ')
  const crossConflictText = describeSajuAstroConflictByDomain({
    crossAgreement: canonicalCore?.crossAgreement,
    focusDomainLabel,
    lang: locale,
  })

  const timingSignals = dedupe([
    singleSubjectTimingSummary,
    projectionTiming,
    singleSubjectBranchSummary,
    projectionBranch,
    ...canonicalTimingWindows.map((item) =>
      describeTimingWindowBrief({
        domainLabel: getDomainLabel(mapCoreDomainToPresentationDomain(item.domain), locale),
        window: item.window,
        whyNow: item.whyNow,
        entryConditions: item.entryConditions,
        abortConditions: item.abortConditions,
        timingGranularity: item.timingGranularity,
        precisionReason: item.precisionReason,
        timingConflictNarrative: item.timingConflictNarrative,
        lang: locale,
      })
    ),
    ...(detailSelected.timingSignals || []),
  ]).slice(0, 4)
  const cautions = dedupe([
    singleSubjectView?.riskAxis?.warning || '',
    ...(singleSubjectView?.abortConditions || []),
    actionEvent?.abortConditions?.[0] || '',
    projectionConflict,
    projectionRisk,
    ...canonicalAdvisories.map((item) => item.caution),
    ...(canonicalCore?.judgmentPolicy.blockedActionLabels || []),
    ...(canonicalCore?.judgmentPolicy.hardStopLabels || []),
    canonicalCore?.primaryCaution || '',
    ...(detailSelected.warnings || []),
  ]).slice(0, 3)
  const baseActions = dedupe([
    singleSubjectView?.actionAxis?.nowAction || '',
    singleSubjectView?.nextMove || '',
    actionPersonState?.firstMove || '',
    actionEvent?.nextMove || '',
    projectionAction,
    canonicalCore?.topDecisionLabel || '',
    ...(canonicalCore?.judgmentPolicy.allowedActionLabels || []),
    ...(canonicalCore?.judgmentPolicy.softCheckLabels || []),
    ...canonicalAdvisories.map((item) => item.action),
    canonicalCore?.primaryAction || '',
    ...(detailSelected.recommendations || []),
  ]).slice(0, 3)
  const recommendedActions = defensivePhase
    ? baseActions.map((line) => softenForDefensivePhase(line, locale))
    : baseActions

  const actionCardSummary =
    singleSubjectView?.actionAxis?.nowAction ||
    actionEvent?.nextMove ||
    actionPersonState?.firstMove ||
    projectionAction ||
    canonicalCore?.topDecisionLabel ||
    canonicalCore?.primaryAction ||
    recommendedActions[0] ||
    (locale === 'ko'
      ? `${actionFocusDomainLabel} 축은 지금 작은 실행보다 기준 정리를 먼저 하는 편이 낫습니다.`
      : `${actionFocusDomainLabel} works better through clarified criteria than broad execution right now.`)
  const riskCardSummary =
    singleSubjectView?.riskAxis?.warning ||
    actionPersonState?.holdMove ||
    projectionRisk ||
    cautions[0] ||
    (locale === 'ko'
      ? `${canonicalCore?.riskAxisLabel || focusDomainLabel} 축은 오늘 가장 먼저 관리해야 할 리스크입니다.`
      : `${canonicalCore?.riskAxisLabel || focusDomainLabel} is the risk axis to manage first today.`)
  const agreementPercent =
    typeof canonicalCore?.crossAgreement === 'number'
      ? Math.round(canonicalCore.crossAgreement * 100)
      : selected.evidence?.crossAgreementPercent
  const agreementCard = buildAgreementCardData({
    locale,
    focusDomainLabel: actionFocusDomainLabel,
    actionDomain: actionFocusDomain,
    matrix: canonicalCore?.crossAgreementMatrix,
    fallbackAgreementPercent: agreementPercent,
    fallbackConflictText: crossConflictText,
  })
  const windowCardSummary =
    singleSubjectTimingSummary ||
    timingSignals[0] ||
    (canonicalTimingWindows[0]
      ? describeTimingWindowBrief({
          domainLabel: actionFocusDomainLabel,
          window: canonicalTimingWindows[0].window,
          whyNow: canonicalTimingWindows[0].whyNow,
          entryConditions: canonicalTimingWindows[0].entryConditions,
          abortConditions: canonicalTimingWindows[0].abortConditions,
          timingGranularity: canonicalTimingWindows[0].timingGranularity,
          precisionReason: canonicalTimingWindows[0].precisionReason,
          timingConflictNarrative: canonicalTimingWindows[0].timingConflictNarrative,
          lang: locale,
        })
      : locale === 'ko'
        ? `${actionFocusDomainLabel} 창은 지금은 작게 열려 있으니 검토 후 움직이는 편이 안전합니다.`
        : `The ${actionFocusDomainLabel} window is only partly open, so review before moving.`)
  const branchCard = buildBranchCardData({
    locale,
    actionDomainLabel: actionFocusDomainLabel,
    projectionBranch: singleSubjectBranchSummary || projectionBranch,
    actionTimingWindow,
  })
  const surfaceCards: SurfaceCard[] = [
    {
      key: 'action',
      label: locale === 'ko' ? '행동축' : 'Action',
      summary: actionCardSummary,
    },
    {
      key: 'risk',
      label: locale === 'ko' ? '리스크축' : 'Risk',
      summary: riskCardSummary,
    },
    {
      key: 'window',
      label: locale === 'ko' ? '강한 창' : 'Window',
      summary: windowCardSummary,
    },
    {
      key: 'agreement',
      label: locale === 'ko' ? '합의도' : 'Agreement',
      summary: agreementCard.summary,
      tag: agreementCard.tag,
      details: agreementCard.details,
    },
    {
      key: 'branch',
      label: locale === 'ko' ? '가능한 경로' : 'Branch',
      summary: branchCard.summary,
      tag: branchCard.tag,
      details: branchCard.details,
    },
  ]

  const daySummaryText =
    singleSubjectView?.directAnswer ||
    actionPersonState?.thesis ||
    actionEvent?.summary ||
    (canonicalTimingWindows[0]
      ? describeTimingWindowBrief({
          domainLabel: focusDomainLabel,
          window: canonicalTimingWindows[0].window,
          whyNow: canonicalTimingWindows[0].whyNow,
          entryConditions: canonicalTimingWindows[0].entryConditions,
          abortConditions: canonicalTimingWindows[0].abortConditions,
          timingGranularity: canonicalTimingWindows[0].timingGranularity,
          precisionReason: canonicalTimingWindows[0].precisionReason,
          timingConflictNarrative: canonicalTimingWindows[0].timingConflictNarrative,
          lang: locale,
        })
      : '') ||
    detailSelected.actionSummary ||
    detailSelected.summary ||
    canonicalCore?.thesis ||
    (locale === 'ko'
      ? '오늘은 핵심 과제 1~2개 중심으로 운영하는 편이 좋습니다.'
      : 'Today is better handled by focusing on one or two priorities.')
  const focusSplitLead =
    actionFocusDomain !== focusDomain
      ? locale === 'ko'
        ? `중심축은 ${focusDomainLabel}이고, 지금 행동축은 ${actionFocusDomainLabel}입니다.`
        : `The underlying axis is ${focusDomainLabel}, while the action axis right now is ${actionFocusDomainLabel}.`
      : ''
  const focusRunnerUpLabel = canonicalCore?.arbitrationBrief?.focusRunnerUpDomain
    ? getDomainLabel(
        mapCoreDomainToPresentationDomain(canonicalCore.arbitrationBrief.focusRunnerUpDomain) ||
          'general',
        locale
      )
    : ''
  const actionRunnerUpLabel = canonicalCore?.arbitrationBrief?.actionRunnerUpDomain
    ? getDomainLabel(
        mapCoreDomainToPresentationDomain(canonicalCore.arbitrationBrief.actionRunnerUpDomain) ||
          'general',
        locale
      )
    : ''
  const arbitrationLead = canonicalCore?.arbitrationBrief
    ? locale === 'ko'
      ? actionFocusDomain !== focusDomain
        ? actionRunnerUpLabel
          ? `${actionFocusDomainLabel} 축이 ${actionRunnerUpLabel}보다 앞서 이번 실행축으로 올라왔습니다.`
          : `${actionFocusDomainLabel} 축이 이번 실행 판단을 가장 직접 끌고 갑니다.`
        : focusRunnerUpLabel
          ? `${focusDomainLabel} 축이 ${focusRunnerUpLabel}보다 앞서 이번 중심축으로 남았습니다.`
          : `${focusDomainLabel} 축이 이번 중심 판단을 가장 직접 끌고 갑니다.`
      : actionFocusDomain !== focusDomain
        ? actionRunnerUpLabel
          ? `${actionFocusDomainLabel} moved ahead of ${actionRunnerUpLabel} as the current action axis.`
          : `${actionFocusDomainLabel} is carrying the action pressure most directly right now.`
        : focusRunnerUpLabel
          ? `${focusDomainLabel} stayed ahead of ${focusRunnerUpLabel} as the current lead axis.`
          : `${focusDomainLabel} is carrying the lead pressure most directly right now.`
    : ''
  const latentLead = canonicalCore?.latentTopAxes?.length
    ? locale === 'ko'
      ? `가장 강하게 작동하는 층은 ${canonicalCore.latentTopAxes
          .slice(0, 2)
          .map((axis) => axis.label)
          .join(', ')}입니다.`
      : `The strongest active layers are ${canonicalCore.latentTopAxes
          .slice(0, 2)
          .map((axis) => axis.label)
          .join(', ')}.`
    : ''
  const projectionDayLead = [projectionStructure, projectionTiming].filter(Boolean).join(' ')
  const projectionBranchLead = singleSubjectBranchSummary || projectionBranch
  const projectionRiskLead = [
    singleSubjectView?.riskAxis?.warning || '',
    projectionConflict,
    projectionRisk,
  ]
    .filter(Boolean)
    .join(' ')
  const projectionActionLead =
    singleSubjectView?.nextMove ||
    singleSubjectView?.actionAxis?.nowAction ||
    actionEvent?.nextMove ||
    projectionAction

  const daySummary: DaySummary = {
    date: selected.date,
    summary: buildDomainSummaryFrame(
      locale,
      'day',
      focusDomain,
      defensivePhase
        ? locale === 'ko'
          ? `${actionCardSummary} ${riskCardSummary} ${windowCardSummary} ${focusSplitLead} ${arbitrationLead} ${latentLead} ${projectionDayLead} ${projectionBranchLead} ${daySummaryText} 오늘은 확정보다 검토와 재정렬을 우선하세요.`
          : `${actionCardSummary} ${riskCardSummary} ${windowCardSummary} ${focusSplitLead} ${arbitrationLead} ${latentLead} ${projectionDayLead} ${projectionBranchLead} ${daySummaryText} Today favors review and reset over commitment.`
        : `${actionCardSummary} ${riskCardSummary} ${windowCardSummary} ${focusSplitLead} ${arbitrationLead} ${latentLead} ${projectionDayLead} ${projectionBranchLead} ${daySummaryText} ${projectionActionLead} ${crossConflictText}`.trim()
    ),
    focusDomain: focusDomainLabel,
    actionFocusDomain: actionFocusDomainLabel,
    reliability,
  }

  const weekStart = selected.date
  const weekEnd = addDaysIso(weekStart, 6)
  const weekDates = allDates.filter((d) => d.date >= weekStart && d.date <= weekEnd)
  const weekSorted = [...weekDates].sort(
    (a, b) => (b.displayScore ?? b.score) - (a.displayScore ?? a.score)
  )
  const weekTop = weekSorted[0]
  const weekLow = weekSorted[weekSorted.length - 1]
  const weekDomain = topDomains[0] || buildTopDomains(locale, weekDates, undefined)[0]
  const weekDomainLabel = preferredFocusDomain
    ? focusDomainLabel
    : weekDomain?.label || focusDomainLabel
  const weekSummaryText =
    locale === 'ko'
      ? `${weekDomainLabel} 흐름이 중심인 주간입니다. ${
          canonicalTimingWindows[0]
            ? describeTimingWindowBrief({
                domainLabel: weekDomainLabel,
                window: canonicalTimingWindows[0].window,
                whyNow: canonicalTimingWindows[0].whyNow,
                entryConditions: canonicalTimingWindows[0].entryConditions,
                abortConditions: canonicalTimingWindows[0].abortConditions,
                timingGranularity: canonicalTimingWindows[0].timingGranularity,
                precisionReason: canonicalTimingWindows[0].precisionReason,
                timingConflictNarrative: canonicalTimingWindows[0].timingConflictNarrative,
                lang: 'ko',
              })
            : canonicalCore?.riskControl ||
              `상대적으로 여유가 있는 날은 ${weekTop?.date || weekStart}, 보수적으로 운영할 날은 ${weekLow?.date || weekEnd} 쪽입니다.`
        }`
      : `This week centers on ${weekDomain?.label || focusDomainLabel}. The lighter window is around ${weekTop?.date || weekStart}, while the more conservative window is around ${weekLow?.date || weekEnd}.`

  const weekSummary: WeekSummary = {
    rangeStart: weekStart,
    rangeEnd: weekEnd,
    summary: buildDomainSummaryFrame(
      locale,
      'week',
      focusDomain,
      defensivePhase
        ? locale === 'ko'
          ? `${projectionStructure} ${weekSummaryText} ${projectionRiskLead} 주간 전체로는 검토형 실행이 더 유리합니다.`
          : `${projectionStructure} ${weekSummaryText} ${projectionRiskLead} Across the week, review-led execution is safer.`
        : `${projectionStructure} ${weekSummaryText} ${projectionActionLead} ${crossConflictText}`.trim()
    ),
  }

  const monthKey = selected.date.slice(0, 7)
  const monthDates = allDates.filter((d) => d.date.startsWith(monthKey))
  const monthDomain = topDomains[0] || buildTopDomains(locale, monthDates, undefined)[0]
  const monthAvg =
    monthDates.length > 0
      ? monthDates.reduce((sum, d) => sum + (d.displayScore ?? d.score), 0) / monthDates.length
      : (selected.displayScore ?? selected.score)
  const monthDomainLabel = preferredFocusDomain
    ? focusDomainLabel
    : monthDomain?.label || focusDomainLabel

  const monthSummary: MonthSummary = {
    month: monthKey,
    summary: buildDomainSummaryFrame(
      locale,
      'month',
      focusDomain,
      locale === 'ko'
        ? `${projectionStructure} ${monthKey}은 ${monthDomainLabel} 중심으로 보는 편이 맞습니다. ${
            canonicalTimingWindows[0]
              ? describeTimingWindowBrief({
                  domainLabel: monthDomainLabel,
                  window: canonicalTimingWindows[0].window,
                  whyNow: canonicalTimingWindows[0].whyNow,
                  entryConditions: canonicalTimingWindows[0].entryConditions,
                  abortConditions: canonicalTimingWindows[0].abortConditions,
                  timingGranularity: canonicalTimingWindows[0].timingGranularity,
                  precisionReason: canonicalTimingWindows[0].precisionReason,
                  timingConflictNarrative: canonicalTimingWindows[0].timingConflictNarrative,
                  lang: 'ko',
                })
              : `이번 달 평균 흐름은 ${Math.round(monthAvg)}/100 수준이며, 크게 벌리기보다 우선순위를 분명히 할수록 안정적입니다.`
          } ${projectionActionLead} ${crossConflictText}`.trim()
        : `${projectionStructure} ${monthKey} is best read through ${monthDomain?.label || focusDomainLabel}. ${canonicalCore?.gradeReason || `Average intensity is ${Math.round(monthAvg)}/100, with review and operation mixed into the month.`} ${projectionActionLead} ${crossConflictText}`.trim()
    ),
  }

  const timingSignalsWithConflict = dedupe(
    crossConflictText
      ? [projectionConflict, crossConflictText, ...timingSignals]
      : [projectionConflict, ...timingSignals]
  )

  const relationCandidates = allDates.filter(
    (d) => d.evidence?.matrix?.domain === 'love' || d.categories.includes('love')
  )
  const workMoneyCandidates = allDates.filter((d) => {
    const domain = d.evidence?.matrix?.domain
    return (
      domain === 'career' ||
      domain === 'money' ||
      d.categories.includes('career') ||
      d.categories.includes('wealth')
    )
  })

  const buildWeather = (
    area: 'relationship' | 'workMoney',
    rows: FormattedDate[]
  ): WeatherSummary => {
    const canonicalVerdicts =
      area === 'relationship'
        ? canonicalCore?.domainVerdicts?.filter((item) => item.domain === 'relationship') || []
        : canonicalCore?.domainVerdicts?.filter(
            (item) => item.domain === 'career' || item.domain === 'wealth'
          ) || []

    if (canonicalVerdicts.length > 0) {
      const primary = canonicalVerdicts.slice().sort((a, b) => b.confidence - a.confidence)[0]
      const grade = verdictModeToWeatherGrade(primary?.mode, primary?.confidence)
      return {
        grade,
        summary: weatherSummaryText(locale, area, grade),
      }
    }

    const avg =
      rows.length > 0
        ? rows.reduce((sum, d) => sum + (d.displayScore ?? d.score), 0) / rows.length
        : (selected.displayScore ?? selected.score)
    const cautionRatio =
      rows.length > 0 ? rows.filter((d) => (d.warnings || []).length > 0).length / rows.length : 0
    const grade = scoreToWeatherGrade(avg, cautionRatio)
    return {
      grade,
      summary: weatherSummaryText(locale, area, grade),
    }
  }

  return {
    daySummary,
    weekSummary,
    monthSummary,
    surfaceCards,
    topDomains,
    timingSignals: timingSignalsWithConflict,
    cautions,
    recommendedActions,
    relationshipWeather: buildWeather('relationship', relationCandidates),
    workMoneyWeather: buildWeather('workMoney', workMoneyCandidates),
  }
}
