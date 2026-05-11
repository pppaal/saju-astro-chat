// astrology/themes/travel.ts
// 여행/이동 테마. 9궁(해외·고등 학습) + 3궁(단거리) + Sagittarius·Mercury.

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

const TRAVEL_PLANETS: AstroPlanetName[] = ['Mercury', 'Jupiter']
const TRAVEL_HOUSES = [3, 9]

export function analyzeTravelAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  for (const name of TRAVEL_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet) continue
    factors.push({
      source: `${name} in ${planet.sign} (${planet.house}궁)`,
      meaning: `${getPlanetSignInterpretation(name, planet.sign as never)} | ${getPlanetHouseInterpretation(name, planet.house)}`,
      tone: 'mixed',
    })
  }

  for (const h of TRAVEL_HOUSES) {
    const occupants = chart.planets.filter((p) => p.house === h)
    if (occupants.length === 0) continue
    const label = h === 3 ? '단거리·일상 학습' : '해외·고등 학문'
    factors.push({
      source: `${h}궁 (${label}) — ${occupants.map((p) => p.name).join(', ')}`,
      meaning: occupants.map((p) => getPlanetHouseInterpretation(p.name as AstroPlanetName, h)).join(' / '),
      tone: 'positive',
    })
  }

  return {
    theme: 'travel',
    factors,
    summary: factors.length > 0 ? `여행/이동 영역 ${factors.length}요소` : '여행 영역 약함.',
  }
}
