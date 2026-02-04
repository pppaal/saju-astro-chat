/**
 * Common authentication mocks for testing
 */

import { vi } from 'vitest'

// Hoisted session holder - accessible inside vi.mock factories
const { sessionHolder } = vi.hoisted(() => ({
  sessionHolder: {
    session: null as {
      user?: { name?: string; email?: string; id?: string }
      expires?: string
    } | null,
  },
}))

// Default session data
const DEFAULT_SESSION = {
  user: { name: 'Test User', email: 'test@example.com', id: 'test-user-id' },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}

// Register the mock once at module level
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve(sessionHolder.session)),
}))

/**
 * Mock next-auth with customizable session data
 */
export function mockNextAuth(
  sessionData?: {
    user?: { name?: string; email?: string; id?: string }
    expires?: string
  } | null
) {
  sessionHolder.session = sessionData === undefined ? { ...DEFAULT_SESSION } : sessionData

  return {
    getServerSession: vi.fn().mockResolvedValue(sessionHolder.session),
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
