import {
  describeDataTrustSummary,
  describeSajuAstroConflictByDomain,
} from '@/lib/destiny-matrix/interpretation/humanSemantics'
import type { FormattedDate } from './types'

import {
  addDaysIso,
  buildAgreementCardData,
  buildBranchCardData,
  buildDomainSummaryFrame,
  buildTopDomains,
  dedupe,
  getDomainLabel,
  getReliabilityText,
  isDefensivePhase,
  pickDomainAlignedDate,
  pickSelectedDate,
  prioritizeTopDomains,
  scoreToWeatherGrade,
  softenForDefensivePhase,
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
  preferredFocusDomain?: PresentationDomain
  matrixContract?: {
    overallPhase?: string
    overallPhaseLabel?: string
    focusDomain?: string
  }
}): CalendarPresentationView {
  const { allDates, locale, timeZone, preferredFocusDomain, matrixContract } = input
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
    matrixContract?.overallPhaseLabel || matrixContract?.overallPhase
  )
  const rawTopDomains = buildTopDomains(locale, allDates)
  const focusDomain =
    preferredFocusDomain ||
    (selected.evidence?.matrix?.domain as PresentationDomain | undefined) ||
    rawTopDomains[0]?.domain ||
    'general'
  const actionFocusDomain = focusDomain
  const topDomains = prioritizeTopDomains(rawTopDomains, focusDomain).slice(0, 3)
  const focusDomainLabel = getDomainLabel(focusDomain, locale)
  const actionFocusDomainLabel = getDomainLabel(actionFocusDomain, locale)
  const selectedFocusDomain =
    (selected.evidence?.matrix?.domain as PresentationDomain | undefined) || focusDomain
  const selectedFocusDomainLabel = getDomainLabel(selectedFocusDomain, locale)
  const detailSelected = pickDomainAlignedDate(allDates, focusDomain, selected)
  const reliability = dedupe([
    getReliabilityText(
      locale,
      selected.evidence?.confidence,
      selected.evidence?.crossAgreementPercent
    ),
    describeDataTrustSummary({
      score: undefined,
      missingFields: [],
      derivedFields: [],
      conflictingFields: [],
      confidenceReason: undefined,
      lang: locale,
    }),
  ]).join(' ')
  const crossConflictText = describeSajuAstroConflictByDomain({
    crossAgreement: undefined,
    focusDomainLabel,
    lang: locale,
  })

  const timingSignals = dedupe([...(detailSelected.timingSignals || [])]).slice(0, 4)
  const cautions = dedupe([...(detailSelected.warnings || [])]).slice(0, 3)
  const baseActions = dedupe([...(detailSelected.recommendations || [])]).slice(0, 3)
  const recommendedActions = defensivePhase
    ? baseActions.map((line) => softenForDefensivePhase(line, locale))
    : baseActions

  const actionCardSummary =
    recommendedActions[0] ||
    (locale === 'ko'
      ? `${actionFocusDomainLabel} 축은 지금 작은 실행보다 기준 정리를 먼저 하는 편이 낫습니다.`
      : `${actionFocusDomainLabel} works better through clarified criteria than broad execution right now.`)
  const riskCardSummary =
    cautions[0] ||
    (locale === 'ko'
      ? `${focusDomainLabel} 축은 오늘 가장 먼저 관리해야 할 리스크입니다.`
      : `${focusDomainLabel} is the risk axis to manage first today.`)
  const agreementPercent = selected.evidence?.crossAgreementPercent
  const agreementCard = buildAgreementCardData({
    locale,
    focusDomainLabel: actionFocusDomainLabel,
    actionDomain: actionFocusDomain,
    fallbackAgreementPercent: agreementPercent,
    fallbackConflictText: crossConflictText,
  })
  const windowCardSummary =
    timingSignals[0] ||
    (locale === 'ko'
      ? `${actionFocusDomainLabel} 창은 지금은 작게 열려 있으니 검토 후 움직이는 편이 안전합니다.`
      : `The ${actionFocusDomainLabel} window is only partly open, so review before moving.`)
  const branchCard = buildBranchCardData({
    locale,
    actionDomainLabel: actionFocusDomainLabel,
    projectionBranch: '',
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

  const simplifiedDaySummary =
    locale === 'ko'
      ? defensivePhase
        ? `${selectedFocusDomainLabel} 이슈는 오늘 크게 넓히기보다 점검하며 운영하는 편이 맞습니다.`
        : `${selectedFocusDomainLabel} 이슈는 무리 없이 운영하기 좋은 흐름입니다.`
      : defensivePhase
        ? `${selectedFocusDomainLabel} is better handled through review and reset than by widening the scope today.`
        : `${selectedFocusDomainLabel} is in a workable operating flow today.`

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
  }

  const dailyView = {
    date: selected.date,
    grade: selected.displayGrade ?? selected.grade,
    label: detailSelected.title,
    frontDomain: selectedFocusDomain,
    frontDomainLabel: selectedFocusDomainLabel,
    oneLineSummary: simplifiedDaySummary,
    doNow: actionCardSummary,
    watchOut: riskCardSummary,
    bestTimes: dedupe(detailSelected.bestTimes || []).slice(0, 2),
    reliability,
    confidence:
      typeof selected.evidence?.confidence === 'number'
        ? selected.evidence.confidence / 100
        : undefined,
    reasonShort: detailSelected.summary || undefined,
  }

  const weekStart = selected.date
  const weekEnd = addDaysIso(weekStart, 6)
  const weekDates = allDates.filter((d) => d.date >= weekStart && d.date <= weekEnd)
  const weekSorted = [...weekDates].sort(
    (a, b) => (b.displayScore ?? b.score) - (a.displayScore ?? a.score)
  )
  const weekTop = weekSorted[0]
  const weekLow = weekSorted[weekSorted.length - 1]
  const weekDomain = buildTopDomains(locale, weekDates)[0] || topDomains[0]
  const weekDomainLabel = preferredFocusDomain
    ? focusDomainLabel
    : weekDomain?.label || focusDomainLabel
  const weekSummaryText =
    locale === 'ko'
      ? `${weekDomainLabel} 흐름이 중심인 주간입니다. 상대적으로 여유가 있는 날은 ${weekTop?.date || weekStart}, 보수적으로 운영할 날은 ${weekLow?.date || weekEnd} 쪽입니다.`
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
              locale === 'ko'
                ? '주간 전체로는 검토형 실행이 더 유리합니다.'
                : 'Across the week, review-led execution is safer.',
            ],
            3
          )
        : compactSummaryLines([weekSummaryText, crossConflictText], 3)
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
  const monthDomain = buildTopDomains(locale, monthDates)[0] || topDomains[0]
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
              `${monthKey} 한 달은 ${monthDomainLabel} 중심으로 보는 편이 맞습니다.`,
              `이번 달 평균 흐름은 ${Math.round(monthAvg)}/100 수준이며, 크게 벌리기보다 우선순위를 분명히 할수록 안정적입니다.`,
              crossConflictText,
            ],
            4
          )
        : compactSummaryLines(
            [
              `${monthKey} is best read through ${monthDomain?.label || focusDomainLabel}.`,
              `Average intensity is ${Math.round(monthAvg)}/100, with review and operation mixed into the month.`,
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
    crossConflictText ? [crossConflictText, ...timingSignals] : [...timingSignals]
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
