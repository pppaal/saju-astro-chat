/**
 * Comprehensive tests for Email Service
 * Tests email sending, templates, provider selection, and audit logging
 */

import { vi } from 'vitest'

// Mock dependencies - must be before imports that use them
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    emailLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/email/providers', () => ({
  getEmailProvider: vi.fn(),
}))

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { getEmailProvider } from '@/lib/email/providers'
import {
  sendEmail,
  sendWelcomeEmail,
  sendPaymentReceiptEmail,
  sendSubscriptionConfirmEmail,
  sendSubscriptionCancelledEmail,
  sendPaymentFailedEmail,
  sendReferralRewardEmail,
} from '@/lib/email/emailService'

describe('Email Service', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('sendEmail - Core Functionality', () => {
    it('should send email successfully', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({
          success: true,
          messageId: 'msg_123',
        }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const result = await sendEmail(
        'welcome',
        'user@example.com',
        { userName: 'Test User', locale: 'ko' },
        'user_123'
      )

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg_123')
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.any(String),
          html: expect.any(String),
          tags: ['welcome'],
        })
      )
    })

    it('should skip email when no provider configured', async () => {
      delete process.env.RESEND_API_KEY
      delete process.env.SENDGRID_API_KEY

      const result = await sendEmail('welcome', 'user@example.com', {
        userName: 'Test',
        locale: 'en',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email provider not configured')
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No email provider configured')
      )
    })

    it('should handle unknown email type', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const result = await sendEmail('unknown_type' as any, 'user@example.com', {} as any)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unknown email type')
    })

    it('should handle provider send failure', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockRejectedValue(new Error('SMTP connection failed')),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const result = await sendEmail('welcome', 'user@example.com', {
        userName: 'Test',
        locale: 'en',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('SMTP connection failed')
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Provider error'),
        expect.any(Error)
      )
    })

    it('should log email to database', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({
          success: true,
          messageId: 'msg_456',
        }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      await sendEmail(
        'payment_receipt',
        'user@example.com',
        {
          userName: 'Test',
          amount: 10000,
          currency: 'KRW',
          productName: 'Pro Plan',
          locale: 'ko',
        },
        'user_123'
      )

      expect(prisma.emailLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_123',
          email: 'user@example.com',
          type: 'payment_receipt',
          subject: expect.any(String),
          status: 'sent',
          provider: 'resend',
          messageId: 'msg_456',
        }),
      })
    })

    it('should log failed emails to database', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'sendgrid',
        send: vi.fn().mockResolvedValue({
          success: false,
          error: 'Invalid recipient',
        }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      await sendEmail('welcome', 'invalid@', { userName: 'Test', locale: 'en' })

      expect(prisma.emailLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'failed',
          errorMsg: 'Invalid recipient',
        }),
      })
    })

    it('should handle database logging failure gracefully', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({ success: true }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockRejectedValue(new Error('Database connection lost'))

      const result = await sendEmail('welcome', 'user@example.com', {
        userName: 'Test',
        locale: 'en',
      })

      // Should still succeed even if logging fails
      expect(result.success).toBe(true)
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to log email'),
        expect.any(Error)
      )
    })
  })

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with all parameters', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({ success: true }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const result = await sendWelcomeEmail(
        'user_123',
        'user@example.com',
        'John Doe',
        'en',
        'REF12345'
      )

      expect(result.success).toBe(true)
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          tags: ['welcome'],
        })
      )
    })

    it('should handle missing name', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({ success: true }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const result = await sendWelcomeEmail('user_123', 'user@example.com', '')

      expect(result.success).toBe(true)
    })

    it('should default to Korean locale', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({ success: true }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      await sendWelcomeEmail('user_123', 'user@example.com', 'Test')

      expect(mockProvider.send).toHaveBeenCalled()
    })
  })

  describe('sendPaymentReceiptEmail', () => {
    it('should send payment receipt with all details', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({ success: true }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const result = await sendPaymentReceiptEmail('user_123', 'user@example.com', {
        userName: 'John Doe',
        amount: 50000,
        currency: 'KRW',
        productName: 'Premium Plan',
        transactionId: 'txn_789',
        locale: 'ko',
      })

      expect(result.success).toBe(true)
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['payment_receipt'],
        })
      )
    })

    it('should handle missing optional fields', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({ success: true }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const result = await sendPaymentReceiptEmail('user_123', 'user@example.com', {
        amount: 10000,
        currency: 'USD',
        productName: 'Basic Plan',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('sendSubscriptionConfirmEmail', () => {
    it('should send subscription confirmation', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({ success: true }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const result = await sendSubscriptionConfirmEmail('user_123', 'user@example.com', {
        userName: 'John',
        planName: 'Pro',
        billingCycle: 'monthly',
        nextBillingDate: '2024-02-01',
        locale: 'en',
      })

      expect(result.success).toBe(true)
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['subscription_confirm'],
        })
      )
    })
  })

  describe('sendSubscriptionCancelledEmail', () => {
    it('should send cancellation email', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({ success: true }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const result = await sendSubscriptionCancelledEmail('user_123', 'user@example.com', {
        userName: 'John',
        planName: 'Pro',
        locale: 'ko',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('sendPaymentFailedEmail', () => {
    it('should send payment failure notification', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({ success: true }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const result = await sendPaymentFailedEmail('user_123', 'user@example.com', {
        userName: 'John',
        planName: 'Premium',
      })

      expect(result.success).toBe(true)
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['payment_failed'],
        })
      )
    })
  })

  describe('sendReferralRewardEmail', () => {
    it('should send referral reward notification', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({ success: true }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const result = await sendReferralRewardEmail('user_123', 'user@example.com', {
        userName: 'John',
        creditsAwarded: 3,
        referredUserName: 'Jane',
        locale: 'ko',
      })

      expect(result.success).toBe(true)
    })

    it('should handle missing referred user name', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({ success: true }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const result = await sendReferralRewardEmail('user_123', 'user@example.com', {
        creditsAwarded: 5,
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Provider Selection', () => {
    it('should use Resend when RESEND_API_KEY is set', async () => {
      process.env.RESEND_API_KEY = 'resend_key'
      delete process.env.SENDGRID_API_KEY

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({ success: true }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      await sendWelcomeEmail('user_123', 'test@test.com', 'Test')

      expect(getEmailProvider).toHaveBeenCalled()
    })

    it('should use SendGrid when SENDGRID_API_KEY is set', async () => {
      delete process.env.RESEND_API_KEY
      process.env.SENDGRID_API_KEY = 'sendgrid_key'

      const mockProvider = {
        name: 'sendgrid',
        send: vi.fn().mockResolvedValue({ success: true }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      await sendWelcomeEmail('user_123', 'test@test.com', 'Test')

      expect(getEmailProvider).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle non-Error exceptions', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockRejectedValue('String error'),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const result = await sendEmail('welcome', 'test@test.com', {
        userName: 'Test',
        locale: 'en',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })

    it('should handle rate limiting', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({
          success: false,
          error: 'Rate limit exceeded',
        }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const result = await sendEmail('welcome', 'test@test.com', {
        userName: 'Test',
        locale: 'en',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Rate limit exceeded')
    })

    it('should handle invalid email addresses', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({
          success: false,
          error: 'Invalid email address',
        }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const result = await sendEmail('welcome', 'invalid-email', {
        userName: 'Test',
        locale: 'en',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long email addresses', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const longEmail = 'a'.repeat(200) + '@example.com'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({ success: true }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const result = await sendEmail('welcome', longEmail, {
        userName: 'Test',
        locale: 'en',
      })

      expect(mockProvider.send).toHaveBeenCalled()
    })

    it('should handle concurrent email sends', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({ success: true }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const sends = [
        sendWelcomeEmail('user1', 'user1@test.com', 'User 1'),
        sendWelcomeEmail('user2', 'user2@test.com', 'User 2'),
        sendWelcomeEmail('user3', 'user3@test.com', 'User 3'),
      ]

      const results = await Promise.all(sends)

      expect(results.every((r) => r.success)).toBe(true)
      expect(mockProvider.send).toHaveBeenCalledTimes(3)
    })

    it('should handle special characters in user names', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({ success: true }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const result = await sendWelcomeEmail(
        'user_123',
        'test@test.com',
        'John "Johnny" O\'Brien <test@evil.com>'
      )

      expect(result.success).toBe(true)
    })

    it('should handle missing userId in log', async () => {
      process.env.RESEND_API_KEY = 'test_key'

      const mockProvider = {
        name: 'resend',
        send: vi.fn().mockResolvedValue({ success: true }),
      }

      ;(getEmailProvider as any).mockReturnValue(mockProvider)
      ;(prisma.emailLog.create as any).mockResolvedValue({})

      const result = await sendEmail(
        'welcome',
        'test@test.com',
        { userName: 'Test', locale: 'en' }
        // No userId provided
      )

      expect(result.success).toBe(true)
      expect(prisma.emailLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: undefined,
        }),
      })
    })
  })
})
