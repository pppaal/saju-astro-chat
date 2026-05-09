// Saju/themes/personality.ts
// 성격 테마. sibsinAnalysis.ts:analyzePersonality 를 SajuPillars 기반 wrapper 로 노출.

import {
  analyzeSibsinPositions,
  countSibsin,
  countSibsinByCategory,
  analyzePersonality,
} from '../foundation/sibsinAnalysis'
import type { SajuThemeAnalysis, SajuThemeFactor, SimpleSajuPillars } from './types'

export function analyzePersonalitySaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  const positions = analyzeSibsinPositions(pillars as never)
  const count = countSibsin(positions)
  const categoryCount = countSibsinByCategory(count)
  const traits = analyzePersonality(count, categoryCount)

  const factors: SajuThemeFactor[] = traits.map((trait) => ({
    source: `일간 ${pillars.day.stem} 기준 십신 분포`,
    meaning: trait,
    tone: 'neutral' as const,
  }))

  return {
    theme: 'personality',
    factors,
    summary: `성격: ${traits.length}개 특질 — 일간 ${pillars.day.stem} + 십신 분포 기반.`,
  }
}
