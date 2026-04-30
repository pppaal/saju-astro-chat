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
  deepWork: '집중',
  decision: '결정',
  communication: '소통',
  money: '재정',
  relationship: '관계',
  recovery: '회복',
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
  speed_up_validation_down: '속도↑ 검증↓',
  risk_exposure_up: '리스크 노출↑',
  relationship_sensitivity_up: '관계 민감도↑',
  spending_impulse_up: '지출 충동↑',
  recovery_need_up: '회복 필요↑',
  signal_balance: '신호 균형',
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
  'Evidence conflict': '근거 충돌',
  'Anchor shortage': '앵커 부족',
  'Low signal density': '신호 밀도 낮음',
  'Risk window': '주의 구간',
  'Low baseline confidence': '기본 신뢰도 낮음',
  'Signals aligned': '신호 정렬 양호',
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
  '우선순위 3개 정리하기',
  '집중할 일 1개 25분 진행',
  '몸/마음 회복 10분 확보',
]
export const DEFAULT_TODAY_EN = [
  'List your top 3 priorities',
  'Do one focused task for 25 minutes',
  'Reserve 10 minutes for recovery',
]

export const DEFAULT_WEEK_KO = [
  '이번 주 목표 1개 설정',
  '중요 일정 1개를 캘린더에 고정',
  '회복 시간 1회 확보',
  '주말에 10분 리뷰',
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
      ko: ['지출 한도 확인 및 기록', '수익/거래 관련 연락 1건', '예산 항목 1개 정리'],
      en: ['Check spending limits and log', 'Make one income/transaction follow-up', 'Tidy one budget item'],
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
      en: ['Share results/report once', 'Advance one key meeting/proposal', 'Apply one workflow improvement'],
    },
  },
  love: {
    day: {
      ko: ['따뜻한 메시지 1회', '대화 20분 확보', '배려 행동 1가지'],
      en: ['Send one warm message', 'Secure 20 minutes of conversation', 'Do one caring action'],
    },
    week: {
      ko: ['만남/데이트 일정 확정', '관계 회복 대화 1회', '감사/칭찬 표현 1회'],
      en: ['Confirm a date/meetup', 'Have one repair conversation', 'Express gratitude/compliment once'],
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
    // 행동플래너가 시간 십신·시지 충/공망을 본명 기준으로 계산하도록 그대로 전달
    natalSaju: detail.natalSaju,
    gongmangBranches: detail.gongmangStatus?.emptyBranches,
    shinsalActive: detail.shinsalActive,
    activityScores: detail.activityScores as ImportantDate['activityScores'],
  }
}
