// src/lib/calendar-engine/lifecycle/astroLifecycle.ts
// Single source of truth for the life-cycle milestone *definitions* (labels,
// meanings, advice) and for turning exact milestone instants into entries.
//
// The dates themselves come from the sky, never from this table: every
// milestone is an exact instant computed by outerMilestones.ts
// (calculateOuterPlanetMilestones — scan + bisection on the real ephemeris).
// The ageStart/ageEnd columns below are *typical* ages only — search seeds for
// that scan and the bell approximation in lifeCurve's no-ephemeris path. They
// are never shown or used as a dated fact (G6 · re-audit AC-1/AC-3/AC-5/CC-1):
// a milestone without an exact instant is omitted.
//
// Consumers:
//   • calendar-engine/lifecycle/outerMilestones.ts — exact instants + pass windows
//   • calendar-engine/extractors/astro-lifecycle.ts — calendar signals (pass window)
//   • calendar-engine/derivers/lifetimeFlow.ts / lifetimePivots.ts — Life milestones

// Real first-pass ages for births 1900–2050 (Swiss Ephemeris sweep, G6) in comments.
export type AstroLifecycleEventKind =
  | 'jupiter_return_1' // 11.3–12.0
  | 'jupiter_return_2' // 23.2–23.9
  | 'progressed_lunar_1' // 27.2–27.5 (secondary progression, day = year)
  | 'saturn_return_1' // 28.4–29.9
  | 'jupiter_return_3' // 35.2–35.9
  | 'pluto_square_pluto' // 35.6–88.1 (Pluto's eccentric orbit)
  | 'uranus_opposition' // 38.7–44.5
  | 'neptune_square' // 38.7–42.1
  | 'chiron_return' // 48.4–50.9
  | 'saturn_return_2' // 58.2–59.0
  | 'jupiter_return_5' // 58.5–59.8
  | 'uranus_return' // 82.4–84.0

export interface AstroLifecycleEvent {
  kind: AstroLifecycleEventKind
  /** Typical age (search seed / approximation only — never a dated fact). */
  ageStart: number
  /** Typical upper age (search seed / approximation only). */
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
    ageStart: 12,
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
    ageStart: 24,
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
    ageStart: 29,
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
    ageStart: 36,
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
    ageStart: 59,
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
    ageStart: 60,
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

/** Definition (labels · meaning · advice) of one milestone kind. */
export function lifecycleEventDef(kind: AstroLifecycleEventKind): AstroLifecycleEvent {
  const def = TABLE.find((e) => e.kind === kind)
  if (!def) throw new Error(`unknown lifecycle kind: ${kind}`)
  return def
}

/**
 * Typical ages per kind — the mean-age table. Use only as a search seed or for an
 * explicitly approximate curve (lifeCurve without an ephemeris series). Never show
 * these as a milestone date or age: buildLifecycleTiming only takes exact instants.
 */
export function typicalLifecycleAges(): ReadonlyArray<{
  kind: AstroLifecycleEventKind
  ageStart: number
  ageEnd: number
}> {
  return TABLE.map(({ kind, ageStart, ageEnd }) => ({ kind, ageStart, ageEnd }))
}

export interface LifecycleEntry {
  /** Milestone kind. */
  event: AstroLifecycleEventKind
  /** Locale-resolved label. */
  label: string
  /** Exact age label, e.g. "29세" / "age 29". */
  ageRange: string
  /** Calendar year of the first exact pass (in the birth time zone). */
  startYear: number
  /**
   * 만 나이(SSOT) — outerMilestones 가 첫 정확 통과 순간에 생일 앵커로 산출한 만 나이.
   * 소비처(lifetimePivots·lifetimeFlow)가 `startYear − birthYear`(달력 나이)로 재계산하면
   * 연말 출생자가 생일 전 +1 살 어긋나므로(감사 F2) 여기서 그대로 노출한다.
   */
  age: number
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
 * 실측 마디 — calculateOuterPlanetMilestones 의 kind 별 결과(첫 정확 통과의 연도·만 나이).
 * startYear/age 가 비어 있으면(손으로 만든 픽스처 등) 그 kind 는 싣지 않는다 — 평균
 * 나이표로 채우지 않는다.
 */
export interface LifecycleMilestoneOverride {
  kind: AstroLifecycleEventKind
  startYear: number | null
  age: number | null
  /** Optional — 첫 정확 통과의 출생지 달력 날짜 'YYYY-MM-DD'. lifetimeFlow 가 단계 카드에
   *  "토성 회귀 2024년 3월" 식으로 월까지 표기할 때 사용. 없으면 연도만. */
  exactDateISO?: string | null
}

/**
 * calculateOuterPlanetMilestones 가 내는 완전한 실측 마디 — 인생 화면(마디·단계 카드)과
 * 캘린더(라이프사이클 신호·교차·10년 겹침)가 *같은* 순간을 읽는 단일 출처.
 */
export interface LifecycleMilestone extends LifecycleMilestoneOverride {
  startYear: number
  age: number
  exactDateISO: string
  /** 첫 정확 통과 순간(UTC ISO). exactDateISO 는 이 순간의 출생지 날짜. */
  exactAt: string
  /** 같은 역행 묶음의 마지막 정확 통과(UTC ISO) — 한 번만 지나면 exactAt 과 같다. */
  lastExactAt: string
  /** 그 묶음의 정확 통과 횟수(역행이면 3·5·7). */
  passCount: number
  /**
   * 통과 창(UTC ISO) — 첫 통과로 이어지는 접근에서 정확각 1° 안에 든 순간부터 마지막
   * 통과 뒤 1° 밖으로 나가는 순간까지(LIFECYCLE_ORB_DEG). 캘린더 신호의 활성 창.
   */
  window: { start: string; end: string }
}

/**
 * Exact milestones → locale-resolved entries in table order, each classified as
 * past / current / upcoming against `now`.
 *
 * Only kinds with an exact instant appear: no mean-age fallback (a scan that ran and
 * found nothing inside a human lifespan, or an unavailable ephemeris, means the
 * milestone is not shown — G6).
 *
 * @param milestones exact milestones (calculateOuterPlanetMilestones); undefined = none.
 * @param opts.endYear inclusive upper bound — a milestone after it is not flagged upcoming.
 * @param opts.isKo    Korean labels when true (default); otherwise English.
 * @param opts.now     "지금" 주입점 — isPast/isCurrent/isUpcoming 의 기준 연도. 기본값은 호출
 *                     시점이라 프로덕션 동작은 그대로, 테스트는 고정해 결정론적으로 검증한다.
 */
export function buildLifecycleTiming(
  milestones: readonly LifecycleMilestoneOverride[] | undefined,
  opts: { endYear: number; isKo?: boolean; now?: Date }
): LifecycleTimingResult {
  const { endYear, isKo = true, now = new Date() } = opts
  const currentYear = now.getUTCFullYear()
  const byKind = new Map<AstroLifecycleEventKind, LifecycleMilestoneOverride>()
  for (const m of milestones ?? []) byKind.set(m.kind, m)
  const events: LifecycleEntry[] = []
  for (const evt of TABLE) {
    const m = byKind.get(evt.kind)
    // 실측 순간이 없으면 싣지 않는다 — 평균 나이는 사실이 아니다.
    if (!m || m.startYear == null || m.age == null) continue
    const startYear = m.startYear
    const age = m.age
    events.push({
      event: evt.kind,
      label: isKo ? evt.labelKo : evt.labelEn,
      ageRange: isKo ? `${age}세` : `age ${age}`,
      startYear,
      age,
      isPast: currentYear > startYear,
      isCurrent: currentYear === startYear,
      isUpcoming: currentYear < startYear && startYear <= endYear,
      meaning: isKo ? evt.meaningKo : evt.meaningEn,
      advice: isKo ? evt.adviceKo : evt.adviceEn,
    })
  }
  return { events }
}
