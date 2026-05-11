// astrology/themes/children.ts
// 자녀 테마. 5궁(자녀·창조) + Moon + Jupiter.

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

const CHILDREN_PLANETS: AstroPlanetName[] = ['Moon', 'Jupiter']
const CHILDREN_HOUSES = [5]

export function analyzeChildrenAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  for (const name of CHILDREN_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet) continue
    factors.push({
      source: `${name} in ${planet.sign} (${planet.house}궁)`,
      meaning: `${getPlanetSignInterpretation(name, planet.sign as never)} | ${getPlanetHouseInterpretation(name, planet.house)}`,
      tone: 'mixed',
    })
  }

  for (const h of CHILDREN_HOUSES) {
    const occupants = chart.planets.filter((p) => p.house === h)
    if (occupants.length === 0) continue
    factors.push({
      source: `${h}궁 (${getHouseDomainKo(h)}) — ${occupants.map((p) => p.name).join(', ')}`,
      meaning: occupants.map((p) => getPlanetHouseInterpretation(p.name as AstroPlanetName, h)).join(' / '),
      tone: 'positive',
    })
  }

  return {
    theme: 'children',
    factors,
    summary: factors.length > 0 ? `자녀 영역 ${factors.length}요소` : '자녀 영역 약함.',
  }
}
