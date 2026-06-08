/**
 * 30일 CalendarCell aggregate + Convergence → destinypal `month` 객체 + `calendar[30]` adapter.
 *
 * destinypal month:
 *   { label, ym, woolun, cautionDays[], goodDays[], bestDay{date,score},
 *     avoidDays[], themes[5], narrative[], converge{date,score,astro,saju,
 *     bothSystems,meaning}, focusDay }
 *
 * destinypal calendar[30]:
 *   Array<{ d, ds, intensity, mark, focus }>
 *
 * 입력:
 *   - month 표시 라벨 (예: "2026년 6월", ym "2026-06")
 *   - CalendarCell[] (그 달의 30일 cells)
 *   - 월운 wolun ganji (선택)
 *   - 옵션 narrative (deriveMonthlyInterpretation 등 derive 결과 직주입)
 *   - convergence (heavy 또는 light) 결과
 */

import type { CalendarCell } from '@/lib/calendar-engine/types'
import type { CalendarGrade } from '@/lib/calendar-engine/derivers/grade'
import { toGanji, type Ganji, pad2 } from './shared'

export interface DestinypalMonthNarrativeItem {
  tag: string
  body: string
}

export interface DestinypalMonthConvergence {
  date: string // "2026-06-30"
  score: number
  astro: string[]
  saju: string[]
  bothSystems: boolean
  meaning?: string
}

export interface DestinypalCalendarDay {
  d: number
  ds: string // "06-15"
  intensity: number // 0..1
  mark: 'caution' | 'avoid' | 'good' | 'best' | 'converge' | 'focus' | null
  focus: boolean
}

export interface DestinypalMonth {
  label: string // "2026년 6월"
  ym: string // "2026-06"
  woolun?: Ganji
  cautionDays: string[] // "06-03"
  goodDays: string[]
  bestDay?: { date: string; score: number } // date "06-04"
  avoidDays: string[]
  narrative: DestinypalMonthNarrativeItem[]
  converge?: DestinypalMonthConvergence
  focusDay: number // 1..30
}

export interface ToMonthOptions {
  /** "2026-06" — 0-padded yyyy-mm */
  ym: string
  /** "2026년 6월" 등 표시 라벨 */
  label?: string
  /** 30일 (또는 가변) CalendarCell 배열 — datetime ISO 가 month/day 매핑에 쓰임. */
  cells: CalendarCell[]
  /** 월운 ganji (선택). */
  woolunStem?: string
  woolunBranch?: string
  /** narrative — derive 결과 직주입. */
  narrative?: DestinypalMonthNarrativeItem[]
  /** convergence — yearConvergence/heavy convergence 결과 직주입. */
  converge?: DestinypalMonthConvergence
  /** focusDay — 어느 날을 펼쳐 보여줄지 (기본: bestDay 의 day). */
  focusDay?: number
  /** caution/avoid/good 임계값 (선택). */
  thresholds?: { caution?: number; avoid?: number; good?: number; best?: number }
  /**
   * 날짜별 점수·등급 — 일진+시진 층 신호로 산출(deriveLayeredScores.daily).
   * 주어지면 마크(good/caution/avoid)는 등급으로, intensity·bestDay 는 그 점수로.
   * key: YYYY-MM-DD.
   */
  dayScores?: Map<string, { score: number; grade: CalendarGrade }>
}

/**
 * CalendarCell[] → destinypal month + calendar[30].
 *
 * scoring:
 *   - cell.derivedScore 가 0..100 — 그대로 intensity (÷100) + mark 결정에 사용.
 *   - caution: 30 미만 / avoid: 20 미만 / good: 70 이상 / best: month 최고점 1일.
 */
export function toMonth(opts: ToMonthOptions): {
  month: DestinypalMonth
  calendar: DestinypalCalendarDay[]
} {
  const th = {
    caution: opts.thresholds?.caution ?? 35,
    avoid: opts.thresholds?.avoid ?? 22,
    good: opts.thresholds?.good ?? 65,
    best: opts.thresholds?.best ?? 75,
  }

  const ymPrefix = opts.ym.slice(5, 7) // "06"

  // 30 (또는 cells 길이) 일치 캘린더
  const calendar: DestinypalCalendarDay[] = []
  let bestScore = -1
  let bestDay = 0
  let bestDs = ''
  const cautionDays: string[] = []
  const goodDays: string[] = []
  const avoidDays: string[] = []

  for (const cell of opts.cells) {
    const dPart = cell.datetime.slice(8, 10) // "DD"
    const d = parseInt(dPart, 10)
    if (!Number.isFinite(d) || d <= 0) continue
    const ds = `${ymPrefix}-${pad2(d)}`
    // 점수: 층별 일점수(dayScores) 우선 — 없으면 절대 derivedScore.
    const layered = opts.dayScores?.get(cell.datetime.slice(0, 10))
    const score = layered ? layered.score : cell.derivedScore
    const intensity = Math.max(0, Math.min(1, score / 100))

    let mark: DestinypalCalendarDay['mark'] = null
    if (layered) {
      // 등급 기준 (일진 층): 0최고/1좋음=good, 3조심=caution, 4지킴=avoid.
      if (layered.grade === 4) {
        mark = 'avoid'
        avoidDays.push(ds)
      } else if (layered.grade === 3) {
        mark = 'caution'
        cautionDays.push(ds)
      } else if (layered.grade <= 1) {
        mark = 'good'
        goodDays.push(ds)
      }
    } else if (score < th.avoid) {
      mark = 'avoid'
      avoidDays.push(ds)
    } else if (score < th.caution) {
      mark = 'caution'
      cautionDays.push(ds)
    } else if (score >= th.good) {
      mark = 'good'
      goodDays.push(ds)
    }
    if (score > bestScore) {
      bestScore = score
      bestDay = d
      bestDs = ds
    }

    calendar.push({
      d,
      ds,
      intensity,
      mark,
      focus: false, // focusDay 결정 후 갱신
    })
  }

  // best mark — 층별 일점수면 그 달 최고날을 항상 best 로(절대 th.best 게이트 생략).
  if (bestDay > 0 && (opts.dayScores ? true : bestScore >= th.best)) {
    const c = calendar.find((c) => c.d === bestDay)
    if (c) c.mark = 'best'
  }

  // focus day
  const focusDay = opts.focusDay ?? bestDay
  for (const c of calendar) {
    if (c.d === focusDay) {
      c.focus = true
      if (!c.mark) c.mark = 'focus'
    }
  }

  // converge mark
  if (opts.converge?.date) {
    const convDay = parseInt(opts.converge.date.slice(8, 10), 10)
    const c = calendar.find((c) => c.d === convDay)
    if (c) {
      c.mark = 'converge'
      c.intensity = Math.max(c.intensity, 0.9)
    }
  }

  // label fallback
  const label = opts.label ?? `${opts.ym.slice(0, 4)}년 ${parseInt(opts.ym.slice(5, 7), 10)}월`

  const woolun =
    opts.woolunStem && opts.woolunBranch ? toGanji(opts.woolunStem, opts.woolunBranch) : undefined

  return {
    month: {
      label,
      ym: opts.ym,
      woolun,
      cautionDays,
      goodDays,
      bestDay: bestDay > 0 ? { date: bestDs, score: Math.round(bestScore) } : undefined,
      avoidDays,
      narrative: opts.narrative ?? [],
      converge: opts.converge,
      focusDay,
    },
    calendar,
  }
}
