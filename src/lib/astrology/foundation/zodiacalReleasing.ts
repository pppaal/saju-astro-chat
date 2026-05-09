// astrology/foundation/zodiacalReleasing.ts
// Zodiacal Releasing (ZR) — Hellenistic 시간 chronology 기법.
// 시작점 = Lot of Spirit (행적·진로용) 또는 Lot of Fortune (체질·외형·외적 사건용).
// 시작 sign 의 ruler 의 행성년수만큼 1차 period 진행 → 황도 순서로 다음 sign 으로 transition.
//
// 행성년수 (Hellenistic 표준):
//   Sun 19, Moon 25, Mercury 20, Venus 8, Mars 15, Jupiter 12, Saturn 27
//
// 본 모듈은 1차 (level-1) period 만 산출. 하위 sub-period 산출은 추후 필요시 확장.

import type { ZodiacKo } from './types'
import type { AstroPlanetName } from '../interpretations'

const ZODIAC_ORDER: ZodiacKo[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

const SIGN_RULERS: Record<ZodiacKo, AstroPlanetName> = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter',
}

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
 * Level-1 ZR period 시퀀스 산출.
 * @param startSign  시작 sign (보통 Lot of Spirit 의 sign)
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
