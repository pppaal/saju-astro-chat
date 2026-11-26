/**
 * 30일 CalendarCell aggregate → destinypal `month` 객체 + `calendar[30]` adapter.
 *
 * destinypal month:
 *   { label, ym, woolun, cautionDays[], goodDays[], bestDay{date,score},
 *     avoidDays[], focusDay, evidenceLadder }
 *
 * destinypal calendar[30]:
 *   Array<{ d, ds, intensity, mark, focus }>
 *
 * 입력:
 *   - month 표시 라벨 (예: "2026년 6월", ym "2026-06")
 *   - CalendarCell[] (그 달의 30일 cells)
 *   - 월운 wolun ganji (선택)
 */

import type { CalendarCell } from '@/lib/calendar-engine/types'
import type { CalendarGrade } from '@/lib/calendar-engine/derivers/grade'
import { CALENDAR_BANDS } from '@/lib/calendar-engine/derivers/constants'
import {
  deriveEvidenceLadder,
  type EvidenceRung,
  type LadderRange,
} from '@/lib/calendar-engine/derivers/evidenceLadder'
import { toGanji, type Ganji, pad2 } from './shared'

export interface DestinypalCalendarDay {
  d: number
  ds: string // "06-15"
  intensity: number // 0..1
  mark: 'caution' | 'avoid' | 'good' | 'best' | 'focus' | null
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
  focusDay: number // 1..30
  /** 근거 사다리(10년→올해→이달) — 그 달 대표 셀 기준. */
  evidenceLadder?: EvidenceRung[]
  /** 근거 사다리 영문. */
  evidenceLadderEn?: EvidenceRung[]
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
  /** focusDay — 어느 날을 펼쳐 보여줄지 (기본: bestDay 의 day). */
  focusDay?: number
  /** caution/avoid/good 임계값 (선택). */
  thresholds?: { caution?: number; avoid?: number; good?: number; best?: number }
  /**
   * 날짜별 점수·등급 — 일진+시진 층 신호로 산출(deriveLayeredScores.daily).
   * 주어지면 점수·intensity·bestDay 는 그 점수로. 마크는 일 카드와 같은 band(60/35).
   * key: YYYY-MM-DD.
   */
  dayScores?: Map<string, { score: number; grade: CalendarGrade }>
  /**
   * 근거 사다리 10년 칸의 기간 — 대표 셀(15일) 날짜의 대운 창(ladderDaeunRange). 호출부가
   * 본명에서 구해 넘긴다(이 어댑터는 본명을 받지 않는다). 없으면 10년 칸 range 생략.
   */
  daeunRange?: LadderRange | null
}

/**
 * 점수 → 그리드 밴드 마크(best 크라운 전). toMonth 의 셀 색과, 같은 날의 '왜' 부호
 * 게이트(assembleDayTier → pickDayReason)가 한 규칙을 읽게 하는 단일 소스.
 * avoid <30 / caution 30~39 / 무색 40~59 / good ≥60 (CALENDAR_BANDS).
 */
export function bandMarkForScore(
  score: number,
  th: { avoid: number; caution: number; good: number } = CALENDAR_BANDS
): 'avoid' | 'caution' | 'good' | null {
  if (score < th.avoid) return 'avoid'
  if (score < th.caution) return 'caution'
  if (score >= th.good) return 'good'
  return null
}

/**
 * CalendarCell[] → destinypal month + calendar[30].
 *
 * scoring:
 *   - dayScores(일진층 favorScore) 우선, 없으면 cell.derivedScore.
 *   - 마크는 일 화면(assembleDayTier)과 *같은 단일 밴드*(CALENDAR_BANDS): good ≥60 /
 *     무색 40~59 / caution 30~39 / avoid <30 / best — month 최고점 1일.
 */
export function toMonth(opts: ToMonthOptions): {
  month: DestinypalMonth
  calendar: DestinypalCalendarDay[]
} {
  const th = {
    caution: opts.thresholds?.caution ?? CALENDAR_BANDS.caution,
    avoid: opts.thresholds?.avoid ?? CALENDAR_BANDS.avoid,
    good: opts.thresholds?.good ?? CALENDAR_BANDS.good,
    best: opts.thresholds?.best ?? CALENDAR_BANDS.best,
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

    // 마크는 일 카드 다이얼과 *같은 band(60/35)* 로 — tier 간 길/주의 표시가
    // 어긋나지 않게(예: favorScore 62 → 일 카드 '순풍'인데 월 grade2 라 무표시이던
    // 불일치 제거). low 밴드(<35) 안에서만 지키미(<22)/주의(22~35)로 깊이 구분.
    const mark: DestinypalCalendarDay['mark'] = bandMarkForScore(score, th)
    if (mark === 'avoid') avoidDays.push(ds)
    else if (mark === 'caution') cautionDays.push(ds)
    else if (mark === 'good') goodDays.push(ds)
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

  // best mark — 층별 일점수면 절대 th.best 게이트는 생략하되, *good 밴드(60)* 는
  // 요구한다. 안 그러면 평탄/나쁜 달에서 최고점이 60 미만이어도 초록 크라운이 찍혀
  // "좋은 날 0개" 헤더 옆 초록 ✦, 심하면 caution 버킷에 든 날이 '최고의 날'로
  // 표시되는 모순이 가능하다(감사 — 현재 linearMapper 가 최고점 ≥70 을 보장해
  // 잠복이지만, 그 불변식은 이 파일 밖이라 지역 게이트로 못 박는다). 게이트에
  // 걸리면 bestDay 필드도 함께 비워 목록 '최고의 날'·doDate 추천과 일관되게.
  const crowned = bestDay > 0 && bestScore >= (opts.dayScores ? th.good : th.best)
  if (crowned) {
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

  // label fallback
  const label = opts.label ?? `${opts.ym.slice(0, 4)}년 ${parseInt(opts.ym.slice(5, 7), 10)}월`

  const woolun =
    opts.woolunStem && opts.woolunBranch ? toGanji(opts.woolunStem, opts.woolunBranch) : undefined

  // ── 근거 사다리 — 그 달 *중순(15일 근처)* 대표 셀의 10년/올해/이달 층. ──
  // 월운(월)은 절입, 세운(년)은 입춘에서 *달력월 중간을 가르며* 바뀔 수 있어(감사),
  // focus/best 셀(임의의 강한 날)을 쓰면 소수파 절기월의 십신이 "이달"로 잘못 뜬다.
  // 15일은 절입·입춘과 가장 먼 지점이라 다수파 절기월/세운을 대표한다. daily 는 생략.
  const midDom = (c: CalendarCell) => parseInt(c.datetime.slice(8, 10), 10) || 0
  const repCell =
    opts.cells.length > 0
      ? opts.cells.reduce((best, c) =>
          Math.abs(midDom(c) - 15) < Math.abs(midDom(best) - 15) ? c : best
        )
      : undefined
  const ladderScales = ['decadal', 'yearly', 'monthly'] as const
  const ladderOpts = { daeunRange: opts.daeunRange }
  const evidenceLadder = repCell
    ? deriveEvidenceLadder(repCell.signals, 'ko', [...ladderScales], ladderOpts)
    : []
  const evidenceLadderEn = repCell
    ? deriveEvidenceLadder(repCell.signals, 'en', [...ladderScales], ladderOpts)
    : []

  return {
    month: {
      label,
      ym: opts.ym,
      woolun,
      cautionDays,
      goodDays,
      // dayScores 경로에선 good 밴드 미달 최고일의 크라운·필드를 함께 비운다(위 게이트
      // 참조). 절대점수 경로는 기존과 동일(필드는 항상, 마크만 th.best 게이트).
      bestDay:
        bestDay > 0 && (!opts.dayScores || bestScore >= th.good)
          ? { date: bestDs, score: Math.round(bestScore) }
          : undefined,
      avoidDays,
      focusDay,
      evidenceLadder,
      evidenceLadderEn,
    },
    calendar,
  }
}
