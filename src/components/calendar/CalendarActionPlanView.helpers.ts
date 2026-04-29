import {
  SAJU_FACTOR_TRANSLATIONS,
  ASTRO_FACTOR_TRANSLATIONS,
} from '@/app/api/calendar/lib/translations'
import type { EventCategory, ImportantDate } from './types'
import type { DateDetailResponse } from './useDateDetail'

export type SanitizedSlotType =
  | 'deepWork'
  | 'decision'
  | 'communication'
  | 'money'
  | 'relationship'
  | 'recovery'

export const SLOT_TYPE_LABELS_KO: Record<string, string> = {
  deepWork: '??',
  decision: '??',
  communication: '??',
  money: '??',
  relationship: '??',
  recovery: '??',
}

export const SLOT_TYPE_LABELS_EN: Record<string, string> = {
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

export const isSanitizedSlotType = (value: string): value is SanitizedSlotType =>
  SLOT_TYPE_KEYS.has(value as SanitizedSlotType)

export function normalizeTimelineSemanticKey(value: string): string {
  if (!value) return ''
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const WHY_PATTERN_LABELS_KO: Record<string, string> = {
  speed_up_validation_down: '??? ???',
  risk_exposure_up: '??? ???',
  relationship_sensitivity_up: '?? ????',
  spending_impulse_up: '?? ???',
  recovery_need_up: '?? ???',
  signal_balance: '?? ??',
}

export const WHY_PATTERN_LABELS_EN: Record<string, string> = {
  speed_up_validation_down: 'speed up, validation down',
  risk_exposure_up: 'risk exposure up',
  relationship_sensitivity_up: 'relationship sensitivity up',
  spending_impulse_up: 'spending impulse up',
  recovery_need_up: 'recovery need up',
  signal_balance: 'signal balance',
}

export const CONFIDENCE_REASON_LABELS_KO: Record<string, string> = {
  'Evidence conflict': '?? ??',
  'Anchor shortage': '?? ??',
  'Low signal density': '?? ?? ??',
  'Risk window': '?? ??',
  'Low baseline confidence': '?? ??? ??',
  'Signals aligned': '?? ?? ??',
}

export const CONFIDENCE_REASON_LABELS_EN: Record<string, string> = {
  'Evidence conflict': 'Evidence conflict',
  'Anchor shortage': 'Anchor shortage',
  'Low signal density': 'Low signal density',
  'Risk window': 'Risk window',
  'Low baseline confidence': 'Low baseline confidence',
  'Signals aligned': 'Signals aligned',
}

export const DEFAULT_TODAY_KO = [
  '???? 3? ????',
  '??? ? 1? 25? ??',
  '?/?? ?? 10? ??',
]
export const DEFAULT_TODAY_EN = [
  'List your top 3 priorities',
  'Do one focused task for 25 minutes',
  'Reserve 10 minutes for recovery',
]

export const DEFAULT_WEEK_KO = [
  '?? ? ?? 1? ??',
  '?? ?? 1?? ???? ??',
  '?? ?? 1? ??',
  '??? 10? ??',
]
export const DEFAULT_WEEK_EN = [
  'Set one weekly goal',
  'Block one key schedule on the calendar',
  'Make one recovery slot',
  'Do a 10-minute review on the weekend',
]

export const CATEGORY_ACTIONS: Record<
  EventCategory,
  { day: { ko: string[]; en: string[] }; week: { ko: string[]; en: string[] } }
> = {
  wealth: {
    day: {
      ko: ['?? ?? ?? ? ??', '??/?? ?? ?? 1?', '?? ?? 1? ??'],
      en: ['Check spending limits and log', 'Make one income/transaction follow-up', 'Tidy one budget item'],
    },
    week: {
      ko: ['??/?? ?? 1?', '??/?? ?? 1? ??', '???? ??'],
      en: ['Review income/expenses once', 'Set one saving/investment goal', 'Organize cash flow'],
    },
  },
  career: {
    day: {
      ko: ['?? ?? 1? ???', '??/?? ?? ?? 1?', '?? ?? 1? ??'],
      en: ['Finish one core task', 'Share progress once', 'Define the next action'],
    },
    week: {
      ko: ['?? ??/??? 1?', '?? ??/?? 1? ??', '?? ?? 1? ??'],
      en: ['Share results/report once', 'Advance one key meeting/proposal', 'Apply one workflow improvement'],
    },
  },
  love: {
    day: {
      ko: ['??? ??? 1?', '?? 20? ??', '?? ?? 1??'],
      en: ['Send one warm message', 'Secure 20 minutes of conversation', 'Do one caring action'],
    },
    week: {
      ko: ['??/??? ?? ??', '?? ?? ?? 1?', '??/?? ?? 1?'],
      en: ['Confirm a date/meetup', 'Have one repair conversation', 'Express gratitude/compliment once'],
    },
  },
  health: {
    day: {
      ko: ['30? ??? ??', '?? ?? ??', '?/?? ??'],
      en: ['30-minute light workout', 'Check sleep routine', 'Hydration and diet care'],
    },
    week: {
      ko: ['?? 2-3? ??', '??/?? ????? ??', '????/?? ?? 1?'],
      en: ['Schedule 2-3 workouts', 'Review sleep/diet checklist', 'One stretch/recovery routine'],
    },
  },
  travel: {
    day: {
      ko: ['??/?? ??', '?? ??? ??', '??/?? ??'],
      en: ['Check route/movements', 'Verify essentials checklist', 'Confirm reservations/timing'],
    },
    week: {
      ko: ['??/?? ??', '??/?? ??', '?? ?? ??'],
      en: ['Finalize itinerary/routes', 'Organize reservations/budget', 'Prepare a backup plan'],
    },
  },
  study: {
    day: {
      ko: ['?? ?? 45?', '?? 20?', '??/?? ??'],
      en: ['45-minute focused study', '20-minute review', 'Organize notes/summary'],
    },
    week: {
      ko: ['?? ?? ?? ??', '???/?? 1?', '?? ?? ??'],
      en: ['Plan weekly study', 'Join one study/lecture', 'Log progress'],
    },
  },
  general: {
    day: {
      ko: ['???? ???', '?? ?? 1?', '?? ?? ??'],
      en: ['Reset priorities', 'Do one small cleanup', 'Secure recovery time'],
    },
    week: {
      ko: ['?? ?? 1? ??', '??/?? 1?', '?? ?? 1?'],
      en: ['Set one weekly goal', 'One organize/cleanup session', 'One weekly review'],
    },
  },
}

const isEventCategory = (value: string): value is EventCategory =>
  Object.prototype.hasOwnProperty.call(CATEGORY_ACTIONS, value)

export const normalizeCategory = (value?: string | null): EventCategory =>
  value && isEventCategory(value) ? value : 'general'

// ─────────────────────────────────────────────────────────────
// 풀 엔진 응답(/api/calendar/date-detail)을 lite ImportantDate에 합칩니다.
// 행동플래너로 흘러갈 때 일진/공망/신살/bestHours가 함께 전달되도록.
// ─────────────────────────────────────────────────────────────

function translateFactorKey(key: string, lang: 'ko' | 'en'): string | null {
  const saju = SAJU_FACTOR_TRANSLATIONS[key]?.[lang]
  if (saju) return saju
  const astro = ASTRO_FACTOR_TRANSLATIONS[key]?.[lang]
  if (astro) return astro
  return null
}

function dedupePush(target: string[], item: string): void {
  if (!item) return
  if (target.some((existing) => existing === item)) return
  target.push(item)
}

const QUALITY_LABEL_KO: Record<string, string> = {
  excellent: '최상',
  good: '좋음',
  neutral: '평이',
  caution: '주의',
}

function formatBestHourKo(hour: number, quality: string): string {
  const start = `${String(hour).padStart(2, '0')}:00`
  const end = `${String((hour + 1) % 24).padStart(2, '0')}:00`
  const q = QUALITY_LABEL_KO[quality] || quality
  return `${start}-${end} (${q})`
}

function formatBestHourEn(hour: number, quality: string): string {
  const start = `${String(hour).padStart(2, '0')}:00`
  const end = `${String((hour + 1) % 24).padStart(2, '0')}:00`
  return `${start}-${end} (${quality})`
}

export function mergeDateDetailIntoBaseInfo(
  baseInfo: ImportantDate | null,
  detail: DateDetailResponse | null,
  isKo: boolean
): ImportantDate | null {
  if (!baseInfo) return null
  if (!detail) return baseInfo

  const lang: 'ko' | 'en' = isKo ? 'ko' : 'en'

  // 1) saju factors: 풀 엔진 키들을 번역해 뒤에 합치기 (lite의 상담사 톤은 그대로 유지)
  const sajuFactors = [...(baseInfo.sajuFactors || [])]
  for (const key of detail.sajuFactorKeys || []) {
    const text = translateFactorKey(key, lang)
    if (text) dedupePush(sajuFactors, text)
  }

  // 2) astro factors
  const astroFactors = [...(baseInfo.astroFactors || [])]
  for (const key of detail.astroFactorKeys || []) {
    const text = translateFactorKey(key, lang)
    if (text) dedupePush(astroFactors, text)
  }

  // 3) bestHours → bestTimes ('05:00-06:00 (excellent)')
  const bestTimes = [...(baseInfo.bestTimes || [])]
  for (const slot of detail.bestHours || []) {
    if (slot.quality === 'excellent' || slot.quality === 'good') {
      dedupePush(
        bestTimes,
        isKo
          ? formatBestHourKo(slot.hour, slot.quality)
          : formatBestHourEn(slot.hour, slot.quality)
      )
    }
  }

  // 4) shinsal active → 보조 사주 라인
  if (detail.shinsalActive?.length) {
    for (const s of detail.shinsalActive.slice(0, 2)) {
      dedupePush(
        sajuFactors,
        isKo
          ? `오늘 ${s.name} 활성 (${s.affectedArea}) — ${s.type === 'lucky' ? '도움' : s.type === 'unlucky' ? '주의' : '특별 결'} 신호`
          : `${s.name} active today (${s.affectedArea}) — ${s.type} signal`
      )
    }
  }

  // 5) 공망 표시
  if (detail.gongmangStatus?.isEmpty && detail.gongmangStatus.emptyBranches.length) {
    dedupePush(
      sajuFactors,
      isKo
        ? `공망일 (비는 자리: ${detail.gongmangStatus.emptyBranches.join(', ')}) — 결정·확정의 무게가 비는 날입니다.`
        : `Void day (empty branches: ${detail.gongmangStatus.emptyBranches.join(', ')}) — commitments lose weight today.`
    )
  }

  // 6) energy flow
  if (detail.energyFlow) {
    dedupePush(
      sajuFactors,
      isKo
        ? `오늘의 에너지 흐름은 ${detail.energyFlow.strength} (${detail.energyFlow.dominantElement} 우세, 통근 ${detail.energyFlow.tonggeunCount}/투출 ${detail.energyFlow.tuechulCount}).`
        : `Today's energy is ${detail.energyFlow.strength} (${detail.energyFlow.dominantElement} dominant, tonggeun ${detail.energyFlow.tonggeunCount}/tuechul ${detail.energyFlow.tuechulCount}).`
    )
  }

  // 7) 일진 ganzhi 보강
  const ganzhi = detail.ganzhi || baseInfo.ganzhi

  return {
    ...baseInfo,
    sajuFactors: sajuFactors.slice(0, 6),
    astroFactors: astroFactors.slice(0, 6),
    bestTimes: bestTimes.slice(0, 6),
    ganzhi,
  }
}
