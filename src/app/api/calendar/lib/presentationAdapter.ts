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
import { buildInterpretedAnswerContract } from '@/lib/destiny-matrix/interpretedAnswer'
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

function compactSummaryLines(lines: Array<string | undefined>, max = 3): string {
  return dedupe(lines.filter(Boolean) as string[])
    .slice(0, max)
    .join(' ')
}

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
      dailyView: {
        date: '',
        grade: 2,
        label: locale === 'ko' ? '운영' : 'Operate',
        frontDomain: 'general',
        frontDomainLabel: getDomainLabel('general', locale),
        oneLineSummary: emptySummary,
        doNow: emptySummary,
        watchOut: emptySummary,
        bestTimes: [],
        reliability: emptySummary,
      },
      weekView: {
        rangeStart: '',
        rangeEnd: '',
        frontDomain: 'general',
        frontDomainLabel: getDomainLabel('general', locale),
        oneLineSummary: emptySummary,
        operatingRule: emptySummary,
      },
      monthView: {
        month: '',
        frontDomain: 'general',
        frontDomainLabel: getDomainLabel('general', locale),
        oneLineSummary: emptySummary,
        operatingRule: emptySummary,
      },
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
  const selectedFocusDomain =
    (selected.evidence?.matrix?.domain as PresentationDomain | undefined) || focusDomain
  const selectedFocusDomainLabel = getDomainLabel(selectedFocusDomain, locale)
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

  const _focusRunnerUpLabel = canonicalCore?.arbitrationBrief?.focusRunnerUpDomain
    ? getDomainLabel(
        mapCoreDomainToPresentationDomain(canonicalCore.arbitrationBrief.focusRunnerUpDomain) ||
          'general',
        locale
      )
    : ''
  const _actionRunnerUpLabel = canonicalCore?.arbitrationBrief?.actionRunnerUpDomain
    ? getDomainLabel(
        mapCoreDomainToPresentationDomain(canonicalCore.arbitrationBrief.actionRunnerUpDomain) ||
          'general',
        locale
      )
    : ''
  const _arbitrationLead = canonicalCore?.arbitrationBrief
    ? locale === 'ko'
      ? actionFocusDomain !== focusDomain
        ? _actionRunnerUpLabel
          ? `${actionFocusDomainLabel} 축이 ${_actionRunnerUpLabel}보다 앞서 이번 실행축으로 올라왔습니다.`
          : `${actionFocusDomainLabel} 축이 이번 실행 판단을 가장 직접 끌고 갑니다.`
        : _focusRunnerUpLabel
          ? `${focusDomainLabel} 축이 ${_focusRunnerUpLabel}보다 앞서 이번 중심축으로 남았습니다.`
          : `${focusDomainLabel} 축이 이번 중심 판단을 가장 직접 끌고 갑니다.`
      : actionFocusDomain !== focusDomain
        ? _actionRunnerUpLabel
          ? `${actionFocusDomainLabel} moved ahead of ${_actionRunnerUpLabel} as the current action axis.`
          : `${actionFocusDomainLabel} is carrying the action pressure most directly right now.`
        : _focusRunnerUpLabel
          ? `${focusDomainLabel} stayed ahead of ${_focusRunnerUpLabel} as the current lead axis.`
          : `${focusDomainLabel} is carrying the lead pressure most directly right now.`
    : ''
  const _latentLead = canonicalCore?.latentTopAxes?.length
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
  const _projectionDayLead = [projectionStructure, projectionTiming].filter(Boolean).join(' ')
  const _projectionBranchLead = singleSubjectBranchSummary || projectionBranch
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
  const interpretedAnswer = canonicalCore
    ? buildInterpretedAnswerContract({
        packet: {
          singleSubjectView: canonicalCore.singleSubjectView,
          personModel: canonicalCore.personModel,
          topTimingWindow: canonicalCore.topTimingWindow,
          focusDomain: canonicalCore.focusDomain,
        },
        frame: 'timing_window',
        primaryDomain: (canonicalCore.actionFocusDomain || canonicalCore.focusDomain) as
          | 'personality'
          | 'career'
          | 'relationship'
          | 'wealth'
          | 'health'
          | 'spirituality'
          | 'timing'
          | 'move',
      })
    : null

  const simplifiedDaySummary =
    locale === 'ko'
      ? defensivePhase
        ? `${selectedFocusDomainLabel} 이슈는 오늘 크게 넓히기보다 점검하며 운영하는 편이 맞습니다.`
        : `${selectedFocusDomainLabel} 이슈는 무리 없이 운영하기 좋은 흐름입니다.`
      : defensivePhase
        ? `${selectedFocusDomainLabel} is better handled through review and reset than by widening the scope today.`
        : `${selectedFocusDomainLabel} is in a workable operating flow today.`
  void projectionActionLead

  const daySummary: DaySummary = {
    date: selected.date,
    summary: simplifiedDaySummary,
    focusDomain: selectedFocusDomainLabel,
    actionFocusDomain: actionFocusDomainLabel,
    backgroundFocusDomain:
      actionFocusDomain !== selectedFocusDomain ? actionFocusDomainLabel : undefined,
    reliability,
    doNow: actionCardSummary,
    watchOut: riskCardSummary,
    bestTimes: dedupe(detailSelected.bestTimes || []).slice(0, 2),
    interpretedAnswer: interpretedAnswer || undefined,
  }

  const riskDomain =
    mapCoreDomainToPresentationDomain(singleSubjectView?.riskAxis?.domain) || undefined
  const riskDomainLabel =
    riskDomain && riskDomain !== selectedFocusDomain
      ? getDomainLabel(riskDomain, locale)
      : undefined
  const dailyView = {
    date: selected.date,
    grade: selected.displayGrade ?? selected.grade,
    label: locale === 'ko' ? detailSelected.title : detailSelected.title,
    frontDomain: selectedFocusDomain,
    frontDomainLabel: selectedFocusDomainLabel,
    watchDomain: riskDomain,
    watchDomainLabel: riskDomainLabel,
    oneLineSummary: simplifiedDaySummary,
    doNow: actionCardSummary,
    watchOut: riskCardSummary,
    bestTimes: dedupe(detailSelected.bestTimes || []).slice(0, 2),
    reliability,
    confidence:
      typeof canonicalCore?.confidence === 'number'
        ? canonicalCore.confidence
        : typeof selected.evidence?.confidence === 'number'
          ? selected.evidence.confidence / 100
          : undefined,
    reasonShort:
      canonicalCore?.gradeReason ||
      canonicalCore?.topDecisionLabel ||
      detailSelected.summary ||
      undefined,
  }

  const weekStart = selected.date
  const weekEnd = addDaysIso(weekStart, 6)
  const weekDates = allDates.filter((d) => d.date >= weekStart && d.date <= weekEnd)
  const weekSorted = [...weekDates].sort(
    (a, b) => (b.displayScore ?? b.score) - (a.displayScore ?? a.score)
  )
  const weekTop = weekSorted[0]
  const weekLow = weekSorted[weekSorted.length - 1]
  const weekDomain = buildTopDomains(locale, weekDates, undefined)[0] || topDomains[0]
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
        ? compactSummaryLines(
            [
              weekSummaryText,
              projectionRiskLead,
              locale === 'ko'
                ? '주간 전체로는 검토형 실행이 더 유리합니다.'
                : 'Across the week, review-led execution is safer.',
            ],
            3
          )
        : compactSummaryLines([weekSummaryText, projectionActionLead, crossConflictText], 3)
    ),
  }

  const weekView = {
    rangeStart: weekStart,
    rangeEnd: weekEnd,
    frontDomain: focusDomain,
    frontDomainLabel: weekDomainLabel,
    oneLineSummary: weekSummary.summary,
    operatingRule:
      recommendedActions[0] ||
      actionCardSummary ||
      (locale === 'ko'
        ? '한 번에 넓히기보다 기준을 먼저 맞추세요.'
        : 'Set the rule before widening scope.'),
    brightWindow: weekTop?.date,
    cautiousWindow: weekLow?.date,
  }

  const monthKey = selected.date.slice(0, 7)
  const monthDates = allDates.filter((d) => d.date.startsWith(monthKey))
  const monthDomain = buildTopDomains(locale, monthDates, undefined)[0] || topDomains[0]
  const monthSortedDesc = [...monthDates].sort(
    (a, b) => (b.displayScore ?? b.score) - (a.displayScore ?? a.score)
  )
  const monthSortedAsc = [...monthDates].sort(
    (a, b) => (a.displayScore ?? a.score) - (b.displayScore ?? b.score)
  )
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
        ? compactSummaryLines(
            [
              `${monthKey}은 ${monthDomainLabel} 중심으로 보는 편이 맞습니다.`,
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
                : `이번 달 평균 흐름은 ${Math.round(monthAvg)}/100 수준이며, 크게 벌리기보다 우선순위를 분명히 할수록 안정적입니다.`,
              projectionActionLead,
              crossConflictText,
            ],
            4
          )
        : compactSummaryLines(
            [
              `${monthKey} is best read through ${monthDomain?.label || focusDomainLabel}.`,
              canonicalCore?.gradeReason ||
                `Average intensity is ${Math.round(monthAvg)}/100, with review and operation mixed into the month.`,
              projectionActionLead,
              crossConflictText,
            ],
            4
          )
    ),
  }

  const monthView = {
    month: monthKey,
    frontDomain: focusDomain,
    frontDomainLabel: monthDomainLabel,
    oneLineSummary: monthSummary.summary,
    operatingRule:
      recommendedActions[0] ||
      actionCardSummary ||
      (locale === 'ko'
        ? '핵심 조건부터 맞추며 운영하세요.'
        : 'Operate by locking the core conditions first.'),
    strongestWindow: monthSortedDesc[0]?.date,
    cautionWindow: monthSortedAsc[0]?.date,
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
    dailyView,
    weekView,
    monthView,
    surfaceCards,
    topDomains,
    timingSignals: timingSignalsWithConflict,
    cautions,
    recommendedActions,
    relationshipWeather: buildWeather('relationship', relationCandidates),
    workMoneyWeather: buildWeather('workMoney', workMoneyCandidates),
  }
}
