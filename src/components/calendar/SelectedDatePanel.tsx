'use client'

import React, { memo, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './DestinyCalendar.module.css'
import { getPeakLabel, resolvePeakLevel } from './peakUtils'
import { repairMojibakeText } from '@/lib/text/mojibake'

type EventCategory = 'wealth' | 'career' | 'love' | 'health' | 'travel' | 'study' | 'general'
type ImportanceGrade = 0 | 1 | 2 | 3 | 4

interface ImportantDate {
  date: string
  grade: ImportanceGrade
  score: number
  categories: EventCategory[]
  title: string
  description: string
  summary?: string
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
    source: 'rule' | 'rag' | 'hybrid'
  }
  ganzhi?: string
  transitSunSign?: string
  crossVerified?: boolean
}

interface SelectedDatePanelProps {
  selectedDay: Date | null
  selectedDate: ImportantDate | null
  savedDates: Set<string>
  saving: boolean
  saveMsg: string | null
  onSave: () => void
  onUnsave: () => void
  getGradeEmoji: (grade: number) => string
  getScoreClass: (score: number) => string
}

const CATEGORY_EMOJI: Record<EventCategory, string> = {
  wealth: '\u{1F4B0}',
  career: '\u{1F4BC}',
  love: '\u{1F495}',
  health: '\u{1F4AA}',
  travel: '\u2708\uFE0F',
  study: '\u{1F4DA}',
  general: '\u2B50',
}

const WEEKDAYS_KO = ['\uC77C', '\uC6D4', '\uD654', '\uC218', '\uBAA9', '\uAE08', '\uD1A0']
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function normalizeEvidenceLine(value: string): string {
  if (!value) return ''
  const normalized = stripMatrixDomainText(deepRepairText(value)).replace(/\s+/g, ' ').trim()
  return isUnreadableText(normalized) ? '' : normalized
}

function decodeUtf8FromLatin1(value: string): string {
  try {
    const bytes = Uint8Array.from([...value].map((ch) => ch.charCodeAt(0) & 0xff))
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  } catch {
    return value
  }
}

function deepRepairText(value: string): string {
  const firstPass = repairMojibakeText(value || '')
  if (!/[ÃƒÃ‚Ã°Ã¢]/.test(firstPass)) {
    return decodeBareUnicodeTokens(decodeUnicodeEscapes(firstPass))
  }
  const decoded = decodeUtf8FromLatin1(firstPass)
  const secondPass = repairMojibakeText(decoded)
  return decodeBareUnicodeTokens(decodeUnicodeEscapes(secondPass || firstPass))
}

function decodeUnicodeEscapes(value: string): string {
  if (!value || value.indexOf('\\u') === -1) return value

  return value
    .replace(/\\u\{([0-9A-Fa-f]{1,6})\}/g, (raw, hex: string) => {
      const codePoint = Number.parseInt(hex, 16)
      if (!Number.isFinite(codePoint)) return raw
      try {
        return String.fromCodePoint(codePoint)
      } catch {
        return raw
      }
    })
    .replace(/\\u([0-9A-Fa-f]{4})/g, (raw, hex: string) => {
      const codePoint = Number.parseInt(hex, 16)
      if (!Number.isFinite(codePoint)) return raw
      return String.fromCharCode(codePoint)
    })
}

function decodeBareUnicodeTokens(value: string): string {
  if (!value || !/\bu[0-9A-Fa-f]{4,6}\b/.test(value)) return value
  return value.replace(/\bu([0-9A-Fa-f]{4,6})\b/g, (raw, hex: string) => {
    const codePoint = Number.parseInt(hex, 16)
    if (!Number.isFinite(codePoint)) return raw
    try {
      return String.fromCodePoint(codePoint)
    } catch {
      return raw
    }
  })
}

function stripMatrixDomainText(value: string): string {
  if (!value) return ''
  return value
    .replace(/\bmatrix\s*:\s*/gi, '')
    .replace(/\bmatrix\s*domain\s*=\s*[^,|)\]]+/gi, '')
    .replace(/\bmatrix\s*domain\s*:\s*[^,|)\]]+/gi, '')
    .replace(/\bdomain\s*=\s*[^,|)\]]+/gi, '')
    .replace(/\bdomain\s*:\s*[^,|)\]]+/gi, '')
    .replace(/\bmatrix\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,|:;\-]+|[\s,|:;\-]+$/g, '')
}

function isUnreadableText(value: string): boolean {
  if (!value) return true
  if (value.includes('\uFFFD')) return true
  const suspiciousMatches = value.match(/[ÃÂâìëêíð]/g) || []
  if (suspiciousMatches.length >= 3) return true
  return suspiciousMatches.length / Math.max(1, value.length) > 0.15
}

function safeDisplayText(value: string | null | undefined, fallback = ''): string {
  if (!value) return fallback
  const normalized = stripMatrixDomainText(deepRepairText(value)).replace(/\s+/g, ' ').trim()
  if (!normalized) return fallback
  return isUnreadableText(normalized) ? fallback : normalized
}

function getDomainLabel(
  domain: 'career' | 'love' | 'money' | 'health' | 'move' | 'general' | undefined,
  locale: 'ko' | 'en'
): string {
  const labels = {
    ko: {
      career: '직장/커리어',
      love: '관계/연애',
      money: '재물/금전',
      health: '건강',
      move: '이동/변화',
      general: '전반',
    },
    en: {
      career: 'career',
      love: 'relationships',
      money: 'finance',
      health: 'health',
      move: 'movement/change',
      general: 'overall',
    },
  } as const

  const key = (domain || 'general') as keyof (typeof labels)['ko']
  return labels[locale][key]
}

function parseAstroEvidenceLine(value: string): string {
  const line = normalizeEvidenceLine(value)
  if (!line) return ''

  const angle = line.match(/angle=([0-9.]+)deg/i)?.[1]
  const orb = line.match(/orb=([0-9.]+)deg/i)?.[1]
  const allowedRaw = line.match(/allowed=([^|]+)/i)?.[1]?.trim()
  const pair = line.match(/pair=([a-z_]+)/i)?.[1]?.replace(/_/g, ' ')

  if (!angle && !orb && !allowedRaw && !pair) return line

  const allowed = allowedRaw?.replace(/\s*,\s*/g, ', ')

  return [
    pair ? `pair: ${pair}` : '',
    angle ? `angle: ${angle}\u00B0` : '',
    orb ? `orb: ${orb}\u00B0` : '',
    allowed ? `allow: ${allowed}` : '',
  ]
    .filter(Boolean)
    .join(' | ')
}

const SelectedDatePanel = memo(function SelectedDatePanel({
  selectedDay,
  selectedDate,
  savedDates,
  saving,
  saveMsg,
  onSave,
  onUnsave,
  getGradeEmoji,
  getScoreClass,
}: SelectedDatePanelProps) {
  const { locale } = useI18n()
  const { status } = useSession()
  const WEEKDAYS = locale === 'ko' ? WEEKDAYS_KO : WEEKDAYS_EN

  const normalizedBestTimes = useMemo(
    () => (selectedDate?.bestTimes || []).map((time) => safeDisplayText(time)).filter(Boolean),
    [selectedDate?.bestTimes]
  )

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
    matrixBadge:
      locale === 'ko'
        ? '\uC885\uD569 \uC2E0\uD638 \uADFC\uAC70 (\uC5EC\uB7EC \uC2E0\uD638\uB97C \uD569\uCE5C \uC810\uC218)'
        : 'Combined signal basis (multi-signal score)',
    crossBadge:
      locale === 'ko'
        ? '\uAD50\uCC28 \uAC80\uC99D (\uC0AC\uC8FC+\uC810\uC131 \uACB0\uACFC\uAC00 \uAC19\uC740 \uBC29\uD5A5)'
        : 'Cross-verified (Saju + Astrology aligned)',
    cautionBadge:
      locale === 'ko'
        ? '\uC8FC\uC758 \uC2E0\uD638 (\uB9AC\uC2A4\uD06C \uACBD\uACE0)'
        : 'Caution signal (risk warning)',
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
    bestTimes:
      locale === 'ko'
        ? '\uC624\uB298\uC758 \uC88B\uC740 \uC2DC\uAC04 (\uC911\uC694 \uC77C\uC815\uC744 \uB123\uAE30 \uC88B\uC740 \uC2DC\uAC04\uB300)'
        : 'Best Times Today (better windows for key tasks)',
    dailyPeakTitle:
      locale === 'ko'
        ? '\uB370\uC77C\uB9AC + \uD53C\uD06C \uC708\uB3C4\uC6B0 \uD1B5\uD569 \uD574\uC11D'
        : 'Daily + Peak Window Insight',
  }

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
      `${locale === 'ko' ? '점수' : 'Score'}: ${selectedDate.score}/100`,
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
  }, [selectedDate, selectedDay, locale, categoryLabels])

  if (!selectedDay) return null

  const resolvedPeakLevel = selectedDate
    ? resolvePeakLevel(selectedDate.evidence?.matrix?.peakLevel, selectedDate.score)
    : null

  const mergedTimingNarrative = (() => {
    if (!selectedDate) return ''

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

      if (selectedDate.grade >= 3) {
        return `${peakLabel}이지만 ${domainLabel} 영역에서는 주의 신호가 함께 보여 무리한 확장보다 손실 방어가 우선입니다. ${timeLine}`
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

    if (selectedDate.grade >= 3) {
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
  const safeSummary = safeDisplayText(selectedDate?.summary, '')
  const safeDescription = safeDisplayText(
    selectedDate?.description,
    locale === 'ko' ? '세부 설명을 불러오는 중입니다.' : 'Detailed explanation is loading.'
  )
  const safeNarrative = safeDisplayText(mergedTimingNarrative, '')
  const safeWarnings = (selectedDate?.warnings || [])
    .map((line) => safeDisplayText(line))
    .filter(Boolean)
  const safeRecommendations = (selectedDate?.recommendations || [])
    .map((line) => safeDisplayText(line))
    .filter(Boolean)
  const safeSajuFactors = (selectedDate?.sajuFactors || [])
    .map((line) => safeDisplayText(line))
    .filter(Boolean)
  const safeAstroFactors = (selectedDate?.astroFactors || [])
    .map((line) => safeDisplayText(line))
    .filter(Boolean)

  const evidenceBridges = (selectedDate?.evidence?.cross?.bridges || [])
    .map((line) => normalizeEvidenceLine(line))
    .filter(Boolean)

  const evidenceSummaryPrimary = selectedDate?.evidence
    ? locale === 'ko'
      ? `신호 신뢰도 ${selectedDate.evidence.confidence}% · 종합 점수 ${selectedDate.evidence.matrix.finalScoreAdjusted}점 · 핵심 영역 ${getDomainLabel(selectedDate.evidence.matrix.domain, 'ko')}`
      : `Signal confidence ${selectedDate.evidence.confidence}% · Total score ${selectedDate.evidence.matrix.finalScoreAdjusted} · Core domain ${getDomainLabel(selectedDate.evidence.matrix.domain, 'en')}`
    : ''

  const sajuCrossLine =
    normalizeEvidenceLine(selectedDate?.evidence?.cross?.sajuEvidence || '') ||
    (locale === 'ko' ? '사주 일진 신호 반영' : 'Saju daily-pillar signal reflected')
  const astroCrossLine =
    parseAstroEvidenceLine(selectedDate?.evidence?.cross?.astroEvidence || '') ||
    (locale === 'ko' ? '점성 트랜짓 신호 반영' : 'Astrology transit signal reflected')

  const evidenceSummaryCross = selectedDate?.evidence
    ? locale === 'ko'
      ? `사주: ${sajuCrossLine} / 점성: ${astroCrossLine}`
      : `Saju: ${sajuCrossLine} / Astrology: ${astroCrossLine}`
    : ''

  const evidenceBridgeSummary =
    evidenceBridges.length > 0
      ? locale === 'ko'
        ? `핵심 결론: ${evidenceBridges[0]}`
        : `Key takeaway: ${evidenceBridges[0]}`
      : ''

  return (
    <div className={`${styles.selectedDayInfo} ${styles.largeTextMode}`}>
      <div className={styles.selectedDayHeader}>
        <span className={styles.selectedDayDate}>
          {selectedDay.getMonth() + 1}/{selectedDay.getDate()}
          {locale === 'ko' && ` (${WEEKDAYS[selectedDay.getDay()]})`}
        </span>

        {resolvedPeakLevel && (
          <span className={styles.peakLevelChip}>
            {locale === 'ko'
              ? getPeakLabel(resolvedPeakLevel, 'ko')
              : getPeakLabel(resolvedPeakLevel, 'en')}
          </span>
        )}

        <div className={styles.headerActions}>
          {selectedDate && (
            <span className={styles.selectedGrade}>{getGradeEmoji(selectedDate.grade)}</span>
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
              title={
                isSaved
                  ? locale === 'ko'
                    ? '저장됨 (클릭하여 삭제)'
                    : 'Saved (click to remove)'
                  : locale === 'ko'
                    ? '이 날짜 저장하기'
                    : 'Save this date'
              }
            >
              {saving ? '...' : isSaved ? '\u2605' : '\u2606'}
            </button>
          )}
        </div>
      </div>

      {saveMsg && <div className={styles.saveMsg}>{saveMsg}</div>}

      {selectedDate ? (
        <div className={styles.selectedDayContent}>
          <h3 className={styles.selectedTitle}>{safeTitle}</h3>

          {selectedDate.grade >= 3 && safeWarnings.length > 0 && (
            <div
              className={`${styles.urgentWarningBox} ${selectedDate.grade === 4 ? styles.worstDay : ''}`}
            >
              <div className={styles.urgentWarningHeader}>
                <span className={styles.urgentWarningIcon}>
                  {selectedDate.grade === 4 ? '\u{1F6A8}' : '\u26A0\uFE0F'}
                </span>
                <span className={styles.urgentWarningTitle}>
                  {locale === 'ko'
                    ? selectedDate.grade === 4
                      ? '오늘 주의해야 할 점!'
                      : '오늘의 주의사항'
                    : selectedDate.grade === 4
                      ? 'Critical Warnings!'
                      : "Today's Cautions"}
                </span>
              </div>
              <ul className={styles.urgentWarningList}>
                {safeWarnings.slice(0, 3).map((w, i) => (
                  <li key={i} className={styles.urgentWarningItem}>
                    <span className={styles.urgentWarningDot}>{'\u2022'}</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedDate.crossVerified && selectedDate.grade <= 1 && (
            <div className={styles.crossVerifiedBadge}>
              <span className={styles.crossVerifiedIcon}>{'\u{1F52E}'}</span>
              <span className={styles.crossVerifiedText}>
                {locale === 'ko' ? '사주 + 점성 교차 검증 완료' : 'Saju + Astrology Cross-verified'}
              </span>
            </div>
          )}

          {safeSummary && (
            <div
              className={`${styles.summaryBox} ${selectedDate.grade >= 3 ? styles.summaryWarning : ''}`}
            >
              <p className={styles.summaryText}>{safeSummary}</p>
            </div>
          )}

          {safeNarrative && (
            <div className={styles.dailyPeakBox}>
              <div className={styles.dailyPeakTitle}>{termHelp.dailyPeakTitle}</div>
              <p className={styles.dailyPeakText}>{safeNarrative}</p>
            </div>
          )}

          {selectedDate.evidence && (
            <div className={styles.calendarEvidenceBox}>
              <div className={styles.calendarEvidenceBadges}>
                <span className={styles.calendarEvidenceBadge}>{termHelp.matrixBadge}</span>
                <span className={styles.calendarEvidenceBadge}>{termHelp.crossBadge}</span>
                <span className={styles.calendarEvidenceBadge}>{termHelp.cautionBadge}</span>
              </div>
              <ul className={styles.calendarEvidenceList}>
                {evidenceSummaryPrimary && <li>{evidenceSummaryPrimary}</li>}
                {evidenceSummaryCross && <li>{evidenceSummaryCross}</li>}
                {evidenceBridgeSummary && <li>{evidenceBridgeSummary}</li>}
              </ul>
            </div>
          )}

          <p className={styles.selectedDesc}>{safeDescription}</p>

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

          {normalizedBestTimes.length > 0 && (
            <div className={styles.bestTimesBox}>
              <h4 className={styles.bestTimesTitle}>
                <span className={styles.bestTimesIcon}>{'\u23F0'}</span>
                {termHelp.bestTimes}
              </h4>
              <div className={styles.bestTimesList}>
                {normalizedBestTimes.map((time, i) => (
                  <span key={i} className={styles.bestTimeItem}>
                    <span className={styles.bestTimeNumber}>{i + 1}</span>
                    {time}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className={styles.selectedCategories}>
            {selectedDate.categories.map((cat) => (
              <span key={cat} className={`${styles.categoryTag} ${styles[cat]}`}>
                {CATEGORY_EMOJI[cat]} {getCategoryLabel(cat)}
              </span>
            ))}
          </div>

          <div className={styles.scoreWrapper}>
            <div className={styles.scoreBar}>
              <div
                className={`${styles.scoreFill} ${getScoreClass(selectedDate.score)}`}
                style={{ width: `${selectedDate.score}%` }}
              />
            </div>
            <span className={styles.scoreText}>
              {locale === 'ko' ? '점수' : 'Score'}: {selectedDate.score}/100
            </span>
          </div>

          {safeSajuFactors.length > 0 && (
            <div className={styles.analysisSection}>
              <h4 className={styles.analysisTitle}>
                <span className={styles.analysisBadge}>{'\u263F\uFE0F'}</span>
                {termHelp.sajuTitle}
              </h4>
              <ul className={styles.analysisList}>
                {safeSajuFactors.slice(0, 4).map((factor, i) => (
                  <li key={i} className={styles.analysisItem}>
                    <span className={styles.analysisDotSaju}></span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {safeAstroFactors.length > 0 && (
            <div className={styles.analysisSection}>
              <h4 className={styles.analysisTitle}>
                <span className={styles.analysisBadge}>{'\u{1F31F}'}</span>
                {termHelp.astroTitle}
              </h4>
              <ul className={styles.analysisList}>
                {safeAstroFactors.slice(0, 4).map((factor, i) => (
                  <li key={i} className={styles.analysisItem}>
                    <span className={styles.analysisDotAstro}></span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {safeRecommendations.length > 0 && (
            <div className={styles.recommendationsSection}>
              <h4 className={styles.recommendationsTitle}>
                <span className={styles.recommendationsIcon}>{'\u2728'}</span>
                {locale === 'ko' ? '오늘의 행운 키' : 'Lucky Keys'}
              </h4>
              <div className={styles.recommendationsGrid}>
                {safeRecommendations.slice(0, 4).map((r, i) => (
                  <div key={i} className={styles.recommendationCard}>
                    <span className={styles.recommendationNumber}>{i + 1}</span>
                    <span className={styles.recommendationText}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {safeWarnings.length > 0 && selectedDate.grade < 3 && (
            <div className={styles.warningsSection}>
              <h4 className={styles.warningsTitle}>
                <span className={styles.warningsIcon}>{'\u26A1'}</span>
                {locale === 'ko' ? '\uC624\uB298\uC758 \uC8FC\uC758\uBCF4' : "Today's Alert"}
              </h4>
              <ul className={styles.warningsList}>
                {safeWarnings.slice(0, 3).map((w, i) => (
                  <li key={i} className={styles.warningItem}>
                    <span className={styles.warningDot}></span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status === 'authenticated' && (
            <button
              className={`${styles.saveBtnLarge} ${isSaved ? styles.saved : ''}`}
              onClick={isSaved ? onUnsave : onSave}
              disabled={saving}
            >
              {saving ? (
                <span>{locale === 'ko' ? '저장 중...' : 'Saving...'}</span>
              ) : isSaved ? (
                <>
                  <span>{'\u2605'}</span>
                  <span>
                    {locale === 'ko' ? '저장됨 (클릭하여 삭제)' : 'Saved (click to remove)'}
                  </span>
                </>
              ) : (
                <>
                  <span>{'\u2606'}</span>
                  <span>{locale === 'ko' ? '이 날짜 저장하기' : 'Save this date'}</span>
                </>
              )}
            </button>
          )}

          <button
            className={styles.calendarSyncBtn}
            onClick={handleAddToCalendar}
            aria-label={locale === 'ko' ? '휴대폰 캘린더에 추가' : 'Add to phone calendar'}
          >
            <span>{'\u{1F4F2}'}</span>
            <span>{locale === 'ko' ? '캘린더에 추가' : 'Add to Calendar'}</span>
          </button>
        </div>
      ) : (
        <div className={styles.noInfo}>
          <p>{locale === 'ko' ? '이 날짜에 대한 정보가 없습니다' : 'No info for this date'}</p>
        </div>
      )}
    </div>
  )
})

export default SelectedDatePanel
