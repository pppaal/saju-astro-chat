// astrology/foundation/profections.ts
// Annual Profections — Hellenistic 12년 주기.
// 매년 1개 하우스씩 활성화 (age 0=1궁, age 1=2궁, ..., age 12=1궁 다시).
// 활성 하우스 위 sign의 ruler = "Lord of the Year".

import type { Chart, ZodiacKo } from './types'
import type { AstroPlanetName } from '../interpretations'

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
  Aquarius: 'Saturn', // Hellenistic 전통: Saturn ruler (modern은 Uranus)
  Pisces: 'Jupiter',  // Hellenistic 전통: Jupiter ruler (modern은 Neptune)
}

export interface ProfectionResult {
  age: number
  activatedHouse: number      // 1-12
  activatedSign: ZodiacKo
  lordOfYear: AstroPlanetName
}

export function calculateProfection(natal: Chart, age: number): ProfectionResult {
  if (age < 0 || !Number.isFinite(age)) {
    throw new Error(`Invalid age: ${age}`)
  }
  const activatedHouse = ((Math.floor(age) % 12) + 12) % 12 + 1
  const house = natal.houses.find((h) => h.index === activatedHouse)
  const activatedSign = (house?.sign ?? 'Aries') as ZodiacKo
  const lordOfYear = SIGN_RULERS[activatedSign]
  return { age: Math.floor(age), activatedHouse, activatedSign, lordOfYear }
}

/**
 * 연속 N년 profections 산출.
 */
export function calculateProfectionTimeline(natal: Chart, fromAge: number, toAge: number): ProfectionResult[] {
  const out: ProfectionResult[] = []
  for (let a = Math.floor(fromAge); a <= Math.floor(toAge); a++) {
    out.push(calculateProfection(natal, a))
  }
  return out
}
