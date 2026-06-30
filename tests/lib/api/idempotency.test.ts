// createIdempotencyStore — claim/release create-as-lock (MONEY PATH).
//
// 핵심 속성:
//   - claim() 첫 진입은 true (차감 진행), 같은 키 재진입은 false (차감 skip).
//   - create-as-lock: DB unique(P2002) 충돌이면 replay 로 처리(false).
//   - DB 장애(기타 오류)는 fail-open — true(첫 진입, 차감) + 로그.
//   - release() 는 memory + DB 마커를 지워 재시도가 다시 차감(첫 진입)할 수 있게.
//   - keyFor() 헤더 추출/길이 가드/contentTag 합성.

import { describe, it, expect, beforeEach, vi } from 'vitest'

// requestIdempotencyLog 를 in-memory 로 흉내내는 prisma mock.
const rows = new Map<string, { scopedKey: string; expiresAt: Date; owner?: string }>()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    requestIdempotencyLog: {
      create: vi.fn(
        async ({ data }: { data: { scopedKey: string; expiresAt: Date; owner?: string } }) => {
          if (rows.has(data.scopedKey)) {
            const err = new Error('Unique constraint failed') as Error & { code?: string }
            err.code = 'P2002'
            throw err
          }
          rows.set(data.scopedKey, data)
          return data
        }
      ),
      // release 는 (scopedKey, owner) 일치 조건의 deleteMany 를 쓴다 — owner 가
      // 일치할 때만 지운다(소유권 가드). 일치 row 가 없으면 count 0(예외 없음).
      deleteMany: vi.fn(async ({ where }: { where: { scopedKey: string; owner?: string } }) => {
        const row = rows.get(where.scopedKey)
        if (!row) return { count: 0 }
        if (where.owner !== undefined && row.owner !== where.owner) return { count: 0 }
        rows.delete(where.scopedKey)
        return { count: 1 }
      }),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { createIdempotencyStore, idemContentTag } from '@/lib/api/idempotency'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// 헤더만 갖춘 최소 NextRequest 스텁.
function reqWith(headers: Record<string, string>) {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as any
}

describe('createIdempotencyStore — keyFor', () => {
  beforeEach(() => {
    rows.clear()
    vi.clearAllMocks()
  })

  it('헤더가 없으면 null', () => {
    const store = createIdempotencyStore('route-x')
    expect(store.keyFor(reqWith({}), 'user:1')).toBeNull()
  })

  it('헤더가 공백뿐이면 null (trim 후 비어있음)', () => {
    const store = createIdempotencyStore('route-x')
    expect(store.keyFor(reqWith({ 'x-idempotency-key': '   ' }), 'user:1')).toBeNull()
  })

  it('256자 초과 헤더는 거부(null)', () => {
    const store = createIdempotencyStore('route-x')
    const longKey = 'a'.repeat(257)
    expect(store.keyFor(reqWith({ 'x-idempotency-key': longKey }), 'user:1')).toBeNull()
  })

  it('정상 키는 routeName:ownerKey:raw 로 scope', () => {
    const store = createIdempotencyStore('route-x')
    expect(store.keyFor(reqWith({ 'x-idempotency-key': 'abc' }), 'user:1')).toBe(
      'route-x:user:1:abc'
    )
  })

  it('contentTag 가 주어지면 키 끝에 :tag 로 합성', () => {
    const store = createIdempotencyStore('route-x')
    expect(store.keyFor(reqWith({ 'x-idempotency-key': 'abc' }), 'user:1', 'tag9')).toBe(
      'route-x:user:1:abc:tag9'
    )
  })

  it('헤더 값의 앞뒤 공백은 trim 된다', () => {
    const store = createIdempotencyStore('route-x')
    expect(store.keyFor(reqWith({ 'x-idempotency-key': '  abc  ' }), 'user:1')).toBe(
      'route-x:user:1:abc'
    )
  })
})

describe('createIdempotencyStore — claim / release (create-as-lock)', () => {
  beforeEach(() => {
    rows.clear()
    vi.clearAllMocks()
  })

  it('첫 claim 은 true (선점 성공 → 차감 진행), DB 에 마커를 박는다', async () => {
    const store = createIdempotencyStore('route-x')
    const ok = await store.claim('route-x:user:1:k1')
    expect(ok).toBe(true)
    expect(prisma.requestIdempotencyLog.create).toHaveBeenCalledTimes(1)
    expect(rows.has('route-x:user:1:k1')).toBe(true)
  })

  it('두 번째 claim 은 false — memory fast path (DB 재호출 없음)', async () => {
    const store = createIdempotencyStore('route-x')
    expect(await store.claim('route-x:user:1:k1')).toBe(true)

    vi.mocked(prisma.requestIdempotencyLog.create).mockClear()
    const second = await store.claim('route-x:user:1:k1')
    expect(second).toBe(false)
    // memory 에 이미 있으니 DB create 를 다시 부르지 않는다(fast path).
    expect(prisma.requestIdempotencyLog.create).not.toHaveBeenCalled()
  })

  it('memory 가 비어있어도 DB unique 충돌(P2002)이면 false (cross-instance replay)', async () => {
    // 다른 인스턴스가 이미 마커를 박았다고 가정 — memory 는 비어있음.
    rows.set('route-x:user:1:k1', {
      scopedKey: 'route-x:user:1:k1',
      expiresAt: new Date(Date.now() + 1000),
    })

    const store = createIdempotencyStore('route-x') // 새 store = 빈 memory
    const result = await store.claim('route-x:user:1:k1')
    expect(result).toBe(false)
    expect(prisma.requestIdempotencyLog.create).toHaveBeenCalledTimes(1)
  })

  it('만료된 memory 마커는 삭제 후 DB 재선점 시도 (TTL 경과)', async () => {
    const store = createIdempotencyStore('route-x')
    // 첫 진입 — memory 에 마커.
    expect(await store.claim('route-x:user:1:k1')).toBe(true)

    // 시간을 TTL(6h) 이상 진행. 만료된 memory 는 삭제되고 DB create 재시도.
    // 단 DB rows 에는 아직 남아있으니 P2002 → false 가 정상.
    const spy = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 7 * 60 * 60 * 1000)
    try {
      const result = await store.claim('route-x:user:1:k1')
      expect(result).toBe(false) // DB 마커 여전히 존재 → replay
    } finally {
      spy.mockRestore()
    }
  })

  it('DB 장애(기타 오류)는 fail-open — true(첫 진입, 차감) + warn 로그', async () => {
    vi.mocked(prisma.requestIdempotencyLog.create).mockRejectedValueOnce(
      new Error('connection lost')
    )
    const store = createIdempotencyStore('route-x')
    const result = await store.claim('route-x:user:1:dberr')
    expect(result).toBe(true)
    expect(logger.warn).toHaveBeenCalled()
  })

  it('DB 장애가 Error 가 아닌 값이어도 fail-open(true)', async () => {
    vi.mocked(prisma.requestIdempotencyLog.create).mockRejectedValueOnce('weird-failure')
    const store = createIdempotencyStore('route-x')
    expect(await store.claim('route-x:user:1:dberr2')).toBe(true)
    expect(logger.warn).toHaveBeenCalled()
  })

  it('release() 후 같은 키를 다시 claim 하면 true (재차감 가능)', async () => {
    const store = createIdempotencyStore('route-x')
    expect(await store.claim('route-x:user:1:k1')).toBe(true)

    await store.release('route-x:user:1:k1')
    expect(rows.has('route-x:user:1:k1')).toBe(false)
    expect(prisma.requestIdempotencyLog.deleteMany).toHaveBeenCalledTimes(1)

    // 마커가 지워졌으니 새 store(빈 memory)도 다시 선점 가능.
    const store2 = createIdempotencyStore('route-x')
    expect(await store2.claim('route-x:user:1:k1')).toBe(true)
  })

  it('release() 는 DB delete 가 실패해도 throw 하지 않는다 (catch 흡수)', async () => {
    const store = createIdempotencyStore('route-x')
    await store.claim('route-x:user:1:owned-but-gone')
    // deleteMany 가 던지도록 강제 — release 의 .catch 가 흡수해 throw 하지 않아야.
    vi.mocked(prisma.requestIdempotencyLog.deleteMany).mockRejectedValueOnce(new Error('db down'))
    await expect(store.release('route-x:user:1:owned-but-gone')).resolves.toBeUndefined()
  })

  it('release() 는 자기가 만들지 않은 락을 지우지 않는다 (소유권 가드)', async () => {
    const key = 'route-x:user:1:contended'
    // 다른 요청/인스턴스가 이미 박은 살아있는 락.
    rows.set(key, { scopedKey: key, expiresAt: new Date(Date.now() + 60_000) })

    // 우리 claim 은 transient 오류로 fail-open(차감 진행) — DB row 를 만들지 않는다.
    vi.mocked(prisma.requestIdempotencyLog.create).mockRejectedValueOnce(new Error('timeout'))
    const store = createIdempotencyStore('route-x')
    expect(await store.claim(key)).toBe(true) // fail-open, owns nothing

    vi.mocked(prisma.requestIdempotencyLog.deleteMany).mockClear()
    await store.release(key)

    // 남의 살아있는 락을 지워선 안 된다 → owned 에 없으므로 DB 미호출 + row 유지.
    expect(prisma.requestIdempotencyLog.deleteMany).not.toHaveBeenCalled()
    expect(rows.has(key)).toBe(true)
  })

  it('release() 는 owner 토큰이 어긋나면 DB row 를 지우지 않는다 (재발급 안전)', async () => {
    const key = 'route-x:user:1:reissued'
    const store = createIdempotencyStore('route-x')
    expect(await store.claim(key)).toBe(true) // store 가 token1 으로 락 생성

    // 만료 후 다른 인스턴스가 같은 scopedKey 를 새 owner(token2)로 재선점했다고 가정.
    rows.get(key)!.owner = 'token2-from-another-instance'

    await store.release(key) // store 는 token1 로 deleteMany → owner 불일치
    // token2 의 살아있는 락은 보존돼야 한다.
    expect(rows.has(key)).toBe(true)
    expect(rows.get(key)!.owner).toBe('token2-from-another-instance')
  })

  it('fail-open 도 memory 마커를 채워 같은 인스턴스의 동시 중복은 replay(false)', async () => {
    const key = 'route-x:user:1:failopen-dupe'
    vi.mocked(prisma.requestIdempotencyLog.create).mockRejectedValueOnce(
      new Error('pool exhausted')
    )
    const store = createIdempotencyStore('route-x')

    // 첫 호출: fail-open → true(차감).
    expect(await store.claim(key)).toBe(true)

    // 둘째 호출(더블클릭/탭복제): memory 마커로 즉시 replay → false, DB 재호출 없음.
    vi.mocked(prisma.requestIdempotencyLog.create).mockClear()
    expect(await store.claim(key)).toBe(false)
    expect(prisma.requestIdempotencyLog.create).not.toHaveBeenCalled()
  })

  it('서로 다른 routeName 은 같은 raw key 라도 충돌하지 않는다', async () => {
    const storeA = createIdempotencyStore('route-a')
    const storeB = createIdempotencyStore('route-b')
    // scopedKey 는 호출자가 만들지만 keyFor 가 routeName prefix 를 붙인다.
    const keyA = storeA.keyFor(reqWith({ 'x-idempotency-key': 'same' }), 'user:1')!
    const keyB = storeB.keyFor(reqWith({ 'x-idempotency-key': 'same' }), 'user:1')!
    expect(keyA).not.toBe(keyB)
    expect(await storeA.claim(keyA)).toBe(true)
    expect(await storeB.claim(keyB)).toBe(true) // 다른 scopedKey → 둘 다 첫 진입
  })
})

describe('idemContentTag', () => {
  it('같은 입력은 같은 태그(결정적)', () => {
    expect(idemContentTag('hello')).toBe(idemContentTag('hello'))
  })

  it('다른 입력은 (보통) 다른 태그', () => {
    expect(idemContentTag('hello')).not.toBe(idemContentTag('world'))
  })

  it('빈 문자열도 안정적인 태그를 만든다', () => {
    const tag = idemContentTag('')
    expect(typeof tag).toBe('string')
    expect(tag.length).toBeGreaterThan(0)
  })

  it('base36 문자열을 반환한다', () => {
    expect(idemContentTag('some-content-123')).toMatch(/^[0-9a-z]+$/)
  })
})
