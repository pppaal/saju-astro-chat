import type { LocaleCode } from './routeSupportCommon'

export function scoreText(value: number | null, locale: LocaleCode) {
  return value === null ? (locale === 'ko' ? '정보 없음' : 'N/A') : `${value}/100`
}

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
}

export function weekdayInTimeZone(date: Date, tz: string = 'Asia/Seoul'): number {
  const safeTz = typeof tz === 'string' && tz.trim() ? tz.trim() : 'Asia/Seoul'
  const short = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: safeTz })
    .format(date)
    .toLowerCase()
    .slice(0, 3)
  return WEEKDAY_INDEX[short] ?? date.getDay()
}

export function formatDateBadge(date: Date, tz: string = 'Asia/Seoul', locale: LocaleCode): string {
  const safeTz = typeof tz === 'string' && tz.trim() ? tz.trim() : 'Asia/Seoul'
  const formatter = new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    timeZone: safeTz,
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
  return formatter.format(date)
}

export function parseWeekdayIndexes(label: string): number[] {
  const tokens = String(label || '')
    .split(/[,\s/]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)

  const indexes = tokens
    .map((token) => WEEKDAY_INDEX[token] ?? WEEKDAY_INDEX[token.slice(0, 3)] ?? -1)
    .filter((value) => value >= 0)

  return [...new Set(indexes)]
}

export function buildUpcomingDates(
  weekdayLabel: string,
  tz: string = 'Asia/Seoul',
  locale: LocaleCode,
  limit = 3
): string[] {
  const safeTz = typeof tz === 'string' && tz.trim() ? tz.trim() : 'Asia/Seoul'
  const targetWeekdays = parseWeekdayIndexes(weekdayLabel)
  if (targetWeekdays.length === 0) {
    return []
  }

  const matches: string[] = []
  const now = new Date()
  for (let offset = 0; offset < 28 && matches.length < limit; offset++) {
    const candidate = new Date(now)
    candidate.setDate(now.getDate() + offset)
    const candidateWeekday = weekdayInTimeZone(candidate, safeTz)
    if (targetWeekdays.includes(candidateWeekday)) {
      matches.push(formatDateBadge(candidate, safeTz, locale))
    }
  }
  return matches
}

