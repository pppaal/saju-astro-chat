import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/credits/refundOnce', () => ({
  refundCreditsOnce: vi.fn(async () => true),
}))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import { makeChargedRefunder } from '@/lib/api/chargedRefund'
import { refundCreditsOnce } from '@/lib/credits/refundOnce'
import { logger } from '@/lib/logger'

const refundMock = refundCreditsOnce as unknown as ReturnType<typeof vi.fn>

const baseConfig = {
  refundKey: 'refund-key-1',
  userId: 'user-1',
  amount: 2,
  apiRoute: 'compatibility/counselor',
  logLabel: 'compat/counselor',
}

describe('makeChargedRefunder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('no-ops when isCharged() is false (idempotent replay / uncharged turn)', async () => {
    const refund = makeChargedRefunder(baseConfig, () => false)
    await refund('api_error')
    expect(refundMock).not.toHaveBeenCalled()
  })

  it('always refunds with creditType "reading" (never the charge type)', async () => {
    // 핵심 불변식: consumeCredits 가 BONUS 풀에서 차감하므로 환불도 'reading'
    // 이어야 실제 복원된다. 'compatibility' 로 차감했어도 환불은 'reading'.
    const refund = makeChargedRefunder(baseConfig, () => true)
    await refund('api_error')
    expect(refundMock).toHaveBeenCalledTimes(1)
    const [key, params] = refundMock.mock.calls[0]
    expect(key).toBe('refund-key-1')
    expect(params).toMatchObject({
      userId: 'user-1',
      creditType: 'reading',
      amount: 2,
      reason: 'api_error',
      apiRoute: 'compatibility/counselor',
    })
  })

  it('passes errorMessage when provided, omits it otherwise', async () => {
    const refund = makeChargedRefunder(baseConfig, () => true)
    await refund('api_error', 'detail here')
    expect(refundMock.mock.calls[0][1]).toMatchObject({ errorMessage: 'detail here' })

    refundMock.mockClear()
    await refund('counselor_stream_empty')
    expect(refundMock.mock.calls[0][1]).not.toHaveProperty('errorMessage')
    expect(refundMock.mock.calls[0][1]).toMatchObject({ reason: 'counselor_stream_empty' })
  })

  it('forwards a null refundKey unchanged (refundCreditsOnce handles fallback)', async () => {
    const refund = makeChargedRefunder({ ...baseConfig, refundKey: null }, () => true)
    await refund('api_error')
    expect(refundMock.mock.calls[0][0]).toBeNull()
  })

  it('swallows a refund failure (never rejects, logs a warning)', async () => {
    refundMock.mockRejectedValueOnce(new Error('boom'))
    const refund = makeChargedRefunder(baseConfig, () => true)
    await expect(refund('api_error')).resolves.toBeUndefined()
    expect(logger.warn).toHaveBeenCalled()
  })

  it('re-reads isCharged() on each call (guard is a live predicate)', async () => {
    let charged = false
    const refund = makeChargedRefunder(baseConfig, () => charged)
    await refund('api_error')
    expect(refundMock).not.toHaveBeenCalled()
    charged = true
    await refund('api_error')
    expect(refundMock).toHaveBeenCalledTimes(1)
  })
})
