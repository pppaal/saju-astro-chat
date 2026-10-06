// src/lib/compatibility/timeSensitivity.ts
//
// 출생시각 민감도 — "상대 생시를 추측해서 넣었을 때, 리포트의 무엇이 실제로
// 바뀌는가"를 엔진으로 계산한다.
//
// 왜 필요한가 (바이럴 루프의 빠진 조각):
//
//   지금 무료 궁합은 A 가 **상대 생시를 추측해서** 입력한다. 그 위에 세운
//   리포트를 공유하면 받은 사람(B)은 "새로 해보기" 말고는 할 일이 없다 —
//   자기 정확한 시간을 줄 이유가 없다. 루프가 여기서 샌다.
//
//   그런데 생시는 리포트를 실제로 뒤집는다. 같은 커플을 09:35 와 00:35 로
//   계산했을 때 상대 ASC 가 물고기→전갈로 바뀌고, 하우스 오버레이 방향이
//   통째로 달라지고, 시주가 己巳→甲子 로 바뀌어 배우자성 개수까지 변했다.
//
//   그래서 **"당신이 추측한 생시 때문에 N개가 불확실하다"** 를 정직하게
//   보여주고 초대 근거로 쓴다. 가짜 게이트가 아니라 사실이다.
//
// 구현: 미상인 쪽의 생시를 24시간 1시간 간격으로 스윕해 사실 집합을 뽑고,
// 전 구간 동일한 것(stable)과 달라지는 것(volatile)으로 나눈다. 1시간 간격은
// 시주(2시간 단위 지지)를 모두 덮고 ASC(≈4분/1°) 변화도 충분히 드러낸다 —
// 다만 ASC 는 연속값이라 "이 범위에서 변한다"는 증명이지 전수는 아니다.
// 그 한계를 결과에 명시한다(sampleCount).
//
// 비용: 스윕 1회당 natal chart 24회. 미상인 쪽만 스윕하므로 상대 차트는
// 재사용한다. 결정론 — 같은 입력이면 항상 같은 결과.

import type { Chart } from '@/lib/astrology/foundation/types'

/** 한 후보 시각에서 뽑은 사실들. 문자열로 비교해 변동 여부를 센다. */
export interface SensitivityFacts {
  /**
   * 미상인 쪽의 **일주** 간지 — 사주에서 가장 중요한 기둥(일간=나, 일지=배우자궁).
   *
   * 감사에서 찾은 빈틈: 이 필드가 빠져 있었다. "사주 일간·일지는 생시와 무관"은
   * **자시 경계에서 틀린다.** 진태양시 보정(서울 −32분) 때문에 00:00~00:31 출생은
   * 전날 일주(야자시)이고 00:32 부터 당일(조자시)이다. 실측(여 1991-02-03):
   *   00:00 → 일주 癸卯 (2/2)   00:32 → 일주 甲辰 (2/3)
   * 일간이 바뀌면 십성 전체·배우자궁·공망·천을귀인·배우자성이 **전부** 바뀐다.
   * ASC 가 바뀌는 것보다 훨씬 큰 변동이라 반드시 센다.
   *
   * (대운수는 같은 스윕에서 불변이었다 — 3일=1년 환산이라 24시간 차이가 약 4개월
   *  이라 반올림이 같았다. 절입에 더 가까운 생일에선 변할 수 있어 "항상 불변"으로
   *  주장하지 않는다.)
   */
  dayPillar: string
  /** 미상인 쪽의 시주 간지 — 2시간 지지 단위로 바뀐다. */
  hourPillar: string
  /** 미상인 쪽 ASC 사인. */
  ascSign: string
  /** 상대 행성이 미상인 쪽의 몇 하우스에 떨어지는가 — planetKey→house. */
  overlayHouses: Record<string, number>
  /**
   * 배우자성 개수 — **양방향 모두 센다.**
   *
   * 측정에서 드러난 빈틈: 미상인 쪽이 *상대를* 보는 개수는 미상인 쪽 일간(고정)
   * 과 상대 8글자(고정)로 정해져 생시와 무관하다. 실제로 변하는 건 **상대가
   * 미상인 쪽을 보는** 개수다 — 미상인 쪽 시주가 바뀌면 그 글자가 상대에게
   * 배우자성일 수도, 아닐 수도 있다(91여 사례: 00:35 시간 甲 → 남자에게 정재,
   * 09:35 시간 己 → 편인이라 처성 아님). 한 방향만 재면 이 변동을 놓친다.
   */
  spouseStarSeenByUnknown: number
  spouseStarSeenByPartner: number
}

export interface SensitivityField {
  /** 필드 키 — 'hourPillar' | 'ascSign' | `overlay:${planet}` | 'spouseStarCount' */
  key: string
  /** 사람이 읽는 라벨(ko/en). */
  label: { ko: string; en: string }
  /** 스윕 구간에서 나온 서로 다른 값의 개수. 1 이면 생시와 무관. */
  distinctValues: number
  /** 가장 자주 나온 값과 그 비율(0~1) — "대개 이렇지만 확정은 아니다". */
  mode: { value: string; share: number }
}

export interface TimeSensitivityResult {
  /** 스윕한 후보 시각 수. */
  sampleCount: number
  /** 생시와 무관하게 고정된 필드. */
  stable: SensitivityField[]
  /** 생시에 따라 달라지는 필드. */
  volatile: SensitivityField[]
  /** 전체 필드 수 / 변동 필드 수 — 헤드라인 숫자. */
  totalFields: number
  volatileFields: number
}

const PLANET_LABELS: Record<string, { ko: string; en: string }> = {
  Sun: { ko: '태양', en: 'Sun' },
  Moon: { ko: '달', en: 'Moon' },
  Mercury: { ko: '수성', en: 'Mercury' },
  Venus: { ko: '금성', en: 'Venus' },
  Mars: { ko: '화성', en: 'Mars' },
  Jupiter: { ko: '목성', en: 'Jupiter' },
  Saturn: { ko: '토성', en: 'Saturn' },
  Uranus: { ko: '천왕성', en: 'Uranus' },
  Neptune: { ko: '해왕성', en: 'Neptune' },
  Pluto: { ko: '명왕성', en: 'Pluto' },
}

/**
 * 하우스 번호 산출 — 커스프 배열에서 경도가 속한 하우스(1~12).
 * compatAstroFacts·synastry 와 같은 규칙(구간 포함, wrap 처리).
 */
export function houseOfLongitude(cusps: number[], longitude: number): number {
  if (cusps.length !== 12) return 0
  for (let i = 0; i < 12; i++) {
    const a = cusps[i]
    const b = cusps[(i + 1) % 12]
    const span = (b - a + 360) % 360
    const off = (longitude - a + 360) % 360
    if (off < span) return i + 1
  }
  return 0
}

/** 후보 시각 목록 — 0시부터 stepHours 간격. 기본 1시간(24개). */
export function candidateTimes(stepHours = 1): { hour: number; minute: number }[] {
  const out: { hour: number; minute: number }[] = []
  for (let h = 0; h < 24; h += stepHours) out.push({ hour: h, minute: 0 })
  return out
}

/**
 * 사실 집합 하나를 필드 단위로 펼친다 — 비교 가능한 (key, value) 쌍으로.
 * overlayHouses 는 행성마다 별도 필드로 센다(달이 7H→8H 로 넘어가는 것 같은
 * 개별 변동을 뭉개지 않기 위해).
 */
function flatten(f: SensitivityFacts): Map<string, string> {
  const m = new Map<string, string>()
  m.set('dayPillar', f.dayPillar)
  m.set('hourPillar', f.hourPillar)
  m.set('ascSign', f.ascSign)
  m.set('spouseStarSeenByUnknown', String(f.spouseStarSeenByUnknown))
  m.set('spouseStarSeenByPartner', String(f.spouseStarSeenByPartner))
  for (const [planet, house] of Object.entries(f.overlayHouses)) {
    m.set(`overlay:${planet}`, String(house))
  }
  return m
}

function labelFor(key: string): { ko: string; en: string } {
  if (key === 'dayPillar')
    return { ko: '일주(日柱) — 일간·배우자궁', en: 'Day pillar — day master & spouse palace' }
  if (key === 'hourPillar') return { ko: '시주(時柱)', en: 'Hour pillar' }
  if (key === 'ascSign') return { ko: '상승점 별자리', en: 'Rising sign' }
  if (key === 'spouseStarSeenByUnknown')
    return {
      ko: '그 사람이 상대에게서 보는 배우자성 개수',
      en: 'Spouse stars they see in their partner',
    }
  if (key === 'spouseStarSeenByPartner')
    return {
      ko: '상대가 그 사람에게서 보는 배우자성 개수',
      en: 'Spouse stars their partner sees in them',
    }
  if (key.startsWith('overlay:')) {
    const planet = key.slice('overlay:'.length)
    const p = PLANET_LABELS[planet] ?? { ko: planet, en: planet }
    return {
      ko: `상대 ${p.ko}이 들어오는 방(하우스)`,
      en: `House their ${p.en} falls in`,
    }
  }
  return { ko: key, en: key }
}

/**
 * 후보별 사실 집합들을 받아 stable/volatile 로 분류한다.
 *
 * 순수 함수 — 에페메리스를 돌리지 않는다. 호출자(서버 라우트)가 각 후보
 * 시각으로 차트를 만들어 facts 배열을 넘긴다. 이렇게 쪼개면 이 분류 로직을
 * 에페메리스 없이 테스트할 수 있다.
 */
export function classifySensitivity(samples: SensitivityFacts[]): TimeSensitivityResult {
  if (samples.length === 0) {
    return { sampleCount: 0, stable: [], volatile: [], totalFields: 0, volatileFields: 0 }
  }

  const flat = samples.map(flatten)
  // 어느 샘플에든 나타난 키 전체 — 샘플마다 행성 집합이 다를 수 있어 합집합을 쓴다.
  const keys = new Set<string>()
  for (const m of flat) for (const k of m.keys()) keys.add(k)

  const stable: SensitivityField[] = []
  const volatile: SensitivityField[] = []

  for (const key of Array.from(keys).sort()) {
    const values = flat.map((m) => m.get(key) ?? '')
    const counts = new Map<string, number>()
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
    let modeValue = ''
    let modeCount = 0
    for (const [v, c] of counts) {
      if (c > modeCount) {
        modeValue = v
        modeCount = c
      }
    }
    const field: SensitivityField = {
      key,
      label: labelFor(key),
      distinctValues: counts.size,
      mode: { value: modeValue, share: modeCount / values.length },
    }
    if (counts.size <= 1) stable.push(field)
    else volatile.push(field)
  }

  // 일주를 최우선으로, 그다음 변동이 큰 것부터. 일주는 값이 2가지뿐이어도
  // 사주 해석 전체를 바꾸므로 고유값 수로 줄 세우면 안 된다(ASC 12가지보다
  // 아래로 내려가면 가장 중요한 불확실성이 묻힌다).
  const WEIGHT = (k: string) => (k === 'dayPillar' ? 0 : 1)
  volatile.sort(
    (a, b) =>
      WEIGHT(a.key) - WEIGHT(b.key) ||
      b.distinctValues - a.distinctValues ||
      a.key.localeCompare(b.key)
  )

  return {
    sampleCount: samples.length,
    stable,
    volatile,
    totalFields: keys.size,
    volatileFields: volatile.length,
  }
}

/**
 * 한 후보 시각의 사실 집합을 만든다.
 *
 * @param unknownChart 미상인 쪽의 차트(그 후보 시각으로 계산된 것)
 * @param partnerPlanets 상대 행성 — 미상인 쪽 하우스에 떨어뜨릴 대상
 * @param pillars       미상인 쪽의 일주·시주 간지(그 후보 시각 기준). 일주는
 *                      자시 경계에서 바뀌므로 반드시 후보별로 다시 계산해 넘긴다.
 * @param spouseStars   양방향 배우자성 개수 — 상대가 보는 쪽이 생시에 따라 변한다
 */
export function factsFor(
  unknownChart: Chart,
  partnerPlanets: ReadonlyArray<{ name?: string; longitude?: number }>,
  pillars: { dayPillar: string; hourPillar: string },
  spouseStars: { seenByUnknown: number; seenByPartner: number }
): SensitivityFacts {
  const cusps = unknownChart.houses?.map((h) => h.cusp) ?? []
  const overlayHouses: Record<string, number> = {}
  for (const p of partnerPlanets) {
    if (!p?.name || typeof p.longitude !== 'number') continue
    if (!PLANET_LABELS[p.name]) continue // 10행성만 — 노드·특수점은 제외
    overlayHouses[p.name] = houseOfLongitude(cusps, p.longitude)
  }
  return {
    dayPillar: pillars.dayPillar,
    hourPillar: pillars.hourPillar,
    ascSign: String(unknownChart.ascendant?.sign ?? ''),
    overlayHouses,
    spouseStarSeenByUnknown: spouseStars.seenByUnknown,
    spouseStarSeenByPartner: spouseStars.seenByPartner,
  }
}
