// astrology/foundation/zodiacalReleasing.ts
// Zodiacal Releasing (ZR) — Hellenistic 시간 chronology 기법.
// 시작점 = Lot of Spirit (행적·진로용) 또는 Lot of Fortune (체질·외형·외적 사건용).
// 시작 sign 의 ruler 의 행성년수만큼 1차 period 진행 → 황도 순서로 다음 sign 으로 transition.
//
// 행성년수 (Hellenistic 표준):
//   Sun 19, Moon 25, Mercury 20, Venus 8, Mars 15, Jupiter 12, Saturn 27
//
// 본 모듈:
//  - L1 period (years)
//  - L2 sub-period (months — 같은 숫자값을 month 단위로)
//  - L3 sub-sub-period (days)
//  - L4 sub-sub-sub-period (hours)
//  - Peak / Loosing-of-Bond 이벤트 (L1 sign 기준 angular / 7th sign 진입)

import type { ZodiacKo } from './types'
import type { AstroPlanetName } from '../interpretations'
import { SIGN_RULERS_BY_SIGN } from './dignities'

const ZODIAC_ORDER: ZodiacKo[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

// 별자리 지배 행성은 dignities.ts(SSOT)에서 파생. 로컬 복제 금지.
const SIGN_RULERS = SIGN_RULERS_BY_SIGN as Record<ZodiacKo, AstroPlanetName>

const PLANET_YEARS: Record<AstroPlanetName, number> = {
  Sun: 19,
  Moon: 25,
  Mercury: 20,
  Venus: 8,
  Mars: 15,
  Jupiter: 12,
  Saturn: 27,
  // 외행성은 ZR에 사용 안 함 — 0 으로 처리해 skip.
  Uranus: 0,
  Neptune: 0,
  Pluto: 0,
  Ascendant: 0,
}

/** ZR period level. L1=year, L2=month, L3=day, L4=hour-ish. */
export type ZRLevel = 1 | 2 | 3 | 4

/** ZR period 시작점 — Spirit (영혼·진로) 또는 Fortune (물질·몸). */
export type ZRStartLot = 'Spirit' | 'Fortune'

export interface ZRPeriod {
  level: 1
  index: number               // 0-based
  sign: ZodiacKo
  ruler: AstroPlanetName
  startYear: number
  endYear: number
  durationYears: number
}

/**
 * Sub-period (L2/L3/L4) — L1 안에서 같은 비율 (시간 단위만 다름).
 *  - L2: month
 *  - L3: day
 *  - L4: hour
 * start/end 는 본명 출생 기준 연 단위 (실수) 로 저장 — calendar 매핑은 birth + years.
 */
export interface ZRSubPeriod {
  level: ZRLevel        // 2 | 3 | 4
  parentLevel: ZRLevel  // 1 | 2 | 3
  index: number         // 0-based within parent
  sign: ZodiacKo
  ruler: AstroPlanetName
  startYear: number
  endYear: number
  durationYears: number
  /** 부모 sign — L1 기준 angular / loosing 검사용. */
  parentSign: ZodiacKo
  /** angular(1/4/7/10) from parent sign — peak indicator. */
  isPeak: boolean
  /** 7th from parent sign — loosing of the bond marker. */
  isLoosingOfTheBond: boolean
}

/**
 * Level-1 ZR period 시퀀스 산출.
 * @param startSign  시작 sign (Lot of Spirit / Lot of Fortune 의 sign)
 * @param yearsToProject  몇 년치 산출 (default 90)
 */
export function calculateZodiacalReleasing(
  startSign: ZodiacKo,
  yearsToProject: number = 90,
): ZRPeriod[] {
  const periods: ZRPeriod[] = []
  let currentSignIdx = ZODIAC_ORDER.indexOf(startSign)
  let elapsedYears = 0
  let i = 0
  while (elapsedYears < yearsToProject) {
    const sign = ZODIAC_ORDER[currentSignIdx]
    const ruler = SIGN_RULERS[sign]
    const duration = PLANET_YEARS[ruler]
    if (duration <= 0) {
      // 외행성 ruler (modern)이면 skip — 다음 sign 으로
      currentSignIdx = (currentSignIdx + 1) % 12
      continue
    }
    periods.push({
      level: 1,
      index: i,
      sign,
      ruler,
      startYear: elapsedYears,
      endYear: elapsedYears + duration,
      durationYears: duration,
    })
    elapsedYears += duration
    currentSignIdx = (currentSignIdx + 1) % 12
    i += 1
  }
  return periods
}

const SIGN_CHAPTER_THEME: Record<ZodiacKo, string> = {
  Aries:       '시작·개척·자기 발견의 챕터',
  Taurus:      '안정·축적·뿌리 내림의 챕터',
  Gemini:      '연결·학습·소통의 챕터',
  Cancer:      '가정·정서·돌봄의 챕터',
  Leo:         '자기 표현·창조·드러냄의 챕터',
  Virgo:       '정밀·실무·다듬음의 챕터',
  Libra:       '관계·균형·조율의 챕터',
  Scorpio:     '심층 변환·위기 통과의 챕터',
  Sagittarius: '확장·진리·먼 길의 챕터',
  Capricorn:   '구조·책임·성취의 챕터',
  Aquarius:    '혁신·집단·새 질서의 챕터',
  Pisces:      '용해·연민·해체의 챕터',
}

/**
 * ZR period 해석 — 사주 대운(decadal)과 cross 가능한 시기 의미.
 */
export function getZRPeriodInterpretation(period: ZRPeriod): string {
  return `Years ${period.startYear}-${period.endYear} (${period.durationYears}년): ${period.sign} 챕터, ${period.ruler} 다스림. ${SIGN_CHAPTER_THEME[period.sign]}.`
}

/**
 * 특정 나이의 활성 ZR period 찾기.
 */
export function getActiveZRPeriod(periods: ZRPeriod[], age: number): ZRPeriod | undefined {
  return periods.find((p) => age >= p.startYear && age < p.endYear)
}

// ===========================================================================
// L2 / L3 / L4 sub-period
// ===========================================================================

/**
 * 한 L1 period (또는 sub-period) 의 시작 sign 부터, 황도 순서로 12개의 하위 period 를 펼침.
 * 단위는 unitYears (월=1/12, 일=1/365.25, 시간=1/8766) 로 곱해진다.
 *
 * 부모 sign 기준 angular(1/4/7/10) 위치 → peak, 7th → loosing-of-bond.
 */
function expandSubPeriods(args: {
  parentSign: ZodiacKo
  parentStartYear: number
  parentDurationYears: number
  level: ZRLevel
  parentLevel: ZRLevel
  unitYears: number // L2: 1/12, L3: 1/365.25, L4: 1/8766
}): ZRSubPeriod[] {
  const { parentSign, parentStartYear, parentDurationYears, level, parentLevel, unitYears } = args
  const out: ZRSubPeriod[] = []
  const parentIdx = ZODIAC_ORDER.indexOf(parentSign)
  if (parentIdx < 0) return out
  let currentSignIdx = parentIdx
  let cursorYears = 0
  let i = 0
  let safety = 200
  while (cursorYears < parentDurationYears && safety-- > 0) {
    const sign = ZODIAC_ORDER[currentSignIdx]
    const ruler = SIGN_RULERS[sign]
    const durationUnits = PLANET_YEARS[ruler]
    if (durationUnits <= 0) {
      currentSignIdx = (currentSignIdx + 1) % 12
      continue
    }
    const durationYears = durationUnits * unitYears
    const segmentStart = cursorYears
    const segmentEnd = Math.min(cursorYears + durationYears, parentDurationYears)
    const offset = ((currentSignIdx - parentIdx + 12) % 12) + 1
    out.push({
      level,
      parentLevel,
      index: i,
      sign,
      ruler,
      startYear: parentStartYear + segmentStart,
      endYear: parentStartYear + segmentEnd,
      durationYears: segmentEnd - segmentStart,
      parentSign,
      isPeak: [1, 4, 7, 10].includes(offset),
      isLoosingOfTheBond: offset === 7,
    })
    cursorYears += durationYears
    currentSignIdx = (currentSignIdx + 1) % 12
    i += 1
  }
  return out
}

const UNIT_YEARS_L2 = 1 / 12          // ~30.4 days per month (avg)
const UNIT_YEARS_L3 = 1 / 365.25      // 1 day
const UNIT_YEARS_L4 = 1 / (365.25 * 24) // 1 hour

/**
 * L1 period 한 개를 받아 L2 sub-period 12개 펼침 (월 단위).
 */
export function calculateZRSubPeriods(parent: ZRPeriod): ZRSubPeriod[] {
  return expandSubPeriods({
    parentSign: parent.sign,
    parentStartYear: parent.startYear,
    parentDurationYears: parent.durationYears,
    level: 2,
    parentLevel: 1,
    unitYears: UNIT_YEARS_L2,
  })
}

/**
 * L2 sub-period 한 개를 받아 L3 펼침 (일 단위).
 */
export function calculateZRSubPeriodsL3(parent: ZRSubPeriod): ZRSubPeriod[] {
  return expandSubPeriods({
    parentSign: parent.sign,
    parentStartYear: parent.startYear,
    parentDurationYears: parent.durationYears,
    level: 3,
    parentLevel: 2,
    unitYears: UNIT_YEARS_L3,
  })
}

/**
 * L3 sub-period 한 개를 받아 L4 펼침 (시간 단위).
 */
export function calculateZRSubPeriodsL4(parent: ZRSubPeriod): ZRSubPeriod[] {
  return expandSubPeriods({
    parentSign: parent.sign,
    parentStartYear: parent.startYear,
    parentDurationYears: parent.durationYears,
    level: 4,
    parentLevel: 3,
    unitYears: UNIT_YEARS_L4,
  })
}

/**
 * 임의 시점(나이, 연 단위 실수)의 활성 L2/L3/L4 sub-period 를 찾는다.
 * L1 → L2 → L3 → L4 순서로 좁혀가며 캘린더 일자별 신호 매핑에 사용.
 */
export function getActiveZRSub(periods: ZRPeriod[], age: number): {
  l1?: ZRPeriod
  l2?: ZRSubPeriod
  l3?: ZRSubPeriod
  l4?: ZRSubPeriod
} {
  const l1 = getActiveZRPeriod(periods, age)
  if (!l1) return {}
  const l2List = calculateZRSubPeriods(l1)
  const l2 = l2List.find((p) => age >= p.startYear && age < p.endYear)
  if (!l2) return { l1 }
  const l3List = calculateZRSubPeriodsL3(l2)
  const l3 = l3List.find((p) => age >= p.startYear && age < p.endYear)
  if (!l3) return { l1, l2 }
  const l4List = calculateZRSubPeriodsL4(l3)
  const l4 = l4List.find((p) => age >= p.startYear && age < p.endYear)
  return { l1, l2, l3, l4 }
}

// ===========================================================================
// L1 sign 기준 angular / loosing 검사 (L1 자체에 대한 마커)
// ===========================================================================

/**
 * Spirit/Fortune 시작 sign 대비 L1 sign 위치를 검사해 Peak/LoosingOfBond 마커 부여.
 *  - Peak: 시작 sign 기준 1/4/7/10번째 (angular)
 *  - LoosingOfBond: 시작 sign 기준 7번째 (opposition) — 큰 전환점
 */
export function annotateZRMarkers(
  startSign: ZodiacKo,
  periods: ZRPeriod[],
): Array<ZRPeriod & { isPeak: boolean; isLoosingOfTheBond: boolean; offsetFromStart: number }> {
  const startIdx = ZODIAC_ORDER.indexOf(startSign)
  return periods.map((p) => {
    const offset = ((ZODIAC_ORDER.indexOf(p.sign) - startIdx + 12) % 12) + 1
    return {
      ...p,
      offsetFromStart: offset,
      isPeak: [1, 4, 7, 10].includes(offset),
      isLoosingOfTheBond: offset === 7,
    }
  })
}
