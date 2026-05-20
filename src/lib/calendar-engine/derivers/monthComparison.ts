import type { CalendarCell } from '../types'

/**
 * "지난달 대비" — 전월 비교 (retention hook).
 *
 * 사용자가 이번 달만 보면 "그래서 좋아진 거야 나빠진 거야?" 를 모름.
 * 전월 themeScore / 전체 흐름 점수와의 차이를 보여줘 *변화* 를 체감시킴.
 *   "지난달보다 재물 +14 · 직업 +6" 식.
 *
 * 모두 이미 계산된 themeScores + cells.derivedScore 에서 결정적으로 추출 —
 * 새 계산/LLM 없음.
 */

export type ComparisonThemeKey = 'love' | 'money' | 'career' | 'health' | 'growth'

export interface MonthComparison {
  /** 지난달 대비 전체 흐름 점수 변화 (avg derivedScore, 반올림) */
  overallDelta: number
  /** 의미있게 변한 테마 (|delta| ≥ 3), 변화 큰 순 top 3 */
  themes: Array<{ theme: ComparisonThemeKey; delta: number; dir: 'up' | 'down' }>
}

const THEME_KEYS: ComparisonThemeKey[] = ['love', 'money', 'career', 'health', 'growth']

function avgScore(cells: CalendarCell[]): number {
  const scored = cells.filter((c) => typeof c.derivedScore === 'number')
  if (scored.length === 0) return 0
  return scored.reduce((a, c) => a + c.derivedScore, 0) / scored.length
}

export function deriveMonthComparison(args: {
  currCells: CalendarCell[]
  prevCells: CalendarCell[]
  currScores?: Partial<Record<ComparisonThemeKey, number>>
  prevScores?: Partial<Record<ComparisonThemeKey, number>>
}): MonthComparison | undefined {
  const { currCells, prevCells, currScores = {}, prevScores = {} } = args
  // 양쪽 모두 한 달치(≈7일+)가 있어야 비교가 의미 있음.
  if (prevCells.length < 7 || currCells.length < 7) return undefined

  const overallDelta = Math.round(avgScore(currCells) - avgScore(prevCells))

  const themes = THEME_KEYS.map((theme) => {
    const c = currScores[theme]
    const p = prevScores[theme]
    if (typeof c !== 'number' || typeof p !== 'number') return null
    const delta = c - p
    return { theme, delta, dir: (delta >= 0 ? 'up' : 'down') as 'up' | 'down' }
  })
    .filter(
      (x): x is { theme: ComparisonThemeKey; delta: number; dir: 'up' | 'down' } =>
        x !== null && Math.abs(x.delta) >= 3
    )
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3)

  if (themes.length === 0 && overallDelta === 0) return undefined
  return { overallDelta, themes }
}
