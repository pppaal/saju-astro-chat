import { describe, expect, it } from 'vitest'

import {
  buildAstrologyComprehensiveReport,
  ASTROLOGY_DOMAIN_LABEL_KO,
} from '@/lib/astrology/comprehensiveReport'
import type { AstrologyData } from '@/lib/astrology/astrology'

function makePlanet(name: string, sign: string, house = 1, retrograde = false) {
  return {
    name,
    longitude: 0,
    formatted: `${sign} 0°`,
    sign: sign as never,
    degree: 0,
    minute: 0,
    house,
    retrograde,
  }
}

function fakeAstrologyData(): AstrologyData {
  const ascendant = makePlanet('Ascendant', 'Aries', 1)
  const mc = makePlanet('MC', 'Capricorn', 10)
  const houses = Array.from({ length: 12 }, (_, i) => ({
    cusp: i * 30,
    formatted: `${i * 30}°`,
  }))

  return {
    natal: {
      planets: [
        makePlanet('Sun', 'Leo', 5),
        makePlanet('Moon', 'Cancer', 4),
        makePlanet('Mercury', 'Virgo', 6),
        makePlanet('Venus', 'Libra', 7),
        makePlanet('Mars', 'Aries', 1),
        makePlanet('Jupiter', 'Sagittarius', 9),
        makePlanet('Saturn', 'Capricorn', 10),
      ],
      ascendant,
      mc,
      houses,
      meta: { jdUT: 0 },
    },
    daily: {
      asOfIso: '2026-05-01T00:00:00.000Z',
      chart: { planets: [], ascendant, mc, houses: [] },
      aspects: [],
    },
    monthly: {
      planets: [makePlanet('Moon', 'Cancer', 4)],
      ascendant,
      mc,
      houses: [],
      returnType: 'lunar',
      returnYear: 2026,
      returnMonth: 5,
      exactReturnTime: '2026-05-15T12:00:00.000Z',
    },
    yearly: {
      planets: [makePlanet('Sun', 'Leo', 5)],
      ascendant,
      mc,
      houses: [],
      returnType: 'solar',
      returnYear: 2026,
      exactReturnTime: '2026-08-01T12:00:00.000Z',
    },
    daewoon: {
      planets: [makePlanet('Sun', 'Aries', 1)],
      ascendant,
      mc,
      houses: [],
      progressionType: 'secondary',
      yearsProgressed: 30,
      progressedDate: '2026-05-01',
    },
    advanced: {
      asteroids: [],
      extraPoints: {
        chiron: { name: 'Chiron', longitude: 0, sign: 'Aries' as never, degree: 0, minute: 0, formatted: '', house: 1 },
        lilith: { name: 'Lilith', longitude: 0, sign: 'Aries' as never, degree: 0, minute: 0, formatted: '', house: 1 },
        partOfFortune: { name: 'Part of Fortune', longitude: 0, sign: 'Aries' as never, degree: 0, minute: 0, formatted: '', house: 1 },
        vertex: { name: 'Vertex', longitude: 0, sign: 'Aries' as never, degree: 0, minute: 0, formatted: '', house: 1 },
      },
      fixedStarConjunctions: [],
      midpoints: [],
      midpointActivations: [],
      eclipseImpacts: [],
      draconic: {
        natalChart: { planets: [], ascendant, mc, houses: [] },
        draconicChart: { planets: [], ascendant, mc, houses: [], baseChart: { planets: [], ascendant, mc, houses: [] } },
        alignments: [],
        tensions: [],
        summary: { dominantTheme: '', alignmentCount: 0, tensionCount: 0, message: '' },
      },
    },
    meta: {
      computedAtIso: '2026-05-01T00:00:00.000Z',
      nowIso: '2026-05-01T00:00:00.000Z',
      progressionTargetDate: '2026-05-01',
      solarReturnYear: 2026,
      lunarReturnYear: 2026,
      lunarReturnMonth: 5,
    },
  }
}

describe('buildAstrologyComprehensiveReport', () => {
  it('produces 5 domain scores with valid bands and signals', () => {
    const report = buildAstrologyComprehensiveReport(fakeAstrologyData())

    expect(report.domains).toHaveLength(5)
    const domainKeys = report.domains.map((d) => d.domain).sort()
    expect(domainKeys).toEqual(
      ['career', 'health', 'personality', 'relationship', 'wealth'].sort()
    )

    for (const dom of report.domains) {
      expect(dom.label).toBe(ASTROLOGY_DOMAIN_LABEL_KO[dom.domain])
      expect(dom.score).toBeGreaterThanOrEqual(0)
      expect(dom.score).toBeLessThanOrEqual(100)
      expect(['great', 'good', 'mixed', 'caution']).toContain(dom.band)
    }

    expect(report.overallScore).toBeGreaterThanOrEqual(0)
    expect(report.overallScore).toBeLessThanOrEqual(100)
  })

  it('attaches dignity info to top placements', () => {
    const report = buildAstrologyComprehensiveReport(fakeAstrologyData())
    expect(report.topPlacements.length).toBeGreaterThan(0)
    const sunInLeo = report.topPlacements.find((p) => p.planet === 'Sun')
    expect(sunInLeo?.dignity.kind).toBe('rulership')
    const saturnInCapricorn = report.topPlacements.find((p) => p.planet === 'Saturn')
    expect(saturnInCapricorn?.dignity.kind).toBe('rulership')
    const venusInLibra = report.topPlacements.find((p) => p.planet === 'Venus')
    expect(venusInLibra?.dignity.kind).toBe('rulership')
  })

  it('emits balance + house rulers + advanced summary', () => {
    const report = buildAstrologyComprehensiveReport(fakeAstrologyData())
    expect(report.balance.elements.fire).toBeGreaterThan(0)
    expect(report.houseRulers.length).toBeGreaterThan(0)
    expect(report.houseRulers[0].house).toBe(1)
    expect(report.advancedSummary).toBeDefined()
  })

  it('emits four timing scores with bands and headlines', () => {
    const report = buildAstrologyComprehensiveReport(fakeAstrologyData())
    for (const layer of ['daily', 'monthly', 'yearly', 'daewoon'] as const) {
      const t = report.timing[layer]
      expect(t.score).toBeGreaterThanOrEqual(0)
      expect(t.score).toBeLessThanOrEqual(100)
      expect(['great', 'good', 'mixed', 'caution']).toContain(t.band)
      expect(t.headline.length).toBeGreaterThan(0)
    }
  })

  it('emits soulSignals for chiron + lilith from advanced extra points', () => {
    const report = buildAstrologyComprehensiveReport(fakeAstrologyData())
    expect(report.soulSignals.length).toBeGreaterThanOrEqual(2)
    const chiron = report.soulSignals.find((s) => s.kind === 'chiron')
    expect(chiron?.sign).toBe('Aries')
    expect(chiron?.signal).toMatch(/카이론/)
    const lilith = report.soulSignals.find((s) => s.kind === 'lilith')
    expect(lilith?.sign).toBe('Aries')
    expect(lilith?.signal).toMatch(/릴리스/)
  })

  it('emits 7 themed sections with saju-style structure', () => {
    const report = buildAstrologyComprehensiveReport(fakeAstrologyData())
    expect(report.themedSections).toHaveLength(7)
    const themeKeys = report.themedSections.map((s) => s.theme).sort()
    expect(themeKeys).toEqual(
      ['career', 'health', 'personality', 'relationship', 'soul', 'structure', 'wealth'].sort()
    )
    const personality = report.themedSections.find((s) => s.theme === 'personality')
    expect(personality?.paragraphs.length).toBeGreaterThan(0)
    expect(personality?.title).toMatch(/성격/)
  })

  it('emits 4 timing sections each with paragraphs', () => {
    const report = buildAstrologyComprehensiveReport(fakeAstrologyData())
    expect(report.timingSections).toHaveLength(4)
    for (const layer of ['daily', 'monthly', 'yearly', 'daewoon'] as const) {
      const t = report.timingSections.find((s) => s.layer === layer)
      expect(t).toBeDefined()
      expect(t?.paragraphs.length).toBeGreaterThan(0)
    }
  })

  it('emits advancedReadings for asteroids / PoF / vertex', () => {
    const report = buildAstrologyComprehensiveReport(fakeAstrologyData())
    expect(report.advancedReadings.partOfFortune.length).toBeGreaterThan(0)
    expect(report.advancedReadings.vertex.length).toBeGreaterThan(0)
  })

  it('every themed section emits advice', () => {
    const report = buildAstrologyComprehensiveReport(fakeAstrologyData())
    for (const s of report.themedSections) {
      expect(Array.isArray(s.advice)).toBe(true)
    }
    // At least 3 themed sections should have actionable advice in this fixture.
    const withAdvice = report.themedSections.filter((s) => s.advice.length > 0).length
    expect(withAdvice).toBeGreaterThanOrEqual(3)
  })

  it('every timing section emits advice', () => {
    const report = buildAstrologyComprehensiveReport(fakeAstrologyData())
    for (const t of report.timingSections) {
      expect(t.advice.length).toBeGreaterThan(0)
    }
  })

  it('extendedPlacements covers asteroids + Chiron + Lilith + PoF + Vertex', () => {
    const report = buildAstrologyComprehensiveReport(fakeAstrologyData())
    const joined = report.extendedPlacements.join('|')
    expect(joined).toMatch(/Chiron/)
    expect(joined).toMatch(/Lilith/)
    expect(joined).toMatch(/Part of Fortune/)
    expect(joined).toMatch(/Vertex/)
  })

  it('houseRulers covers all 12 houses (or limits only by missing cusps)', () => {
    const report = buildAstrologyComprehensiveReport(fakeAstrologyData())
    expect(report.houseRulers.length).toBe(12)
  })
})
