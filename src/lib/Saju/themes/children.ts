// Saju/themes/children.ts
// 자녀 테마. 식상(식신·상관) + 시주.

import { analyzeSibsinPositions, countSibsin } from '../foundation/sibsinAnalysis'
import type { SajuThemeAnalysis, SajuThemeFactor, SimpleSajuPillars } from './types'

export function analyzeChildrenSaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  const positions = analyzeSibsinPositions(pillars as never)
  const count = countSibsin(positions)
  const factors: SajuThemeFactor[] = []

  const total = count.식신 + count.상관
  factors.push({
    source: `시주 ${pillars.hour.stem}${pillars.hour.branch}`,
    meaning: '시주 = 자녀·말년 가정의 결.',
    tone: 'neutral',
  })
  if (count.식신 > 0) {
    factors.push({
      source: `식신 ${count.식신}개`,
      meaning: '안정·온건·대화 가능한 자녀 결.',
      tone: 'positive',
    })
  }
  if (count.상관 > 0) {
    factors.push({
      source: `상관 ${count.상관}개`,
      meaning: '재능·표현·도전적 자녀 결. 갈등도 있음.',
      tone: 'mixed',
    })
  }
  if (total === 0) {
    factors.push({
      source: '식상 없음',
      meaning: '식상 부재 — 자녀 인연 약하거나 늦은 출산 결.',
      tone: 'cautious',
    })
  }

  return {
    theme: 'children',
    factors,
    summary: `자녀 영역: 식상=${total}개 (식신 ${count.식신}, 상관 ${count.상관})`,
  }
}
