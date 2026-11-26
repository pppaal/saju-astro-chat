/**
 * 궁합 상담사 — 시간 *또는* 도시 미상인 사람의 앵글·하우스·추가점 마스크
 * (CALCULATION_SPEC §6, 재감사 CS-2 · CS-5, G8). 라우트와 같은 파이프라인
 * (buildPersonSeed → collectCompatAstroFacts → formatAstroSynastry / formatCompositeChart,
 * 차트 모달은 buildCompatReport) 을 실제 천체력으로 돌린다 — 라우트 자체는 테스트 환경에서
 * 점성 블록을 건너뛴다(NODE_ENV==='test').
 *
 * CS-2: Ann(1992-03-14 06:40 LA, 도시 미상 → 타임존 기준점 34.05,−118.24) × Bob(뉴욕).
 *   예전 텍스트: 'A(Ann) Ascendant [square] B(Bob) Uranus 0.8°', 'A(Ann) MC [conjunction]
 *   B(Bob) Uranus 1.8°', 'B(Bob) Venus → A(Ann) 5H', '[C] Sun sextile Ascendant 0.0°' —
 *   시애틀 실제 출생지에선 각각 5.4° · 5.5° · 6H · 3.1°(판정의 astronomy-engine 독립값).
 *   모달: 'Ascendant-Uranus square 0.8' 와 B→A 오버레이. Ann 의 달 → Bob(앎) ASC 각은 유효.
 * CS-5: toChart 가 meta 를 버려 추가점(카이런·릴리스·행운점·버텍스·남교점)이 한 번도 돌지
 *   않았다. 이제 실리고, 시간 미상 A 의 행운점·버텍스(앵글 파생점)는 가린다 — A=1990-05-15
 *   시간 미상 뉴욕 × B=1988-11-02 19:10 런던: 예전엔 'A Fortune [opposition] B Mercury 0.4°'.
 *
 * 전역 setup 이 swisseph 를 모킹하므로 이 파일은 unmock 하고 node 에서 돈다. native swisseph
 * 가 없으면 로컬에선 skip, CI·destiny release 게이트에선 실패(tests/helpers/realEphemeris.ts).
 *
 * @vitest-environment node
 */
import { it, expect, vi } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../helpers/realEphemeris')

const { buildPersonSeed } = await import('@/app/api/compatibility/counselor/routeSupport')
const { collectCompatAstroFacts } = await import('@/lib/compatibility/compatAstroFacts')
const { formatAstroSynastry } = await import('@/lib/compatibility/astroSynastryFormatter')
const { formatCompositeChart } = await import('@/lib/compatibility/compositeChartFormatter')
const { buildCompatReport } = await import('@/lib/compatibility/compatReport')
const { calculateNatalChart } = await import('@/lib/astrology/foundation/astrologyService')
const { extendChartWithExtraPoints } = await import('@/lib/astrology/foundation/extraPoints')

type Person = Record<string, unknown> & {
  birthDate: string
  birthTime: string
  timeZone: string
}

const ANN_NO_CITY: Person = {
  name: 'Ann',
  birthDate: '1992-03-14',
  birthTime: '06:40',
  gender: 'female',
  timeZone: 'America/Los_Angeles',
  timeUnknown: false,
}
const BOB: Person = {
  name: 'Bob',
  birthDate: '1990-09-02',
  birthTime: '21:15',
  gender: 'male',
  timeZone: 'America/New_York',
  latitude: 40.71,
  longitude: -74.01,
  timeUnknown: false,
}

/** 라우트와 같은 조립 — 플래그를 바꿔 끼울 수 있게 override 를 받는다. */
async function counselorBlocks(
  pA: Person,
  pB: Person,
  lang: 'ko' | 'en',
  override: Partial<Record<'cityUnknownA' | 'cityUnknownB' | 'timeUnknownA', boolean>> = {}
) {
  const s1 = buildPersonSeed(pA)!
  const s2 = buildPersonSeed(pB)!
  const facts = (await collectCompatAstroFacts(
    {
      birthDate: s1.date,
      birthTime: s1.time,
      latitude: s1.latitude,
      longitude: s1.longitude,
      timezone: s1.timeZone,
      timeUnknown: s1.timeUnknown,
    },
    {
      birthDate: s2.date,
      birthTime: s2.time,
      latitude: s2.latitude,
      longitude: s2.longitude,
      timezone: s2.timeZone,
      timeUnknown: s2.timeUnknown,
    }
  ))!
  expect(facts).not.toBeNull()
  const flags = {
    timeUnknownA: s1.timeUnknown,
    timeUnknownB: s2.timeUnknown,
    cityUnknownA: s1.source.usedDefaultLocation,
    cityUnknownB: s2.source.usedDefaultLocation,
    ...override,
  }
  const synastry = formatAstroSynastry({
    chartA: facts.a.chart,
    chartB: facts.b.chart,
    latA: facts.a.latitude,
    lonA: facts.a.longitude,
    latB: facts.b.latitude,
    lonB: facts.b.longitude,
    nameA: String(pA.name ?? ''),
    nameB: String(pB.name ?? ''),
    lang,
    ...flags,
  })
  const composite = formatCompositeChart({
    chartA: facts.a.chart,
    chartB: facts.b.chart,
    nameA: String(pA.name ?? ''),
    nameB: String(pB.name ?? ''),
    lang,
    ...flags,
  })
  return { s1, s2, facts, synastry, composite }
}

/** 모달 경로 — page.tsx 의 astroPayload 처럼 seed 좌표(미상이면 기준점)로 차트를 만든다. */
async function modalReport(pA: Person, pB: Person, cityUnknownA: boolean) {
  const natal = async (p: Person) => {
    const s = buildPersonSeed(p)!
    const [y, m, d] = p.birthDate.split('-').map(Number)
    const [h, mi] = p.birthTime.split(':').map(Number)
    return calculateNatalChart({
      year: y,
      month: m,
      date: d,
      hour: h,
      minute: mi,
      latitude: s.latitude,
      longitude: s.longitude,
      timeZone: p.timeZone,
    })
  }
  return buildCompatReport({
    astroA: await natal(pA),
    astroB: await natal(pB),
    pillarsA: null,
    pillarsB: null,
    timeUnknownA: false,
    timeUnknownB: false,
    cityUnknownA,
    cityUnknownB: false,
    lang: 'en',
  })
}

describeRealEphemeris('compat counselor — city-unknown person (CS-2)', () => {
  it('the seed records the default location', () => {
    const s = buildPersonSeed(ANN_NO_CITY)!
    expect(s.source.usedDefaultLocation).toBe(true)
    expect(s.timeUnknown).toBe(false)
  })

  it('EN: no Ann angle aspect, no overlay into Ann, ASC unknown, no composite angle', async () => {
    const { synastry, composite } = await counselorBlocks(ANN_NO_CITY, BOB, 'en')
    expect(synastry).not.toMatch(/^A\(Ann\) (Ascendant|MC|Fortune|Vertex) /m)
    expect(synastry).not.toMatch(/→ A\(Ann\) \d+H/)
    expect(synastry).toMatch(/ASC A\(Ann\) unknown \/ B\(Bob\) \w+/)
    expect(composite).not.toMatch(/Ascendant|MC/)
    // Bob(앎)의 하우스 오버레이와 Ann 행성 → Bob 앵글 각은 남는다
    expect(synastry).toMatch(/A\(Ann\) \w+ → B\(Bob\) \d+H/)
  })

  it('KO: 같은 마스크 — 상승점·중천점 줄 없음, A 하우스 오버레이 없음, 상승점 A 미상', async () => {
    const { synastry, composite } = await counselorBlocks(ANN_NO_CITY, BOB, 'ko')
    expect(synastry).not.toMatch(/^A\(Ann\) (상승점|중천점|포춘|버텍스) /m)
    expect(synastry).not.toMatch(/→ A\(Ann\) \d+H/)
    expect(synastry).toMatch(/상승점 A\(Ann\) 미상 \/ B\(Bob\) /)
    expect(composite).not.toMatch(/상승점|중천점|Ascendant|MC/)
  })

  it('control: the same charts unmasked carry the fabricated contacts the audit found', async () => {
    const { synastry, composite } = await counselorBlocks(ANN_NO_CITY, BOB, 'en', {
      cityUnknownA: false,
    })
    expect(synastry).toContain('A(Ann) Ascendant [square] B(Bob) Uranus 0.8°')
    expect(synastry).toContain('A(Ann) MC [conjunction] B(Bob) Uranus 1.8°')
    expect(synastry).toMatch(/B\(Bob\) Venus → A\(Ann\) 5H/)
    expect(composite).toContain('[C] Sun sextile Ascendant 0.0°')
  })

  it('both directions: a city-unknown B loses its angles and the overlays into B', async () => {
    const annSeattle = { ...ANN_NO_CITY, latitude: 47.61, longitude: -122.33 }
    const bobNoCity: Person = { ...BOB }
    delete bobNoCity.latitude
    delete bobNoCity.longitude
    const { s2, synastry, composite } = await counselorBlocks(annSeattle, bobNoCity, 'en')
    expect(s2.source.usedDefaultLocation).toBe(true)
    expect(synastry).not.toMatch(/ B\(Bob\) (Ascendant|MC|Fortune|Vertex) \d/)
    expect(synastry).not.toMatch(/→ B\(Bob\) \d+H/)
    expect(synastry).toMatch(/ASC A\(Ann\) \w+ \/ B\(Bob\) unknown/)
    expect(composite).not.toMatch(/Ascendant|MC/)
  })

  it('chart modal (synView): no Ann-angle aspect, no B→A overlay; Ann Moon → Bob ASC stays', async () => {
    const masked = await modalReport(ANN_NO_CITY, BOB, true)
    const view = masked.synView!
    expect(view.aspects.some((a) => a.aKey === 'Ascendant' || a.aKey === 'MC')).toBe(false)
    expect(view.overlaysBtoA).toEqual([])
    expect(view.overlaysAtoB.length).toBeGreaterThan(0)
    expect(view.aspects.some((a) => a.aKey === 'Moon' && a.bKey === 'Ascendant')).toBe(true)

    const unmasked = (await modalReport(ANN_NO_CITY, BOB, false)).synView!
    expect(
      unmasked.aspects.some(
        (a) => a.aKey === 'Ascendant' && a.bKey === 'Uranus' && a.type === 'square'
      )
    ).toBe(true)
    expect(unmasked.overlaysBtoA.length).toBeGreaterThan(0)
  })
})

describeRealEphemeris('compat counselor — synastry extra points (CS-5)', () => {
  const A: Person = {
    birthDate: '1990-05-15',
    birthTime: '',
    timeUnknown: true,
    gender: 'male',
    timeZone: 'America/New_York',
    latitude: 40.7,
    longitude: -74.0,
  }
  const B: Person = {
    birthDate: '1988-11-02',
    birthTime: '19:10',
    timeUnknown: false,
    gender: 'female',
    timeZone: 'Europe/London',
    latitude: 51.5,
    longitude: -0.13,
  }

  it('the production chart carries meta, so the extra points run', async () => {
    const { facts, synastry } = await counselorBlocks(A, B, 'en')
    expect(facts.a.chart.meta?.jdUT).toBeTypeOf('number')
    expect(facts.b.chart.meta?.jdUT).toBeTypeOf('number')
    expect(synastry).toMatch(/Chiron|Lilith|S\.Node/)
    // B(앎)의 행운점·버텍스는 실린다
    expect(synastry).toMatch(/B \w+ \d|B (Fortune|Vertex)/)
  })

  it('time-unknown A: no A Fortune / A Vertex / A angle line (EN and KO)', async () => {
    const en = (await counselorBlocks(A, B, 'en')).synastry
    expect(en).not.toMatch(/^A (Fortune|Vertex|Ascendant|MC) /m)
    const ko = (await counselorBlocks(A, B, 'ko')).synastry
    expect(ko).not.toMatch(/^A (포춘|버텍스|상승점|중천점) /m)
  })

  it("control: the noon-anchored A Fortune really opposes B's Mercury (0.4°) — the mask removed it", async () => {
    const { facts, synastry } = await counselorBlocks(A, B, 'en')
    const a = facts.a.chart
    const ex = extendChartWithExtraPoints(a, a.meta!.jdUT, facts.a.latitude, facts.a.longitude)
    const bMercury = facts.b.chart.planets.find((p) => p.name === 'Mercury')!.longitude
    const sep = Math.abs(((((ex.partOfFortune!.longitude - bMercury) % 360) + 540) % 360) - 180)
    expect(Math.abs(sep - 180)).toBeLessThan(0.5)
    expect(synastry).not.toMatch(/A Fortune \[opposition\] B Mercury/)
  })
})
