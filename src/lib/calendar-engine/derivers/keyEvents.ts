import type { CalendarCell } from '../types'

/**
 * "이번 달 키 이벤트 3" — 본문에 흩어진 날짜 정보를 한눈에 모으는 추출형 요약.
 *
 *   🎯 베스트 날    — 그 달 가장 점수 높은 날 (큰 결정·시작에 best)
 *   💫 강한 구간     — 점수 높은 날이 연속으로 몰린 창 (집중 추진 구간)
 *   ⚠️ 피할 날       — 가장 점수 낮은 1~2일
 *
 * 모두 cells.derivedScore 에서 결정적으로 추출 — 새 계산/LLM 없음.
 */

export interface KeyEvents {
  best?: { date: string; score: number }
  window?: { start: string; end: string; avg: number }
  avoid?: { dates: string[] }
}

function mmdd(datetime: string): string {
  return datetime.slice(5, 10)
}

export function deriveKeyEvents(cells: CalendarCell[]): KeyEvents | undefined {
  const dated = cells
    .filter((c) => c.datetime && typeof c.derivedScore === 'number')
    .map((c) => ({
      datetime: c.datetime,
      day: Number(c.datetime.slice(8, 10)),
      score: c.derivedScore,
    }))
    .filter((x) => x.day >= 1 && x.day <= 31)
    .sort((a, b) => a.day - b.day)
  if (dated.length < 7) return undefined

  const out: KeyEvents = {}

  // 베스트 날 — 최고 점수 (동률이면 이른 날)
  const best = [...dated].sort((a, b) => b.score - a.score || a.day - b.day)[0]
  if (best) out.best = { date: mmdd(best.datetime), score: best.score }

  // 피할 날 — 하위 2일 (단, 평이하면 표시 안 함: 65점 미만만 "피할" 가치)
  const low = [...dated]
    .sort((a, b) => a.score - b.score || a.day - b.day)
    .filter((x) => x.score < 65)
  if (low.length > 0) out.avoid = { dates: low.slice(0, 2).map((x) => mmdd(x.datetime)) }

  // 강한 구간 — 점수 ≥ (월평균 + 5) 인 날이 3일 이상 연속으로 몰린 최장 창
  const avgMonth = dated.reduce((a, b) => a + b.score, 0) / dated.length
  const threshold = avgMonth + 5
  type Run = { start: number; end: number; sum: number; len: number }
  const runs: Run[] = []
  let curStart = -1
  let curSum = 0
  let curLen = 0
  for (let i = 0; i < dated.length; i++) {
    const strong = dated[i].score >= threshold
    const consecutive = curLen > 0 && dated[i].day === dated[i - 1].day + 1
    if (strong && (curLen === 0 || consecutive)) {
      // run 시작 또는 연장
      if (curLen === 0) curStart = i
      curSum += dated[i].score
      curLen += 1
    } else {
      // run 종료 (점수 미달이거나 날짜 끊김)
      if (curLen >= 3) runs.push({ start: curStart, end: i - 1, sum: curSum, len: curLen })
      if (strong) {
        // 끊긴 자리에서 새 run 시작
        curStart = i
        curSum = dated[i].score
        curLen = 1
      } else {
        curStart = -1
        curSum = 0
        curLen = 0
      }
    }
  }
  if (curLen >= 3) runs.push({ start: curStart, end: dated.length - 1, sum: curSum, len: curLen })
  // 최장 run (동률이면 평균 높은 쪽)
  const bestRun = runs.sort((a, b) => b.len - a.len || b.sum / b.len - a.sum / a.len)[0]
  if (bestRun) {
    out.window = {
      start: mmdd(dated[bestRun.start].datetime),
      end: mmdd(dated[bestRun.end].datetime),
      avg: Math.round(bestRun.sum / bestRun.len),
    }
  }

  return Object.keys(out).length > 0 ? out : undefined
}
