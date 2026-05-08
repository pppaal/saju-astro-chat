// Astro lifecycle timing — major outer-planet returns and oppositions
// that mark traditional life-cycle pivots.
//
// Mirrors saju's extendedAnalysis.decisiveTimings (결혼/이직/사업/이사/
// 건강/재물/위기 — 7 windows from daewoon). The astro side uses the
// well-known transit milestones that fire at predictable ages.
//
// All deterministic — no LLM. The user's birth year is enough; we
// don't need precise progression to surface "Saturn return at age 29".

export type LifecycleEvent =
  | 'jupiter_return_1'    // 12yr
  | 'saturn_return_1'     // 29-30yr
  | 'progressed_lunar_1'  // ~28-29yr (progressed Moon back to natal)
  | 'jupiter_return_2'    // 24yr
  | 'pluto_square_pluto'  // 36-40yr
  | 'uranus_opposition'   // 40-42yr "midlife"
  | 'neptune_square'      // 41-43yr
  | 'jupiter_return_3'    // 36yr
  | 'saturn_return_2'     // 58-60yr
  | 'jupiter_return_5'    // 60yr (Hwangap-like for 점성)
  | 'uranus_return'       // 84yr

export interface LifecycleEntry {
  event: LifecycleEvent
  label: string
  ageRange: string  // "29~30세"
  startYear: number  // birth year + age
  isPast: boolean
  isCurrent: boolean
  isUpcoming: boolean
  /** Why this matters. */
  meaning: string
  /** Concrete advice for that window. */
  advice: string
}

const EVENT_DATA: Record<LifecycleEvent, {
  ageStart: number
  ageEnd: number
  label: string
  meaning: string
  advice: string
}> = {
  jupiter_return_1: {
    ageStart: 11, ageEnd: 13,
    label: '첫 Jupiter Return — 자기 영역의 첫 확장',
    meaning: '12년 만에 출생 시 Jupiter 자리로 돌아옴. 첫 번째 인생 단계가 마무리되고 의미·세계관 확장이 시작됩니다.',
    advice: '새로운 분야에 호기심을 열어둘 시기.',
  },
  jupiter_return_2: {
    ageStart: 23, ageEnd: 25,
    label: '두 번째 Jupiter Return — 진로 큰 그림',
    meaning: '두 번째 Jupiter 회귀. 진로/세계관에서 큰 그림을 그려야 하는 시기.',
    advice: '단기 이익보다 장기 비전을 우선하세요.',
  },
  saturn_return_1: {
    ageStart: 28, ageEnd: 31,
    label: '첫 Saturn Return — 어른됨의 통과의례',
    meaning: '첫 토성 회귀. 30세 전후 인생의 진짜 책임·구조가 자리 잡습니다. 결혼·전문성·기반 결정이 자주 몰림.',
    advice: '회피하지 말고 책임을 정면으로 받아들이는 결정이 평생의 토대가 됩니다.',
  },
  progressed_lunar_1: {
    ageStart: 27, ageEnd: 29,
    label: 'Progressed Moon Return — 정서 사이클 1바퀴',
    meaning: '진행 달이 출생 자리로 돌아오는 첫 시기. 감정·관계 패턴이 한 사이클 마감됩니다.',
    advice: '익숙한 관계 패턴을 점검하고 졸업할 결을 정리하세요.',
  },
  jupiter_return_3: {
    ageStart: 35, ageEnd: 37,
    label: '세 번째 Jupiter Return — 중간 점검',
    meaning: '인생 중반 진입 직전 마지막 확장 기회.',
    advice: '아직 시도 못 한 큰 그림을 행동으로 옮기기 좋은 시기.',
  },
  pluto_square_pluto: {
    ageStart: 36, ageEnd: 40,
    label: 'Pluto Square Pluto — 깊은 변용 압력',
    meaning: '명왕성이 출생 자리에 스퀘어. 정체성·권력·내면 깊은 곳의 강제 재구성. 큰 변환의 트리거.',
    advice: '저항보다 흘려보내기. 통제 욕구를 내려놓을수록 결과 큽니다.',
  },
  uranus_opposition: {
    ageStart: 40, ageEnd: 43,
    label: 'Uranus Opposition — 미드라이프 각성',
    meaning: '천왕성이 출생 자리에 어포지션. 진짜 자기와 맞지 않는 길은 갑작스럽게 깨지고, 진짜 자기가 드러납니다.',
    advice: '안정 빌미로 미루지 말고 진짜 결정을 내릴 때.',
  },
  neptune_square: {
    ageStart: 41, ageEnd: 43,
    label: 'Neptune Square — 의미·환상의 시험',
    meaning: '해왕성 스퀘어. 평생 믿어온 의미·이상이 흔들리며 진짜 영성이 어디 있는지 검증됩니다.',
    advice: '환상 정리. 진짜로 헌신할 가치 한 가지를 골라내세요.',
  },
  saturn_return_2: {
    ageStart: 57, ageEnd: 60,
    label: '두 번째 Saturn Return — 황혼의 정리',
    meaning: '두 번째 토성 회귀. 사회적 위치의 마지막 큰 전환. 진짜 남길 것이 무엇인지 결정.',
    advice: '의미 있는 일에만 시간을 쓰세요.',
  },
  jupiter_return_5: {
    ageStart: 59, ageEnd: 61,
    label: '다섯 번째 Jupiter Return — 60세 전환',
    meaning: '동양의 환갑과 비슷한 결. 인생 후반 첫 사이클 시작.',
    advice: '새로 시작해도 괜찮습니다.',
  },
  uranus_return: {
    ageStart: 83, ageEnd: 85,
    label: 'Uranus Return — 평생 자유 회귀',
    meaning: '천왕성이 한 바퀴 돌고 출생 자리로 돌아옴. 평생의 자유·독창성이 마지막 결산.',
    advice: '자기다움을 마지막까지 잃지 말 것.',
  },
}

const EVENT_ORDER: LifecycleEvent[] = [
  'jupiter_return_1',
  'jupiter_return_2',
  'progressed_lunar_1',
  'saturn_return_1',
  'jupiter_return_3',
  'pluto_square_pluto',
  'uranus_opposition',
  'neptune_square',
  'saturn_return_2',
  'jupiter_return_5',
  'uranus_return',
]

export interface LifecycleTimingOutput {
  currentAge: number
  events: LifecycleEntry[]
  /** Active event (we're inside its window) — null if between cycles. */
  activeEvent: LifecycleEntry | null
  /** Next upcoming event. */
  nextEvent: LifecycleEntry | null
}

export function buildLifecycleTiming(
  birthYear: number,
  asOfYear: number = new Date().getFullYear(),
): LifecycleTimingOutput {
  const currentAge = asOfYear - birthYear

  const events: LifecycleEntry[] = EVENT_ORDER.map((key) => {
    const meta = EVENT_DATA[key]
    const startYear = birthYear + meta.ageStart
    const endYear = birthYear + meta.ageEnd
    const isCurrent = asOfYear >= startYear && asOfYear <= endYear
    const isPast = asOfYear > endYear
    const isUpcoming = asOfYear < startYear
    return {
      event: key,
      label: meta.label,
      ageRange: `${meta.ageStart}~${meta.ageEnd}세`,
      startYear,
      isPast,
      isCurrent,
      isUpcoming,
      meaning: meta.meaning,
      advice: meta.advice,
    }
  })

  return {
    currentAge,
    events,
    activeEvent: events.find((e) => e.isCurrent) || null,
    nextEvent: events.find((e) => e.isUpcoming) || null,
  }
}
