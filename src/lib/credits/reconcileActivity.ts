/**
 * 과금↔활동 정합성(reconciliation) — "크레딧은 차감됐는데 그 활동 레코드가 없음"
 * 을 *사후에* 정확히 잡는다.
 *
 * 배경: 과금은 서버에서 원자적으로 일어나지만 활동 기록(세션/리딩)은 클라
 * best-effort 저장에 의존하던 시절, 클라 저장이 끝내 도착하지 않으면 "차감 1,
 * 활동 0" 인 조용한 매출 버그가 났다. ensure*Record 안전망이 그 갭을 메우지만,
 * 안전망 자체가 실패하거나 새 과금 경로가 안전망을 빼먹으면 다시 갭이 생긴다.
 * 이 함수는 그걸 *감지*하는 그물 — 패치(증상)가 아니라 부류를 잡는 장치다.
 *
 * 동작: consumeCredits 가 CONSUME 감사행 metadata 에 박은 활동 링크
 * (activityType + activityRef = 활동 레코드 PK)를 읽어, 해당 PK 의 행이 실제로
 * 존재하는지 배치 확인한다. 없으면 "고아 과금(orphaned charge)" 으로 보고.
 *
 * 한계(v1, 의도된 보수성):
 *  - 활동 링크가 없는 과금(레거시/게스트/링크 누락)은 스캔 대상이 아니다.
 *  - 정당하게 *환불된* 턴(replay 등)도 활동 레코드가 없을 수 있다 → 고아로
 *    잡힐 수 있다. 조치 전 같은 사용자·기간의 REFUND/REVOKE 와 교차 확인할 것.
 *  - tarot_followup 은 부모 리딩 존재만 확인한다(append 턴 자체가 아니라).
 */

import { prisma } from '@/lib/db/prisma'

export type ChargeActivityType =
  | 'counselor_session'
  | 'compat_session'
  | 'tarot_reading'
  | 'tarot_followup'

export interface OrphanedCharge {
  transactionId: string
  userId: string
  createdAt: Date
  amount: number
  apiRoute?: string
  activityType: ChargeActivityType
  activityRef: string
}

export interface ReconcileResult {
  /** 윈도 내 스캔한 CONSUME 행 수. */
  scanned: number
  /** 그중 활동 링크(activityType+activityRef)가 있던 행 수. */
  linked: number
  /** 링크는 있는데 활동 레코드가 없는 고아 과금. */
  orphaned: OrphanedCharge[]
}

interface LinkedCharge extends OrphanedCharge {}

function readLink(
  metadata: unknown
): { activityType: ChargeActivityType; activityRef: string; apiRoute?: string } | null {
  if (typeof metadata !== 'object' || metadata === null) return null
  const m = metadata as Record<string, unknown>
  const activityType = m.activityType
  const activityRef = m.activityRef
  if (typeof activityType !== 'string' || typeof activityRef !== 'string' || !activityRef) {
    return null
  }
  if (
    activityType !== 'counselor_session' &&
    activityType !== 'compat_session' &&
    activityType !== 'tarot_reading' &&
    activityType !== 'tarot_followup'
  ) {
    return null
  }
  return {
    activityType,
    activityRef,
    apiRoute: typeof m.apiRoute === 'string' ? m.apiRoute : undefined,
  }
}

/**
 * 윈도 내 CONSUME 감사행을 스캔해, 활동 링크가 가리키는 레코드가 실제로
 * 존재하는지 확인하고 고아 과금을 반환한다.
 */
export async function findOrphanedCharges(opts: {
  since: Date
  until?: Date
  /** 스캔 상한(과부하 방지). 기본 5000. */
  limit?: number
}): Promise<ReconcileResult> {
  const rows = await prisma.creditTransaction.findMany({
    where: {
      type: 'CONSUME',
      createdAt: { gte: opts.since, ...(opts.until ? { lte: opts.until } : {}) },
    },
    select: { id: true, userId: true, createdAt: true, amount: true, metadata: true },
    orderBy: { createdAt: 'desc' },
    take: opts.limit ?? 5000,
  })

  const linked: LinkedCharge[] = []
  for (const r of rows) {
    const link = readLink(r.metadata)
    if (!link) continue
    linked.push({
      transactionId: r.id,
      userId: r.userId,
      createdAt: r.createdAt,
      amount: r.amount,
      apiRoute: link.apiRoute,
      activityType: link.activityType,
      activityRef: link.activityRef,
    })
  }

  // 활동 종류별로 PK 를 모아 배치 존재 확인(테이블당 쿼리 1번).
  const counselorRefs = new Set<string>()
  const tarotRefs = new Set<string>()
  for (const l of linked) {
    if (l.activityType === 'counselor_session' || l.activityType === 'compat_session') {
      counselorRefs.add(l.activityRef)
    } else {
      tarotRefs.add(l.activityRef)
    }
  }

  const [counselorRows, tarotRows] = await Promise.all([
    counselorRefs.size
      ? prisma.counselorChatSession.findMany({
          where: { id: { in: [...counselorRefs] } },
          select: { id: true },
        })
      : Promise.resolve([] as { id: string }[]),
    tarotRefs.size
      ? prisma.tarotReading.findMany({
          where: { id: { in: [...tarotRefs] } },
          select: { id: true },
        })
      : Promise.resolve([] as { id: string }[]),
  ])

  const existing = new Set<string>()
  for (const r of counselorRows) existing.add(r.id)
  for (const r of tarotRows) existing.add(r.id)

  const orphaned = linked.filter((l) => !existing.has(l.activityRef))

  return { scanned: rows.length, linked: linked.length, orphaned }
}
