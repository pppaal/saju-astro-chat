/**
 * 본명 고정 사실 신호의 창 — 빌드 범위와 무관한 규칙(재감사 CC-7, G13).
 *
 * 본명 격국명·패턴·일주 archetype·본명 Almuten 처럼 출생 차트만으로 정해지는 신호는 예전에
 * 창 = 빌드 범위라 1일 빌드와 월 빌드의 창(과 그 창을 쓰는 id)이 갈렸다. 여기선 범위가 닿는
 * *민용 연도* 마다 한 신호를 내고, 창은 그 해 01-01 00:00 ~ 12-31 23:59:59.999 (floating
 * 'Z' — index.ts 셀 버킷 계약)로 둔다. 신호 id 는 연도로 끝난다. 그래서 같은 날 셀은 어떤
 * 범위로 빌드해도 같은 id·창의 신호를 받는다.
 *
 * 매일 내는 본명 표지(격국 성패)는 `civilDaysOf` 로 범위가 닿는 민용 날짜마다 하루 창을 낸다.
 */
import { addDays, rangeDates, type DateRangeLike } from '../../periodPillars'

export interface CivilYearWindow {
  /** 4자리 연도 — 신호 id 접미사. */
  year: string
  start: string
  peak: string
  end: string
}

/**
 * 범위가 닿는 민용 연도별 창. `clip` 이 있으면 그 날짜 구간(YYYY-MM-DD, 포함)으로 자르고,
 * 잘라서 비는 해는 뺀다 — clip 도 본명만의 함수여야 범위 불변이 유지된다.
 */
export function civilYearWindows(
  range: DateRangeLike,
  clip?: { from?: string; to?: string }
): CivilYearWindow[] {
  const { from, to } = rangeDates(range)
  const out: CivilYearWindow[] = []
  for (let y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)); y++) {
    const year = String(y).padStart(4, '0')
    let startDay = `${year}-01-01`
    let endDay = `${year}-12-31`
    if (clip?.from && clip.from > startDay) startDay = clip.from
    if (clip?.to && clip.to < endDay) endDay = clip.to
    if (startDay > endDay) continue
    const start = `${startDay}T00:00:00.000Z`
    out.push({ year, start, peak: start, end: `${endDay}T23:59:59.999Z` })
  }
  return out
}

/** 범위가 닿는 민용 날짜들(YYYY-MM-DD, 양 끝 포함). */
export function civilDaysOf(range: DateRangeLike): string[] {
  const { from, to } = rangeDates(range)
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}
