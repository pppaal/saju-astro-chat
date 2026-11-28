/**
 * Annual profection — whole-sign from the Ascendant sign (engine audit E5, ASTRO-1).
 *
 * Valens, Anthology IV.11; Brennan, Hellenistic Astrology ch.11: the profected
 * sign moves exactly one sign per year from the ASC sign, and the Lord of the
 * Year is that sign's traditional domicile ruler. The old code read the sign on
 * each Placidus cusp, so an intercepted sign was never activated and a sign
 * that held two cusps came round twice.
 */
import { describe, it, expect } from 'vitest'
import {
  calculateProfection,
  calculateProfectionTimeline,
} from '@/lib/astrology/foundation/profections'
import { SIGN_RULERS_BY_SIGN } from '@/lib/astrology/foundation/dignities'
import { formatLongitude, ZODIAC_SIGNS } from '@/lib/astrology/foundation/utils'
import type { Chart, House, PlanetBase } from '@/lib/astrology/foundation/types'

function point(name: string, lon: number, house: number): PlanetBase {
  const f = formatLongitude(lon)
  return {
    name,
    longitude: f.norm,
    sign: f.sign,
    degree: f.degree,
    minute: f.minute,
    formatted: f.formatted,
    house,
  }
}

function chartWithCusps(asc: number, cusps: number[]): Chart {
  const houses: House[] = cusps.map((cusp, i) => {
    const f = formatLongitude(cusp)
    return { index: i + 1, cusp: f.norm, sign: f.sign, formatted: f.formatted }
  })
  return {
    planets: [],
    ascendant: point('Ascendant', asc, 1),
    mc: point('MC', cusps[9], 10),
    houses,
  }
}

// 1990-10-09 14:18 UTC at Seoul (37.5665N 126.978E): ASC Cancer 16°31′. The
// Placidus cusps put Virgo on 3 and 4 and Pisces on 9 and 10, so Libra and
// Aries sit inside houses — the case from the audit repro.
const SEOUL_1990 = chartWithCusps(
  106.526,
  [106.526, 128.1, 153.2, 179.4, 212.6, 250.3, 286.526, 308.1, 333.2, 359.4, 32.6, 70.3]
)

describe('calculateProfection — whole-sign from the ASC sign', () => {
  it('the 1990-10-09 Seoul chart activates Libra at 3 and Aries at 9', () => {
    expect(calculateProfection(SEOUL_1990, 3)).toMatchObject({
      activatedHouse: 4,
      activatedSign: 'Libra',
      lordOfYear: 'Venus',
    })
    expect(calculateProfection(SEOUL_1990, 9)).toMatchObject({
      activatedHouse: 10,
      activatedSign: 'Aries',
      lordOfYear: 'Mars',
    })
  })

  it('walks all 12 signs once per 12 years, no repeat and no skip', () => {
    const signs = calculateProfectionTimeline(SEOUL_1990, 0, 11).map((p) => p.activatedSign)
    expect(new Set(signs).size).toBe(12)
    expect(signs).toEqual([
      'Cancer',
      'Leo',
      'Virgo',
      'Libra',
      'Scorpio',
      'Sagittarius',
      'Capricorn',
      'Aquarius',
      'Pisces',
      'Aries',
      'Taurus',
      'Gemini',
    ])
    expect(calculateProfection(SEOUL_1990, 12).activatedSign).toBe('Cancer')
  })

  it('property over 200 charts: activatedSign === ZODIAC[(ascIdx + age) % 12], lord = domicile ruler', () => {
    // deterministic LCG — charts with uneven, intercepting cusps
    let seed = 20261125
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
    for (let n = 0; n < 200; n++) {
      const asc = rand() * 360
      // uneven houses that still close the circle — some signs get two cusps, some none
      const widths = Array.from({ length: 12 }, () => 0.4 + rand() * 1.2)
      const total = widths.reduce((a, b) => a + b, 0)
      const cusps: number[] = [asc]
      for (let i = 1; i < 12; i++) cusps.push(cusps[i - 1] + (widths[i - 1] / total) * 360)
      const chart = chartWithCusps(asc, cusps)
      const ascIdx = Math.floor(asc / 30)
      for (let age = 0; age < 12; age++) {
        const p = calculateProfection(chart, age)
        const sign = ZODIAC_SIGNS[(ascIdx + age) % 12]
        expect(p.activatedSign, `chart ${n} age ${age}`).toBe(sign)
        expect(p.activatedHouse).toBe(age + 1)
        expect(p.lordOfYear).toBe(SIGN_RULERS_BY_SIGN[sign])
      }
    }
  })

  it('falls back to ascendant.sign when the longitude is missing', () => {
    const chart = chartWithCusps(
      0,
      Array.from({ length: 12 }, (_, i) => i * 30)
    )
    chart.ascendant = { ...chart.ascendant, longitude: Number.NaN, sign: 'Scorpio' }
    expect(calculateProfection(chart, 2).activatedSign).toBe('Capricorn')
  })
})
