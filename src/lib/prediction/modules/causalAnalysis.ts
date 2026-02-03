// src/lib/prediction/modules/causalAnalysis.ts
// 인과 요인 분석 모듈

import type { FiveElement } from '../timingScore'
import type { CausalFactor } from './types'

// ============================================================
// 상수 정의
// ============================================================

const STEM_ELEMENT: Record<string, FiveElement> = {
  甲: '목',
  乙: '목',
  丙: '화',
  丁: '화',
  戊: '토',
  己: '토',
  庚: '금',
  辛: '금',
  壬: '수',
  癸: '수',
}

// ============================================================
// 인과 요인 분석
// ============================================================

/**
 * 왜 그런 일이 일어났는지 분석
 */
export function analyzeCausalFactors(
  dayStem: string,
  dayBranch: string,
  targetStem: string,
  targetBranch: string,
  daeunStem?: string,
  daeunBranch?: string,
  yongsin?: FiveElement[],
  kisin?: FiveElement[]
): CausalFactor[] {
  const factors: CausalFactor[] = []

  // 1. 천간 충 분석
  const stemClashes: [string, string][] = [
    ['甲', '庚'],
    ['乙', '辛'],
    ['丙', '壬'],
    ['丁', '癸'],
    ['戊', '甲'],
  ]
  for (const [s1, s2] of stemClashes) {
    if ((dayStem === s1 && targetStem === s2) || (dayStem === s2 && targetStem === s1)) {
      factors.push({
        type: 'stem_clash',
        factor: `${dayStem}-${targetStem} 천간충`,
        description: '일간과 당일/당월 천간의 충돌로 갈등과 변화 발생',
        impact: 'major_negative',
        score: -25,
        affectedAreas: ['대인관계', '사업', '건강'],
      })
    }
  }

  // 2. 지지 충 분석
  const branchClashes: [string, string][] = [
    ['子', '午'],
    ['丑', '未'],
    ['寅', '申'],
    ['卯', '酉'],
    ['辰', '戌'],
    ['巳', '亥'],
  ]
  for (const [b1, b2] of branchClashes) {
    if ((dayBranch === b1 && targetBranch === b2) || (dayBranch === b2 && targetBranch === b1)) {
      factors.push({
        type: 'branch_clash',
        factor: `${dayBranch}-${targetBranch} 지지충`,
        description: '일지와의 충으로 환경 변화, 이동, 분리의 가능성',
        impact: 'negative',
        score: -20,
        affectedAreas: ['주거', '직장', '관계'],
      })
    }
  }

  // 3. 삼합 분석
  const tripleHarmonies: [string, string, string, FiveElement][] = [
    ['申', '子', '辰', '수'],
    ['寅', '午', '戌', '화'],
    ['巳', '酉', '丑', '금'],
    ['亥', '卯', '未', '목'],
  ]
  for (const [b1, b2, b3, element] of tripleHarmonies) {
    if ([b1, b2, b3].includes(dayBranch) && [b1, b2, b3].includes(targetBranch)) {
      factors.push({
        type: 'branch_harmony',
        factor: `${b1}${b2}${b3} 삼합 (${element})`,
        description: `삼합의 기운으로 ${element} 에너지 강화, 협력과 성취`,
        impact: 'major_positive',
        score: 25,
        affectedAreas:
          element === '화'
            ? ['명예', '승진']
            : element === '수'
              ? ['재물', '지혜']
              : element === '금'
                ? ['결단', '성취']
                : ['성장', '발전'],
      })
    }
  }

  // 4. 용신 활성화 분석
  const targetElement = STEM_ELEMENT[targetStem]
  if (yongsin?.includes(targetElement)) {
    factors.push({
      type: 'yongsin_activation',
      factor: `용신 ${targetElement} 활성화`,
      description: '용신 오행이 활성화되어 운세 상승, 기회 포착',
      impact: 'major_positive',
      score: 30,
      affectedAreas: ['전반적 운세', '건강', '재물'],
    })
  }

  // 5. 기신 활성화 분석
  if (kisin?.includes(targetElement)) {
    factors.push({
      type: 'kisin_activation',
      factor: `기신 ${targetElement} 활성화`,
      description: '기신 오행이 활성화되어 어려움과 장애물 증가',
      impact: 'negative',
      score: -20,
      affectedAreas: ['건강', '재물', '대인관계'],
    })
  }

  // 6. 대운 전환 분석
  if (daeunStem && daeunBranch) {
    const daeunElement = STEM_ELEMENT[daeunStem]
    if (yongsin?.includes(daeunElement)) {
      factors.push({
        type: 'daeun_transition',
        factor: `대운 용신 ${daeunElement} 지지`,
        description: '현재 대운이 용신을 지지하여 장기적 상승 흐름',
        impact: 'positive',
        score: 20,
        affectedAreas: ['장기 운세', '커리어', '성장'],
      })
    }
  }

  return factors.sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
}
