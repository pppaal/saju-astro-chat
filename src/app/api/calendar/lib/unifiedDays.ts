import type { NatalContext } from '@/lib/calendar-engine/context/types'
import { getOrBuildMonth } from '@/lib/calendar-engine/cell-cache'
import { deriveDayInterpretation } from './dayInterpretation'
import { rebalanceCalendarDisplayGrades } from './helpers'
import type { YearlyImportantDate } from './yearlyDates'

/**
 * 단일 엔진 경로(P1, 플래그 뒤) — 연간 날짜의 narrative 를 v2 셀에서 직접 만든다.
 *
 * yearlyDates 가 계산한 raw 날짜에서, 같은 연도 v2 셀로 narrative(title/desc/요소/
 * 추천/경고/운주기/교차충합형/scoreBreakdown)만 갈아끼운다. grade/score/displayScore/
 * categories 는 원본(matrix regrade) 유지 — 점수·등급 모델 이중화 방지.
 *
 * narrative valence 는 **displayScore(=cell derivedScore) 백분위**(최종 displayGrade
 * 예측치)로 구동 — v2 점수는 절대 임계로는 쏠리므로 percentile 등급이 맞다.
 *
 * 셀은 route 와 동일한 cell-cache(getOrBuildMonth)로 월별 빌드 — ±3달은 route 와
 * 캐시 공유, 나머지도 다음 요청부터 HIT. 포맷(formatDateForResponse) 전에 호출해
 * 포맷터가 *Key 균일 렌더 + matrix 오버레이를 그대로 적용하게 한다. 기본 비활성.
 */
export async function buildUnifiedYearDates<T extends YearlyImportantDate>(args: {
  natal: NatalContext
  year: number
  baseDates: T[]
  lang: 'ko' | 'en'
  birthKey: string
}): Promise<T[]> {
  const { natal, year, baseDates, lang, birthKey } = args
  if (baseDates.length === 0) return baseDates

  // 월별 셀 빌드 (cell-cache 재사용) → 날짜별 맵.
  const cellByDate = new Map<string, Awaited<ReturnType<typeof getOrBuildMonth>>['cells'][number]>()
  for (let m = 0; m < 12; m++) {
    const start = new Date(Date.UTC(year, m, 1))
    const end = new Date(Date.UTC(year, m + 1, 0, 23, 59, 59))
    const { cells } = await getOrBuildMonth({
      birthKey,
      monthKey: `${year}-${String(m + 1).padStart(2, '0')}`,
      natal,
      range: { start: start.toISOString(), end: end.toISOString(), granularity: 'day' },
      options: { includeEvidence: true },
    })
    for (const c of cells) cellByDate.set(c.datetime.slice(0, 10), c)
  }

  // displayScore(=derivedScore) 백분위로 등급 산출 (절대 임계 X).
  const scored = baseDates.map((d) => ({
    date: d.date,
    score: d.score,
    displayScore: cellByDate.get(d.date)?.derivedScore ?? d.score,
  }))
  const gradeByDate = new Map(
    rebalanceCalendarDisplayGrades(scored).map((g) => [g.date, g.displayGrade])
  )

  // 셀이 있는 날만 narrative 교체. 포맷터가 소비/전달하는 필드만 머지
  // (ganzhi/crossCheck/transitSunSign 등은 포맷터가 allDates 로 안 보내므로 — 옛
  // 경로와 동일 — 생략). crossAgreementPercent·confidence 는 포맷터 coherence 로직
  // 입력이라 유지.
  return baseDates.map((d) => {
    const cell = cellByDate.get(d.date)
    if (!cell) return d
    const grade = gradeByDate.get(d.date) ?? d.grade
    const interp = deriveDayInterpretation({ cell, natal, lang, grade })
    return {
      ...d,
      titleKey: interp.titleKey,
      descKey: interp.descKey,
      sajuFactorKeys: interp.sajuFactorKeys,
      astroFactorKeys: interp.astroFactorKeys,
      recommendationKeys: interp.recommendationKeys,
      warningKeys: interp.warningKeys,
      crossAgreementPercent: interp.crossAgreementPercent,
      confidence: interp.confidence,
      longCycleContext: interp.longCycleContext,
      cycleInteractions: interp.cycleInteractions,
      scoreBreakdown: interp.scoreBreakdown,
    }
  })
}
