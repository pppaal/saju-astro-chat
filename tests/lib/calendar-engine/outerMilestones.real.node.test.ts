/**
 * Outer-planet return dates on the real ephemeris (engine audit E5, ASTRO-3).
 *
 * exactDateISO must be the first exact transit of the planet over its natal
 * place, and age the completed years at that instant. The old code fitted a
 * parabola to yearly July-1 samples of |separation| (a V-shaped curve that never
 * changes sign), so Saturn returns came out a median 155 days and up to 334 days
 * off, with the wrong age in 10 of 25 births.
 *
 * Reference: astronomy-engine (independent of Swiss Ephemeris), first zero of
 * the signed separation found by a 5-day scan plus bisection, starting from
 * the same UT birth instant.
 *
 * Stage G6 (re-audit AC-1, AC-5): the Pluto square is searched over a human
 * lifespan (25–100 years — it falls anywhere from the mid-30s to the late 80s),
 * the progressed lunar return is the exact day-for-a-year instant, and every
 * milestone carries its retrograde pass cluster and 1° pass window. The global setup mocks swisseph, so this file
 * unmocks it and runs under node. Without native swisseph it skips locally but
 * fails in CI and in the destiny release gate (tests/helpers/realEphemeris.ts, E16).
 *
 * @vitest-environment node
 */
import { it, expect, vi } from 'vitest'
import * as Astronomy from 'astronomy-engine'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../helpers/realEphemeris')

const { calculateNatalChart, toChart } = await import('@/lib/astrology/foundation/astrologyService')
const { calculateOuterPlanetMilestones } =
  await import('@/lib/calendar-engine/lifecycle/outerMilestones')
const { currentManAge } = await import('@/lib/datetime/currentAge')

type NatalArg = Parameters<typeof calculateOuterPlanetMilestones>[0]

const DAY_MS = 86_400_000
const YEAR_MS = 365.25 * DAY_MS
const SEOUL = { lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' }

// 20 fixed births, 12:00 Seoul, spread over seasons and 1940-2000.
const BIRTHS = [
  '1941-05-03',
  '1944-11-27',
  '1948-02-14',
  '1951-08-30',
  '1953-07-17',
  '1955-12-05',
  '1957-03-20',
  '1960-07-04',
  '1963-10-19',
  '1966-01-08',
  '1969-06-23',
  '1972-09-11',
  '1975-04-28',
  '1978-12-16',
  '1980-01-25',
  '1983-08-02',
  '1986-03-09',
  '1990-10-09',
  '1995-09-13',
  '1999-05-21',
]

const wrap180 = (d: number) => {
  let x = d % 360
  if (x > 180) x -= 360
  if (x <= -180) x += 360
  return x
}

type Body = 'Saturn' | 'Jupiter' | 'Uranus' | 'Neptune' | 'Pluto'

function lonAt(body: Body, ms: number): number {
  return Astronomy.Ecliptic(Astronomy.GeoVector(body as Astronomy.Body, new Date(ms), true)).elon
}

/** First zero of wrap180(λ(t) − λ₀) in [fromMs, toMs]; 5-day scan + bisection. */
function firstExactPass(
  body: 'Saturn' | 'Jupiter',
  natalLon: number,
  fromMs: number,
  toMs: number
) {
  const f = (ms: number) => wrap180(lonAt(body, ms) - natalLon)
  let t0 = fromMs
  let f0 = f(t0)
  for (let t1 = t0 + 5 * DAY_MS; t1 <= toMs; t1 += 5 * DAY_MS) {
    const f1 = f(t1)
    if (Math.sign(f0) !== Math.sign(f1) && Math.abs(f1 - f0) < 10) {
      let lo = t0
      let hi = t1
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2
        if (Math.sign(f(mid)) === Math.sign(f0)) lo = mid
        else hi = mid
      }
      return (lo + hi) / 2
    }
    t0 = t1
    f0 = f1
  }
  throw new Error(`no ${body} pass in window`)
}

async function milestonesFor(date: string, time = '12:00', place = SEOUL) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const input = {
    year,
    month,
    date: day,
    hour,
    minute,
    latitude: place.lat,
    longitude: place.lon,
    timeZone: place.tz,
  }
  const raw = await calculateNatalChart(input)
  const birthMs = (raw.meta!.jdUT - 2440587.5) * DAY_MS
  const natal = {
    input,
    astro: {
      chart: toChart(raw),
      location: { latitude: place.lat, longitude: place.lon, timeZone: place.tz },
    },
  } as unknown as NatalArg
  return { birthMs, year, month, day, milestones: await calculateOuterPlanetMilestones(natal) }
}

/** Every zero of wrap180(λ(t) − λ₀ − angle) in [fromMs, toMs] (5-day scan + bisection). */
function allExactPasses(body: Body, natalLon: number, angle: number, fromMs: number, toMs: number) {
  const f = (ms: number) => wrap180(lonAt(body, ms) - natalLon - angle)
  const out: number[] = []
  let t0 = fromMs
  let f0 = f(t0)
  for (let t1 = t0 + 5 * DAY_MS; t1 <= toMs; t1 += 5 * DAY_MS) {
    const f1 = f(t1)
    if (Math.sign(f0) !== Math.sign(f1) && Math.abs(f1 - f0) < 10) {
      let lo = t0
      let hi = t1
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2
        if (Math.sign(f(mid)) === Math.sign(f0)) lo = mid
        else hi = mid
      }
      out.push((lo + hi) / 2)
    }
    t0 = t1
    f0 = f1
  }
  return out
}

/** Independent progressed lunar return: Moon(birth + T d) = natal Moon, at birth + T × 365.25 d. */
function progressedLunarReturnMs(birthMs: number): number {
  const moon = (ms: number) => Astronomy.EclipticGeoMoon(new Date(ms)).lon
  const natal = moon(birthMs)
  let lo = birthMs + 25 * DAY_MS
  let hi = birthMs + 30 * DAY_MS
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (wrap180(moon(mid) - natal) < 0) lo = mid
    else hi = mid
  }
  return birthMs + ((lo - birthMs) / DAY_MS) * YEAR_MS
}

const TOKYO = { lat: 35.68, lon: 139.69, tz: 'Asia/Tokyo' }
const BERLIN = { lat: 52.52, lon: 13.4, tz: 'Europe/Berlin' }
const NEW_YORK = { lat: 40.71, lon: -74.0, tz: 'America/New_York' }
const CHICAGO = { lat: 41.88, lon: -87.63, tz: 'America/Chicago' }

const CASES: Array<{
  kind: 'saturn_return_1' | 'jupiter_return_2'
  body: 'Saturn' | 'Jupiter'
  window: [number, number]
}> = [
  { kind: 'saturn_return_1', body: 'Saturn', window: [25, 34] },
  { kind: 'jupiter_return_2', body: 'Jupiter', window: [21, 28] },
]

describeRealEphemeris('calculateOuterPlanetMilestones — real ephemeris', () => {
  for (const c of CASES) {
    it(`${c.kind}: |exactDateISO − first exact pass| ≤ 2 d and age = completed years, 20 births`, async () => {
      const misses: string[] = []
      for (const date of BIRTHS) {
        const { birthMs, year, month, day, milestones } = await milestonesFor(date)
        const natalLon = lonAt(c.body, birthMs)
        const ref = firstExactPass(
          c.body,
          natalLon,
          birthMs + c.window[0] * YEAR_MS,
          birthMs + c.window[1] * YEAR_MS
        )
        const refAge = currentManAge({
          birthYear: year,
          birthMonth: month,
          birthDate: day,
          birthTimeZone: SEOUL.tz,
          now: new Date(ref),
        })
        const m = milestones.find((x) => x.kind === c.kind)
        if (!m?.exactDateISO) {
          misses.push(`${date}: no milestone`)
          continue
        }
        // exactDateISO is the Seoul calendar date; compare at Seoul noon
        const gotMs = Date.parse(`${m.exactDateISO}T12:00:00+09:00`)
        const errDays = Math.abs(gotMs - ref) / DAY_MS
        if (errDays > 2) misses.push(`${date}: ${m.exactDateISO} vs ${new Date(ref).toISOString()}`)
        if (m.age !== refAge) misses.push(`${date}: age ${m.age} vs ${refAge}`)
        expect(m.startYear).toBe(Number(m.exactDateISO.slice(0, 4)))
      }
      expect(misses).toEqual([])
    })
  }

  it('the audit repro births: 1980-01-25 → 2009-10, age 29; 1957-03-20 → 1986-12, age 29', async () => {
    const a = (await milestonesFor('1980-01-25')).milestones.find(
      (x) => x.kind === 'saturn_return_1'
    )
    expect(a?.exactDateISO?.slice(0, 7)).toBe('2009-10')
    expect(a?.age).toBe(29)
    const b = (await milestonesFor('1957-03-20')).milestones.find(
      (x) => x.kind === 'saturn_return_1'
    )
    expect(b?.exactDateISO?.slice(0, 7)).toBe('1986-12')
    expect(b?.age).toBe(29)
  })

  // 카이런은 차트 행성 목록에 없는 소행성이라 예전엔 늘 평균 테이블로 떨어졌다(E13 carryover).
  // astronomy-engine 에 카이런이 없어 독립 기준 대신, 그 순간 트랜짓 카이런이 본명 자리에
  // 있는지(swe, seas_18.se1)와 나이 창으로 확인한다.
  it('chiron_return is computed (seas_18.se1): transit Chiron on natal Chiron, age 48–52', async () => {
    const { getSwisseph } = await import('@/lib/astrology/foundation/ephe')
    const sw = getSwisseph()
    const chironLon = (ms: number) => {
      const r = sw.swe_calc_ut(ms / DAY_MS + 2440587.5, sw.SE_CHIRON, sw.SEFLG_SWIEPH)
      if ('error' in r) throw new Error(r.error)
      return r.longitude
    }
    for (const date of ['1953-07-17', '1966-01-08', '1975-04-28']) {
      const { birthMs, milestones } = await milestonesFor(date)
      const m = milestones.find((x) => x.kind === 'chiron_return')
      expect(m?.exactDateISO, date).toBeTruthy()
      expect(m!.age!).toBeGreaterThanOrEqual(48)
      expect(m!.age!).toBeLessThanOrEqual(52)
      const atMs = Date.parse(`${m!.exactDateISO}T12:00:00+09:00`)
      // 카이런 하루 이동은 많아야 ~0.15° — 그 날 정오 기준 0.2° 안.
      expect(Math.abs(wrap180(chironLon(atMs) - chironLon(birthMs))), date).toBeLessThan(0.2)
    }
  })

  // ── G6 · AC-1: the Pluto square over a whole lifespan, every pass in the 1° window ──
  // Pluto's eccentric orbit puts the waxing square anywhere from the mid-30s (1965–75 births)
  // to the late 80s (2050 births). The old [30, 50] search window missed births from ~2000 on
  // and before ~1926, and Life fell back to the mean table (age 36).
  for (const date of ['1930-06-15', '1965-08-20', '2000-01-03', '2030-10-01']) {
    it(`pluto_square_pluto ${date}: first pass, all passes and the 1° window vs an independent scan`, async () => {
      const { birthMs, year, month, day, milestones } = await milestonesFor(date)
      const natalLon = lonAt('Pluto', birthMs)
      const passes = allExactPasses(
        'Pluto',
        natalLon,
        90,
        birthMs + 20 * YEAR_MS,
        birthMs + 100 * YEAR_MS
      )
      expect(passes.length).toBeGreaterThan(0)
      const m = milestones.find((x) => x.kind === 'pluto_square_pluto')!
      expect(m, date).toBeDefined()
      // first exact pass (date at Seoul noon, within 2 days)
      expect(Math.abs(Date.parse(m.exactAt) - passes[0]) / DAY_MS).toBeLessThan(2)
      expect(m.age).toBe(
        currentManAge({
          birthYear: year,
          birthMonth: month,
          birthDate: day,
          birthTimeZone: SEOUL.tz,
          now: new Date(passes[0]),
        })
      )
      // the retrograde cluster: same pass count, every pass inside the window
      const cluster = passes.filter((p) => p - passes[0] < 4 * YEAR_MS)
      expect(m.passCount).toBe(cluster.length)
      expect(
        Math.abs(Date.parse(m.lastExactAt) - cluster[cluster.length - 1]) / DAY_MS
      ).toBeLessThan(2)
      const w0 = Date.parse(m.window.start)
      const w1 = Date.parse(m.window.end)
      for (const p of cluster) {
        expect(p).toBeGreaterThan(w0)
        expect(p).toBeLessThan(w1)
      }
      // window edges sit at the 1° orb on the independent ephemeris
      const err = (ms: number) => Math.abs(wrap180(lonAt('Pluto', ms) - natalLon - 90))
      expect(err(w0)).toBeCloseTo(1, 1)
      expect(err(w1)).toBeCloseTo(1, 1)
    })
  }

  it('AC-1 golden: 2002-01-03 12:00 Tokyo → Pluto square 2055-04-09 (Tokyo date), age 53', async () => {
    const { milestones } = await milestonesFor('2002-01-03', '12:00', TOKYO)
    const m = milestones.find((x) => x.kind === 'pluto_square_pluto')!
    expect(m.exactDateISO).toBe('2055-04-09')
    expect(m.startYear).toBe(2055)
    expect(m.age).toBe(53)
  })

  it('Uranus opposition and Neptune square: every pass inside the 1° window, 6 births 1900–2050', async () => {
    const cases: Array<[string, Body, number, 'uranus_opposition' | 'neptune_square']> = []
    for (const date of [
      '1903-02-11',
      '1931-07-30',
      '1958-12-02',
      '1987-04-19',
      '2016-09-08',
      '2049-11-27',
    ]) {
      cases.push(
        [date, 'Uranus', 180, 'uranus_opposition'],
        [date, 'Neptune', 90, 'neptune_square']
      )
    }
    const misses: string[] = []
    for (const [date, body, angle, kind] of cases) {
      const { birthMs, milestones } = await milestonesFor(date)
      const natalLon = lonAt(body, birthMs)
      const passes = allExactPasses(
        body,
        natalLon,
        angle,
        birthMs + 30 * YEAR_MS,
        birthMs + 55 * YEAR_MS
      )
      const m = milestones.find((x) => x.kind === kind)
      if (!m) {
        misses.push(`${date} ${kind}: missing`)
        continue
      }
      // first pass: the engine's instant is exact on the independent ephemeris (robust near stations)
      const sep = Math.abs(wrap180(lonAt(body, Date.parse(m.exactAt)) - natalLon - angle))
      if (sep > 0.01) misses.push(`${date} ${kind}: ${sep.toFixed(4)}° off at exactAt`)
      const cluster = passes.filter((p) => p - passes[0] < 3 * YEAR_MS)
      if (m.passCount !== cluster.length)
        misses.push(`${date} ${kind}: ${m.passCount} vs ${cluster.length} passes`)
      const w0 = Date.parse(m.window.start) - DAY_MS
      const w1 = Date.parse(m.window.end) + DAY_MS
      if (!cluster.every((p) => p >= w0 && p <= w1))
        misses.push(`${date} ${kind}: pass outside window`)
    }
    expect(misses).toEqual([])
  })

  // ── G6 · AC-5: progressed lunar return = birth + T × 365.25 d (T ≈ 27.2–27.5 d) ──
  // birthYear + 27 was a year early for births from about late August on.
  const PROG: Array<[string, string, typeof SEOUL, number]> = [
    ['1990-03-10', '08:00', NEW_YORK, 2017], // before late August → birthYear + 27
    ['1978-12-27', '10:00', SEOUL, 2006], // after → birthYear + 28
    ['1984-09-23', '21:44', BERLIN, 2012],
    ['1994-12-28', '20:02', CHICAGO, 2022],
  ]
  for (const [date, time, place, year] of PROG) {
    it(`progressed_lunar_1 ${date} ${time} ${place.tz}: year ${year}, age 27, vs an independent bisection`, async () => {
      const { birthMs, milestones } = await milestonesFor(date, time, place)
      const m = milestones.find((x) => x.kind === 'progressed_lunar_1')!
      expect(m, date).toBeDefined()
      const ref = progressedLunarReturnMs(birthMs)
      // one minute of progressed time is ~6 hours of real time — allow half a day
      expect(Math.abs(Date.parse(m.exactAt) - ref) / DAY_MS).toBeLessThan(0.5)
      expect(m.startYear).toBe(year)
      expect(m.age).toBe(27)
      expect(m.passCount).toBe(1)
      expect(Date.parse(m.window.start)).toBeLessThan(Date.parse(m.exactAt))
      expect(Date.parse(m.window.end)).toBeGreaterThan(Date.parse(m.exactAt))
    })
  }
})
