// Fix A — server-issued single-use draw nonce.
//
// 핵심 보안 속성:
//   - draw 가 발급한 nonce 만 'first'/'replay' 로 인정. 위조/미발급 = 'unknown'.
//   - 첫 소비는 'first' (정상 차감), 같은 nonce 두 번째 소비는 'replay' (차감 skip).
//   - 'unknown' 은 free pass 없음 → 호출자가 정상 차감.
// 이로써 클라이언트가 idempotency-key 를 재사용/위조해 무료 재해석을 얻는
// 누수를 막는다.

import { describe, it, expect, beforeEach, vi } from 'vitest'

// requestIdempotencyLog 를 in-memory 로 흉내내는 prisma mock.
const rows = new Map<string, { scopedKey: string; expiresAt: Date }>()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    requestIdempotencyLog: {
      findUnique: vi.fn(async ({ where }: { where: { scopedKey: string } }) => {
        return rows.get(where.scopedKey) ?? null
      }),
      upsert: vi.fn(
        async ({
          where,
          create,
        }: {
          where: { scopedKey: string }
          create: { scopedKey: string; expiresAt: Date }
        }) => {
          rows.set(where.scopedKey, create)
          return create
        }
      ),
      create: vi.fn(async ({ data }: { data: { scopedKey: string; expiresAt: Date } }) => {
        if (rows.has(data.scopedKey)) {
          const err = new Error('Unique constraint failed') as Error & { code?: string }
          err.code = 'P2002'
          throw err
        }
        rows.set(data.scopedKey, data)
        return data
      }),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { createDrawNonceStore } from '@/lib/api/idempotency'

describe('createDrawNonceStore — single-use draw nonce (Fix A)', () => {
  beforeEach(() => {
    rows.clear()
    vi.clearAllMocks()
  })

  it('consume() returns "unknown" for a nonce the server never issued (no free pass)', async () => {
    const store = createDrawNonceStore('tarot-draw')
    const result = await store.consume('forged-nonce', 'user:123')
    expect(result).toBe('unknown')
  })

  it('first consume of an issued nonce returns "first" (charge), replay returns "replay" (skip)', async () => {
    const store = createDrawNonceStore('tarot-draw')
    await store.issue('nonce-abc', 'user:123')

    const first = await store.consume('nonce-abc', 'user:123')
    expect(first).toBe('first')

    // 진짜 새로고침/뒤로가기 — 같은 nonce 재진입은 차감 skip.
    const replay = await store.consume('nonce-abc', 'user:123')
    expect(replay).toBe('replay')

    // 세 번째도 여전히 replay (두 번째 소비가 차감 안 했으니 무한 free 아님).
    const replay2 = await store.consume('nonce-abc', 'user:123')
    expect(replay2).toBe('replay')
  })

  it('nonce is scoped per owner — another owner cannot consume it as "first"', async () => {
    const store = createDrawNonceStore('tarot-draw')
    await store.issue('nonce-xyz', 'user:owner-A')

    // 다른 owner 가 같은 nonce 문자열을 써도 발급 기록이 없어 'unknown'.
    const other = await store.consume('nonce-xyz', 'user:owner-B')
    expect(other).toBe('unknown')

    // 정당한 owner 는 정상 'first'.
    const legit = await store.consume('nonce-xyz', 'user:owner-A')
    expect(legit).toBe('first')
  })

  it('a fresh forged nonce each time always charges (cannot self-declare a free replay)', async () => {
    const store = createDrawNonceStore('tarot-draw')
    // 악의적 클라가 매번 임의 nonce 를 보내도 발급된 적 없으니 모두 'unknown'
    // → 호출자가 정상 차감. 무료 재해석 불가.
    for (let i = 0; i < 5; i++) {
      expect(await store.consume(`random-${i}`, 'user:123')).toBe('unknown')
    }
  })
})
