'use client'

// src/components/calendar/CalendarActionPlanView.tsx
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { apiFetch } from '@/lib/api/ApiClient'
import { analyzeICP } from '@/lib/icp/analysis'
import { analyzePersona } from '@/lib/persona/analysis'
import type { ICPAnalysis, ICPQuizAnswers } from '@/lib/icp/types'
import type { PersonaAnalysis, PersonaQuizAnswers } from '@/lib/persona/types'
import { logger } from '@/lib/logger'
import { repairMojibakeText } from '@/lib/text/mojibake'
import styles from './DestinyCalendar.module.css'
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS_EN,
  CATEGORY_LABELS_KO,
  GRADE_EMOJI,
  WEEKDAYS_EN,
  WEEKDAYS_KO,
} from './constants'
import type { CalendarData, ImportantDate, EventCategory } from './types'
import { getPeakLabel, resolvePeakLevel } from './peakUtils'

interface CalendarActionPlanViewProps {
  data: CalendarData
  selectedDay: Date | null
  selectedDate: ImportantDate | null
  onSelectDate?: (date: Date) => void
}

type AiTimelineSlot = {
  hour: number
  minute?: number
  note: string
  tone?: 'neutral' | 'best' | 'caution'
  evidenceSummary?: string[]
}

type TimelineSlotView = {
  hour: number
  minute: number
  label: string
  note: string
  tone: 'neutral' | 'best' | 'caution'
  badge: string | null
  evidenceSummary?: string[]
}

type ActionPlanPrecisionMode = 'ai-graphrag' | 'rule-fallback' | null

const DEFAULT_TODAY_KO = [
  '우선순위 3개 정리하기',
  '집중할 일 1개 25분 진행',
  '몸/마음 회복 10분 확보',
]
const DEFAULT_TODAY_EN = [
  'List your top 3 priorities',
  'Do one focused task for 25 minutes',
  'Reserve 10 minutes for recovery',
]

const DEFAULT_WEEK_KO = [
  '이번 주 목표 1개 설정',
  '중요 일정 1개를 캘린더에 고정',
  '회복 시간 1회 확보',
  '주말에 10분 리뷰',
]
const DEFAULT_WEEK_EN = [
  'Set one weekly goal',
  'Block one key schedule on the calendar',
  'Make one recovery slot',
  'Do a 10-minute review on the weekend',
]

const CATEGORY_ACTIONS: Record<
  EventCategory,
  { day: { ko: string[]; en: string[] }; week: { ko: string[]; en: string[] } }
> = {
  wealth: {
    day: {
      ko: ['지출 한도 확인 및 기록', '수익/거래 관련 연락 1건', '예산 항목 1개 정리'],
      en: [
        'Check spending limits and log',
        'Make one income/transaction follow-up',
        'Tidy one budget item',
      ],
    },
    week: {
      ko: ['수입/지출 점검 1회', '저축/투자 목표 1개 설정', '현금흐름 정리'],
      en: ['Review income/expenses once', 'Set one saving/investment goal', 'Organize cash flow'],
    },
  },
  career: {
    day: {
      ko: ['핵심 업무 1개 마무리', '성과/진행 상황 공유 1회', '다음 액션 1개 정의'],
      en: ['Finish one core task', 'Share progress once', 'Define the next action'],
    },
    week: {
      ko: ['성과 공유/리포트 1회', '중요 미팅/제안 1건 추진', '업무 개선 1건 적용'],
      en: [
        'Share results/report once',
        'Advance one key meeting/proposal',
        'Apply one workflow improvement',
      ],
    },
  },
  love: {
    day: {
      ko: ['따뜻한 메시지 1회', '대화 20분 확보', '배려 행동 1가지'],
      en: ['Send one warm message', 'Secure 20 minutes of conversation', 'Do one caring action'],
    },
    week: {
      ko: ['만남/데이트 일정 확정', '관계 회복 대화 1회', '감사/칭찬 표현 1회'],
      en: [
        'Confirm a date/meetup',
        'Have one repair conversation',
        'Express gratitude/compliment once',
      ],
    },
  },
  health: {
    day: {
      ko: ['30분 가벼운 운동', '수면 루틴 점검', '물/식단 관리'],
      en: ['30-minute light workout', 'Check sleep routine', 'Hydration and diet care'],
    },
    week: {
      ko: ['운동 2-3회 확보', '수면/식단 체크리스트 점검', '스트레칭/회복 루틴 1회'],
      en: ['Schedule 2-3 workouts', 'Review sleep/diet checklist', 'One stretch/recovery routine'],
    },
  },
  travel: {
    day: {
      ko: ['이동/동선 점검', '필수 준비물 체크', '예약/시간 확인'],
      en: ['Check route/movements', 'Verify essentials checklist', 'Confirm reservations/timing'],
    },
    week: {
      ko: ['일정/동선 확정', '예약/예산 정리', '대체 일정 준비'],
      en: ['Finalize itinerary/routes', 'Organize reservations/budget', 'Prepare a backup plan'],
    },
  },
  study: {
    day: {
      ko: ['집중 학습 45분', '복습 20분', '노트/요약 정리'],
      en: ['45-minute focused study', '20-minute review', 'Organize notes/summary'],
    },
    week: {
      ko: ['주간 학습 계획 수립', '스터디/강의 1회', '진행 상황 기록'],
      en: ['Plan weekly study', 'Join one study/lecture', 'Log progress'],
    },
  },
  general: {
    day: {
      ko: ['우선순위 재정렬', '작은 정리 1건', '회복 시간 확보'],
      en: ['Reset priorities', 'Do one small cleanup', 'Secure recovery time'],
    },
    week: {
      ko: ['주간 목표 1개 설정', '정리/정돈 1회', '주간 리뷰 1회'],
      en: ['Set one weekly goal', 'One organize/cleanup session', 'One weekly review'],
    },
  },
}

const isEventCategory = (value: string): value is EventCategory =>
  Object.prototype.hasOwnProperty.call(CATEGORY_ACTIONS, value)

const normalizeCategory = (value?: string | null): EventCategory =>
  value && isEventCategory(value) ? value : 'general'

const CalendarActionPlanView = memo(function CalendarActionPlanView({
  data,
  selectedDay,
  selectedDate,
  onSelectDate,
}: CalendarActionPlanViewProps) {
  const { locale } = useI18n()
  const isKo = locale === 'ko'
  const analysisLocale = isKo ? 'ko' : 'en'
  const WEEKDAYS = isKo ? WEEKDAYS_KO : WEEKDAYS_EN
  const [localDate, setLocalDate] = useState<Date | null>(null)
  const [rangeDays, setRangeDays] = useState<7 | 14>(7)
  const [intervalMinutes, setIntervalMinutes] = useState<30 | 60>(30)
  const [shareMessage, setShareMessage] = useState<string | null>(null)
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [icpResult, setIcpResult] = useState<ICPAnalysis | null>(null)
  const [personaResult, setPersonaResult] = useState<PersonaAnalysis | null>(null)
  const [profileReady, setProfileReady] = useState(false)
  const [aiTimeline, setAiTimeline] = useState<AiTimelineSlot[] | null>(null)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [aiPrecisionMode, setAiPrecisionMode] = useState<ActionPlanPrecisionMode>(null)
  const aiCacheRef = useRef<Record<string, AiTimelineSlot[]>>({})
  const aiAbortRef = useRef<AbortController | null>(null)
  const timelineSlotRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [activeRhythmHour, setActiveRhythmHour] = useState<number | null>(null)

  useEffect(() => {
    return () => {
      if (shareTimerRef.current) {
        clearTimeout(shareTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let nextIcp: ICPAnalysis | null = null
    let nextPersona: PersonaAnalysis | null = null

    try {
      const rawIcp = localStorage.getItem('icpQuizAnswers')
      if (rawIcp) {
        const parsed = JSON.parse(rawIcp) as ICPQuizAnswers
        if (Object.keys(parsed).length > 0) {
          nextIcp = analyzeICP(parsed, analysisLocale)
        }
      }
    } catch (error) {
      logger.warn('[ActionPlan] Failed to load ICP answers', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    try {
      const rawPersona =
        localStorage.getItem('personaQuizAnswers') ??
        localStorage.getItem('auraQuizAnswers') ??
        localStorage.getItem('aura_answers')
      if (rawPersona) {
        const parsed = JSON.parse(rawPersona) as PersonaQuizAnswers
        if (Object.keys(parsed).length > 0) {
          nextPersona = analyzePersona(parsed, analysisLocale)
        }
      }
    } catch (error) {
      logger.warn('[ActionPlan] Failed to load persona answers', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    setIcpResult(nextIcp)
    setPersonaResult(nextPersona)
    setProfileReady(true)
  }, [analysisLocale])

  const setShareStatus = useCallback((message: string) => {
    if (shareTimerRef.current) {
      clearTimeout(shareTimerRef.current)
    }
    setShareMessage(message)
    shareTimerRef.current = setTimeout(() => {
      setShareMessage(null)
    }, 2000)
  }, [])

  const getDateInfo = useCallback(
    (date: Date): ImportantDate | null => {
      if (!data?.allDates) {
        return null
      }
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`
      return data.allDates.find((item) => item.date === dateStr) || null
    },
    [data?.allDates]
  )

  const baseDate = useMemo(() => selectedDay ?? localDate ?? new Date(), [selectedDay, localDate])
  const baseInfo = useMemo(
    () => selectedDate ?? getDateInfo(baseDate),
    [selectedDate, baseDate, getDateInfo]
  )
  const resolvedPeakLevel = useMemo(
    () => resolvePeakLevel(baseInfo?.evidence?.matrix?.peakLevel, baseInfo?.score),
    [baseInfo?.evidence?.matrix?.peakLevel, baseInfo?.score]
  )

  const formatDateLabel = useCallback(
    (date: Date) => {
      const month = date.getMonth() + 1
      const day = date.getDate()
      const weekday = WEEKDAYS[date.getDay()]
      return isKo ? `${month}/${day} (${weekday})` : `${month}/${day} ${weekday}`
    },
    [WEEKDAYS, isKo]
  )

  const commitDate = useCallback(
    (nextDate: Date) => {
      if (onSelectDate) {
        onSelectDate(nextDate)
        return
      }
      setLocalDate(nextDate)
    },
    [onSelectDate]
  )
  const inputDateValue = useMemo(() => {
    const y = baseDate.getFullYear()
    const m = String(baseDate.getMonth() + 1).padStart(2, '0')
    const d = String(baseDate.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [baseDate])
  const dateKey = useMemo(() => baseInfo?.date ?? inputDateValue, [baseInfo?.date, inputDateValue])
  const hasIcp = Boolean(icpResult)
  const hasPersona = Boolean(personaResult)
  const aiCacheKey = useMemo(() => {
    const icpKey = icpResult?.primaryStyle ?? 'none'
    const personaKey = personaResult?.typeCode ?? 'none'
    return `${dateKey}:${analysisLocale}:${intervalMinutes}:${icpKey}:${personaKey}`
  }, [analysisLocale, dateKey, icpResult?.primaryStyle, intervalMinutes, personaResult?.typeCode])

  const weekEntries = useMemo(() => {
    const entries: Array<{ date: Date; info: ImportantDate }> = []
    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(baseDate)
      d.setDate(baseDate.getDate() + i)
      const info = getDateInfo(d)
      if (info) {
        entries.push({ date: d, info })
      }
    }
    return entries
  }, [baseDate, getDateInfo, rangeDays])

  const bestDays = useMemo(() => {
    const count = rangeDays === 14 ? 4 : 3
    return [...weekEntries]
      .sort((a, b) => a.info.grade - b.info.grade || b.info.score - a.info.score)
      .slice(0, count)
  }, [weekEntries, rangeDays])

  const cautionDays = useMemo(() => {
    const count = rangeDays === 14 ? 3 : 2
    return [...weekEntries]
      .filter((entry) => entry.info.grade >= 3)
      .sort((a, b) => b.info.grade - a.info.grade || a.info.score - b.info.score)
      .slice(0, count)
  }, [weekEntries, rangeDays])

  const topCategory = useMemo(() => {
    const weights: Record<EventCategory, number> = {
      wealth: 0,
      career: 0,
      love: 0,
      health: 0,
      travel: 0,
      study: 0,
      general: 0,
    }
    for (const entry of weekEntries) {
      const weight = entry.info.grade <= 1 ? 3 : entry.info.grade === 2 ? 2 : 1
      entry.info.categories.forEach((cat) => {
        weights[cat] += weight
      })
    }
    const sorted = Object.entries(weights).sort((a, b) => b[1] - a[1])
    const candidate = sorted[0]
    return candidate && candidate[1] > 0 ? (candidate[0] as EventCategory) : null
  }, [weekEntries])

  const categoryLabel = useCallback(
    (cat: EventCategory) => (isKo ? CATEGORY_LABELS_KO[cat] : CATEGORY_LABELS_EN[cat]),
    [isKo]
  )

  const todayFocus = baseInfo?.categories?.length
    ? baseInfo.categories.slice(0, 2).map(categoryLabel).join(' · ')
    : isKo
      ? '오늘의 흐름'
      : 'Today flow'

  const weekFocus = topCategory
    ? `${categoryLabel(topCategory)} ${isKo ? '중심' : 'focus'}`
    : isKo
      ? '균형과 정리'
      : 'Balance & structure'
  const weekTitle =
    rangeDays === 7
      ? isKo
        ? '이번 주 체크리스트'
        : 'This Week Checklist'
      : isKo
        ? '2주 체크리스트'
        : '2-Week Checklist'

  const formatHourLabel = useCallback(
    (hour: number, minute = 0) =>
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    []
  )

  const decodeUnicodeEscapes = useCallback((value: string) => {
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
  }, [])

  const decodeBareUnicodeTokens = useCallback((value: string) => {
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
  }, [])

  const stripMatrixDomainText = useCallback((value: string) => {
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
  }, [])

  const decodeUtf8FromLatin1 = useCallback((value: string) => {
    try {
      const bytes = Uint8Array.from([...value].map((char) => char.charCodeAt(0) & 0xff))
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    } catch {
      return value
    }
  }, [])

  const isUnreadableText = useCallback((value: string) => {
    if (!value) return true
    if (value.includes('\uFFFD')) return true
    const suspiciousMatches = value.match(/[ÃÂâìëêíð]/g) || []
    if (suspiciousMatches.length >= 3) return true
    const mojibakeRatio = suspiciousMatches.length / Math.max(1, value.length)
    return mojibakeRatio > 0.15
  }, [])

  const cleanText = useCallback(
    (value: string | null | undefined, fallback = '') => {
      if (!value) return fallback
      let current = value
      for (let pass = 0; pass < 3; pass++) {
        const repaired = repairMojibakeText(current)
        const decodedUnicode = decodeUnicodeEscapes(repaired)
        const decodedTokens = decodeBareUnicodeTokens(decodedUnicode)
        const stripped = stripMatrixDomainText(decodedTokens)
        const latinDecoded = decodeUtf8FromLatin1(stripped)
        current = stripMatrixDomainText(latinDecoded).replace(/\s+/g, ' ').trim()
        if (!isUnreadableText(current)) {
          return current
        }
      }
      return fallback
    },
    [
      decodeBareUnicodeTokens,
      decodeUnicodeEscapes,
      decodeUtf8FromLatin1,
      isUnreadableText,
      stripMatrixDomainText,
    ]
  )

  const extractBestHours = useCallback((value: string) => {
    if (!value || /년|월/.test(value)) {
      return [] as number[]
    }
    const normalized = value.replace(/\s+/g, '')
    const rangeMatch = normalized.match(/(\d{1,2})(?::\d{2})?[-~](\d{1,2})/)
    if (rangeMatch) {
      const start = Number(rangeMatch[1])
      const end = Number(rangeMatch[2])
      if (Number.isNaN(start) || Number.isNaN(end)) return []
      if (start < 0 || start > 23) return []
      const hours: number[] = []
      const safeEnd = Math.min(24, Math.max(0, end))
      if (safeEnd <= start) {
        hours.push(start)
        return hours
      }
      for (let h = start; h < safeEnd; h++) {
        hours.push(h)
      }
      return hours
    }
    const singleMatch = normalized.match(/(\d{1,2})(?::\d{2})?/)
    if (!singleMatch) return []
    const hour = Number(singleMatch[1])
    if (Number.isNaN(hour) || hour < 0 || hour > 23) return []
    return [hour]
  }, [])

  const todayItems = useMemo(() => {
    const items: string[] = []
    const pushItem = (item: string | undefined) => {
      if (!item) return
      if (!items.includes(item)) {
        items.push(item)
      }
    }

    const dayCategories: EventCategory[] = baseInfo?.categories?.length
      ? baseInfo.categories.slice(0, 2).map((cat) => normalizeCategory(cat))
      : [normalizeCategory(topCategory ?? 'general')]

    if (baseInfo?.bestTimes?.[0]) {
      const bestTimeText = cleanText(baseInfo.bestTimes[0])
      if (bestTimeText) {
        pushItem(
          isKo ? `${bestTimeText}에 핵심 일정 배치` : `Schedule a key task at ${bestTimeText}`
        )
      }
    }

    dayCategories.forEach((cat) => {
      const actions = isKo ? CATEGORY_ACTIONS[cat].day.ko : CATEGORY_ACTIONS[cat].day.en
      pushItem(actions[0])
    })

    baseInfo?.recommendations?.slice(0, 2).forEach((rec) => pushItem(cleanText(rec)))

    if (items.length < 3) {
      const grade = baseInfo?.grade ?? 2
      if (grade <= 1) {
        pushItem(isKo ? '중요 결정/미팅 추진' : 'Push a key decision or meeting')
      } else if (grade === 2) {
        pushItem(isKo ? '핵심 업무 1건 마무리' : 'Wrap up one core task')
      } else {
        pushItem(isKo ? '큰 결정 피하고 회복/정비' : 'Avoid big decisions and recover')
      }
    }

    while (items.length < 3) {
      const fallback = (isKo ? DEFAULT_TODAY_KO : DEFAULT_TODAY_EN)[items.length]
      pushItem(fallback)
    }

    return items
      .slice(0, 3)
      .map((item) => cleanText(item))
      .filter(Boolean)
  }, [baseInfo, cleanText, isKo, topCategory])

  const sanitizeAiTimeline = useCallback(
    (raw: unknown) => {
      if (!Array.isArray(raw)) return [] as AiTimelineSlot[]
      const cleaned: AiTimelineSlot[] = []
      raw.forEach((item) => {
        if (!item || typeof item !== 'object') return
        const hour = Number((item as { hour?: unknown }).hour)
        const minuteRaw = (item as { minute?: unknown }).minute
        const minute = minuteRaw === undefined ? 0 : Number(minuteRaw)
        const noteRaw = (item as { note?: unknown }).note
        const note = typeof noteRaw === 'string' ? cleanText(noteRaw, '') : ''
        if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !note) return
        if (!Number.isInteger(minute) || (minute !== 0 && minute !== 30)) return
        const toneValue = (item as { tone?: unknown }).tone
        const tone =
          toneValue === 'best' || toneValue === 'caution' || toneValue === 'neutral'
            ? toneValue
            : undefined
        const evidenceRaw = (item as { evidenceSummary?: unknown }).evidenceSummary
        const evidenceSummary = Array.isArray(evidenceRaw)
          ? evidenceRaw
              .map((line) => (typeof line === 'string' ? cleanText(line, '') : ''))
              .filter(Boolean)
              .slice(0, 3)
          : undefined
        cleaned.push({ hour, minute, note, tone, evidenceSummary })
      })
      return cleaned
    },
    [cleanText]
  )

  const buildAiPayload = useCallback(() => {
    const trimText = (value: string | undefined, max: number) => {
      if (!value) return undefined
      return cleanText(value, '').slice(0, max) || undefined
    }
    const trimList = (list: string[] | undefined, max: number, maxText = 220) => {
      if (!list || list.length === 0) return undefined
      const compact = list
        .map((item) => trimText(item, maxText))
        .filter((item): item is string => Boolean(item))
      return compact.length ? compact.slice(0, max) : undefined
    }
    const compactEvidence = baseInfo?.evidence
      ? {
          matrix: baseInfo.evidence.matrix
            ? {
                domain: baseInfo.evidence.matrix.domain,
                finalScoreAdjusted:
                  typeof baseInfo.evidence.matrix.finalScoreAdjusted === 'number'
                    ? Math.max(0, Math.min(10, baseInfo.evidence.matrix.finalScoreAdjusted))
                    : undefined,
                overlapStrength:
                  typeof baseInfo.evidence.matrix.overlapStrength === 'number'
                    ? Math.max(0, Math.min(1, baseInfo.evidence.matrix.overlapStrength))
                    : undefined,
                peakLevel: baseInfo.evidence.matrix.peakLevel,
                monthKey: trimText(baseInfo.evidence.matrix.monthKey, 20),
              }
            : undefined,
          cross: baseInfo.evidence.cross
            ? {
                sajuEvidence: trimText(baseInfo.evidence.cross.sajuEvidence, 360),
                astroEvidence: trimText(baseInfo.evidence.cross.astroEvidence, 360),
                sajuDetails: trimList(baseInfo.evidence.cross.sajuDetails, 2, 260),
                astroDetails: trimList(baseInfo.evidence.cross.astroDetails, 2, 260),
                bridges: trimList(baseInfo.evidence.cross.bridges, 2, 260),
              }
            : undefined,
          confidence:
            typeof baseInfo.evidence.confidence === 'number'
              ? Math.max(0, Math.min(100, baseInfo.evidence.confidence))
              : undefined,
          source:
            baseInfo.evidence.source === 'rule' ||
            baseInfo.evidence.source === 'rag' ||
            baseInfo.evidence.source === 'hybrid'
              ? baseInfo.evidence.source
              : undefined,
        }
      : undefined

    const compactCalendar = baseInfo
      ? {
          grade: baseInfo.grade,
          score: baseInfo.score,
          categories: trimList(baseInfo.categories, 4, 32),
          bestTimes: trimList(baseInfo.bestTimes, 4, 120),
          warnings: trimList(baseInfo.warnings, 3, 220),
          recommendations: trimList(baseInfo.recommendations, 3, 220),
          sajuFactors: trimList(baseInfo.sajuFactors, 3, 220),
          astroFactors: trimList(baseInfo.astroFactors, 3, 220),
          title: trimText(baseInfo.title, 120),
          summary: trimText(baseInfo.summary, 240),
          ganzhi: trimText(baseInfo.ganzhi, 60),
          transitSunSign: trimText(baseInfo.transitSunSign, 60),
          evidence: compactEvidence,
        }
      : null

    const compactIcp = icpResult
      ? {
          primaryStyle: trimText(icpResult.primaryStyle, 10),
          secondaryStyle: trimText(icpResult.secondaryStyle ?? undefined, 10),
          dominanceScore: icpResult.dominanceScore,
          affiliationScore: icpResult.affiliationScore,
          summary: trimText(isKo ? icpResult.summaryKo : icpResult.summary, 240),
          traits: trimList(
            (isKo ? icpResult.primaryOctant.traitsKo : icpResult.primaryOctant.traits) ?? [],
            4,
            80
          ),
        }
      : null

    const compactPersona = personaResult
      ? {
          typeCode: trimText(personaResult.typeCode, 20),
          personaName: trimText(personaResult.personaName, 80),
          summary: trimText(personaResult.summary, 240),
          strengths: trimList(personaResult.strengths, 4, 80),
          challenges: trimList(personaResult.challenges, 4, 80),
          guidance: trimText(personaResult.guidance, 240),
          motivations: trimList(personaResult.keyMotivations, 4, 80),
          axes: personaResult.axes,
        }
      : null

    return {
      date: dateKey,
      locale: analysisLocale,
      intervalMinutes,
      calendar: compactCalendar,
      icp: compactIcp,
      persona: compactPersona,
    }
  }, [
    analysisLocale,
    baseInfo,
    cleanText,
    dateKey,
    icpResult,
    intervalMinutes,
    isKo,
    personaResult,
  ])

  const fetchAiTimeline = useCallback(
    async (options?: { force?: boolean }) => {
      if (!profileReady || !baseInfo) return

      if (!options?.force && aiCacheRef.current[aiCacheKey]) {
        setAiTimeline(aiCacheRef.current[aiCacheKey])
        setAiSummary(null)
        setAiStatus('ready')
        setAiPrecisionMode(null)
        return
      }

      if (aiAbortRef.current) {
        aiAbortRef.current.abort()
      }
      const controller = new AbortController()
      aiAbortRef.current = controller

      setAiStatus('loading')
      setAiPrecisionMode(null)

      try {
        const payload = buildAiPayload()
        const response = await apiFetch('/api/calendar/action-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const json = await response.json()
        if (!json?.success) {
          throw new Error(json?.error?.message ?? 'AI generation failed')
        }

        const timeline = sanitizeAiTimeline(json?.data?.timeline)
        if (timeline.length === 0) {
          throw new Error('Invalid AI timeline')
        }

        aiCacheRef.current[aiCacheKey] = timeline
        setAiTimeline(timeline)
        setAiSummary(cleanText(json?.data?.summary, ''))
        setAiPrecisionMode(
          json?.data?.precisionMode === 'ai-graphrag' ||
            json?.data?.precisionMode === 'rule-fallback'
            ? json.data.precisionMode
            : null
        )
        setAiStatus('ready')
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
        logger.warn('[ActionPlan] AI timeline failed', {
          error: error instanceof Error ? error.message : String(error),
        })
        setAiSummary(null)
        setAiPrecisionMode(null)
        setAiStatus('error')
      }
    },
    [aiCacheKey, baseInfo, buildAiPayload, cleanText, profileReady, sanitizeAiTimeline]
  )

  useEffect(() => {
    if (!profileReady) return
    if (!baseInfo) {
      setAiTimeline(null)
      setAiSummary(null)
      setAiStatus('idle')
      setAiPrecisionMode(null)
      return
    }
    void fetchAiTimeline()
    return () => {
      if (aiAbortRef.current) {
        aiAbortRef.current.abort()
      }
    }
  }, [baseInfo, fetchAiTimeline, profileReady])

  const aiContextLabel = useMemo(() => {
    if (hasIcp && hasPersona) {
      return isKo ? 'ICP+성격 반영' : 'ICP + personality'
    }
    if (hasIcp) {
      return isKo ? 'ICP 반영' : 'ICP only'
    }
    if (hasPersona) {
      return isKo ? '성격 반영' : 'Personality only'
    }
    return isKo ? '기본' : 'Base'
  }, [hasIcp, hasPersona, isKo])

  const aiStatusText = useMemo(() => {
    if (!baseInfo) {
      return isKo ? '날짜 정보 없음' : 'No date data'
    }
    if (aiStatus === 'loading') {
      return isKo ? '정밀 타임라인 생성 중' : 'Generating precision timeline'
    }
    if (aiStatus === 'error') {
      return isKo
        ? '정밀 생성 실패 · 사주+점성 규칙 플랜 표시'
        : 'Precision failed · showing rule-based Saju+Astrology plan'
    }
    if (aiStatus === 'ready' && aiPrecisionMode === 'rule-fallback') {
      return isKo
        ? '규칙 기반 개인화 타임라인 · 사주+점성 근거 적용'
        : 'Rule-based personalized timeline · Saju+Astrology grounded'
    }
    if (aiStatus === 'ready') {
      return isKo
        ? `근거 기반 타임라인 적용 · ${aiContextLabel}`
        : `Evidence-based timeline applied · ${aiContextLabel}`
    }
    return isKo ? '정밀 준비됨' : 'Precision ready'
  }, [aiContextLabel, aiPrecisionMode, aiStatus, baseInfo, isKo])

  const aiButtonLabel = useMemo(() => {
    if (aiStatus === 'loading') {
      return isKo ? '정밀 생성 중' : 'Generating'
    }
    return aiTimeline
      ? isKo
        ? '정밀 새로고침'
        : 'Refresh precision'
      : isKo
        ? '정밀 생성'
        : 'Generate precision'
  }, [aiStatus, aiTimeline, isKo])

  const handleAiRefresh = useCallback(() => {
    if (!baseInfo) return
    if (aiCacheRef.current[aiCacheKey]) {
      delete aiCacheRef.current[aiCacheKey]
    }
    void fetchAiTimeline({ force: true })
  }, [aiCacheKey, baseInfo, fetchAiTimeline])

  const baseTexts = useCallback(
    (hour: number) => {
      if (hour < 5) return isKo ? '수면/휴식' : 'Sleep & rest'
      if (hour < 7) return isKo ? '기상/몸풀기' : 'Wake & stretch'
      if (hour < 9) return isKo ? '오늘 목표 점검' : 'Review goals'
      if (hour < 12) return isKo ? '집중 업무' : 'Deep work'
      if (hour < 13) return isKo ? '점심/리프레시' : 'Lunch & reset'
      if (hour < 15) return isKo ? '정리/소통' : 'Admin & sync'
      if (hour < 18) return isKo ? '실행/성과 만들기' : 'Execution'
      if (hour < 20) return isKo ? '회복/관계' : 'Recovery & connection'
      if (hour < 22) return isKo ? '리뷰/내일 준비' : 'Review & plan'
      return isKo ? '휴식 준비' : 'Wind down'
    },
    [isKo]
  )

  const bestHours = useMemo(() => {
    const hours = new Set<number>()
    baseInfo?.bestTimes?.forEach((time) => {
      extractBestHours(time).forEach((hour) => hours.add(hour))
    })
    return hours
  }, [baseInfo, extractBestHours])

  const cautionHours = useMemo(() => {
    const hours = new Set<number>()
    if (baseInfo?.warnings?.length || (baseInfo?.grade ?? 2) >= 3) {
      hours.add(13)
      hours.add(21)
    }
    return hours
  }, [baseInfo])

  const baseTimelineSlots = useMemo(() => {
    const defaultCategory = normalizeCategory(baseInfo?.categories?.[0] ?? topCategory ?? 'general')
    const defaultActions = isKo
      ? CATEGORY_ACTIONS[defaultCategory].day.ko
      : CATEGORY_ACTIONS[defaultCategory].day.en
    const baseSignal = isKo
      ? '사주 일진 + 점성 트랜짓 공통 신호'
      : 'Saju daily-pillar + astrology transit overlap'
    const sajuPrimary = cleanText(baseInfo?.sajuFactors?.[0], '')
    const astroPrimary = cleanText(baseInfo?.astroFactors?.[0], '')
    const defaultActionByHour = (hour: number) => {
      if (hour < 12) return defaultActions[0]
      if (hour < 18) return defaultActions[1] ?? defaultActions[0]
      return defaultActions[2] ?? defaultActions[0]
    }
    const defaultEvidenceByHour = (hour: number) => {
      const primary = hour < 12 ? sajuPrimary : astroPrimary || sajuPrimary
      if (!primary) return baseSignal
      return `${baseSignal}: ${primary}`
    }

    const slotsPerHour = intervalMinutes === 30 ? 2 : 1
    const totalSlots = 24 * slotsPerHour
    const slots: TimelineSlotView[] = Array.from({ length: totalSlots }, (_, index) => {
      const minute = intervalMinutes === 30 && index % 2 === 1 ? 30 : 0
      const hour = Math.floor(index / slotsPerHour)
      const defaultAction = cleanText(defaultActionByHour(hour), '')
      const defaultNote = cleanText(
        `${baseTexts(hour)}${defaultAction ? ` · ${defaultAction}` : ''}`,
        baseTexts(hour)
      )
      return {
        hour,
        minute,
        label: formatHourLabel(hour, minute),
        note: defaultNote,
        tone: 'neutral' as 'neutral' | 'best' | 'caution',
        badge: null as string | null,
        evidenceSummary: [cleanText(defaultEvidenceByHour(hour), baseSignal)],
      }
    })

    const getSlotIndex = (hour: number, minute = 0) => {
      if (intervalMinutes === 60 && minute !== 0) return -1
      return Math.floor((hour * 60 + minute) / intervalMinutes)
    }

    const applySlot = (
      hour: number,
      note: string,
      tone?: 'neutral' | 'best' | 'caution',
      minute = 0,
      evidenceSummary?: string[]
    ) => {
      const index = getSlotIndex(hour, minute)
      const slot = slots[index]
      if (!slot) return
      slot.note = cleanText(note, slot.note)
      if (tone) {
        slot.tone = tone
      }
      if (evidenceSummary?.length) {
        slot.evidenceSummary = evidenceSummary
          .map((line) => cleanText(line, ''))
          .filter(Boolean)
          .slice(0, 2)
      }
    }

    const mainSlots = [
      {
        hour: 9,
        minute: 0,
        note: todayItems[0],
        evidence: [isKo ? '사주 일진/시간대 기반 오전 집중 슬롯' : 'Saju daily-time focus slot'],
      },
      {
        hour: 14,
        minute: 0,
        note: todayItems[1],
        evidence: [
          isKo ? '점성 흐름/실행 구간 기반 오후 슬롯' : 'Astrology execution-flow PM slot',
        ],
      },
      {
        hour: 20,
        minute: 0,
        note: todayItems[2],
        evidence: [isKo ? '회복/정리 구간 기반 저녁 슬롯' : 'Recovery-and-review evening slot'],
      },
    ]
    mainSlots.forEach((slot) => {
      if (slot.note) applySlot(slot.hour, slot.note, undefined, slot.minute, slot.evidence)
    })

    if (baseInfo?.recommendations?.[0]) {
      applySlot(10, baseInfo.recommendations[0], 'best', 0, [
        isKo
          ? '추천 행동(사주+점성 교차 해석)'
          : 'Recommended action (cross-interpreted from Saju+Astrology)',
      ])
    }
    if (baseInfo?.recommendations?.[1]) {
      applySlot(15, baseInfo.recommendations[1], 'best', 0, [
        isKo
          ? '추천 행동(사주+점성 교차 해석)'
          : 'Recommended action (cross-interpreted from Saju+Astrology)',
      ])
    }
    if (baseInfo?.warnings?.[0]) {
      applySlot(13, baseInfo.warnings[0], 'caution', 0, [
        isKo ? '주의 신호(교차 리스크)' : 'Caution signal (cross-risk)',
      ])
    }
    if (baseInfo?.warnings?.[1]) {
      applySlot(21, baseInfo.warnings[1], 'caution', 0, [
        isKo ? '주의 신호(교차 리스크)' : 'Caution signal (cross-risk)',
      ])
    }

    return slots
  }, [
    baseInfo,
    baseTexts,
    cleanText,
    formatHourLabel,
    intervalMinutes,
    isKo,
    todayItems,
    topCategory,
  ])

  const timelineSlots = useMemo(() => {
    const slots: TimelineSlotView[] = baseTimelineSlots.map((slot) => ({ ...slot }))

    if (aiTimeline?.length) {
      aiTimeline.forEach((item) => {
        const minute = item.minute ?? 0
        const index =
          intervalMinutes === 60 && minute !== 0
            ? -1
            : Math.floor((item.hour * 60 + minute) / intervalMinutes)
        const slot = slots[index]
        if (!slot) return
        slot.note = cleanText(item.note, slot.note)
        if (item.tone) {
          slot.tone = item.tone
        }
        if (item.evidenceSummary?.length) {
          slot.evidenceSummary = item.evidenceSummary
            .map((line) => cleanText(line, ''))
            .filter(Boolean)
            .slice(0, 3)
        }
      })
    }

    bestHours.forEach((hour) => {
      slots.forEach((slot) => {
        if (slot.hour !== hour) return
        if (slot.tone !== 'caution') {
          slot.tone = 'best'
        }
        if (!slot.note || slot.note === baseTexts(hour)) {
          slot.note = isKo ? '핵심 일정 배치' : 'Place key task'
        }
        if (!slot.evidenceSummary?.length) {
          slot.evidenceSummary = [
            isKo ? '좋은 시간대(사주+점성 공통 우세)' : 'Best time window (Saju+Astrology aligned)',
          ]
        }
      })
    })

    cautionHours.forEach((hour) => {
      slots.forEach((slot) => {
        if (slot.hour !== hour) return
        if (slot.tone !== 'best') {
          slot.tone = 'caution'
        }
        if (!slot.evidenceSummary?.length) {
          slot.evidenceSummary = [
            isKo ? '주의 시간대(교차 리스크 신호)' : 'Caution time window (cross-risk signal)',
          ]
        }
      })
    })

    slots.forEach((slot) => {
      if (slot.tone === 'best') {
        slot.badge = isKo ? '최적' : 'Best'
      } else if (slot.tone === 'caution') {
        slot.badge = isKo ? '주의' : 'Caution'
      } else {
        slot.badge = null
      }
    })

    slots.forEach((slot) => {
      slot.note = cleanText(slot.note, baseTexts(slot.hour))
      if (slot.badge) {
        slot.badge = cleanText(slot.badge, slot.badge)
      }
      slot.evidenceSummary = (slot.evidenceSummary || [])
        .map((line) => cleanText(line, ''))
        .filter(Boolean)
        .slice(0, 2)
      if (!slot.evidenceSummary.length) {
        slot.evidenceSummary = [
          isKo
            ? '사주 일진 + 점성 트랜짓 기본 신호'
            : 'Baseline signal from Saju daily pillar + astrology transit',
        ]
      }
    })

    return slots
  }, [
    aiTimeline,
    baseTexts,
    baseTimelineSlots,
    bestHours,
    cautionHours,
    cleanText,
    intervalMinutes,
    isKo,
  ])

  const hourlyRhythm = useMemo(() => {
    return Array.from({ length: 24 }, (_, hour) => {
      const hourSlots = timelineSlots.filter((slot) => slot.hour === hour)
      let tone: 'best' | 'caution' | 'neutral' = 'neutral'
      if (hourSlots.some((slot) => slot.tone === 'caution')) {
        tone = 'caution'
      } else if (hourSlots.some((slot) => slot.tone === 'best')) {
        tone = 'best'
      }

      const primarySlot =
        hourSlots.find((slot) => slot.tone === tone && slot.note) ||
        hourSlots.find((slot) => slot.note) ||
        hourSlots[0]

      return {
        hour,
        tone,
        note: cleanText(primarySlot?.note || ''),
      }
    })
  }, [timelineSlots, cleanText])

  useEffect(() => {
    const preferredHour =
      timelineSlots.find((slot) => slot.tone === 'best')?.hour ??
      timelineSlots.find((slot) => slot.tone === 'neutral')?.hour ??
      9
    setActiveRhythmHour(preferredHour)
  }, [timelineSlots])

  const handleRhythmSelect = useCallback(
    (hour: number) => {
      setActiveRhythmHour(hour)
      const preferredSlot =
        timelineSlots.find((slot) => slot.hour === hour && slot.tone === 'best') ||
        timelineSlots.find((slot) => slot.hour === hour && slot.tone === 'neutral') ||
        timelineSlots.find((slot) => slot.hour === hour)
      if (!preferredSlot) return
      const key = `${preferredSlot.hour}-${preferredSlot.minute ?? 0}`
      const element = timelineSlotRefs.current[key]
      if (!element) return
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    [timelineSlots]
  )

  const activeRhythmInfo = useMemo(() => {
    if (activeRhythmHour === null) return null
    return hourlyRhythm.find((item) => item.hour === activeRhythmHour) || null
  }, [activeRhythmHour, hourlyRhythm])

  const weekItems = useMemo(() => {
    const items: string[] = []
    const pushItem = (item: string | undefined) => {
      if (!item) return
      if (!items.includes(item)) {
        items.push(item)
      }
    }

    if (bestDays.length > 0) {
      const labels = bestDays.map((entry) => formatDateLabel(entry.date)).join(', ')
      pushItem(isKo ? `중요 일정은 ${labels}에 배치` : `Schedule key tasks on ${labels}`)
    }

    const weekCategory: EventCategory = topCategory ?? baseInfo?.categories?.[0] ?? 'general'
    const weekActions = isKo
      ? CATEGORY_ACTIONS[weekCategory].week.ko
      : CATEGORY_ACTIONS[weekCategory].week.en
    const weekRangeLabel =
      rangeDays === 7 ? (isKo ? '이번 주' : 'this week') : isKo ? '이번 2주' : 'the next 2 weeks'
    pushItem(
      isKo
        ? `${weekRangeLabel} ${categoryLabel(weekCategory)} 중심 목표 1개 설정`
        : `Focus on one ${categoryLabel(weekCategory)} goal ${weekRangeLabel}`
    )
    pushItem(weekActions[0])

    const bestRec = bestDays.find((d) => d.info.recommendations?.length)?.info.recommendations?.[0]
    pushItem(bestRec)

    if (cautionDays.length > 0) {
      const labels = cautionDays.map((entry) => formatDateLabel(entry.date)).join(', ')
      pushItem(isKo ? `주의할 날: ${labels}` : `Caution days: ${labels}`)
      pushItem(isKo ? '위험한 일은 좋은 날로 이동' : 'Move risky tasks to better days')
    }

    while (items.length < 4) {
      const fallback = (isKo ? DEFAULT_WEEK_KO : DEFAULT_WEEK_EN)[items.length]
      pushItem(fallback)
    }

    return items
      .slice(0, 4)
      .map((item) => cleanText(item))
      .filter(Boolean)
  }, [
    bestDays,
    cleanText,
    cautionDays,
    topCategory,
    isKo,
    formatDateLabel,
    categoryLabel,
    baseInfo,
    rangeDays,
  ])

  const todayTiming = cleanText(baseInfo?.bestTimes?.[0])
  const todayCaution = cleanText(baseInfo?.warnings?.[0])
  const evidenceBadges = useMemo(
    () => [
      isKo ? '종합 신호 기반' : 'Combined signals',
      isKo ? '교차 검증' : 'Cross-verified',
      isKo ? '주의 신호' : 'Caution signal',
    ],
    [isKo]
  )
  const evidenceLines = useMemo(() => {
    const lines: string[] = []
    if (baseInfo?.evidence?.matrix) {
      const matrixDomain = baseInfo.evidence.matrix.domain || 'general'
      const matrixScore = baseInfo.evidence.matrix.finalScoreAdjusted
      const confidence = baseInfo.evidence.confidence
      lines.push(
        isKo
          ? `종합 신호: ${matrixDomain} 영역 · 점수 ${matrixScore ?? '-'} · 신뢰도 ${confidence ?? '-'}%`
          : `Combined signal: ${matrixDomain} domain · score ${matrixScore ?? '-'} · confidence ${confidence ?? '-'}%`
      )
    }
    const sajuEvidence = cleanText(baseInfo?.evidence?.cross?.sajuEvidence, '')
    const astroEvidence = cleanText(baseInfo?.evidence?.cross?.astroEvidence, '')
    if (sajuEvidence || astroEvidence) {
      lines.push(
        isKo
          ? `교차 근거: 사주 ${sajuEvidence || '신호 있음'} / 점성 ${astroEvidence || '신호 있음'}`
          : `Cross evidence: Saju ${sajuEvidence || 'signal present'} / Astrology ${astroEvidence || 'signal present'}`
      )
    }
    ;(baseInfo?.evidence?.cross?.astroDetails || []).forEach((line) => {
      const cleaned = cleanText(line)
      if (cleaned) {
        lines.push(cleaned)
      }
    })
    ;(baseInfo?.evidence?.cross?.sajuDetails || []).forEach((line) => {
      const cleaned = cleanText(line)
      if (cleaned) {
        lines.push(cleaned)
      }
    })
    ;(baseInfo?.evidence?.cross?.bridges || []).forEach((line) => {
      const cleaned = cleanText(line)
      if (cleaned) {
        lines.push(cleaned)
      }
    })
    if (todayCaution) {
      lines.push(isKo ? `주의 신호: ${todayCaution}` : `Caution signal: ${todayCaution}`)
    }
    if (!lines.length) {
      lines.push(
        isKo
          ? '사주 일진과 점성 트랜짓의 공통 신호를 기준으로 행동 우선순위를 구성했습니다.'
          : 'Priorities are built from overlapping Saju daily-pillar and astrology transit signals.'
      )
    }
    return lines.slice(0, 6).map((line) => cleanText(line))
  }, [baseInfo?.evidence, cleanText, isKo, todayCaution])

  const timelineInsight = useMemo(() => {
    if (!baseInfo) {
      return isKo
        ? '선택한 날짜를 기준으로 시간대를 자동 정리합니다.'
        : 'Timeline is generated from selected-date signals.'
    }
    const peakText = resolvedPeakLevel
      ? isKo
        ? getPeakLabel(resolvedPeakLevel, 'ko')
        : getPeakLabel(resolvedPeakLevel, 'en')
      : isKo
        ? '기본 구간'
        : 'Base window'
    const cautionText = baseInfo.warnings?.length
      ? isKo
        ? '주의 슬롯 포함'
        : 'Caution slots included'
      : isKo
        ? '주의 슬롯 없음'
        : 'No caution slots'
    const precisionText =
      aiStatus === 'error'
        ? isKo
          ? '규칙 기반 자동 전환'
          : 'Auto-switched to rule-based mode'
        : aiPrecisionMode === 'rule-fallback'
          ? isKo
            ? '규칙 기반 개인화 모드'
            : 'Rule-based personalized mode'
          : aiSummary
            ? cleanText(aiSummary, '')
            : ''
    return isKo
      ? `${peakText} 기준 타임라인 · ${cautionText}${precisionText ? ` · ${precisionText}` : ''}`
      : `${peakText} timeline · ${cautionText}${precisionText ? ` · ${precisionText}` : ''}`
  }, [aiPrecisionMode, aiStatus, aiSummary, baseInfo, cleanText, isKo, resolvedPeakLevel])

  const todayInsight = useMemo(() => {
    if (evidenceLines[0]) return evidenceLines[0]
    return isKo
      ? '교차 신호를 바탕으로 오늘 실행 우선순위를 압축했습니다.'
      : 'Today priorities are compressed from cross-signals.'
  }, [evidenceLines, isKo])

  const weekInsight = useMemo(() => {
    const bestCount = bestDays.length
    const cautionCount = cautionDays.length
    const focusLabel = topCategory ? categoryLabel(topCategory) : isKo ? '전체' : 'general'
    return isKo
      ? `좋은 날 ${bestCount}회 · 주의 날 ${cautionCount}회 · ${focusLabel} 중심 배치`
      : `${bestCount} good-day slots · ${cautionCount} caution-day slots · ${focusLabel} focus`
  }, [bestDays.length, cautionDays.length, topCategory, categoryLabel, isKo])

  const bestDayChips = bestDays.map((entry) => ({
    label: formatDateLabel(entry.date),
    emoji: GRADE_EMOJI[entry.info.grade],
  }))
  const cautionDayChips = cautionDays.map((entry) => ({
    label: formatDateLabel(entry.date),
    emoji: GRADE_EMOJI[entry.info.grade],
  }))
  const shareText = useCallback(() => {
    const lines: string[] = []
    lines.push(
      isKo
        ? `행동 플랜 (${formatDateLabel(baseDate)})`
        : `Action Plan (${formatDateLabel(baseDate)})`
    )
    if (bestDayChips.length > 0) {
      lines.push(
        `${isKo ? '좋은 날' : 'Good days'}: ${bestDayChips.map((chip) => chip.label).join(', ')}`
      )
    }
    if (cautionDayChips.length > 0) {
      lines.push(
        `${isKo ? '주의 날' : 'Caution days'}: ${cautionDayChips.map((chip) => chip.label).join(', ')}`
      )
    }
    lines.push(isKo ? '오늘 체크리스트' : 'Today Checklist')
    todayItems.forEach((item) => lines.push(`- ${item}`))
    if (todayTiming) {
      lines.push(isKo ? `추천 시간: ${todayTiming}` : `Best timing: ${todayTiming}`)
    }
    if (todayCaution) {
      lines.push(isKo ? `주의: ${todayCaution}` : `Caution: ${todayCaution}`)
    }
    lines.push(weekTitle)
    weekItems.forEach((item) => lines.push(`- ${item}`))
    if (topCategory) {
      lines.push(
        isKo
          ? `주간 포커스: ${categoryLabel(topCategory)}`
          : `Weekly focus: ${categoryLabel(topCategory)}`
      )
    }
    return lines.join('\n')
  }, [
    isKo,
    formatDateLabel,
    baseDate,
    bestDayChips,
    cautionDayChips,
    todayItems,
    todayTiming,
    todayCaution,
    weekTitle,
    weekItems,
    topCategory,
    categoryLabel,
  ])

  const handleShare = useCallback(async () => {
    const text = shareText()
    const fallbackCopy = () => {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', 'true')
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        return ok
      } catch {
        return false
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        setShareStatus(isKo ? '복사됨' : 'Copied')
        return
      }
      const ok = fallbackCopy()
      setShareStatus(ok ? (isKo ? '복사됨' : 'Copied') : isKo ? '복사 실패' : 'Copy failed')
    } catch {
      const ok = fallbackCopy()
      setShareStatus(ok ? (isKo ? '복사됨' : 'Copied') : isKo ? '복사 실패' : 'Copy failed')
    }
  }, [shareText, setShareStatus, isKo])

  const handlePrint = useCallback(() => {
    if (typeof window === 'undefined') return
    window.print()
  }, [])

  return (
    <div className={styles.actionPlanContainer}>
      <div className={styles.actionPlanHeader}>
        <div>
          <p className={styles.actionPlanTitle}>{isKo ? '행동 플랜' : 'Action Plan'}</p>
          <p className={styles.actionPlanSubtitle}>
            {isKo ? '기준 날짜' : 'Base date'}: {formatDateLabel(baseDate)}
          </p>
        </div>
        {baseInfo?.categories?.length ? (
          <div className={styles.actionPlanMeta}>
            {resolvedPeakLevel && (
              <span className={styles.actionPlanMetaItem}>
                {isKo
                  ? getPeakLabel(resolvedPeakLevel, 'ko')
                  : getPeakLabel(resolvedPeakLevel, 'en')}
              </span>
            )}
            {baseInfo.categories.slice(0, 2).map((cat) => (
              <span key={cat} className={styles.actionPlanMetaItem}>
                {CATEGORY_EMOJI[cat]} {categoryLabel(cat)}
              </span>
            ))}
          </div>
        ) : (
          <span className={styles.actionPlanMetaItem}>
            {isKo ? '선택된 날짜 정보 없음' : 'No date info selected'}
          </span>
        )}
        <div className={styles.actionPlanControls}>
          <div className={styles.actionPlanDateControls}>
            <button
              type="button"
              className={styles.actionPlanNavBtn}
              onClick={() => {
                const nextDate = new Date(baseDate)
                nextDate.setDate(nextDate.getDate() - 1)
                commitDate(nextDate)
              }}
              aria-label={isKo ? '이전 날' : 'Previous day'}
            >
              ←
            </button>
            <input
              type="date"
              className={styles.actionPlanDateInput}
              value={inputDateValue}
              onChange={(event) => {
                const value = event.target.value
                if (!value) return
                const [y, m, d] = value.split('-').map((part) => Number(part))
                if (!y || !m || !d) return
                const nextDate = new Date(y, m - 1, d)
                if (Number.isNaN(nextDate.getTime())) return
                commitDate(nextDate)
              }}
            />
            <button
              type="button"
              className={styles.actionPlanNavBtn}
              onClick={() => {
                const nextDate = new Date(baseDate)
                nextDate.setDate(nextDate.getDate() + 1)
                commitDate(nextDate)
              }}
              aria-label={isKo ? '다음 날' : 'Next day'}
            >
              →
            </button>
            <button
              type="button"
              className={styles.actionPlanTodayBtn}
              onClick={() => commitDate(new Date())}
            >
              {isKo ? '오늘' : 'Today'}
            </button>
          </div>
          <div className={styles.actionPlanActions}>
            <div className={styles.actionPlanRange}>
              <button
                type="button"
                className={`${styles.actionPlanRangeBtn} ${rangeDays === 7 ? styles.actionPlanRangeBtnActive : ''}`}
                aria-pressed={rangeDays === 7}
                onClick={() => setRangeDays(7)}
              >
                {isKo ? '7일' : '7 days'}
              </button>
              <button
                type="button"
                className={`${styles.actionPlanRangeBtn} ${rangeDays === 14 ? styles.actionPlanRangeBtnActive : ''}`}
                aria-pressed={rangeDays === 14}
                onClick={() => setRangeDays(14)}
              >
                {isKo ? '14일' : '14 days'}
              </button>
            </div>
            <button
              type="button"
              className={styles.actionPlanShareBtn}
              onClick={handleShare}
              aria-label={isKo ? '행동 플랜 복사' : 'Copy action plan'}
            >
              {isKo ? '공유' : 'Share'}
            </button>
            <button
              type="button"
              className={styles.actionPlanPrintBtn}
              onClick={handlePrint}
              aria-label={isKo ? 'PDF 저장' : 'Save as PDF'}
            >
              {isKo ? 'PDF' : 'PDF'}
            </button>
            {shareMessage && (
              <span className={styles.actionPlanStatus} role="status" aria-live="polite">
                {shareMessage}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.actionPlanChips}>
        {bestDayChips.length > 0 && (
          <div className={styles.actionPlanChipGroup}>
            <span className={styles.actionPlanChipLabel}>{isKo ? '좋은 날' : 'Good days'}</span>
            {bestDayChips.map((chip) => (
              <span
                key={chip.label}
                className={`${styles.actionPlanChip} ${styles.actionPlanChipGood}`}
              >
                {chip.emoji} {chip.label}
              </span>
            ))}
          </div>
        )}
        {cautionDayChips.length > 0 && (
          <div className={styles.actionPlanChipGroup}>
            <span className={styles.actionPlanChipLabel}>{isKo ? '주의 날' : 'Caution days'}</span>
            {cautionDayChips.map((chip) => (
              <span
                key={chip.label}
                className={`${styles.actionPlanChip} ${styles.actionPlanChipBad}`}
              >
                {chip.emoji} {chip.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.actionPlanGrid}>
        <div className={`${styles.actionPlanCard} ${styles.actionPlanTimeline}`}>
          <div className={styles.actionPlanTimelineHeader}>
            <div>
              <span className={styles.actionPlanCardTitle}>
                {isKo ? '24시간 타임라인' : '24-Hour Timeline'}
              </span>
              <span className={styles.actionPlanCardFocus}>
                {intervalMinutes === 30
                  ? isKo
                    ? '30분 단위로 오늘의 리듬 정리'
                    : '30-minute rhythm for today'
                  : isKo
                    ? '1시간 단위로 오늘의 리듬 정리'
                    : 'Hourly rhythm for today'}
              </span>
            </div>
            <div className={styles.actionPlanTimelineMeta}>
              <div className={styles.actionPlanTimelineActions}>
                <div className={styles.actionPlanRange}>
                  <button
                    type="button"
                    className={`${styles.actionPlanRangeBtn} ${intervalMinutes === 30 ? styles.actionPlanRangeBtnActive : ''}`}
                    aria-pressed={intervalMinutes === 30}
                    onClick={() => setIntervalMinutes(30)}
                  >
                    {isKo ? '30분' : '30m'}
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionPlanRangeBtn} ${intervalMinutes === 60 ? styles.actionPlanRangeBtnActive : ''}`}
                    aria-pressed={intervalMinutes === 60}
                    onClick={() => setIntervalMinutes(60)}
                  >
                    {isKo ? '1시간' : '1h'}
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.actionPlanTimelineAiBtn}
                  onClick={handleAiRefresh}
                  disabled={!baseInfo || aiStatus === 'loading'}
                  aria-label={isKo ? '정밀 타임라인 생성' : 'Generate precision timeline'}
                >
                  {aiButtonLabel}
                </button>
                {aiStatus === 'loading' && (
                  <span className={styles.actionPlanTimelineSpinner} aria-hidden="true" />
                )}
                <span
                  className={`${styles.actionPlanTimelineStatus} ${
                    aiStatus === 'error' ? styles.actionPlanTimelineStatusError : ''
                  }`}
                >
                  {aiStatusText}
                </span>
              </div>
              <div className={styles.actionPlanTimelineLegend}>
                <span className={styles.actionPlanTimelineLegendItem}>
                  <span
                    className={`${styles.actionPlanTimelineDot} ${styles.actionPlanTimelineDotBest}`}
                  />
                  {isKo ? '좋은 시간' : 'Best'}
                </span>
                <span className={styles.actionPlanTimelineLegendItem}>
                  <span
                    className={`${styles.actionPlanTimelineDot} ${styles.actionPlanTimelineDotCaution}`}
                  />
                  {isKo ? '주의 시간' : 'Caution'}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.actionPlanRhythmWrap}>
            <div className={styles.actionPlanRhythmHeader}>
              <span className={styles.actionPlanCardTitle}>
                {isKo ? '원형 하루 리듬' : 'Circular Day Rhythm'}
              </span>
              <span className={styles.actionPlanCardFocus}>
                {isKo
                  ? '시간대를 누르면 아래 상세 슬롯으로 이동'
                  : 'Tap an hour to jump to detailed slots'}
              </span>
            </div>
            <div
              className={styles.actionPlanRhythmRing}
              role="list"
              aria-label={isKo ? '하루 시간대 리듬' : 'Daily rhythm by hour'}
            >
              {hourlyRhythm.map((item) => {
                const angle = (item.hour / 24) * 360
                const isActive = activeRhythmHour === item.hour
                return (
                  <button
                    key={`rhythm-${item.hour}`}
                    type="button"
                    role="listitem"
                    className={`${styles.actionPlanRhythmSector} ${
                      item.tone === 'best'
                        ? styles.actionPlanRhythmSectorBest
                        : item.tone === 'caution'
                          ? styles.actionPlanRhythmSectorCaution
                          : styles.actionPlanRhythmSectorNeutral
                    } ${isActive ? styles.actionPlanRhythmSectorActive : ''}`}
                    style={{
                      transform: `rotate(${angle}deg) translateY(calc(-1 * var(--action-plan-ring-radius))) rotate(${-angle}deg)`,
                    }}
                    aria-label={`${item.hour}:00`}
                    onClick={() => handleRhythmSelect(item.hour)}
                  >
                    {String(item.hour).padStart(2, '0')}
                  </button>
                )
              })}
              <div className={styles.actionPlanRhythmCenter}>
                <div className={styles.actionPlanRhythmHour}>
                  {activeRhythmHour !== null
                    ? `${String(activeRhythmHour).padStart(2, '0')}:00`
                    : isKo
                      ? '시간 선택'
                      : 'Select hour'}
                </div>
                <div className={styles.actionPlanRhythmNote}>
                  {activeRhythmInfo?.note ||
                    (isKo ? '원형에서 시간대를 선택하세요.' : 'Select an hour from the ring.')}
                </div>
              </div>
            </div>
          </div>
          <p className={styles.actionPlanInsightLine}>{timelineInsight}</p>
          <div className={styles.actionPlanTimelineGrid} role="list">
            {timelineSlots.map((slot) => (
              <div
                key={`${slot.hour}-${slot.minute ?? 0}`}
                role="listitem"
                ref={(node) => {
                  timelineSlotRefs.current[`${slot.hour}-${slot.minute ?? 0}`] = node
                }}
                className={`${styles.actionPlanTimelineSlot} ${
                  slot.tone === 'best'
                    ? styles.actionPlanTimelineSlotBest
                    : slot.tone === 'caution'
                      ? styles.actionPlanTimelineSlotCaution
                      : ''
                } ${activeRhythmHour === slot.hour ? styles.actionPlanTimelineSlotLinked : ''}`}
                onClick={() => setActiveRhythmHour(slot.hour)}
              >
                <div className={styles.actionPlanTimelineTime}>
                  <div className={styles.actionPlanTimelineTimeMain}>
                    <span className={styles.actionPlanTimelineClock}>{slot.label}</span>
                    <span className={styles.actionPlanTimelineTone}>
                      {slot.tone === 'best'
                        ? isKo
                          ? '집중'
                          : 'Focus'
                        : slot.tone === 'caution'
                          ? isKo
                            ? '주의'
                            : 'Caution'
                          : isKo
                            ? '기본'
                            : 'Base'}
                    </span>
                  </div>
                  {slot.badge && (
                    <span className={styles.actionPlanTimelineBadge}>{slot.badge}</span>
                  )}
                </div>
                <div className={styles.actionPlanTimelineNote}>{slot.note}</div>
                {slot.evidenceSummary && slot.evidenceSummary.length > 0 && (
                  <ul className={styles.actionPlanTimelineEvidenceList}>
                    {slot.evidenceSummary.map((line) => (
                      <li key={`${slot.hour}-${slot.minute}-${line}`}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.actionPlanCard}>
          <div className={styles.actionPlanCardHeader}>
            <span className={styles.actionPlanCardTitle}>
              {isKo ? '오늘 체크리스트' : 'Today Checklist'}
            </span>
            <span className={styles.actionPlanCardFocus}>{todayFocus}</span>
          </div>
          <p className={styles.actionPlanInsightLine}>{todayInsight}</p>
          <ul className={styles.actionPlanList}>
            {todayItems.map((item, idx) => (
              <li key={idx} className={styles.actionPlanItem}>
                <span className={styles.actionPlanItemCheck}>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className={styles.actionPlanEvidence}>
            <div className={styles.actionPlanEvidenceBadges}>
              {evidenceBadges.map((badge) => (
                <span key={badge} className={styles.actionPlanEvidenceBadge}>
                  {badge}
                </span>
              ))}
            </div>
            <ul className={styles.actionPlanEvidenceList}>
              {evidenceLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          {todayTiming && (
            <div className={styles.actionPlanTiming}>
              ⏰ {isKo ? '추천 시간' : 'Best timing'}: {todayTiming}
            </div>
          )}
          {todayCaution && (
            <div className={styles.actionPlanCaution}>
              ⚠ {isKo ? '주의' : 'Caution'}: {todayCaution}
            </div>
          )}
        </div>

        <div className={styles.actionPlanCard}>
          <div className={styles.actionPlanCardHeader}>
            <span className={styles.actionPlanCardTitle}>{weekTitle}</span>
            <span className={styles.actionPlanCardFocus}>{weekFocus}</span>
          </div>
          <p className={styles.actionPlanInsightLine}>{weekInsight}</p>
          <ul className={styles.actionPlanList}>
            {weekItems.map((item, idx) => (
              <li key={idx} className={styles.actionPlanItem}>
                <span className={styles.actionPlanItemCheck}>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {topCategory && (
            <div className={styles.actionPlanTiming}>
              🎯 {isKo ? '주간 포커스' : 'Weekly focus'}: {CATEGORY_EMOJI[topCategory]}{' '}
              {categoryLabel(topCategory)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default CalendarActionPlanView
