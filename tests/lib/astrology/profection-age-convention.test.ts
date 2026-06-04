/**
 * 프로펙션 나이 관습 골든 테스트.
 *
 * calculateProfection 은 *만(완성)나이* 기준이다 (age 0 → 1궁, age 1 → 2궁).
 * destiny counselorContext 가 한국나이(만+1)를 넘기던 off-by-one 버그를 고친 뒤,
 * 누군가 이 함수를 "한국나이 기준"으로 되돌리면 안 되므로 관습을 고정한다.
 *
 * 핵심: 만 30세 → 7궁 (30 % 12 + 1 = 7), 만 31세 → 8궁. 한국나이(31/32)를
 * 넣으면 8궁/9궁으로 한 칸씩 밀린다 — 그게 옛 버그였다.
 */

import { calculateProfection } from '@/lib/astrology/foundation/profections'
import type { Chart, ZodiacKo, House } from '@/lib/astrology/foundation/types'

const ZODIAC: ZodiacKo[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

// Whole-sign chart with Aries rising: house i carries the i-th zodiac sign.
function arisRisingChart(): Chart {
  const houses: House[] = ZODIAC.map((sign, i) => ({
    index: i + 1,
    cusp: i * 30,
    sign,
    formatted: `${sign} 0deg`,
  }))
  return {
    planets: [],
    ascendant: {
      name: 'Ascendant',
      longitude: 0,
      sign: 'Aries',
      degree: 0,
      minute: 0,
      formatted: 'Aries 0deg',
      house: 1,
    },
    mc: {
      name: 'MC',
      longitude: 270,
      sign: 'Capricorn',
      degree: 0,
      minute: 0,
      formatted: 'Capricorn 0deg',
      house: 10,
    },
    houses,
  }
}

describe('calculateProfection — 만(완성)나이 관습', () => {
  const chart = arisRisingChart()

  it('age 0 → 1궁 (태어난 첫 해)', () => {
    expect(calculateProfection(chart, 0).activatedHouse).toBe(1)
  })

  it('age 1 → 2궁', () => {
    expect(calculateProfection(chart, 1).activatedHouse).toBe(2)
  })

  it('만 30세 → 7궁 (옛 버그는 한국나이 31 → 8궁)', () => {
    expect(calculateProfection(chart, 30).activatedHouse).toBe(7)
  })

  it('만 31세 → 8궁', () => {
    expect(calculateProfection(chart, 31).activatedHouse).toBe(8)
  })

  it('12년 주기로 1궁 복귀 (age 12 → 1궁, age 24 → 1궁)', () => {
    expect(calculateProfection(chart, 12).activatedHouse).toBe(1)
    expect(calculateProfection(chart, 24).activatedHouse).toBe(1)
  })

  it('활성 사인·연주(Lord)가 만나이 기준 하우스를 따른다', () => {
    // 만 30세 → 7궁 → Libra → Venus
    const p = calculateProfection(chart, 30)
    expect(p.activatedSign).toBe('Libra')
    expect(p.lordOfYear).toBe('Venus')
  })
})
