import { describe, it, expect, vi, beforeEach } from 'vitest'

const refundCreditsMock = vi.fn()
vi.mock('@/lib/credits/creditRefund', () => ({
  refundCredits: (...args: unknown[]) => refundCreditsMock(...args),
}))

const createMock = vi.fn()
const deleteMock = vi.fn()
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    requestIdempotencyLog: {
      create: (...a: unknown[]) => createMock(...a),
      delete: (...a: unknown[]) => deleteMock(...a),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { refundCreditsOnce } from '@/lib/credits/refundOnce'

const params = {
  userId: 'u1',
  creditType: 'compatibility' as const,
  amount: 1,
  reason: 'api_error',
}

const p2002 = () => Object.assign(new Error('unique'), { code: 'P2002' })

beforeEach(() => {
  vi.clearAllMocks()
  refundCreditsMock.mockResolvedValue(true)
  createMock.mockResolvedValue({})
  deleteMock.mockResolvedValue({})
})

describe('refundCreditsOnce', () => {
  it('refunds once when the key is claimed for the first time', async () => {
    const r = await refundCreditsOnce('k1', params)
    expect(r).toBe(true)
    expect(createMock).toHaveBeenCalledTimes(1)
    expect(refundCreditsMock).toHaveBeenCalledTimes(1)
  })

  it('skips the refund when the key was already claimed (P2002 collision)', async () => {
    createMock.mockRejectedValueOnce(p2002())
    const r = await refundCreditsOnce('k1', params)
    expect(r).toBe(false)
    expect(refundCreditsMock).not.toHaveBeenCalled()
  })

  it('dedupes a real double-call for the same turn — refunds exactly once', async () => {
    createMock.mockResolvedValueOnce({}).mockRejectedValueOnce(p2002())
    const a = await refundCreditsOnce('same-turn', params)
    const b = await refundCreditsOnce('same-turn', params)
    expect(a).toBe(true)
    expect(b).toBe(false)
    expect(refundCreditsMock).toHaveBeenCalledTimes(1)
  })

  it('synthesizes a dedupe key (and claims it) when no key is given', async () => {
    const r = await refundCreditsOnce(null, params)
    expect(r).toBe(true)
    // No-key path now claims a synthesized marker rather than skipping dedupe.
    expect(createMock).toHaveBeenCalledTimes(1)
    expect(createMock.mock.calls[0][0].data.scopedKey).toMatch(/^synth:/)
    expect(refundCreditsMock).toHaveBeenCalledTimes(1)
  })

  it('dedupes a rapid no-key double-call with identical params to one refund', async () => {
    // Second claim collides on the synthesized key → P2002 → skip.
    createMock.mockResolvedValueOnce({}).mockRejectedValueOnce(p2002())
    const a = await refundCreditsOnce(null, params)
    const b = await refundCreditsOnce(null, params)
    expect(a).toBe(true)
    expect(b).toBe(false)
    expect(refundCreditsMock).toHaveBeenCalledTimes(1)
    // Both calls derived the SAME synthesized key (same params + hour bucket).
    expect(createMock.mock.calls[0][0].data.scopedKey).toBe(
      createMock.mock.calls[1][0].data.scopedKey
    )
  })

  it('still refunds separately for genuinely-different no-key params', async () => {
    const a = await refundCreditsOnce(null, params)
    const b = await refundCreditsOnce(null, { ...params, userId: 'u2' })
    const c = await refundCreditsOnce(null, { ...params, reason: 'other_error' })
    const d = await refundCreditsOnce(null, { ...params, amount: 2 })
    expect(a).toBe(true)
    expect(b).toBe(true)
    expect(c).toBe(true)
    expect(d).toBe(true)
    expect(refundCreditsMock).toHaveBeenCalledTimes(4)
    const keys = createMock.mock.calls.map((c) => c[0].data.scopedKey)
    // All four synthesized keys are distinct → no false dedupe.
    expect(new Set(keys).size).toBe(4)
  })

  it('distinct charges (different transactionId) get distinct synth keys — no lost refund', async () => {
    // 같은 시간·같은 파라미터라도 transactionId 가 다르면(서로 다른 차감) 키가
    // 충돌하지 않아 둘 다 환불된다. 직전엔 시간 버킷만 써서 둘이 합쳐졌다.
    const a = await refundCreditsOnce(null, { ...params, transactionId: 'ctx_1' })
    const b = await refundCreditsOnce(null, { ...params, transactionId: 'ctx_2' })
    expect(a).toBe(true)
    expect(b).toBe(true)
    expect(refundCreditsMock).toHaveBeenCalledTimes(2)
    expect(createMock.mock.calls[0][0].data.scopedKey).not.toBe(
      createMock.mock.calls[1][0].data.scopedKey
    )
  })

  it('does not collide when a delimiter char migrates across free-form fields', async () => {
    // 필드 경계 모호성 회귀: raw ':'-join 이면 apiRoute='a',txn='b:c' 와
    // apiRoute='a:b',txn='c' 가 같은 material 문자열이 돼 두 번째 환불이 누락됐다.
    // JSON 직렬화로 각 필드를 인용/이스케이프하므로 두 키는 반드시 달라야 한다.
    const a = await refundCreditsOnce(null, { ...params, apiRoute: 'a', transactionId: 'b:c' })
    const b = await refundCreditsOnce(null, { ...params, apiRoute: 'a:b', transactionId: 'c' })
    expect(a).toBe(true)
    expect(b).toBe(true)
    expect(refundCreditsMock).toHaveBeenCalledTimes(2)
    expect(createMock.mock.calls[0][0].data.scopedKey).not.toBe(
      createMock.mock.calls[1][0].data.scopedKey
    )
  })

  it('releases the synthesized claim if the no-key refund throws', async () => {
    refundCreditsMock.mockRejectedValueOnce(new Error('refund boom'))
    await expect(refundCreditsOnce(null, params)).rejects.toThrow('refund boom')
    expect(deleteMock).toHaveBeenCalledTimes(1)
    expect(deleteMock.mock.calls[0][0].where.scopedKey).toMatch(/^synth:/)
  })

  it('retries the claim once on a transient error and still dedupes (marker written)', async () => {
    // 1st create transient-fails, retry succeeds → claimed path (dedupe preserved).
    createMock.mockRejectedValueOnce(new Error('db down'))
    const r = await refundCreditsOnce('k2', params)
    expect(r).toBe(true)
    expect(createMock).toHaveBeenCalledTimes(2) // original + one retry
    expect(refundCreditsMock).toHaveBeenCalledTimes(1)
    // claimed (not bias path) → no release on success.
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it('post-retry P2002 means another path already refunded → skip', async () => {
    createMock.mockRejectedValueOnce(new Error('db down')).mockRejectedValueOnce(p2002())
    const r = await refundCreditsOnce('k2b', params)
    expect(r).toBe(false)
    expect(refundCreditsMock).not.toHaveBeenCalled()
  })

  it('refunds without dedupe only when BOTH claim attempts fail non-P2002', async () => {
    createMock.mockRejectedValue(new Error('db down')) // every attempt fails
    const r = await refundCreditsOnce('k2c', params)
    expect(r).toBe(true)
    expect(createMock).toHaveBeenCalledTimes(2) // original + retry, both failed
    expect(refundCreditsMock).toHaveBeenCalledTimes(1)
  })

  it('releases the claim if the refund itself throws, so a retry can refund', async () => {
    refundCreditsMock.mockRejectedValueOnce(new Error('refund boom'))
    await expect(refundCreditsOnce('k3', params)).rejects.toThrow('refund boom')
    expect(deleteMock).toHaveBeenCalledTimes(1)
  })
})
