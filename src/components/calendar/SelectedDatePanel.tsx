'use client'

import React, { memo, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './DestinyCalendar.module.css'
import { getPeakLabel, resolvePeakLevel } from './peakUtils'
import { repairMojibakeText } from '@/lib/text/mojibake'
import type { CalendarCoreAdapterResult } from '@/lib/destiny-matrix/core/adapters'
import { formatDecisionActionLabel } from '@/lib/destiny-matrix/core/actionCopy'
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
}

interface SelectedDatePanelProps {
  selectedDay: Date | null
  selectedDate: ImportantDate | null
  canonicalCore?: CalendarCoreAdapterResult
  presentation?: {
    daySummary?: {
      date: string
      summary: string
      focusDomain: string
      reliability: string
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

function formatPolicyMode(mode: 'execute' | 'verify' | 'prepare' | undefined, locale: 'ko' | 'en') {
  if (locale === 'ko') {
    if (mode === 'execute') return '실행 우선'
    if (mode === 'prepare') return '준비 우선'
    return '검토 우선'
  }
  if (mode === 'execute') return 'execute-first'
  if (mode === 'prepare') return 'prepare-first'
  return 'verify-first'
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

function toCalendarDomain(
  domain: string | undefined
): 'career' | 'love' | 'money' | 'health' | 'move' | 'general' | undefined {
  if (!domain) return undefined
  if (domain === 'relationship') return 'love'
  if (domain === 'wealth') return 'money'
  if (domain === 'career' || domain === 'health' || domain === 'move') return domain
  return 'general'
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

function normalizeSemanticKey(value: string): string {
  if (!value) return ''
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function dedupeDisplayLines(values: string[]): string[] {
  const out: string[] = []
  const keys: string[] = []

  for (const value of values) {
    const line = safeDisplayText(value, '')
    if (!line) continue
    const key = normalizeSemanticKey(line)
    if (!key) continue

    const hasDuplicate = keys.some((existing) => {
      if (existing === key) return true
      const canCompareInclusion = existing.length >= 16 && key.length >= 16
      return canCompareInclusion && (existing.includes(key) || key.includes(existing))
    })
    if (hasDuplicate) continue

    keys.push(key)
    out.push(line)
  }

  return out
}

function takeLeadLine(value: string, maxLength = 88): string {
  const line = safeDisplayText(value, '')
  if (!line) return ''

  const sentenceMatch = line.match(/(.+?[.!?。]|.+?다\.|.+?요\.|.+?$)/)
  const sentence = sentenceMatch?.[1]?.trim() || line
  if (sentence.length <= maxLength) {
    return sentence
  }
  return `${sentence.slice(0, maxLength - 1).trimEnd()}…`
}

function looksDefensivePhase(value: string): boolean {
  return /(방어|재정렬|안정|검토|defensive|reset|stabil|review)/i.test(value)
}

function humanizePhaseLabel(value: string, locale: 'ko' | 'en'): string {
  const line = safeDisplayText(value, '')
  if (!line) return ''
  if (locale === 'ko') {
    return line
      .replace(/방어\/재정렬 국면/g, '정비 우선 흐름')
      .replace(/공격\/확장 국면/g, '추진 우선 흐름')
      .replace(/국면/g, '흐름')
  }
  return line
    .replace(/defensive\s*reset/gi, 'stabilizing flow')
    .replace(/aggressive\s*expansion/gi, 'push flow')
    .replace(/\bphase\b/gi, 'flow')
}

function buildReadableCrossLine(input: {
  locale: 'ko' | 'en'
  confidence?: number
  crossAgreement?: number
  focusDomain: string
}): string {
  const { locale, confidence, crossAgreement, focusDomain } = input
  const agreement =
    typeof crossAgreement === 'number' && Number.isFinite(crossAgreement)
      ? Math.max(0, Math.min(100, Math.round(crossAgreement)))
      : undefined
  const conf =
    typeof confidence === 'number' && Number.isFinite(confidence)
      ? Math.max(0, Math.min(100, Math.round(confidence)))
      : undefined

  if (locale === 'ko') {
    if (typeof agreement === 'number' && agreement < 60) {
      return `${focusDomain} 해석에서 사주와 점성 신호가 완전히 겹치지 않아, 오늘은 확정보다 재확인이 더 중요합니다.`
    }
    if (typeof conf === 'number' && conf < 45) {
      return `${focusDomain} 해석 근거는 약한 편이라, 방향은 참고하되 실행 범위는 작게 가져가는 편이 안전합니다.`
    }
    return `${focusDomain} 해석에서 사주와 점성 신호가 비교적 같은 방향을 가리켜 핵심 흐름을 읽는 데는 무리가 적습니다.`
  }

  if (typeof agreement === 'number' && agreement < 60) {
    return `Saju and astrology are not fully aligned for ${focusDomain}, so re-checking matters more than committing today.`
  }
  if (typeof conf === 'number' && conf < 45) {
    return `Evidence for ${focusDomain} is relatively weak, so keep execution small even if the direction looks usable.`
  }
  return `Saju and astrology broadly point in the same direction for ${focusDomain}, so the core flow is reasonably readable.`
}

function buildReadableFlowSummary(input: {
  locale: 'ko' | 'en'
  focusDomain: string
  phase: string
  gradeLabel: string
  reliability: string
  attackPercent?: number
  defensePercent?: number
  action?: string
  caution?: string
}): string {
  const {
    locale,
    focusDomain,
    phase,
    gradeLabel,
    reliability,
    attackPercent,
    defensePercent,
    action,
    caution,
  } = input

  const hasAttack = typeof attackPercent === 'number' && Number.isFinite(attackPercent)
  const hasDefense = typeof defensePercent === 'number' && Number.isFinite(defensePercent)
  const balanceGap = hasAttack && hasDefense ? Math.abs(attackPercent - defensePercent) : undefined
  const defensive = looksDefensivePhase(phase)

  if (locale === 'ko') {
    const intro = phase
      ? defensive
        ? `지금은 ${phase}이지만 완전 정지보다 정비하면서 움직이는 쪽에 가깝습니다.`
        : `지금은 ${phase}으로 ${focusDomain} 쪽 일을 밀 수 있는 여지가 있는 날입니다.`
      : `${focusDomain} 흐름은 ${gradeLabel}이며, 오늘은 방향을 넓히기보다 핵심을 좁히는 편이 좋습니다.`

    const balance = (() => {
      if (!hasAttack || !hasDefense) return ''
      if (typeof balanceGap === 'number' && balanceGap <= 8) {
        return '실행 여력과 리스크 관리 비중이 비슷해 무리한 확장보다 핵심 1~2건만 정확히 처리하는 편이 낫습니다.'
      }
      if ((attackPercent as number) > (defensePercent as number)) {
        return '움직일 여지는 있지만, 범위를 넓히기보다 작은 실행으로 먼저 확인하는 편이 안전합니다.'
      }
      return '리스크 관리 비중이 더 커서 속도보다 손실 방지와 조건 점검이 우선입니다.'
    })()

    const closing = caution || action || reliability
    return [intro, balance, takeLeadLine(closing || '', 90)].filter(Boolean).join(' ')
  }

  const intro = phase
    ? defensive
      ? `The day sits in a ${phase} phase, but it is closer to review-led execution than a full stop.`
      : `The day leans toward ${phase}, which supports execution in ${focusDomain}.`
    : `${focusDomain} is in a ${gradeLabel.toLowerCase()} flow today, and narrowing the focus works better than expanding it.`
  const balance = (() => {
    if (!hasAttack || !hasDefense) return ''
    if (typeof balanceGap === 'number' && balanceGap <= 8) {
      return 'Attack and defense are close, so handling one or two priorities cleanly is better than pushing broadly.'
    }
    if ((attackPercent as number) > (defensePercent as number)) {
      return 'Expansion is slightly ahead, but smaller verified execution is safer than widening the scope.'
    }
    return 'Defensive pressure is stronger, so loss prevention and condition checks matter more than speed.'
  })()
  return [intro, balance, takeLeadLine(caution || action || reliability || '', 90)]
    .filter(Boolean)
    .join(' ')
}

function softenDecisionTone(value: string, locale: 'ko' | 'en', lowReliability = false): string {
  const line = safeDisplayText(value)
  if (!line) return ''

  if (locale === 'ko') {
    let softened = line
      .replace(/1년에 몇 번 없는/gi, '드문 편인')
      .replace(/결혼 결정/gi, '관계 관련 대화')
      .replace(/프로포즈/gi, '중요한 감정 표현')
      .replace(/오늘로 잡으세요/gi, '우선 검토해 보세요')
      .replace(/지금 결정/gi, '재확인 후 결정')

    if (lowReliability) {
      softened = softened
        .replace(/최적/gi, '검토에 무난')
        .replace(/유리/gi, '무난')
        .replace(/적합/gi, '보수적 검토에 무난')
        .replace(/최고조/gi, '높은 편')
    }
    return softened
  }

  let softened = line.replace(/decide now/gi, 'confirm once more before deciding')

  if (lowReliability) {
    softened = softened
      .replace(/\boptimal\b/gi, 'reasonable for cautious review')
      .replace(/\bfavorable\b/gi, 'workable with cautious review')
      .replace(/\bideal\b/gi, 'reasonable')
  }
  return softened
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
  canonicalCore,
  presentation,
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
    canonicalGradeLabel || (selectedDate ? getDisplayLabelFromScore(displayScore, locale) : '')
  const isPresentationDayMatch =
    Boolean(selectedDate?.date) &&
    Boolean(presentation?.daySummary?.date) &&
    selectedDate?.date === presentation?.daySummary?.date
  const presentationReliability = isPresentationDayMatch
    ? safeDisplayText(presentation?.daySummary?.reliability || '', '')
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
  const focusDomainHeadline =
    canonicalFocusDomainLabel ||
    (isPresentationDayMatch
      ? safeDisplayText(presentation?.daySummary?.focusDomain || '', '')
      : '') ||
    domainLabel

  const evidenceSummaryPrimary = canonicalCore
    ? locale === 'ko'
      ? `오늘 등급 ${unifiedDayLabel} · 흐름 ${canonicalPhaseLabel || canonicalCore.phase} · 핵심 분야 ${focusDomainHeadline} · 판단 기준 ${reliabilityHeadline}`
      : `Today rating ${unifiedDayLabel} · Flow ${canonicalPhaseLabel || canonicalCore.phase} · Focus ${focusDomainHeadline} · Guidance ${reliabilityHeadline}`
    : selectedDate?.evidence
      ? locale === 'ko'
        ? `오늘 등급 ${unifiedDayLabel} · 점수 ${displayScore}/100 · 핵심 분야 ${domainLabel}${matrixVerdict?.phase ? ` · 흐름 ${humanizePhaseLabel(matrixVerdict.phase, locale)}` : ''}`
        : `Today rating ${unifiedDayLabel} · Score ${displayScore}/100 · Focus ${domainLabel}${matrixVerdict?.phase ? ` · Flow ${humanizePhaseLabel(matrixVerdict.phase, locale)}` : ''}`
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
    if (readableFlowSummary) {
      return softenDecisionTone(readableFlowSummary, locale, isLowReliability)
    }
    if (canonicalAdvisory?.thesis) {
      return softenDecisionTone(canonicalAdvisory.thesis, locale, isLowReliability)
    }
    if (canonicalCore?.thesis) {
      return softenDecisionTone(canonicalCore.thesis, locale, isLowReliability)
    }
    if (isPresentationDayMatch && presentation?.daySummary?.summary) {
      return softenDecisionTone(presentation.daySummary.summary, locale, isLowReliability)
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
    visual?: {
      kind: 'agreement'
      agreementPercent: number
      contradictionPercent: number
      leadLagState: 'structure-ahead' | 'trigger-ahead' | 'balanced'
    } | {
      kind: 'branch'
      rows: Array<{ label: string; text: string }>
    }
  }> =
    (presentation?.surfaceCards || [])
      .map((item) => ({
        label: safeDisplayText(item.label, ''),
        tag: safeDisplayText(item.tag || '', ''),
        text: takeLeadLine(item.summary),
        details: (item.details || []).map((line) => safeDisplayText(line, '')).filter(Boolean).slice(0, 3),
        visual:
          item.visual?.kind === 'agreement'
            ? {
                kind: 'agreement',
                agreementPercent: item.visual.agreementPercent,
                contradictionPercent: item.visual.contradictionPercent,
                leadLagState: item.visual.leadLagState,
              }
            : item.visual?.kind === 'branch'
              ? {
                  kind: 'branch',
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

  const hasExtendedDetails = safeSajuFactors.length > 0 || safeAstroFactors.length > 0

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
          <h3 className={styles.selectedTitle}>{displayTitle}</h3>

          {displayGrade >= 3 && safeWarnings.length > 0 && (
            <div
              className={`${styles.urgentWarningBox} ${displayGrade === 4 ? styles.worstDay : ''}`}
            >
              <div className={styles.urgentWarningHeader}>
                <span className={styles.urgentWarningIcon}>
                  {displayGrade === 4 ? '\u{1F6A8}' : '\u26A0\uFE0F'}
                </span>
                <span className={styles.urgentWarningTitle}>
                  {locale === 'ko'
                    ? displayGrade === 4
                      ? '오늘 주의해야 할 점!'
                      : '오늘의 주의사항'
                    : displayGrade === 4
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

          {selectedDate.crossVerified && displayGrade <= 1 && (
            <div className={styles.crossVerifiedBadge}>
              <span className={styles.crossVerifiedIcon}>{'\u{1F52E}'}</span>
              <span className={styles.crossVerifiedText}>
                {locale === 'ko' ? '사주 + 점성 교차 검증 완료' : 'Saju + Astrology Cross-verified'}
              </span>
            </div>
          )}

          <div className={styles.quickScanCard}>
            {quickHighlightCards.length > 0 && (
              <div className={styles.quickHeroGrid}>
                {quickHighlightCards.map((item) => (
                  <div key={`${item.label}-${item.text}`} className={styles.quickHeroBlock}>
                    <span className={styles.quickHeroLabel}>
                      {item.label}
                      {item.tag ? <span className={styles.quickHeroTag}>{item.tag}</span> : null}
                    </span>
                    <p className={styles.quickHeroText}>{item.text}</p>
                    {item.visual?.kind === 'agreement' ? (
                      <div className={styles.quickHeroMeterWrap}>
                        <div className={styles.quickHeroMeterRow}>
                          <span className={styles.quickHeroMeterLabel}>
                            {locale === 'ko' ? '합의' : 'Alignment'}
                          </span>
                          <span className={styles.quickHeroMeterValue}>
                            {item.visual.agreementPercent}%
                          </span>
                        </div>
                        <div className={styles.quickHeroMeterTrack}>
                          <div
                            className={`${styles.quickHeroMeterFill} ${styles.quickHeroMeterFillGood}`}
                            style={{ width: `${Math.max(6, item.visual.agreementPercent)}%` }}
                          />
                        </div>
                        <div className={styles.quickHeroMeterRow}>
                          <span className={styles.quickHeroMeterLabel}>
                            {locale === 'ko' ? '충돌' : 'Conflict'}
                          </span>
                          <span className={styles.quickHeroMeterValue}>
                            {item.visual.contradictionPercent}%
                          </span>
                        </div>
                        <div className={styles.quickHeroMeterTrack}>
                          <div
                            className={`${styles.quickHeroMeterFill} ${styles.quickHeroMeterFillRisk}`}
                            style={{ width: `${Math.max(6, item.visual.contradictionPercent)}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                    {item.visual?.kind === 'branch' && item.visual.rows.length ? (
                      <div className={styles.quickHeroBranchGrid}>
                        {item.visual.rows.map((row) => (
                          <div key={`${item.label}-${row.label}-${row.text}`} className={styles.quickHeroBranchRow}>
                            <span className={styles.quickHeroBranchLabel}>{row.label}</span>
                            <span className={styles.quickHeroBranchText}>{row.text}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {item.details?.length ? (
                      <ul className={styles.quickHeroDetailList}>
                        {item.details.map((detail) => (
                          <li key={`${item.label}-${detail}`} className={styles.quickHeroDetailItem}>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {safeActionSummary && (
              <div className={styles.quickSummaryBlock}>
                <span className={styles.quickSummaryLabel}>
                  {locale === 'ko' ? '오늘 행동 요약' : 'Action summary'}
                </span>
                <p className={styles.quickSummaryText}>{safeActionSummary}</p>
              </div>
            )}

            <p className={styles.quickScanThesis}>{quickThesis}</p>

            <div className={styles.quickScanMeta}>
              <span className={styles.quickMetaChip}>
                {locale === 'ko' ? '오늘 등급' : 'Today'}: {unifiedDayLabel}
              </span>
              <span className={styles.quickMetaChip}>
                {locale === 'ko' ? '핵심 분야' : 'Focus'}: {focusDomainHeadline}
              </span>
              {(canonicalPhaseLabel || matrixVerdict?.phase) && (
                <span className={styles.quickMetaChip}>
                  {locale === 'ko' ? '흐름' : 'Flow'}:{' '}
                  {canonicalPhaseLabel || humanizePhaseLabel(matrixVerdict?.phase || '', locale)}
                </span>
              )}
              <span className={styles.quickMetaChip}>
                {locale === 'ko' ? '신뢰' : 'Reliability'}: {reliabilityHeadline}
              </span>
            </div>

            {topTimingSignals.length > 0 && (
              <div className={styles.quickTimingSignalList}>
                {topTimingSignals.map((signal, index) => (
                  <span key={`timing-signal-${index}`} className={styles.quickTimingSignalChip}>
                    {signal}
                  </span>
                ))}
              </div>
            )}

            {(presentation?.weekSummary?.summary ||
              presentation?.monthSummary?.summary ||
              (presentation?.topDomains || []).length > 0 ||
              presentation?.relationshipWeather?.summary ||
              presentation?.workMoneyWeather?.summary) && (
              <div className={styles.quickSummaryBlock}>
                <span className={styles.quickSummaryLabel}>
                  {locale === 'ko' ? '주간/월간 흐름' : 'Week/Month flow'}
                </span>
                {presentation?.weekSummary?.summary && (
                  <p className={styles.quickSummaryText}>
                    {locale === 'ko' ? '주간: ' : 'Week: '}
                    {presentation.weekSummary.summary}
                  </p>
                )}
                {presentation?.monthSummary?.summary && (
                  <p className={styles.quickSummaryText}>
                    {locale === 'ko' ? '월간: ' : 'Month: '}
                    {presentation.monthSummary.summary}
                  </p>
                )}
                {(presentation?.topDomains || []).length > 0 && (
                  <div className={styles.quickScanMeta}>
                    {(presentation?.topDomains || []).slice(0, 3).map((item, index) => (
                      <span key={`top-domain-${index}`} className={styles.quickMetaChip}>
                        {item.label} {Math.round(item.score * 100)}%
                      </span>
                    ))}
                  </div>
                )}
                {presentation?.relationshipWeather?.summary && (
                  <p className={styles.quickSummaryText}>
                    {locale === 'ko' ? '관계: ' : 'Relationship: '}
                    {presentation.relationshipWeather.summary}
                  </p>
                )}
                {presentation?.workMoneyWeather?.summary && (
                  <p className={styles.quickSummaryText}>
                    {locale === 'ko' ? '일/돈: ' : 'Work/Money: '}
                    {presentation.workMoneyWeather.summary}
                  </p>
                )}
              </div>
            )}

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
                {locale === 'ko' ? '교차 결론 근거 보기' : 'Cross-evidence for conclusion'}
              </summary>
              <div className={styles.calendarEvidenceInner}>
                {detailInsight && <p className={styles.selectedDesc}>{detailInsight}</p>}
                {selectedDate.evidence && (
                  <ul className={styles.calendarEvidenceList}>
                    {evidenceSummaryPrimary && <li>{evidenceSummaryPrimary}</li>}
                    {canonicalCore?.gradeReason && (
                      <li>
                        {locale === 'ko' ? '등급 설명:' : 'Grade reason:'}{' '}
                        {canonicalCore.gradeReason}
                      </li>
                    )}
                    {canonicalCore?.riskControl && (
                      <li>
                        {locale === 'ko' ? '안전장치:' : 'Guardrail:'} {canonicalCore.riskControl}
                      </li>
                    )}
                    {!canonicalCore?.riskControl && matrixVerdict?.guardrail && (
                      <li>
                        {locale === 'ko' ? '안전장치:' : 'Guardrail:'} {matrixVerdict.guardrail}
                      </li>
                    )}
                    {canonicalCore?.judgmentPolicy?.rationale && (
                      <li>
                        {locale === 'ko' ? '판단 정책:' : 'Decision policy:'}{' '}
                        {canonicalCore.judgmentPolicy.rationale}
                      </li>
                    )}
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

          {hasExtendedDetails && (
            <details className={styles.extendedDetails}>
              <summary className={styles.extendedDetailsSummary}>
                {locale === 'ko' ? '사주/점성 세부 근거' : 'Detailed Saju/Astrology evidence'}
              </summary>
              <div className={styles.extendedDetailsBody}>
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
              </div>
            </details>
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
