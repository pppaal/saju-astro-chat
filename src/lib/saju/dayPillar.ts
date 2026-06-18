/**
 * 일기둥(일간·일지) 계산의 단일 소스.
 *
 * 사주 본 계산(calculateSajuData), 일진 달력(getIljinCalendar), 그리고
 * calendar-engine 의 일일 신살 추출기가 모두 "그레고리력 → 율리우스적일(JDN)
 * → 60갑자 정렬" 공식을 각자 복붙해 쓰고 있었다. 한 곳만 고치면 결과가 갈라질
 * 수 있어 여기로 모은다. 값/오프셋은 기존 구현과 바이트 단위로 동일하다.
 */

/**
 * 그레고리력 (year, month, day) → 율리우스적일(Julian Day Number).
 * month 는 1–12, day 는 1–31 (UTC/로컬 구분 없이 호출부가 넘긴 달력 값 그대로).
 */
function computeJulianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  )
}

// JDN 을 60갑자에 정렬하는 (+49) 오프셋 — 천간 10주기 / 지지 12주기.
function dayStemIndexFromJDN(jdn: number): number {
  return (jdn + 49) % 10
}
function dayBranchIndexFromJDN(jdn: number): number {
  return (jdn + 49) % 12
}

/** (year, month, day) → 일간/일지 인덱스(+JDN) 한 번에. */
export function computeDayPillarIndices(
  year: number,
  month: number,
  day: number
): { jdn: number; stemIndex: number; branchIndex: number } {
  const jdn = computeJulianDayNumber(year, month, day)
  return {
    jdn,
    stemIndex: dayStemIndexFromJDN(jdn),
    branchIndex: dayBranchIndexFromJDN(jdn),
  }
}
