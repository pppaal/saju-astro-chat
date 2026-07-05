/**
 * 무한 증식 테이블 보존기간 스윕 — 일일 크론(reset-credits)에서 호출.
 *
 * DB 감사에서 확인된, INSERT 만 있고 정리가 없어 영원히 자라는 테이블들:
 *   · PageView          — 방문(익명 포함)마다 1행. 앱 최다 쓰기 볼륨.
 *   · CalendarBuildCache — birthKey 당 월/일 셀 JSON 블롭(월 수백 KB). 엔진 버전이
 *     birthKey 에 접혀 있어 버전 bump 때마다 옛 행 전부가 영구 고아가 된다.
 *   · NatalContextCache  — 현행 버전 행은 영구가 맞지만(본명은 불변), 옛
 *     engineSignature 행은 다시는 조회되지 않는 고아.
 *   · SharedResult       — expiresAt 이 지난 공유 링크가 방치됨(null=영구는 유지).
 *
 * 전부 fail-soft 캐시/로그라 삭제해도 재계산·재기록될 뿐 정합성 영향이 없다.
 * (CreditTransaction 등 원장 테이블은 절대 건드리지 않는다 — append-only 가 설계.)
 *
 * 대량 첫 실행이 커넥션을 오래 잡지 않게 id 배치(LIMIT n)로 지우고 실행당 배치
 * 수를 캡한다 — 밀린 양은 다음 날 크론이 이어서 지우며 수일 내 수렴한다.
 */
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { CALENDAR_ENGINE_VERSION } from '@/lib/calendar-engine/persistence'

const DAY_MS = 86_400_000

/** 보존 정책 — 필요 시 여기서만 조정. */
export const RETENTION = {
  /** 방문 로그 — 어드민 지표는 최근 창만 본다(overview/funnel 30~90d). */
  pageViewDays: 180,
  /** 캘린더 셀 캐시 — 재방문 시 그 달만 재빌드(~0.3s)라 부담 없음. */
  calendarCacheDays: 90,
} as const

/** 배치 삭제 — id 를 LIMIT 으로 끊어 지워 단일 롱 트랜잭션/락을 피한다. */
async function deleteInBatches(
  pick: (take: number) => Promise<Array<{ id: string }>>,
  del: (ids: string[]) => Promise<{ count: number }>,
  { batchSize = 5000, maxBatches = 20 } = {}
): Promise<number> {
  let total = 0
  for (let i = 0; i < maxBatches; i++) {
    const rows = await pick(batchSize)
    if (rows.length === 0) break
    const r = await del(rows.map((x) => x.id))
    total += r.count
    if (rows.length < batchSize) break
  }
  return total
}

export interface RetentionSweepResult {
  pageViewsDeleted: number
  calendarCacheDeleted: number
  natalOrphansDeleted: number
  expiredSharesDeleted: number
}

export async function sweepDataRetention(now: Date = new Date()): Promise<RetentionSweepResult> {
  const result: RetentionSweepResult = {
    pageViewsDeleted: 0,
    calendarCacheDeleted: 0,
    natalOrphansDeleted: 0,
    expiredSharesDeleted: 0,
  }

  // 1) PageView — 보존기간 초과분. @@index([createdAt]) 로 pick 이 싸다.
  try {
    const cutoff = new Date(now.getTime() - RETENTION.pageViewDays * DAY_MS)
    result.pageViewsDeleted = await deleteInBatches(
      (take) =>
        prisma.pageView.findMany({
          where: { createdAt: { lt: cutoff } },
          select: { id: true },
          take,
        }),
      (ids) => prisma.pageView.deleteMany({ where: { id: { in: ids } } })
    )
  } catch (err) {
    logger.error('[dataRetention] pageView sweep failed', {
      err: err instanceof Error ? err.message : String(err),
    })
  }

  // 2) CalendarBuildCache — 오래 안 쓰인 셀 블롭. @@index([builtAt]).
  //    (birthKey 에 엔진 버전이 접혀 있어 버전 고아도 이 스윕으로 함께 수렴.)
  try {
    const cutoff = new Date(now.getTime() - RETENTION.calendarCacheDays * DAY_MS)
    result.calendarCacheDeleted = await deleteInBatches(
      (take) =>
        prisma.calendarBuildCache.findMany({
          where: { builtAt: { lt: cutoff } },
          select: { id: true },
          take,
        }),
      (ids) => prisma.calendarBuildCache.deleteMany({ where: { id: { in: ids } } })
    )
  } catch (err) {
    logger.error('[dataRetention] calendarBuildCache sweep failed', {
      err: err instanceof Error ? err.message : String(err),
    })
  }

  // 3) NatalContextCache — 현행 버전은 영구 보존, 옛 버전 시그니처만 삭제.
  //    @@index([engineSignature]).
  try {
    result.natalOrphansDeleted = await deleteInBatches(
      (take) =>
        prisma.natalContextCache.findMany({
          where: { engineSignature: { not: CALENDAR_ENGINE_VERSION } },
          select: { id: true },
          take,
        }),
      (ids) => prisma.natalContextCache.deleteMany({ where: { id: { in: ids } } })
    )
  } catch (err) {
    logger.error('[dataRetention] natalContextCache sweep failed', {
      err: err instanceof Error ? err.message : String(err),
    })
  }

  // 4) SharedResult — 만료 지난 공유 링크만(expiresAt null=영구는 유지).
  try {
    result.expiredSharesDeleted = await deleteInBatches(
      (take) =>
        prisma.sharedResult.findMany({
          where: { expiresAt: { lt: now } },
          select: { id: true },
          take,
        }),
      (ids) => prisma.sharedResult.deleteMany({ where: { id: { in: ids } } })
    )
  } catch (err) {
    logger.error('[dataRetention] sharedResult sweep failed', {
      err: err instanceof Error ? err.message : String(err),
    })
  }

  return result
}
