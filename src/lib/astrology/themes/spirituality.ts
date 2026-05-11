// astrology/themes/spirituality.ts
// 영성/종교 테마. 9궁(고등 진리)·12궁(은둔·신비) + Neptune + Pisces·Sagittarius.

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

const SPIRIT_PLANETS: AstroPlanetName[] = ['Jupiter', 'Neptune']
const SPIRIT_HOUSES = [9, 12]

export function analyzeSpiritualityAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  for (const name of SPIRIT_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet) continue
    factors.push({
      source: `${name} in ${planet.sign} (${planet.house}궁)`,
      meaning: `${getPlanetSignInterpretation(name, planet.sign as never)} | ${getPlanetHouseInterpretation(name, planet.house)}`,
      tone: 'mixed',
    })
  }

  for (const h of SPIRIT_HOUSES) {
    const occupants = chart.planets.filter((p) => p.house === h)
    if (occupants.length === 0) continue
    const label = h === 9 ? '진리·종교' : '은둔·신비·잠재'
    factors.push({
      source: `${h}궁 (${label}) — ${occupants.map((p) => p.name).join(', ')}`,
      meaning: occupants.map((p) => getPlanetHouseInterpretation(p.name as AstroPlanetName, h)).join(' / '),
      tone: h === 12 ? 'cautious' : 'positive',
    })
  }

  return {
    theme: 'spirituality',
    factors,
    summary: factors.length > 0 ? `영성 영역 ${factors.length}요소` : '영성 영역 약함.',
  }
}
