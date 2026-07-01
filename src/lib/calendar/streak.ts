/**
 * 방문 스트릭(연속 확인) 순수 로직 — 클라이언트 localStorage 상태를 갱신하는
 * 결정적 함수. 서버/DB 없이 브라우저 로컬로만 동작하는 MVP(교차기기·영속은 향후
 * 서버 스키마로 승격). 날짜는 모두 사용자 로컬 'YYYY-MM-DD'.
 *
 *  - 같은 날 재방문 → count 유지
 *  - 바로 어제 방문 → count + 1
 *  - 그 외(하루 이상 공백 · 미래 · 이상값) → 1 로 리셋
 */

export interface StreakState {
  /** 마지막 방문일 'YYYY-MM-DD'(로컬). */
  last: string
  /** 연속 방문 일수(≥1). */
  count: number
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

function isYmd(s: unknown): s is string {
  return typeof s === 'string' && YMD_RE.test(s)
}

/** 'YYYY-MM-DD' → UTC epoch day(정오 UTC 로 파싱해 DST 무관). 이상값이면 NaN. */
function toDayNum(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  const ms = Date.UTC(y, m - 1, d, 12)
  return Number.isNaN(ms) ? NaN : Math.floor(ms / 86_400_000)
}

/** localStorage 등에서 읽은 미검증 값을 StreakState 로 정규화(아니면 null). */
export function parseStreak(raw: unknown): StreakState | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (!isYmd(o.last) || typeof o.count !== 'number' || !Number.isFinite(o.count)) return null
  return { last: o.last, count: Math.max(1, Math.trunc(o.count)) }
}

/**
 * 스트릭 갱신. prev(이전 상태 또는 null)와 today('YYYY-MM-DD')로 다음 상태 산출.
 */
export function computeStreak(prev: StreakState | null, today: string): StreakState {
  if (!isYmd(today)) return prev ?? { last: today, count: 1 }
  if (!prev || !isYmd(prev.last)) return { last: today, count: 1 }
  if (prev.last === today) return { last: today, count: Math.max(1, prev.count) }
  const diff = toDayNum(today) - toDayNum(prev.last)
  if (diff === 1) return { last: today, count: Math.max(1, prev.count) + 1 }
  // 하루 이상 공백 · 미래(음수) · 이상값 → 리셋.
  return { last: today, count: 1 }
}
