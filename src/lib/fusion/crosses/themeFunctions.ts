// fusion/crosses/themeFunctions.ts
// 18 테마별 사주·점성 wrapper 매핑 (theme key → analyzer 함수).

import type { Chart } from '@/lib/astrology/foundation/types'
import type { SajuThemeAnalysis } from '@/lib/saju/themes/types'
import type { AstroThemeAnalysis } from '@/lib/astrology/themes/types'
import type { SimpleSajuPillars, SajuThemeKey } from '@/lib/saju/themes/types'

import {
  analyzeLoveSaju, analyzeMoneySaju, analyzeFamilySaju, analyzePersonalitySaju,
  analyzeStudySaju, analyzeChildrenSaju, analyzeParentsSaju, analyzeTravelSaju,
  analyzeSocialSaju, analyzeBusinessSaju, analyzeReputationSaju,
  analyzeSpiritualitySaju, analyzeKarmaSaju, analyzeCrisisSaju,
  analyzeCreativitySaju, analyzeLegalSaju,
} from '@/lib/saju/themes'
import { analyzeCareerSaju } from '@/lib/saju/themes/career'
import { analyzeHealthSaju } from '@/lib/saju/themes/health'

import {
  analyzeLoveAstro, analyzeMoneyAstro, analyzeCareerAstro, analyzeFamilyAstro,
  analyzeHealthAstro, analyzePersonalityAstro,
  analyzeStudyAstro, analyzeChildrenAstro, analyzeParentsAstro, analyzeTravelAstro,
  analyzeSocialAstro, analyzeBusinessAstro, analyzeReputationAstro,
  analyzeSpiritualityAstro, analyzeKarmaAstro, analyzeCrisisAstro,
  analyzeCreativityAstro, analyzeLegalAstro,
} from '@/lib/astrology/themes'

// career·health Saju 는 SajuPillars (다른 type) 받음 — 어댑터 필요
function adaptCareerSaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  // healthCareer 의 analyzeCareer 는 다른 SajuPillars 모양 (hour 필드) 기대 — 그대로 캐스트
  const result = analyzeCareerSaju(pillars as never)
  return {
    theme: 'career',
    factors: result.primaryFields.slice(0, 3).map((f) => ({
      source: f.category,
      meaning: f.description,
      tone: 'positive' as const,
    })),
    summary: `직업 영역: ${result.primaryFields[0]?.category ?? '분석 불가'} (창업성 ${result.entrepreneurialScore})`,
  }
}

function adaptHealthSaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  const result = analyzeHealthSaju(pillars as never)
  return {
    theme: 'health',
    factors: (result.organHealth ?? []).slice(0, 3).map((o) => ({
      source: `${o.organ} (${o.element})`,
      meaning: o.description,
      tone: o.status === 'strong' ? 'positive'
          : o.status === 'weak' || o.status === 'vulnerable' ? 'cautious'
          : 'neutral' as const,
    })),
    summary: `건강 영역: ${result.constitution} (${result.dominantElement} 우세)`,
  }
}

export const SAJU_THEME_FN: Record<SajuThemeKey, (p: SimpleSajuPillars) => SajuThemeAnalysis> = {
  love:         analyzeLoveSaju,
  money:        analyzeMoneySaju,
  career:       adaptCareerSaju,
  family:       analyzeFamilySaju,
  health:       adaptHealthSaju,
  personality:  analyzePersonalitySaju,
  study:        analyzeStudySaju,
  children:     analyzeChildrenSaju,
  parents:      analyzeParentsSaju,
  travel:       analyzeTravelSaju,
  social:       analyzeSocialSaju,
  business:     analyzeBusinessSaju,
  reputation:   analyzeReputationSaju,
  spirituality: analyzeSpiritualitySaju,
  karma:        analyzeKarmaSaju,
  crisis:       analyzeCrisisSaju,
  creativity:   analyzeCreativitySaju,
  legal:        analyzeLegalSaju,
}

export const ASTRO_THEME_FN: Record<SajuThemeKey, (c: Chart) => AstroThemeAnalysis> = {
  love:         analyzeLoveAstro,
  money:        analyzeMoneyAstro,
  career:       analyzeCareerAstro,
  family:       analyzeFamilyAstro,
  health:       analyzeHealthAstro,
  personality:  analyzePersonalityAstro,
  study:        analyzeStudyAstro,
  children:     analyzeChildrenAstro,
  parents:      analyzeParentsAstro,
  travel:       analyzeTravelAstro,
  social:       analyzeSocialAstro,
  business:     analyzeBusinessAstro,
  reputation:   analyzeReputationAstro,
  spirituality: analyzeSpiritualityAstro,
  karma:        analyzeKarmaAstro,
  crisis:       analyzeCrisisAstro,
  creativity:   analyzeCreativityAstro,
  legal:        analyzeLegalAstro,
}
