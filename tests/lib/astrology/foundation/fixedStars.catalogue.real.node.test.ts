/**
 * Fixed-star positions against the star catalogue (independent re-audit STAR-1/STAR-2,
 * stage G7).
 *
 * Every FIXED_STARS longitude is checked against an independent computation: the
 * Swiss Ephemeris star catalogue that ships with the swisseph package (sefstars.txt,
 * Hipparcos/SIMBAD ICRS RA/Dec at J2000) rotated to the ecliptic with astronomy-engine.
 * Before the fix Castor and Pollux sat 30° too high (20°/23° Leo), Alioth ~10° too
 * high, and a dozen others 0.07–0.4° off because arc-minutes had been written as
 * decimals (24°14′ → .14). Calendar Sun–Castor/Pollux contacts then landed a month late.
 *
 * The calendar side (real ephemeris) checks that the extractor fires on the days the
 * sky says, and only for transiting bodies: the transit Ascendant/MC are not stars'
 * partners (STAR-2).
 *
 * The catalogue block needs no ephemeris. The extractor block skips locally without
 * native swisseph but fails in CI and in the destiny release gate
 * (tests/helpers/realEphemeris.ts).
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import * as Astronomy from 'astronomy-engine'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../../helpers/realEphemeris')

const { getAllFixedStars, correctForPrecession } =
  await import('@/lib/astrology/foundation/fixedStars')
const { default: astroFixedStarExtractor } =
  await import('@/lib/calendar-engine/extractors/astro-fixed-star')
const { createCache } = await import('@/lib/calendar-engine/cache')

type ExtractorArg = Parameters<typeof astroFixedStarExtractor.extract>[0]

/** Table name → catalogue designation (sefstars.txt column 2). */
const DESIGNATION: Record<string, string> = {
  Regulus: 'alLeo',
  Aldebaran: 'alTau',
  Antares: 'alSco',
  Fomalhaut: 'alPsA',
  Sirius: 'alCMa',
  Canopus: 'alCar',
  Arcturus: 'alBoo',
  Vega: 'alLyr',
  Capella: 'alAur',
  Rigel: 'beOri',
  Procyon: 'alCMi',
  Betelgeuse: 'alOri',
  Altair: 'alAql',
  Spica: 'alVir',
  Vindemiatrix: 'epVir',
  Algol: 'bePer',
  Alcyone: 'etTau',
  Hyades: 'gaTau', // Prima Hyadum, the cluster's named star (mag 3.65)
  Deneb: 'alCyg',
  'Deneb Algedi': 'deCap',
  Polaris: 'alUMi',
  Dubhe: 'alUMa',
  Alioth: 'epUMa',
  Acrab: 'be-1Sco',
  Dschubba: 'deSco',
  Lesath: 'upSco',
  Shaula: 'laSco',
  Castor: 'alGem',
  Pollux: 'beGem',
  Bellatrix: 'gaOri',
  Mintaka: 'deOri',
  Alnilam: 'epOri',
  Alnitak: 'zeOri',
  Sadalsuud: 'beAqr',
  Sadalmelik: 'alAqr',
  Achernar: 'alEri',
  Markab: 'alPeg',
  Scheat: 'bePeg',
  Alphard: 'alHya',
  Acubens: 'alCnc',
  Zubeneschamali: 'beLib',
  Zubenelgenubi: 'al-2Lib',
  Rasalhague: 'alOph',
  'Ras Algethi': 'alHer',
  Denebola: 'beLeo',
  Zosma: 'deLeo',
  'Cor Caroli': 'al-2CVn',
}

const require = createRequire(import.meta.url)
const SEFSTARS = join(dirname(require.resolve('swisseph/package.json')), 'ephe', 'sefstars.txt')

/** J2000 equatorial unit vector of a catalogue star. */
function catalogueVector(designation: string): Astronomy.Vector {
  const line = readFileSync(SEFSTARS, 'utf8')
    .split('\n')
    .find((l) => !l.startsWith('#') && l.split(',')[1]?.trim() === designation)
  if (!line) throw new Error(`${designation} not in sefstars.txt`)
  const f = line.split(',').map((x) => x.trim())
  const ra = (Number(f[3]) + Number(f[4]) / 60 + Number(f[5]) / 3600) * 15
  const decSign = f[6].startsWith('-') ? -1 : 1
  const dec = decSign * (Math.abs(Number(f[6])) + Number(f[7]) / 60 + Number(f[8]) / 3600)
  return Astronomy.VectorFromSphere(
    new Astronomy.Spherical(dec, ra, 1),
    Astronomy.MakeTime(new Date('2000-01-01T12:00:00Z'))
  )
}

/** Ecliptic longitude of a catalogue star: J2000 ecliptic, or the true ecliptic of a date. */
function catalogueLongitude(designation: string, ofDate?: Date): number {
  const v = catalogueVector(designation)
  const rot = ofDate
    ? Astronomy.Rotation_EQJ_ECT(Astronomy.MakeTime(ofDate))
    : Astronomy.Rotation_EQJ_ECL()
  return Astronomy.SphereFromVector(Astronomy.RotateVector(rot, v)).lon
}

const angDiff = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180)

describe('fixed-star table vs the star catalogue (STAR-1)', () => {
  it('maps every table star to a catalogue designation', () => {
    expect(
      getAllFixedStars()
        .map((s) => s.name)
        .sort()
    ).toEqual(Object.keys(DESIGNATION).sort())
  })

  it('every J2000 longitude is within 0.01° of catalogue RA/Dec → ecliptic', () => {
    for (const star of getAllFixedStars()) {
      const expected = catalogueLongitude(DESIGNATION[star.name])
      expect(angDiff(star.longitude, expected), `${star.name} ${expected.toFixed(3)}`).toBeLessThan(
        0.01
      )
    }
  })

  it('the re-audit stars sit where the sky puts them', () => {
    const lon = (name: string) => getAllFixedStars().find((s) => s.name === name)!.longitude
    expect(lon('Castor')).toBeCloseTo(110.24, 1) // 20°14′ Cancer, not Leo
    expect(lon('Pollux')).toBeCloseTo(113.22, 1)
    expect(lon('Alioth')).toBeCloseTo(158.93, 1) // 8°56′ Virgo
    expect(lon('Dschubba')).toBeCloseTo(242.57, 1)
    expect(lon('Procyon')).toBeCloseTo(115.79, 1)
    expect(lon('Arcturus')).toBeCloseTo(204.23, 1)
    expect(lon('Alphard')).toBeCloseTo(147.28, 1)
    expect(lon('Denebola')).toBeCloseTo(171.62, 1)
  })

  it('precessed to 2026, every star is within 0.03° of its true-ecliptic-of-date longitude', () => {
    const mid2026 = new Date('2026-07-02T12:00:00Z')
    for (const star of getAllFixedStars()) {
      const expected = catalogueLongitude(DESIGNATION[star.name], mid2026)
      expect(
        angDiff(correctForPrecession(star.longitude, 2026.5), expected),
        star.name
      ).toBeLessThan(0.03)
    }
  })
})

const LONDON = { lat: 51.5074, lon: -0.1278, tz: 'Europe/London' }

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
    const v = (t: string) => Number(p.find((x) => x.type === t)!.value)
    return Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'), v('second')) - ms
  }
  let ms = guess - offsetAt(guess)
  ms = guess - offsetAt(ms)
  return new Date(ms)
}

describeRealEphemeris('calendar fixed-star contacts — real ephemeris (STAR-1/STAR-2)', () => {
  it('Sun ☌ Castor/Pollux fire on the July days the sky says, never in August', async () => {
    const signals = (await astroFixedStarExtractor.extract({
      natal: {
        astro: { location: { latitude: LONDON.lat, longitude: LONDON.lon, timeZone: LONDON.tz } },
      },
      range: {
        start: '2026-07-01T00:00:00.000Z',
        end: '2026-08-31T00:00:00.000Z',
        granularity: 'day',
      },
      cache: createCache(),
    } as unknown as ExtractorArg)) as Array<{
      id: string
      evidence: { planets: string[]; detail: { starName: string } }
    }>

    // No transit angle is ever a star's partner.
    expect(signals.filter((s) => ['Ascendant', 'MC'].includes(s.evidence.planets[0]))).toEqual([])

    for (const star of ['Castor', 'Pollux']) {
      const engineDays = signals
        .filter((s) => s.evidence.planets[0] === 'Sun' && s.evidence.detail.starName === star)
        .map((s) => s.id.slice(-10))
        .sort()
      // Reference: the apparent Sun at London noon within 1° of the star's longitude of date.
      const refDays: string[] = []
      for (let t = Date.UTC(2026, 6, 1); t <= Date.UTC(2026, 7, 31); t += 86_400_000) {
        const day = new Date(t).toISOString().slice(0, 10)
        const noon = localNoonUtc(day, LONDON.tz)
        const sep = angDiff(
          Astronomy.SunPosition(noon).elon,
          catalogueLongitude(DESIGNATION[star], noon)
        )
        expect(Math.abs(sep - 1), `${star} ${day} too close to the orb edge`).toBeGreaterThan(0.02)
        if (sep < 1) refDays.push(day)
      }
      expect(engineDays, star).toEqual(refDays)
      expect(refDays.every((d) => d.startsWith('2026-07'))).toBe(true)
    }
  })
})
