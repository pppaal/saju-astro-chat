/**
 * correlationAnalysis.ts - 상관관계 분석
 */

import type { SajuResult, CorrelationResult } from '../../types/statistics'
import { calculateCorrelation } from '../core/basicStats'
import { getStemElement, getBranchElement } from '../helpers/elementHelpers'

/**
 * 오행과 특성 간 상관관계 분석
 */
export function analyzeElementCorrelations(
  sajuList: SajuResult[],
  attributes: { sajuIndex: number; attribute: number }[]
): CorrelationResult[] {
  const results: CorrelationResult[] = []
  const elements = ['목', '화', '토', '금', '수']

  for (const element of elements) {
    // 각 사주의 해당 오행 개수
    const elementCounts = sajuList.map((saju) => {
      const pillars = saju.fourPillars
      let count = 0
      const stems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem]
      const branches = [
        pillars.year.branch,
        pillars.month.branch,
        pillars.day.branch,
        pillars.hour.branch,
      ]

      for (const stem of stems) {
        if (getStemElement(stem) === element) {
          count++
        }
      }
      for (const branch of branches) {
        if (getBranchElement(branch) === element) {
          count++
        }
      }
      return count
    })

    // 속성 값 배열
    const attributeValues = attributes.map((a) => a.attribute)

    // 상관계수 계산
    const correlation = calculateCorrelation(elementCounts, attributeValues)

    // 유의성 판단
    let significance: 'strong' | 'moderate' | 'weak' | 'none'
    const absCorr = Math.abs(correlation)
    if (absCorr >= 0.7) {
      significance = 'strong'
    } else if (absCorr >= 0.4) {
      significance = 'moderate'
    } else if (absCorr >= 0.2) {
      significance = 'weak'
    } else {
      significance = 'none'
    }

    results.push({
      variable1: `${element} 오행`,
      variable2: '속성',
      correlation,
      pValue: absCorr >= 0.4 ? 0.05 : 0.5, // 간략화
      significance,
    })
  }

  return results
}
