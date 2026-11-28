/**
 * Astrology goldens on the real ephemeris (engine audit E0, sections B and C).
 *
 * The global test setup mocks swisseph with constant planet positions, so this
 * file unmocks it and runs under the node environment. Expected values come from
 * tests/golden/engine-golden.json, written by scripts/golden/build-engine-golden.mts
 * from astronomy-engine and classical definitions only, never from engine output.
 *
 * Every value passes since engine stages E5, E8 and E13. Without native swisseph the
 * blocks skip locally but fail in CI and in the destiny release gate
 * (tests/helpers/realEphemeris.ts); tests/golden/goldenMarkers.guard.test.ts keeps
 * expected-failure and known-defect markers out (stage E16).
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'
import golden from './engine-golden.json'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../helpers/realEphemeris')

const { calculateNatalChart, toChart } = await import('@/lib/astrology/foundation/astrologyService')
const { calculateProfection } = await import('@/lib/astrology/foundation/profections')
const { calculateSolarArcChart, findSolarArcAspects, solarArcDegrees } =
  await import('@/lib/astrology/foundation/progressions')
const { calculateTransitChart } = await import('@/lib/astrology/foundation/transit')
const { isoToJD } = await import('@/lib/astrology/foundation/shared')
const { calculateZodiacalReleasing, calculateZRSubPeriods, calculateZRSubPeriodsL3 } =
  await import('@/lib/astrology/foundation/zodiacalReleasing')
const { calculateOuterPlanetMilestones } =
  await import('@/lib/calendar-engine/lifecycle/outerMilestones')
const { default: planetaryHourExtractor } =
  await import('@/lib/calendar-engine/extractors/astro-planetary-hour')
const { default: moonPhaseVocExtractor } =
  await import('@/lib/calendar-engine/extractors/astro-moon-phase-voc')
const { createCache } = await import('@/lib/calendar-engine/cache')
const { collectAstroFacts } = await import('@/lib/destiny/astroFacts')

type NatalArg = Parameters<typeof calculateOuterPlanetMilestones>[0]
type ExtractorArg = Parameters<typeof planetaryHourExtractor.extract>[0]

const n360 = (x: number) => ((x % 360) + 360) % 360
const angDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)
const jdOf = (isoUtc: string) => Date.parse(isoUtc) / 86_400_000 + 2440587.5

type Body = { lon: number; sign: string; house?: number; retrograde?: boolean }
type AstroChart = {
  id: string
  input: { date: string; time: string; tz: string; lat: number; lon: number }
  utc: string
  houseSystem: string
  planets: Record<string, Body>
  trueNode: Body
  ascendant: Body
  mc: Body
  cusps: number[]
}
const TOL = golden.astro.tolerance
const CHARTS = golden.astro.charts as unknown as AstroChart[]
const T = golden.timing

async function natalOf(i: { date: string; time: string; tz: string; lat: number; lon: number }) {
  const [year, month, date] = i.date.split('-').map(Number)
  const [hour, minute] = i.time.split(':').map(Number)
  return calculateNatalChart({
    year,
    month,
    date,
    hour,
    minute,
    latitude: i.lat,
    longitude: i.lon,
    timeZone: i.tz,
  })
}

describeRealEphemeris('astro goldens — real ephemeris (E0 section B)', () => {
  for (const c of CHARTS) {
    describe(`${c.id} ${c.input.date} ${c.input.time} ${c.input.tz}`, () => {
      it(`${c.id} instant, house system, angles`, async () => {
        const n = await natalOf(c.input)
        expect(Math.abs(n.meta!.jdUT - jdOf(c.utc)) * 86_400).toBeLessThan(1)
        expect(n.meta!.houseSystem).toBe(c.houseSystem)
        expect(angDiff(n.ascendant.longitude, c.ascendant.lon)).toBeLessThanOrEqual(TOL.angleDeg)
        expect(n.ascendant.sign).toBe(c.ascendant.sign)
        expect(angDiff(n.mc.longitude, c.mc.lon)).toBeLessThanOrEqual(TOL.angleDeg)
        expect(n.mc.sign).toBe(c.mc.sign)
      })
      it(`${c.id} planets: longitude, sign, house, retrograde`, async () => {
        const n = await natalOf(c.input)
        for (const [name, ref] of Object.entries(c.planets)) {
          const p = n.planets.find((x) => x.name === name)
          expect(p, name).toBeDefined()
          expect(angDiff(p!.longitude, ref.lon), `${name} lon`).toBeLessThanOrEqual(TOL.planetDeg)
          expect(p!.sign, `${name} sign`).toBe(ref.sign)
          expect(p!.house, `${name} house`).toBe(ref.house)
          expect(p!.retrograde, `${name} retrograde`).toBe(ref.retrograde)
        }
      })
      it(`${c.id} true node`, async () => {
        const n = await natalOf(c.input)
        const node = n.planets.find((x) => x.name === 'True Node')
        expect(node).toBeDefined()
        expect(angDiff(node!.longitude, c.trueNode.lon)).toBeLessThanOrEqual(TOL.nodeDeg)
        expect(node!.sign).toBe(c.trueNode.sign)
      })
      it(`${c.id} house cusps`, async () => {
        const n = await natalOf(c.input)
        expect(n.houses).toHaveLength(12)
        n.houses.forEach((h, i) => {
          expect(angDiff(h.cusp, c.cusps[i]), `cusp ${i + 1}`).toBeLessThanOrEqual(TOL.cuspDeg)
        })
      })
    })
  }
})

describeRealEphemeris('timing goldens — classical definitions (E0 section C)', () => {
  it('profection ascendant sign', async () => {
    const p = T.profection
    const d = new Date(p.input.utc)
    const n = await calculateNatalChart({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      date: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      latitude: p.input.lat,
      longitude: p.input.lon,
      timeZone: p.input.timeZone,
    })
    expect(n.ascendant.sign).toBe(p.ascendant.sign)
    expect(angDiff(n.ascendant.longitude, p.ascendant.lon)).toBeLessThanOrEqual(TOL.angleDeg)
  })

  it('profection ages 0-11', async () => {
    const p = T.profection
    const d = new Date(p.input.utc)
    const chart = toChart(
      await calculateNatalChart({
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        date: d.getUTCDate(),
        hour: d.getUTCHours(),
        minute: d.getUTCMinutes(),
        latitude: p.input.lat,
        longitude: p.input.lon,
        timeZone: p.input.timeZone,
      })
    )
    const got = p.ages.map(({ age }) => {
      const r = calculateProfection(chart, age)
      return { age, sign: r.activatedSign, lord: r.lordOfYear }
    })
    expect(got).toEqual(p.ages)
  })

  const solarArcNatal = async () => toChart(await natalOf(T.solarArc.input))
  // the directed chart takes the arc in degrees; the arc itself comes from the ephemeris
  const solarArcChartAt = async (age: number) => {
    const raw = await natalOf(T.solarArc.input)
    const natal = toChart(raw)
    return { natal, arc: calculateSolarArcChart(natal, solarArcDegrees(raw.meta!.jdUT, age)) }
  }

  it('solar arc natal instant', async () => {
    const n = await natalOf(T.solarArc.input)
    expect(Math.abs(n.meta!.jdUT - jdOf(T.solarArc.input.utc)) * 86_400).toBeLessThan(1)
  })

  it('solar arc at ages 20/40/60', async () => {
    const natal = await solarArcNatal()
    const sun0 = natal.planets.find((p) => p.name === 'Sun')!.longitude
    for (const { age, arc } of T.solarArc.arcs) {
      const sun = (await solarArcChartAt(age)).arc.planets.find((p) => p.name === 'Sun')!.longitude
      expect(Math.abs(n360(sun - sun0) - arc), `age ${age}`).toBeLessThanOrEqual(
        T.solarArc.toleranceDeg
      )
    }
  })

  it('solar arc age-60 hit set', async () => {
    const { natal, arc } = await solarArcChartAt(60)
    const hits = findSolarArcAspects(natal, arc, T.solarArc.age60.orb)
    const keys = [...new Set(hits.map((h) => `${h.arcPlanet} ${h.aspect} ${h.natalPlanet}`))].sort()
    expect(keys).toEqual(T.solarArc.age60.hits)
  })

  for (const sr of T.saturnReturn.cases) {
    it(`saturn return ${sr.birth.date}`, async () => {
      const raw = await natalOf(sr.birth)
      const chart = toChart(raw)
      const [year, month, date] = sr.birth.date.split('-').map(Number)
      const natal = {
        input: { year, month, date, hour: 12, minute: 0 },
        astro: {
          chart,
          location: { latitude: sr.birth.lat, longitude: sr.birth.lon, timeZone: sr.birth.tz },
        },
      } as unknown as NatalArg
      const m = (await calculateOuterPlanetMilestones(natal)).find(
        (x) => x.kind === 'saturn_return_1'
      )
      expect(m?.exactDateISO).toBeDefined()
      const errDays =
        Math.abs(Date.parse(m!.exactDateISO!) - Date.parse(sr.firstExactPass)) / 86_400_000
      expect(errDays).toBeLessThanOrEqual(T.saturnReturn.toleranceDays)
      expect(m!.age).toBe(sr.age)
    })
  }

  it('transit isoToJD honours Z', () => {
    for (const tz of ['Asia/Seoul', 'America/Los_Angeles', 'UTC']) {
      const jd = isoToJD(T.transit.instant, tz)
      expect(Math.abs(jd - jdOf(T.transit.instant)) * 86_400, tz).toBeLessThan(1)
    }
  })

  it('transit chart at the instant', async () => {
    const chart = await calculateTransitChart({
      iso: T.transit.instant,
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })
    const moon = chart.planets.find((p) => p.name === 'Moon')!
    expect(angDiff(moon.longitude, T.transit.moon.lon)).toBeLessThanOrEqual(TOL.planetDeg)
    expect(moon.sign).toBe(T.transit.moon.sign)
    expect(angDiff(chart.ascendant.longitude, T.transit.seoulAscendant.lon)).toBeLessThanOrEqual(
      TOL.angleDeg
    )
  })

  it('planetary hours Seoul 2026-11-23', () => {
    const ph = T.planetaryHours
    const signals = planetaryHourExtractor.extract({
      natal: {
        astro: {
          location: {
            latitude: ph.location.lat,
            longitude: ph.location.lon,
            timeZone: ph.location.tz,
          },
        },
      },
      range: {
        start: `${ph.date}T00:00:00.000Z`,
        end: `${ph.date}T00:00:00.000Z`,
        granularity: 'hour',
      },
    } as unknown as ExtractorArg) as Array<{ id: string }>
    const byHour = new Map<number, string>()
    for (const s of signals) {
      const m = /H(\d\d)\.(\w+)$/.exec(s.id)
      if (m) byHour.set(Number(m[1]), m[2])
    }
    for (const pin of ph.pinned) {
      expect(byHour.get(Number(pin.localTime.slice(0, 2))), pin.localTime).toBe(pin.ruler)
    }
  })

  it('void-of-course end Seoul 2026-11-05', async () => {
    const v = T.voidOfCourse
    const signals = (await moonPhaseVocExtractor.extract({
      natal: {
        astro: {
          location: {
            latitude: v.location.lat,
            longitude: v.location.lon,
            timeZone: v.location.tz,
          },
        },
      },
      range: {
        start: '2026-11-01T00:00:00.000Z',
        end: '2026-11-30T00:00:00.000Z',
        granularity: 'day',
      },
      cache: createCache(),
    } as unknown as ExtractorArg)) as Array<{
      kind: string
      active: { start: string; end: string }
    }>
    const voc = signals.find(
      (s) => s.kind === 'void-of-course' && s.active.start.startsWith(v.date)
    )
    expect(voc).toBeDefined()
    // Calendar keys are floating local wall-clock ISO strings (…Z = local time), so the
    // ingress instant is compared in the location's wall clock.
    const wall = new Intl.DateTimeFormat('en-CA', {
      timeZone: v.location.tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(v.ingressUtc))
    const part = (t: string) => wall.find((p) => p.type === t)!.value
    const ingressLocalKey = `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}.000Z`
    const errMin = Math.abs(Date.parse(voc!.active.end) - Date.parse(ingressLocalKey)) / 60_000
    expect(errMin).toBeLessThanOrEqual(v.toleranceMin)
  })

  it('sect by Sun altitude (polar)', async () => {
    const s = T.sect
    const d = new Date(s.input.utc)
    const facts = await collectAstroFacts(
      {
        birthDate: s.input.utc.slice(0, 10),
        birthTime: `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`,
        latitude: s.input.lat,
        longitude: s.input.lon,
        timezone: s.input.timeZone,
        includeHellenistic: true,
      },
      new Date('2026-11-24T00:00:00Z')
    )
    expect(facts?.hellenistic?.sect).toBe(s.sect)
  })

  const zr = T.zodiacalReleasing
  const SIGNS = Object.keys(zr.minorYears) as Array<
    Parameters<typeof calculateZodiacalReleasing>[0]
  >

  it('zodiacal releasing Mars L3 = 37.5 d', () => {
    const l1 = calculateZodiacalReleasing('Capricorn' as (typeof SIGNS)[number], 60)
    const l2 = calculateZRSubPeriods(l1[0])
    // skip the first and last L3 of each L2 (a parent boundary can truncate them)
    const l3 = l2.flatMap((p) => calculateZRSubPeriodsL3(p).slice(1, -1))
    const mars = l3.filter((p) => ['Aries', 'Scorpio'].includes(p.sign))
    expect(mars.length).toBeGreaterThan(0)
    for (const p of mars) expect(p.durationYears * 365.25).toBeCloseTo(zr.marsL3Days, 1)
  })

  it('zodiacal releasing no L3 loosing in L2 < 17 months', () => {
    const offenders: string[] = []
    for (const start of SIGNS) {
      const l1s = calculateZodiacalReleasing(start, 60)
      for (const l1 of l1s.slice(0, -1)) {
        for (const l2 of calculateZRSubPeriods(l1)) {
          const months = l2.durationYears * 12
          if (months >= zr.l3LoosingMinL2Months) continue
          if (calculateZRSubPeriodsL3(l2).some((p) => p.isLoosingOfTheBond))
            offenders.push(`${start}/${l1.sign}/${l2.sign} ${months.toFixed(1)}mo`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
