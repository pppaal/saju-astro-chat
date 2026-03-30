'use client'

// src/components/calendar/CalendarActionPlanView.tsx
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
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
import {
  formatDecisionActionLabels,
  formatPolicyCheckLabels,
} from '@/lib/destiny-matrix/core/actionCopy'
import type { CalendarData, ImportantDate, EventCategory } from './types'
import { getPeakLabel, resolvePeakLevel } from './peakUtils'
import { ActionPlanInsightsPanel, ActionPlanSummaryPanels } from './CalendarActionPlanPanels'
import { CalendarActionPlanTimelinePanel } from './CalendarActionPlanTimelinePanel'
import {
  buildActionPlanAiButtonLabel,
  buildActionPlanAiStatusText,
  type ActionPlanInsights,
  type AiTimelineSlot,
} from './CalendarActionPlanAI'
import { buildActionPlanAiPayload } from './CalendarActionPlanRequest'
import { useActionPlanAiTimeline } from './useActionPlanAiTimeline'
import {
  buildActionPlanShareText,
  buildFallbackActionPlanInsights,
  buildHourlyRhythm,
  buildTimelineInsight,
  buildTimelineHighlights,
  buildTodayInsight,
  buildWeekInsight,
  buildWeekItems,
  findPreferredRhythmSlot,
  getPreferredRhythmHour,
} from './CalendarActionPlanViewModel'

interface CalendarActionPlanViewProps {
  data: CalendarData
  selectedDay: Date | null
  selectedDate: ImportantDate | null
  onSelectDate?: (date: Date) => void
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
      return genericNeedles.some((needle) =>
        normalized.includes(normalizeTimelineSemanticKey(needle))
      )
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

  const aiPayload = useMemo(
    () =>
      buildActionPlanAiPayload({
        dateKey,
        locale: analysisLocale,
        intervalMinutes,
        baseInfo,
        canonicalCore: data?.canonicalCore,
        selectedMatrixPacket,
        icpResult,
        personaResult,
        isKo,
        cleanText,
      }),
    [
      analysisLocale,
      baseInfo,
      cleanText,
      dateKey,
      data?.canonicalCore,
      icpResult,
      intervalMinutes,
      isKo,
      personaResult,
      selectedMatrixPacket,
    ]
  )

  const { aiTimeline, aiSummary, aiInsights, aiStatus, aiPrecisionMode, refreshAiTimeline } =
    useActionPlanAiTimeline({
      enabled: profileReady,
      hasBaseInfo: Boolean(baseInfo),
      aiCacheKey,
      aiPayload,
      cleanText,
      clampConfidence,
      isKo,
      isSanitizedSlotType,
    })

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

  const aiStatusText = useMemo(
    () =>
      buildActionPlanAiStatusText({
        isKo,
        hasBaseInfo: Boolean(baseInfo),
        aiStatus,
        aiPrecisionMode,
        aiContextLabel,
      }),
    [aiContextLabel, aiPrecisionMode, aiStatus, baseInfo, isKo]
  )

  const aiButtonLabel = useMemo(
    () =>
      buildActionPlanAiButtonLabel({
        isKo,
        aiStatus,
        hasAiTimeline: Boolean(aiTimeline),
      }),
    [aiStatus, aiTimeline, isKo]
  )

  const handleAiRefresh = useCallback(() => {
    if (!baseInfo) return
    refreshAiTimeline()
  }, [baseInfo, refreshAiTimeline])

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
    return buildHourlyRhythm({
      timelineSlots,
      cleanText,
    })
  }, [cleanText, timelineSlots])

  useEffect(() => {
    setActiveRhythmHour(getPreferredRhythmHour(timelineSlots))
  }, [timelineSlots])

  const handleRhythmSelect = useCallback(
    (hour: number) => {
      setActiveRhythmHour(hour)
      const preferredSlot = findPreferredRhythmSlot({
        timelineSlots,
        hour,
      })
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
    const weekCategory: EventCategory = topCategory ?? baseInfo?.categories?.[0] ?? 'general'
    const weekAction = (
      isKo ? CATEGORY_ACTIONS[weekCategory].week.ko : CATEGORY_ACTIONS[weekCategory].week.en
    )[0]
    const weekRangeLabel =
      rangeDays === 7 ? (isKo ? '이번 주' : 'this week') : isKo ? '이번 2주' : 'the next 2 weeks'
    const bestRec = bestDays.find((d) => d.info.recommendations?.length)?.info.recommendations?.[0]
    return buildWeekItems({
      isKo,
      bestDayLabels: bestDays.map((entry) => formatDateLabel(entry.date)),
      cautionDayLabels: cautionDays.map((entry) => formatDateLabel(entry.date)),
      weekRangeLabel,
      goalLabel: categoryLabel(weekCategory),
      weekAction,
      bestRecommendation: bestRec,
      fallbackItems: isKo ? DEFAULT_WEEK_KO : DEFAULT_WEEK_EN,
      cleanText,
    })
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
      data?.canonicalCore?.judgmentPolicy?.allowedActionLabels?.length ||
        data?.canonicalCore?.judgmentPolicy?.allowedActions?.length
        ? `${isKo ? '허용 행동' : 'Allowed moves'}: ${(
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
      data?.canonicalCore?.judgmentPolicy?.blockedActionLabels?.length ||
        data?.canonicalCore?.judgmentPolicy?.blockedActions?.length
        ? `${isKo ? '차단 행동' : 'Blocked moves'}: ${(
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
        ? `${isKo ? '점검 포인트' : 'Checkpoints'}: ${formatPolicyCheckLabels([
            ...((data.canonicalCore.judgmentPolicy.softCheckLabels ||
              data.canonicalCore.judgmentPolicy.softChecks ||
              []) as string[]),
            ...((data.canonicalCore.judgmentPolicy.hardStopLabels ||
              data.canonicalCore.judgmentPolicy.hardStops ||
              []) as string[]),
          ])
            .slice(0, 2)
            .join(' · ')}`
        : '',
      ''
    )
    const graphFocusSummary = cleanText(
      selectedMatrixPacket?.focusDomain && selectedMatrixPacket.topAnchors?.[0]?.summary
        ? `${isKo ? '핵심 교차 근거' : 'Core cross evidence'}: ${categoryLabel(
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

  const engineCards = useMemo(() => {
    return (data?.surfaceCards || [])
      .filter((card) => ['action', 'risk', 'window', 'agreement', 'branch'].includes(card.key))
      .map((card) => ({
        key: card.key,
        label: cleanText(card.label, ''),
        summary: cleanText(card.summary, ''),
        tag: cleanText(card.tag || '', ''),
        details: (card.details || []).map((line) => cleanText(line, '')).filter(Boolean).slice(0, 3),
        visual:
          card.visual?.kind === 'agreement'
            ? {
                kind: 'agreement' as const,
                agreementPercent: card.visual.agreementPercent,
                contradictionPercent: card.visual.contradictionPercent,
                leadLagState: card.visual.leadLagState,
              }
            : card.visual?.kind === 'branch'
              ? {
                  kind: 'branch' as const,
                  rows: card.visual.rows
                    .map((row) => ({
                      label: cleanText(row.label, ''),
                      text: cleanText(row.text, ''),
                    }))
                    .filter((row) => row.label && row.text),
                }
              : undefined,
      }))
      .filter((card) => card.label && card.summary)
      .slice(0, 5)
  }, [cleanText, data?.surfaceCards])

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
    return buildTimelineInsight({
      isKo,
      peakText,
      hasWarnings: Boolean(baseInfo.warnings?.length),
      precisionText,
    })
  }, [aiPrecisionMode, aiStatus, aiSummary, baseInfo, cleanText, isKo, resolvedPeakLevel])

  const timelineHighlights = useMemo(() => {
    return buildTimelineHighlights({
      isKo,
      timelineSlots,
      clampConfidence,
    })
  }, [clampConfidence, isKo, timelineSlots])

  const todayInsight = useMemo(
    () =>
      buildTodayInsight({
        isKo,
        evidenceLines,
      }),
    [evidenceLines, isKo]
  )

  const weekInsight = useMemo(() => {
    return buildWeekInsight({
      isKo,
      bestCount: bestDays.length,
      cautionCount: cautionDays.length,
      focusLabel: topCategory ? categoryLabel(topCategory) : isKo ? '전체' : 'general',
    })
  }, [bestDays.length, cautionDays.length, topCategory, categoryLabel, isKo])

  const actionPlanInsights = useMemo<ActionPlanInsights>(() => {
    return buildFallbackActionPlanInsights({
      aiInsights,
      isKo,
      timelineSlots,
      todayItems,
      warnings: baseInfo?.warnings,
      clampConfidence,
    })
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
    return buildActionPlanShareText({
      isKo,
      baseDate,
      formatDateLabel,
      bestDays,
      cautionDays,
      todayItems,
      todayTiming,
      todayCaution,
      weekTitle,
      weekItems,
      topCategoryLabel: topCategory ? categoryLabel(topCategory) : null,
    })
  }, [
    isKo,
    formatDateLabel,
    baseDate,
    bestDays,
    cautionDays,
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
        <CalendarActionPlanTimelinePanel
          isKo={isKo}
          intervalMinutes={intervalMinutes}
          onIntervalChange={setIntervalMinutes}
          onAiRefresh={handleAiRefresh}
          aiDisabled={!baseInfo}
          aiStatus={aiStatus}
          aiButtonLabel={aiButtonLabel}
          aiStatusText={aiStatusText}
          hourlyRhythm={hourlyRhythm}
          activeRhythmHour={activeRhythmHour}
          activeRhythmInfo={activeRhythmInfo}
          onRhythmSelect={handleRhythmSelect}
          timelineInsight={timelineInsight}
          timelineHighlights={timelineHighlights}
          timelineSlots={timelineSlots.map((slot) => ({
            ...slot,
            slotTypes: slot.slotTypes?.map((slotType) => formatSlotTypeLabel(slotType)),
          }))}
          formatWhyMetaLabel={formatWhyMetaLabel}
          formatConfidenceNote={(reasons) => formatConfidenceNote(reasons ?? [])}
          onSlotRef={(key, node) => {
            timelineSlotRefs.current[key] = node
          }}
          onSlotClick={setActiveRhythmHour}
        />
        <ActionPlanSummaryPanels
          isKo={isKo}
          todayFocus={todayFocus}
          todayInsight={todayInsight}
          todayItems={todayItems}
          engineCards={engineCards}
          evidenceBadges={evidenceBadges}
          evidenceLines={evidenceLines}
          todayTiming={todayTiming}
          todayCaution={todayCaution}
          weekTitle={weekTitle}
          weekFocus={weekFocus}
          weekInsight={weekInsight}
          weekItems={weekItems}
          topCategory={topCategory}
          categoryLabel={categoryLabel}
        />

        <ActionPlanInsightsPanel isKo={isKo} actionPlanInsights={actionPlanInsights} />
      </div>
    </div>
  )
})

export default CalendarActionPlanView
