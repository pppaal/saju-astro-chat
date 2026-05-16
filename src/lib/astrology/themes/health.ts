// astrology/themes/health.ts
// 건강 테마. Saju/healthCareer.analyzeHealth 와 mirror.
// 핵심: Mars(활력·염증), Saturn(만성·구조) + 1궁(체질)·6궁(일상 건강)·12궁(만성·잠재)

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

const HEALTH_PLANETS: AstroPlanetName[] = ['Mars', 'Saturn']
const HEALTH_HOUSES = [1, 6, 12]

export function analyzeHealthAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  // ASC sign = 체질
  if (chart.ascendant) {
    factors.push({
      source: `Ascendant ${chart.ascendant.sign}`,
      meaning: `상승궁 ${chart.ascendant.sign} — 체질·외형의 결.`,
      tone: 'neutral',
    })
  }

  for (const name of HEALTH_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet) continue
    factors.push({
      source: `${name} in ${planet.sign} (${planet.house}궁)`,
      meaning: `${getPlanetSignInterpretation(name, planet.sign as never)} | ${getPlanetHouseInterpretation(name, planet.house)}`,
      tone: 'cautious',
    })
  }

  for (const h of HEALTH_HOUSES) {
    const occupants = chart.planets.filter((p) => p.house === h)
    if (occupants.length === 0) continue
    factors.push({
      source: `${h}궁 (${getHouseDomainKo(h)}) — ${occupants.map((p) => p.name).join(', ')}`,
      meaning: occupants
        .map((p) => getPlanetHouseInterpretation(p.name as AstroPlanetName, h))
        .join(' / '),
      tone: h === 12 ? 'cautious' : 'mixed',
    })
  }

  const summary =
    factors.length > 0
      ? `건강 영역 활성 ${factors.length}요소. 핵심: ${factors[0].source}`
      : '건강 영역 두드러진 요소 없음 (ASC·Mars·Saturn·1·6·12궁 모두 약함).'

  return { theme: 'health', factors, summary }
}
