/**
 * Common Stripe mocks for testing
 */

import { vi } from 'vitest'

interface MockStripeCustomer {
  id: string
  email: string
  metadata?: Record<string, string>
}

interface MockStripeSubscription {
  id: string
  customer: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  items: {
    data: Array<{
      price: {
        id: string
        product: string
      }
    }>
  }
}

/**
 * Mock Stripe with customizable customers and subscriptions
 */
export function mockStripe(options?: {
  customers?: MockStripeCustomer[]
  subscriptions?: MockStripeSubscription[]
}) {
  const customers = options?.customers ?? []
  const subscriptions = options?.subscriptions ?? []

  vi.mock('stripe', () => ({
    default: vi.fn().mockImplementation(() => ({
      customers: {
        search: vi.fn().mockResolvedValue({ data: customers }),
        retrieve: vi.fn().mockImplementation((id: string) => {
          const customer = customers.find((c) => c.id === id)
          return customer
            ? Promise.resolve(customer)
            : Promise.reject(new Error('Customer not found'))
        }),
      },
      subscriptions: {
        list: vi.fn().mockResolvedValue({ data: subscriptions }),
        retrieve: vi.fn().mockImplementation((id: string) => {
          const subscription = subscriptions.find((s) => s.id === id)
          return subscription
            ? Promise.resolve(subscription)
            : Promise.reject(new Error('Subscription not found'))
        }),
      },
    })),
  }))

  return {
    customers: {
      search: vi.fn().mockResolvedValue({ data: customers }),
      retrieve: vi.fn(),
    },
    subscriptions: {
      list: vi.fn().mockResolvedValue({ data: subscriptions }),
      retrieve: vi.fn(),
    },
  }
}

/**
 * Mock Stripe with no customers (free tier user)
 */
export function mockStripeFreeTier() {
  return mockStripe({ customers: [], subscriptions: [] })
}

/**
 * Mock Stripe with active premium subscription
 */
export function mockStripePremium(email: string = 'premium@example.com') {
  const customerId = 'cus_premium123'
  return mockStripe({
    customers: [
      {
        id: customerId,
        email,
        metadata: { userId: 'premium-user-id' },
      },
    ],
    subscriptions: [
      {
        id: 'sub_premium123',
        customer: customerId,
        status: 'active',
        items: {
          data: [
            {
              price: {
                id: 'price_premium',
                product: 'prod_premium',
              },
            },
          ],
        },
      },
    ],
  })
}
