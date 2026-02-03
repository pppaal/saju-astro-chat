/**
 * Comprehensive tests for Referral System
 */

import { generateReferralCode } from '@/lib/referral/referralService'

describe('Referral Service', () => {
  describe('generateReferralCode', () => {
    it('should generate 8-character uppercase code', () => {
      const code = generateReferralCode()
      expect(code).toHaveLength(8)
      expect(code).toMatch(/^[0-9A-F]{8}$/)
    })
  })
})
