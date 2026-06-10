// src/lib/calendar-engine/lifecycle/astroLifecycle.ts
// Single source of truth for outer-planet life-cycle timing.
//
// Pure age-window math for outer-planet returns and oppositions. No LLM.
// Mirrors saju's daewoon timing in age form. All deterministic — the
// user's birth year is enough to surface "Saturn return at age 29".
//
// Consumers:
//   • calendar-engine/extractors/astro-lifecycle.ts — buildLifecycleTiming()
//   • calendar-engine/derivers/lifetimeFlow.ts / lifetimePivots.ts

export type AstroLifecycleEventKind =
  | 'jupiter_return_1' // 12yr
  | 'jupiter_return_2' // 24yr
  | 'progressed_lunar_1' // ~28-29yr
  | 'saturn_return_1' // 29-30yr
  | 'jupiter_return_3' // 36yr
  | 'pluto_square_pluto' // 36-40yr
  | 'uranus_opposition' // 40-43yr
  | 'neptune_square' // 41-43yr
  | 'chiron_return' // 50-51yr
  | 'saturn_return_2' // 58-60yr
  | 'jupiter_return_5' // 60yr
  | 'uranus_return' // 83-84yr

export interface AstroLifecycleEvent {
  kind: AstroLifecycleEventKind
  ageStart: number
  ageEnd: number
  labelKo: string
  labelEn: string
  meaningKo: string
  meaningEn: string
  adviceKo: string
  adviceEn: string
}

const TABLE: AstroLifecycleEvent[] = [
  {
    kind: 'jupiter_return_1',
    ageStart: 11,
    ageEnd: 13,
    labelKo: '첫 목성 회귀 — 확장의 한 사이클',
    labelEn: 'First Jupiter return',
    meaningKo: '12년 만의 첫 회귀로 세계관이 한 번 크게 확장돼요.',
    meaningEn: 'Your worldview expands a step on this first 12-year return.',
    adviceKo: '새로운 분야에 호기심을 활짝 열어두세요.',
    adviceEn: 'Keep your curiosity wide open to new fields.',
  },
  {
    kind: 'jupiter_return_2',
    ageStart: 23,
    ageEnd: 25,
    labelKo: '두 번째 목성 회귀 — 진로의 큰 그림',
    labelEn: 'Second Jupiter return',
    meaningKo: '진로의 큰 그림을 처음으로 자기 손에 쥐는 시기예요.',
    meaningEn: 'You first grip the larger picture of your career path.',
    adviceKo: '단기 이익보다 장기 비전을 먼저 챙겨주세요.',
    adviceEn: 'Put long-term vision before short-term gain.',
  },
  {
    kind: 'progressed_lunar_1',
    ageStart: 27,
    ageEnd: 29,
    labelKo: '감정 흐름의 한 매듭',
    labelEn: 'Progressed lunar return',
    meaningKo: '감정과 관계의 한 사이클이 졸업되는 시기예요.',
    meaningEn: 'One full emotional / relational cycle graduates.',
    adviceKo: '익숙해진 관계 패턴을 한 번 점검하고 정리해 보세요.',
    adviceEn: 'Audit familiar relational patterns and let what is done go.',
  },
  {
    kind: 'saturn_return_1',
    ageStart: 28,
    ageEnd: 31,
    labelKo: '첫 토성 회귀 — 진짜 어른됨의 통과의례',
    labelEn: 'First Saturn return',
    meaningKo: '책임과 전문성, 기반이 자리 잡는 시기예요.',
    meaningEn: 'The rite of adulthood — responsibility, craft and foundation lock in.',
    adviceKo:
      '회피하지 말고 책임을 한 단계씩 받아들이세요. 30세 전후의 선택이 평생의 토대가 됩니다.',
    adviceEn:
      'Take responsibility step by step rather than avoiding it — choices around 30 become a lifelong foundation.',
  },
  {
    kind: 'jupiter_return_3',
    ageStart: 35,
    ageEnd: 37,
    labelKo: '세 번째 목성 회귀 — 인생 중반 직전의 확장',
    labelEn: 'Third Jupiter return',
    meaningKo: '인생 중반에 들어서기 직전, 마지막 큰 확장의 기회예요.',
    meaningEn: 'The last expansion window before midlife.',
    adviceKo: '아직 시도하지 못한 큰 그림을 행동으로 옮기기 좋은 시기예요.',
    adviceEn: 'A good window to put your untried big plan into action.',
  },
  {
    kind: 'pluto_square_pluto',
    ageStart: 36,
    ageEnd: 40,
    labelKo: '명왕성 사각 — 깊은 재구성',
    labelEn: 'Pluto square Pluto',
    meaningKo: '정체성과 내면 깊은 곳이 강하게 재구성되는 시기예요.',
    meaningEn: 'Identity and the deep self are forcibly reorganised.',
    adviceKo: '저항하기보다 흘려보내세요. 통제 욕구를 내려놓을수록 결과가 커집니다.',
    adviceEn:
      'Let it move through you rather than resisting — the more you release control, the larger the result.',
  },
  {
    kind: 'uranus_opposition',
    ageStart: 40,
    ageEnd: 43,
    labelKo: '천왕성 마주봄 — 자유의 각성',
    labelEn: 'Uranus opposition',
    meaningKo: '진짜 자기와 맞지 않는 길이 갑자기 깨지는 중년 각성기예요.',
    meaningEn: 'The midlife awakening — what is not truly you breaks open.',
    adviceKo: '안정을 핑계로 미루지 말고 진짜 결정을 내릴 때예요.',
    adviceEn: 'Stop hiding behind stability — this is the time for a real decision.',
  },
  {
    kind: 'neptune_square',
    ageStart: 41,
    ageEnd: 43,
    labelKo: '해왕성 사각 — 의미의 시험',
    labelEn: 'Neptune square',
    meaningKo: '의미와 환상이 시험대에 오르는 시기예요.',
    meaningEn: 'Meaning and illusion are put to the test.',
    adviceKo: '환상은 정리하고, 진짜로 헌신할 가치 하나를 골라 보세요.',
    adviceEn: 'Clear out illusions and pick a single value worth real devotion.',
  },
  {
    kind: 'chiron_return',
    ageStart: 49,
    ageEnd: 51,
    labelKo: '카이런 회귀 — 치유의 회귀',
    labelEn: 'Chiron return',
    meaningKo: '평생의 상처를 본격적으로 치유로 바꾸는 시기예요.',
    meaningEn: 'The lifelong wound now converts itself into healing capacity.',
    adviceKo: '오래된 상처를 외면하지 말고, 그것을 누군가에게 도움이 되는 형태로 바꿔 보세요.',
    adviceEn:
      'Stop looking away from the old wound — translate it into something that helps others.',
  },
  {
    kind: 'saturn_return_2',
    ageStart: 57,
    ageEnd: 60,
    labelKo: '두 번째 토성 회귀 — 마지막 어른됨의 통과의례',
    labelEn: 'Second Saturn return',
    meaningKo: '사회 무대의 마지막 큰 전환, 진짜 남길 것을 정해주는 시기예요.',
    meaningEn: 'The last great social pivot — what you choose to leave behind.',
    adviceKo: '진짜 의미 있는 일에만 시간을 쓰세요.',
    adviceEn: 'Spend your time only on what truly matters.',
  },
  {
    kind: 'jupiter_return_5',
    ageStart: 59,
    ageEnd: 61,
    labelKo: '다섯 번째 목성 회귀 — 환갑의 전환',
    labelEn: 'Fifth Jupiter return',
    meaningKo: '환갑의 전환, 후반 인생의 첫 사이클이 열리는 시기예요.',
    meaningEn: 'A 60-year turning point — the second half of life opens its first cycle.',
    adviceKo: '지금 새로 시작해도 정말 괜찮습니다.',
    adviceEn: 'Starting something new right now is genuinely fine.',
  },
  {
    kind: 'uranus_return',
    ageStart: 83,
    ageEnd: 85,
    labelKo: '천왕성 회귀 — 평생 자유의 결산',
    labelEn: 'Uranus return',
    meaningKo: '평생의 자유와 독창성이 한 바퀴를 마감하는 결산기예요.',
    meaningEn: 'A lifetime of freedom and originality finishes its full circle.',
    adviceKo: '마지막까지 자기다움을 잃지 마세요.',
    adviceEn: 'Hold on to your own voice all the way to the end.',
  },
]

export function lifecycleEvents(): AstroLifecycleEvent[] {
  return TABLE
}

/** Events whose age window overlaps [ageLow, ageHigh]. */
export function eventsInAgeRange(ageLow: number, ageHigh: number): AstroLifecycleEvent[] {
  return TABLE.filter((e) => e.ageEnd >= ageLow && e.ageStart <= ageHigh)
}

/** Parse birth year from MainSajuOutput.input.birthDate (YYYY-MM-DD). */
export function birthYearFromBirthDate(birthDate: string): number | undefined {
  if (!birthDate) return undefined
  const m = birthDate.match(/^(\d{4})/)
  if (!m) return undefined
  const y = Number(m[1])
  return Number.isFinite(y) ? y : undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy-compatible wrapper for calendar-engine extractor.
// Mirrors the old astrology/foundation/lifecycleTiming.ts surface, but now
// driven by the LifeReport TABLE above (single source of truth).
// ─────────────────────────────────────────────────────────────────────────────

export interface LifecycleEntry {
  /** Old shape called this `event` (= LifeReport `kind`). */
  event: AstroLifecycleEventKind
  /** Locale-resolved label (defaults to Korean). */
  label: string
  /** Pre-formatted age window, e.g. "29~30세". */
  ageRange: string
  /** Birth year + ageStart. */
  startYear: number
  isPast: boolean
  isCurrent: boolean
  isUpcoming: boolean
  /** Locale-resolved meaning. */
  meaning: string
  /** Locale-resolved advice. */
  advice: string
}

export interface LifecycleTimingResult {
  events: LifecycleEntry[]
}

/**
 * Build life-cycle entries for a birth year, classifying each as
 * past / current / upcoming relative to the current UTC year.
 *
 * @param birthYear Gregorian birth year (e.g. 1990).
 * @param endYear   Inclusive upper bound — events whose startYear is past
 *                  this value will not be flagged as upcoming.
 * @param isKo      When true (default) use Korean labels; otherwise English.
 */
/**
 * 정확한 transit 기반 마일스톤 오버라이드 — calculateOuterPlanetMilestones
 * 결과를 그대로 넘기면 각 event 의 startYear/ageRange 가 평균 테이블 대신
 * 실제 swisseph 교차 연도로 교체된다. 같은 출생연도의 두 사람이라도
 * 토성/목성 회귀가 다른 연도에 떨어지는 차이를 반영하기 위한 hook.
 *
 * 없는 kind 는 평균 테이블로 폴백 — 부분 오버라이드 허용.
 */
export interface LifecycleMilestoneOverride {
  kind: AstroLifecycleEventKind
  startYear: number | null
  age: number | null
  /** Optional — 외행성 transit 의 정확 일시 ISO. lifetimeFlow 가 단계 카드에
   *  "토성 회귀 2024년 3월" 식으로 월까지 표기할 때 사용. 없으면 연도만. */
  exactDateISO?: string | null
}

export function buildLifecycleTiming(
  birthYear: number,
  endYear: number,
  isKo: boolean = true,
  /**
   * Optional — kind 별 실제 transit 결과로 startYear/age 를 덮어쓰기. 미지정
   * 시 옛 동작(평균 나이대 테이블) 그대로 유지(backward compat).
   */
  overrides?: readonly LifecycleMilestoneOverride[]
): LifecycleTimingResult {
  const currentYear = new Date().getUTCFullYear()
  const overrideByKind = new Map<AstroLifecycleEventKind, LifecycleMilestoneOverride>()
  if (overrides) {
    for (const o of overrides) overrideByKind.set(o.kind, o)
  }
  const events: LifecycleEntry[] = TABLE.map((evt) => {
    const override = overrideByKind.get(evt.kind)
    // override 가 있고 실제 연도/나이가 잡혔으면 그걸 쓴다. 못 잡혔으면
    // 평균 테이블 폴백.
    const useOverride = override && override.startYear != null && override.age != null
    const startYear = useOverride ? override!.startYear! : birthYear + evt.ageStart
    const age = useOverride ? override!.age! : evt.ageStart
    // ageRange 표기 — override 일 땐 단일 나이("29세") 평균 테이블일 땐
    // 옛 윈도우("28~31세") 그대로. 단일 표기가 transit 정밀도와 더 일치.
    const ageRange = useOverride
      ? isKo
        ? `${age}세`
        : `age ${age}`
      : `${evt.ageStart}~${evt.ageEnd}세`
    // isPast/Current/Upcoming 도 override 의 단일 연도 기준으로 재계산.
    const endYearOfEvent = useOverride ? startYear : birthYear + evt.ageEnd
    return {
      event: evt.kind,
      label: isKo ? evt.labelKo : evt.labelEn,
      ageRange,
      startYear,
      isPast: currentYear > endYearOfEvent,
      isCurrent: currentYear >= startYear && currentYear <= endYearOfEvent,
      isUpcoming: currentYear < startYear && startYear <= endYear,
      meaning: isKo ? evt.meaningKo : evt.meaningEn,
      advice: isKo ? evt.adviceKo : evt.adviceEn,
    }
  })
  return { events }
}
