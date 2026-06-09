/**
 * 안전 시간 파서 — 'HH:MM' / 'HH:MM AM|PM' / 비표준 표기를 24h 로 정규화한다.
 *
 * 의존성 없는 순수 함수라 별도 모듈로 분리했다(saju.ts 는 무거워 dynamic import
 * 되고 테스트에서 mock 되므로, 라우트가 AM/PM 정규화만 필요할 때 이 경량 모듈을
 * 정적 import 한다). saju.ts 의 사주 계산과 캘린더 라우트의 자연차트/마일스톤이
 * 동일한 파서를 쓰게 해 'HH:MM PM' 가 12시간 어긋나는 버그를 막는다.
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
