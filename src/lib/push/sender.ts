// src/lib/push/sender.ts
//
// 공용 웹푸시 발송기 — daily-fortune·큰날·윈백·테스트가 모두 같은 검증된
// 배치/정리 로직을 쓰도록 추출. 구독 소멸(404/410)은 즉시 삭제, 기타 실패는
// failCount 누적(임계 초과 시 삭제), 성공은 lastSentAt 갱신. 서버 전용.

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { getWebPush } from './webPush'

// 동시 발송 폭 — 한 번에 푸시 서비스로 보내는 요청 수.
const BATCH_SIZE = 10
// 연속 실패 임계 — 이 이상이면 죽은 구독으로 보고 정리.
const MAX_FAIL_COUNT = 5
// 기본 TTL — 아침 알림류는 12시간이면 의미가 끝난다.
const DEFAULT_TTL_SECONDS = 12 * 60 * 60

export interface PushTarget {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  failCount: number
}

export interface PushPayload {
  title: string
  body: string
  /** 클릭 시 열 경로(기본 '/'). */
  url?: string
}

export interface PushSendSummary {
  total: number
  sent: number
  pruned: number
  failed: number
  /** VAPID 미설정으로 아예 못 보냈는지. */
  notConfigured?: boolean
}

/**
 * 대상 구독들에 푸시를 보낸다. buildPayload 가 null 을 돌려준 구독은 건너뛴다
 * (대상이지만 오늘 보낼 내용이 없는 경우). DB 반영(성공/실패/정리)은 일괄 처리.
 */
export async function sendPushToTargets(
  targets: PushTarget[],
  buildPayload: (t: PushTarget) => PushPayload | null,
  opts: { ttlSeconds?: number; label?: string } = {}
): Promise<PushSendSummary> {
  const webpush = getWebPush()
  if (!webpush) {
    return { total: targets.length, sent: 0, pruned: 0, failed: 0, notConfigured: true }
  }

  const ttl = opts.ttlSeconds ?? DEFAULT_TTL_SECONDS
  const now = new Date()
  const sentIds: string[] = []
  const pruneIds: string[] = []
  const failIncrementIds: string[] = []
  let failedCount = 0
  let skipped = 0

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async (sub) => {
        const payload = buildPayload(sub)
        if (!payload) {
          skipped += 1
          return
        }
        const body = JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url ?? '/',
        })
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
            { TTL: ttl }
          )
          sentIds.push(sub.id)
        } catch (err) {
          const statusCode = (err as { statusCode?: number })?.statusCode
          if (statusCode === 404 || statusCode === 410) {
            pruneIds.push(sub.id) // 구독 소멸 — 즉시 정리.
          } else {
            failedCount += 1
            if (sub.failCount + 1 >= MAX_FAIL_COUNT) pruneIds.push(sub.id)
            else failIncrementIds.push(sub.id)
          }
        }
      })
    )
  }

  if (sentIds.length > 0) {
    await prisma.pushSubscription.updateMany({
      where: { id: { in: sentIds } },
      data: { lastSentAt: now, failCount: 0 },
    })
  }
  if (failIncrementIds.length > 0) {
    await prisma.pushSubscription.updateMany({
      where: { id: { in: failIncrementIds } },
      data: { failCount: { increment: 1 } },
    })
  }
  if (pruneIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: pruneIds } } })
  }

  const summary: PushSendSummary = {
    total: targets.length,
    sent: sentIds.length,
    pruned: pruneIds.length,
    failed: failedCount,
  }
  logger.warn(`[push/sender${opts.label ? `:${opts.label}` : ''}] completed`, {
    ...summary,
    skipped,
  })
  return summary
}
