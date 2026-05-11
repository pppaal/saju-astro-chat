// astrology/themes/social.ts
// 사회 관계/친구 테마. 11궁(그룹·이상)·7궁(1:1) + Mercury(소통)·Venus(조화).

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

const SOCIAL_PLANETS: AstroPlanetName[] = ['Mercury', 'Venus', 'Jupiter']
const SOCIAL_HOUSES = [7, 11]

export function analyzeSocialAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  for (const name of SOCIAL_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet) continue
    factors.push({
      source: `${name} in ${planet.sign} (${planet.house}궁)`,
      meaning: `${getPlanetSignInterpretation(name, planet.sign as never)} | ${getPlanetHouseInterpretation(name, planet.house)}`,
      tone: 'positive',
    })
  }

  for (const h of SOCIAL_HOUSES) {
    const occupants = chart.planets.filter((p) => p.house === h)
    if (occupants.length === 0) continue
    const label = h === 7 ? '1:1 동반자' : '그룹·이상·후원'
    factors.push({
      source: `${h}궁 (${label}) — ${occupants.map((p) => p.name).join(', ')}`,
      meaning: occupants.map((p) => getPlanetHouseInterpretation(p.name as AstroPlanetName, h)).join(' / '),
      tone: 'mixed',
    })
  }

  return {
    theme: 'social',
    factors,
    summary: factors.length > 0 ? `사회 관계 ${factors.length}요소` : '사회 관계 영역 약함.',
  }
}
