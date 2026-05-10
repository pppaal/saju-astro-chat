// astrology/themes/creativity.ts
// 창의성/예술 테마. 5궁(자기 표현·창조) + Venus + Neptune.

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

const CREATIVE_PLANETS: AstroPlanetName[] = ['Venus', 'Neptune', 'Mercury']
const CREATIVE_HOUSES = [5]

export function analyzeCreativityAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  for (const name of CREATIVE_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet) continue
    factors.push({
      source: `${name} in ${planet.sign} (${planet.house}궁)`,
      meaning: `${getPlanetSignInterpretation(name, planet.sign as never)} | ${getPlanetHouseInterpretation(name, planet.house)}`,
      tone: 'positive',
    })
  }

  for (const h of CREATIVE_HOUSES) {
    const occupants = chart.planets.filter((p) => p.house === h)
    if (occupants.length === 0) continue
    factors.push({
      source: `${h}궁 (${getHouseDomainKo(h)}) — ${occupants.map((p) => p.name).join(', ')}`,
      meaning: occupants.map((p) => getPlanetHouseInterpretation(p.name as AstroPlanetName, h)).join(' / '),
      tone: 'positive',
    })
  }

  return {
    theme: 'creativity',
    factors,
    summary: factors.length > 0 ? `창의 영역 ${factors.length}요소` : '창의 영역 약함.',
  }
}
