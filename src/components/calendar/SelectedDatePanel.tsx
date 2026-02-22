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
  return deepRepairText(value).replace(/\s+/g, ' ').trim()
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
  if (!/[ÃÂðâ]/.test(firstPass)) {
    return firstPass
  }
  const decoded = decodeUtf8FromLatin1(firstPass)
  const secondPass = repairMojibakeText(decoded)
  return secondPass || firstPass
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

  const categoryLabels: Record<EventCategory, { ko: string; en: string }> = {
    wealth: { ko: '재물운', en: 'Wealth' },
    career: { ko: '커리어운', en: 'Career' },
    love: { ko: '연애운', en: 'Love' },
    health: { ko: '건강운', en: 'Health' },
    travel: { ko: '여행운', en: 'Travel' },
    study: { ko: '학업운', en: 'Study' },
    general: { ko: '전체운', en: 'General' },
  }

  const termHelp = {
    matrixBadge:
      locale === 'ko'
        ? 'matrix 기준 (여러 신호를 합친 종합 점수)'
        : 'Matrix-based (combined score from multiple signals)',
    crossBadge:
      locale === 'ko'
        ? '교차 검증 (사주+점성 결과가 같은 방향)'
        : 'Cross-verified (Saju + Astrology aligned)',
    cautionBadge:
      locale === 'ko' ? '주의 신호 (리스크 경고)' : 'Caution signal (risk warning)',
    sajuTitle:
      locale === 'ko'
        ? '사주 분석 (타고난 구조와 오늘의 흐름)'
        : 'Saju Analysis (natal pattern + today flow)',
    astroTitle:
      locale === 'ko'
        ? '점성 분석 (행성 움직임 기반)'
        : 'Astrology Analysis (planetary movement based)',
    dayPillar: locale === 'ko' ? '일주 (오늘의 핵심 기운)' : 'Day Pillar (today core energy)',
    bestTimes:
      locale === 'ko'
        ? '오늘의 좋은 시간 (중요 일정을 넣기 좋은 시간대)'
        : 'Best Times Today (better windows for key tasks)',
    dailyPeakTitle: locale === 'ko' ? '데일리 + 피크 윈도우 통합 해석' : 'Daily + Peak Window Insight',
  }

  const handleAddToCalendar = useCallback(() => {
    if (!selectedDate || !selectedDay) return

    const dateStr = selectedDate.date.replace(/-/g, '')
    const nextDay = new Date(selectedDay)
    nextDay.setDate(nextDay.getDate() + 1)
    const endStr = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, '0')}${String(nextDay.getDate()).padStart(2, '0')}`

    const title = selectedDate.title
    const categories = selectedDate.categories
      .map((cat) => (locale === 'ko' ? categoryLabels[cat].ko : categoryLabels[cat].en))
      .join(', ')

    const descParts = [
      selectedDate.description,
      categories ? `${locale === 'ko' ? '카테고리' : 'Categories'}: ${categories}` : '',
      `${locale === 'ko' ? '점수' : 'Score'}: ${selectedDate.score}/100`,
    ]

    if (selectedDate.recommendations.length > 0) {
      descParts.push(`${locale === 'ko' ? '추천' : 'Recommendations'}:`)
      selectedDate.recommendations.forEach((r) => descParts.push(`- ${r}`))
    }

    if (selectedDate.warnings.length > 0) {
      descParts.push(`${locale === 'ko' ? '주의' : 'Warnings'}:`)
      selectedDate.warnings.forEach((w) => descParts.push(`- ${w}`))
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
      `SUMMARY:${escapeICS(title)}`,
      `DESCRIPTION:${escapeICS(description)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const dataUri = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsContent)
    window.open(dataUri, '_blank')
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
      const domainLabel = domain || '전반'
      const timeLine = bestWindow
        ? `특히 ${bestWindow} 전후로 중요한 결정을 배치하시면 흐름을 타기 쉽습니다.`
        : '시간대를 고를 수 있다면 오전-오후 중 가장 집중이 잘 되는 구간에 핵심 일을 배치해 보세요.'

      if (selectedDate.grade >= 3) {
        return `${peakLabel}이지만 ${domainLabel} 영역에서는 주의 신호가 함께 보여 무리한 확장보다 손실 방어가 우선입니다. ${timeLine}`
      }
      return `${peakLabel}에서 ${domainLabel} 영역의 효율이 올라오는 날입니다. 속도를 올리되, 핵심 1~2개 과제에 집중할수록 체감 성과가 커집니다. ${timeLine}`
    }

    const peakLabel =
      peakLevel === 'peak' ? 'peak window' : peakLevel === 'high' ? 'rising window' : 'steady window'
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

  const evidenceAstroDetails = (selectedDate?.evidence?.cross?.astroDetails || [])
    .map((line) => parseAstroEvidenceLine(line))
    .filter(Boolean)
  const evidenceSajuDetails = (selectedDate?.evidence?.cross?.sajuDetails || [])
    .map((line) => normalizeEvidenceLine(line))
    .filter(Boolean)
  const evidenceBridges = (selectedDate?.evidence?.cross?.bridges || [])
    .map((line) => normalizeEvidenceLine(line))
    .filter(Boolean)

  return (
    <div className={`${styles.selectedDayInfo} ${styles.largeTextMode}`}>
      <div className={styles.selectedDayHeader}>
        <span className={styles.selectedDayDate}>
          {selectedDay.getMonth() + 1}/{selectedDay.getDate()}
          {locale === 'ko' && ` (${WEEKDAYS[selectedDay.getDay()]})`}
        </span>

        {resolvedPeakLevel && (
          <span className={styles.peakLevelChip}>
            {locale === 'ko' ? getPeakLabel(resolvedPeakLevel, 'ko') : getPeakLabel(resolvedPeakLevel, 'en')}
          </span>
        )}

        <div className={styles.headerActions}>
          {selectedDate && <span className={styles.selectedGrade}>{getGradeEmoji(selectedDate.grade)}</span>}

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
          <h3 className={styles.selectedTitle}>{deepRepairText(selectedDate.title)}</h3>

          {selectedDate.grade >= 3 && selectedDate.warnings.length > 0 && (
            <div className={`${styles.urgentWarningBox} ${selectedDate.grade === 4 ? styles.worstDay : ''}`}>
              <div className={styles.urgentWarningHeader}>
                <span className={styles.urgentWarningIcon}>{selectedDate.grade === 4 ? '\u{1F6A8}' : '\u26A0\uFE0F'}</span>
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
                {selectedDate.warnings.slice(0, 3).map((w, i) => (
                  <li key={i} className={styles.urgentWarningItem}>
                    <span className={styles.urgentWarningDot}>\u2022</span>
                    {deepRepairText(w)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedDate.crossVerified && selectedDate.grade <= 1 && (
            <div className={styles.crossVerifiedBadge}>
              <span className={styles.crossVerifiedIcon}>{'🔮'}</span>
              <span className={styles.crossVerifiedText}>
                {locale === 'ko' ? '사주 + 점성 교차 검증 완료' : 'Saju + Astrology Cross-verified'}
              </span>
            </div>
          )}

          {selectedDate.summary && (
            <div className={`${styles.summaryBox} ${selectedDate.grade >= 3 ? styles.summaryWarning : ''}`}>
              <p className={styles.summaryText}>{deepRepairText(selectedDate.summary)}</p>
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
                <li>{`Matrix: domain=${selectedDate.evidence.matrix.domain}, confidence=${selectedDate.evidence.confidence}%, score=${selectedDate.evidence.matrix.finalScoreAdjusted}`}</li>
                <li>
                  {`Cross set: Saju (${normalizeEvidenceLine(selectedDate.evidence.cross.sajuEvidence || 'n/a')}) / Astrology (${parseAstroEvidenceLine(selectedDate.evidence.cross.astroEvidence || 'n/a')})`}
                </li>
                {evidenceAstroDetails.map((line, idx) => (
                  <li key={`astro-${idx}`}>{line}</li>
                ))}
                {evidenceSajuDetails.map((line, idx) => (
                  <li key={`saju-${idx}`}>{line}</li>
                ))}
                {evidenceBridges.map((line, idx) => (
                  <li key={`bridge-${idx}`}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          <p className={styles.selectedDesc}>{deepRepairText(selectedDate.description)}</p>

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
                <span className={styles.bestTimesIcon}>\u23F0</span>
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
              {locale === 'ko' ? '점수' : 'Score'}: {selectedDate.score}/100
            </span>
          </div>

          {selectedDate.sajuFactors && selectedDate.sajuFactors.length > 0 && (
            <div className={styles.analysisSection}>
              <h4 className={styles.analysisTitle}>
                <span className={styles.analysisBadge}>\u263F\uFE0F</span>
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
                <span className={styles.analysisBadge}>{'🌟'}</span>
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
                <span className={styles.recommendationsIcon}>\u2728</span>
                {locale === 'ko' ? '오늘의 행운 키' : 'Lucky Keys'}
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
                <span className={styles.warningsIcon}>\u26A1</span>
                {locale === 'ko' ? '오늘의 주의보' : "Today's Alert"}
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
                <span>{locale === 'ko' ? '저장 중...' : 'Saving...'}</span>
              ) : isSaved ? (
                <>
                  <span>\u2605</span>
                  <span>{locale === 'ko' ? '저장됨 (클릭하여 삭제)' : 'Saved (click to remove)'}</span>
                </>
              ) : (
                <>
                  <span>\u2606</span>
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
            <span>{'📲'}</span>
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
