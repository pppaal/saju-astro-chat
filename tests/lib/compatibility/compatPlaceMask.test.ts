// @vitest-environment node
/**
 * 궁합 — 시간 *또는* 도시 미상(placeUnreliable) 한 사람의 앵글·하우스·앵글 파생점 마스크
 * (재감사 CS-2 · CS-5, G8). 결정적 합성 차트로 상담사 텍스트(formatAstroSynastry ·
 * formatCompositeChart)와 차트 모달(buildCompatReport → computeSynastryView)이 같은 규칙을
 * 지키는지 양방향으로 잠근다. 실제 천체력 파이프라인은 compatPlaceMask.real.node.test.ts.
 */
import { describe, it, expect } from 'vitest'
import { formatAstroSynastry } from '@/lib/compatibility/astroSynastryFormatter'
import { formatCompositeChart } from '@/lib/compatibility/compositeChartFormatter'
import { buildCompatReport } from '@/lib/compatibility/compatReport'
import { toChart, type NatalChartData } from '@/lib/astrology/foundation/astrologyService'
import { isPlaceDependentPoint, isPlaceUnreliable } from '@/lib/astrology/foundation/placeMask'
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
  }
}
const houses = () =>
  Array.from({ length: 12 }, (_, i) => ({
    index: i + 1,
    cusp: i * 30,
    sign: SIGNS[i],
    formatted: `${SIGNS[i]} 0deg`,
  }))

function chart(planets: PlanetBase[], asc: number, mc: number): Chart {
  return {
    planets,
    ascendant: planet('Ascendant', asc),
    mc: planet('MC', mc),
    houses: houses(),
  }
}

// A: ASC 19 ☌ B Venus 19 · A 행운점 100 ☌ B Mars 100 · A Mercury 48 ☌ B ASC 48
// B: Vertex 190 ☌ A Venus 190 · B Mars 100 → A 4H · A Venus 190 → B 7H
const A = chart([planet('Mercury', 48), planet('Venus', 190), planet('PartOfFortune', 100)], 19, 20)
const B = chart([planet('Venus', 19), planet('Mars', 100), planet('Vertex', 190)], 48, 49)
const base = { chartA: A, chartB: B, latA: 34, lonA: -118, latB: 40.7, lonB: -74 }

describe('placeMask', () => {
  it('placeUnreliable = time OR city unknown', () => {
    expect(isPlaceUnreliable({})).toBe(false)
    expect(isPlaceUnreliable({ timeUnknown: true })).toBe(true)
    expect(isPlaceUnreliable({ cityUnknown: true })).toBe(true)
    expect(isPlaceUnreliable({ timeUnknown: false, cityUnknown: false })).toBe(false)
  })
  it('angles and angle-derived points are place-dependent; planets, Chiron, Lilith, nodes are not', () => {
    for (const n of ['Ascendant', 'ASC', 'MC', 'IC', 'PartOfFortune', 'Fortune', 'Vertex']) {
      expect(isPlaceDependentPoint(n)).toBe(true)
    }
    for (const n of ['Sun', 'Moon', 'Chiron', 'Lilith', 'True Node', 'South Node', '', undefined]) {
      expect(isPlaceDependentPoint(n)).toBe(false)
    }
  })
})

describe('formatAstroSynastry — city-unknown masks like time-unknown (CS-2)', () => {
  it('control: nothing unknown → A angle, A Fortune, overlays both ways', () => {
    const out = formatAstroSynastry({ ...base, lang: 'en' })
    expect(out).toMatch(/^A Ascendant \[conjunction\] B Venus/m)
    expect(out).toMatch(/^A Fortune \[conjunction\] B Mars/m)
    expect(out).toMatch(/B Mars → A 4H/)
    expect(out).toMatch(/A Venus → B 7H/)
    expect(out).toMatch(/ASC A Aries \/ B Taurus/)
  })

  for (const flag of ['timeUnknownA', 'cityUnknownA'] as const) {
    it(`${flag}: no A angle / A Fortune line, no overlay into A, ASC A unknown (EN)`, () => {
      const out = formatAstroSynastry({ ...base, lang: 'en', [flag]: true })
      expect(out).not.toMatch(/^A (Ascendant|MC|Fortune|Vertex) /m)
      expect(out).not.toMatch(/→ A \d+H/)
      expect(out).toMatch(/ASC A unknown \/ B Taurus/)
      // A 행성 → B(앎) 앵글 각과 B 하우스 오버레이, B 버텍스 각은 남는다
      expect(out).toMatch(/^A Mercury \[conjunction\] B Ascendant/m)
      expect(out).toMatch(/A Venus → B 7H/)
      expect(out).toMatch(/^A Venus \[conjunction\] B Vertex/m)
    })
  }

  it('cityUnknownA (KO): 상승점·포춘 줄 없음 + 상승점 A 미상', () => {
    const out = formatAstroSynastry({ ...base, cityUnknownA: true })
    expect(out).not.toMatch(/^A (상승점|중천점|포춘|버텍스) /m)
    expect(out).not.toMatch(/→ A \d+H/)
    expect(out).toMatch(/상승점 A 미상 \/ B /)
    expect(out).toMatch(/^A 수성 \[결합\] B 상승점/m)
  })

  it('cityUnknownB: the mirror image — B angle / B Vertex gone, no overlay into B', () => {
    const out = formatAstroSynastry({ ...base, lang: 'en', cityUnknownB: true })
    expect(out).not.toMatch(/ B (Ascendant|MC|Fortune|Vertex) \d/)
    expect(out).not.toMatch(/→ B \d+H/)
    expect(out).toMatch(/ASC A Aries \/ B unknown/)
    expect(out).toMatch(/^A Ascendant \[conjunction\] B Venus/m)
    expect(out).toMatch(/B Mars → A 4H/)
  })
})

describe('formatCompositeChart — city-unknown drops composite angles (CS-2)', () => {
  // 동일 좌표 두 차트 → composite = 그 좌표. Sun/Moon@0 ☌ ASC@0.
  const same = () =>
    ({
      planets: [planet('Sun', 0), planet('Moon', 0), planet('Venus', 200)],
      ascendant: planet('Ascendant', 0),
      mc: planet('MC', 90),
      houses: [],
    }) as Chart
  it('control has the composite ASC; either side city-unknown removes ASC/MC', () => {
    expect(formatCompositeChart({ chartA: same(), chartB: same(), lang: 'en' })).toContain(
      'Ascendant'
    )
    for (const flag of ['cityUnknownA', 'cityUnknownB'] as const) {
      const en = formatCompositeChart({ chartA: same(), chartB: same(), lang: 'en', [flag]: true })
      expect(en).not.toMatch(/Ascendant|MC/)
      expect(en).toContain('Sun')
      const ko = formatCompositeChart({ chartA: same(), chartB: same(), [flag]: true })
      expect(ko).not.toMatch(/상승점|중천점/)
    }
  })
})

describe('buildCompatReport — chart modal masks a city-unknown person, saju untouched (CS-2)', () => {
  const natal = (planets: Array<[string, number]>, asc: number) => ({
    planets: planets.map(([name, longitude]) => ({ name, longitude, sign: 'Aries' })),
    ascendant: { name: 'Ascendant', longitude: asc, sign: 'Aries' },
    mc: { name: 'MC', longitude: (asc + 270) % 360, sign: 'Capricorn' },
    houses: Array.from({ length: 12 }, (_, i) => ({ cusp: i * 30 })),
  })
  // A ASC 0 ☌ B Sun 0 ; B Moon 90 □ A ASC ; A Moon 200 ☌ B ASC 200 ; A Sun 100 → B 4H
  const astroA = natal(
    [
      ['Sun', 100],
      ['Moon', 200],
    ],
    0
  )
  const astroB = natal(
    [
      ['Sun', 0],
      ['Moon', 90],
    ],
    200
  )
  const PILLARS = [
    { stem: '甲', branch: '子' },
    { stem: '丙', branch: '寅' },
    { stem: '戊', branch: '辰' },
    { stem: '庚', branch: '午' },
  ]
  const build = (over: Record<string, boolean>) =>
    buildCompatReport({
      astroA,
      astroB,
      pillarsA: PILLARS,
      pillarsB: PILLARS,
      lang: 'en',
      ...over,
    })

  it('cityUnknownA: no A-angle aspect, no B→A overlay; A Moon → B ASC stays', () => {
    const v = build({ cityUnknownA: true }).synView!
    expect(v.aspects.some((a) => a.aKey === 'Ascendant' || a.aKey === 'MC')).toBe(false)
    expect(v.overlaysBtoA).toEqual([])
    expect(v.overlaysAtoB.length).toBeGreaterThan(0)
    expect(v.aspects.some((a) => a.aKey === 'Moon' && a.bKey === 'Ascendant')).toBe(true)
    const control = build({}).synView!
    expect(control.aspects.some((a) => a.aKey === 'Ascendant')).toBe(true)
    expect(control.overlaysBtoA.length).toBeGreaterThan(0)
  })

  it('cityUnknownB: mirror image', () => {
    const v = build({ cityUnknownB: true }).synView!
    expect(v.aspects.some((a) => a.bKey === 'Ascendant' || a.bKey === 'MC')).toBe(false)
    expect(v.overlaysAtoB).toEqual([])
  })

  it('city unknown does not touch the saju side (hour pillar stays); time unknown does', () => {
    const plain = build({})
    const city = build({ cityUnknownA: true, cityUnknownB: true })
    expect(city.pillarRelations).toEqual(plain.pillarRelations)
    expect(city.spouseStars).toEqual(plain.spouseStars)
    expect(city.dayMaster).toEqual(plain.dayMaster)
  })
})

describe('toChart withMeta (CS-5)', () => {
  const n: NatalChartData = {
    planets: [
      { name: 'Sun', longitude: 10, formatted: '', sign: 'Aries', degree: 10, minute: 0, house: 1 },
    ],
    ascendant: {
      name: 'Ascendant',
      longitude: 0,
      formatted: '',
      sign: 'Aries',
      degree: 0,
      minute: 0,
      house: 1,
    },
    mc: {
      name: 'MC',
      longitude: 270,
      formatted: '',
      sign: 'Capricorn',
      degree: 0,
      minute: 0,
      house: 10,
    },
    houses: Array.from({ length: 12 }, (_, i) => ({ cusp: i * 30, formatted: '' })),
    meta: {
      jdUT: 2451545,
      timeZone: 'UTC',
      latitude: 51.5,
      longitude: -0.13,
      houseSystem: 'Placidus',
    },
  }
  it('default drops meta (report/calendar/counselor _chart unchanged)', () => {
    expect(toChart(n).meta).toBeUndefined()
  })
  it('withMeta carries the birth instant and place', () => {
    const c = toChart(n, { withMeta: true })
    expect(c.meta).toEqual({
      jdUT: 2451545,
      isoUTC: '2000-01-01T12:00:00.000Z',
      timeZone: 'UTC',
      latitude: 51.5,
      longitude: -0.13,
      houseSystem: 'Placidus',
    })
  })
  it('withMeta without coordinates → no meta (no extra points from a guessed place)', () => {
    const { latitude: _lat, ...noLat } = n.meta!
    void _lat
    expect(toChart({ ...n, meta: noLat }, { withMeta: true }).meta).toBeUndefined()
  })
})
