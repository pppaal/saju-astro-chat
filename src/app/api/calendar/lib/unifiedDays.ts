import type { NatalContext } from '@/lib/calendar-engine/context/types'
import { buildCalendar } from '@/lib/calendar-engine'
import { deriveDayInterpretation } from './dayInterpretation'
import { rebalanceCalendarDisplayGrades } from './helpers'
import type { YearlyImportantDate } from './yearlyDates'

/**
 * 단일 엔진 경로(P1, 플래그 뒤) — 연간 날짜의 narrative 를 v2 셀에서 직접 만든다.
 *
 * yearlyDates 가 계산한 raw 날짜(점수·grade·*Key)를, 같은 연도 v2 셀에서
 * deriveDayInterpretation 으로 통째로 갈아끼운다. 등급은 **displayScore(=cell
 * derivedScore) 백분위**(rebalanceCalendarDisplayGrades) 를 주입 — v2 점수는
 * 절대 임계로는 한쪽으로 쏠리므로 반드시 percentile 로 등급화해야 정상 분포가 된다.
 *
 * 포맷(formatDateForResponse) 전에 호출 — 포맷터가 *Key 를 균일하게 렌더하고
 * matrix 오버레이/게이팅을 그대로 적용하게 한다. 기본 비활성(플래그 OFF 시 미호출).
 */
export async function buildUnifiedYearDates<T extends YearlyImportantDate>(args: {
  natal: NatalContext
  year: number
  baseDates: T[]
  lang: 'ko' | 'en'
}): Promise<T[]> {
  const { natal, year, baseDates, lang } = args
  if (baseDates.length === 0) return baseDates

  const cells = await buildCalendar(
    natal,
    {
      start: `${year}-01-01T00:00:00.000Z`,
      end: `${year}-12-31T23:59:59.999Z`,
      granularity: 'day',
    },
    { includeEvidence: true }
  )
  const cellByDate = new Map(cells.map((c) => [c.datetime.slice(0, 10), c]))

  // 1) displayScore(=derivedScore) 백분위로 등급 산출 (절대 임계 X).
  const scored = baseDates.map((d) => ({
    date: d.date,
    score: d.score,
    displayScore: cellByDate.get(d.date)?.derivedScore ?? d.score,
  }))
  const gradeByDate = new Map(
    rebalanceCalendarDisplayGrades(scored).map((g) => [g.date, g.displayGrade])
  )

  // 2) 셀이 있는 날은 통합 해석으로 교체, 없으면 원본 유지.
  return baseDates.map((d) => {
    const cell = cellByDate.get(d.date)
    if (!cell) return d
    const grade = gradeByDate.get(d.date) ?? d.grade
    const interp = deriveDayInterpretation({ cell, natal, lang, grade })
    return { ...d, ...interp }
  })
}
