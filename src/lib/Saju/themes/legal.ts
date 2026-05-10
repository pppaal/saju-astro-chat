// Saju/themes/legal.ts
// 법률/분쟁 테마. 형(刑) + 편관 + 정관.

import { analyzeSibsinPositions, countSibsin } from '../foundation/sibsinAnalysis'
import type { SajuThemeAnalysis, SajuThemeFactor, SimpleSajuPillars } from './types'

// 三刑: 寅巳申, 丑戌未, 子卯
const HYUNG_TRIPLES: string[][] = [
  ['寅', '巳', '申'],
  ['丑', '戌', '未'],
  ['子', '卯'],
]

export function analyzeLegalSaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  const positions = analyzeSibsinPositions(pillars as never)
  const count = countSibsin(positions)
  const factors: SajuThemeFactor[] = []

  const branches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch]

  // 형(刑) 검사
  for (const triple of HYUNG_TRIPLES) {
    const hits = triple.filter((b) => branches.includes(b))
    if (hits.length >= 2) {
      factors.push({
        source: `三刑 ${hits.join('-')}`,
        meaning: '법률·분쟁·시비·관재 결.',
        tone: 'cautious',
      })
    }
  }

  if (count.정관 > 0) {
    factors.push({
      source: `정관 ${count.정관}개`,
      meaning: '정통 법·체계 활용 — 법조인 적성 또는 법 보호.',
      tone: 'positive',
    })
  }
  if (count.편관 >= 2) {
    factors.push({
      source: `편관 ${count.편관}개`,
      meaning: '편관 다수 — 시비·관재·소송 위험.',
      tone: 'cautious',
    })
  }

  if (factors.length === 0) {
    factors.push({
      source: '형·관성 약함',
      meaning: '법적 분쟁 결 약함. 평이한 결.',
      tone: 'neutral',
    })
  }

  return {
    theme: 'legal',
    factors,
    summary: `법률 영역: 형 ${factors.filter((f) => f.source.includes('三刑')).length}, 정관 ${count.정관}, 편관 ${count.편관}`,
  }
}
