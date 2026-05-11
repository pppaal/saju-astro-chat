// astrology/timing/yearly.ts
// Solar Return 해석 wrapper. 사주 세운(歲運) 해석과 mirror.

import type { Chart, ReturnChart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import { getSolarReturnSummary } from '../foundation/returns'
import { calculateProfection, getProfectionInterpretation } from '../foundation/profections'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroTimingAnalysis, AstroTimingHighlight } from './types'

const ANGULAR_HOUSES = new Set([1, 4, 7, 10])

export interface YearlyAstroOptions {
  natalChart?: Chart   // Profection 산출용
  age?: number         // Profection 산출용
}

export function analyzeYearlyAstro(chart: ReturnChart, options?: YearlyAstroOptions): AstroTimingAnalysis {
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

  // Profection — natal + age 제공 시 활성 하우스 + Lord of the Year 추가
  if (options?.natalChart && options.age != null) {
    try {
      const prof = calculateProfection(options.natalChart, options.age)
      highlights.push({
        source: `Profection age ${prof.age} — house ${prof.activatedHouse} activated`,
        meaning: getProfectionInterpretation(prof),
        tone: 'neutral',
      })
    } catch {
      // age 음수 등 — skip
    }
  }

  return {
    unit: 'yearly',
    periodLabel: `Solar Return ${chart.returnYear}`,
    highlights,
    summary: `${chart.returnYear}년 무대: ${highlights[0]?.source ?? '특이점 없음'} — ${baseSummary.theme}`,
  }
}
