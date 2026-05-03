'use client'

import React, { memo, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import KoreanLunarCalendar from 'korean-lunar-calendar'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './DestinyCalendar.module.css'
import { resolvePeakLevel } from './peakUtils'
import type { CalendarCoreAdapterResult } from '@/lib/destiny-matrix/core/adapters'
import type { InterpretedAnswerContract } from '@/lib/destiny-matrix/interpretedAnswer'
import { formatDecisionActionLabel } from '@/lib/destiny-matrix/core/actionCopy'
import {
  getDisplayGradeFromScore,
} from '@/lib/destiny-map/calendar/scoring-config'
import { getGradeLabel as getUnifiedGradeLabel } from './constants'
import {
  WEEKDAYS_EN,
  WEEKDAYS_KO,
  buildReadableCrossLine,
  buildReadableFlowSummary,
  dedupeDisplayLines,
  formatPolicyMode,
  getDomainLabel,
  getReliabilityBand,
  getReliabilityLabel,
  humanizePhaseLabel,
  normalizeSemanticKey,
  safeDisplayText,
  softenDecisionTone,
  takeLeadLine,
  toCalendarDomain,
  toUserFacingEvidenceLine,
  type SelectedPanelEventCategory,
} from './SelectedDatePanel.helpers'

type EventCategory = SelectedPanelEventCategory
type ImportanceGrade = 0 | 1 | 2 | 3 | 4

interface ImportantDate {
  date: string
  grade: ImportanceGrade
  originalGrade?: ImportanceGrade
  displayGrade?: ImportanceGrade
  score: number
  rawScore?: number
  adjustedScore?: number
  displayScore?: number
  categories: EventCategory[]
  title: string
  description: string
  summary?: string
  actionSummary?: string
  timingSignals?: string[]
  bestTimes?: string[]
  sajuFactors: string[]
  astroFactors: string[]
  recommendations: string[]
  warnings: string[]
  evidence?: {
    matrix: {
      domain: 'career' | 'love' | 'money' | 'health' | 'move' | 'general'
      finalScoreAdjusted: number
      overlapStrength: number
      peakLevel: 'peak' | 'high' | 'normal'
      monthKey: string
    }
    cross: {
      sajuEvidence: string
      astroEvidence: string
      sajuDetails?: string[]
      astroDetails?: string[]
      bridges?: string[]
    }
    confidence: number
    crossAgreementPercent?: number
    source: 'rule' | 'rag' | 'hybrid'
    matrixVerdict?: {
      focusDomain: string
      verdict: string
      guardrail: string
      topClaim?: string
      topAnchorSummary?: string
      phase?: string
      attackPercent?: number
      defensePercent?: number
    }
  }
  ganzhi?: string
  transitSunSign?: string
  crossVerified?: boolean
  longCycleContext?: {
    daeun?: {
      ganji: string
      ageStart: number
      ageEnd: number
      sibsinStem?: string
      yearsToNext?: number
      transitionImminent?: boolean
      nextGanji?: string
      nextSibsinStem?: string
    }
    sewoon?: { ganji: string; year: number; sibsinStem?: string }
    wolwoon?: { ganji: string; sibsinStem?: string }
    iljin?: { ganji: string; sibsinStem?: string; sibsinBranch?: string }
  }
  cycleInteractions?: Array<{
    pair: string
    kind: '천간합' | '천간충' | '지지합' | '지지충' | '지지형' | '지지해' | '지지파' | '자형'
    blurb: string
  }>
  transit?: {
    aspects: Array<{
      transitPlanet: string
      natalPoint: string
      aspect: string
      orb: number
      isApplying: boolean
    }>
    retrogrades?: string[]
    summary?: string
  }
  lunarMansion?: {
    name: string
    nameKo: string
    element: string
    animal: string
    isAuspicious: boolean
    goodFor: string[]
    badFor: string[]
  }
}

interface SelectedDatePanelProps {
  selectedDay: Date | null
  selectedDate: ImportantDate | null
  canonicalCore?: CalendarCoreAdapterResult
  presentation?: {
    dailyView?: {
      date: string
      grade: number
      label: string
      frontDomain: string
      frontDomainLabel: string
      watchDomain?: string
      watchDomainLabel?: string
      oneLineSummary: string
      doNow: string
      watchOut: string
      bestTimes: string[]
      reliability: string
      confidence?: number
      reasonShort?: string
    }
    weekView?: {
      rangeStart: string
      rangeEnd: string
      frontDomain: string
      frontDomainLabel: string
      oneLineSummary: string
      operatingRule: string
      brightWindow?: string
      cautiousWindow?: string
    }
    monthView?: {
      month: string
      frontDomain: string
      frontDomainLabel: string
      oneLineSummary: string
      operatingRule: string
      strongestWindow?: string
      cautionWindow?: string
    }
    daySummary?: {
      date: string
      summary: string
      focusDomain: string
      actionFocusDomain?: string
      backgroundFocusDomain?: string
      reliability: string
      doNow?: string
      watchOut?: string
      bestTimes?: string[]
      interpretedAnswer?: InterpretedAnswerContract
    }
    weekSummary?: {
      rangeStart: string
      rangeEnd: string
      summary: string
    }
    monthSummary?: {
      month: string
      summary: string
    }
    surfaceCards?: Array<{
      key: 'action' | 'risk' | 'window' | 'agreement' | 'branch'
      label: string
      summary: string
      tag?: string
      details?: string[]
      visual?:
        | {
            kind: 'agreement'
            agreementPercent: number
            contradictionPercent: number
            leadLagState: 'structure-ahead' | 'trigger-ahead' | 'balanced'
          }
        | {
            kind: 'branch'
            rows: Array<{ label: string; text: string }>
          }
    }>
    topDomains?: Array<{
      domain: 'career' | 'love' | 'money' | 'health' | 'move' | 'general'
      label: string
      score: number
    }>
    timingSignals?: string[]
    cautions?: string[]
    recommendedActions?: string[]
    relationshipWeather?: {
      grade: 'strong' | 'good' | 'neutral' | 'caution'
      summary: string
    }
    workMoneyWeather?: {
      grade: 'strong' | 'good' | 'neutral' | 'caution'
      summary: string
    }
  }
  savedDates: Set<string>
  saving: boolean
  saveMsg: string | null
  onSave: () => void
  onUnsave: () => void
  getGradeEmoji: (grade: number) => string
  getScoreClass: (score: number) => string
}

const SelectedDatePanel = memo(function SelectedDatePanel({
  selectedDay,
  selectedDate,
  canonicalCore,
  presentation,
  savedDates,
  saving,
  saveMsg,
  onSave,
  onUnsave,
  getGradeEmoji,
  getScoreClass: _getScoreClass,
}: SelectedDatePanelProps) {
  const { locale } = useI18n()
  const { status } = useSession()
  const WEEKDAYS = locale === 'ko' ? WEEKDAYS_KO : WEEKDAYS_EN

  const categoryLabels = useMemo<Record<EventCategory, { ko: string; en: string }>>(
    () => ({
      wealth: { ko: '\uC7AC\uBB3C\uC6B4', en: 'Wealth' },
      career: { ko: '\uCEE4\uB9AC\uC5B4\uC6B4', en: 'Career' },
      love: { ko: '\uC5F0\uC560\uC6B4', en: 'Love' },
      health: { ko: '\uAC74\uAC15\uC6B4', en: 'Health' },
      travel: { ko: '\uC5EC\uD589\uC6B4', en: 'Travel' },
      study: { ko: '\uD559\uC5C5\uC6B4', en: 'Study' },
      general: { ko: '\uC804\uCCB4\uC6B4', en: 'General' },
    }),
    []
  )

  const termHelp = {
    sajuTitle:
      locale === 'ko'
        ? '\uC0AC\uC8FC \uBD84\uC11D (\uD0C0\uACE0\uB09C \uAD6C\uC870\uC640 \uC624\uB298\uC758 \uD750\uB984)'
        : 'Saju Analysis (natal pattern + today flow)',
    astroTitle:
      locale === 'ko'
        ? '\uC810\uC131 \uBD84\uC11D (\uD589\uC131 \uC6C0\uC9C1\uC784 \uAE30\uBC18)'
        : 'Astrology Analysis (planetary movement based)',
    dayPillar:
      locale === 'ko'
        ? '\uC77C\uC8FC (\uC624\uB298\uC758 \uD575\uC2EC \uAE30\uC6B4)'
        : 'Day Pillar (today core energy)',
  }
  const displayScore = selectedDate?.displayScore ?? selectedDate?.score ?? 0
  const displayGrade = selectedDate?.displayGrade ?? getDisplayGradeFromScore(displayScore)
  const reliabilityBand = getReliabilityBand(selectedDate?.evidence?.confidence)
  const isLowReliability = reliabilityBand === 'low'

  const normalizedBestTimes = useMemo(
    () =>
      dedupeDisplayLines(
        (selectedDate?.bestTimes || []).map((time) =>
          softenDecisionTone(time, locale, isLowReliability)
        )
      ),
    [selectedDate?.bestTimes, locale, isLowReliability]
  )

  // Compute the lunar date label for the selected day. Falls back silently
  // when the library can't convert (out-of-range / invalid input) — the panel
  // simply omits the lunar chip in that case.
  const lunarDateLabel = useMemo(() => {
    if (!selectedDay) return ''
    try {
      const cal = new KoreanLunarCalendar()
      const ok = cal.setSolarDate(
        selectedDay.getFullYear(),
        selectedDay.getMonth() + 1,
        selectedDay.getDate(),
      )
      if (!ok) return ''
      const lunar = cal.getLunarCalendar()
      if (!lunar?.month || !lunar?.day) return ''
      const leap = lunar.intercalation ? (locale === 'ko' ? '윤' : 'leap ') : ''
      return locale === 'ko'
        ? `음력 ${leap}${lunar.month}.${lunar.day}`
        : `Lunar ${leap}${lunar.month}/${lunar.day}`
    } catch {
      return ''
    }
  }, [selectedDay, locale])

  const handleAddToCalendar = useCallback(async () => {
    if (!selectedDate || !selectedDay) return

    const dateStr = selectedDate.date.replace(/-/g, '')
    const nextDay = new Date(selectedDay)
    nextDay.setDate(nextDay.getDate() + 1)
    const endStr = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, '0')}${String(nextDay.getDate()).padStart(2, '0')}`

    const cleanedTitle = safeDisplayText(
      selectedDate.title,
      locale === 'ko' ? '운명 캘린더 일정' : 'Destiny Calendar Event'
    )
    const categories = selectedDate.categories
      .map((cat) => {
        const label = categoryLabels[cat]
        return label ? (locale === 'ko' ? label.ko : label.en) : cat
      })
      .join(', ')

    const descParts = [
      safeDisplayText(
        selectedDate.description,
        locale === 'ko' ? '오늘 흐름 요약' : 'Daily flow summary'
      ),
      categories ? `${locale === 'ko' ? '카테고리' : 'Categories'}: ${categories}` : '',
      `${locale === 'ko' ? '점수' : 'Score'}: ${displayScore}/100`,
    ]

    if (selectedDate.recommendations.length > 0) {
      descParts.push(`${locale === 'ko' ? '추천' : 'Recommendations'}:`)
      selectedDate.recommendations.forEach((r) =>
        descParts.push(
          `- ${safeDisplayText(r, locale === 'ko' ? '추천 행동 1개 실행' : 'Do one recommended action')}`
        )
      )
    }

    if (selectedDate.warnings.length > 0) {
      descParts.push(`${locale === 'ko' ? '주의' : 'Warnings'}:`)
      selectedDate.warnings.forEach((w) =>
        descParts.push(
          `- ${safeDisplayText(w, locale === 'ko' ? '리스크를 한 번 더 점검' : 'Double-check risk items')}`
        )
      )
    }

    const description = descParts.filter(Boolean).join('\n')

    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

    const escapeICS = (text: string) =>
      text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SajuAstroChat//DestinyCalendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${endStr}`,
      `DTSTAMP:${stamp}`,
      `UID:destiny-${dateStr}@sajuastrochat`,
      `SUMMARY:${escapeICS(cleanedTitle)}`,
      `DESCRIPTION:${escapeICS(description)}`,
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n')

    const fileName = `destiny-calendar-${selectedDate.date}.ics`
    const icsBlob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })

    const canShareFiles =
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function'

    if (canShareFiles) {
      try {
        const file = new File([icsBlob], fileName, {
          type: 'text/calendar;charset=utf-8',
        })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: cleanedTitle,
            text: description,
            files: [file],
          })
          return
        }
      } catch {
        // Fallback to direct download / URL methods below.
      }
    }

    const googleUrl =
      'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      `&text=${encodeURIComponent(cleanedTitle)}` +
      `&dates=${encodeURIComponent(`${dateStr}/${endStr}`)}` +
      `&details=${encodeURIComponent(description)}`

    const isMobile =
      typeof navigator !== 'undefined' &&
      /android|iphone|ipad|ipod/i.test(navigator.userAgent || '')

    if (isMobile) {
      window.open(googleUrl, '_blank', 'noopener,noreferrer')
      return
    }

    try {
      const blobUrl = URL.createObjectURL(icsBlob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500)
      return
    } catch {
      // Final fallback below.
    }

    window.open(googleUrl, '_blank', 'noopener,noreferrer')
  }, [selectedDate, selectedDay, locale, categoryLabels, displayScore])

  if (!selectedDay) return null

  const resolvedPeakLevel = selectedDate
    ? resolvePeakLevel(selectedDate.evidence?.matrix?.peakLevel, displayScore)
    : null
  const matrixVerdict = selectedDate?.evidence?.matrixVerdict

  const mergedTimingNarrative = (() => {
    if (!selectedDate) return ''
    if (matrixVerdict?.topAnchorSummary) {
      return matrixVerdict.topAnchorSummary
    }

    const peakLevel = resolvedPeakLevel
    const bestWindow = normalizedBestTimes[0]
    const domain = selectedDate.evidence?.matrix.domain

    if (locale === 'ko') {
      const peakLabel =
        peakLevel === 'peak' ? '강한 피크 구간' : peakLevel === 'high' ? '상승 구간' : '안정 구간'
      const domainLabel = getDomainLabel(domain, 'ko')
      const timeLine = bestWindow
        ? `특히 ${bestWindow} 전후로 중요한 결정을 배치하시면 흐름을 타기 쉽습니다.`
        : '시간대를 고를 수 있다면 오전-오후 중 가장 집중이 잘 되는 구간에 핵심 일을 배치해 보세요.'

      if (displayGrade >= 3) {
        return `${peakLabel}이지만 ${domainLabel} 영역에서는 주의 신호가 함께 보여 무리한 확장보다 손실 관리가 우선입니다. ${timeLine}`
      }
      return `${peakLabel}에서 ${domainLabel} 영역의 효율이 올라오는 날입니다. 속도를 올리되, 핵심 1~2개 과제에 집중할수록 체감 성과가 커집니다. ${timeLine}`
    }

    const peakLabel =
      peakLevel === 'peak'
        ? 'peak window'
        : peakLevel === 'high'
          ? 'rising window'
          : 'steady window'
    const timeLine = bestWindow
      ? `Prioritize key decisions around ${bestWindow}.`
      : 'If possible, place key tasks in your highest-focus block.'

    if (displayGrade >= 3) {
      return `This is a ${peakLabel}, but caution signals are active, so risk control should come before expansion. ${timeLine}`
    }
    return `This is a ${peakLabel} with stronger execution flow. Focus on one or two high-impact tasks for better outcomes. ${timeLine}`
  })()

  const getCategoryLabel = (cat: EventCategory) =>
    locale === 'ko' ? categoryLabels[cat].ko : categoryLabels[cat].en

  const isSaved = selectedDate ? savedDates.has(selectedDate.date) : false
  const safeTitle = safeDisplayText(
    selectedDate?.title,
    locale === 'ko' ? '오늘 흐름 요약' : 'Daily flow summary'
  )
  const safeSummary = softenDecisionTone(
    safeDisplayText(selectedDate?.summary, ''),
    locale,
    isLowReliability
  )
  const safeDescription = softenDecisionTone(
    safeDisplayText(
      selectedDate?.description,
      locale === 'ko' ? '세부 설명을 불러오는 중입니다.' : 'Detailed explanation is loading.'
    ),
    locale,
    isLowReliability
  )
  const safeNarrative = softenDecisionTone(
    safeDisplayText(mergedTimingNarrative, ''),
    locale,
    isLowReliability
  )
  const safeWarnings = dedupeDisplayLines(
    (selectedDate?.warnings || []).map((line) => softenDecisionTone(line, locale, isLowReliability))
  )
  const safeRecommendations = dedupeDisplayLines(
    (selectedDate?.recommendations || []).map((line) =>
      softenDecisionTone(line, locale, isLowReliability)
    )
  )
  const safeSajuFactors = (selectedDate?.sajuFactors || [])
    .map((line) => softenDecisionTone(line, locale, isLowReliability))
    .filter(Boolean)
  const safeAstroFactors = (selectedDate?.astroFactors || [])
    .map((line) => softenDecisionTone(line, locale, isLowReliability))
    .filter(Boolean)

  const evidenceBridges = (selectedDate?.evidence?.cross?.bridges || [])
    .map((line) => toUserFacingEvidenceLine(line, 'bridge', locale))
    .filter(Boolean)

  const canonicalAdvisory =
    canonicalCore?.advisories.find((item) => item.domain === canonicalCore.focusDomain) ||
    canonicalCore?.advisories[0]
  const canonicalDomainVerdict =
    canonicalCore?.domainVerdicts.find((item) => item.domain === canonicalCore.focusDomain) ||
    canonicalCore?.domainVerdicts[0]
  const canonicalGradeLabel = safeDisplayText(canonicalCore?.gradeLabel || '', '')
  const canonicalPhaseLabel = humanizePhaseLabel(
    canonicalCore?.phaseLabel || canonicalCore?.phase || '',
    locale
  )
  const canonicalFocusDomainLabel = canonicalCore
    ? getDomainLabel(toCalendarDomain(canonicalCore.focusDomain), locale)
    : ''
  const canonicalReliabilityLabel = canonicalCore
    ? formatPolicyMode(canonicalCore.judgmentPolicy.mode, locale)
    : ''
  const unifiedDayLabel =
    canonicalGradeLabel ||
    (selectedDate
      ? getUnifiedGradeLabel(getDisplayGradeFromScore(displayScore), locale === 'ko' ? 'ko' : 'en')
          .full
      : '')
  const isPresentationDayMatch =
    Boolean(selectedDate?.date) &&
    Boolean(presentation?.dailyView?.date || presentation?.daySummary?.date) &&
    selectedDate?.date === (presentation?.dailyView?.date || presentation?.daySummary?.date)
  const presentationReliability = isPresentationDayMatch
    ? safeDisplayText(
        presentation?.dailyView?.reliability || presentation?.daySummary?.reliability || '',
        ''
      )
    : ''
  const reliabilityLabel = selectedDate
    ? getReliabilityLabel(selectedDate.evidence?.confidence, locale)
    : ''
  const reliabilityHeadline =
    canonicalReliabilityLabel || presentationReliability || reliabilityLabel
  const domainLabel = selectedDate
    ? getDomainLabel(selectedDate.evidence?.matrix.domain, locale)
    : locale === 'ko'
      ? '전반'
      : 'overall'
  const canonicalActionFocusDomainLabel = canonicalCore
    ? getDomainLabel(toCalendarDomain(canonicalCore.actionFocusDomain), locale)
    : ''
  const focusDomainHeadline =
    (isPresentationDayMatch
      ? safeDisplayText(presentation?.dailyView?.frontDomainLabel || '', '')
      : '') ||
    (isPresentationDayMatch
      ? safeDisplayText(presentation?.daySummary?.focusDomain || '', '')
      : '') ||
    canonicalActionFocusDomainLabel ||
    canonicalFocusDomainLabel ||
    domainLabel
  const actionFocusDomainHeadline =
    (isPresentationDayMatch
      ? safeDisplayText(presentation?.dailyView?.frontDomainLabel || '', '')
      : '') ||
    (isPresentationDayMatch
      ? safeDisplayText(presentation?.daySummary?.actionFocusDomain || '', '')
      : '') ||
    canonicalActionFocusDomainLabel ||
    focusDomainHeadline
  const backgroundDomainHeadline =
    (isPresentationDayMatch
      ? safeDisplayText(presentation?.dailyView?.watchDomainLabel || '', '')
      : '') ||
    (isPresentationDayMatch
      ? safeDisplayText(presentation?.daySummary?.backgroundFocusDomain || '', '')
      : '') ||
    (canonicalFocusDomainLabel !== actionFocusDomainHeadline ? canonicalFocusDomainLabel : '')

  const evidenceSummaryPrimary = canonicalCore
    ? locale === 'ko'
      ? `오늘 등급 ${unifiedDayLabel} · 흐름 ${canonicalPhaseLabel || canonicalCore.phase} · 핵심 분야 ${focusDomainHeadline} · 현재 행동축 ${actionFocusDomainHeadline} · 판단 기준 ${reliabilityHeadline}`
      : `Today rating ${unifiedDayLabel} · Flow ${canonicalPhaseLabel || canonicalCore.phase} · Focus ${focusDomainHeadline} · Action Axis ${actionFocusDomainHeadline} · Guidance ${reliabilityHeadline}`
    : selectedDate?.evidence
      ? locale === 'ko'
        ? `오늘 등급 ${unifiedDayLabel} · 점수 ${displayScore}/100 · 핵심 분야 ${domainLabel} · 현재 행동축 ${actionFocusDomainHeadline}${matrixVerdict?.phase ? ` · 흐름 ${humanizePhaseLabel(matrixVerdict.phase, locale)}` : ''}`
        : `Today rating ${unifiedDayLabel} · Score ${displayScore}/100 · Focus ${domainLabel} · Action Axis ${actionFocusDomainHeadline}${matrixVerdict?.phase ? ` · Flow ${humanizePhaseLabel(matrixVerdict.phase, locale)}` : ''}`
      : ''

  const evidenceSummaryCross = selectedDate?.evidence
    ? buildReadableCrossLine({
        locale,
        confidence: canonicalCore?.confidence ?? selectedDate.evidence.confidence,
        crossAgreement:
          canonicalCore?.crossAgreement ?? selectedDate.evidence.crossAgreementPercent,
        focusDomain: focusDomainHeadline,
      })
    : ''

  const evidenceBridgeSummary =
    evidenceBridges.length > 0
      ? locale === 'ko'
        ? `핵심 결론: ${evidenceBridges[0]}`
        : `Key takeaway: ${evidenceBridges[0]}`
      : ''

  const evidenceScoreLine = (() => {
    if (canonicalCore) {
      const agreement = canonicalCore.crossAgreement
      if (typeof agreement === 'number' && Number.isFinite(agreement)) {
        return locale === 'ko'
          ? `교차 정합도(참고): ${agreement}%`
          : `Cross-agreement (reference): ${agreement}%`
      }
      return locale === 'ko'
        ? `근거 강도(참고): ${canonicalCore.confidence}%`
        : `Evidence strength (reference): ${canonicalCore.confidence}%`
    }
    if (!selectedDate?.evidence) return ''
    const agreement = selectedDate.evidence.crossAgreementPercent
    if (typeof agreement === 'number' && Number.isFinite(agreement)) {
      return locale === 'ko'
        ? `교차 정합도(참고): ${agreement}%`
        : `Cross-agreement (reference): ${agreement}%`
    }
    return locale === 'ko'
      ? `근거 강도(참고): ${selectedDate.evidence.confidence}%`
      : `Evidence strength (reference): ${selectedDate.evidence.confidence}%`
  })()

  const readableFlowSummary = buildReadableFlowSummary({
    locale,
    focusDomain: focusDomainHeadline,
    phase: canonicalPhaseLabel || humanizePhaseLabel(matrixVerdict?.phase || '', locale),
    gradeLabel: unifiedDayLabel,
    reliability: reliabilityHeadline,
    attackPercent: matrixVerdict?.attackPercent,
    defensePercent: matrixVerdict?.defensePercent,
    action:
      canonicalCore?.topDecisionLabel ||
      canonicalCore?.primaryAction ||
      canonicalAdvisory?.action ||
      '',
    caution:
      canonicalCore?.riskControl ||
      canonicalCore?.primaryCaution ||
      canonicalAdvisory?.caution ||
      '',
  })

  const quickThesis = (() => {
    if (!selectedDate) return ''
    if (isPresentationDayMatch && presentation?.dailyView?.oneLineSummary) {
      return softenDecisionTone(presentation.dailyView.oneLineSummary, locale, isLowReliability)
    }
    if (isPresentationDayMatch && presentation?.daySummary?.summary) {
      return softenDecisionTone(presentation.daySummary.summary, locale, isLowReliability)
    }
    if (readableFlowSummary) {
      return softenDecisionTone(readableFlowSummary, locale, isLowReliability)
    }
    if (canonicalAdvisory?.thesis) {
      return softenDecisionTone(canonicalAdvisory.thesis, locale, isLowReliability)
    }
    if (canonicalCore?.thesis) {
      return softenDecisionTone(canonicalCore.thesis, locale, isLowReliability)
    }
    if (matrixVerdict?.verdict) {
      return softenDecisionTone(matrixVerdict.verdict, locale, isLowReliability)
    }
    if (locale === 'ko') {
      return `${domainLabel} 흐름은 ${unifiedDayLabel}이고, 말·약속은 한 번 더 확인하는 편이 좋습니다.`
    }
    return `Flow is ${unifiedDayLabel.toLowerCase()} for ${domainLabel}; verify communication and commitments once more.`
  })()

  const safeTimingSignals = dedupeDisplayLines(
    (selectedDate?.timingSignals || []).map((line) =>
      softenDecisionTone(line, locale, isLowReliability)
    )
  ).slice(0, 4)

  const topTimingSignals = dedupeDisplayLines([
    ...((presentation?.timingSignals || []).map((line) =>
      softenDecisionTone(line, locale, isLowReliability)
    ) || []),
    ...safeTimingSignals,
  ]).slice(0, 4)

  const topCautions = dedupeDisplayLines([
    ...((presentation?.cautions || []).map((line) =>
      softenDecisionTone(line, locale, isLowReliability)
    ) || []),
    ...safeWarnings,
  ]).slice(0, 3)

  const topRecommendedActions = dedupeDisplayLines([
    softenDecisionTone(
      formatDecisionActionLabel(canonicalCore?.topDecisionAction || '', locale, false),
      locale,
      isLowReliability
    ),
    softenDecisionTone(canonicalCore?.primaryAction || '', locale, isLowReliability),
    softenDecisionTone(canonicalAdvisory?.action || '', locale, isLowReliability),
    ...((canonicalDomainVerdict?.allowedActionLabels || []).map((action) =>
      softenDecisionTone(action, locale, isLowReliability)
    ) || []),
    ...(!(canonicalDomainVerdict?.allowedActionLabels || []).length
      ? (canonicalDomainVerdict?.allowedActions || []).map((action) =>
          formatDecisionActionLabel(action, locale, false)
        )
      : []),
    ...((presentation?.recommendedActions || []).map((line) =>
      softenDecisionTone(line, locale, isLowReliability)
    ) || []),
    ...safeRecommendations,
  ]).slice(0, 3)

  const quickDos =
    topRecommendedActions.slice(0, 3).length > 0
      ? topRecommendedActions.slice(0, 3)
      : locale === 'ko'
        ? ['연락이나 협의를 먼저 시작해 보세요.', '중요 문서나 할 일을 1건 정리해 보세요.']
        : ['Start one outreach or coordination task.', 'Close one important document or task.']

  const quickDontCandidates = dedupeDisplayLines([
    softenDecisionTone(canonicalCore?.primaryCaution || '', locale, isLowReliability),
    softenDecisionTone(canonicalCore?.riskControl || '', locale, isLowReliability),
    softenDecisionTone(canonicalAdvisory?.caution || '', locale, isLowReliability),
    ...((
      canonicalCore?.judgmentPolicy.hardStopLabels ||
      canonicalCore?.judgmentPolicy.hardStops ||
      []
    ).map((line) => softenDecisionTone(line, locale, isLowReliability)) || []),
    ...((canonicalDomainVerdict?.blockedActionLabels || []).map((action) =>
      softenDecisionTone(action, locale, isLowReliability)
    ) || []),
    ...(!(canonicalDomainVerdict?.blockedActionLabels || []).length
      ? (canonicalDomainVerdict?.blockedActions || []).map((action) =>
          formatDecisionActionLabel(action, locale, true)
        )
      : []),
    softenDecisionTone(matrixVerdict?.guardrail || '', locale, isLowReliability),
    ...topCautions,
  ])

  const quickDonts =
    quickDontCandidates.slice(0, 2).length > 0
      ? quickDontCandidates.slice(0, 2)
      : locale === 'ko'
        ? ['계약이나 큰 결정은 재확인 후 진행하세요.']
        : ['Recheck contracts or major decisions before finalizing.']

  const quickWindows =
    dedupeDisplayLines([
      softenDecisionTone(canonicalAdvisory?.timingHint || '', locale, isLowReliability),
      ...normalizedBestTimes,
    ]).slice(0, 2).length > 0
      ? dedupeDisplayLines([
          softenDecisionTone(canonicalAdvisory?.timingHint || '', locale, isLowReliability),
          ...normalizedBestTimes,
        ]).slice(0, 2)
      : locale === 'ko'
        ? ['집중 가능한 시간대 1개를 먼저 확보하세요.']
        : ['Secure one focused time block first.']

  const safeActionSummary = safeDisplayText(
    softenDecisionTone(
      canonicalCore?.topDecisionLabel ||
        canonicalCore?.primaryAction ||
        selectedDate?.actionSummary ||
        '',
      locale,
      isLowReliability
    ),
    ''
  )

  const explicitSurfaceCards: Array<{
    label: string
    tag?: string
    text: string
    details?: string[]
    visual?:
      | {
          kind: 'agreement'
          agreementPercent: number
          contradictionPercent: number
          leadLagState: 'structure-ahead' | 'trigger-ahead' | 'balanced'
        }
      | {
          kind: 'branch'
          rows: Array<{ label: string; text: string }>
        }
  }> =
    (presentation?.surfaceCards || [])
      .map((item) => ({
        label: safeDisplayText(item.label, ''),
        tag: safeDisplayText(item.tag || '', ''),
        text: takeLeadLine(item.summary),
        details: (item.details || [])
          .map((line) => safeDisplayText(line, ''))
          .filter(Boolean)
          .slice(0, 3),
        visual:
          item.visual?.kind === 'agreement'
            ? {
                kind: 'agreement' as const,
                agreementPercent: item.visual.agreementPercent,
                contradictionPercent: item.visual.contradictionPercent,
                leadLagState: item.visual.leadLagState,
              }
            : item.visual?.kind === 'branch'
              ? {
                  kind: 'branch' as const,
                  rows: item.visual.rows
                    .map((row) => ({
                      label: safeDisplayText(row.label, ''),
                      text: safeDisplayText(row.text, ''),
                    }))
                    .filter((row) => row.label && row.text),
                }
              : undefined,
      }))
      .filter((item) => item.label && item.text) || []

  const quickHighlightCards: Array<{
    label: string
    tag?: string
    text: string
    details?: string[]
    visual?:
      | {
          kind: 'agreement'
          agreementPercent: number
          contradictionPercent: number
          leadLagState: 'structure-ahead' | 'trigger-ahead' | 'balanced'
        }
      | {
          kind: 'branch'
          rows: Array<{ label: string; text: string }>
        }
  }> = [
    ...explicitSurfaceCards,
    {
      label: locale === 'ko' ? '핵심 결론' : 'Core',
      text: takeLeadLine(quickThesis),
    },
  ]
    .filter((item, index, items) => {
      const text = safeDisplayText(item.text, '')
      if (!text) return false
      const key = normalizeSemanticKey(text)
      return items.findIndex((candidate) => normalizeSemanticKey(candidate.text) === key) === index
    })
    .slice(0, 5)

  const displayTitle = (() => {
    const baseTitle = safeTitle
    const looksFallback =
      /fallback|기본 운세 안내|임시|temporary|server|retry/i.test(baseTitle) || !baseTitle
    if (!looksFallback) return baseTitle
    if (canonicalPhaseLabel && canonicalFocusDomainLabel) {
      return locale === 'ko'
        ? `${canonicalPhaseLabel} · ${canonicalFocusDomainLabel}`
        : `${canonicalPhaseLabel} · ${canonicalFocusDomainLabel}`
    }
    if (canonicalPhaseLabel) return canonicalPhaseLabel
    if (canonicalGradeLabel && canonicalFocusDomainLabel) {
      return locale === 'ko'
        ? `${canonicalGradeLabel} · ${canonicalFocusDomainLabel}`
        : `${canonicalGradeLabel} · ${canonicalFocusDomainLabel}`
    }
    return baseTitle
  })()

  const detailInsight = (() => {
    const candidates = dedupeDisplayLines([
      readableFlowSummary,
      matrixVerdict?.topClaim
        ? softenDecisionTone(matrixVerdict.topClaim, locale, isLowReliability)
        : '',
      safeNarrative,
      softenDecisionTone(safeSummary, locale, isLowReliability),
      safeDescription,
    ])
    if (candidates.length === 0) return ''
    const thesisKey = normalizeSemanticKey(quickThesis)
    if (!thesisKey) return candidates[0]

    const distinct = candidates.find((line) => {
      const key = normalizeSemanticKey(line)
      if (!key) return false
      const canCompareInclusion = key.length >= 16 && thesisKey.length >= 16
      if (key === thesisKey) return false
      if (canCompareInclusion && (key.includes(thesisKey) || thesisKey.includes(key))) return false
      return true
    })
    return distinct || ''
  })()

  // Cross-agreement percent for the dedicated section (not buried inside reliability headline).
  // canonicalCore.crossAgreement is a 0–1 fraction; evidence.crossAgreementPercent is already 0–100.
  const crossAgreementPercent: number | null = (() => {
    const fromCanonical =
      typeof canonicalCore?.crossAgreement === 'number' ? canonicalCore.crossAgreement : null
    if (fromCanonical !== null && Number.isFinite(fromCanonical))
      return Math.round(fromCanonical * 100)
    const fromEvidence = selectedDate?.evidence?.crossAgreementPercent
    if (typeof fromEvidence === 'number' && Number.isFinite(fromEvidence))
      return Math.round(fromEvidence)
    return null
  })()
  const crossAgreementVerdict: string =
    crossAgreementPercent === null
      ? ''
      : crossAgreementPercent >= 70
        ? locale === 'ko'
          ? '사주와 점성이 같은 결을 가리킵니다'
          : 'Saju and astrology point the same way'
        : crossAgreementPercent >= 50
          ? locale === 'ko'
            ? '사주와 점성이 대체로 비슷한 결입니다'
            : 'Saju and astrology mostly agree'
          : locale === 'ko'
            ? '사주와 점성이 다른 결을 가리킵니다'
            : 'Saju and astrology disagree'

  // Single-line key takeaway for the hero block.
  const headlineOneLine: string =
    presentation?.daySummary?.interpretedAnswer?.directAnswer ||
    presentation?.dailyView?.oneLineSummary ||
    presentation?.daySummary?.summary ||
    quickThesis ||
    safeSummary ||
    ''

  // Suppress lint for computed values retained from the legacy panel layout.
  // The simplified fortune-calendar UI no longer renders them, but the data
  // pipelines that produce them are shared with other surfaces — keeping the
  // bindings prevents accidental dead-code removal mid-refactor.
  void getCategoryLabel
  void backgroundDomainHeadline
  void evidenceSummaryPrimary
  void evidenceSummaryCross
  void evidenceBridgeSummary
  void evidenceScoreLine
  void topTimingSignals
  void quickDos
  void quickDonts
  void quickWindows
  void safeActionSummary
  void quickHighlightCards
  void detailInsight

  return (
    <div className={`${styles.selectedDayInfo} ${styles.largeTextMode}`}>
      {/* ── Header: date + grade emoji + save ─────────────────── */}
      <div className={styles.selectedDayHeader}>
        <span className={styles.selectedDayDate}>
          {selectedDay.getMonth() + 1}/{selectedDay.getDate()}
          {locale === 'ko' && ` (${WEEKDAYS[selectedDay.getDay()]})`}
          {lunarDateLabel && (
            <span style={{ marginLeft: 8, opacity: 0.6, fontSize: '0.75em', fontWeight: 'normal' }}>
              {lunarDateLabel}
            </span>
          )}
        </span>
        <div className={styles.headerActions}>
          {selectedDate && (
            <span className={styles.selectedGrade}>{getGradeEmoji(displayGrade)}</span>
          )}
          {status === 'authenticated' && selectedDate && (
            <button
              className={`${styles.saveBtn} ${isSaved ? styles.saved : ''}`}
              onClick={isSaved ? onUnsave : onSave}
              disabled={saving}
              aria-label={
                isSaved
                  ? locale === 'ko'
                    ? '저장됨 (클릭하여 삭제)'
                    : 'Saved (click to remove)'
                  : locale === 'ko'
                    ? '이 날짜 저장하기'
                    : 'Save this date'
              }
            >
              {saving ? '...' : isSaved ? '★' : '☆'}
            </button>
          )}
        </div>
      </div>
      {saveMsg && <div className={styles.saveMsg}>{saveMsg}</div>}

      {selectedDate ? (
        <div className={styles.selectedDayContent}>
          {/* ── Hero: grade label + score + one-liner ───────────── */}
          <div className={styles.quickScanCard}>
            <h3 className={styles.selectedTitle}>
              {unifiedDayLabel || displayTitle}
              <span style={{ marginLeft: 8, opacity: 0.7, fontSize: '0.75em' }}>
                {displayScore}/100
              </span>
            </h3>
            {headlineOneLine && (
              <p className={styles.quickScanThesis}>{headlineOneLine}</p>
            )}
          </div>

          {/* ── Long-cycle context: 대운 / 세운 / 월운 / 일운 ──── */}
          {selectedDate?.longCycleContext &&
            (selectedDate.longCycleContext.daeun ||
              selectedDate.longCycleContext.sewoon ||
              selectedDate.longCycleContext.wolwoon ||
              selectedDate.longCycleContext.iljin) && (
              <div className={styles.quickSummaryBlock}>
                <span className={styles.quickSummaryLabel}>
                  🌀 {locale === 'ko' ? '운 흐름' : 'Cycle Flow'}
                </span>
                <ul style={{ margin: '8px 0 0', paddingLeft: 0, listStyle: 'none' }}>
                  {selectedDate.longCycleContext.daeun && (
                    <li style={{ padding: '4px 0', fontSize: '0.92em' }}>
                      대운 <strong>{selectedDate.longCycleContext.daeun.ganji}</strong>
                      {' '}({selectedDate.longCycleContext.daeun.ageStart}–
                      {selectedDate.longCycleContext.daeun.ageEnd}세)
                      {selectedDate.longCycleContext.daeun.sibsinStem
                        ? ` · ${selectedDate.longCycleContext.daeun.sibsinStem}`
                        : ''}
                      {selectedDate.longCycleContext.daeun.transitionImminent && (
                        <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 600 }}>
                          ⚠ {selectedDate.longCycleContext.daeun.yearsToNext?.toFixed(1)}년 후{' '}
                          {selectedDate.longCycleContext.daeun.nextGanji
                            ? `${selectedDate.longCycleContext.daeun.nextGanji} 대운으로 전환`
                            : '대운 전환'}
                          {selectedDate.longCycleContext.daeun.nextSibsinStem
                            ? ` (${selectedDate.longCycleContext.daeun.nextSibsinStem})`
                            : ''}
                        </span>
                      )}
                    </li>
                  )}
                  {selectedDate.longCycleContext.sewoon && (
                    <li style={{ padding: '4px 0', fontSize: '0.92em' }}>
                      세운 <strong>{selectedDate.longCycleContext.sewoon.ganji}</strong>
                      {' '}({selectedDate.longCycleContext.sewoon.year})
                      {selectedDate.longCycleContext.sewoon.sibsinStem
                        ? ` · ${selectedDate.longCycleContext.sewoon.sibsinStem}`
                        : ''}
                    </li>
                  )}
                  {selectedDate.longCycleContext.wolwoon && (
                    <li style={{ padding: '4px 0', fontSize: '0.92em' }}>
                      월운 <strong>{selectedDate.longCycleContext.wolwoon.ganji}</strong>
                      {selectedDate.longCycleContext.wolwoon.sibsinStem
                        ? ` · ${selectedDate.longCycleContext.wolwoon.sibsinStem}`
                        : ''}
                    </li>
                  )}
                  {selectedDate.longCycleContext.iljin && (
                    <li style={{ padding: '4px 0', fontSize: '0.92em' }}>
                      일운 <strong>{selectedDate.longCycleContext.iljin.ganji}</strong>
                      {selectedDate.longCycleContext.iljin.sibsinStem
                        ? ` · ${selectedDate.longCycleContext.iljin.sibsinStem}`
                        : ''}
                    </li>
                  )}
                </ul>
              </div>
            )}

          {/* ── Cycle interactions: 충 / 합 / 형 between cycles ── */}
          {selectedDate?.cycleInteractions && selectedDate.cycleInteractions.length > 0 && (
            <div className={styles.quickSummaryBlock}>
              <span className={styles.quickSummaryLabel}>
                ⚡ {locale === 'ko' ? '운끼리의 충·합·형' : 'Cycle Clashes'}
              </span>
              <ul style={{ margin: '8px 0 0', paddingLeft: 0, listStyle: 'none' }}>
                {selectedDate.cycleInteractions.slice(0, 4).map((it, i) => (
                  <li key={i} style={{ padding: '4px 0', fontSize: '0.92em' }}>
                    · {it.blurb}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Saju evidence ──────────────────────────────────── */}
          {safeSajuFactors.length > 0 && (
            <div className={styles.quickSummaryBlock}>
              <span className={styles.quickSummaryLabel}>
                📍 {locale === 'ko' ? '사주 근거' : 'Saju Evidence'}
              </span>
              <ul style={{ margin: '8px 0 0', paddingLeft: 0, listStyle: 'none' }}>
                {safeSajuFactors.slice(0, 3).map((f, i) => (
                  <li key={i} style={{ padding: '4px 0', fontSize: '0.95em' }}>
                    · {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Transit aspects ─────────────────────────────────── */}
          {selectedDate?.transit?.aspects && selectedDate.transit.aspects.length > 0 && (
            <div className={styles.quickSummaryBlock}>
              <span className={styles.quickSummaryLabel}>
                🪐 {locale === 'ko' ? '점성 트랜짓' : 'Transit Aspects'}
              </span>
              {selectedDate.transit.summary && (
                <p
                  className={styles.quickSummaryText}
                  style={{ marginTop: 4, fontSize: '0.92em', opacity: 0.85 }}
                >
                  {selectedDate.transit.summary}
                </p>
              )}
              <ul style={{ margin: '8px 0 0', paddingLeft: 0, listStyle: 'none' }}>
                {selectedDate.transit.aspects.slice(0, 4).map((a, i) => (
                  <li key={i} style={{ padding: '4px 0', fontSize: '0.92em' }}>
                    · <strong>{a.transitPlanet}</strong> {a.aspect}{' '}
                    <strong>{a.natalPoint}</strong>
                    {' '}<span style={{ opacity: 0.7 }}>
                      (오브 {a.orb.toFixed(1)}°{a.isApplying ? ', 접근' : ', 분리'})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Retrograde alert ─────────────────────────────── */}
          {selectedDate?.transit?.retrogrades && selectedDate.transit.retrogrades.length > 0 && (
            <div className={styles.quickSummaryBlock}>
              <span className={styles.quickSummaryLabel}>
                ↩ {locale === 'ko' ? '역행 행성' : 'Retrograde'}
              </span>
              <p className={styles.quickSummaryText} style={{ marginTop: 4 }}>
                {selectedDate.transit.retrogrades.join(', ')}
                {selectedDate.transit.retrogrades.includes('Mercury') &&
                  (locale === 'ko'
                    ? ' — 수성역행 중. 계약·통신·여행 한 번 더 점검.'
                    : ' — Mercury retrograde. Re-check contracts, comms, travel.')}
              </p>
            </div>
          )}

          {/* ── 28수 Lunar Mansion ───────────────────────────── */}
          {selectedDate?.lunarMansion && (
            <div className={styles.quickSummaryBlock}>
              <span className={styles.quickSummaryLabel}>
                🌙 {locale === 'ko' ? '28수' : 'Lunar Mansion'} ·{' '}
                <strong>
                  {selectedDate.lunarMansion.nameKo}수 ({selectedDate.lunarMansion.name})
                </strong>{' '}
                <span style={{ opacity: 0.7, fontWeight: 'normal' }}>
                  {selectedDate.lunarMansion.element} · {selectedDate.lunarMansion.animal} ·{' '}
                  {selectedDate.lunarMansion.isAuspicious ? '길수' : '흉수'}
                </span>
              </span>
              <ul style={{ margin: '8px 0 0', paddingLeft: 0, listStyle: 'none' }}>
                {selectedDate.lunarMansion.goodFor.length > 0 && (
                  <li style={{ padding: '4px 0', fontSize: '0.92em' }}>
                    · 좋음: {selectedDate.lunarMansion.goodFor.join(', ')}
                  </li>
                )}
                {selectedDate.lunarMansion.badFor.length > 0 && (
                  <li style={{ padding: '4px 0', fontSize: '0.92em' }}>
                    · 주의: {selectedDate.lunarMansion.badFor.join(', ')}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* ── Astro evidence ─────────────────────────────────── */}
          {safeAstroFactors.length > 0 && (
            <div className={styles.quickSummaryBlock}>
              <span className={styles.quickSummaryLabel}>
                ⭐ {locale === 'ko' ? '점성 근거' : 'Astrology Evidence'}
              </span>
              <ul style={{ margin: '8px 0 0', paddingLeft: 0, listStyle: 'none' }}>
                {safeAstroFactors.slice(0, 3).map((f, i) => (
                  <li key={i} style={{ padding: '4px 0', fontSize: '0.95em' }}>
                    · {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Cross agreement ────────────────────────────────── */}
          {crossAgreementPercent !== null && (
            <div className={styles.quickSummaryBlock}>
              <span className={styles.quickSummaryLabel}>
                ✅ {locale === 'ko' ? '교차 합의' : 'Cross Agreement'} ({crossAgreementPercent}%)
              </span>
              <p className={styles.quickSummaryText} style={{ marginTop: 4 }}>
                {crossAgreementVerdict}
              </p>
            </div>
          )}

          {/* ── Best times ─────────────────────────────────────── */}
          {normalizedBestTimes.length > 0 && (
            <div className={styles.quickSummaryBlock}>
              <span className={styles.quickSummaryLabel}>
                ⏰ {locale === 'ko' ? '좋은 시간' : 'Best Times'}
              </span>
              <ul style={{ margin: '8px 0 0', paddingLeft: 0, listStyle: 'none' }}>
                {normalizedBestTimes.slice(0, 3).map((t, i) => (
                  <li key={i} style={{ padding: '4px 0' }}>
                    ⭐ {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Caution / warnings ─────────────────────────────── */}
          {displayGrade >= 3 && safeWarnings.length > 0 && (
            <div className={styles.quickSummaryBlock}>
              <span className={styles.quickSummaryLabel}>
                ⚠ {locale === 'ko' ? '조심할 점' : 'Cautions'}
              </span>
              <ul style={{ margin: '8px 0 0', paddingLeft: 0, listStyle: 'none' }}>
                {safeWarnings.slice(0, 3).map((w, i) => (
                  <li key={i} style={{ padding: '4px 0' }}>
                    · {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Recommendations / advice ──────────────────────── */}
          {safeRecommendations.length > 0 && (
            <div className={styles.quickSummaryBlock}>
              <span className={styles.quickSummaryLabel}>
                💡 {locale === 'ko' ? '조언' : 'Advice'}
              </span>
              <ul style={{ margin: '8px 0 0', paddingLeft: 0, listStyle: 'none' }}>
                {safeRecommendations.slice(0, 3).map((r, i) => (
                  <li key={i} style={{ padding: '4px 0' }}>
                    {i + 1}. {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Mini meta: ganzhi + sun sign ──────────────────── */}
          {selectedDate.ganzhi && (
            <div className={styles.ganzhiBox}>
              <span className={styles.ganzhiLabel}>{termHelp.dayPillar}</span>
              <span className={styles.ganzhiValue}>{selectedDate.ganzhi}</span>
              {selectedDate.transitSunSign && (
                <>
                  <span className={styles.ganzhiDivider}>|</span>
                  <span className={styles.ganzhiLabel}>{locale === 'ko' ? '태양' : 'Sun'}</span>
                  <span className={styles.ganzhiValue}>{selectedDate.transitSunSign}</span>
                </>
              )}
            </div>
          )}

          {/* ── Add to calendar (existing button) ─────────────── */}
          {status === 'authenticated' && (
            <button
              className={styles.saveBtn}
              onClick={handleAddToCalendar}
              style={{ marginTop: 12, width: '100%' }}
            >
              📅 {locale === 'ko' ? '내 캘린더에 추가' : 'Add to my calendar'}
            </button>
          )}
        </div>
      ) : (
        <div className={styles.selectedDayContent}>
          <p>{locale === 'ko' ? '이 날짜에 대한 정보가 없습니다' : 'No info for this date'}</p>
        </div>
      )}
    </div>
  )
})

export default SelectedDatePanel
