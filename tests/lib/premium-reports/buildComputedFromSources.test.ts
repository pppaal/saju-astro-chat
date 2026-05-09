import { describe, expect, it } from 'vitest'

import { buildComputedFromSources } from '@/lib/premium-reports/computeUltimateContext'
import type { CalculateSajuDataResult, PillarData } from '@/lib/Saju/foundation/types'
import type { NatalChartData, PlanetData } from '@/lib/astrology/foundation/astrologyService'

function makePillar(stem: string, branch: string, stemEl: string, branchEl: string): PillarData {
  return {
    heavenlyStem: { name: stem, element: stemEl as never, yin_yang: '양', sibsin: '비견' },
    earthlyBranch: { name: branch, element: branchEl as never, yin_yang: '양', sibsin: '겁재' },
    jijanggan: {},
  }
}

function makeSaju(): CalculateSajuDataResult {
  return {
    yearPillar: makePillar('丙', '午', '화', '화'),
    monthPillar: makePillar('癸', '巳', '수', '화'),
    dayPillar: makePillar('丁', '卯', '화', '목'),
    timePillar: makePillar('庚', '戌', '금', '토'),
    pillars: {
      year: makePillar('丙', '午', '화', '화'),
      month: makePillar('癸', '巳', '수', '화'),
      day: makePillar('丁', '卯', '화', '목'),
      time: makePillar('庚', '戌', '금', '토'),
    },
    daeWoon: { startAge: 1, isForward: true, current: null, list: [] },
    unse: { daeun: [], annual: [], monthly: [] },
    fiveElements: { wood: 1, fire: 4, earth: 1, metal: 1, water: 1 },
    dayMaster: { name: '丁', element: '화', yin_yang: '음' },
  } as unknown as CalculateSajuDataResult
}

function makePlanet(name: string, sign: string, house = 1, degree = 12): PlanetData {
  return {
    name,
    sign: sign as never,
    longitude: 12,
    formatted: `${sign} 12°`,
    degree,
    minute: 30,
    house,
  }
}

function makeChart(): NatalChartData {
  const ascendant = makePlanet('Ascendant', 'Aries', 1, 0)
  const mc = makePlanet('MC', 'Capricorn', 10, 0)
  return {
    planets: [
      makePlanet('Sun', 'Taurus', 1, 12),
      makePlanet('Moon', 'Scorpio', 7, 5),
      makePlanet('Mercury', 'Taurus', 1, 25),
      makePlanet('Venus', 'Taurus', 1, 18),
      makePlanet('Mars', 'Leo', 4, 8),
    ],
    ascendant,
    mc,
    houses: [],
  }
}

describe('buildComputedFromSources', () => {
  it('produces UltimateComputed with all four pillars and main astro placements', () => {
    const computed = buildComputedFromSources(makeSaju(), makeChart())

    expect(computed.dayMaster.stem).toBe('丁')
    expect(computed.dayMaster.element).toBe('화')

    expect(computed.sajuPillars.map((p) => p.label)).toEqual(['year', 'month', 'day', 'time'])
    const dayPillar = computed.sajuPillars.find((p) => p.label === 'day')
    expect(dayPillar?.stem).toBe('丁')
    expect(dayPillar?.branch).toBe('卯')
    expect(dayPillar?.stemElement).toBe('화')
    expect(dayPillar?.branchElement).toBe('목')

    const sun = computed.astroPlacements.find((p) => p.body === 'Sun')
    expect(sun?.signKo).toBe('황소자리')
    expect(sun?.bodyKo).toBe('태양')
    const moon = computed.astroPlacements.find((p) => p.body === 'Moon')
    expect(moon?.signKo).toBe('전갈자리')
    const ascendant = computed.astroPlacements.find((p) => p.body === 'Ascendant')
    expect(ascendant?.bodyKo).toBe('상승궁')

    expect(computed.fiveElements.fire).toBe(4)
  })
})
