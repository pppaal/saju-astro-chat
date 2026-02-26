'use client'

import React, { memo, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './DestinyCalendar.module.css'
import { getPeakLabel, resolvePeakLevel } from './peakUtils'
import { repairMojibakeText } from '@/lib/text/mojibake'
import {
  EVIDENCE_CONFIDENCE_THRESHOLDS,
  getDisplayGradeFromScore,
  getDisplayLabelFromScore,
} from '@/lib/destiny-map/calendar/scoring-config'

type EventCategory = 'wealth' | 'career' | 'love' | 'health' | 'travel' | 'study' | 'general'
type ImportanceGrade = 0 | 1 | 2 | 3 | 4

interface ImportantDate {
  date: string
  grade: ImportanceGrade
  score: number
  rawScore?: number
  adjustedScore?: number
  displayScore?: number
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
    crossAgreementPercent?: number
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

function getReliabilityBand(confidence: number | undefined): 'low' | 'medium' | 'high' {
  if (typeof confidence !== 'number') return 'medium'
  if (confidence < EVIDENCE_CONFIDENCE_THRESHOLDS.low) return 'low'
  if (confidence < EVIDENCE_CONFIDENCE_THRESHOLDS.medium) return 'medium'
  return 'high'
}

function getReliabilityLabel(confidence: number | undefined, locale: 'ko' | 'en'): string {
  const band = getReliabilityBand(confidence)
  if (locale === 'ko') {
    if (band === 'high') return '높음'
    if (band === 'medium') return '중간'
    return '낮음'
  }
  if (band === 'high') return 'High'
  if (band === 'medium') return 'Medium'
  return 'Low'
}

function softenDecisionTone(value: string, locale: 'ko' | 'en'): string {
  const line = safeDisplayText(value)
  if (!line) return ''

  if (locale === 'ko') {
    return line
      .replace(/1년에 몇 번 없는/gi, '드문 편인')
      .replace(/최고의 날/gi, '유리한 흐름')
      .replace(/완벽한 타이밍/gi, '검토 후 진행하기 좋은 타이밍')
      .replace(/결혼 결정/gi, '관계 관련 대화')
      .replace(/프로포즈/gi, '중요한 감정 표현')
      .replace(/오늘로 잡으세요/gi, '우선 검토해 보세요')
      .replace(/지금 결정/gi, '재확인 후 결정')
  }

  return line
    .replace(/best day/gi, 'favorable timing')
    .replace(/perfect timing/gi, 'a good time to review and act')
    .replace(/decide now/gi, 'confirm once more before deciding')
}

function toUserFacingEvidenceLine(
  value: string,
  source: 'saju' | 'astro' | 'bridge',
  locale: 'ko' | 'en'
): string {
  const normalized = normalizeEvidenceLine(value)
  if (!normalized) return ''

  const stripped = normalized
    .replace(/\(([AS]\d+)\)\s*/gi, '')
    .replace(/\b[AS]\d+\s*[↔\-]{1,2}\s*[AS]\d+\b[:：]?\s*/gi, '')
    .replace(/\b[AS]\d+\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const hasTechnicalPayload =
    /(pair=|angle=|orb=|allowed=|dayMaster=|geokguk=|yongsin=|sibsin=|daeun=|saeun=|profile=|matrix=|overlap=|orbFit=|set\s*\d+)/i.test(
      normalized
    )

  if (hasTechnicalPayload) {
    if (locale === 'ko') {
      if (source === 'saju') return '사주 흐름에서 말과 약속의 균형을 점검하면 안정적입니다.'
      if (source === 'astro')
        return '점성 흐름에서 감정 반응이 커질 수 있어 속도 조절이 유리합니다.'
      return '사주와 점성 신호를 함께 보면 방향은 비슷하지만 재확인이 중요합니다.'
    }
    if (source === 'saju') return 'Saju signals suggest checking communication and commitments.'
    if (source === 'astro') return 'Astrology signals suggest pacing emotional reactions.'
    return 'Saju and astrology are broadly aligned, but confirmation still helps.'
  }

  return stripped
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
  const displayGrade = getDisplayGradeFromScore(displayScore)

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
  const safeSummary = softenDecisionTone(safeDisplayText(selectedDate?.summary, ''), locale)
  const safeDescription = softenDecisionTone(
    safeDisplayText(
      selectedDate?.description,
      locale === 'ko' ? '세부 설명을 불러오는 중입니다.' : 'Detailed explanation is loading.'
    ),
    locale
  )
  const safeNarrative = softenDecisionTone(safeDisplayText(mergedTimingNarrative, ''), locale)
  const safeWarnings = (selectedDate?.warnings || [])
    .map((line) => softenDecisionTone(line, locale))
    .filter(Boolean)
  const safeRecommendations = (selectedDate?.recommendations || [])
    .map((line) => softenDecisionTone(line, locale))
    .filter(Boolean)
  const safeSajuFactors = (selectedDate?.sajuFactors || [])
    .map((line) => softenDecisionTone(line, locale))
    .filter(Boolean)
  const safeAstroFactors = (selectedDate?.astroFactors || [])
    .map((line) => softenDecisionTone(line, locale))
    .filter(Boolean)

  const evidenceBridges = (selectedDate?.evidence?.cross?.bridges || [])
    .map((line) => toUserFacingEvidenceLine(line, 'bridge', locale))
    .filter(Boolean)

  const unifiedDayLabel = selectedDate ? getDisplayLabelFromScore(displayScore, locale) : ''
  const reliabilityLabel = selectedDate
    ? getReliabilityLabel(selectedDate.evidence?.confidence, locale)
    : ''
  const domainLabel = selectedDate
    ? getDomainLabel(selectedDate.evidence?.matrix.domain, locale)
    : locale === 'ko'
      ? '전반'
      : 'overall'

  const evidenceSummaryPrimary = selectedDate?.evidence
    ? locale === 'ko'
      ? `오늘 등급 ${unifiedDayLabel} · 점수 ${displayScore}/100 · 핵심 분야 ${domainLabel}`
      : `Today rating ${unifiedDayLabel} · Score ${displayScore}/100 · Focus ${domainLabel}`
    : ''

  const sajuCrossLine =
    toUserFacingEvidenceLine(selectedDate?.evidence?.cross?.sajuEvidence || '', 'saju', locale) ||
    (locale === 'ko' ? '사주 일진 신호 반영' : 'Saju daily-pillar signal reflected')
  const astroCrossLine =
    toUserFacingEvidenceLine(selectedDate?.evidence?.cross?.astroEvidence || '', 'astro', locale) ||
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

  const evidenceScoreLine = (() => {
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

  const quickThesis = (() => {
    if (!selectedDate) return ''
    if (locale === 'ko') {
      return `${domainLabel} 흐름은 ${unifiedDayLabel}이고, 말·약속은 한 번 더 확인하는 편이 좋습니다.`
    }
    return `Flow is ${unifiedDayLabel.toLowerCase()} for ${domainLabel}; verify communication and commitments once more.`
  })()

  const quickDos =
    safeRecommendations.slice(0, 3).length > 0
      ? safeRecommendations.slice(0, 3)
      : locale === 'ko'
        ? ['연락이나 협의를 먼저 시작해 보세요.', '중요 문서나 할 일을 1건 정리해 보세요.']
        : ['Start one outreach or coordination task.', 'Close one important document or task.']

  const quickDonts =
    safeWarnings.slice(0, 2).length > 0
      ? safeWarnings.slice(0, 2)
      : locale === 'ko'
        ? ['계약이나 큰 결정은 재확인 후 진행하세요.']
        : ['Recheck contracts or major decisions before finalizing.']

  const quickWindows =
    normalizedBestTimes.slice(0, 2).length > 0
      ? normalizedBestTimes.slice(0, 2)
      : locale === 'ko'
        ? ['집중 가능한 시간대 1개를 먼저 확보하세요.']
        : ['Secure one focused time block first.']

  const detailInsight = [safeSummary, safeNarrative, safeDescription].find(Boolean) || ''

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

          <div className={styles.quickScanCard}>
            <p className={styles.quickScanThesis}>{quickThesis}</p>

            <div className={styles.quickScanMeta}>
              <span className={styles.quickMetaChip}>
                {locale === 'ko' ? '오늘 등급' : 'Today'}: {unifiedDayLabel}
              </span>
              <span className={styles.quickMetaChip}>
                {locale === 'ko' ? '핵심 분야' : 'Focus'}: {domainLabel}
              </span>
              <span className={styles.quickMetaChip}>
                {locale === 'ko' ? '신뢰' : 'Reliability'}: {reliabilityLabel}
              </span>
            </div>

            <div className={styles.quickActionGrid}>
              <div className={styles.quickActionBlock}>
                <h4 className={styles.quickActionTitle}>{locale === 'ko' ? '추천' : 'Do'}</h4>
                <ul className={styles.quickActionList}>
                  {quickDos.map((action, index) => (
                    <li key={`do-${index}`}>{action}</li>
                  ))}
                </ul>
              </div>
              <div className={styles.quickActionBlock}>
                <h4 className={styles.quickActionTitle}>{locale === 'ko' ? '주의' : "Don't"}</h4>
                <ul className={styles.quickActionList}>
                  {quickDonts.map((action, index) => (
                    <li key={`dont-${index}`}>{action}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={styles.quickWindows}>
              <h4 className={styles.quickActionTitle}>
                {locale === 'ko' ? '좋은 시간' : 'Peak windows'}
              </h4>
              <div className={styles.quickWindowList}>
                {quickWindows.map((time, index) => (
                  <span key={`window-${index}`} className={styles.quickWindowChip}>
                    {time}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {(detailInsight || selectedDate.evidence) && (
            <details className={styles.calendarEvidenceDetails}>
              <summary className={styles.calendarEvidenceSummary}>
                {locale === 'ko' ? '근거/상세 보기' : 'View details & evidence'}
              </summary>
              <div className={styles.calendarEvidenceInner}>
                {detailInsight && <p className={styles.selectedDesc}>{detailInsight}</p>}
                {selectedDate.evidence && (
                  <ul className={styles.calendarEvidenceList}>
                    {evidenceSummaryPrimary && <li>{evidenceSummaryPrimary}</li>}
                    {evidenceSummaryCross && <li>{evidenceSummaryCross}</li>}
                    {evidenceBridgeSummary && <li>{evidenceBridgeSummary}</li>}
                    {evidenceScoreLine && <li>{evidenceScoreLine}</li>}
                  </ul>
                )}
              </div>
            </details>
          )}

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
                className={`${styles.scoreFill} ${getScoreClass(displayScore)}`}
                style={{ width: `${displayScore}%` }}
              />
            </div>
            <span className={styles.scoreText}>
              {locale === 'ko' ? '점수' : 'Score'}: {displayScore}/100
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
