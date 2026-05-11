// Saju/themes/reputation.ts
// 명예/평판 테마. 정관·격국 + 식상(표현).

import { analyzeSibsinPositions, countSibsin } from '../sibsinAnalysis'
import type { SajuThemeAnalysis, SajuThemeFactor, SimpleSajuPillars } from './types'

export function analyzeReputationSaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  const positions = analyzeSibsinPositions(pillars as never)
  const count = countSibsin(positions)
  const factors: SajuThemeFactor[] = []

  if (count.정관 > 0) {
    factors.push({
      source: `정관 ${count.정관}개`,
      meaning: '정통 명예·공적 인정·체계적 평판 결.',
      tone: 'positive',
    })
  }
  if (count.편관 > 0) {
    factors.push({
      source: `편관 ${count.편관}개`,
      meaning: '강한 압박·치열한 경쟁 통한 평판 결.',
      tone: 'mixed',
    })
  }
  if (count.식신 > 0 || count.상관 > 0) {
    factors.push({
      source: `식상 (식신 ${count.식신}, 상관 ${count.상관})`,
      meaning: '표현력·재능 통한 평판 — 작품·발언 기반.',
      tone: 'positive',
    })
  }

  if (count.정관 === 0 && count.편관 === 0) {
    factors.push({
      source: '관성 없음',
      meaning: '관성 무근 — 공적 명예보다 사적 영역 결.',
      tone: 'neutral',
    })
  }

  return {
    theme: 'reputation',
    factors,
    summary: `명예 영역: 정관 ${count.정관}, 편관 ${count.편관}, 식상 ${count.식신 + count.상관}`,
  }
}
