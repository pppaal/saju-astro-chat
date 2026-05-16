// Saju/themes/study.ts
// 학업/공부 테마. 인성(정인·편인) — 학습·보호·정통 지식.

import { analyzeSibsinPositions, countSibsin } from '../sibsinAnalysis'
import type { SajuThemeAnalysis, SajuThemeFactor, SimpleSajuPillars } from './types'

export function analyzeStudySaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  const positions = analyzeSibsinPositions(pillars as never)
  const count = countSibsin(positions)
  const factors: SajuThemeFactor[] = []

  const total = count.정인 + count.편인
  if (count.정인 > 0) {
    factors.push({
      source: `정인 ${count.정인}개`,
      meaning: '정통 학문·정규 교육·체계적 학습 결.',
      tone: 'positive',
    })
  }
  if (count.편인 > 0) {
    factors.push({
      source: `편인 ${count.편인}개`,
      meaning: '비정통·독학·전문 분야 깊이 파는 결.',
      tone: 'mixed',
    })
  }
  if (total === 0) {
    factors.push({
      source: '인성 없음',
      meaning: '인성 무근 — 자력 학습·실무 경험 통한 지식 축적 필요.',
      tone: 'cautious',
    })
  }

  return {
    theme: 'study',
    factors,
    summary: `학업 영역: 인성=${total}개 (정인 ${count.정인}, 편인 ${count.편인})`,
  }
}
