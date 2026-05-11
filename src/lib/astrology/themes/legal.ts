// astrology/themes/legal.ts
// 법률/분쟁 테마. 9궁(법·진리) + 7궁(계약·공개 적) + Saturn + Mars-Saturn aspect.

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

const LEGAL_PLANETS: AstroPlanetName[] = ['Jupiter', 'Saturn', 'Mars']
const LEGAL_HOUSES = [7, 9]

export function analyzeLegalAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  for (const name of LEGAL_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet) continue
    factors.push({
      source: `${name} in ${planet.sign} (${planet.house}궁)`,
      meaning: `${getPlanetSignInterpretation(name, planet.sign as never)} | ${getPlanetHouseInterpretation(name, planet.house)}`,
      tone: name === 'Jupiter' ? 'positive' : 'cautious',
    })
  }

  for (const h of LEGAL_HOUSES) {
    const occupants = chart.planets.filter((p) => p.house === h)
    if (occupants.length === 0) continue
    const label = h === 7 ? '계약·공개 적' : '법·진리'
    factors.push({
      source: `${h}궁 (${label}) — ${occupants.map((p) => p.name).join(', ')}`,
      meaning: occupants.map((p) => getPlanetHouseInterpretation(p.name as AstroPlanetName, h)).join(' / '),
      tone: 'mixed',
    })
  }

  return {
    theme: 'legal',
    factors,
    summary: factors.length > 0 ? `법률 영역 ${factors.length}요소` : '법률 영역 약함.',
  }
}
