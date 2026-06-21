// @vitest-environment node
/**
 * formatCompositeChart — 출생 시각 미상 시 composite ASC/MC 제외 회귀.
 *
 * 한 쪽이라도 시각 미상이면 그 사람 ASC/MC 가 자정 기준 날조값이라, 두 ASC/MC
 * 의 midpoint(=composite ASC/MC)도 무의미하다. 이 경우 composite 점에서 ASC/MC
 * 를 빼서 aspect 에 안 잡히게 한다. 행성(태양/달 등) midpoint 은 유지.
 */
import { describe, it, expect } from 'vitest'
import { formatCompositeChart } from '@/lib/compatibility/compositeChartFormatter'
import type { Chart, PlanetBase, ZodiacKo } from '@/lib/astrology/foundation/types'

const SIGNS: ZodiacKo[] = [
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

function planet(name: string, longitude: number): PlanetBase {
  const norm = ((longitude % 360) + 360) % 360
  const idx = Math.floor(norm / 30)
  return {
    name,
    longitude: norm,
    sign: SIGNS[idx],
    degree: Math.floor(norm % 30),
    minute: 0,
    formatted: `${SIGNS[idx]} ${Math.floor(norm % 30)}deg`,
    house: idx + 1,
    speed: 1,
    retrograde: false,
  } as PlanetBase
}

// 동일 좌표 두 차트 → composite midpoint = 그 좌표. Sun/Moon@0, Venus@200,
// ASC@0, MC@90. composite Sun(0)☌ASC(0) 가 baseline 에 잡힌다.
function chart(): Chart {
  return {
    planets: [planet('Sun', 0), planet('Moon', 0), planet('Venus', 200)],
    ascendant: planet('Ascendant', 0),
    mc: planet('MC', 90),
    houses: [],
  } as unknown as Chart
}

describe('formatCompositeChart — 시각 미상 ASC/MC 제외', () => {
  const chartA = chart()
  const chartB = chart()

  it('baseline(둘 다 시각 알면): composite ASC 가 aspect 에 잡힌다', () => {
    const out = formatCompositeChart({ chartA, chartB })
    expect(out).toContain('상승점') // composite Sun ☌ ASC
  })

  it('A 시각 미상: composite ASC/MC 제외 (행성 midpoint 은 유지)', () => {
    const out = formatCompositeChart({ chartA, chartB, timeUnknownA: true })
    expect(out).not.toContain('상승점')
    expect(out).not.toContain('중천점')
    // 태양☌달 등 행성 aspect 는 남아 composite 자체는 비지 않는다.
    expect(out).toContain('태양')
  })

  it('B 시각 미상도 동일하게 ASC/MC 제외', () => {
    const out = formatCompositeChart({ chartA, chartB, timeUnknownB: true })
    expect(out).not.toContain('상승점')
  })
})
