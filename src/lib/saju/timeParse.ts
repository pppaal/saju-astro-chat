/**
 * 안전 시간 파서 — 'HH:MM' / 'HH:MM AM|PM' / 비표준 표기를 24h 로 정규화한다.
 *
 * 의존성 없는 순수 함수. 사주 계산(saju.ts)·캘린더 자연차트(astroFacts.ts)·
 * 컨텍스트 빌드(calendar-engine/context/build.ts)가 모두 이 단일 파서를 써서
 * 'HH:MM PM' 가 12시간 어긋나는 버그(split(':') 직접 파싱)를 막는다.
 */
export function parseHourMinute(t: string): { h: number; m: number } {
  const s = String(t ?? '')
    .trim()
    .toUpperCase()
  const isPM = /\bPM$/.test(s)
  const isAM = /\bAM$/.test(s)
  const core = s.replace(/\s?(AM|PM)$/i, '')
  const [hh = '0', mm = '0'] = core.split(':')
  let h = Number(hh)
  let m = Number(mm?.replace(/\D/g, '') ?? '0')
  if (isPM && h < 12) {
    h += 12
  }
  if (isAM && h === 12) {
    h = 0
  }
  if (!Number.isFinite(h)) {
    h = 0
  }
  if (!Number.isFinite(m)) {
    m = 0
  }
  if (h < 0) {
    h = 0
  }
  if (h > 23) {
    h = 23
  }
  if (m < 0) {
    m = 0
  }
  if (m > 59) {
    m = 59
  }
  return { h, m }
}
