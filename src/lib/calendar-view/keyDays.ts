/**
 * 이달의 큰 날 — v9 캘린더 '02 / Key days' 행. 문자열을 이어 붙이지 않고 구조로 낸다.
 *
 * ── 판정 단어 = 그리드 마크 (FIX9b E5 · 오너 결정 DOCTRINE #1) ──
 * v9 목록은 날 라벨을 *그리드 마크*(점수 밴드)에서 읽는다 — 14일 그리드가 조심이면
 * 'Caution', 29일이 피함이면 'Avoid'. 목록·그리드·막대가 한 축(색=마크)이라 서로 반대말을
 * 하지 않는다. (기존 MonthTier 는 화해 톤 cell.tone 으로 라벨을 정했다 — 오너가 E5 를
 * 거절하면 markTone/verdictPrefix 대신 cell.tone 을 읽도록 이 파일의 dayKindOf 하나만
 * 바꾸면 된다.)
 *  · 판정 단어: verdictPrefix(mark) — best 'Best day' / good 'Good day' / caution 'Caution' /
 *    avoid 'Avoid' / 무색·focus 'Calm day'(엔진의 중립 단어는 Calm — FIX9b E5).
 *  · 뜻: capitalize(toneMeaningFor(markTone(mark), 일, lang, 월 시드)) + '.' — 같은 엔진 풀.
 *
 * ── 어떤 날이 큰 날인가 ──
 * 선정은 수렴(deriveConvergence keyDays — month.keyDays)이 한다. 그리드 최고의 날이 목록에
 * 없으면 덧붙인다(MonthTier 와 같은 동작). 날짜순.
 *
 * 순수 함수 — 시계를 읽지 않는다. 지난 날은 서버가 실은 cell.past(주입된 now)로, 없으면
 * month.todayDay(없으면 focusDay — 서버 렌더에선 오늘)와 비교한다.
 */

import type {
  DestinyMonth,
  DestinyDayMark,
  DestinyCalendarCell,
  DestinyDayReason,
} from '@/types/calendar/month'
import { toneMeaningFor, type MeaningTone } from '@/lib/calendar-engine/derivers/toneMeaning'
import { weekdayShort, type Lang } from './dateLabels'

/** 표시용 날 종류 — 그리드 마크에서. 'focus'(밴드 무색인 다이브 일)·null 은 calm. */
export type KeyDayMark = 'best' | 'good' | 'caution' | 'avoid' | 'calm'

export function dayKindOf(mark: DestinyDayMark | null | undefined): KeyDayMark {
  if (mark === 'best' || mark === 'good' || mark === 'caution' || mark === 'avoid') return mark
  return 'calm'
}

/** 마크 → 톤 풀(좋음/주의/중립). */
export function markTone(mark: DestinyDayMark | null | undefined): MeaningTone {
  const k = dayKindOf(mark)
  if (k === 'best' || k === 'good') return 'positive'
  if (k === 'caution' || k === 'avoid') return 'negative'
  return 'neutral'
}

const VERDICT_PREFIX: Record<Lang, Record<KeyDayMark, string>> = {
  en: {
    best: 'Best day',
    good: 'Good day',
    caution: 'Caution',
    avoid: 'Avoid',
    calm: 'Calm day',
  },
  ko: {
    best: '최고의 날',
    good: '좋은 날',
    caution: '조심할 날',
    avoid: '피할 날',
    calm: '잔잔한 날',
  },
}

/** 판정 단어 — 그리드 마크에서(모듈 주석). */
export function verdictPrefix(mark: DestinyDayMark | null | undefined, lang: Lang): string {
  return VERDICT_PREFIX[lang][dayKindOf(mark)]
}

const capitalize = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t)

/** 문장 끝 — 이미 문장부호로 끝나면 그대로. */
const withPeriod = (t: string) => (/[.!?…。]$/.test(t) ? t : `${t}.`)

/** 그날 한 줄 — 마크 톤의 엔진 풀 문구(첫 글자 대문자 + 마침표). */
export function keyDayMeaning(
  mark: DestinyDayMark | null | undefined,
  day: number,
  lang: Lang,
  seed: number
): string {
  return withPeriod(capitalize(toneMeaningFor(markTone(mark), day, lang, seed)))
}

export interface KeyDayItem {
  /** 'MM-DD'. */
  ds: string
  /** 일(1-31). */
  d: number
  /** 요일 약자 — 'Thu' / '목'. */
  weekday: string
  /** 그리드 마크(표시 종류). */
  mark: KeyDayMark
  /** 판정 단어 — 'Avoid'. */
  verdict: string
  /** 그날 한 줄 — 'Hands off the decide button.' */
  meaning: string
  /** 오늘보다 앞선 날. */
  past: boolean
  /** 오늘. */
  isToday: boolean
  /** 그리드 최고의 날. */
  best: boolean
  /** 수렴이 두 체계 모두 무겁다고 본 날. 덧붙인 최고의 날은 false. */
  bothSystems: boolean
  /** 그날 '왜' 근거(교차) — 있으면 행을 펼쳐 교차 행으로. */
  reason: DestinyDayReason | null
}

/** 오늘의 일 — 서버가 실은 todayDay, 없으면 focusDay(서버 렌더에선 오늘). */
export function referenceDay(month: Pick<DestinyMonth, 'todayDay' | 'focusDay'>): number {
  return month.todayDay ?? month.focusDay
}

/** 셀의 지난 날 여부 — 서버 플래그 우선, 없으면 기준일과 비교. */
export function cellPast(cell: Pick<DestinyCalendarCell, 'd' | 'past'>, refDay: number): boolean {
  return typeof cell.past === 'boolean' ? cell.past : refDay > 0 && cell.d < refDay
}

/** 셀의 오늘 여부 — 서버 플래그 우선, 없으면 기준일과 같은 날. */
export function cellIsToday(
  cell: Pick<DestinyCalendarCell, 'd' | 'isToday'>,
  refDay: number
): boolean {
  return typeof cell.isToday === 'boolean' ? cell.isToday : cell.d === refDay
}

/**
 * 큰 날 행 — month.keyDays(수렴 선정) + 빠진 최고의 날, 날짜순. 판정·뜻은 그리드 마크에서.
 */
export function buildKeyDayItems(month: DestinyMonth, lang: Lang): KeyDayItem[] {
  const seed = month.seed ?? 0
  const year = month.ym.slice(0, 4)
  const refDay = referenceDay(month)
  const cellByDs = new Map((month.calendar ?? []).map((c) => [c.ds, c]))
  const bestDs = month.bestDay?.date || ''

  const picks = new Map<string, { bothSystems: boolean }>()
  for (const k of month.keyDays ?? []) {
    if (!k.date || picks.has(k.date)) continue
    picks.set(k.date, { bothSystems: !!k.bothSystems })
  }
  // 그리드 최고의 날이 큰 날 목록에 빠졌으면 채워 넣는다(MonthTier 와 같은 동작).
  if (bestDs && !picks.has(bestDs)) picks.set(bestDs, { bothSystems: false })

  const items: KeyDayItem[] = []
  for (const [ds, pick] of picks) {
    const d = Number(ds.slice(-2))
    if (!Number.isFinite(d) || d <= 0) continue
    const cell = cellByDs.get(ds)
    // 최고의 날은 크라운 마크(best) — 셀이 없어도(구 페이로드) best 로 읽는다.
    const rawMark: DestinyDayMark | null = cell?.mark ?? (ds === bestDs ? 'best' : null)
    items.push({
      ds,
      d,
      weekday: weekdayShort(`${year}-${ds}`, lang),
      mark: dayKindOf(rawMark),
      verdict: verdictPrefix(rawMark, lang),
      meaning: keyDayMeaning(rawMark, d, lang, seed),
      past: cell ? cellPast(cell, refDay) : refDay > 0 && d < refDay,
      isToday: cell ? cellIsToday(cell, refDay) : d === refDay,
      best: ds === bestDs,
      bothSystems: pick.bothSystems,
      reason: cell?.reason ?? null,
    })
  }
  return items.sort((a, b) => a.ds.localeCompare(b.ds))
}
