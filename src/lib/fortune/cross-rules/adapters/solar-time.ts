// Solar time correction for saju adapter — opt-in.
//
// 표준시(KST) 기본. 일부 사주 학파는 평균태양시·진태양시를 사용함.
//
// 평균태양시: 출생지 경도 기반 평균 태양 시각.
//   서울(126.98°E)는 표준 자오선(135°E) 대비 8.02° 서쪽 → -32.08분.
// 진태양시: 평균태양시 + 균시차(equation of time, ±16분 계절 변동).
//
// 두 보정 모두 birthTime을 시·분만 이동 — 날짜는 그대로 (자정 넘기는 케이스만 별도 처리).

export type SolarTimeMode = 'standard' | 'meanSolar' | 'trueSolar'

const STANDARD_MERIDIAN_E = 135 // KST 표준 자오선

/** Day of year (1~366) */
function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = (date.getTime() - start.getTime()) / 86400000
  return Math.floor(diff)
}

/**
 * Equation of Time (분 단위).
 * 표준 근사 공식: B = 2π(N-81)/365
 * EoT(min) = 9.87 sin(2B) - 7.53 cos(B) - 1.5 sin(B)
 *
 * 양수 = 진태양시가 평균태양시보다 빠름 (시계 시각 > 실제 태양 시각).
 * 사용 시: 진태양 시각 = 평균태양 시각 - EoT (sun is "fast" by EoT min, so
 * actual sundial reads more — but for converting clock to sundial we subtract).
 */
function equationOfTimeMinutes(date: Date): number {
  const N = dayOfYear(date)
  const B = (2 * Math.PI * (N - 81)) / 365
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)
}

/**
 * Returns the corrected birth time (HH:mm) given the original birthTime,
 * birthDate (for EoT calculation), longitude, and mode.
 *
 * If the correction shifts time across a day boundary, also returns adjusted
 * date offset (-1 / 0 / +1 days).
 */
export function correctSolarTime(
  birthDate: string, // 'YYYY-MM-DD'
  birthTime: string, // 'HH:mm'
  longitude: number,
  mode: SolarTimeMode,
): { date: string; time: string } {
  if (mode === 'standard') return { date: birthDate, time: birthTime }

  const [y, m, d] = birthDate.split('-').map(Number)
  const [hh, mm] = birthTime.split(':').map(Number)

  // 평균태양시 보정: (longitude - standard meridian) * 4 min/deg
  const meanSolarOffsetMin = (longitude - STANDARD_MERIDIAN_E) * 4

  let totalOffsetMin = meanSolarOffsetMin
  if (mode === 'trueSolar') {
    const dt = new Date(y, m - 1, d)
    totalOffsetMin += equationOfTimeMinutes(dt)
  }

  // Apply offset to birth time
  const totalMinutes = hh * 60 + mm + totalOffsetMin
  let dayOffset = 0
  let adjMinutes = totalMinutes
  if (adjMinutes < 0) {
    adjMinutes += 24 * 60
    dayOffset = -1
  } else if (adjMinutes >= 24 * 60) {
    adjMinutes -= 24 * 60
    dayOffset = 1
  }
  const newHh = Math.floor(adjMinutes / 60)
  const newMm = Math.round(adjMinutes - newHh * 60)
  const finalHh = newHh % 24
  const finalMm = Math.max(0, Math.min(59, newMm))

  let outDate = birthDate
  if (dayOffset !== 0) {
    const adjusted = new Date(y, m - 1, d + dayOffset)
    outDate = `${adjusted.getFullYear()}-${String(adjusted.getMonth() + 1).padStart(2, '0')}-${String(adjusted.getDate()).padStart(2, '0')}`
  }

  return {
    date: outDate,
    time: `${String(finalHh).padStart(2, '0')}:${String(finalMm).padStart(2, '0')}`,
  }
}
