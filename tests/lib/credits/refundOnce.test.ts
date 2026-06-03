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

  it('releases the synthesized claim if the no-key refund throws', async () => {
    refundCreditsMock.mockRejectedValueOnce(new Error('refund boom'))
    await expect(refundCreditsOnce(null, params)).rejects.toThrow('refund boom')
    expect(deleteMock).toHaveBeenCalledTimes(1)
    expect(deleteMock.mock.calls[0][0].where.scopedKey).toMatch(/^synth:/)
  })

  it('still refunds (without dedupe) if claiming the marker errors non-P2002', async () => {
    createMock.mockRejectedValueOnce(new Error('db down'))
    const r = await refundCreditsOnce('k2', params)
    expect(r).toBe(true)
    expect(refundCreditsMock).toHaveBeenCalledTimes(1)
  })

  it('releases the claim if the refund itself throws, so a retry can refund', async () => {
    refundCreditsMock.mockRejectedValueOnce(new Error('refund boom'))
    await expect(refundCreditsOnce('k3', params)).rejects.toThrow('refund boom')
    expect(deleteMock).toHaveBeenCalledTimes(1)
  })
})
