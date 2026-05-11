// astrology/themes/parents.ts
// 부모 테마. 4궁/IC (어머니), 10궁/MC (아버지) + Moon + Saturn.

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

const PARENT_PLANETS: AstroPlanetName[] = ['Moon', 'Saturn']
const PARENT_HOUSES = [4, 10]

export function analyzeParentsAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  for (const name of PARENT_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet) continue
    const role = name === 'Moon' ? '어머니' : '아버지·권위'
    factors.push({
      source: `${name} (${role}) in ${planet.sign} (${planet.house}궁)`,
      meaning: `${getPlanetSignInterpretation(name, planet.sign as never)} | ${getPlanetHouseInterpretation(name, planet.house)}`,
      tone: 'neutral',
    })
  }

  for (const h of PARENT_HOUSES) {
    const role = h === 4 ? '뿌리·어머니' : '공적·아버지'
    const occupants = chart.planets.filter((p) => p.house === h)
    if (occupants.length === 0) continue
    factors.push({
      source: `${h}궁 (${role}) — ${occupants.map((p) => p.name).join(', ')}`,
      meaning: occupants.map((p) => getPlanetHouseInterpretation(p.name as AstroPlanetName, h)).join(' / '),
      tone: 'mixed',
    })
  }

  return {
    theme: 'parents',
    factors,
    summary: factors.length > 0 ? `부모 영역 ${factors.length}요소` : '부모 영역 약함.',
  }
}
