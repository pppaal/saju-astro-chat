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
  const natalCommon = {
    ascendant: makePlanet('Ascendant', 'Aries', 1),
    mc: makePlanet('MC', 'Capricorn', 10),
    houses: [],
    meta: { jdUT: 0, isoUTC: '2026-01-01T00:00:00.000Z' },
  }
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
      ...natalCommon,
    },
    daily: {
      asOfIso: '2026-05-01T00:00:00.000Z',
      chart: { planets: [], ascendant: natalCommon.ascendant, mc: natalCommon.mc, houses: [] },
      aspects: [],
    },
    monthly: {
      planets: [makePlanet('Moon', 'Pisces', 12)],
      ascendant: natalCommon.ascendant,
      mc: natalCommon.mc,
      houses: [],
      returnType: 'lunar',
      returnYear: 2026,
      returnMonth: 5,
      exactReturnTime: '2026-05-15T12:00:00.000Z',
    },
    yearly: {
      planets: [makePlanet('Sun', 'Leo', 5)],
      ascendant: natalCommon.ascendant,
      mc: natalCommon.mc,
      houses: [],
      returnType: 'solar',
      returnYear: 2026,
      exactReturnTime: '2026-08-01T12:00:00.000Z',
    },
    daewoon: {
      planets: [
        makePlanet('Sun', 'Virgo', 6),
        makePlanet('Moon', 'Scorpio', 8),
      ],
      ascendant: natalCommon.ascendant,
      mc: natalCommon.mc,
      houses: [],
      progressionType: 'secondary',
      yearsProgressed: 30,
      progressedDate: '2026-05-01',
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

  it('surfaces top placements with Korean signal text', () => {
    const report = buildAstrologyComprehensiveReport(fakeAstrologyData())
    expect(report.topPlacements.length).toBeGreaterThan(0)
    const firstSignal = report.topPlacements[0].signal
    expect(firstSignal.length).toBeGreaterThan(10)
    expect(firstSignal).toMatch(/태양|달|수성|금성|화성|목성|토성|상승궁/)
  })

  it('emits a timing snapshot covering today, monthly, yearly, daewoon', () => {
    const report = buildAstrologyComprehensiveReport(fakeAstrologyData())
    expect(report.timing.todayTransits).toBeDefined()
    expect(report.timing.monthlyHeadline).toContain('이번 달')
    expect(report.timing.yearlyHeadline).toContain('올해')
    expect(report.timing.daewoonHeadline).toContain('대운')
  })
})
