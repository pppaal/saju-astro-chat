// astrology/foundation/profections.ts
// Annual Profections — Hellenistic 12년 주기 (Valens, Anthology IV.11; Brennan,
// Hellenistic Astrology ch.11).
// 매년 1개 사인(= whole-sign 하우스)씩 활성화: age 0=ASC 사인(1궁), age 1=다음
// 사인(2궁), ..., age 12=ASC 사인 다시. 활성 사인의 전통 domicile ruler =
// "Lord of the Year".
//
// 활성 사인은 *ASC 사인에서 age 칸* 이다 — Placidus 커스프 위 사인을 읽지 않는다.
// 옛 구현은 natal.houses[].sign(Placidus) 을 읽어, 차단(intercepted) 사인은
// 영영 활성되지 않고 커스프가 같은 사인을 두 번 받는 해는 그 사인이 반복됐다
// (37.5°N 서울 출생 53% 가 최소 1년 틀림 — 감사 ASTRO-1).

import type { Chart, ZodiacKo } from './types'
import type { AstroPlanetName } from '../interpretations'
import { SIGN_RULERS_BY_SIGN } from './dignities'
import { ZODIAC_SIGNS } from './utils'

// 별자리 지배 행성은 dignities.ts(SSOT)에서 파생. 로컬 복제 금지.
const SIGN_RULERS = SIGN_RULERS_BY_SIGN as Record<ZodiacKo, AstroPlanetName>

export interface ProfectionResult {
  age: number
  /** whole-sign 하우스 (1-12) — ASC 사인 = 1궁. */
  activatedHouse: number
  activatedSign: ZodiacKo
  lordOfYear: AstroPlanetName
}

/** ASC 사인 인덱스(0=Aries). 경도가 없으면 ascendant.sign 으로 폴백. */
function ascSignIndex(natal: Chart): number {
  const lon = natal.ascendant?.longitude
  if (typeof lon === 'number' && Number.isFinite(lon)) {
    return Math.floor((((lon % 360) + 360) % 360) / 30)
  }
  const idx = ZODIAC_SIGNS.indexOf(natal.ascendant?.sign as ZodiacKo)
  return idx >= 0 ? idx : 0
}

export function calculateProfection(natal: Chart, age: number): ProfectionResult {
  if (age < 0 || !Number.isFinite(age)) {
    throw new Error(`Invalid age: ${age}`)
  }
  const step = ((Math.floor(age) % 12) + 12) % 12
  const activatedHouse = step + 1
  const activatedSign = ZODIAC_SIGNS[(ascSignIndex(natal) + step) % 12]
  const lordOfYear = SIGN_RULERS[activatedSign]
  return { age: Math.floor(age), activatedHouse, activatedSign, lordOfYear }
}

/**
 * 연속 N년 profections 산출.
 */
export function calculateProfectionTimeline(
  natal: Chart,
  fromAge: number,
  toAge: number
): ProfectionResult[] {
  const out: ProfectionResult[] = []
  for (let a = Math.floor(fromAge); a <= Math.floor(toAge); a++) {
    out.push(calculateProfection(natal, a))
  }
  return out
}
