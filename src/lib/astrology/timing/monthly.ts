// astrology/timing/monthly.ts
// Lunar Return 해석 wrapper. 사주 월운(月運) 해석과 mirror.

import type { ReturnChart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import { getLunarReturnSummary } from '../foundation/returns'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroTimingAnalysis, AstroTimingHighlight } from './types'

const ANGULAR_HOUSES = new Set([1, 4, 7, 10])

export function analyzeMonthlyAstro(chart: ReturnChart): AstroTimingAnalysis {
  const baseSummary = getLunarReturnSummary(chart)
  const highlights: AstroTimingHighlight[] = []

  highlights.push({
    source: `Moon in ${baseSummary.moonHouse}궁 (${getHouseDomainKo(baseSummary.moonHouse)})`,
    meaning: baseSummary.theme,
    tone: 'neutral',
  })

  const sun = chart.planets.find((p) => p.name === 'Sun')
  if (sun) {
    highlights.push({
      source: `Sun in ${sun.sign} (${sun.house}궁)`,
      meaning: `${getPlanetSignInterpretation('Sun', sun.sign as never)} | ${getPlanetHouseInterpretation('Sun', sun.house)}`,
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

  const periodLabel = chart.returnMonth != null
    ? `Lunar Return ${chart.returnYear}-${String(chart.returnMonth).padStart(2, '0')}`
    : `Lunar Return ${chart.returnYear}`

  return {
    unit: 'monthly',
    periodLabel,
    highlights,
    summary: `${periodLabel} 무대: ${highlights[0]?.source ?? '특이점 없음'} — ${baseSummary.theme}`,
  }
}
