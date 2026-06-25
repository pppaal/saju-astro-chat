// src/lib/cron/dailyOnce.ts
//
// "이 cron 을 오늘(KST) 처음 실행하는가?" 를 원자적으로 판정하는 하루-1회
// 가드. Vercel cron(vercel.json) 과 GitHub Actions 스케줄러(.github/workflows/
// daily-automation.yml)가 같은 날 같은 엔드포인트를 둘 다 때려도, 사용자에게
// 영향을 주는 작업(예: 푸시 발송)을 한 번만 수행하게 만든다.
//
// CLAUDE.md 의 머니/멱등 컨벤션과 동일하게 read-then-write 가 아니라
// create-as-lock 으로 구현 — RequestIdempotencyLog(scopedKey PK) 의 unique
// 충돌이 교차-인스턴스 race 까지 닫는다. 마커는 sweepExpiredIdempotency 가
// 만료 후 정리하므로 누적되지 않는다.

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { todayKeyKST } from '@/lib/social/generateDrafts'

// 마커 보존 기간 — 하루 가드 목적상 길 필요 없지만, 정산 지연/타임존 경계에
// 여유를 두고 며칠 보관 후 스윕에 맡긴다.
const DAILY_ONCE_TTL_MS = 3 * 24 * 60 * 60 * 1000

/**
 * 오늘(KST) 첫 실행이면 true(선점 성공), 이미 누군가 실행했으면 false.
 *
 *   true  → 호출자가 작업을 수행한다.
 *   false → 호출자는 스킵한다.
 *
 * DB 장애 시엔 fail-open(true) — 가드의 목적은 중복 방지이지 발송 차단이
 * 아니므로, "한 번 더 보낼 위험"이 "그날 아예 누락"보다 낫다. 푸시 핸들러는
 * per-구독 상태로 best-effort 라 이중 발송이 치명적이지 않다.
 */
export async function claimDailyOnce(name: string, now: Date = new Date()): Promise<boolean> {
  const scopedKey = `cron-daily:${name}:${todayKeyKST(now)}`
  const expiresAt = new Date(now.getTime() + DAILY_ONCE_TTL_MS)
  try {
    await prisma.requestIdempotencyLog.create({ data: { scopedKey, expiresAt } })
    return true
  } catch (err) {
    const code = (err as { code?: string } | undefined)?.code
    if (code === 'P2002') {
      // 이미 오늘 선점됨 → 스킵.
      return false
    }
    logger.warn('[claimDailyOnce] claim failed, treating as first run', {
      scopedKey,
      err: err instanceof Error ? err.message : String(err),
    })
    return true
  }
}
