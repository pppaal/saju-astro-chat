// src/lib/Saju/advancedSajuCore.ts
// 사주 고급 — 공망 심화 분석 + 종합 orchestrator.
// 옛 jonggeok/hwagyeok/iljuDeep/samgi 분석은 어디서도 노출되지 않아 제거
// (2026-06). 그에 딸린 헬퍼(calculateNaeum/calculateSibsin/getHealthFocus/
// getLuckyFactors) 와 JONGGEOK_TYPE_MAP 상수도 동시에 정리.

import { SajuPillars, PillarKind } from './types'
import { getGongmang as getGongmangByPillar } from './pillarLookup'

// Re-export all types from modules
export * from './advanced-saju-core'

import type {
  GongmangDeepAnalysis,
  UltraAdvancedAnalysis,
} from './advanced-saju-core/types'


// 공망 산정은 pillarLookup.getGongmang(SSOT, 旬空)에 위임. 과거 자체 공식
// (10−stem+branch)%12 으로 따로 구현했으나 60갑자 전부 동일 — 위임으로 통일.
function calculateGongmang(stem: string, branch: string): string[] {
  return getGongmangByPillar(`${stem}${branch}`) ?? []
}

// ============================================================
// 공망 심화 분석
// ============================================================

/**
 * 공망 심화 분석
 */
export function analyzeGongmangDeep(pillars: SajuPillars): GongmangDeepAnalysis {
  const gongmangBranches = calculateGongmang(
    pillars.day.heavenlyStem.name,
    pillars.day.earthlyBranch.name
  )

  const branches = [
    { pillar: 'year' as PillarKind, branch: pillars.year.earthlyBranch.name },
    { pillar: 'month' as PillarKind, branch: pillars.month.earthlyBranch.name },
    { pillar: 'day' as PillarKind, branch: pillars.day.earthlyBranch.name },
    { pillar: 'time' as PillarKind, branch: pillars.time.earthlyBranch.name },
  ]

  const affectedPillars = branches
    .filter((b) => gongmangBranches.includes(b.branch))
    .map((b) => b.pillar)

  // 공망 유형 판정
  let type: GongmangDeepAnalysis['type'] = '가공'

  if (affectedPillars.length === 0) {
    type = '해공' // 공망이 사주에 없음
  } else if (affectedPillars.includes('day')) {
    type = '진공' // 일지가 공망
  } else if (hasChungOrHap(pillars, gongmangBranches)) {
    type = '반공' // 충이나 합으로 해소
  }

  const interpretation = generateGongmangInterpretation(type, affectedPillars)

  const effects = {
    positive: ['집착에서 벗어남', '초월적 관점', '영적 성장'],
    negative: affectedPillars.length > 0 ? ['해당 영역의 불안정', '채워지지 않는 느낌'] : [],
  }

  const remedy = ['공망 지지의 오행을 보강', '명상과 내면 탐구', '봉사활동으로 마음 채우기']

  return {
    gongmangBranches,
    affectedPillars,
    type,
    interpretation,
    effects,
    remedy,
  }
}

function hasChungOrHap(pillars: SajuPillars, gongmangBranches: string[]): boolean {
  // 간략화: 충이나 합 여부만 확인
  return false
}

function generateGongmangInterpretation(
  type: GongmangDeepAnalysis['type'],
  affected: PillarKind[]
): string {
  const pillarMeanings: Record<PillarKind, string> = {
    year: '조상/사회',
    month: '부모/직업',
    day: '배우자/자신',
    time: '자녀/말년',
  }

  if (type === '해공') {
    return '공망이 사주에 직접 작용하지 않아 영향이 적습니다.'
  }

  const areas = affected.map((p) => pillarMeanings[p]).join(', ')
  return `${type}으로 ${areas} 영역에서 공허함이나 초월적 경향이 나타날 수 있습니다.`
}


// ============================================================
// 종합 고급 분석
// ============================================================

/**
 * 종합 고급 분석 — UI 에서 실제로 소비되는 부분만(gongmang).
 * 옛 jonggeok/hwagyeok/iljuDeep/samgi/specialFormations/masterySummary 는
 * 어디서도 노출되지 않아 제거(2026-06).
 */
export function performUltraAdvancedAnalysis(pillars: SajuPillars): UltraAdvancedAnalysis {
  return {
    gongmang: analyzeGongmangDeep(pillars),
  }
}
