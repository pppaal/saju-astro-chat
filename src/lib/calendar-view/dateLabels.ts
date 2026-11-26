/**
 * v9 캘린더 날짜 표기 — 'Nov 24' / '11월 24일', 요일 약자, 서수(24th / 24일).
 *
 * 입력은 떠 있는 민용 날짜 문자열('YYYY-MM-DD' 또는 'MM-DD')뿐이다 — 요일은 그 날짜의 UTC
 * 자정으로 센다(날짜 문자열은 이미 출생지 시간대의 민용 날짜라 시간대 변환이 없다). 시계를
 * 읽지 않는다.
 */

export type Lang = 'ko' | 'en'

const MONTH_SHORT_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const
const MONTH_LONG_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const
const WEEKDAY_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const WEEKDAY_LONG_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const
const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const
/** 달력 머리 요일 — 일요일 시작(S M T W T F S / 일 … 토). */
const WEEKDAY_INITIAL_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

/** 'YYYY-MM-DD' 또는 'MM-DD' → { month(1-12), day }. */
function monthDay(ds: string): { month: number; day: number } {
  const parts = ds.split('-')
  const day = Number(parts[parts.length - 1])
  const month = Number(parts[parts.length - 2])
  return { month, day }
}

/** 'Nov 24' / '11월 24일'. ds = 'YYYY-MM-DD' 또는 'MM-DD'. */
export function mdLabel(ds: string, lang: Lang): string {
  const { month, day } = monthDay(ds)
  if (lang === 'ko') return `${month}월 ${day}일`
  return `${MONTH_SHORT_EN[month - 1] ?? ''} ${day}`.trim()
}

/** 'YYYY-MM-DD' → 요일 번호(0=일 … 6=토). */
function weekdayIndex(iso: string): number {
  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`).getUTCDay()
}

/** 요일 약자 — 'Thu' / '목'. */
export function weekdayShort(iso: string, lang: Lang): string {
  const i = weekdayIndex(iso)
  return lang === 'ko' ? WEEKDAY_KO[i] : WEEKDAY_SHORT_EN[i]
}

/** 요일 — 'Thursday' / '목요일'. */
export function weekdayLong(iso: string, lang: Lang): string {
  const i = weekdayIndex(iso)
  return lang === 'ko' ? `${WEEKDAY_KO[i]}요일` : WEEKDAY_LONG_EN[i]
}

/** 달력 머리 요일 7개(일요일 시작) — S M T W T F S / 일 월 화 수 목 금 토. */
export function weekdayInitials(lang: Lang): readonly string[] {
  return lang === 'ko' ? WEEKDAY_KO : WEEKDAY_INITIAL_EN
}

/** 'YYYY-MM' 1일의 요일(0=일) — 달력 그리드 앞 빈칸 수. */
export function firstWeekdayOfMonth(ym: string): number {
  return weekdayIndex(`${ym.slice(0, 7)}-01`)
}

/** 서수 — 24 → '24th' / '24일'. (11·12·13 은 th.) */
export function ordinal(n: number, lang: Lang): string {
  if (lang === 'ko') return `${n}일`
  const mod100 = n % 100
  const mod10 = n % 10
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? 'th'
      : mod10 === 1
        ? 'st'
        : mod10 === 2
          ? 'nd'
          : mod10 === 3
            ? 'rd'
            : 'th'
  return `${n}${suffix}`
}

/** 'YYYY-MM' → 'Nov 2026' / '2026년 11월'. */
export function monthYearShort(ym: string, lang: Lang): string {
  const y = ym.slice(0, 4)
  const m = Number(ym.slice(5, 7))
  return lang === 'ko' ? `${y}년 ${m}월` : `${MONTH_SHORT_EN[m - 1] ?? ''} ${y}`.trim()
}

/** 'YYYY-MM' → 'November 2026' / '2026년 11월'. */
export function monthYearLong(ym: string, lang: Lang): string {
  const y = ym.slice(0, 4)
  const m = Number(ym.slice(5, 7))
  return lang === 'ko' ? `${y}년 ${m}월` : `${MONTH_LONG_EN[m - 1] ?? ''} ${y}`.trim()
}

/** 월 이름 — 'November' / '11월'. */
export function monthName(ym: string, lang: Lang): string {
  const m = Number(ym.slice(5, 7))
  return lang === 'ko' ? `${m}월` : (MONTH_LONG_EN[m - 1] ?? '')
}

/** 'YYYY-MM-DD' → '11.19' (월.일, 0 없이). */
export function dotMonthDay(iso: string): string {
  const { month, day } = monthDay(iso)
  return `${month}.${day}`
}

/** 'YYYY-MM-DD' → '2026.11.19'. */
export function dotDate(iso: string): string {
  const { month, day } = monthDay(iso)
  return `${iso.slice(0, 4)}.${month}.${day}`
}

const NUMBER_WORD_EN = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
] as const

/** 문장 머리 수 — 0~12 는 'Six', 그 위는 숫자. */
export function numberWordEn(n: number): string {
  return NUMBER_WORD_EN[n] ?? String(n)
}
