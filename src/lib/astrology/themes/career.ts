// astrology/themes/career.ts
// 직업 테마. Saju/healthCareer.analyzeCareer 와 mirror.
// 핵심: Sun(자기 표현), Saturn(책임·구조), MC(소명) + 6궁(일상 업무)·10궁(공적 성취)

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

const CAREER_PLANETS: AstroPlanetName[] = ['Sun', 'Saturn']
const CAREER_HOUSES = [6, 10]

export function analyzeCareerAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  // MC sign — 소명/공적 정체성
  if (chart.mc) {
    factors.push({
      source: `MC ${chart.mc.sign}`,
      meaning: `MC가 ${chart.mc.sign} — 사회적 정체성과 공적 표현의 결.`,
      tone: 'neutral',
    })
  }

  for (const name of CAREER_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet) continue
    factors.push({
      source: `${name} in ${planet.sign} (${planet.house}궁)`,
      meaning: `${getPlanetSignInterpretation(name, planet.sign as never)} | ${getPlanetHouseInterpretation(name, planet.house)}`,
      tone: name === 'Saturn' ? 'cautious' : 'neutral',
    })
  }

  for (const h of CAREER_HOUSES) {
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
      ? `직업 영역 활성 ${factors.length}요소. 핵심: ${factors[0].source}`
      : '직업 영역 두드러진 요소 없음 (MC·Sun·Saturn·6·10궁 모두 약함).'

  return { theme: 'career', factors, summary }
}
