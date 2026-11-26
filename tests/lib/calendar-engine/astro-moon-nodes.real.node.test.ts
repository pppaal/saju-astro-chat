/**
 * Moon-node conjunction windows on the real ephemeris (independent re-audit NODE-1,
 * stage G7).
 *
 * A node signal covers only consecutive local noons with the True Node within 3° of the
 * natal point. The true node wobbles with a ~2-week period, so near the orb edge it
 * steps out and back in; before the fix the extractor merged every hit of a
 * (node, natal point) key first-to-last and bridged the out-of-orb days.
 *
 * Reference: astronomy-engine's osculating lunar node (h = r × v of GeoMoonState on the
 * true ecliptic of date), independent of Swiss Ephemeris. Local noon comes from Intl.
 *
 * Without native swisseph the block skips locally but fails in CI and in the destiny
 * release gate (tests/helpers/realEphemeris.ts).
 *
 * @vitest-environment node
 */
import { it, expect, vi } from 'vitest'
import * as Astronomy from 'astronomy-engine'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../helpers/realEphemeris')

const { calculateNatalChart, toChart } = await import('@/lib/astrology/foundation/astrologyService')
const { default: astroMoonNodesExtractor } =
  await import('@/lib/calendar-engine/extractors/astro-moon-nodes')
const { createCache } = await import('@/lib/calendar-engine/cache')

type ExtractorArg = Parameters<typeof astroMoonNodesExtractor.extract>[0]

const n360 = (x: number) => ((x % 360) + 360) % 360
const angDiff = (a: number, b: number) => Math.abs(n360(a - b + 180) - 180)

/** Osculating (true) ascending node of the Moon, true ecliptic of date. */
function trueNodeAt(date: Date): number {
  const t = Astronomy.MakeTime(date)
  const st = Astronomy.GeoMoonState(t)
  const rot = Astronomy.Rotation_EQJ_ECT(t)
  const r = Astronomy.RotateVector(rot, new Astronomy.Vector(st.x, st.y, st.z, t))
  const v = Astronomy.RotateVector(rot, new Astronomy.Vector(st.vx, st.vy, st.vz, t))
  const hx = r.y * v.z - r.z * v.y
  const hy = r.z * v.x - r.x * v.z
  return n360((Math.atan2(hx, -hy) * 180) / Math.PI)
}

/** UT instant of 12:00 local wall clock (iterated offset). */
function localNoonUtc(day: string, timeZone: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  const guess = Date.UTC(y, m - 1, d, 12)
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
    const val = (k: string) => Number(p.find((x) => x.type === k)!.value)
    return (
      Date.UTC(
        val('year'),
        val('month') - 1,
        val('day'),
        val('hour'),
        val('minute'),
        val('second')
      ) - ms
    )
  }
  let ms = guess - offsetAt(guess)
  ms = guess - offsetAt(ms)
  return new Date(ms)
}

// Re-audit case: natal 1955-03-02 00:05 F, Pacific/Kiritimati (1.87, −157.4).
const KIRITIMATI = { lat: 1.87, lon: -157.4, tz: 'Pacific/Kiritimati' }

async function natalChart() {
  return toChart(
    await calculateNatalChart({
      year: 1955,
      month: 3,
      date: 2,
      hour: 0,
      minute: 5,
      latitude: KIRITIMATI.lat,
      longitude: KIRITIMATI.lon,
      timeZone: KIRITIMATI.tz,
    })
  )
}

async function nodeSignals(
  chart: Awaited<ReturnType<typeof natalChart>>,
  from: string,
  to: string
) {
  return (await astroMoonNodesExtractor.extract({
    natal: {
      astro: {
        chart,
        location: { latitude: KIRITIMATI.lat, longitude: KIRITIMATI.lon, timeZone: KIRITIMATI.tz },
      },
    },
    range: { start: `${from}T00:00:00.000Z`, end: `${to}T00:00:00.000Z`, granularity: 'day' },
    cache: createCache(),
  } as unknown as ExtractorArg)) as Array<{
    id: string
    name: string
    active: { start: string; peak: string; end: string }
  }>
}

const covering = (signals: Awaited<ReturnType<typeof nodeSignals>>, name: string, day: string) =>
  signals.filter(
    (s) => s.name === name && s.active.start.slice(0, 10) <= day && s.active.end.slice(0, 10) >= day
  )

describeRealEphemeris('moon-node windows split on out-of-orb noons (NODE-1)', () => {
  it('Kiritimati April 2026: North Node ☌ Sun is two runs, nothing on 04-10/04-11', async () => {
    const chart = await natalChart()
    const sun = chart.planets.find((p) => p.name === 'Sun')!
    expect(sun.longitude).toBeCloseTo(341.085, 2)

    const month = await nodeSignals(chart, '2026-04-01', '2026-04-30')
    for (let d = 1; d <= 30; d++) {
      const day = `2026-04-${String(d).padStart(2, '0')}`
      const dist = angDiff(trueNodeAt(localNoonUtc(day, KIRITIMATI.tz)), sun.longitude)
      // Swiss Ephemeris and astronomy-engine agree to ~0.003°: a noon closer than 0.004° to
      // the orb edge (04-09: 2.998°) is beyond what two ephemerides can settle — skip it.
      if (Math.abs(dist - 3) < 0.004) continue
      const hits = covering(month, 'North Node ☌ Sun', day)
      expect(hits.length, `${day} ref ${dist.toFixed(4)}°`).toBe(dist <= 3 ? 1 : 0)
    }
    // The re-audit's out-of-orb noons (3.017° and 3.012° in Swiss Ephemeris).
    expect(covering(month, 'North Node ☌ Sun', '2026-04-10')).toEqual([])
    expect(covering(month, 'North Node ☌ Sun', '2026-04-11')).toEqual([])
    const runs = month
      .filter((s) => s.name === 'North Node ☌ Sun')
      .map((s) => `${s.active.start.slice(0, 10)}..${s.active.end.slice(0, 10)}`)
      .sort()
    expect(runs).toHaveLength(2)
    expect(runs[0].endsWith('..2026-04-09')).toBe(true)
    expect(runs[1]).toBe('2026-04-12..2026-04-15')
  })

  it('the windows do not depend on the build range (1-day builds = month build)', async () => {
    const chart = await natalChart()
    const month = await nodeSignals(chart, '2026-04-01', '2026-04-30')
    for (const day of ['2026-04-01', '2026-04-09', '2026-04-10', '2026-04-13']) {
      const one = await nodeSignals(chart, day, day)
      const pick = (s: Awaited<ReturnType<typeof nodeSignals>>) =>
        covering(s, 'North Node ☌ Sun', day).map(
          (x) => `${x.id}|${x.active.start}|${x.active.peak}|${x.active.end}`
        )
      expect(pick(one), day).toEqual(pick(month))
    }
  })
})
