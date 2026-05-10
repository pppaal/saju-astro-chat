// Saju/themes/parents.ts
// 부모 테마. 인성(정인·편인) + 년주(조상)·월주(부모).

import { analyzeSibsinPositions, countSibsin } from '../foundation/sibsinAnalysis'
import type { SajuThemeAnalysis, SajuThemeFactor, SimpleSajuPillars } from './types'

export function analyzeParentsSaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  const positions = analyzeSibsinPositions(pillars as never)
  const count = countSibsin(positions)
  const factors: SajuThemeFactor[] = []

  factors.push({
    source: `년주 ${pillars.year.stem}${pillars.year.branch}`,
    meaning: '조상·먼 부모·가문 뿌리.',
    tone: 'neutral',
  })
  factors.push({
    source: `월주 ${pillars.month.stem}${pillars.month.branch}`,
    meaning: '부모 (특히 어머니)·성장 환경.',
    tone: 'neutral',
  })

  const insung = count.정인 + count.편인
  if (insung > 0) {
    factors.push({
      source: `인성 ${insung}개 (정인 ${count.정인}, 편인 ${count.편인})`,
      meaning: count.정인 >= count.편인 ? '부모 보호·정통 보살핌 결.' : '비정통·서모(편모) 결 가능.',
      tone: 'positive',
    })
  }
  if (insung === 0) {
    factors.push({
      source: '인성 없음',
      meaning: '인성 무근 — 부모 인연 약하거나 일찍 자립.',
      tone: 'cautious',
    })
  }

  return {
    theme: 'parents',
    factors,
    summary: `부모 영역: 년·월주 + 인성=${insung}개`,
  }
}
