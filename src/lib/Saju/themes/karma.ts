// Saju/themes/karma.ts
// 카르마/전생 테마. 사주는 직접 등가 약함 — 원진살·신살·격국 종합으로 추론.

import { analyzeSibsinPositions, countSibsin } from '../foundation/sibsinAnalysis'
import type { SajuThemeAnalysis, SajuThemeFactor, SimpleSajuPillars } from './types'

const WONJIN_PAIRS: [string, string][] = [
  ['子', '未'], ['丑', '午'], ['寅', '酉'], ['卯', '申'], ['辰', '亥'], ['巳', '戌'],
]

export function analyzeKarmaSaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  const positions = analyzeSibsinPositions(pillars as never)
  const count = countSibsin(positions)
  const factors: SajuThemeFactor[] = []

  const branches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch]

  // 원진살 검사
  const wonjinHits: string[] = []
  for (const [a, b] of WONJIN_PAIRS) {
    if (branches.includes(a) && branches.includes(b)) {
      wonjinHits.push(`${a}-${b}`)
    }
  }
  if (wonjinHits.length > 0) {
    factors.push({
      source: `원진살 ${wonjinHits.join(', ')}`,
      meaning: '미해소 원망·전생 인연·풀어야 할 카르마 결.',
      tone: 'cautious',
    })
  }

  // 종왕격·종살격 등 종격은 카르마 결 강함
  if (count.편관 >= 2 || count.편인 >= 2) {
    factors.push({
      source: `편관 ${count.편관}, 편인 ${count.편인}`,
      meaning: '편향 십성 다수 — 강한 운명적 부담·전생 잔재 가능.',
      tone: 'mixed',
    })
  }

  if (factors.length === 0) {
    factors.push({
      source: '원진·편향 약함',
      meaning: '카르마 부담 적은 결. 균형 운명.',
      tone: 'positive',
    })
  }

  return {
    theme: 'karma',
    factors,
    summary: `카르마 영역: 원진 ${wonjinHits.length}, 편관·편인 ${count.편관 + count.편인}`,
  }
}
