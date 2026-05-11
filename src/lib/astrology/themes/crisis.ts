// astrology/themes/crisis.ts
// 위기/변환 테마. 8궁(변환·죽음) + Pluto + 12궁(잠재) + hard aspects.

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

const CRISIS_PLANETS: AstroPlanetName[] = ['Pluto', 'Saturn', 'Mars']
const CRISIS_HOUSES = [8, 12]

export function analyzeCrisisAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  for (const name of CRISIS_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet) continue
    factors.push({
      source: `${name} in ${planet.sign} (${planet.house}궁)`,
      meaning: `${getPlanetSignInterpretation(name, planet.sign as never)} | ${getPlanetHouseInterpretation(name, planet.house)}`,
      tone: 'cautious',
    })
  }

  for (const h of CRISIS_HOUSES) {
    const occupants = chart.planets.filter((p) => p.house === h)
    if (occupants.length === 0) continue
    const label = h === 8 ? '변환·심층' : '잠재·고립'
    factors.push({
      source: `${h}궁 (${label}) — ${occupants.map((p) => p.name).join(', ')}`,
      meaning: occupants.map((p) => getPlanetHouseInterpretation(p.name as AstroPlanetName, h)).join(' / '),
      tone: 'cautious',
    })
  }

  return {
    theme: 'crisis',
    factors,
    summary: factors.length > 0 ? `위기/변환 영역 ${factors.length}요소` : '위기 영역 약함.',
  }
}
