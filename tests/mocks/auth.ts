/**
 * Common authentication mocks for testing
 */

import { vi } from 'vitest'

/**
 * Mock next-auth with customizable session data
 */
export function mockNextAuth(
  sessionData?: {
    user?: { name?: string; email?: string; id?: string }
    expires?: string
  } | null
) {
  const defaultSession =
    sessionData === undefined
      ? {
          user: { name: 'Test User', email: 'test@example.com', id: 'test-user-id' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }
      : sessionData

  vi.mock('next-auth', () => ({
    getServerSession: vi.fn().mockResolvedValue(defaultSession),
  }))

  return {
    getServerSession: vi.fn().mockResolvedValue(defaultSession),
  }
}

/**
 * Mock next-auth with no session (unauthenticated)
 */
export function mockUnauthenticated() {
  return mockNextAuth(null)
}

/**
 * Mock next-auth with authenticated premium user
 */
export function mockPremiumUser() {
  return mockNextAuth({
    user: {
      name: 'Premium User',
      email: 'premium@example.com',
      id: 'premium-user-id',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  })
}
