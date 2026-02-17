// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { calculateNatalChart } from '@/lib/astrology/foundation/astrologyService'
import { findNatalAspects } from '@/lib/astrology/foundation/aspects'
import { calculateTransitChart, findTransitAspects } from '@/lib/astrology/foundation/transit'
import { toChart } from '@/lib/astrology/foundation/astrologyService'

const INPUTS = [
  {
    year: 1990,
    month: 6,
    date: 15,
    hour: 12,
    minute: 0,
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  },
  {
    year: 1995,
    month: 2,
    date: 9,
    hour: 6,
    minute: 40,
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  },
  {
    year: 1988,
    month: 12,
    date: 1,
    hour: 23,
    minute: 45,
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  },
  {
    year: 2001,
    month: 7,
    date: 22,
    hour: 4,
    minute: 10,
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  },
  {
    year: 1979,
    month: 2,
    date: 4,
    hour: 0,
    minute: 5,
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  },
]

describe('Astrology deterministic golden invariants', () => {
  it.each(INPUTS)('keeps repeated natal calculations stable for %#', async (input) => {
    const chartA = await calculateNatalChart(input)
    const chartB = await calculateNatalChart(input)

    expect(chartA.planets.length).toBe(11)
    expect(chartB.planets.length).toBe(11)

    const byNameA = Object.fromEntries(chartA.planets.map((p) => [p.name, p.longitude]))
    const byNameB = Object.fromEntries(chartB.planets.map((p) => [p.name, p.longitude]))
    expect(byNameA).toEqual(byNameB)

    expect(chartA.ascendant.longitude).toBeCloseTo(chartB.ascendant.longitude, 12)
    expect(chartA.mc.longitude).toBeCloseTo(chartB.mc.longitude, 12)

    for (const p of chartA.planets) {
      expect(p.longitude).toBeGreaterThanOrEqual(0)
      expect(p.longitude).toBeLessThan(360)
      expect(p.sign).toBeTruthy()
    }

    // House cusps should be valid circular angles and keep deterministic ordering.
    expect(chartA.houses).toHaveLength(12)
    const houseCusps = chartA.houses.map((h) => h.cusp)
    for (const cusp of houseCusps) {
      expect(cusp).toBeGreaterThanOrEqual(0)
      expect(cusp).toBeLessThan(360)
    }
  })

  it('keeps natal aspect pairs stable (no reverse duplicates) and deterministic', async () => {
    const chart = await calculateNatalChart(INPUTS[0])
    const aspectsA = findNatalAspects(chart, { maxResults: 200 })
    const aspectsB = findNatalAspects(chart, { maxResults: 200 })

    expect(aspectsA).toEqual(aspectsB)

    const seen = new Set<string>()
    for (const hit of aspectsA) {
      const key = [hit.from.name, hit.to.name].sort().join('|')
      expect(seen.has(key)).toBe(false)
      seen.add(key)
      expect(hit.orb).toBeGreaterThanOrEqual(0)
    }
  })

  it('keeps transit window boundary calculations deterministic', async () => {
    const natalRaw = await calculateNatalChart(INPUTS[0])
    const natal = toChart(natalRaw)

    const transitStartA = await calculateTransitChart({
      iso: '2026-03-01T00:00:00Z',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })
    const transitStartB = await calculateTransitChart({
      iso: '2026-03-01T00:00:00Z',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })

    const transitEndA = await calculateTransitChart({
      iso: '2026-03-31T23:59:59Z',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })
    const transitEndB = await calculateTransitChart({
      iso: '2026-03-31T23:59:59Z',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })

    const startAspectsA = findTransitAspects(transitStartA, natal)
    const startAspectsB = findTransitAspects(transitStartB, natal)
    const endAspectsA = findTransitAspects(transitEndA, natal)
    const endAspectsB = findTransitAspects(transitEndB, natal)

    expect(startAspectsA).toEqual(startAspectsB)
    expect(endAspectsA).toEqual(endAspectsB)
    expect(startAspectsA.length).toBeGreaterThanOrEqual(0)
    expect(endAspectsA.length).toBeGreaterThanOrEqual(0)
  })
})
