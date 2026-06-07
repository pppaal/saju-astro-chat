/**
 * Common test mocks - centralized mock utilities
 *
 * Import these instead of duplicating vi.mock() calls across test files
 *
 * @example
 * ```ts
 * import { mockNextAuth, mockStripe, mockSajuLibraries } from '@/tests/mocks'
 *
 * describe('My API Route', () => {
 *   beforeEach(() => {
 *     mockNextAuth()
 *     mockStripe()
 *     mockSajuLibraries()
 *   })
 *
 *   it('should work', async () => {
 *     // test code
 *   })
 * })
 * ```
 */

// Authentication mocks
export { mockNextAuth, mockUnauthenticated, mockPremiumUser } from './auth'

// Payment mocks
export { mockStripe, mockStripeFreeTier, mockStripePremium } from './stripe'

// Database mocks
export { mockPrisma, mockPrismaWithData } from './database'

// Saju library mocks (./saju) 제거 — 사용처 0 + 모듈 파일 없음(배럴 resolve 실패 원인).
