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
import { toGanji, type Ganji, pad2 } from './shared'

export interface DestinypalMonthThemeBar {
  key: 'love' | 'money' | 'career' | 'health' | 'growth'
  ko: string
  v: number // 0..100
}

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
  themes: DestinypalMonthThemeBar[]
  narrative: DestinypalMonthNarrativeItem[]
  converge?: DestinypalMonthConvergence
  focusDay: number // 1..30
}

const THEME_KO: Record<DestinypalMonthThemeBar['key'], string> = {
  love: '재성·연애',
  money: '재물',
  career: '관성·일',
  health: '건강',
  growth: '성장',
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
}

/**
 * CalendarCell[] → destinypal month + calendar[30].
 *
 * scoring:
 *   - cell.derivedScore 가 0..100 — 그대로 intensity (÷100) + mark 결정에 사용.
 *   - caution: 30 미만 / avoid: 20 미만 / good: 70 이상 / best: month 최고점 1일.
 *
 * themes: cell.themeScores 5축 평균 — month 단위 합산.
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

  // accum themes
  const themeAccum: Record<DestinypalMonthThemeBar['key'], { sum: number; n: number }> = {
    love: { sum: 0, n: 0 },
    money: { sum: 0, n: 0 },
    career: { sum: 0, n: 0 },
    health: { sum: 0, n: 0 },
    growth: { sum: 0, n: 0 },
  }

  for (const cell of opts.cells) {
    const dPart = cell.datetime.slice(8, 10) // "DD"
    const d = parseInt(dPart, 10)
    if (!Number.isFinite(d) || d <= 0) continue
    const ds = `${ymPrefix}-${pad2(d)}`
    const score = cell.derivedScore
    const intensity = Math.max(0, Math.min(1, score / 100))

    let mark: DestinypalCalendarDay['mark'] = null
    if (score < th.avoid) {
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

    // theme accumulator
    const ts = cell.themeScores ?? {}
    for (const k of Object.keys(themeAccum) as DestinypalMonthThemeBar['key'][]) {
      const v = (ts as Record<string, number | undefined>)[k]
      if (typeof v === 'number') {
        themeAccum[k].sum += v
        themeAccum[k].n += 1
      }
    }

    calendar.push({
      d,
      ds,
      intensity,
      mark,
      focus: false, // focusDay 결정 후 갱신
    })
  }

  // best mark
  if (bestDay > 0 && bestScore >= th.best) {
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

  // themes 평균 → 0..100
  const themes: DestinypalMonthThemeBar[] = (
    Object.keys(themeAccum) as DestinypalMonthThemeBar['key'][]
  ).map((k) => ({
    key: k,
    ko: THEME_KO[k],
    v: themeAccum[k].n > 0 ? Math.round(themeAccum[k].sum / themeAccum[k].n) : 50,
  }))

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
      themes,
      narrative: opts.narrative ?? [],
      converge: opts.converge,
      focusDay,
    },
    calendar,
  }
}
