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
 * the same UT birth instant. The global setup mocks swisseph, so this file
 * unmocks it and runs under node; it is skipped where the native module cannot
 * load (E16).
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'
import * as Astronomy from 'astronomy-engine'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const swissephAvailable = await import('swisseph').then(
  () => true,
  () => false
)

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

function lonAt(body: 'Saturn' | 'Jupiter', ms: number): number {
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

async function milestonesFor(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const input = {
    year,
    month,
    date: day,
    hour: 12,
    minute: 0,
    latitude: SEOUL.lat,
    longitude: SEOUL.lon,
    timeZone: SEOUL.tz,
  }
  const raw = await calculateNatalChart(input)
  const birthMs = (raw.meta!.jdUT - 2440587.5) * DAY_MS
  const natal = {
    input,
    astro: {
      chart: toChart(raw),
      location: { latitude: SEOUL.lat, longitude: SEOUL.lon, timeZone: SEOUL.tz },
    },
  } as unknown as NatalArg
  return { birthMs, year, month, day, milestones: await calculateOuterPlanetMilestones(natal) }
}

const CASES: Array<{
  kind: 'saturn_return_1' | 'jupiter_return_2'
  body: 'Saturn' | 'Jupiter'
  window: [number, number]
}> = [
  { kind: 'saturn_return_1', body: 'Saturn', window: [25, 34] },
  { kind: 'jupiter_return_2', body: 'Jupiter', window: [21, 28] },
]

describe.skipIf(!swissephAvailable)('calculateOuterPlanetMilestones — real ephemeris', () => {
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
})
