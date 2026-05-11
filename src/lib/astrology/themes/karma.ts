// astrology/themes/karma.ts
// 카르마/전생 테마. North Node·South Node + Draconic + 12궁 + Saturn.

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

export function analyzeKarmaAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  const northNode = chart.planets.find((p) => p.name === 'True Node' || p.name === 'Mean Node' || p.name === 'North Node')
  if (northNode) {
    factors.push({
      source: `North Node in ${northNode.sign} (${northNode.house}궁)`,
      meaning: '카르마 진화·이번 생 방향 — North Node가 가리키는 결.',
      tone: 'mixed',
    })
  }

  const saturn = chart.planets.find((p) => p.name === 'Saturn')
  if (saturn) {
    factors.push({
      source: `Saturn in ${saturn.sign} (${saturn.house}궁)`,
      meaning: `${getPlanetHouseInterpretation('Saturn', saturn.house)} — 카르마 무게·시험.`,
      tone: 'cautious',
    })
  }

  const twelfth = chart.planets.filter((p) => p.house === 12)
  if (twelfth.length > 0) {
    factors.push({
      source: `12궁 ${twelfth.map((p) => p.name).join(', ')}`,
      meaning: '12궁 (잠재·전생) 활성 — 무의식 카르마 결.',
      tone: 'mixed',
    })
  }

  if (factors.length === 0) {
    factors.push({
      source: 'Node·Saturn·12궁 약함',
      meaning: '강한 카르마 신호 약함.',
      tone: 'neutral',
    })
  }

  return {
    theme: 'karma',
    factors,
    summary: factors.length > 0 ? `카르마 영역 ${factors.length}요소` : '카르마 영역 약함.',
  }
}
