import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted holders so the vi.mock factories can reference mutable state.
const { stripeHolder, rateLimitHolder } = vi.hoisted(() => ({
  stripeHolder: {
    customers: [] as Array<{ id: string }>,
    subscriptions: {} as Record<string, Array<{ status: string }>>,
    customersList: vi.fn(),
    subscriptionsList: vi.fn(),
    ctor: vi.fn(),
  },
  rateLimitHolder: {
    allowed: true,
  },
}))

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(function (this: unknown, ...args: unknown[]) {
    stripeHolder.ctor(...args)
    return {
      customers: {
        list: stripeHolder.customersList,
      },
      subscriptions: {
        list: stripeHolder.subscriptionsList,
      },
    }
  }),
}))

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve({ allowed: rateLimitHolder.allowed, remaining: 4, reset: 0, limit: 5 })
    ),
}))

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { checkPremiumStatus } from '@/app/api/saju/services/premiumCheck'

let emailCounter = 0
// Unique email each call -> avoids the module-level premium cache poisoning tests.
function uniqueEmail(): string {
  emailCounter += 1
  return `user${emailCounter}_${Date.now()}@example.com`
}

beforeEach(() => {
  vi.clearAllMocks()
  rateLimitHolder.allowed = true
  stripeHolder.customersList.mockReset()
  stripeHolder.subscriptionsList.mockReset()
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
})

describe('checkPremiumStatus', () => {
  it('STRIPE_SECRET_KEY가 없으면 false', async () => {
    delete process.env.STRIPE_SECRET_KEY
    expect(await checkPremiumStatus(uniqueEmail())).toBe(false)
  })

  it('email이 없으면 false', async () => {
    expect(await checkPremiumStatus(undefined)).toBe(false)
  })

  it('잘못된 이메일 형식이면 false (Stripe 호출 안함)', async () => {
    expect(await checkPremiumStatus('not-an-email')).toBe(false)
    expect(stripeHolder.customersList).not.toHaveBeenCalled()
  })

  it('254자 초과 이메일이면 false', async () => {
    const longLocal = 'a'.repeat(250)
    const longEmail = `${longLocal}@example.com`
    expect(await checkPremiumStatus(longEmail)).toBe(false)
    expect(stripeHolder.customersList).not.toHaveBeenCalled()
  })

  it('rate limit 초과면 false', async () => {
    rateLimitHolder.allowed = false
    expect(await checkPremiumStatus(uniqueEmail())).toBe(false)
    expect(stripeHolder.customersList).not.toHaveBeenCalled()
  })

  it('active 구독이 있으면 true', async () => {
    const email = uniqueEmail()
    stripeHolder.customersList.mockResolvedValue({ data: [{ id: 'cus_1' }] })
    stripeHolder.subscriptionsList.mockResolvedValue({ data: [{ status: 'active' }] })
    expect(await checkPremiumStatus(email)).toBe(true)
  })

  it('trialing 구독도 premium', async () => {
    stripeHolder.customersList.mockResolvedValue({ data: [{ id: 'cus_1' }] })
    stripeHolder.subscriptionsList.mockResolvedValue({ data: [{ status: 'trialing' }] })
    expect(await checkPremiumStatus(uniqueEmail())).toBe(true)
  })

  it('past_due 구독도 premium', async () => {
    stripeHolder.customersList.mockResolvedValue({ data: [{ id: 'cus_1' }] })
    stripeHolder.subscriptionsList.mockResolvedValue({ data: [{ status: 'past_due' }] })
    expect(await checkPremiumStatus(uniqueEmail())).toBe(true)
  })

  it('canceled 구독만 있으면 false', async () => {
    stripeHolder.customersList.mockResolvedValue({ data: [{ id: 'cus_1' }] })
    stripeHolder.subscriptionsList.mockResolvedValue({ data: [{ status: 'canceled' }] })
    expect(await checkPremiumStatus(uniqueEmail())).toBe(false)
  })

  it('고객이 없으면 false', async () => {
    stripeHolder.customersList.mockResolvedValue({ data: [] })
    expect(await checkPremiumStatus(uniqueEmail())).toBe(false)
  })

  it('여러 고객 중 하나라도 active면 true', async () => {
    stripeHolder.customersList.mockResolvedValue({ data: [{ id: 'cus_1' }, { id: 'cus_2' }] })
    stripeHolder.subscriptionsList
      .mockResolvedValueOnce({ data: [{ status: 'canceled' }] })
      .mockResolvedValueOnce({ data: [{ status: 'active' }] })
    expect(await checkPremiumStatus(uniqueEmail())).toBe(true)
  })

  it('Stripe 에러는 swallow하고 false', async () => {
    stripeHolder.customersList.mockRejectedValue(new Error('stripe down'))
    expect(await checkPremiumStatus(uniqueEmail())).toBe(false)
  })

  it('동일 이메일 결과는 캐시된다 (두번째 호출은 Stripe 미호출)', async () => {
    const email = uniqueEmail()
    stripeHolder.customersList.mockResolvedValue({ data: [{ id: 'cus_1' }] })
    stripeHolder.subscriptionsList.mockResolvedValue({ data: [{ status: 'active' }] })

    expect(await checkPremiumStatus(email)).toBe(true)
    const callsAfterFirst = stripeHolder.customersList.mock.calls.length

    expect(await checkPremiumStatus(email)).toBe(true)
    // No additional Stripe lookup on cache hit
    expect(stripeHolder.customersList.mock.calls.length).toBe(callsAfterFirst)
  })

  it('false 결과도 캐시된다', async () => {
    const email = uniqueEmail()
    stripeHolder.customersList.mockResolvedValue({ data: [] })

    expect(await checkPremiumStatus(email)).toBe(false)
    const callsAfterFirst = stripeHolder.customersList.mock.calls.length

    expect(await checkPremiumStatus(email)).toBe(false)
    expect(stripeHolder.customersList.mock.calls.length).toBe(callsAfterFirst)
  })

  it('이메일은 소문자로 정규화되어 Stripe에 전달된다', async () => {
    const email = `MixedCase${Date.now()}@Example.COM`
    stripeHolder.customersList.mockResolvedValue({ data: [] })
    await checkPremiumStatus(email)
    expect(stripeHolder.customersList).toHaveBeenCalledWith(
      expect.objectContaining({ email: email.toLowerCase() })
    )
  })
})
