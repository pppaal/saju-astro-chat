import type { CalendarCell } from '../types'

/**
 * "지난달 대비" — 전월 비교 (retention hook).
 *
 * 사용자가 이번 달만 보면 "그래서 좋아진 거야 나빠진 거야?" 를 모름.
 * 전월 전체 흐름 점수(avg derivedScore)와의 차이를 보여줘 *변화* 를 체감시킴.
 *   "지난달보다 +6" 식. (5버킷 테마 축 제거 — 전체 흐름 delta 만.)
 *
 * cells.derivedScore 에서 결정적으로 추출 — 새 계산/LLM 없음.
 */

export interface MonthComparison {
  /** 지난달 대비 전체 흐름 점수 변화 (avg derivedScore, 반올림) */
  overallDelta: number
}

function avgScore(cells: CalendarCell[]): number {
  const scored = cells.filter((c) => typeof c.derivedScore === 'number')
  if (scored.length === 0) return 0
  return scored.reduce((a, c) => a + c.derivedScore, 0) / scored.length
}

export function deriveMonthComparison(args: {
  currCells: CalendarCell[]
  prevCells: CalendarCell[]
}): MonthComparison | undefined {
  const { currCells, prevCells } = args
  // 양쪽 모두 한 달치(≈7일+)가 있어야 비교가 의미 있음.
  if (prevCells.length < 7 || currCells.length < 7) return undefined

  const overallDelta = Math.round(avgScore(currCells) - avgScore(prevCells))

  if (overallDelta === 0) return undefined
  return { overallDelta }
}
