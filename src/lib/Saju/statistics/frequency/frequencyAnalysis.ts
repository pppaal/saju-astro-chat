/**
 * frequencyAnalysis.ts - 빈도 분석
 */

import type { SajuResult, FrequencyAnalysis } from '../../types/statistics'

/**
 * 빈도 분석 수행
 */
export function performFrequencyAnalysis(items: string[]): FrequencyAnalysis[] {
  const counts: Record<string, number> = {}
  const total = items.length

  for (const item of items) {
    counts[item] = (counts[item] || 0) + 1
  }

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([item, count], index) => ({
      item,
      count,
      percentage: (count / total) * 100,
      rank: index + 1,
    }))

  return sorted
}

/**
 * 60갑자 빈도 분석
 */
export function analyzeGabjaFrequency(sajuList: SajuResult[]): {
  yearPillar: FrequencyAnalysis[]
  monthPillar: FrequencyAnalysis[]
  dayPillar: FrequencyAnalysis[]
  hourPillar: FrequencyAnalysis[]
} {
  const yearPillars: string[] = []
  const monthPillars: string[] = []
  const dayPillars: string[] = []
  const hourPillars: string[] = []

  for (const saju of sajuList) {
    const p = saju.fourPillars
    yearPillars.push(`${p.year.stem}${p.year.branch}`)
    monthPillars.push(`${p.month.stem}${p.month.branch}`)
    dayPillars.push(`${p.day.stem}${p.day.branch}`)
    hourPillars.push(`${p.hour.stem}${p.hour.branch}`)
  }

  return {
    yearPillar: performFrequencyAnalysis(yearPillars),
    monthPillar: performFrequencyAnalysis(monthPillars),
    dayPillar: performFrequencyAnalysis(dayPillars),
    hourPillar: performFrequencyAnalysis(hourPillars),
  }
}
