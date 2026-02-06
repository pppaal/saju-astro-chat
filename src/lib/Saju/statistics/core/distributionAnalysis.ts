/**
 * distributionAnalysis.ts - 사주 분포 분석
 */

import type {
  SajuResult,
  ElementDistribution,
  StemDistribution,
  BranchDistribution,
} from '../../types/statistics'
import { getStemElement, getBranchElement, getStemYinYang } from '../helpers/elementHelpers'

/**
 * 오행 분포 계산
 */
export function calculateElementDistribution(sajuList: SajuResult[]): ElementDistribution {
  const distribution: ElementDistribution = {
    목: 0,
    화: 0,
    토: 0,
    금: 0,
    수: 0,
    total: 0,
  }

  for (const saju of sajuList) {
    const pillars = saju.fourPillars

    // 천간 오행
    const stems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem]
    for (const stem of stems) {
      const element = getStemElement(stem) as keyof ElementDistribution
      if (element in distribution && element !== 'total') {
        distribution[element]++
        distribution.total++
      }
    }

    // 지지 오행
    const branches = [
      pillars.year.branch,
      pillars.month.branch,
      pillars.day.branch,
      pillars.hour.branch,
    ]
    for (const branch of branches) {
      const element = getBranchElement(branch) as keyof ElementDistribution
      if (element in distribution && element !== 'total') {
        distribution[element]++
        distribution.total++
      }
    }
  }

  return distribution
}

/**
 * 천간 분포 계산
 */
export function calculateStemDistribution(sajuList: SajuResult[]): StemDistribution {
  const distribution: StemDistribution = {
    甲: 0,
    乙: 0,
    丙: 0,
    丁: 0,
    戊: 0,
    己: 0,
    庚: 0,
    辛: 0,
    壬: 0,
    癸: 0,
    total: 0,
  }

  for (const saju of sajuList) {
    const pillars = saju.fourPillars
    const stems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem]

    for (const stem of stems) {
      if (stem in distribution && stem !== 'total') {
        distribution[stem]++
        distribution.total++
      }
    }
  }

  return distribution
}

/**
 * 지지 분포 계산
 */
export function calculateBranchDistribution(sajuList: SajuResult[]): BranchDistribution {
  const distribution: BranchDistribution = {
    子: 0,
    丑: 0,
    寅: 0,
    卯: 0,
    辰: 0,
    巳: 0,
    午: 0,
    未: 0,
    申: 0,
    酉: 0,
    戌: 0,
    亥: 0,
    total: 0,
  }

  for (const saju of sajuList) {
    const pillars = saju.fourPillars
    const branches = [
      pillars.year.branch,
      pillars.month.branch,
      pillars.day.branch,
      pillars.hour.branch,
    ]

    for (const branch of branches) {
      if (branch in distribution && branch !== 'total') {
        distribution[branch]++
        distribution.total++
      }
    }
  }

  return distribution
}

/**
 * 일간(일주 천간) 분포 계산
 */
export function calculateDayMasterDistribution(sajuList: SajuResult[]): StemDistribution {
  const distribution: StemDistribution = {
    甲: 0,
    乙: 0,
    丙: 0,
    丁: 0,
    戊: 0,
    己: 0,
    庚: 0,
    辛: 0,
    壬: 0,
    癸: 0,
    total: 0,
  }

  for (const saju of sajuList) {
    const dayMaster = saju.fourPillars.day.stem
    if (dayMaster in distribution && dayMaster !== 'total') {
      distribution[dayMaster]++
      distribution.total++
    }
  }

  return distribution
}

/**
 * 음양 비율 계산
 */
export function calculateYinYangRatio(sajuList: SajuResult[]): { yin: number; yang: number } {
  let yin = 0
  let yang = 0

  for (const saju of sajuList) {
    const dayMaster = saju.fourPillars.day.stem
    if (getStemYinYang(dayMaster) === '음') {
      yin++
    } else {
      yang++
    }
  }

  return { yin, yang }
}
