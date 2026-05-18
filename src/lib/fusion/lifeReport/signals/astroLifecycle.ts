// src/lib/fusion/lifeReport/signals/astroLifecycle.ts
// Ported (and trimmed) from /lib/astrology/foundation/lifecycleTiming.ts.
// Pure age-window math for outer-planet returns and oppositions. No LLM.
//
// Mirrors saju's daewoon timing in age form. The legacy module exposes a
// far larger surface; here we only keep what life-report sections need.

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
}

const TABLE: AstroLifecycleEvent[] = [
  {
    kind: 'jupiter_return_1',
    ageStart: 11,
    ageEnd: 13,
    labelKo: '첫 목성 회귀 — 확장의 한 사이클',
    labelEn: 'First Jupiter return',
    meaningKo: '12년 만의 첫 회귀로 세계관이 한 번 크게 확장돼요.',
    meaningEn: 'A first 12-year return — your worldview expands one tier.',
  },
  {
    kind: 'jupiter_return_2',
    ageStart: 23,
    ageEnd: 25,
    labelKo: '두 번째 목성 회귀 — 진로의 큰 그림',
    labelEn: 'Second Jupiter return',
    meaningKo: '진로의 큰 그림을 처음으로 자기 손에 쥐는 시기예요.',
    meaningEn: 'You first grip the larger picture of your career path.',
  },
  {
    kind: 'progressed_lunar_1',
    ageStart: 27,
    ageEnd: 29,
    labelKo: '감정 사이클의 졸업',
    labelEn: 'Progressed lunar return',
    meaningKo: '감정과 관계의 한 사이클이 졸업되는 결이에요.',
    meaningEn: 'One full emotional / relational cycle graduates.',
  },
  {
    kind: 'saturn_return_1',
    ageStart: 28,
    ageEnd: 31,
    labelKo: '첫 토성 회귀 — 진짜 어른됨의 통과의례',
    labelEn: 'First Saturn return',
    meaningKo: '책임과 전문성, 기반이 자리 잡는 시기예요.',
    meaningEn: 'The rite of adulthood — responsibility, craft and foundation lock in.',
  },
  {
    kind: 'jupiter_return_3',
    ageStart: 35,
    ageEnd: 37,
    labelKo: '세 번째 목성 회귀 — 인생 중반 직전의 확장',
    labelEn: 'Third Jupiter return',
    meaningKo: '인생 중반에 들어서기 직전, 마지막 큰 확장의 기회예요.',
    meaningEn: 'The last expansion window before midlife.',
  },
  {
    kind: 'pluto_square_pluto',
    ageStart: 36,
    ageEnd: 40,
    labelKo: '명왕성 사각 — 깊은 재구성',
    labelEn: 'Pluto square Pluto',
    meaningKo: '정체성과 내면 깊은 곳이 강하게 재구성되는 시기예요.',
    meaningEn: 'Identity and the deep self are forcibly reorganised.',
  },
  {
    kind: 'uranus_opposition',
    ageStart: 40,
    ageEnd: 43,
    labelKo: '천왕성 마주봄 — 자유의 각성 (중년 변혁)',
    labelEn: 'Uranus opposition',
    meaningKo: '진짜 자기와 맞지 않는 길이 갑자기 깨지는 중년 각성기예요.',
    meaningEn: 'The midlife awakening — what is not truly you breaks open.',
  },
  {
    kind: 'neptune_square',
    ageStart: 41,
    ageEnd: 43,
    labelKo: '해왕성 사각 — 의미의 시험',
    labelEn: 'Neptune square',
    meaningKo: '의미와 환상이 시험대에 오르는 시기예요.',
    meaningEn: 'Meaning and illusion are put to the test.',
  },
  {
    kind: 'chiron_return',
    ageStart: 49,
    ageEnd: 51,
    labelKo: '키론 회귀 — 치유의 회귀',
    labelEn: 'Chiron return',
    meaningKo: '평생의 상처를 본격적으로 치유로 바꾸는 시기예요.',
    meaningEn: 'The lifelong wound now converts itself into healing capacity.',
  },
  {
    kind: 'saturn_return_2',
    ageStart: 57,
    ageEnd: 60,
    labelKo: '두 번째 토성 회귀 — 마지막 어른됨의 통과의례',
    labelEn: 'Second Saturn return',
    meaningKo: '사회적 자리의 마지막 큰 전환, 진짜 남길 것을 정해주는 시기예요.',
    meaningEn: 'The last great social pivot — what you choose to leave behind.',
  },
  {
    kind: 'jupiter_return_5',
    ageStart: 59,
    ageEnd: 61,
    labelKo: '다섯 번째 목성 회귀 — 환갑의 결',
    labelEn: 'Fifth Jupiter return',
    meaningKo: '환갑의 결, 후반 인생의 첫 사이클이 열리는 시기예요.',
    meaningEn: 'A 환갑-style turn — the second half of life opens its first cycle.',
  },
  {
    kind: 'uranus_return',
    ageStart: 83,
    ageEnd: 85,
    labelKo: '천왕성 회귀 — 평생 자유의 결산',
    labelEn: 'Uranus return',
    meaningKo: '평생의 자유와 독창성이 한 바퀴를 마감하는 결산기예요.',
    meaningEn: 'A lifetime of freedom and originality finishes its full circle.',
  },
]

export function lifecycleEvents(): AstroLifecycleEvent[] {
  return TABLE
}

/** Events whose age window overlaps [ageLow, ageHigh]. */
export function eventsInAgeRange(
  ageLow: number,
  ageHigh: number
): AstroLifecycleEvent[] {
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
