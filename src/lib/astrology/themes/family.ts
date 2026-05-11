// astrology/themes/family.ts
// 가족 테마. Saju/familyLineage.{analyzeFamilyDynamic, analyzeParentChild, analyzeSiblings} 와 mirror.
// 핵심: Moon(어머니·정서), Sun(아버지) + 4궁(가정·뿌리)·5궁(자녀)·10궁(공적 가족상)

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

const FAMILY_PLANETS: AstroPlanetName[] = ['Moon', 'Sun']
const FAMILY_HOUSES = [4, 5, 10]

export function analyzeFamilyAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  for (const name of FAMILY_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet) continue
    factors.push({
      source: `${name} in ${planet.sign} (${planet.house}궁)`,
      meaning: `${getPlanetSignInterpretation(name, planet.sign as never)} | ${getPlanetHouseInterpretation(name, planet.house)}`,
      tone: 'neutral',
    })
  }

  for (const h of FAMILY_HOUSES) {
    const occupants = chart.planets.filter((p) => p.house === h)
    if (occupants.length === 0) continue
    const label =
      h === 4 ? '뿌리·가정' : h === 5 ? '자녀·창조' : '공적 가족상'
    factors.push({
      source: `${h}궁 (${getHouseDomainKo(h)} · ${label}) — ${occupants.map((p) => p.name).join(', ')}`,
      meaning: occupants
        .map((p) => getPlanetHouseInterpretation(p.name as AstroPlanetName, h))
        .join(' / '),
      tone: 'mixed',
    })
  }

  const summary =
    factors.length > 0
      ? `가족 영역 활성 ${factors.length}요소. 핵심: ${factors[0].source}`
      : '가족 영역 두드러진 요소 없음 (Moon·Sun·4·5·10궁 모두 약함).'

  return { theme: 'family', factors, summary }
}
