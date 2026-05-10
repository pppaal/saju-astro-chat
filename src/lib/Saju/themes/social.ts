// Saju/themes/social.ts
// 사회 관계/친구 테마. 비겁(비견·겁재) — 동료·경쟁자.

import { analyzeSibsinPositions, countSibsin } from '../foundation/sibsinAnalysis'
import type { SajuThemeAnalysis, SajuThemeFactor, SimpleSajuPillars } from './types'

export function analyzeSocialSaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  const positions = analyzeSibsinPositions(pillars as never)
  const count = countSibsin(positions)
  const factors: SajuThemeFactor[] = []

  if (count.비견 > 0) {
    factors.push({
      source: `비견 ${count.비견}개`,
      meaning: '동료·동등한 관계·협력 결.',
      tone: 'positive',
    })
  }
  if (count.겁재 > 0) {
    factors.push({
      source: `겁재 ${count.겁재}개`,
      meaning: '경쟁자·재물 다툼 결. 강한 동료지만 갈등.',
      tone: count.겁재 >= 2 ? 'cautious' : 'mixed',
    })
  }

  const total = count.비견 + count.겁재
  if (total === 0) {
    factors.push({
      source: '비겁 없음',
      meaning: '비겁 부재 — 단독·독립 성향. 친구 인연 약함.',
      tone: 'cautious',
    })
  }

  return {
    theme: 'social',
    factors,
    summary: `사회 관계 영역: 비겁=${total}개 (비견 ${count.비견}, 겁재 ${count.겁재})`,
  }
}
