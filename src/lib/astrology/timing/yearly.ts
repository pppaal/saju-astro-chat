// astrology/timing/yearly.ts
// Solar Return 해석 wrapper. 사주 세운(歲運) 해석과 mirror.

import type { ReturnChart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import { getSolarReturnSummary } from '../foundation/returns'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroTimingAnalysis, AstroTimingHighlight } from './types'

const ANGULAR_HOUSES = new Set([1, 4, 7, 10])

export function interpretSolarReturn(chart: ReturnChart): AstroTimingAnalysis {
  const baseSummary = getSolarReturnSummary(chart)
  const highlights: AstroTimingHighlight[] = []

  highlights.push({
    source: `Sun in ${baseSummary.sunHouse}궁 (${getHouseDomainKo(baseSummary.sunHouse)})`,
    meaning: baseSummary.theme,
    tone: 'neutral',
  })

  const moon = chart.planets.find((p) => p.name === 'Moon')
  if (moon) {
    highlights.push({
      source: `Moon in ${moon.sign} (${moon.house}궁)`,
      meaning: `${getPlanetSignInterpretation('Moon', moon.sign as never)} | ${getPlanetHouseInterpretation('Moon', moon.house)}`,
      tone: 'mixed',
    })
  }

  for (const planet of chart.planets) {
    if (!ANGULAR_HOUSES.has(planet.house)) continue
    if (planet.name === 'Sun' || planet.name === 'Moon') continue
    highlights.push({
      source: `${planet.name} angular (${planet.house}궁)`,
      meaning: getPlanetHouseInterpretation(planet.name as AstroPlanetName, planet.house),
      tone: 'mixed',
    })
  }

  return {
    unit: 'yearly',
    periodLabel: `Solar Return ${chart.returnYear}`,
    highlights,
    summary: `${chart.returnYear}년 무대: ${highlights[0]?.source ?? '특이점 없음'} — ${baseSummary.theme}`,
  }
}
