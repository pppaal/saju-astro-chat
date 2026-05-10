// Saju/themes/creativity.ts
// 창의성/예술 테마. 식상(특히 상관) + 편인.

import { analyzeSibsinPositions, countSibsin } from '../foundation/sibsinAnalysis'
import type { SajuThemeAnalysis, SajuThemeFactor, SimpleSajuPillars } from './types'

export function analyzeCreativitySaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  const positions = analyzeSibsinPositions(pillars as never)
  const count = countSibsin(positions)
  const factors: SajuThemeFactor[] = []

  if (count.상관 > 0) {
    factors.push({
      source: `상관 ${count.상관}개`,
      meaning: '재능·표현·예술·기존 틀 깨는 창의 결.',
      tone: 'positive',
    })
  }
  if (count.식신 > 0) {
    factors.push({
      source: `식신 ${count.식신}개`,
      meaning: '온건한 표현·기능·요리·문장 결.',
      tone: 'positive',
    })
  }
  if (count.편인 > 0) {
    factors.push({
      source: `편인 ${count.편인}개`,
      meaning: '비정통·신비·독창적 사고 결.',
      tone: 'mixed',
    })
  }

  const total = count.식신 + count.상관 + count.편인
  if (total === 0) {
    factors.push({
      source: '식상·편인 부재',
      meaning: '창의 결 약함. 정통·실용 지향.',
      tone: 'cautious',
    })
  }

  return {
    theme: 'creativity',
    factors,
    summary: `창의성 영역: 식신 ${count.식신}, 상관 ${count.상관}, 편인 ${count.편인}`,
  }
}
