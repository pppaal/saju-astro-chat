/**
 * Astrology consistency on the real ephemeris (engine audit E13).
 *
 *  - ASTRO-5  planetary day starts at the real sunrise (swe_rise_trans); hours before
 *             sunrise belong to the previous day's night and that day's ruler.
 *  - ASTRO-8  classifyAspects counts each unordered pair of distinct planets once, so the
 *             electional extractor can reach its threshold.
 *  - ASTRO-10 sect = the Sun above the horizon (true altitude), not the house number.
 *  - ASTRO-11 the void-of-course window ends at the Moon's ingress (floating local key);
 *             a VoC from the day before reaches into the next day in every build range.
 *  - ASTRO-13 transit→natal applying uses the transit speed only.
 *  - ASTRO-12 the ephemeris source check sees SEFLG_SWIEPH with the real files.
 *
 * References come from astronomy-engine (an independent ephemeris) or from the real orb
 * trend, never from engine output. The global test setup mocks swisseph, so this file
 * unmocks it and runs under node; it is skipped where the native module cannot load (E16).
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'
import * as Astronomy from 'astronomy-engine'
import golden from '../../../golden/engine-golden.json'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const swissephAvailable = await import('swisseph').then(
  () => true,
  () => false
)

const { calculateNatalChart, toChart } = await import('@/lib/astrology/foundation/astrologyService')
const { calculateTransitChart } = await import('@/lib/astrology/foundation/transit')
const { findAspects } = await import('@/lib/astrology/foundation/aspects')
const { classifyAspects, planetaryDayFrame, planetaryHourInFrame } =
  await import('@/lib/astrology/foundation/electional')
const { sunTrueAltitude, isDiurnalChart } = await import('@/lib/astrology/foundation/extraPoints')
const { getSwisseph, checkEphemerisSource } = await import('@/lib/astrology/foundation/ephe')
const { default: astroElectionalExtractor } =
  await import('@/lib/calendar-engine/extractors/astro-electional')
const { default: astroPlanetaryHourExtractor } =
  await import('@/lib/calendar-engine/extractors/astro-planetary-hour')
const { default: astroMoonPhaseVocExtractor } =
  await import('@/lib/calendar-engine/extractors/astro-moon-phase-voc')
const { createCache } = await import('@/lib/calendar-engine/cache')

type ExtractorArg = Parameters<typeof astroElectionalExtractor.extract>[0]
type Sig = { id: string; kind: string; active: { start: string; end: string } }

const SEOUL = { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }
const DAY_MS = 86_400_000
const jdOf = (ms: number) => ms / DAY_MS + 2440587.5
const angDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

function ctx(
  location: { latitude: number; longitude: number; timeZone: string },
  start: string,
  end: string
): ExtractorArg {
  return {
    natal: { astro: { location } },
    range: { start, end, granularity: 'day' },
    cache: createCache(),
  } as unknown as ExtractorArg
}

/** Seeded LCG — the fixtures are deterministic. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

describe.skipIf(!swissephAvailable)('planetary day — real sunrise (ASTRO-5)', () => {
  const PH = golden.timing.planetaryHours

  it('the Seoul 2026-11-23 frame matches the astronomy-engine sunrise and sunset', () => {
    const f = planetaryDayFrame(PH.date, PH.location.lat, PH.location.lon, PH.location.tz)!
    expect(f).not.toBeNull()
    expect(Math.abs(f.sunrise - Date.parse(PH.sunriseUtc)) / 60_000).toBeLessThan(1)
    expect(Math.abs(f.sunset - Date.parse(PH.sunsetUtc)) / 60_000).toBeLessThan(1)
    expect(f.prevSunset).toBeLessThan(f.sunrise)
    expect(f.nextSunrise).toBeGreaterThan(f.sunset)
    expect(f.dayOfWeek).toBe(1) // Monday
  })

  it('every half-past hour on 2026-11-23 has the astronomy-engine ruler', () => {
    const signals = astroPlanetaryHourExtractor.extract(
      ctx(SEOUL, `${PH.date}T00:00:00.000Z`, `${PH.date}T00:00:00.000Z`)
    ) as Sig[]
    const byHour = new Map<number, string>()
    for (const s of signals) {
      const m = /H(\d\d)\.(\w+)$/.exec(s.id)
      if (m) byHour.set(Number(m[1]), m[2])
    }
    for (const { localHour, rulerAtHalfPast } of PH.hours) {
      // Mercury hours carry polarity 0 and are not emitted.
      if (rulerAtHalfPast === 'Mercury') expect(byHour.has(localHour)).toBe(false)
      else expect(byHour.get(localHour), `${localHour}:30`).toBe(rulerAtHalfPast)
    }
  })

  it('hours before sunrise belong to the previous planetary day (Sunday night on Monday)', () => {
    const f = planetaryDayFrame(PH.date, PH.location.lat, PH.location.lon, PH.location.tz)!
    const slot = planetaryHourInFrame(f.sunrise - 60_000, f)!
    expect(slot.dayRuler).toBe('Sun')
    expect(slot.isDay).toBe(false)
    expect(slot.hourIndex).toBe(23)
    expect(planetaryHourInFrame(f.sunrise + 60_000, f)!.planet).toBe('Moon')
  })

  it('DST transition days use the wall-clock hour of the day (New York 2026-03-08, 11-01)', async () => {
    const { resolveBirthInstant } = await import('@/lib/datetime/resolveBirthInstant')
    const ny = { latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }
    for (const day of ['2026-03-08', '2026-11-01', '2026-07-15']) {
      const f = planetaryDayFrame(day, ny.latitude, ny.longitude, ny.timeZone)!
      const signals = astroPlanetaryHourExtractor.extract(
        ctx(ny, `${day}T00:00:00.000Z`, `${day}T00:00:00.000Z`)
      ) as Sig[]
      const byHour = new Map<number, string>()
      for (const s of signals) {
        const m = /H(\d\d)\.(\w+)$/.exec(s.id)
        if (m) byHour.set(Number(m[1]), m[2])
      }
      const [y, mo, d] = day.split('-').map(Number)
      for (let h = 0; h < 24; h++) {
        const ms = resolveBirthInstant(
          { year: y, month: mo, day: d, hour: h, minute: 30 },
          ny.timeZone
        ).utc.getTime()
        const planet = planetaryHourInFrame(ms, f)!.planet
        if (planet === 'Mercury') expect(byHour.has(h)).toBe(false)
        else expect(byHour.get(h), `${day} ${h}:30`).toBe(planet)
      }
    }
  })

  it('polar night and polar day have no planetary hours', () => {
    const tromso = { latitude: 69.65, longitude: 18.96, timeZone: 'Europe/Oslo' }
    expect(
      planetaryDayFrame('2026-12-21', tromso.latitude, tromso.longitude, tromso.timeZone)
    ).toBe(null)
    expect(
      planetaryDayFrame('2026-06-21', tromso.latitude, tromso.longitude, tromso.timeZone)
    ).toBe(null)
    const signals = astroPlanetaryHourExtractor.extract(
      ctx(tromso, '2026-12-21T00:00:00.000Z', '2026-12-21T00:00:00.000Z')
    ) as Sig[]
    expect(signals).toEqual([])
  })
})

describe.skipIf(!swissephAvailable)('electional — unordered distinct pairs (ASTRO-8)', () => {
  it('classifyAspects never self-aspects and never lists a pair twice', async () => {
    for (let d = 0; d < 365; d += 7) {
      const day = new Date(Date.UTC(2026, 0, 1) + d * DAY_MS).toISOString().slice(0, 10)
      const chart = await calculateTransitChart({ iso: `${day}T12:00:00`, ...SEOUL })
      const { benefic, malefic } = classifyAspects(chart)
      const seen = new Set<string>()
      for (const line of [...new Set([...benefic, ...malefic])]) {
        const [a, type, ...rest] = line.split(' ')
        const b = rest.join(' ')
        expect(a, `${day} ${line}`).not.toBe(b)
        const key = [a, b].sort().join('|') + `|${type}`
        expect(seen.has(key), `${day} mirrored ${line}`).toBe(false)
        seen.add(key)
      }
    }
  })

  it('astro-electional emits signals over 2026 in Seoul (threshold 70 is reachable)', async () => {
    const signals = (await astroElectionalExtractor.extract(
      ctx(SEOUL, '2026-01-01T00:00:00.000Z', '2026-12-31T23:59:59.999Z')
    )) as Sig[]
    expect(signals.length).toBeGreaterThan(0)
    for (const s of signals) expect(s.kind).toBe('electional')
  }, 120_000)
})

describe.skipIf(!swissephAvailable)('sect by the Sun altitude (ASTRO-10)', () => {
  /** astronomy-engine geometric altitude of the Sun (no refraction). */
  function referenceAltitude(ms: number, lat: number, lon: number): number {
    const obs = new Astronomy.Observer(lat, lon, 0)
    const time = Astronomy.MakeTime(new Date(ms))
    const eq = Astronomy.Equator(Astronomy.Body.Sun, time, obs, true, true)
    return Astronomy.Horizon(time, obs, eq.ra, eq.dec).altitude
  }

  it('matches the sign of the astronomy-engine altitude for 100 polar charts', () => {
    const rnd = rng(20261125)
    let checked = 0
    while (checked < 100) {
      const ms = Date.UTC(1920, 0, 1) + Math.floor(rnd() * 100 * 365.25) * DAY_MS + rnd() * DAY_MS
      const lat = (rnd() < 0.5 ? -1 : 1) * (66.6 + rnd() * 8.4)
      const lon = -180 + rnd() * 360
      const ref = referenceAltitude(ms, lat, lon)
      if (Math.abs(ref) < 0.05) continue // grazing the horizon — below both ephemerides' noise
      const alt = sunTrueAltitude(jdOf(ms), lat, lon)
      expect(alt).not.toBeNull()
      expect(Math.abs(alt! - ref), `${new Date(ms).toISOString()} ${lat} ${lon}`).toBeLessThan(0.05)
      expect(isDiurnalChart({ jdUT: jdOf(ms), latitude: lat, longitude: lon })).toBe(ref > 0)
      checked++
    }
  })

  it('equals the house rule (Sun in houses 7–12) at non-polar latitudes', async () => {
    const rnd = rng(7)
    let checked = 0
    while (checked < 40) {
      const year = 1950 + Math.floor(rnd() * 60)
      const month = 1 + Math.floor(rnd() * 12)
      const date = 1 + Math.floor(rnd() * 28)
      const hour = Math.floor(rnd() * 24)
      const minute = Math.floor(rnd() * 60)
      const latitude = -55 + rnd() * 110
      const longitude = -180 + rnd() * 360
      const natal = await calculateNatalChart({
        year,
        month,
        date,
        hour,
        minute,
        latitude,
        longitude,
        timeZone: 'UTC',
      })
      const alt = sunTrueAltitude(natal.meta!.jdUT, latitude, longitude)!
      if (Math.abs(alt) < 0.05) continue
      const sun = natal.planets.find((p) => p.name === 'Sun')!
      expect(alt > 0, `${year}-${month}-${date} ${hour}:${minute} ${latitude}`).toBe(sun.house >= 7)
      checked++
    }
  })

  it('the polar golden chart (Sun in house 7 by Whole Sign, altitude −7°) is a night chart', async () => {
    const s = golden.timing.sect
    const d = new Date(s.input.utc)
    const natal = await calculateNatalChart({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      date: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      latitude: s.input.lat,
      longitude: s.input.lon,
      timeZone: s.input.timeZone,
    })
    const sun = natal.planets.find((p) => p.name === 'Sun')!
    expect(sun.house).toBeGreaterThanOrEqual(7) // the house rule would say "day"
    expect(sunTrueAltitude(natal.meta!.jdUT, s.input.lat, s.input.lon)!).toBeCloseTo(
      s.sunAltitude,
      1
    )
    expect(
      isDiurnalChart({ jdUT: natal.meta!.jdUT, latitude: s.input.lat, longitude: s.input.lon })
    ).toBe(false)
  })
})

describe.skipIf(!swissephAvailable)('void-of-course window (ASTRO-11)', () => {
  it('a VoC that ends after midnight is in every later day’s one-day build it reaches', async () => {
    // December 2026 (Seoul): the 12-11 noon VoC runs to 12-13 01:02, past two midnights.
    const month = (await astroMoonPhaseVocExtractor.extract(
      ctx(SEOUL, '2026-12-01T00:00:00.000Z', '2026-12-31T23:59:59.999Z')
    )) as Sig[]
    const crossing = month.filter(
      (s) => s.kind === 'void-of-course' && s.active.end.slice(0, 10) > s.active.start.slice(0, 10)
    )
    expect(crossing.length).toBeGreaterThan(0)
    expect(crossing.some((s) => s.id === 'astro.voc.2026-12-11')).toBe(true)
    for (const voc of crossing) {
      const endDay = voc.active.end.slice(0, 10)
      for (
        let day = new Date(Date.parse(voc.active.start) + DAY_MS).toISOString().slice(0, 10);
        day <= endDay && day <= '2026-12-31';
        day = new Date(Date.parse(`${day}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10)
      ) {
        const one = (await astroMoonPhaseVocExtractor.extract(
          ctx(SEOUL, `${day}T00:00:00.000Z`, `${day}T23:59:59.999Z`)
        )) as Sig[]
        expect(
          one.find((s) => s.id === voc.id),
          `${voc.id} → ${day}`
        ).toEqual(voc)
      }
    }
  }, 60_000)
})

describe.skipIf(!swissephAvailable)('transit→natal applying (ASTRO-13)', () => {
  it('the applying flag matches the real orb trend for ≥99% of hits', async () => {
    const rnd = rng(13)
    const DESIRED: Record<string, number> = {
      conjunction: 0,
      sextile: 60,
      square: 90,
      trine: 120,
      opposition: 180,
    }
    let total = 0
    let agree = 0
    for (let i = 0; i < 60; i++) {
      const natal = toChart(
        await calculateNatalChart({
          year: 1950 + Math.floor(rnd() * 60),
          month: 1 + Math.floor(rnd() * 12),
          date: 1 + Math.floor(rnd() * 28),
          hour: Math.floor(rnd() * 24),
          minute: Math.floor(rnd() * 60),
          ...SEOUL,
        })
      )
      const ms =
        Date.UTC(2020, 0, 1) + Math.floor(rnd() * 3650) * DAY_MS + Math.floor(rnd() * 24) * 3600_000
      const at = (t: number) => calculateTransitChart({ iso: new Date(t).toISOString(), ...SEOUL })
      const now = await at(ms)
      const later = await at(ms + 3600_000)
      for (const h of findAspects(natal, now)) {
        if (h.to.name === 'Ascendant' || h.to.name === 'MC') continue
        const t1 = later.planets.find((p) => p.name === h.from.name)!
        const target = DESIRED[h.type]
        const orb0 = Math.abs(angDiff(h.from.longitude, h.to.longitude) - target)
        const orb1 = Math.abs(angDiff(t1.longitude, h.to.longitude) - target)
        if (Math.abs(orb1 - orb0) < 1e-9) continue // stationary — no trend to compare
        total++
        if (h.applying === orb1 < orb0) agree++
      }
    }
    expect(total).toBeGreaterThan(500)
    expect(agree / total).toBeGreaterThanOrEqual(0.99)
  }, 120_000)
})

describe.skipIf(!swissephAvailable)('ephemeris source check (ASTRO-12)', () => {
  it('the bundled files are in use: Sun has SEFLG_SWIEPH and Chiron computes', () => {
    const sw = getSwisseph()
    const r = checkEphemerisSource(sw, 'public/ephe')
    expect(r).toMatchObject({ planets: true, asteroids: true, unchecked: false })
    const sun = sw.swe_calc_ut(2451545.0, sw.SE_SUN, sw.SEFLG_SWIEPH)
    expect('rflag' in sun && (sun.rflag & sw.SEFLG_SWIEPH) !== 0).toBe(true)
  })

  it('a bad ephemeris path is reported (Moshier fallback, no Chiron)', async () => {
    const sw = getSwisseph()
    const { logger } = await import('@/lib/logger')
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => {})
    try {
      sw.swe_set_ephe_path('/nonexistent-ephe-path')
      const r = checkEphemerisSource(sw, '/nonexistent-ephe-path')
      expect(r.planets).toBe(false)
      expect(r.asteroids).toBe(false)
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[ephe]'),
        expect.objectContaining({ planets: false, asteroids: false })
      )
    } finally {
      spy.mockRestore()
      sw.swe_set_ephe_path(process.env.EPHE_PATH || `${process.cwd()}/public/ephe`)
    }
    expect(checkEphemerisSource(sw, 'public/ephe').planets).toBe(true)
  })
})
