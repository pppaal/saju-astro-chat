import { describe, expect, it } from 'vitest'
import type { NatalChartData } from '@/lib/astrology'
import type { SajuDataStructure } from '@/app/api/destiny-map/chat-stream/lib/types'
import { compareBirthTimeCandidate } from '@/app/api/destiny-map/chat-stream/lib/birthTimeRectification'

function createSaju(timePillar: string): SajuDataStructure {
  return {
    pillars: {
      time: {
        heavenlyStem: { name: timePillar[0] || '' },
        earthlyBranch: { name: timePillar[1] || '' },
      },
    },
  }
}

function createChart(ascendantSign: string, houses: Record<string, number>): NatalChartData {
  return {
    planets: Object.entries(houses).map(([name, house], index) => ({
      name,
      longitude: index * 10,
      formatted: `${index}`,
      sign: ascendantSign,
      degree: index,
      minute: 0,
      house,
    })),
    ascendant: {
      name: 'Ascendant',
      longitude: 0,
      formatted: '0',
      sign: ascendantSign,
      degree: 0,
      minute: 0,
      house: 1,
    },
    mc: {
      name: 'MC',
      longitude: 90,
      formatted: '90',
      sign: 'Capricorn',
      degree: 0,
      minute: 0,
      house: 10,
    },
    houses: Array.from({ length: 12 }, (_, index) => ({
      cusp: index * 30,
      formatted: String(index + 1),
    })),
  }
}

describe('birthTimeRectification', () => {
  it('compares actual chart deltas into a candidate summary', () => {
    const candidate = compareBirthTimeCandidate({
      locale: 'en',
      currentBirthTime: '06:30',
      candidateBirthTime: '04:30',
      focusDomain: 'career',
      currentSaju: createSaju('甲卯'),
      candidateSaju: createSaju('乙辰'),
      currentNatalChart: createChart('Aquarius', {
        Sun: 10,
        Moon: 4,
        Mercury: 6,
        Venus: 7,
      }),
      candidateNatalChart: createChart('Pisces', {
        Sun: 11,
        Moon: 4,
        Mercury: 5,
        Venus: 8,
      }),
    })

    expect(candidate.birthTime).toBe('04:30')
    expect(candidate.summary.length).toBeGreaterThan(0)
    expect(candidate.timePillarLabel).toBe('乙辰')
    expect(candidate.ascendantSign).toBe('Pisces')
    expect(candidate.changedDomains.length).toBeGreaterThan(0)
    expect(candidate.supportSignals.length).toBeGreaterThan(0)
    expect(candidate.cautionSignals.length).toBeGreaterThan(0)
  })
})
