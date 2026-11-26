// src/lib/datetime/resolveBirthInstant.ts
//
// 출생 벽시계(연·월·일·시·분 + IANA 타임존) → UTC instant. 사주(calculateSajuData)와
// 점성(natalToJD)이 *같은* 이 함수 하나로 출생 순간을 정한다 — 엔진 감사 F4·ASTRO-7.
//
// 규칙 (OD-3, RFC 5545 §3.3.5 = Temporal disambiguation 'compatible'):
//   - 겹치는 벽시계(서머타임 해제로 같은 시각이 두 번) → 첫 번째(이른) instant.
//   - 없는 벽시계(서머타임 시작·표준시 변경으로 건너뛴 시각) → 건너뛰기 *직전*
//     UTC offset 으로 읽는다(= 공백만큼 앞으로 민 instant).
//   예) 2021-11-07 01:30 America/New_York → 05:30Z (EDT, 첫 번째)
//       2021-03-14 02:30 America/New_York → 07:30Z (EST 로 읽음)
//       1987-05-10 02:30 Asia/Seoul       → 1987-05-09T17:30Z (KST 로 읽음)
//       1961-08-10 00:15 Asia/Seoul       → 1961-08-09T15:45Z (KMT +8:30 으로 읽음)
//
// 옛 구현은 사주가 date-fns-tz toDate, 점성이 dayjs.tz 였다. 둘이 공백·겹침 시각을
// 서로 다르게 풀었고(같은 입력 → 1시간 다른 두 차트), dayjs 는 겹침 시각의 offset 을
// *서버의 현재* DST 상태로 골라 서버 날짜에 따라 결과가 달라졌다(결정론 위반).
// 이 함수는 Intl(tzdata) 만 읽고 시계를 읽지 않는다.
//
// 일주는 이 instant 로 다시 구하지 않는다 — 입력한 민용 날짜가 일주다(CONVENTIONS §1).

type BirthInstantKind = 'normal' | 'gap' | 'overlap'

export interface WallClockInput {
  year: number
  /** 1–12 */
  month: number
  /** 1–31 */
  day: number
  /** 0–23 */
  hour: number
  /** 0–59 */
  minute: number
  /** 0–59 (기본 0) */
  second?: number
}

export interface ResolvedBirthInstant {
  /** 출생 순간(UTC). */
  utc: Date
  /** 'gap' = 없는 벽시계, 'overlap' = 두 번 있는 벽시계, 그 외 'normal'. */
  kind: BirthInstantKind
  /** 이 instant 를 만든 UTC offset(분, 초 단위 LMT 면 소수). KST = 540. */
  offsetMinutes: number
}

const DAY_MS = 86_400_000
const dtfCache = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let dtf = dtfCache.get(timeZone)
  if (!dtf) {
    // 잘못된 타임존이면 여기서 RangeError — 호출자에게 그대로 올린다.
    dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      era: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    dtfCache.set(timeZone, dtf)
  }
  return dtf
}

/** Date.UTC 와 같지만 0–99 년을 1900 년대로 바꾸지 않는다. */
function utcMs(y: number, mo: number, d: number, h: number, mi: number, s: number): number {
  const t = new Date(0)
  t.setUTCFullYear(y, mo - 1, d)
  t.setUTCHours(h, mi, s, 0)
  return t.getTime()
}

/** instantMs 시점의 timeZone UTC offset(ms, 초 정밀도). */
function offsetMsAt(instantMs: number, timeZone: string): number {
  const floored = Math.floor(instantMs / 1000) * 1000
  const parts = formatterFor(timeZone).formatToParts(new Date(floored))
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN)
  const era = parts.find((p) => p.type === 'era')?.value ?? 'AD'
  let year = get('year')
  if (era === 'BC' || era === 'B') year = 1 - year
  const local = utcMs(
    year,
    get('month'),
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second')
  )
  return local - floored
}

/**
 * instantMs 시점의 timeZone UTC offset(분, 초 단위 LMT 면 소수) — 캐시된 Intl 포매터라
 * 하루에 여러 번 읽는 호출자(캘린더 시진 경계)용. 잘못된 타임존이면 Intl 의 RangeError.
 */
export function utcOffsetMinutesAt(instantMs: number, timeZone: string): number {
  return offsetMsAt(instantMs, timeZone) / 60_000
}

function assertWallClock(w: WallClockInput): void {
  const second = w.second ?? 0
  const ok =
    [w.year, w.month, w.day, w.hour, w.minute, second].every(Number.isInteger) &&
    w.month >= 1 &&
    w.month <= 12 &&
    w.hour >= 0 &&
    w.hour <= 23 &&
    w.minute >= 0 &&
    w.minute <= 59 &&
    second >= 0 &&
    second <= 59
  if (ok) {
    // 2월 30일 같은 없는 날짜 거부 — setUTCFullYear 는 조용히 다음 달로 넘긴다.
    const t = new Date(utcMs(w.year, w.month, w.day, 0, 0, 0))
    if (
      t.getUTCFullYear() === w.year &&
      t.getUTCMonth() + 1 === w.month &&
      t.getUTCDate() === w.day
    )
      return
  }
  throw new RangeError(
    `Invalid wall clock: ${w.year}-${w.month}-${w.day} ${w.hour}:${w.minute}:${second}`
  )
}

/**
 * 출생 벽시계 + IANA 타임존 → 출생 순간(UTC). 사주·점성 공용 SSOT (OD-3, RFC 5545).
 * 없는 날짜·시각이면 RangeError, 잘못된 타임존이면 Intl 의 RangeError.
 */
export function resolveBirthInstant(wall: WallClockInput, timeZone: string): ResolvedBirthInstant {
  assertWallClock(wall)
  const naive = utcMs(wall.year, wall.month, wall.day, wall.hour, wall.minute, wall.second ?? 0)

  // 벽시계 앞뒤 하루의 offset 두 개가 후보다(하루 안에 전환이 두 번 있는 존은 없다).
  const before = offsetMsAt(naive - DAY_MS, timeZone)
  const after = offsetMsAt(naive + DAY_MS, timeZone)
  const valid = [...new Set([before, after])]
    .map((o) => naive - o)
    .filter((t) => offsetMsAt(t, timeZone) === naive - t)
    .sort((a, b) => a - b)

  if (valid.length > 0) {
    const t = valid[0] // 겹침이면 이른 쪽(첫 번째)
    return {
      utc: new Date(t),
      kind: valid.length > 1 ? 'overlap' : 'normal',
      offsetMinutes: (naive - t) / 60_000,
    }
  }

  // 공백: 전환 *직전* offset 으로 읽는다. 큰 쪽 offset 으로 뺀 instant 는 전환 전이라
  // 거기서 읽은 offset 이 직전 offset 이다.
  const prior = offsetMsAt(naive - Math.max(before, after), timeZone)
  return { utc: new Date(naive - prior), kind: 'gap', offsetMinutes: prior / 60_000 }
}

/**
 * 'YYYY-MM-DD' + 시·분 → resolveBirthInstant. 날짜 문자열 형식이 틀리면 RangeError.
 * 시각 문자열 파싱은 호출자가 parseHourMinute(@/lib/saju/timeParse)로 한다.
 */
export function resolveBirthInstantFromDate(
  dateStr: string,
  hour: number,
  minute: number,
  timeZone: string
): ResolvedBirthInstant {
  const m = /^(\d{1,4})-(\d{1,2})-(\d{1,2})$/.exec(String(dateStr ?? '').trim())
  if (!m) throw new RangeError(`Invalid date string: ${dateStr}`)
  return resolveBirthInstant(
    { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), hour, minute },
    timeZone
  )
}
