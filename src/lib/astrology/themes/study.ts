// astrology/themes/study.ts
// 학업/공부 테마. Mercury(사고) + 3궁(단거리 학습)·9궁(고등 교육).

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

const STUDY_PLANETS: AstroPlanetName[] = ['Mercury', 'Jupiter']
const STUDY_HOUSES = [3, 9]

export function analyzeStudyAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  for (const name of STUDY_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet) continue
    factors.push({
      source: `${name} in ${planet.sign} (${planet.house}궁)`,
      meaning: `${getPlanetSignInterpretation(name, planet.sign as never)} | ${getPlanetHouseInterpretation(name, planet.house)}`,
      tone: 'positive',
    })
  }

  for (const h of STUDY_HOUSES) {
    const occupants = chart.planets.filter((p) => p.house === h)
    if (occupants.length === 0) continue
    factors.push({
      source: `${h}궁 (${getHouseDomainKo(h)}) — ${occupants.map((p) => p.name).join(', ')}`,
      meaning: occupants.map((p) => getPlanetHouseInterpretation(p.name as AstroPlanetName, h)).join(' / '),
      tone: 'mixed',
    })
  }

  const summary = factors.length > 0
    ? `학업 영역 활성 ${factors.length}요소`
    : '학업 영역 두드러진 요소 없음.'
  return { theme: 'study', factors, summary }
}
