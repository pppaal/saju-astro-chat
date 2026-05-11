// Saju/themes/crisis.ts
// 위기/변환 테마. 형충회합·신살 (백호·괴강·양인) + 편관.

import { analyzeSibsinPositions, countSibsin } from '../sibsinAnalysis'
import type { SajuThemeAnalysis, SajuThemeFactor, SimpleSajuPillars } from './types'

// 충(沖) 페어
const CHUNG_PAIRS: [string, string][] = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
]

export function analyzeCrisisSaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  const positions = analyzeSibsinPositions(pillars as never)
  const count = countSibsin(positions)
  const factors: SajuThemeFactor[] = []

  const branches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch]

  // 충(沖) 검사
  const chungHits: string[] = []
  for (const [a, b] of CHUNG_PAIRS) {
    if (branches.includes(a) && branches.includes(b)) {
      chungHits.push(`${a}-${b}`)
    }
  }
  if (chungHits.length > 0) {
    factors.push({
      source: `지지충 ${chungHits.join(', ')}`,
      meaning: '큰 변동·전환·위기 통과 결. 깊은 변환 가능성.',
      tone: 'cautious',
    })
  }

  if (count.편관 >= 2) {
    factors.push({
      source: `편관 ${count.편관}개`,
      meaning: '강한 압박·치열한 위기 결. 단련 통한 성장.',
      tone: 'mixed',
    })
  }

  if (factors.length === 0) {
    factors.push({
      source: '충·편관 약함',
      meaning: '큰 위기 결 약함. 평이한 흐름.',
      tone: 'positive',
    })
  }

  return {
    theme: 'crisis',
    factors,
    summary: `위기 영역: 충 ${chungHits.length}, 편관 ${count.편관}`,
  }
}
