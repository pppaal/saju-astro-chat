// astrology/themes/reputation.ts
// 명예/평판 테마. 10궁/MC + Sun + Jupiter.

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

const REPUTATION_PLANETS: AstroPlanetName[] = ['Sun', 'Jupiter']

export function analyzeReputationAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  if (chart.mc) {
    factors.push({
      source: `MC ${chart.mc.sign}`,
      meaning: `MC ${chart.mc.sign} — 공적 명예·소명의 결.`,
      tone: 'neutral',
    })
  }

  for (const name of REPUTATION_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet) continue
    factors.push({
      source: `${name} in ${planet.sign} (${planet.house}궁)`,
      meaning: `${getPlanetSignInterpretation(name, planet.sign as never)} | ${getPlanetHouseInterpretation(name, planet.house)}`,
      tone: 'positive',
    })
  }

  const tenth = chart.planets.filter((p) => p.house === 10)
  if (tenth.length > 0) {
    factors.push({
      source: `10궁 (${getHouseDomainKo(10)}) — ${tenth.map((p) => p.name).join(', ')}`,
      meaning: tenth.map((p) => getPlanetHouseInterpretation(p.name as AstroPlanetName, 10)).join(' / '),
      tone: 'positive',
    })
  }

  return {
    theme: 'reputation',
    factors,
    summary: factors.length > 0 ? `명예 영역 ${factors.length}요소` : '명예 영역 약함.',
  }
}
