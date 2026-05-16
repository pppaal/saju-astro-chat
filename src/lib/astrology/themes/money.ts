// astrology/themes/money.ts
// 돈/재물 테마. Saju 사주의 정재·편재·식상관 분석과 mirror.
// 핵심: Venus(자원), Jupiter(확장) + 2궁(자기 자원)·8궁(공동 자원, 부채·상속)·11궁(이익)

import type { Chart } from '../foundation/types'
import type { AstroPlanetName } from '../interpretations'
import {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getHouseDomainKo,
} from '../interpretations'
import { calculateArabicLots, getLotInterpretation } from '../foundation/arabicParts'
import type { AstroThemeAnalysis, AstroThemeFactor } from './types'

const MONEY_PLANETS: AstroPlanetName[] = ['Venus', 'Jupiter']
const MONEY_HOUSES = [2, 8, 11]

function isDayChart(chart: Chart): boolean {
  const sun = chart.planets.find((p) => p.name === 'Sun')
  if (!sun) return true
  return sun.house >= 7 && sun.house <= 12
}

export function analyzeMoneyAstro(chart: Chart): AstroThemeAnalysis {
  const factors: AstroThemeFactor[] = []

  for (const name of MONEY_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet) continue
    factors.push({
      source: `${name} in ${planet.sign} (${planet.house}궁)`,
      meaning: `${getPlanetSignInterpretation(name, planet.sign as never)} | ${getPlanetHouseInterpretation(name, planet.house)}`,
      tone: name === 'Jupiter' ? 'positive' : 'mixed',
    })
  }

  for (const h of MONEY_HOUSES) {
    const occupants = chart.planets.filter((p) => p.house === h)
    if (occupants.length === 0) continue
    factors.push({
      source: `${h}궁 (${getHouseDomainKo(h)}) — ${occupants.map((p) => p.name).join(', ')}`,
      meaning: occupants
        .map((p) => getPlanetHouseInterpretation(p.name as AstroPlanetName, h))
        .join(' / '),
      tone: h === 8 ? 'cautious' : 'mixed',
    })
  }

  // Lots — Fortune (물질 흐름) + Necessity (제약·의무)
  try {
    const lots = calculateArabicLots(chart, isDayChart(chart))
    for (const target of ['Fortune', 'Necessity'] as const) {
      const lot = lots.find((l) => l.name === target)
      if (lot) {
        factors.push({
          source: `Lot of ${lot.name} in ${lot.sign} (${lot.formula})`,
          meaning: getLotInterpretation(lot),
          tone: target === 'Fortune' ? 'positive' : 'cautious',
        })
      }
    }
  } catch {
    // skip
  }

  const summary =
    factors.length > 0
      ? `재물 영역 활성 ${factors.length}요소. 핵심: ${factors[0].source}`
      : '재물 영역 두드러진 요소 없음 (2·8·11궁 비활성, Venus·Jupiter 위치 미상).'

  return { theme: 'money', factors, summary }
}
