// tests/lib/compatibility/aspectPriority.test.ts
//
// 애스펙트 목록은 상한이 있으므로 *정렬이 곧 취사선택*이다.
// 회귀 가드 2건:
//   1) 상한으로 잘린 게 있으면 반드시 [참고] 로 고지한다 — 조용히 버리면 모델이
//      "그런 접촉은 없다"고 단정한다(하우스 오버레이에서 실제로 났던 사고).
//   2) 개인행성·고전점 접촉이 근대 특수점(카이런·릴리스·버텍스·포춘) 접촉보다
//      먼저 자리를 차지한다 — orb 가 더 넓어도.

import { describe, it, expect } from 'vitest'
import { formatAstroSynastry } from '@/lib/compatibility/astroSynastryFormatter'
import type { Chart, PlanetBase } from '@/lib/astrology/foundation/types'

const planet = (name: string, longitude: number): PlanetBase => ({
  name,
  longitude,
  sign: '양자리',
  degree: 0,
  minute: 0,
  formatted: '',
  house: 1,
  retrograde: false,
})

const houses = () => Array.from({ length: 12 }, (_, i) => i * 30)

const chart = (planets: PlanetBase[]): Chart =>
  ({
    planets,
    ascendant: planet('Ascendant', 0),
    mc: planet('MC', 270),
    houses: houses().map((cusp) => ({ cusp, formatted: '' })),
    meta: { jdUT: 2451545 },
  }) as unknown as Chart

const base = { latA: 37.5665, lonA: 126.978, latB: 37.5665, lonB: 126.978, lang: 'ko' as const }

describe('formatAstroSynastry — 표시 우선순위·생략 고지', () => {
  it('고전 개인행성 접촉이 더 촘촘한 특수점 접촉보다 먼저 실린다', () => {
    // A 토성 100° · A 카이런 200°  /  B 달 104°(토성과 4° 차) · B 수성 200°(카이런과 0° 합)
    // orb 만 보면 카이런-수성(0°)이 이기지만, 달-토성(4°)이 관계 해석엔 더 무겁다.
    const a = chart([planet('Saturn', 100), planet('Chiron', 200)])
    const b = chart([planet('Moon', 104), planet('Mercury', 200)])
    const out = formatAstroSynastry({ ...base, chartA: a, chartB: b })
    const impIdx = out.indexOf('[IMPORTANT')
    const body = impIdx >= 0 ? out.slice(impIdx) : out
    const moonSaturn = body.indexOf('토성')
    const chironMercury = body.indexOf('카이런')
    expect(moonSaturn).toBeGreaterThanOrEqual(0)
    // 카이런 줄이 아예 없거나(상한 밖), 있어도 달-토성보다 뒤여야 한다.
    if (chironMercury >= 0) expect(moonSaturn).toBeLessThan(chironMercury)
  })

  it('상한으로 잘린 게 있으면 [참고] 로 건수를 고지한다', () => {
    // 상한(18)을 넘기도록 다수의 각을 만든다 — 같은 경도에 여러 점을 몰아 배치.
    const many = (names: string[], lon: number) => names.map((n) => planet(n, lon))
    const a = chart([
      ...many(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'], 10),
      ...many(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'], 70),
    ])
    const b = chart([
      ...many(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'], 10.5),
      ...many(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'], 70.5),
    ])
    const out = formatAstroSynastry({ ...base, chartA: a, chartB: b })
    expect(out).toMatch(/\[참고\] 표시 상한으로 \d+건 생략/)
    expect(out).toContain('단정하지 말 것')
  })

  it('생략이 없으면 고지 줄도 없다(불필요한 잡음 금지)', () => {
    const a = chart([planet('Sun', 10)])
    const b = chart([planet('Moon', 10.5)])
    const out = formatAstroSynastry({ ...base, chartA: a, chartB: b })
    expect(out).not.toMatch(/표시 상한으로/)
  })
})
