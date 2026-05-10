// astrology/themes/business.ts
// 사업/창업 테마. 8궁(공동 자원·투자) + 2궁(자기 자원) + 10궁(공적) + Jupiter·Saturn·Uranus.

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

const BUSINESS_PLANETS: AstroPlanetName[] = ['Jupiter', 'Saturn', 'Uranus']
const BUSINESS_HOUSES = [2, 8, 10]

export function analyzeBusinessAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  for (const name of BUSINESS_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet) continue
    factors.push({
      source: `${name} in ${planet.sign} (${planet.house}궁)`,
      meaning: `${getPlanetSignInterpretation(name, planet.sign as never)} | ${getPlanetHouseInterpretation(name, planet.house)}`,
      tone: 'mixed',
    })
  }

  for (const h of BUSINESS_HOUSES) {
    const occupants = chart.planets.filter((p) => p.house === h)
    if (occupants.length === 0) continue
    factors.push({
      source: `${h}궁 (${getHouseDomainKo(h)}) — ${occupants.map((p) => p.name).join(', ')}`,
      meaning: occupants.map((p) => getPlanetHouseInterpretation(p.name as AstroPlanetName, h)).join(' / '),
      tone: h === 8 ? 'cautious' : 'mixed',
    })
  }

  return {
    theme: 'business',
    factors,
    summary: factors.length > 0 ? `사업 영역 ${factors.length}요소` : '사업 영역 약함.',
  }
}
