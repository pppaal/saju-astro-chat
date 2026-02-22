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
  return stripMatrixDomainText(deepRepairText(value)).replace(/\s+/g, ' ').trim()
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
    () => (selectedDate?.bestTimes || []).map((time) => deepRepairText(time)),
    [selectedDate?.bestTimes]
  )

  const categoryLabels = useMemo<Record<EventCategory, { ko: string; en: string }>>(
    () => ({
      wealth: { ko: 'ìž¬ë¬¼ìš´', en: 'Wealth' },
      career: { ko: 'ì»¤ë¦¬ì–´ìš´', en: 'Career' },
      love: { ko: 'ì—°ì• ìš´', en: 'Love' },
      health: { ko: 'ê±´ê°•ìš´', en: 'Health' },
      travel: { ko: 'ì—¬í–‰ìš´', en: 'Travel' },
      study: { ko: 'í•™ì—…ìš´', en: 'Study' },
      general: { ko: 'ì „ì²´ìš´', en: 'General' },
    }),
    []
  )

  const termHelp = {
    matrixBadge:
      locale === 'ko'
        ? 'ì¢…í•© ì‹ í˜¸ ê·¼ê±° (ì—¬ëŸ¬ ì‹ í˜¸ë¥¼ í•©ì¹œ ì ìˆ˜)'
        : 'Combined signal basis (multi-signal score)',
    crossBadge:
      locale === 'ko'
        ? 'êµì°¨ ê²€ì¦ (ì‚¬ì£¼+ì ì„± ê²°ê³¼ê°€ ê°™ì€ ë°©í–¥)'
        : 'Cross-verified (Saju + Astrology aligned)',
    cautionBadge:
      locale === 'ko' ? 'ì£¼ì˜ ì‹ í˜¸ (ë¦¬ìŠ¤í¬ ê²½ê³ )' : 'Caution signal (risk warning)',
    sajuTitle:
      locale === 'ko'
        ? 'ì‚¬ì£¼ ë¶„ì„ (íƒ€ê³ ë‚œ êµ¬ì¡°ì™€ ì˜¤ëŠ˜ì˜ íë¦„)'
        : 'Saju Analysis (natal pattern + today flow)',
    astroTitle:
      locale === 'ko'
        ? 'ì ì„± ë¶„ì„ (í–‰ì„± ì›€ì§ìž„ ê¸°ë°˜)'
        : 'Astrology Analysis (planetary movement based)',
    dayPillar:
      locale === 'ko' ? 'ì¼ì£¼ (ì˜¤ëŠ˜ì˜ í•µì‹¬ ê¸°ìš´)' : 'Day Pillar (today core energy)',
    bestTimes:
      locale === 'ko'
        ? 'ì˜¤ëŠ˜ì˜ ì¢‹ì€ ì‹œê°„ (ì¤‘ìš” ì¼ì •ì„ ë„£ê¸° ì¢‹ì€ ì‹œê°„ëŒ€)'
        : 'Best Times Today (better windows for key tasks)',
    dailyPeakTitle:
      locale === 'ko' ? 'ë°ì¼ë¦¬ + í”¼í¬ ìœˆë„ìš° í†µí•© í•´ì„' : 'Daily + Peak Window Insight',
  }

  const handleAddToCalendar = useCallback(async () => {
    if (!selectedDate || !selectedDay) return

    const dateStr = selectedDate.date.replace(/-/g, '')
    const nextDay = new Date(selectedDay)
    nextDay.setDate(nextDay.getDate() + 1)
    const endStr = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, '0')}${String(nextDay.getDate()).padStart(2, '0')}`

    const cleanedTitle = deepRepairText(stripMatrixDomainText(selectedDate.title))
    const categories = selectedDate.categories
      .map((cat) => {
        const label = categoryLabels[cat]
        return label ? (locale === 'ko' ? label.ko : label.en) : cat
      })
      .join(', ')

    const descParts = [
      deepRepairText(stripMatrixDomainText(selectedDate.description)),
      categories ? `${locale === 'ko' ? '카테고리' : 'Categories'}: ${categories}` : '',
      `${locale === 'ko' ? '점수' : 'Score'}: ${selectedDate.score}/100`,
    ]

    if (selectedDate.recommendations.length > 0) {
      descParts.push(`${locale === 'ko' ? '추천' : 'Recommendations'}:`)
      selectedDate.recommendations.forEach((r) =>
        descParts.push(`- ${deepRepairText(stripMatrixDomainText(r))}`)
      )
    }

    if (selectedDate.warnings.length > 0) {
      descParts.push(`${locale === 'ko' ? '주의' : 'Warnings'}:`)
      selectedDate.warnings.forEach((w) =>
        descParts.push(`- ${deepRepairText(stripMatrixDomainText(w))}`)
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
        peakLevel === 'peak'
          ? 'ê°•í•œ í”¼í¬ êµ¬ê°„'
          : peakLevel === 'high'
            ? 'ìƒìŠ¹ êµ¬ê°„'
            : 'ì•ˆì • êµ¬ê°„'
      const domainLabel = getDomainLabel(domain, 'ko')
      const timeLine = bestWindow
        ? `íŠ¹ížˆ ${bestWindow} ì „í›„ë¡œ ì¤‘ìš”í•œ ê²°ì •ì„ ë°°ì¹˜í•˜ì‹œë©´ íë¦„ì„ íƒ€ê¸° ì‰½ìŠµë‹ˆë‹¤.`
        : 'ì‹œê°„ëŒ€ë¥¼ ê³ ë¥¼ ìˆ˜ ìžˆë‹¤ë©´ ì˜¤ì „-ì˜¤í›„ ì¤‘ ê°€ìž¥ ì§‘ì¤‘ì´ ìž˜ ë˜ëŠ” êµ¬ê°„ì— í•µì‹¬ ì¼ì„ ë°°ì¹˜í•´ ë³´ì„¸ìš”.'

      if (selectedDate.grade >= 3) {
        return `${peakLabel}ì´ì§€ë§Œ ${domainLabel} ì˜ì—­ì—ì„œëŠ” ì£¼ì˜ ì‹ í˜¸ê°€ í•¨ê»˜ ë³´ì—¬ ë¬´ë¦¬í•œ í™•ìž¥ë³´ë‹¤ ì†ì‹¤ ë°©ì–´ê°€ ìš°ì„ ìž…ë‹ˆë‹¤. ${timeLine}`
      }
      return `${peakLabel}ì—ì„œ ${domainLabel} ì˜ì—­ì˜ íš¨ìœ¨ì´ ì˜¬ë¼ì˜¤ëŠ” ë‚ ìž…ë‹ˆë‹¤. ì†ë„ë¥¼ ì˜¬ë¦¬ë˜, í•µì‹¬ 1~2ê°œ ê³¼ì œì— ì§‘ì¤‘í• ìˆ˜ë¡ ì²´ê° ì„±ê³¼ê°€ ì»¤ì§‘ë‹ˆë‹¤. ${timeLine}`
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

  const evidenceBridges = (selectedDate?.evidence?.cross?.bridges || [])
    .map((line) => normalizeEvidenceLine(line))
    .filter(Boolean)

  const evidenceSummaryPrimary = selectedDate?.evidence
    ? locale === 'ko'
      ? `신호 신뢰도 ${selectedDate.evidence.confidence}% · 종합 점수 ${selectedDate.evidence.matrix.finalScoreAdjusted}점`
      : `Signal confidence ${selectedDate.evidence.confidence}% · Total score ${selectedDate.evidence.matrix.finalScoreAdjusted}`
    : ''

  const evidenceSummaryCross = selectedDate?.evidence
    ? locale === 'ko'
      ? `사주: ${normalizeEvidenceLine(selectedDate.evidence.cross.sajuEvidence || '정보 없음')} / 점성: ${parseAstroEvidenceLine(selectedDate.evidence.cross.astroEvidence || '정보 없음')}`
      : `Saju: ${normalizeEvidenceLine(selectedDate.evidence.cross.sajuEvidence || 'n/a')} / Astrology: ${parseAstroEvidenceLine(selectedDate.evidence.cross.astroEvidence || 'n/a')}`
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
                    ? 'ì €ìž¥ë¨ (í´ë¦­í•˜ì—¬ ì‚­ì œ)'
                    : 'Saved (click to remove)'
                  : locale === 'ko'
                    ? 'ì´ ë‚ ì§œ ì €ìž¥í•˜ê¸°'
                    : 'Save this date'
              }
              title={
                isSaved
                  ? locale === 'ko'
                    ? 'ì €ìž¥ë¨ (í´ë¦­í•˜ì—¬ ì‚­ì œ)'
                    : 'Saved (click to remove)'
                  : locale === 'ko'
                    ? 'ì´ ë‚ ì§œ ì €ìž¥í•˜ê¸°'
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
          <h3 className={styles.selectedTitle}>
            {deepRepairText(stripMatrixDomainText(selectedDate.title))}
          </h3>

          {selectedDate.grade >= 3 && selectedDate.warnings.length > 0 && (
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
                      ? 'ì˜¤ëŠ˜ ì£¼ì˜í•´ì•¼ í•  ì !'
                      : 'ì˜¤ëŠ˜ì˜ ì£¼ì˜ì‚¬í•­'
                    : selectedDate.grade === 4
                      ? 'Critical Warnings!'
                      : "Today's Cautions"}
                </span>
              </div>
              <ul className={styles.urgentWarningList}>
                {selectedDate.warnings.slice(0, 3).map((w, i) => (
                  <li key={i} className={styles.urgentWarningItem}>
                    <span className={styles.urgentWarningDot}>{'\u2022'}</span>
                    {deepRepairText(w)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedDate.crossVerified && selectedDate.grade <= 1 && (
            <div className={styles.crossVerifiedBadge}>
              <span className={styles.crossVerifiedIcon}>{'\u{1F52E}'}</span>
              <span className={styles.crossVerifiedText}>
                {locale === 'ko'
                  ? 'ì‚¬ì£¼ + ì ì„± êµì°¨ ê²€ì¦ ì™„ë£Œ'
                  : 'Saju + Astrology Cross-verified'}
              </span>
            </div>
          )}

          {selectedDate.summary && (
            <div
              className={`${styles.summaryBox} ${selectedDate.grade >= 3 ? styles.summaryWarning : ''}`}
            >
              <p className={styles.summaryText}>
                {deepRepairText(stripMatrixDomainText(selectedDate.summary))}
              </p>
            </div>
          )}

          {mergedTimingNarrative && (
            <div className={styles.dailyPeakBox}>
              <div className={styles.dailyPeakTitle}>{termHelp.dailyPeakTitle}</div>
              <p className={styles.dailyPeakText}>{deepRepairText(mergedTimingNarrative)}</p>
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

          <p className={styles.selectedDesc}>
            {deepRepairText(stripMatrixDomainText(selectedDate.description))}
          </p>

          {selectedDate.ganzhi && (
            <div className={styles.ganzhiBox}>
              <span className={styles.ganzhiLabel}>{termHelp.dayPillar}</span>
              <span className={styles.ganzhiValue}>{selectedDate.ganzhi}</span>
              {selectedDate.transitSunSign && (
                <>
                  <span className={styles.ganzhiDivider}>|</span>
                  <span className={styles.ganzhiLabel}>{locale === 'ko' ? 'íƒœì–‘' : 'Sun'}</span>
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
                    {deepRepairText(time)}
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
              {locale === 'ko' ? 'ì ìˆ˜' : 'Score'}: {selectedDate.score}/100
            </span>
          </div>

          {selectedDate.sajuFactors && selectedDate.sajuFactors.length > 0 && (
            <div className={styles.analysisSection}>
              <h4 className={styles.analysisTitle}>
                <span className={styles.analysisBadge}>{'\u263F\uFE0F'}</span>
                {termHelp.sajuTitle}
              </h4>
              <ul className={styles.analysisList}>
                {selectedDate.sajuFactors.slice(0, 4).map((factor, i) => (
                  <li key={i} className={styles.analysisItem}>
                    <span className={styles.analysisDotSaju}></span>
                    {deepRepairText(factor)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedDate.astroFactors && selectedDate.astroFactors.length > 0 && (
            <div className={styles.analysisSection}>
              <h4 className={styles.analysisTitle}>
                <span className={styles.analysisBadge}>{'\u{1F31F}'}</span>
                {termHelp.astroTitle}
              </h4>
              <ul className={styles.analysisList}>
                {selectedDate.astroFactors.slice(0, 4).map((factor, i) => (
                  <li key={i} className={styles.analysisItem}>
                    <span className={styles.analysisDotAstro}></span>
                    {deepRepairText(factor)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedDate.recommendations.length > 0 && (
            <div className={styles.recommendationsSection}>
              <h4 className={styles.recommendationsTitle}>
                <span className={styles.recommendationsIcon}>{'\u2728'}</span>
                {locale === 'ko' ? 'ì˜¤ëŠ˜ì˜ í–‰ìš´ í‚¤' : 'Lucky Keys'}
              </h4>
              <div className={styles.recommendationsGrid}>
                {selectedDate.recommendations.slice(0, 4).map((r, i) => (
                  <div key={i} className={styles.recommendationCard}>
                    <span className={styles.recommendationNumber}>{i + 1}</span>
                    <span className={styles.recommendationText}>{deepRepairText(r)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDate.warnings.length > 0 && selectedDate.grade < 3 && (
            <div className={styles.warningsSection}>
              <h4 className={styles.warningsTitle}>
                <span className={styles.warningsIcon}>{'\u26A1'}</span>
                {locale === 'ko' ? 'ì˜¤ëŠ˜ì˜ ì£¼ì˜ë³´' : "Today's Alert"}
              </h4>
              <ul className={styles.warningsList}>
                {selectedDate.warnings.slice(0, 3).map((w, i) => (
                  <li key={i} className={styles.warningItem}>
                    <span className={styles.warningDot}></span>
                    {deepRepairText(w)}
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
                <span>{locale === 'ko' ? 'ì €ìž¥ ì¤‘...' : 'Saving...'}</span>
              ) : isSaved ? (
                <>
                  <span>{'\u2605'}</span>
                  <span>
                    {locale === 'ko' ? 'ì €ìž¥ë¨ (í´ë¦­í•˜ì—¬ ì‚­ì œ)' : 'Saved (click to remove)'}
                  </span>
                </>
              ) : (
                <>
                  <span>{'\u2606'}</span>
                  <span>{locale === 'ko' ? 'ì´ ë‚ ì§œ ì €ìž¥í•˜ê¸°' : 'Save this date'}</span>
                </>
              )}
            </button>
          )}

          <button
            className={styles.calendarSyncBtn}
            onClick={handleAddToCalendar}
            aria-label={locale === 'ko' ? 'íœ´ëŒ€í° ìº˜ë¦°ë”ì— ì¶”ê°€' : 'Add to phone calendar'}
          >
            <span>{'\u{1F4F2}'}</span>
            <span>{locale === 'ko' ? 'ìº˜ë¦°ë”ì— ì¶”ê°€' : 'Add to Calendar'}</span>
          </button>
        </div>
      ) : (
        <div className={styles.noInfo}>
          <p>
            {locale === 'ko'
              ? 'ì´ ë‚ ì§œì— ëŒ€í•œ ì •ë³´ê°€ ì—†ìŠµë‹ˆë‹¤'
              : 'No info for this date'}
          </p>
        </div>
      )}
    </div>
  )
})

export default SelectedDatePanel
