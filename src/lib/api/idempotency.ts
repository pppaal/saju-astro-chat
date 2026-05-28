// 새로고침/뒤로가기/다른 탭 등으로 같은 요청이 다시 들어왔을 때 크레딧이
// 중복 차감되지 않도록 막는 멱등성 가드.
//
// 패턴:
//   1) 클라이언트가 매 turn 마다 고유 키(UUID 또는 결정론적 signature)를
//      'x-idempotency-key' 헤더로 보냄.
//   2) 라우트 핸들러는 (route|userId|ip):key 로 scope 해서 in-memory Map +
//      DB (RequestIdempotencyLog) 두 곳에 6 시간 TTL 로 기억.
//   3) 같은 키가 재진입하면 isReplay 가 true — 크레딧 차감만 건너뛰고
//      (LLM 호출은 정상 진행 가능, 결과는 다시 받음).
//
// In-memory + DB hybrid:
//   - Memory 는 fast path. 같은 instance 안에서 반복 진입 시 < 1ms.
//   - DB 는 persistent. Vercel cold start / horizontal scaling 으로 memory
//     가 비어도 DB 가 살아있으면 보호 유지. 매 호출 DB findUnique ~5ms.
//   - mark 는 두 곳 다 기록 (fire-and-forget DB write 로 latency 영향 적게).
//
// 만료된 DB 행은 별도 cron 으로 정리 (또는 store 가 가끔 자체 cleanup).

import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

const IDEMPOTENCY_TTL_MS = 6 * 60 * 60 * 1000
const IDEMPOTENCY_MAX_MEMORY_ENTRIES = 500

/**
 * 라우트별 독립 store. 한 라우트의 키가 다른 라우트로 새지 않게 라우트
 * 핸들러에서 createIdempotencyStore('route-name') 로 한 번 생성해 모듈
 * 스코프에 보관. routeName 은 DB scopedKey 앞에 prefix 로 붙어 서로
 * 충돌 없게 함.
 */
export function createIdempotencyStore(routeName: string) {
  const memory = new Map<string, number>()

  /** 클라이언트 헤더에서 키 추출. ownerKey 는 보통 userId 또는 ip. */
  function keyFor(req: NextRequest, ownerKey: string): string | null {
    const raw = req.headers.get('x-idempotency-key')?.trim()
    if (!raw) return null
    // 길이 가드 — 비정상 헤더 거부.
    if (raw.length > 256) return null
    return `${routeName}:${ownerKey}:${raw}`
  }

  async function isReplay(scopedKey: string): Promise<boolean> {
    // Fast path: memory
    const memExpiry = memory.get(scopedKey)
    if (memExpiry) {
      if (Date.now() <= memExpiry) return true
      memory.delete(scopedKey)
    }
    // Slow path: DB. cold start 후엔 memory 가 비어있어 여기로 떨어짐.
    try {
      const row = await prisma.requestIdempotencyLog.findUnique({
        where: { scopedKey },
        select: { expiresAt: true },
      })
      if (!row) return false
      if (row.expiresAt < new Date()) {
        // 만료 — silent skip (cleanup 은 cron 담당).
        return false
      }
      // DB 에 살아있는 항목 발견 → memory 캐시도 채워서 다음 호출 fast.
      memory.set(scopedKey, row.expiresAt.getTime())
      return true
    } catch (err) {
      // DB 장애 시 fail-open — 차감 막는 게 우선순위는 아님 (사용자 정상
      // 흐름 보호가 더 중요). 로그만.
      logger.warn('[idempotency] DB lookup failed, treat as not-replay', {
        scopedKey,
        err: err instanceof Error ? err.message : String(err),
      })
      return false
    }
  }

  async function mark(scopedKey: string): Promise<void> {
    const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS)

    // Memory write — 즉시.
    memory.set(scopedKey, expiresAt.getTime())
    pruneMemoryIfNeeded()

    // DB write — upsert (중복 키 fail 무시). fire-and-forget 으로 latency
    // 영향 최소화. 실패해도 다음 같은 키는 memory hit 으로 보호.
    prisma.requestIdempotencyLog
      .upsert({
        where: { scopedKey },
        create: { scopedKey, expiresAt },
        update: { expiresAt },
      })
      .catch((err) => {
        logger.warn('[idempotency] DB upsert failed (memory still set)', {
          scopedKey,
          err: err instanceof Error ? err.message : String(err),
        })
      })
  }

  function pruneMemoryIfNeeded() {
    if (memory.size <= IDEMPOTENCY_MAX_MEMORY_ENTRIES) return
    const now = Date.now()
    for (const [k, exp] of memory.entries()) {
      if (now > exp) memory.delete(k)
    }
    if (memory.size > IDEMPOTENCY_MAX_MEMORY_ENTRIES) {
      const dropCount = memory.size - IDEMPOTENCY_MAX_MEMORY_ENTRIES
      const it = memory.keys()
      for (let i = 0; i < dropCount; i += 1) {
        const k = it.next().value
        if (k !== undefined) memory.delete(k)
      }
    }
  }

  return { keyFor, isReplay, mark }
}

export type IdempotencyStore = ReturnType<typeof createIdempotencyStore>
