// astrology/themes/personality.ts
// 성격 테마. Saju/themes/personality.ts:analyzePersonalitySaju 와 mirror.
// 핵심: Sun(자아·중심), Moon(정서·내면), ASC(외형·반응), Mercury(사고)

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
} from '../interpretations'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

const PERSONALITY_PLANETS: AstroPlanetName[] = ['Sun', 'Moon', 'Mercury']

export function analyzePersonalityAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  // ASC = 외형·1차 반응
  if (chart.ascendant) {
    factors.push({
      source: `Ascendant ${chart.ascendant.sign}`,
      meaning: `상승궁 ${chart.ascendant.sign} — 외형·1차 반응의 결.`,
      tone: 'neutral',
    })
  }

  // Sun(자아) / Moon(정서) / Mercury(사고)
  for (const name of PERSONALITY_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet) continue
    factors.push({
      source: `${name} in ${planet.sign} (${planet.house}궁)`,
      meaning: `${getPlanetSignInterpretation(name, planet.sign as never)} | ${getPlanetHouseInterpretation(name, planet.house)}`,
      tone: 'neutral',
    })
  }

  const summary =
    factors.length > 0
      ? `성격 영역 ${factors.length}개 결. 핵심: ${factors[0].source}`
      : '성격 영역 두드러진 요소 없음 (ASC·Sun·Moon·Mercury 모두 미상).'

  return { theme: 'personality', factors, summary }
}
