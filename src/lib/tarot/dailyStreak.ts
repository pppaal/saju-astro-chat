// 데일리 타로 연속 뽑기(스트릭) — 재방문 습관 루프. localStorage 만 사용해
// 게스트도 동작하고 DB 를 건드리지 않는다. KST '오늘'은 호출부가 서버가 준
// reading.date(KST 날짜)를 그대로 넘겨, 클라·서버 날짜 기준을 일치시킨다
// (클라에서 자정 롤오버를 다시 계산하다 어긋나는 문제 방지).

export const STREAK_KEY = 'dp_tarot_streak'

/** YYYY-MM-DD 하루 전(UTC 고정 계산 — 입력이 이미 KST 날짜 문자열이라 안전). */
export function prevDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/**
 * 오늘(today = KST 날짜) 카드를 처음 본 날에만 카운트를 갱신하고 현재 연속일을
 * 돌려준다. 어제 봤으면 +1, 하루라도 건너뛰었으면 1 로 리셋. 같은 날 재호출은
 * 그대로(멱등). localStorage 가 막히면 0.
 */
export function bumpStreakForToday(today: string): number {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    const data = raw ? (JSON.parse(raw) as { lastDate?: string; count?: number }) : {}
    let count = data.count || 0
    if (data.lastDate !== today) {
      count = data.lastDate === prevDay(today) ? count + 1 : 1
      localStorage.setItem(STREAK_KEY, JSON.stringify({ lastDate: today, count }))
    }
    return count
  } catch {
    return 0
  }
}
