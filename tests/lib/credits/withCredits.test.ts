/**
 * withCredits helper tests
 * Tests for credit check utilities in API routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextResponse } from 'next/server'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

vi.mock('@/lib/credits/creditService', () => ({
  canUseCredits: vi.fn(),
  consumeCredits: vi.fn(),
  getUserCredits: vi.fn(),
  initializeUserCredits: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

import { getServerSession } from 'next-auth'
import {
  canUseCredits,
  consumeCredits,
  getUserCredits,
  initializeUserCredits,
} from '@/lib/credits/creditService'
import {
  checkAndConsumeCredits,
  checkCreditsOnly,
  creditErrorResponse,
  ensureUserCredits,
} from '@/lib/credits/withCredits'

describe('withCredits helpers', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('checkAndConsumeCredits', () => {
    it('should return not_authenticated when no session', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const result = await checkAndConsumeCredits('reading', 1)

      expect(result.allowed).toBe(false)
      expect(result.errorCode).toBe('not_authenticated')
      expect(typeof result.error).toBe('string')
      expect((result.error || '').length).toBeGreaterThan(0)
    })

    it('should return not_authenticated when no user id in session', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'test@example.com' },
      } as never)

      const result = await checkAndConsumeCredits('reading', 1)

      expect(result.allowed).toBe(false)
      expect(result.errorCode).toBe('not_authenticated')
    })

    it('should bypass credits when BYPASS_CREDITS is true', async () => {
      process.env.BYPASS_CREDITS = 'true'
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as never)

      const result = await checkAndConsumeCredits('reading', 1)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9999)
      expect(canUseCredits).not.toHaveBeenCalled()
    })

    it('should check and consume credits successfully', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as never)
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: true,
        remaining: 5,
      })
      vi.mocked(consumeCredits).mockResolvedValue({
        success: true,
      })

      const result = await checkAndConsumeCredits('reading', 1)

      expect(result.allowed).toBe(true)
      expect(result.userId).toBe('user-123')
      expect(result.remaining).toBe(5)
      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 1)
      expect(consumeCredits).toHaveBeenCalledWith('user-123', 'reading', 1)
    })

    it('should return error when no credits available', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as never)
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: false,
        reason: 'no_credits',
        remaining: 0,
      })

      const result = await checkAndConsumeCredits('reading', 1)

      expect(result.allowed).toBe(false)
      expect(result.errorCode).toBe('no_credits')
      expect(typeof result.error).toBe('string')
      expect((result.error || '').length).toBeGreaterThan(0)
      expect(consumeCredits).not.toHaveBeenCalled()
    })

    it('should return error for compatibility limit', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as never)
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: false,
        reason: 'compatibility_limit',
        remaining: 0,
      })

      const result = await checkAndConsumeCredits('compatibility', 1)

      expect(result.allowed).toBe(false)
      expect(result.errorCode).toBe('compatibility_limit')
      expect(typeof result.error).toBe('string')
      expect((result.error || '').length).toBeGreaterThan(0)
    })

    it('should return error for followup limit', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as never)
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: false,
        reason: 'followup_limit',
        remaining: 0,
      })

      const result = await checkAndConsumeCredits('followUp', 1)

      expect(result.allowed).toBe(false)
      expect(result.errorCode).toBe('followup_limit')
      expect(typeof result.error).toBe('string')
      expect((result.error || '').length).toBeGreaterThan(0)
    })

    it('should handle consume failure', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as never)
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: true,
        remaining: 5,
      })
      vi.mocked(consumeCredits).mockResolvedValue({
        success: false,
        error: 'db_error',
      })

      const result = await checkAndConsumeCredits('reading', 1)

      expect(result.allowed).toBe(false)
      expect(result.errorCode).toBe('db_error')
      expect(typeof result.error).toBe('string')
      expect((result.error || '').length).toBeGreaterThan(0)
    })
  })

  describe('checkCreditsOnly', () => {
    it('should return not_authenticated when no session', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const result = await checkCreditsOnly('reading', 1)

      expect(result.allowed).toBe(false)
      expect(result.errorCode).toBe('not_authenticated')
    })

    it('should bypass credits when BYPASS_CREDITS is true', async () => {
      process.env.BYPASS_CREDITS = 'true'
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as never)

      const result = await checkCreditsOnly('reading', 1)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9999)
    })

    it('should check credits without consuming', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as never)
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: true,
        remaining: 5,
      })

      const result = await checkCreditsOnly('reading', 1)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(5)
      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 1)
      expect(consumeCredits).not.toHaveBeenCalled()
    })

    it('should return error when not allowed', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as never)
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: false,
        reason: 'no_credits',
        remaining: 0,
      })

      const result = await checkCreditsOnly('reading', 1)

      expect(result.allowed).toBe(false)
      expect(typeof result.error).toBe('string')
      expect((result.error || '').length).toBeGreaterThan(0)
    })
  })

  describe('creditErrorResponse', () => {
    it('should return 401 for not_authenticated', () => {
      const result = creditErrorResponse({
        allowed: false,
        error: 'ë¡œê·¸ì¸ì´ í•„ìš”í•©ë‹ˆë‹¤',
        errorCode: 'not_authenticated',
      })

      // NextResponse.json returns an object with status
      expect(result).toBeInstanceOf(NextResponse)
    })

    it('should return 402 for credit errors', () => {
      const result = creditErrorResponse({
        allowed: false,
        error: 'í¬ë ˆë”§ì´ ë¶€ì¡±í•©ë‹ˆë‹¤',
        errorCode: 'no_credits',
        remaining: 0,
      })

      expect(result).toBeInstanceOf(NextResponse)
    })
  })

  describe('ensureUserCredits', () => {
    it('should not initialize if user already has credits', async () => {
      vi.mocked(getUserCredits).mockResolvedValue({
        userId: 'user-123',
        plan: 'free',
        monthlyCredits: 7,
      } as never)

      await ensureUserCredits('user-123')

      expect(getUserCredits).toHaveBeenCalledWith('user-123')
      expect(initializeUserCredits).not.toHaveBeenCalled()
    })

    it('should initialize if user has no credits', async () => {
      vi.mocked(getUserCredits).mockResolvedValue(null)
      vi.mocked(initializeUserCredits).mockResolvedValue({} as never)

      await ensureUserCredits('user-123')

      expect(initializeUserCredits).toHaveBeenCalledWith('user-123', 'free')
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(getUserCredits).mockRejectedValue(new Error('DB error'))

      // Should not throw
      await expect(ensureUserCredits('user-123')).resolves.toBeUndefined()
    })
  })
})
