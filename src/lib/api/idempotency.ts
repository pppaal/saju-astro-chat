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

  /**
   * 클라이언트 헤더에서 키 추출. ownerKey 는 보통 userId 또는 ip.
   *
   * contentTag — 요청 내용(예: followup 질문+카드)에서 파생한 짧은 discriminator.
   * 주면 scopedKey 에 섞어 "같은 idempotency-key 를 서로 다른 내용으로
   * 재사용해 두 번째부터 공짜로 받는" free-replay 누수를 막는다. 같은 키 +
   * 같은 내용(진짜 새로고침/재전송)만 replay 로 인정. 미지정 시 기존 동작.
   */
  function keyFor(req: NextRequest, ownerKey: string, contentTag?: string): string | null {
    const raw = req.headers.get('x-idempotency-key')?.trim()
    if (!raw) return null
    // 길이 가드 — 비정상 헤더 거부.
    if (raw.length > 256) return null
    const tag = contentTag ? `:${contentTag}` : ''
    return `${routeName}:${ownerKey}:${raw}${tag}`
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

// ---------------------------------------------------------------------------
// Draw-nonce store — server-issued, single-use token.
//
// 배경: interpret-stream 의 "무료 재해석(free replay)" 판정이 클라이언트가
// 보내는 x-idempotency-key 에만 의존하면, 악의적 클라가 같은 키를 재사용해
// 첫 해석 이후 모든 해석을 공짜로 받을 수 있다. 그래서 차감 면제(skip)는
// "서버가 발급한 nonce 가 정확히 한 번 소비됐을 때(=첫 소비에서 이미 차감됨)"
// 에만 일어나야 한다.
//
// 정책:
//   - draw 라우트가 issue(nonce) — 발급 사실을 (TTL) 기록.
//   - interpret 라우트가 consume(nonce):
//       'first'   → 서버가 발급했고 아직 소비 안 됨 → 정상 차감 후 소비 마킹.
//       'replay'  → 같은 nonce 두 번째 — 첫 소비에서 이미 차감됨 → 차감 skip.
//       'unknown' → 서버가 발급한 적 없는(위조/만료) nonce → free pass 없음.
//                   호출자는 정상 차감 경로로 처리한다 (게스트/정상 흐름 보호).
//
// 저장: RequestIdempotencyLog 재사용 (별도 migration 불필요). nonce 당 두
// scopedKey 를 쓴다 — `:issued` 마커와 `:consumed` 마커. consume 은 consumed
// 마커를 atomic create 로 박아(이미 있으면 unique 충돌 → replay) 동시 요청
// race 에서도 정확히 한 번만 'first' 가 나오게 한다.

const DRAW_NONCE_TTL_MS = 6 * 60 * 60 * 1000

export type ConsumeResult = 'first' | 'replay' | 'unknown'

/**
 * draw / interpret 양쪽이 같은 ownerKey 를 만들도록 단일 헬퍼. userId 가
 * 있으면 그걸, 없으면 ip 로 scope. (interpret-stream 의 context.userId ||
 * `ip:${context.ip}` 과 동일한 형태.)
 */
export function drawNonceOwnerKey(req: NextRequest, userId?: string | null): string {
  if (userId) return userId
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  return `ip:${ip}`
}

export function createDrawNonceStore(routeName: string) {
  function issuedKey(ownerKey: string, nonce: string): string {
    return `${routeName}:issued:${ownerKey}:${nonce}`
  }
  function consumedKey(ownerKey: string, nonce: string): string {
    return `${routeName}:consumed:${ownerKey}:${nonce}`
  }

  /** draw 라우트가 발급한 nonce 를 기록. */
  async function issue(nonce: string, ownerKey: string): Promise<void> {
    const expiresAt = new Date(Date.now() + DRAW_NONCE_TTL_MS)
    try {
      await prisma.requestIdempotencyLog.upsert({
        where: { scopedKey: issuedKey(ownerKey, nonce) },
        create: { scopedKey: issuedKey(ownerKey, nonce), expiresAt },
        update: { expiresAt },
      })
    } catch (err) {
      // 발급 기록 실패 시 fail-open 하지 않는다 — 기록이 없으면 interpret 가
      // 'unknown' 으로 보고 정상 차감하므로 수익 누수는 없다. 로그만.
      logger.warn('[draw-nonce] issue persist failed', {
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }

  /**
   * nonce 를 소비. 반환값으로 차감 여부를 결정한다.
   * race-safe: consumed 마커를 unique create 로 박아 동시 요청 중 하나만
   * 'first' 를 받는다.
   */
  async function consume(nonce: string, ownerKey: string): Promise<ConsumeResult> {
    let issued = false
    try {
      const issuedRow = await prisma.requestIdempotencyLog.findUnique({
        where: { scopedKey: issuedKey(ownerKey, nonce) },
        select: { expiresAt: true },
      })
      issued = Boolean(issuedRow && issuedRow.expiresAt >= new Date())
    } catch (err) {
      // 조회 실패: 위조로 단정할 근거가 없으니 'unknown' 으로 — 정상 차감.
      logger.warn('[draw-nonce] issued lookup failed', {
        err: err instanceof Error ? err.message : String(err),
      })
      return 'unknown'
    }

    if (!issued) return 'unknown'

    // 소비 마킹을 atomic create 로. 성공 = 첫 소비(first). 충돌 = 이미 소비됨(replay).
    const expiresAt = new Date(Date.now() + DRAW_NONCE_TTL_MS)
    try {
      await prisma.requestIdempotencyLog.create({
        data: { scopedKey: consumedKey(ownerKey, nonce), expiresAt },
      })
      return 'first'
    } catch (err) {
      // P2002 (unique) = 이미 소비된 nonce → 정당한 재진입(replay).
      const code = (err as { code?: string } | undefined)?.code
      if (code === 'P2002') return 'replay'
      // 그 외 DB 오류: 보수적으로 'first' 처리(차감) — 수익 보호 우선.
      logger.warn('[draw-nonce] consume create failed, treat as first (charge)', {
        err: err instanceof Error ? err.message : String(err),
      })
      return 'first'
    }
  }

  return { issue, consume }
}

export type DrawNonceStore = ReturnType<typeof createDrawNonceStore>
