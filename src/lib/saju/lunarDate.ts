/**
 * 음력 → 양력 변환 단일 출처 (korean-lunar-calendar 래퍼).
 *
 * 엔진(calculateSajuData)과 API 검증(sajuCalculationRequestSchema)이 같은 함수로 "그 음력
 * 날짜가 실제로 있는가"를 판정한다 — 검증을 통과한 날짜가 엔진에서 throw 해 500 이 되던
 * 결함 클래스를 막는다(재감사 SP-3).
 *
 * 없는 음력 날짜:
 *  - 29일짜리 작은달의 30일 (1990 음력 1·3·4월 30일 — 1990-01-30 은 없다)
 *  - 그해에 없는 윤달 (2023 은 윤2월만 있다 — 윤3월 1일은 없다). 라이브러리는 없는
 *    윤달 플래그를 조용히 무시하고 평달로 바꿔 주므로, 변환 뒤 윤달 여부를 다시 읽어
 *    요청과 같은지 확인한다.
 *  - 라이브러리 지원 범위(음력 1000-01-01 … 2050-11-18 = 양력 2050-12-31) 밖
 *
 * 반대로 음력 2월 30일처럼 *양력으로는 없는* 날짜도 음력으로는 있을 수 있다(1990 음력
 * 2월은 30일 → 양력 1990-03-26). 그래서 음력 입력에는 그레고리력 유효성 검사를 쓰지 않는다.
 */

import Calendar from 'korean-lunar-calendar'

/** 라이브러리가 변환하는 마지막 음력 날짜(양력 2050-12-31). */
export const LUNAR_MAX = { year: 2050, month: 11, day: 18 } as const
/** 라이브러리가 변환하는 첫 음력 날짜. */
const LUNAR_MIN = { year: 1000, month: 1, day: 1 } as const

export type InvalidLunarDateReason = 'not-exist' | 'out-of-range'

/**
 * 없는 음력 날짜 — 엔진이 던지는 전용 에러. 메시지에 'invalid' 가 들어 있어 API 미들웨어
 * 분류기가 VALIDATION_ERROR(422)로 돌린다(검증을 우회한 호출에서도 500 이 아니다).
 */
export class InvalidLunarDateError extends RangeError {
  readonly reason: InvalidLunarDateReason
  readonly lunar: { year: number; month: number; day: number; leap: boolean }

  constructor(
    lunar: { year: number; month: number; day: number; leap: boolean },
    reason: InvalidLunarDateReason
  ) {
    const label = `${lunar.year}-${lunar.month}-${lunar.day}${lunar.leap ? ' (leap month)' : ''}`
    super(
      reason === 'out-of-range'
        ? `invalid lunar date ${label}: outside the supported range (lunar ${LUNAR_MIN.year}-${LUNAR_MIN.month}-${LUNAR_MIN.day} … ${LUNAR_MAX.year}-${LUNAR_MAX.month}-${LUNAR_MAX.day})`
        : `invalid lunar date ${label}: this lunar date does not exist`
    )
    this.name = 'InvalidLunarDateError'
    this.reason = reason
    this.lunar = lunar
  }
}

function cmp(
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number }
): number {
  return a.year - b.year || a.month - b.month || a.day - b.day
}

/**
 * 음력 (year, month, day, leap) → 양력 { year, month, day }. 없는 날짜면 이유와 함께
 * { ok: false }. 순수 함수(라이브러리 표 조회).
 */
export function lunarToSolar(
  year: number,
  month: number,
  day: number,
  leap = false
):
  | { ok: true; solar: { year: number; month: number; day: number } }
  | { ok: false; reason: InvalidLunarDateReason } {
  const want = { year, month, day }
  if (![year, month, day].every(Number.isInteger)) return { ok: false, reason: 'not-exist' }
  if (cmp(want, LUNAR_MIN) < 0 || cmp(want, LUNAR_MAX) > 0) {
    return { ok: false, reason: 'out-of-range' }
  }
  if (month < 1 || month > 12 || day < 1 || day > 30) return { ok: false, reason: 'not-exist' }
  const cal = new Calendar()
  const ok = cal.setLunarDate(year, month, day, leap)
  const solar = cal.getSolarCalendar()
  if (!ok || !solar.year) return { ok: false, reason: 'not-exist' }
  // 없는 윤달은 라이브러리가 평달로 바꿔 준다 — 변환된 음력이 요청과 같은지 확인.
  const got = cal.getLunarCalendar()
  if (
    got.year !== year ||
    got.month !== month ||
    got.day !== day ||
    Boolean(got.intercalation) !== leap
  ) {
    return { ok: false, reason: 'not-exist' }
  }
  return { ok: true, solar: { year: solar.year, month: solar.month, day: solar.day } }
}

/** 'YYYY-MM-DD' 음력 문자열이 실제로 있는 날짜인가(윤달 플래그 포함). */
export function isExistingLunarDate(date: string, leap = false): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date ?? '').trim())
  if (!m) return false
  return lunarToSolar(Number(m[1]), Number(m[2]), Number(m[3]), leap).ok
}

/**
 * 음력 'YYYY-MM-DD' → 양력 'YYYY-MM-DD'. 없는 날짜면 InvalidLunarDateError 를 던진다.
 */
export function lunarDateToSolarString(date: string, leap = false): string {
  const [y, m, d] = String(date ?? '')
    .trim()
    .split('-')
    .map(Number)
  const r = lunarToSolar(y, m, d, leap)
  if (!r.ok) throw new InvalidLunarDateError({ year: y, month: m, day: d, leap }, r.reason)
  const { year, month, day } = r.solar
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
