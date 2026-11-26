/**
 * Void-of-course Moon on the real ephemeris against an independent scan
 * (independent re-audit AC-4, stage G7).
 *
 * Doctrine (docs/doctrine/astrology.md): at the chart instant the Moon is void when
 * it perfects no Ptolemaic aspect (0/60/90/120/180) to a planet, Sun through Pluto,
 * before its real sign ingress. The nodes are not planets. Positions move with time,
 * and the void ends at the real ingress.
 *
 * Reference: astronomy-engine (independent of Swiss Ephemeris). Apparent geocentric
 * longitudes on the true ecliptic of date (Rotation_EQJ_ECT), an hourly scan of every
 * Moon−planet separation for sign changes, and bisection for the ingress. Local noon
 * comes from Intl, never from engine code.
 *
 * Before the fix the engine counted the True Node as an aspect target and froze the
 * planets at noon (Seoul 2026-11-03 came out "active" because of a node opposition),
 * and the end was a linear extrapolation up to 44 minutes off the ingress.
 *
 * Without native swisseph the blocks skip locally but fail in CI and in the destiny
 * release gate (tests/helpers/realEphemeris.ts).
 *
 * @vitest-environment node
 */
import { it, expect, vi } from 'vitest'
import * as Astronomy from 'astronomy-engine'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../../helpers/realEphemeris')

const { checkVoidOfCourse } = await import('@/lib/astrology/foundation/electional')
const { calculateTransitChart } = await import('@/lib/astrology/foundation/transit')
const { default: astroMoonPhaseVocExtractor } =
  await import('@/lib/calendar-engine/extractors/astro-moon-phase-voc')
const { createCache } = await import('@/lib/calendar-engine/cache')

type ExtractorArg = Parameters<typeof astroMoonPhaseVocExtractor.extract>[0]

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

const n360 = (x: number) => ((x % 360) + 360) % 360
const wrap180 = (x: number) => n360(x + 180) - 180

const PLANETS = [
  Astronomy.Body.Sun,
  Astronomy.Body.Mercury,
  Astronomy.Body.Venus,
  Astronomy.Body.Mars,
  Astronomy.Body.Jupiter,
  Astronomy.Body.Saturn,
  Astronomy.Body.Uranus,
  Astronomy.Body.Neptune,
  Astronomy.Body.Pluto,
]
/** Moon − planet separations at which a Ptolemaic aspect is exact. */
const ASPECT_POINTS = [0, 60, 90, 120, 180, 240, 270, 300]

function lonAt(body: Astronomy.Body, ms: number): number {
  const t = Astronomy.MakeTime(new Date(ms))
  const vec =
    body === Astronomy.Body.Moon ? Astronomy.GeoMoon(t) : Astronomy.GeoVector(body, t, true)
  return Astronomy.SphereFromVector(Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECT(t), vec)).lon
}

/** UT instant of a wall-clock time in an IANA zone (iterated offset). */
function wallToUtc(day: string, hh: number, timeZone: string): number {
  const [y, m, d] = day.split('-').map(Number)
  const guess = Date.UTC(y, m - 1, d, hh)
  const offsetAt = (ms: number) => {
    const p = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(ms))
    const v = (t: string) => Number(p.find((x) => x.type === t)!.value)
    return Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'), v('second')) - ms
  }
  let ms = guess - offsetAt(guess)
  ms = guess - offsetAt(ms)
  return ms
}

/** The calendar's floating local key for a UT instant (local wall clock written as Z). */
function floatingKey(ms: number, timeZone: string): number {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ms))
  const v = (t: string) => Number(p.find((x) => x.type === t)!.value)
  return Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'), v('second'))
}

/** First Moon sign ingress after `fromMs` (bisection on the Moon's longitude, 1 s). */
function ingressAfter(fromMs: number): number {
  const signStart = Math.floor(lonAt(Astronomy.Body.Moon, fromMs) / 30) * 30
  const progress = (ms: number) => n360(lonAt(Astronomy.Body.Moon, ms) - signStart)
  let lo = fromMs
  let hi = fromMs + 3 * DAY_MS
  while (hi - lo > 1000) {
    const mid = (lo + hi) / 2
    if (progress(mid) >= 30 && progress(mid) < 180) hi = mid
    else lo = mid
  }
  return hi
}

/** Every exact Moon−planet aspect in (fromMs, toMs): hourly sign-change scan + bisection. */
function aspectsBetween(fromMs: number, toMs: number): { planet: string; at: number }[] {
  const grid: number[] = []
  for (let t = fromMs; t < toMs; t += HOUR_MS) grid.push(t)
  grid.push(toMs)
  const moon = grid.map((t) => lonAt(Astronomy.Body.Moon, t))
  const out: { planet: string; at: number }[] = []
  for (const body of PLANETS) {
    const planet = grid.map((t) => lonAt(body, t))
    for (const a of ASPECT_POINTS) {
      const f = (ms: number) => wrap180(lonAt(Astronomy.Body.Moon, ms) - lonAt(body, ms) - a)
      for (let i = 0; i + 1 < grid.length; i++) {
        const f0 = wrap180(moon[i] - planet[i] - a)
        const f1 = wrap180(moon[i + 1] - planet[i + 1] - a)
        if (!(f0 < 0 && f1 >= 0 && f1 - f0 < 30)) continue
        let lo = grid[i]
        let hi = grid[i + 1]
        while (hi - lo > 1000) {
          const mid = (lo + hi) / 2
          if (f(mid) < 0) lo = mid
          else hi = mid
        }
        out.push({ planet: body, at: hi })
      }
    }
  }
  return out
}

function daysOf(month: string): string[] {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return Array.from({ length: last }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
}

async function vocSignals(
  place: { lat: number; lon: number; tz: string },
  start: string,
  end: string
) {
  return (await astroMoonPhaseVocExtractor.extract({
    natal: {
      astro: { location: { latitude: place.lat, longitude: place.lon, timeZone: place.tz } },
    },
    range: { start: `${start}T00:00:00.000Z`, end: `${end}T00:00:00.000Z`, granularity: 'day' },
    cache: createCache(),
  } as unknown as ExtractorArg)) as Array<{
    id: string
    kind: string
    active: { start: string; end: string }
  }>
}

const SEOUL = { lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' }
const SYDNEY = { lat: -33.87, lon: 151.2, tz: 'Australia/Sydney' }

describeRealEphemeris('void-of-course Moon — real ephemeris vs an independent scan (AC-4)', () => {
  it('Seoul 2026-11-03 local noon is void: a True Node opposition is not an aspect', async () => {
    const noon = wallToUtc('2026-11-03', 12, SEOUL.tz)
    const ingress = ingressAfter(noon)
    // Reference: no planet aspect perfects before the 08:27:39Z ingress.
    expect(aspectsBetween(noon, ingress)).toEqual([])
    expect(Math.abs(ingress - Date.parse('2026-11-03T08:27:39Z'))).toBeLessThan(5_000)

    const chart = await calculateTransitChart({
      iso: '2026-11-03T12:00:00',
      latitude: SEOUL.lat,
      longitude: SEOUL.lon,
      timeZone: SEOUL.tz,
    })
    expect(chart.planets.some((p) => p.name === 'True Node')).toBe(true)
    const voc = checkVoidOfCourse(chart)
    expect(voc.isVoid).toBe(true)
    expect(voc.lastAspect).toBeNull()
    expect(Math.abs(voc.voidEndTime!.getTime() - ingress)).toBeLessThan(60_000)

    const signals = await vocSignals(SEOUL, '2026-11-01', '2026-11-06')
    expect(signals.some((s) => s.id === 'astro.voc.2026-11-03')).toBe(true)
  })

  it('Sydney 2026-08-14 ends at the real ingress 2026-08-15T14:19:39Z, not a linear extrapolation', async () => {
    const signals = await vocSignals(SYDNEY, '2026-08-14', '2026-08-14')
    const voc = signals.find((s) => s.id === 'astro.voc.2026-08-14')
    expect(voc).toBeDefined()
    const ingress = ingressAfter(wallToUtc('2026-08-14', 12, SYDNEY.tz))
    expect(Math.abs(ingress - Date.parse('2026-08-15T14:19:39Z'))).toBeLessThan(5_000)
    // Floating local key: 2026-08-16 00:19:39 Sydney (the old linear end was 08-15 23:35).
    const errMin = Math.abs(Date.parse(voc!.active.end) - floatingKey(ingress, SYDNEY.tz)) / 60_000
    expect(errMin).toBeLessThan(2)
    expect(voc!.active.end.slice(0, 10)).toBe('2026-08-16')
  })

  it('every local noon of Jul–Nov 2026 in Seoul and Sydney matches the reference, with the end at the ingress', async () => {
    let checked = 0
    let voidDays = 0
    for (const place of [SEOUL, SYDNEY]) {
      for (const month of ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11']) {
        const days = daysOf(month)
        const signals = await vocSignals(place, days[0], days[days.length - 1])
        for (const day of days) {
          const noon = wallToUtc(day, 12, place.tz)
          const ingress = ingressAfter(noon)
          const aspects = aspectsBetween(noon, ingress)
          // A perfection within 3 minutes of the noon instant or of the ingress is beyond
          // what two independent ephemerides can settle — skip those days.
          if (aspects.some((a) => a.at - noon < 180_000 || ingress - a.at < 180_000)) continue
          checked++
          const refVoid = aspects.length === 0
          const sig = signals.find((s) => s.id === `astro.voc.${day}`)
          expect(Boolean(sig), `${place.tz} ${day}`).toBe(refVoid)
          if (sig) {
            voidDays++
            const errMin =
              Math.abs(Date.parse(sig.active.end) - floatingKey(ingress, place.tz)) / 60_000
            expect(errMin, `${place.tz} ${day} end`).toBeLessThan(1)
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(290)
    // About one local noon in five is void.
    expect(voidDays).toBeGreaterThan(40)
  })
})
