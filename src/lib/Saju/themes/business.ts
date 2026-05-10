// Saju/themes/business.ts
// 사업/창업 테마. 편재(변동 재물) + 식상관(생재) + 비겁(자력).

import { analyzeSibsinPositions, countSibsin } from '../foundation/sibsinAnalysis'
import type { SajuThemeAnalysis, SajuThemeFactor, SimpleSajuPillars } from './types'

export function analyzeBusinessSaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  const positions = analyzeSibsinPositions(pillars as never)
  const count = countSibsin(positions)
  const factors: SajuThemeFactor[] = []

  const dynamic = count.편재 + count.상관
  const stable = count.정재 + count.식신
  const independent = count.비견 + count.겁재

  if (count.편재 > 0) {
    factors.push({
      source: `편재 ${count.편재}개`,
      meaning: '변동 재물·외부 자산·중개·투자형 결.',
      tone: 'positive',
    })
  }
  if (count.상관 > 0) {
    factors.push({
      source: `상관 ${count.상관}개`,
      meaning: '재능·표현·기존 틀 깨는 결 — 창업 친화.',
      tone: 'positive',
    })
  }
  if (independent > 0) {
    factors.push({
      source: `비겁 ${independent}개`,
      meaning: '자력·독립 추진력. 사업 자력 결.',
      tone: 'mixed',
    })
  }
  if (dynamic === 0 && stable > 0) {
    factors.push({
      source: '안정형 (정재·식신)',
      meaning: '큰 변동보다 정규 직장·안정 수입형. 사업 적성 약함.',
      tone: 'cautious',
    })
  }

  return {
    theme: 'business',
    factors,
    summary: `사업 영역: 편재 ${count.편재}, 상관 ${count.상관}, 비겁 ${independent}`,
  }
}
