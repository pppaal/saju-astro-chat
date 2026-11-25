/**
 * periodPillars — 캘린더 셀(출생지 시간대의 민용 날짜) 하나에 세운·월운·대운 하나씩
 * (재감사 G2 · TP-2 · TP-3 · TP-7). 사주 기간 추출기 전부와 월 티어 머리말, 상담사
 * 기간 블록(G3)이 이 한 파일을 읽는다.
 *
 * ── 셀 날짜 ──
 * 캘린더 셀은 출생지 시간대의 *민용 날짜*다(loadTierData 의 '오늘' = getNowInTimezone(
 * 출생 tz)). 신호 active 창은 그 현지 벽시계에 'Z' 를 붙인 떠 있는(floating) ISO 로 적고,
 * groupIntoCells 가 문자열 앞 10자리로 셀을 고른다(index.ts 버킷 계약, saju-hour·
 * astro-transit 과 같은 틀).
 *
 * ── 절입일 규칙 (오너 결정 17 기본값) ──
 * 節/立春 이 든 그 현지 날이 새 기둥을 받는다. 즉 현지 날짜 하나는 그날이 *끝날 때* 걸려
 * 있는 세운·월운을 싣는다. 절입 instant 는 절대 순간(KASI 표, getSolarTermKST)이고, 그
 * 순간을 셀 시간대의 민용 날짜로 읽은 날이 경계다. 立春 은 寅월을 여는 節이기도 해서 세운과
 * 월운이 같은 셀에서 함께 바뀐다 — 어느 셀도 세운 둘을 싣거나 새 세운에 옛 丑월을 짝짓지
 * 않는다. 예: 立春 2026-02-03T20:01:54Z → 서울 2026-02-04 05:02 이라 서울 02-03 은 乙巳년
 * 己丑월, 02-04 부터 丙午년 庚寅월. 같은 순간이 LA 로는 02-03 12:01 이라 LA 02-03 부터 丙午.
 *
 * ── 대운 ──
 * 대운 칸 i 는 만 나이 [시작 나이 + 10i, + 10) 을 맡는다(daeunAge SSOT, CONVENTIONS §14).
 * 만 나이는 출생지 시간대의 민용 생일에 오르므로 창은 그 생일 날짜에 열리고 다음 칸 생일
 * 전날 끝난다. 2월 29일생은 평년엔 3월 1일에 나이가 오른다(currentManAge 와 같다). 첫 대운
 * 전에는 창이 없다(OD-12). 본명 컨텍스트 목록이 범위 끝의 만 나이를 못 덮으면(시작 + 100세
 * 이상, NatalContextCache 에 영구 캐시된 10칸 목록) daeunCellsToCover 로 같은 순서열을
 * 잇는다 — 창은 빌드 범위만의 함수라 시계를 읽지 않는다.
 *
 * 모두 순수 함수다(시계를 읽지 않는다). 절입 목록은 (시간대, 연도) 별로 메모한다.
 */

import { getSolarTermKST, KASI_SOLAR_TERMS } from '@/lib/saju/constants'
import { yearPillarOfSajuYear, monthPillarOfTerm } from '@/lib/saju/datePillars'
import { daeunCellsToCover, DAEUN_SPAN_YEARS, type DaeunCell } from '@/lib/saju/daeunAge'
import { getDateComponentsInTimezone, normalizeTimeZone } from '@/lib/datetime/timezone'
import { CALCULATION_STANDARDS } from '@/lib/config/calculationStandards'
import { toUtcMs } from './timeUtc'

const DAY_MS = 86_400_000
/** 표 밖 연도의 절입 근사 — 평균 회귀년(일). */
const MEAN_TROPICAL_YEAR_DAYS = 365.24219

export interface StemBranch {
  stem: string
  branch: string
}

export interface LocalPeriodPillars {
  /** 세운 — sajuYear 는 입춘 기준 사주년 번호. */
  year: StemBranch & { sajuYear: number }
  /** 월운 — termIndex 는 그 달을 연 節(1=소한 … 12=대설), sajuYear 는 그 달이 속한 사주년. */
  month: StemBranch & { sajuYear: number; termIndex: number }
}

/** 세운·월운 창 — 첫·마지막 현지 날짜와 떠 있는 ISO 창. */
export interface PeriodWindow extends StemBranch {
  /** 이 기간이 속한 사주년(세운이면 그 해, 월운이면 그 달의 해). */
  sajuYear: number
  /** 이 기간을 연 節 번호(1=소한 … 12=대설). 세운은 2(입춘). */
  termIndex: number
  /** 이 기간을 연 절입 instant (UT ISO). */
  opensAt: string
  /** 첫 현지 날짜 'YYYY-MM-DD' (절입이 든 날). */
  startDate: string
  /** 마지막 현지 날짜 'YYYY-MM-DD' (다음 절입 전날). */
  endDate: string
  /** `${startDate}T00:00:00.000Z` */
  start: string
  /** 창 가운데 — 떠 있는 ISO. */
  peak: string
  /** `${endDate}T23:59:59.999Z` */
  end: string
}

/** 대운 창 — 천간 5년 [start, mid) · 지지 5년 [mid, end]. */
export interface DaeunWindow extends StemBranch {
  startAge: number
  /** 출생 연도 + 시작 나이 — 신호 id·라벨용. */
  startYear: number
  /** 민용 출생 월(1-12)·일 — 생일 경계 산술용. */
  birthMonth: number
  birthDay: number
  /** 시작 나이 생일(현지 날짜) — 이 대운이 '현재'가 되는 첫날. */
  startDate: string
  /** 시작 + 5 생일 — 지지 5년이 여는 날. */
  midDate: string
  /** 다음 대운 생일 전날. */
  endDate: string
  start: string
  /** `${midDate}T00:00:00.000Z` — 지지 5년 창의 시작. */
  mid: string
  /** 천간 5년 창의 끝(`mid` 전날 23:59:59.999). */
  stemEnd: string
  end: string
}

export interface DateRangeLike {
  start: string
  end: string
}

/** 캘린더 셀 시간대 — 출생지 IANA(없거나 깨졌으면 사주 기준 존). */
export function calendarTimeZone(natal: {
  input?: { timeZone?: string | null } | null
  astro?: { location?: { timeZone?: string | null } | null } | null
}): string {
  return normalizeTimeZone(
    natal?.input?.timeZone ?? natal?.astro?.location?.timeZone,
    CALCULATION_STANDARDS.saju.baseTimezone
  )
}

// ─── 날짜 문자열 산술 (UTC 자정 = 떠 있는 날짜) ───

const pad2 = (n: number) => String(n).padStart(2, '0')
function ymd(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${pad2(m)}-${pad2(d)}`
}
/** 'YYYY-MM-DD' + n 일. */
export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + n * DAY_MS).toISOString().slice(0, 10)
}
/** 떠 있는 날짜 창의 가운데(밀리초 내림). */
function midIso(startDate: string, endDate: string): string {
  const a = Date.parse(`${startDate}T00:00:00.000Z`)
  const b = Date.parse(`${endDate}T23:59:59.999Z`)
  return new Date(a + Math.floor((b - a) / 2)).toISOString()
}
/** 범위 경계 → 첫·마지막 셀 날짜 'YYYY-MM-DD' (index.ts iterateRange 와 같은 해석). */
export function rangeDates(range: DateRangeLike): { from: string; to: string } {
  const from = new Date(toUtcMs(range.start)).toISOString().slice(0, 10)
  const to =
    range.end.length <= 10 ? range.end : new Date(toUtcMs(range.end)).toISOString().slice(0, 10)
  return { from, to }
}

// ─── 절입 목록 ───

let tableYears: { first: number; last: number } | null = null
function tableRange(): { first: number; last: number } {
  if (!tableYears) {
    const ys = Object.keys(KASI_SOLAR_TERMS).map(Number)
    tableYears = { first: Math.min(...ys), last: Math.max(...ys) }
  }
  return tableYears
}

/** 양력 year 의 節 termIndex 절입 instant(ms). 표 밖이면 가장 가까운 표 연도 + 평균 회귀년. */
function termInstantMs(year: number, termIndex: number): number {
  const exact = getSolarTermKST(year, termIndex)
  if (exact) return exact.getTime()
  const { first, last } = tableRange()
  const ref = Math.min(last, Math.max(first, year))
  const base = getSolarTermKST(ref, termIndex)
  const baseMs = base ? base.getTime() : Date.UTC(ref, termIndex - 1, 6)
  return baseMs + Math.round((year - ref) * MEAN_TROPICAL_YEAR_DAYS * DAY_MS)
}

interface TermEvent {
  termIndex: number
  /** 그 節이 연 기간의 사주년(소한은 양력 연도 − 1). */
  sajuYear: number
  ms: number
  /** 절입 순간의 셀 시간대 민용 날짜. */
  localDate: string
}

const termCache = new Map<string, TermEvent[]>()
const TERM_CACHE_MAX = 4096

/** 양력 year 의 12 節(소한 → 대설, 시간순) — 셀 시간대 현지 날짜 포함. */
function termsOfYear(year: number, timeZone: string): TermEvent[] {
  const key = `${timeZone}|${year}`
  const hit = termCache.get(key)
  if (hit) return hit
  const out: TermEvent[] = []
  for (let termIndex = 1; termIndex <= 12; termIndex++) {
    const ms = termInstantMs(year, termIndex)
    const c = getDateComponentsInTimezone(new Date(ms), timeZone)
    out.push({
      termIndex,
      sajuYear: termIndex === 1 ? year - 1 : year,
      ms,
      localDate: ymd(c.year, c.month, c.day),
    })
  }
  if (termCache.size >= TERM_CACHE_MAX) termCache.clear()
  termCache.set(key, out)
  return out
}

function termsBetween(fromYear: number, toYear: number, timeZone: string): TermEvent[] {
  const out: TermEvent[] = []
  for (let y = fromYear; y <= toYear; y++) out.push(...termsOfYear(y, timeZone))
  return out
}

// ─── 날짜별 기둥 ───

/**
 * 현지 민용 날짜 (y, m, d) 의 세운·월운 — 그날이 끝날 때 걸린 기둥(절입일 규칙).
 * 셀 시간대 timeZone 은 출생지 IANA(calendarTimeZone). 순수 함수.
 */
export function pillarsForLocalDate(
  y: number,
  m: number,
  d: number,
  timeZone?: string | null
): LocalPeriodPillars {
  const tz = normalizeTimeZone(timeZone, CALCULATION_STANDARDS.saju.baseTimezone)
  const date = ymd(y, m, d)
  // 현지 날짜 하나 앞의 마지막 節 — 전년 대설(12월)까지 보면 충분하다(소한이 1/5 무렵).
  const events = termsBetween(y - 1, y, tz)
  let last: TermEvent | null = null
  for (const ev of events) {
    if (ev.localDate <= date) last = ev
    else break
  }
  // events 는 시간순이고 전년 대설이 반드시 date 이전이라 last 는 비지 않는다.
  const ev = last ?? events[0]
  return {
    year: { ...yearPillarOfSajuYear(ev.sajuYear), sajuYear: ev.sajuYear },
    month: {
      ...monthPillarOfTerm(ev.sajuYear, ev.termIndex),
      sajuYear: ev.sajuYear,
      termIndex: ev.termIndex,
    },
  }
}

/** 'YYYY-MM-DD' 문자열 판 — pillarsForLocalDate 와 같다. */
export function pillarsForLocalDateString(
  date: string,
  timeZone?: string | null
): LocalPeriodPillars {
  const [y, m, d] = date.split('-').map(Number)
  return pillarsForLocalDate(y, m, d, timeZone)
}

function windowsFromEvents(
  events: TermEvent[],
  from: string,
  to: string,
  pillarOf: (ev: TermEvent) => StemBranch & { sajuYear: number }
): PeriodWindow[] {
  const out: PeriodWindow[] = []
  for (let i = 0; i + 1 < events.length; i++) {
    const ev = events[i]
    const startDate = ev.localDate
    const endDate = addDays(events[i + 1].localDate, -1)
    if (endDate < from || startDate > to || endDate < startDate) continue
    const p = pillarOf(ev)
    out.push({
      stem: p.stem,
      branch: p.branch,
      sajuYear: p.sajuYear,
      termIndex: ev.termIndex,
      opensAt: new Date(ev.ms).toISOString(),
      startDate,
      endDate,
      start: `${startDate}T00:00:00.000Z`,
      peak: midIso(startDate, endDate),
      end: `${endDate}T23:59:59.999Z`,
    })
  }
  return out
}

/**
 * 범위와 겹치는 월운 창 — 節 하나가 여는 절기월마다 하나, 셀 날짜에 맞춘 떠 있는 창.
 * 창은 범위 밖까지 실제 절입~절입으로 잡는다(어느 범위로 빌드해도 같은 창 — 범위 불변).
 */
export function monthWindows(range: DateRangeLike, timeZone?: string | null): PeriodWindow[] {
  const tz = normalizeTimeZone(timeZone, CALCULATION_STANDARDS.saju.baseTimezone)
  const { from, to } = rangeDates(range)
  const events = termsBetween(Number(from.slice(0, 4)) - 1, Number(to.slice(0, 4)) + 1, tz)
  return windowsFromEvents(events, from, to, (ev) => ({
    ...monthPillarOfTerm(ev.sajuYear, ev.termIndex),
    sajuYear: ev.sajuYear,
  }))
}

/** 범위와 겹치는 세운 창 — 立春 이 든 현지 날부터 다음 立春 전날까지. */
export function yearWindows(range: DateRangeLike, timeZone?: string | null): PeriodWindow[] {
  const tz = normalizeTimeZone(timeZone, CALCULATION_STANDARDS.saju.baseTimezone)
  const { from, to } = rangeDates(range)
  const events = termsBetween(Number(from.slice(0, 4)) - 1, Number(to.slice(0, 4)) + 1, tz).filter(
    (ev) => ev.termIndex === 2
  )
  return windowsFromEvents(events, from, to, (ev) => ({
    ...yearPillarOfSajuYear(ev.sajuYear),
    sajuYear: ev.sajuYear,
  }))
}

// ─── 대운 ───

interface DaeunSource {
  input?: { year?: number; month?: number; date?: number } | null
  saju: {
    daeun: ReadonlyArray<{ startAge?: number; startYear?: number; stem: string; branch: string }>
  }
}

/** 만 나이가 오르는 민용 생일 — 평년의 2/29 생은 3/1(currentManAge 와 같다). */
function birthdayDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10)
}

/** 현지 날짜의 만 나이 — currentManAge 와 같은 비교(생일 통과 여부). */
function manAgeOn(date: string, birth: { year: number; month: number; day: number }): number {
  const [y, m, d] = date.split('-').map(Number)
  const had = m > birth.month || (m === birth.month && d >= birth.day)
  return Math.max(0, y - birth.year - (had ? 0 : 1))
}

/**
 * 범위와 겹치는 대운 창 — 칸마다 시작 나이 생일에 열리고 다음 칸 생일 전날 닫힌다
 * (daeunAge SSOT). 범위 끝 만 나이를 목록이 못 덮으면 daeunCellsToCover 로 잇는다.
 * 출생 연·월·일이 없으면 [].
 */
export function daeunWindows(natal: DaeunSource, range: DateRangeLike): DaeunWindow[] {
  const by = natal.input?.year
  const bm = natal.input?.month
  const bd = natal.input?.date
  if (!Number.isFinite(by) || !Number.isFinite(bm) || !Number.isFinite(bd)) return []
  const birth = { year: by as number, month: bm as number, day: bd as number }
  const { from, to } = rangeDates(range)

  const cells: DaeunCell[] = []
  for (const d of natal.saju.daeun ?? []) {
    const startAge =
      typeof d.startAge === 'number'
        ? d.startAge
        : typeof d.startYear === 'number'
          ? d.startYear - birth.year
          : NaN
    if (!Number.isFinite(startAge) || !d.stem || !d.branch) continue
    cells.push({ startAge, stem: d.stem, branch: d.branch })
  }
  if (!cells.length) return []
  cells.sort((a, b) => a.startAge - b.startAge)
  cells.push(...daeunCellsToCover(cells, manAgeOn(to, birth)))

  const out: DaeunWindow[] = []
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]
    const nextAge = i + 1 < cells.length ? cells[i + 1].startAge : c.startAge + DAEUN_SPAN_YEARS
    const startDate = birthdayDate(birth.year + c.startAge, birth.month, birth.day)
    const endDate = addDays(birthdayDate(birth.year + nextAge, birth.month, birth.day), -1)
    if (endDate < from || startDate > to) continue
    const midDate = birthdayDate(birth.year + c.startAge + 5, birth.month, birth.day)
    out.push({
      stem: c.stem,
      branch: c.branch,
      startAge: c.startAge,
      startYear: birth.year + c.startAge,
      birthMonth: birth.month,
      birthDay: birth.day,
      startDate,
      midDate,
      endDate,
      start: `${startDate}T00:00:00.000Z`,
      mid: `${midDate}T00:00:00.000Z`,
      stemEnd: `${addDays(midDate, -1)}T23:59:59.999Z`,
      end: `${endDate}T23:59:59.999Z`,
    })
  }
  return out
}

/** 대운 시작 + years 생일의 떠 있는 자정 ISO — 창 정점(peak)용. */
export function daeunAnniversaryIso(w: DaeunWindow, years: number): string {
  return `${birthdayDate(w.startYear + years, w.birthMonth, w.birthDay)}T00:00:00.000Z`
}
