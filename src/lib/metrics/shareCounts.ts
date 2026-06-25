/**
 * 공유 생성수 영구 집계 — recordCounter 는 인메모리/인스턴스별이라 어드민
 * 지표로 못 쓴다. 공유 링크가 만들어질 때마다 Redis 일별 카운터를 원자적으로
 * 올리고(`funnel:share:<kind>:<UTC날짜>`), 어드민이 최근 N일을 합산해 본다.
 *
 * 서버 전용(Upstash). Redis 없으면 best-effort 로 조용히 skip/0.
 */

import { cacheIncr, cacheMGetNumbers } from '@/lib/cache/redis-cache'

export type ShareKind = 'report' | 'compatibility' | 'tarot' | 'calendar'
export const SHARE_KINDS: readonly ShareKind[] = ['report', 'compatibility', 'tarot', 'calendar']

// 최대 조회(90일)보다 길게 보존해 경계 손실 방지.
const TTL_SECONDS = 100 * 24 * 60 * 60

const utcDay = (d: Date): string => d.toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
const keyFor = (kind: ShareKind, day: string): string => `funnel:share:${kind}:${day}`

/** 공유 생성 1건 집계(원자적). best-effort — 실패해도 공유 흐름엔 영향 없음. */
export async function bumpShareCreated(kind: ShareKind, now: Date = new Date()): Promise<void> {
  await cacheIncr(keyFor(kind, utcDay(now)), TTL_SECONDS)
}

export interface ShareCreatedCounts {
  total: number
  byKind: Record<ShareKind, number>
}

/** 최근 days 일의 공유 생성수를 종류별·합계로 집계. */
export async function getShareCreatedCounts(
  days: number,
  now: Date = new Date()
): Promise<ShareCreatedCounts> {
  const keys: string[] = []
  const kindOf: ShareKind[] = []
  for (let i = 0; i < days; i++) {
    const day = utcDay(new Date(now.getTime() - i * 24 * 60 * 60 * 1000))
    for (const k of SHARE_KINDS) {
      kindOf.push(k)
      keys.push(keyFor(k, day))
    }
  }
  const vals = await cacheMGetNumbers(keys)
  const byKind: Record<ShareKind, number> = {
    report: 0,
    compatibility: 0,
    tarot: 0,
    calendar: 0,
  }
  let total = 0
  vals.forEach((v, i) => {
    if (!v) return
    byKind[kindOf[i]] += v
    total += v
  })
  return { total, byKind }
}
