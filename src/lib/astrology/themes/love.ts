// astrology/themes/love.ts
// 사랑/배우자 테마 해석 wrapper. Saju/familyLineage.analyzeSpouse 와 mirror.
// 핵심: Venus(애정), Mars(끌림), Moon(정서) + 5궁(연애)·7궁(동반자)·8궁(깊은 결합)

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

const LOVE_PLANETS: AstroPlanetName[] = ['Venus', 'Mars', 'Moon']
const LOVE_HOUSES = [5, 7, 8]

export function analyzeLoveAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  for (const name of LOVE_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet) continue
    factors.push({
      source: `${name} in ${planet.sign} (${planet.house}궁)`,
      meaning: `${getPlanetSignInterpretation(name, planet.sign as never)} | ${getPlanetHouseInterpretation(name, planet.house)}`,
      tone: 'mixed',
    })
  }

  for (const h of LOVE_HOUSES) {
    const occupants = chart.planets.filter((p) => p.house === h)
    if (occupants.length === 0) continue
    factors.push({
      source: `${h}궁 (${getHouseDomainKo(h)}) — ${occupants.map((p) => p.name).join(', ')}`,
      meaning: occupants
        .map((p) => getPlanetHouseInterpretation(p.name as AstroPlanetName, h))
        .join(' / '),
      tone: 'mixed',
    })
  }

  const summary =
    factors.length > 0
      ? `사랑 영역 활성 요소 ${factors.length}개. 핵심: ${factors[0].source}`
      : '사랑 영역에서 두드러진 요소 없음 (5·7·8궁 비활성, 사랑 행성 위치 미상).'

  return { theme: 'love', factors, summary }
}
