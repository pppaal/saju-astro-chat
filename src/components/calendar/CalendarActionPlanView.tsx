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
import { formatDecisionActionLabels, formatPolicyCheckLabels } from '@/lib/destiny-matrix/core/actionCopy'
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
  slotTypes?: Array<
    'deepWork' | 'decision' | 'communication' | 'money' | 'relationship' | 'recovery'
  >
  why?: {
    signalIds?: string[]
    anchorIds?: string[]
    patterns?: string[]
    summary?: string
  }
  guardrail?: string
  evidenceSummary?: string[]
  confidence?: number
  confidenceReason?: string[]
}

type TimelineSlotView = {
  hour: number
  minute: number
  label: string
  note: string
  tone: 'neutral' | 'best' | 'caution'
  badge: string | null
  slotTypes?: string[]
  whySummary?: string | null
  whySignalIds?: string[]
  whyAnchorIds?: string[]
  whyPatterns?: string[]
  guardrail?: string | null
  evidenceSummary?: string[]
  confidence?: number | null
  confidenceReason?: string[]
}

type ActionPlanPrecisionMode = 'ai-graphrag' | 'rule-fallback' | null

type ActionPlanInsights = {
  ifThenRules: string[]
  situationTriggers: string[]
  actionFramework: {
    do: string[]
    dont: string[]
    alternative: string[]
  }
  riskTriggers: string[]
  successKpi: string[]
  deltaToday: string
}

type ActionPlanCacheEntry = {
  timeline: AiTimelineSlot[]
  summary: string | null
  precisionMode: ActionPlanPrecisionMode
  insights: ActionPlanInsights | null
}

type SanitizedSlotType = NonNullable<AiTimelineSlot['slotTypes']>[number]

const SLOT_TYPE_LABELS_KO: Record<string, string> = {
  deepWork: '집중',
  decision: '결정',
  communication: '소통',
  money: '재정',
  relationship: '관계',
  recovery: '회복',
}

const SLOT_TYPE_LABELS_EN: Record<string, string> = {
  deepWork: 'Deep Work',
  decision: 'Decision',
  communication: 'Communication',
  money: 'Money',
  relationship: 'Relationship',
  recovery: 'Recovery',
}

const SLOT_TYPE_VALUES = [
  'deepWork',
  'decision',
  'communication',
  'money',
  'relationship',
  'recovery',
] as const satisfies ReadonlyArray<SanitizedSlotType>

const SLOT_TYPE_KEYS = new Set<SanitizedSlotType>(SLOT_TYPE_VALUES)

function normalizeTimelineSemanticKey(value: string): string {
  if (!value) return ''
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const isSanitizedSlotType = (value: string): value is SanitizedSlotType =>
  SLOT_TYPE_KEYS.has(value as SanitizedSlotType)

const WHY_PATTERN_LABELS_KO: Record<string, string> = {
  speed_up_validation_down: '속도↑ 검증↓',
  risk_exposure_up: '리스크 노출↑',
  relationship_sensitivity_up: '관계 민감도↑',
  spending_impulse_up: '지출 충동↑',
  recovery_need_up: '회복 필요↑',
  signal_balance: '신호 균형',
}

const WHY_PATTERN_LABELS_EN: Record<string, string> = {
  speed_up_validation_down: 'speed up, validation down',
  risk_exposure_up: 'risk exposure up',
  relationship_sensitivity_up: 'relationship sensitivity up',
  spending_impulse_up: 'spending impulse up',
  recovery_need_up: 'recovery need up',
  signal_balance: 'signal balance',
}

const CONFIDENCE_REASON_LABELS_KO: Record<string, string> = {
  'Evidence conflict': '근거 충돌',
  'Anchor shortage': '앵커 부족',
  'Low signal density': '신호 밀도 낮음',
  'Risk window': '주의 구간',
  'Low baseline confidence': '기본 신뢰도 낮음',
  'Signals aligned': '신호 정렬 양호',
}

const CONFIDENCE_REASON_LABELS_EN: Record<string, string> = {
  'Evidence conflict': 'Evidence conflict',
  'Anchor shortage': 'Anchor shortage',
  'Low signal density': 'Low signal density',
  'Risk window': 'Risk window',
  'Low baseline confidence': 'Low baseline confidence',
  'Signals aligned': 'Signals aligned',
}

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
  const [aiInsights, setAiInsights] = useState<ActionPlanInsights | null>(null)
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [aiPrecisionMode, setAiPrecisionMode] = useState<ActionPlanPrecisionMode>(null)
  const aiCacheRef = useRef<Record<string, ActionPlanCacheEntry>>({})
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
    () =>
      resolvePeakLevel(
        baseInfo?.evidence?.matrix?.peakLevel,
        baseInfo?.displayScore ?? baseInfo?.score
      ),
    [baseInfo?.evidence?.matrix?.peakLevel, baseInfo?.displayScore, baseInfo?.score]
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

  const selectedMatrixPacket = useMemo(() => {
    const packetKeyCandidates = [
      baseInfo?.evidence?.matrix?.domain === 'money'
        ? 'wealth'
        : baseInfo?.evidence?.matrix?.domain,
      ...(baseInfo?.categories || []),
      'today',
      'general',
    ]
      .map((value) => (value || '').toLowerCase())
      .filter(Boolean)
      .map((value) => {
        if (value === 'money') return 'wealth'
        if (value === 'move' || value === 'travel' || value === 'general') return 'today'
        if (value === 'study') return 'career'
        return value
      })
    return packetKeyCandidates.map((key) => data?.matrixEvidencePackets?.[key]).find(Boolean)
  }, [baseInfo?.categories, baseInfo?.evidence?.matrix?.domain, data?.matrixEvidencePackets])

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

  const stripControlChars = useCallback((value: string) => {
    if (!value) return ''
    return value.replace(/[\u0000-\u001F\u007F]/g, ' ')
  }, [])

  const shouldDecodeLatin1 = useCallback((value: string) => {
    if (!value) return false
    if (/[가-힣\u3040-\u30ff\u3400-\u9fff]/.test(value)) return false
    const latinExtendedCount = (value.match(/[\u00C0-\u00FF]/g) || []).length
    return latinExtendedCount >= 2
  }, [])

  const isUnreadableText = useCallback((value: string) => {
    if (!value) return true
    if (value.includes('\uFFFD')) return true
    const suspiciousMatches = value.match(/[\u00C0-\u00FF]/g) || []
    if (suspiciousMatches.length >= 3) return true
    const mojibakeRatio = suspiciousMatches.length / Math.max(1, value.length)
    return mojibakeRatio > 0.15
  }, [])

  const cleanText = useCallback(
    (value: string | null | undefined, fallback = '') => {
      if (!value) return fallback
      let current = value
      for (let pass = 0; pass < 3; pass++) {
        const repaired = stripControlChars(repairMojibakeText(current))
        const decodedUnicode = decodeUnicodeEscapes(repaired)
        const decodedTokens = decodeBareUnicodeTokens(decodedUnicode)
        const stripped = stripMatrixDomainText(stripControlChars(decodedTokens))
        const latinDecoded = shouldDecodeLatin1(stripped)
          ? decodeUtf8FromLatin1(stripped)
          : stripped
        current = stripMatrixDomainText(stripControlChars(latinDecoded)).replace(/\s+/g, ' ').trim()
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
      shouldDecodeLatin1,
      stripControlChars,
      stripMatrixDomainText,
    ]
  )

  const formatSlotTypeLabel = useCallback(
    (slotType: string) => {
      if (!slotType) return ''
      return isKo
        ? SLOT_TYPE_LABELS_KO[slotType] || slotType
        : SLOT_TYPE_LABELS_EN[slotType] || slotType
    },
    [isKo]
  )

  const formatWhyPatternLabel = useCallback(
    (pattern: string) => {
      if (!pattern) return ''
      return isKo
        ? WHY_PATTERN_LABELS_KO[pattern] || pattern.replaceAll('_', ' ')
        : WHY_PATTERN_LABELS_EN[pattern] || pattern.replaceAll('_', ' ')
    },
    [isKo]
  )

  const formatConfidenceReasonLabel = useCallback(
    (reason: string) => {
      if (!reason) return ''
      return isKo
        ? CONFIDENCE_REASON_LABELS_KO[reason] || reason
        : CONFIDENCE_REASON_LABELS_EN[reason] || reason
    },
    [isKo]
  )

  const formatWhyMetaLabel = useCallback(
    (slot: TimelineSlotView) => {
      const parts: string[] = []
      if (slot.whyPatterns?.length) {
        parts.push(
          isKo
            ? `두드러진 흐름 ${slot.whyPatterns.map(formatWhyPatternLabel).join(' · ')}`
            : `Dominant pattern ${slot.whyPatterns.map(formatWhyPatternLabel).join(' · ')}`
        )
      }
      if (slot.whySignalIds?.length) {
        parts.push(
          isKo ? `근거 신호 ${slot.whySignalIds.length}개` : `${slot.whySignalIds.length} signals`
        )
      }
      if (slot.whyAnchorIds?.length) {
        parts.push(
          isKo ? `앵커 ${slot.whyAnchorIds.length}개` : `${slot.whyAnchorIds.length} anchors`
        )
      }
      return parts.join(' · ')
    },
    [formatWhyPatternLabel, isKo]
  )

  const formatConfidenceNote = useCallback(
    (reasons: string[]) => {
      const joined = reasons.map(formatConfidenceReasonLabel).join(' · ')
      if (!joined) return ''
      return isKo ? `신뢰도 메모: ${joined}` : `Confidence note: ${joined}`
    },
    [formatConfidenceReasonLabel, isKo]
  )

  const isGenericTimelineCopy = useCallback(
    (value: string) => {
      const normalized = normalizeTimelineSemanticKey(cleanText(value, ''))
      if (!normalized) return false
      const genericNeedles = isKo
        ? [
            '오늘 신호 균형을 기준으로 슬롯별 강약을 나눠 운영합니다',
            '사주 일진 점성 트랜짓 기본 신호',
            '좋은 시간대 사주 점성 공통 우세',
            '주의 시간대 교차 리스크 신호',
            '신호 정렬 양호',
            '리스크 구간',
            '실행 전 성공 조건 1줄 먼저 작성',
            '결정은 하되 반대 근거 1개 확인 전 확정 금지',
          ]
        : [
            'operate each slot based on today signal balance',
            'baseline signal from saju daily pillar astrology transit',
            'best time window saju astrology aligned',
            'caution time window cross risk signal',
            'signals aligned',
            'risk window',
            'write one success condition before execution',
            'do not finalize before one counter evidence check',
          ]
      return genericNeedles.some((needle) => normalized.includes(normalizeTimelineSemanticKey(needle)))
    },
    [cleanText, isKo]
  )

  const clampConfidence = useCallback(
    (value: number) => Math.max(0, Math.min(100, Math.round(value))),
    []
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
      const grade = baseInfo?.displayGrade ?? baseInfo?.grade ?? 2
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
        const slotTypesRaw = (item as { slotTypes?: unknown }).slotTypes
        const slotTypes = Array.isArray(slotTypesRaw)
          ? slotTypesRaw
              .map((type) => (typeof type === 'string' ? cleanText(type, '') : ''))
              .filter(isSanitizedSlotType)
              .slice(0, 2)
          : undefined
        const whyRaw = (item as { why?: unknown }).why
        const whySummary =
          whyRaw && typeof whyRaw === 'object'
            ? cleanText((whyRaw as { summary?: unknown }).summary as string | undefined, '')
            : ''
        const whySignalIds =
          whyRaw &&
          typeof whyRaw === 'object' &&
          Array.isArray((whyRaw as { signalIds?: unknown }).signalIds)
            ? ((whyRaw as { signalIds?: unknown }).signalIds as unknown[])
                .map((line) => (typeof line === 'string' ? cleanText(line, '') : ''))
                .filter(Boolean)
                .slice(0, 4)
            : undefined
        const whyAnchorIds =
          whyRaw &&
          typeof whyRaw === 'object' &&
          Array.isArray((whyRaw as { anchorIds?: unknown }).anchorIds)
            ? ((whyRaw as { anchorIds?: unknown }).anchorIds as unknown[])
                .map((line) => (typeof line === 'string' ? cleanText(line, '') : ''))
                .filter(Boolean)
                .slice(0, 3)
            : undefined
        const whyPatterns =
          whyRaw &&
          typeof whyRaw === 'object' &&
          Array.isArray((whyRaw as { patterns?: unknown }).patterns)
            ? ((whyRaw as { patterns?: unknown }).patterns as unknown[])
                .map((line) => (typeof line === 'string' ? cleanText(line, '') : ''))
                .filter(Boolean)
                .slice(0, 3)
            : undefined
        const guardrailRaw = (item as { guardrail?: unknown }).guardrail
        const guardrail = typeof guardrailRaw === 'string' ? cleanText(guardrailRaw, '') : ''
        const confidenceRaw = (item as { confidence?: unknown }).confidence
        const confidence =
          typeof confidenceRaw === 'number' && Number.isFinite(confidenceRaw)
            ? clampConfidence(confidenceRaw)
            : undefined
        const confidenceReasonRaw = (item as { confidenceReason?: unknown }).confidenceReason
        const confidenceReason = Array.isArray(confidenceReasonRaw)
          ? confidenceReasonRaw
              .map((line) => (typeof line === 'string' ? cleanText(line, '') : ''))
              .filter(Boolean)
              .slice(0, 3)
          : undefined
        cleaned.push({
          hour,
          minute,
          note,
          tone,
          slotTypes: slotTypes && slotTypes.length > 0 ? slotTypes : undefined,
          why:
            whySummary || (whySignalIds && whySignalIds.length > 0)
              ? {
                  summary: whySummary || undefined,
                  signalIds: whySignalIds,
                  anchorIds: whyAnchorIds,
                  patterns: whyPatterns,
                }
              : undefined,
          guardrail: guardrail || undefined,
          evidenceSummary,
          confidence,
          confidenceReason,
        })
      })
      return cleaned
    },
    [clampConfidence, cleanText]
  )

  const sanitizeAiInsights = useCallback(
    (raw: unknown): ActionPlanInsights | null => {
      if (!raw || typeof raw !== 'object') return null
      const insights = raw as {
        ifThenRules?: unknown
        actionFramework?: {
          do?: unknown
          dont?: unknown
          alternative?: unknown
        }
        riskTriggers?: unknown
        successKpi?: unknown
      }
      const toLines = (value: unknown, max: number) =>
        Array.isArray(value)
          ? value
              .map((line) => (typeof line === 'string' ? cleanText(line, '') : ''))
              .filter(Boolean)
              .slice(0, max)
          : []

      const ifThenRules = toLines(insights.ifThenRules, 4)
      const situationTriggers = toLines(
        (insights as { situationTriggers?: unknown }).situationTriggers,
        5
      )
      const doLines = toLines(insights.actionFramework?.do, 5)
      const dontLines = toLines(insights.actionFramework?.dont, 5)
      const alternativeLines = toLines(insights.actionFramework?.alternative, 5)
      const riskTriggers = toLines(insights.riskTriggers, 5)
      const successKpi = toLines(insights.successKpi, 5)
      const deltaTodayRaw = (insights as { deltaToday?: unknown }).deltaToday
      const deltaToday = typeof deltaTodayRaw === 'string' ? cleanText(deltaTodayRaw, '') : ''

      if (
        ifThenRules.length === 0 &&
        situationTriggers.length === 0 &&
        doLines.length === 0 &&
        dontLines.length === 0 &&
        alternativeLines.length === 0 &&
        riskTriggers.length === 0 &&
        successKpi.length === 0 &&
        !deltaToday
      ) {
        return null
      }

      return {
        ifThenRules,
        situationTriggers,
        actionFramework: {
          do: doLines,
          dont: dontLines,
          alternative: alternativeLines,
        },
        riskTriggers,
        successKpi,
        deltaToday,
      }
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
    const compactMatrixPacket = selectedMatrixPacket
      ? {
          focusDomain: trimText(selectedMatrixPacket.focusDomain, 24),
          graphFocusSummary: trimText(
            selectedMatrixPacket.focusDomain && selectedMatrixPacket.topAnchors?.[0]?.summary
              ? `${isKo ? '핵심 교차 근거' : 'Core cross evidence'}: ${
                  selectedMatrixPacket.focusDomain
                } · ${selectedMatrixPacket.topAnchors[0].summary}`
              : selectedMatrixPacket.topAnchors?.[0]?.summary,
            220
          ),
          graphRagEvidenceSummary: selectedMatrixPacket.graphRagEvidenceSummary
            ? {
                totalAnchors: selectedMatrixPacket.graphRagEvidenceSummary.totalAnchors,
                totalSets: selectedMatrixPacket.graphRagEvidenceSummary.totalSets,
              }
            : undefined,
          topAnchors: selectedMatrixPacket.topAnchors
            ?.map((anchor) => ({
              id: trimText(anchor.id, 48),
              section: trimText(anchor.section, 32),
              summary: trimText(anchor.summary, 180),
              setCount: anchor.setCount,
            }))
            .filter((anchor) => anchor.id && anchor.summary)
            .slice(0, 3),
          topClaims: selectedMatrixPacket.topClaims
            ?.map((claim) => ({
              id: trimText(claim.id, 48),
              text: trimText(claim.text, 180),
              domain: trimText(claim.domain, 24),
              signalIds: trimList(claim.signalIds, 4, 32),
              anchorIds: trimList(claim.anchorIds, 3, 32),
            }))
            .filter((claim) => claim.id && claim.text)
            .slice(0, 4),
          scenarioBriefs: selectedMatrixPacket.scenarioBriefs
            ?.map((scenario) => ({
              id: trimText(scenario.id, 48),
              domain: trimText(scenario.domain, 24),
              mainTokens: trimList(scenario.mainTokens, 4, 32),
              altTokens: trimList(scenario.altTokens, 4, 32),
            }))
            .filter((scenario) => scenario.id)
            .slice(0, 3),
          selectedSignals: selectedMatrixPacket.selectedSignals
            ?.map((signal) => ({
              id: trimText(signal.id, 48),
              domain: trimText(signal.domain, 24),
              polarity: trimText(signal.polarity, 16),
              summary: trimText(signal.summary, 160),
              score: signal.score,
            }))
            .filter((signal) => signal.id && signal.summary)
            .slice(0, 5),
          strategyBrief: selectedMatrixPacket.strategyBrief
            ? {
                overallPhase: trimText(selectedMatrixPacket.strategyBrief.overallPhase, 24),
                overallPhaseLabel: trimText(
                  selectedMatrixPacket.strategyBrief.overallPhaseLabel,
                  48
                ),
                attackPercent: selectedMatrixPacket.strategyBrief.attackPercent,
                defensePercent: selectedMatrixPacket.strategyBrief.defensePercent,
              }
            : undefined,
        }
      : undefined
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
          matrixVerdict: baseInfo.evidence.matrixVerdict
            ? {
                focusDomain: trimText(baseInfo.evidence.matrixVerdict.focusDomain, 24),
                verdict: trimText(baseInfo.evidence.matrixVerdict.verdict, 180),
                guardrail: trimText(baseInfo.evidence.matrixVerdict.guardrail, 180),
                topClaim: trimText(baseInfo.evidence.matrixVerdict.topClaim, 180),
                topAnchorSummary: trimText(baseInfo.evidence.matrixVerdict.topAnchorSummary, 160),
                phase: trimText(baseInfo.evidence.matrixVerdict.phase, 48),
                attackPercent: baseInfo.evidence.matrixVerdict.attackPercent,
                defensePercent: baseInfo.evidence.matrixVerdict.defensePercent,
              }
            : undefined,
          matrixPacket: compactMatrixPacket,
        }
      : undefined

    const compactCalendar = baseInfo
      ? {
          grade: baseInfo.displayGrade ?? baseInfo.grade,
          displayGrade: baseInfo.displayGrade,
          score: baseInfo.displayScore ?? baseInfo.score,
          displayScore: baseInfo.displayScore,
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
    selectedMatrixPacket,
  ])

  const fetchAiTimeline = useCallback(
    async (options?: { force?: boolean }) => {
      if (!profileReady || !baseInfo) return

      if (!options?.force && aiCacheRef.current[aiCacheKey]) {
        const cached = aiCacheRef.current[aiCacheKey]
        setAiTimeline(cached.timeline)
        setAiSummary(cached.summary)
        setAiInsights(cached.insights)
        setAiPrecisionMode(cached.precisionMode)
        setAiStatus('ready')
        return
      }

      if (aiAbortRef.current) {
        aiAbortRef.current.abort()
      }
      const controller = new AbortController()
      aiAbortRef.current = controller

      setAiStatus('loading')
      setAiPrecisionMode(null)
      setAiInsights(null)

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
        const summary = cleanText(json?.data?.summary, '')
        const insights = sanitizeAiInsights(json?.data?.insights)
        const precisionMode: ActionPlanPrecisionMode =
          json?.data?.precisionMode === 'ai-graphrag' ||
          json?.data?.precisionMode === 'rule-fallback'
            ? json.data.precisionMode
            : null

        aiCacheRef.current[aiCacheKey] = {
          timeline,
          summary,
          precisionMode,
          insights,
        }
        setAiTimeline(timeline)
        setAiSummary(summary)
        setAiInsights(insights)
        setAiPrecisionMode(precisionMode)
        setAiStatus('ready')
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
        logger.warn('[ActionPlan] AI timeline failed', {
          error: error instanceof Error ? error.message : String(error),
        })
        setAiTimeline(null)
        setAiSummary(
          isKo
            ? '정밀 생성이 일시 실패해 규칙 기반 플랜으로 표시합니다.'
            : 'Precision generation failed temporarily. Showing rule-based plan.'
        )
        setAiInsights(null)
        setAiPrecisionMode('rule-fallback')
        setAiStatus('ready')
      }
    },
    [
      aiCacheKey,
      baseInfo,
      buildAiPayload,
      cleanText,
      isKo,
      profileReady,
      sanitizeAiInsights,
      sanitizeAiTimeline,
    ]
  )

  useEffect(() => {
    if (!profileReady) return
    if (!baseInfo) {
      setAiTimeline(null)
      setAiSummary(null)
      setAiInsights(null)
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
    if (baseInfo?.warnings?.length || (baseInfo?.displayGrade ?? baseInfo?.grade ?? 2) >= 3) {
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
    const defaultActionByHour = (hour: number) => {
      if (hour < 12) return defaultActions[0]
      if (hour < 18) return defaultActions[1] ?? defaultActions[0]
      return defaultActions[2] ?? defaultActions[0]
    }
    const baselineConfidence =
      typeof baseInfo?.evidence?.confidence === 'number'
        ? clampConfidence(baseInfo.evidence.confidence)
        : null

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
        evidenceSummary: undefined,
        confidence: baselineConfidence,
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
    clampConfidence,
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
        if (item.slotTypes?.length) {
          slot.slotTypes = item.slotTypes
            .map((type) => cleanText(type, ''))
            .filter(Boolean)
            .slice(0, 2)
        }
        if (item.why?.summary) {
          slot.whySummary = cleanText(item.why.summary, '')
        }
        if (item.why?.signalIds?.length) {
          slot.whySignalIds = item.why.signalIds
            .map((line) => cleanText(line, ''))
            .filter(Boolean)
            .slice(0, 4)
        }
        if (item.why?.anchorIds?.length) {
          slot.whyAnchorIds = item.why.anchorIds
            .map((line) => cleanText(line, ''))
            .filter(Boolean)
            .slice(0, 3)
        }
        if (item.why?.patterns?.length) {
          slot.whyPatterns = item.why.patterns
            .map((line) => cleanText(line, ''))
            .filter(Boolean)
            .slice(0, 3)
        }
        if (item.guardrail) {
          slot.guardrail = cleanText(item.guardrail, '')
        }
        if (typeof item.confidence === 'number') {
          slot.confidence = clampConfidence(item.confidence)
        }
        if (item.confidenceReason?.length) {
          slot.confidenceReason = item.confidenceReason
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
        slot.badge = isKo ? '핵심' : 'Core'
      } else if (slot.tone === 'caution') {
        slot.badge = isKo ? '조절' : 'Pace'
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
      if (!slot.evidenceSummary.length && slot.tone !== 'neutral') {
        slot.evidenceSummary = [
          isKo
            ? '사주 일진 + 점성 트랜짓 기본 신호'
            : 'Baseline signal from Saju daily pillar + astrology transit',
        ]
      }
      if (!slot.slotTypes?.length) {
        if (slot.hour < 7 || slot.hour >= 22) {
          slot.slotTypes = ['recovery']
        } else if (slot.hour < 12) {
          slot.slotTypes = ['deepWork']
        } else if (slot.hour < 18) {
          slot.slotTypes = ['decision']
        } else {
          slot.slotTypes = ['communication']
        }
      }
      if (!slot.guardrail && slot.tone !== 'neutral') {
        slot.guardrail =
          slot.tone === 'caution'
            ? isKo
              ? '결정은 하되, 반대 근거 1개 확인 전 확정 금지'
              : 'Do not finalize before one counter-evidence check.'
            : isKo
              ? '실행 전 성공 조건 1줄 먼저 작성'
              : 'Write one success condition before execution.'
      }
      if (!slot.whySummary && slot.tone !== 'neutral') {
        slot.whySummary = isKo
          ? '오늘 신호 균형을 기준으로 슬롯별 강약을 나눠 운영합니다.'
          : 'Operate each slot based on today signal balance.'
      }
      if (!slot.whyPatterns?.length && slot.tone !== 'neutral') {
        slot.whyPatterns = ['signal_balance']
      }
      if (typeof slot.confidence !== 'number') {
        const baseline =
          typeof baseInfo?.evidence?.confidence === 'number' ? baseInfo.evidence.confidence : 62
        const toneBonus = slot.tone === 'best' ? 12 : slot.tone === 'caution' ? -14 : 0
        slot.confidence = clampConfidence(baseline + toneBonus)
      } else {
        slot.confidence = clampConfidence(slot.confidence)
      }
      if (!slot.confidenceReason?.length && slot.tone !== 'neutral') {
        slot.confidenceReason =
          slot.tone === 'caution'
            ? [isKo ? '리스크 구간' : 'Risk window']
            : [isKo ? '신호 정렬 양호' : 'Signals aligned']
      }

      if (slot.whySummary && isGenericTimelineCopy(slot.whySummary) && slot.tone === 'neutral') {
        slot.whySummary = undefined
      }
      if (slot.guardrail && isGenericTimelineCopy(slot.guardrail) && slot.tone === 'neutral') {
        slot.guardrail = undefined
      }
      slot.evidenceSummary = (slot.evidenceSummary || [])
        .filter((line, index, lines) => {
          const normalized = normalizeTimelineSemanticKey(line)
          if (!normalized) return false
          const firstIndex = lines.findIndex(
            (candidate) => normalizeTimelineSemanticKey(candidate) === normalized
          )
          if (firstIndex !== index) return false
          if (slot.tone === 'neutral' && isGenericTimelineCopy(line)) return false
          return true
        })
        .slice(0, slot.tone === 'neutral' ? 1 : 2)

      if (slot.tone === 'neutral') {
        slot.confidenceReason = undefined
      }
    })

    return slots
  }, [
    aiTimeline,
    baseTexts,
    baseTimelineSlots,
    bestHours,
    cautionHours,
    clampConfidence,
    cleanText,
    baseInfo?.evidence?.confidence,
    intervalMinutes,
    isGenericTimelineCopy,
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
      pushItem(isKo ? `검토/조정일: ${labels}` : `Review/adjust days: ${labels}`)
      pushItem(
        isKo ? '위험한 일은 실행 우선일로 이동' : 'Move risky tasks to execute-first days'
      )
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
    const topDecisionLine = cleanText(
      data?.canonicalCore?.topDecisionLabel
        ? `${isKo ? '우선 행동' : 'Priority action'}: ${data.canonicalCore.topDecisionLabel}`
        : '',
      ''
    )
    const allowedActionLine = cleanText(
      (data?.canonicalCore?.judgmentPolicy?.allowedActionLabels?.length ||
        data?.canonicalCore?.judgmentPolicy?.allowedActions?.length)
        ? `${
            isKo ? '허용 행동' : 'Allowed moves'
          }: ${(
            data?.canonicalCore?.judgmentPolicy?.allowedActionLabels ||
            formatDecisionActionLabels(
              data?.canonicalCore?.judgmentPolicy?.allowedActions || [],
              isKo ? 'ko' : 'en'
            )
          )
            .slice(0, 2)
            .join(' · ')}`
        : '',
      ''
    )
    const blockedActionLine = cleanText(
      (data?.canonicalCore?.judgmentPolicy?.blockedActionLabels?.length ||
        data?.canonicalCore?.judgmentPolicy?.blockedActions?.length)
        ? `${
            isKo ? '차단 행동' : 'Blocked moves'
          }: ${(
            data?.canonicalCore?.judgmentPolicy?.blockedActionLabels ||
            formatDecisionActionLabels(
              data?.canonicalCore?.judgmentPolicy?.blockedActions || [],
              isKo ? 'ko' : 'en',
              true
            )
          )
            .slice(0, 2)
            .join(' · ')}`
        : '',
      ''
    )
    const checkLine = cleanText(
      data?.canonicalCore?.judgmentPolicy
        ? `${
            isKo ? '점검 포인트' : 'Checkpoints'
          }: ${formatPolicyCheckLabels([
            ...((data.canonicalCore.judgmentPolicy.softCheckLabels ||
              data.canonicalCore.judgmentPolicy.softChecks ||
              []) as string[]),
            ...((data.canonicalCore.judgmentPolicy.hardStopLabels ||
              data.canonicalCore.judgmentPolicy.hardStops ||
              []) as string[]),
          ]).slice(0, 2).join(' · ')}`
        : '',
      ''
    )
    const graphFocusSummary = cleanText(
      selectedMatrixPacket?.focusDomain && selectedMatrixPacket.topAnchors?.[0]?.summary
        ? `${
            isKo ? '핵심 교차 근거' : 'Core cross evidence'
          }: ${categoryLabel(
            normalizeCategory(
              selectedMatrixPacket.focusDomain === 'wealth'
                ? 'wealth'
                : selectedMatrixPacket.focusDomain === 'relationship'
                  ? 'love'
                  : selectedMatrixPacket.focusDomain === 'move'
                    ? 'travel'
                    : (selectedMatrixPacket.focusDomain as EventCategory | 'today')
            ) || 'general'
          )} · ${selectedMatrixPacket.topAnchors[0].summary}`
        : '',
      ''
    )
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
    if (topDecisionLine) {
      lines.unshift(topDecisionLine)
    }
    if (allowedActionLine) {
      lines.push(allowedActionLine)
    }
    if (blockedActionLine) {
      lines.push(blockedActionLine)
    }
    if (checkLine) {
      lines.push(checkLine)
    }
    if (graphFocusSummary) {
      lines.push(graphFocusSummary)
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
  }, [
    baseInfo?.evidence,
    categoryLabel,
    cleanText,
    data.canonicalCore?.judgmentPolicy,
    data.canonicalCore?.topDecisionLabel,
    isKo,
    selectedMatrixPacket,
    todayCaution,
  ])

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

  const timelineHighlights = useMemo(() => {
    const bestCount = timelineSlots.filter((slot) => slot.tone === 'best').length
    const cautionCount = timelineSlots.filter((slot) => slot.tone === 'caution').length
    const avgConfidence =
      timelineSlots.length > 0
        ? clampConfidence(
            timelineSlots.reduce((sum, slot) => sum + (slot.confidence ?? 60), 0) /
              timelineSlots.length
          )
        : 60
    const leadBest = timelineSlots.find((slot) => slot.tone === 'best')
    const leadCaution = timelineSlots.find((slot) => slot.tone === 'caution')

    return [
      isKo
        ? `핵심 슬롯 ${bestCount}개`
        : `${bestCount} core slots`,
      isKo
        ? `주의 슬롯 ${cautionCount}개`
        : `${cautionCount} caution slots`,
      isKo ? `평균 신뢰도 ${avgConfidence}%` : `Avg confidence ${avgConfidence}%`,
      leadBest
        ? isKo
          ? `첫 실행 ${leadBest.label}`
          : `First push ${leadBest.label}`
        : leadCaution
          ? isKo
            ? `속도 조절 ${leadCaution.label}`
            : `Pace at ${leadCaution.label}`
          : isKo
            ? '기본 리듬 유지'
            : 'Keep a steady rhythm',
    ]
  }, [clampConfidence, isKo, timelineSlots])

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
      ? `실행/활용일 ${bestCount}회 · 검토/조정일 ${cautionCount}회 · ${focusLabel} 중심 배치`
      : `${bestCount} execute/leverage slots · ${cautionCount} review/adjust slots · ${focusLabel} focus`
  }, [bestDays.length, cautionDays.length, topCategory, categoryLabel, isKo])

  const actionPlanInsights = useMemo<ActionPlanInsights>(() => {
    if (aiInsights) {
      return aiInsights
    }
    const bestSlot = timelineSlots.find((slot) => slot.tone === 'best')
    const cautionSlot = timelineSlots.find((slot) => slot.tone === 'caution')
    const cautionCount = timelineSlots.filter((slot) => slot.tone === 'caution').length
    const avgConfidence =
      timelineSlots.length > 0
        ? clampConfidence(
            timelineSlots.reduce((sum, slot) => sum + (slot.confidence ?? 60), 0) /
              timelineSlots.length
          )
        : 60
    const formatSlot = (slot?: TimelineSlotView) =>
      slot ? `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}` : '-'

    return {
      ifThenRules: [
        bestSlot
          ? isKo
            ? `IF ${formatSlot(bestSlot)} 시작 THEN 25분 내 초안 1개 저장`
            : `IF start at ${formatSlot(bestSlot)} THEN save one draft within 25 minutes.`
          : isKo
            ? 'IF 시작 지연 THEN 우선순위 1개만 먼저 실행'
            : 'IF start is delayed THEN execute one top priority first.',
        cautionSlot
          ? isKo
            ? `IF ${formatSlot(cautionSlot)} 결정 요청 THEN 10분 유예 + 체크리스트 3항목 확인`
            : `IF decision requested at ${formatSlot(cautionSlot)} THEN delay 10m + validate 3 checklist items.`
          : isKo
            ? 'IF 피로 누적 THEN 큰 결정 보류'
            : 'IF fatigue accumulates THEN hold major decisions.',
      ],
      situationTriggers: [
        isKo
          ? '피로 7/10 이상: 신규 결정 중단, 20분 회복'
          : 'Fatigue >= 7/10: pause new decisions and recover for 20m',
        isKo
          ? '10분 내 요청 3건 이상: 즉답 금지, 우선순위 재정렬'
          : '3+ requests within 10m: no instant replies, reprioritize first',
        isKo
          ? '지출 유혹 발생: 총액·한도·대안 확인 전 집행 금지'
          : 'Spending urge: do not execute before amount-limit-alternative check',
      ],
      actionFramework: {
        do: todayItems.slice(0, 3),
        dont: [
          ...(baseInfo?.warnings?.slice(0, 2) || []),
          isKo ? '근거 없는 즉흥 결정 금지' : 'No impulsive decision without evidence',
        ].slice(0, 3),
        alternative: [
          isKo
            ? '주의 슬롯: 결정보다 초안/검증 작업'
            : 'Caution slot: draft/validation instead of decisions',
          isKo
            ? '집중 슬롯: 핵심 1건 완료 후 로그'
            : 'Best slot: finish one key task and log outcome',
        ],
      },
      riskTriggers: [
        cautionCount > 0
          ? isKo
            ? `주의 슬롯 ${cautionCount}개: 확정 결정보다 검증 우선`
            : `${cautionCount} caution slots: validate before finalizing`
          : isKo
            ? '주의 슬롯이 적어도 피로 신호 우선 점검'
            : 'Even with fewer caution slots, check fatigue signal first',
        isKo
          ? '응답 지연 + 기준 불명확 + 멀티태스킹 동시 발생: 즉시 속도 조절'
          : 'Delay + unclear criteria + multitasking together: reduce pace immediately',
      ],
      successKpi: [
        isKo
          ? `평균 슬롯 신뢰도 ${avgConfidence}% 이상`
          : `Average slot confidence >= ${avgConfidence}%`,
        isKo ? '핵심 액션 2건 이상 완료' : 'Complete at least 2 core actions',
        isKo ? '주의 슬롯 확정 결정 0건' : 'Zero final decisions in caution slots',
      ],
      deltaToday:
        cautionCount > 1
          ? isKo
            ? '오늘은 신규 확정보다 리스크 제거가 우선입니다.'
            : 'Today prioritizes risk removal over new commitments.'
          : isKo
            ? '오늘은 속도는 좋고, 검증 규칙을 붙이면 성과가 커집니다.'
            : 'Momentum is good today; stricter validation improves outcomes.',
    }
  }, [aiInsights, baseInfo?.warnings, clampConfidence, isKo, timelineSlots, todayItems])

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
        `${isKo ? '실행/활용일' : 'Execute/Leverage days'}: ${bestDayChips.map((chip) => chip.label).join(', ')}`
      )
    }
    if (cautionDayChips.length > 0) {
      lines.push(
        `${isKo ? '검토/조정일' : 'Review/Adjust days'}: ${cautionDayChips.map((chip) => chip.label).join(', ')}`
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
            <span className={styles.actionPlanChipLabel}>
              {isKo ? '실행/활용일' : 'Execute/Leverage days'}
            </span>
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
            <span className={styles.actionPlanChipLabel}>
              {isKo ? '검토/조정일' : 'Review/Adjust days'}
            </span>
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
          <div className={styles.actionPlanTimelineHighlights}>
            {timelineHighlights.map((item) => (
              <span key={item} className={styles.actionPlanTimelineHighlightChip}>
                {item}
              </span>
            ))}
          </div>
          <div className={styles.actionPlanTimelineGrid} role="list">
            {timelineSlots.map((slot) =>
              (() => {
                const whyMetaLabel = formatWhyMetaLabel(slot)
                const isExpandedSlot = slot.tone !== 'neutral' || activeRhythmHour === slot.hour
                const hasDetailPanel = Boolean(
                  isExpandedSlot &&
                    (whyMetaLabel ||
                      (slot.confidenceReason && slot.confidenceReason.length > 0) ||
                      (slot.evidenceSummary && slot.evidenceSummary.length > 0))
                )

                return (
                  <div
                    key={`${slot.hour}-${slot.minute ?? 0}`}
                    role="listitem"
                    ref={(node) => {
                      timelineSlotRefs.current[`${slot.hour}-${slot.minute ?? 0}`] = node
                    }}
                    className={`${styles.actionPlanTimelineSlot} ${
                      !isExpandedSlot ? styles.actionPlanTimelineSlotCompact : ''
                    } ${
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
                    <div className={styles.actionPlanTimelineMetaRow}>
                      {typeof slot.confidence === 'number' && isExpandedSlot && (
                        <div className={styles.actionPlanTimelineConfidence}>
                          {isKo ? '신뢰도' : 'Confidence'} {slot.confidence}%
                        </div>
                      )}
                      {slot.slotTypes && slot.slotTypes.length > 0 && (
                        <div className={styles.actionPlanTimelineSlotTypes}>
                          {slot.slotTypes.map((slotType) => (
                            <span
                              key={`${slot.label}-${slotType}`}
                              className={styles.actionPlanTimelineSlotTypeChip}
                            >
                              {formatSlotTypeLabel(slotType)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={styles.actionPlanTimelineNote}>{slot.note}</div>
                    {slot.whySummary && isExpandedSlot && (
                      <div className={styles.actionPlanTimelineWhy}>
                        <span className={styles.actionPlanTimelineWhyLabel}>
                          {isKo ? '왜 이 시간대인가' : 'Why this slot'}
                        </span>
                        <span>{slot.whySummary}</span>
                      </div>
                    )}
                    {slot.guardrail && isExpandedSlot && (
                      <div className={styles.actionPlanTimelineGuardrail}>
                        <span className={styles.actionPlanTimelineGuardrailLabel}>
                          {isKo ? '안전장치' : 'Guardrail'}
                        </span>
                        <span>{slot.guardrail}</span>
                      </div>
                    )}
                    {!isExpandedSlot && slot.evidenceSummary && slot.evidenceSummary.length > 0 && (
                      <div className={styles.actionPlanTimelineCompactHint}>
                        {slot.evidenceSummary[0]}
                      </div>
                    )}
                    {hasDetailPanel && (
                      <details className={styles.actionPlanTimelineDetails}>
                        <summary className={styles.actionPlanTimelineDetailsSummary}>
                          {isKo ? '근거 보기' : 'Why this works'}
                        </summary>
                        <div className={styles.actionPlanTimelineDetailsBody}>
                          {whyMetaLabel && (
                            <div className={styles.actionPlanTimelineWhyMeta}>{whyMetaLabel}</div>
                          )}
                          {slot.confidenceReason && slot.confidenceReason.length > 0 && (
                            <div className={styles.actionPlanTimelineConfidenceReason}>
                              {formatConfidenceNote(slot.confidenceReason)}
                            </div>
                          )}
                          {slot.evidenceSummary && slot.evidenceSummary.length > 0 && (
                            <ul className={styles.actionPlanTimelineEvidenceList}>
                              {slot.evidenceSummary.map((line) => (
                                <li key={`${slot.hour}-${slot.minute}-${line}`}>{line}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                )
              })()
            )}
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

        <div className={`${styles.actionPlanCard} ${styles.actionPlanInsightsCard}`}>
          <div className={styles.actionPlanCardHeader}>
            <span className={styles.actionPlanCardTitle}>
              {isKo ? '전략 인사이트' : 'Strategic Insights'}
            </span>
            <span className={styles.actionPlanCardFocus}>
              {isKo ? 'If-Then 규칙과 리스크 대비 플로우' : 'If-Then rules and risk-response flow'}
            </span>
          </div>

          <div className={styles.actionPlanInsightSection}>
            <p className={styles.actionPlanInsightSectionTitle}>
              {isKo ? 'ΔToday (평소 대비)' : 'ΔToday (vs usual)'}
            </p>
            <p className={styles.actionPlanInsightLine}>{actionPlanInsights.deltaToday}</p>
          </div>

          <div className={styles.actionPlanInsightSection}>
            <p className={styles.actionPlanInsightSectionTitle}>
              {isKo ? 'If-Then 규칙' : 'If-Then Rules'}
            </p>
            <ul className={styles.actionPlanList}>
              {actionPlanInsights.ifThenRules.map((item) => (
                <li key={`if-then-${item}`} className={styles.actionPlanItem}>
                  <span className={styles.actionPlanItemCheck}>→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.actionPlanInsightSection}>
            <p className={styles.actionPlanInsightSectionTitle}>
              {isKo ? '상황 트리거 If-Then' : 'Situation Triggers'}
            </p>
            <ul className={styles.actionPlanList}>
              {actionPlanInsights.situationTriggers.map((item) => (
                <li key={`trigger-${item}`} className={styles.actionPlanItem}>
                  <span className={styles.actionPlanItemCheck}>⚡</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.actionPlanInsightTriple}>
            <div className={styles.actionPlanInsightSection}>
              <p className={styles.actionPlanInsightSectionTitle}>{isKo ? 'DO' : 'DO'}</p>
              <ul className={styles.actionPlanList}>
                {actionPlanInsights.actionFramework.do.map((item) => (
                  <li key={`do-${item}`} className={styles.actionPlanItem}>
                    <span className={styles.actionPlanItemCheck}>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.actionPlanInsightSection}>
              <p className={styles.actionPlanInsightSectionTitle}>{isKo ? "DON'T" : "DON'T"}</p>
              <ul className={styles.actionPlanList}>
                {actionPlanInsights.actionFramework.dont.map((item) => (
                  <li key={`dont-${item}`} className={styles.actionPlanItem}>
                    <span className={styles.actionPlanItemCheck}>!</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.actionPlanInsightSection}>
              <p className={styles.actionPlanInsightSectionTitle}>
                {isKo ? '대안 플랜' : 'Alternative'}
              </p>
              <ul className={styles.actionPlanList}>
                {actionPlanInsights.actionFramework.alternative.map((item) => (
                  <li key={`alt-${item}`} className={styles.actionPlanItem}>
                    <span className={styles.actionPlanItemCheck}>↺</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={styles.actionPlanInsightTriple}>
            <div className={styles.actionPlanInsightSection}>
              <p className={styles.actionPlanInsightSectionTitle}>
                {isKo ? '리스크 트리거' : 'Risk Triggers'}
              </p>
              <ul className={styles.actionPlanList}>
                {actionPlanInsights.riskTriggers.map((item) => (
                  <li key={`risk-${item}`} className={styles.actionPlanItem}>
                    <span className={styles.actionPlanItemCheck}>⚠</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.actionPlanInsightSection}>
              <p className={styles.actionPlanInsightSectionTitle}>
                {isKo ? '성공 KPI' : 'Success KPI'}
              </p>
              <ul className={styles.actionPlanList}>
                {actionPlanInsights.successKpi.map((item) => (
                  <li key={`kpi-${item}`} className={styles.actionPlanItem}>
                    <span className={styles.actionPlanItemCheck}>📍</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default CalendarActionPlanView
