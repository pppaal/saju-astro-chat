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

  it('falls back to a single plain refund when no key is given', async () => {
    const r = await refundCreditsOnce(null, params)
    expect(r).toBe(true)
    expect(createMock).not.toHaveBeenCalled()
    expect(refundCreditsMock).toHaveBeenCalledTimes(1)
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
