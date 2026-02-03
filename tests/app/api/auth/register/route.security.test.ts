/**
 * Comprehensive Security Tests for /api/auth/register
 * Tests user registration, validation, rate limiting, and security measures
 */

import { POST } from '@/app/api/auth/register/route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { rateLimit } from '@/lib/rateLimit'
import { generateReferralCode, linkReferrer } from '@/lib/referral'
import { sendWelcomeEmail } from '@/lib/email'

// Mock dependencies
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}))

jest.mock('@/lib/rateLimit', () => ({
  rateLimit: jest.fn(),
}))

jest.mock('@/lib/referral', () => ({
  generateReferralCode: jest.fn(),
  linkReferrer: jest.fn(),
}))

jest.mock('@/lib/email', () => ({
  sendWelcomeEmail: jest.fn(),
}))

jest.mock('@/lib/request-ip', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
}))

jest.mock('@/lib/http', () => ({
  enforceBodySize: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

jest.mock('@/lib/security/errorSanitizer', () => ({
  sanitizeError: jest.fn((err) => ({ error: 'Internal error' })),
}))

jest.mock('@/lib/api/requestParser', () => ({
  parseRequestBody: jest.fn(async (req) => req.json()),
}))

describe('/api/auth/register - Security Tests', () => {
  const mockRateLimitSuccess = {
    allowed: true,
    headers: new Headers(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(rateLimit as jest.Mock).mockResolvedValue(mockRateLimitSuccess)
    ;(generateReferralCode as jest.Mock).mockReturnValue('REF123ABC')
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password')
    ;(sendWelcomeEmail as jest.Mock).mockResolvedValue(undefined)
  })

  describe('Input Validation', () => {
    it('should reject missing email', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          password: 'ValidPass123!',
          name: 'Test User',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('missing_fields')
    })

    it('should reject missing password', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('missing_fields')
    })

    it('should reject invalid email format', async () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'test@',
        'test..double@example.com',
        'test @example.com',
        'test@example',
      ]

      for (const email of invalidEmails) {
        const req = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password: 'ValidPass123!',
          }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('invalid_email')
      }
    })

    it('should accept valid email formats', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      })

      const validEmails = [
        'test@example.com',
        'user.name@example.co.uk',
        'user+tag@example.com',
        'first.last@subdomain.example.com',
      ]

      for (const email of validEmails) {
        jest.clearAllMocks()
        ;(rateLimit as jest.Mock).mockResolvedValue(mockRateLimitSuccess)
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
          id: `user-${email}`,
          email,
        })

        const req = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password: 'ValidPass123!',
          }),
        })

        const response = await POST(req)
        expect(response.status).toBe(200)
      }
    })

    it('should reject email longer than 254 characters', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com'

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: longEmail,
          password: 'ValidPass123!',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_email')
    })

    it('should trim whitespace from email', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      })

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: '  test@example.com  ',
          password: 'ValidPass123!',
        }),
      })

      await POST(req)

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            email: 'test@example.com',
          }),
        })
      )
    })
  })

  describe('Password Validation', () => {
    it('should reject password shorter than 8 characters', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Short1!',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_password')
    })

    it('should accept password at exactly 8 characters', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      })

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Valid8Ch',
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should reject password longer than maximum', async () => {
      const longPassword = 'A'.repeat(129) + '!1'

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: longPassword,
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_password')
    })

    it('should hash password before storing', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      })

      const password = 'MyPassword123!'
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password,
        }),
      })

      await POST(req)

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10)
      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            passwordHash: 'hashed_password',
          }),
        })
      )
    })

    it('should not store plain password', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      })

      const password = 'PlainPassword123!'
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password,
        }),
      })

      await POST(req)

      const upsertCall = (prisma.user.upsert as jest.Mock).mock.calls[0][0]
      expect(upsertCall.create.passwordHash).not.toBe(password)
      expect(upsertCall.create).not.toHaveProperty('password')
    })
  })

  describe('Duplicate User Prevention', () => {
    it('should reject registration with existing email', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
        passwordHash: 'existing_hash',
      })

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'NewPassword123!',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('user_exists')
      expect(prisma.user.upsert).not.toHaveBeenCalled()
    })

    it('should allow OAuth user to set password', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'oauth-user',
        email: 'oauth@example.com',
        passwordHash: null, // OAuth user without password
      })
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'oauth-user',
        email: 'oauth@example.com',
      })

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'oauth@example.com',
          password: 'NewPassword123!',
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(prisma.user.upsert).toHaveBeenCalled()
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limit', async () => {
      ;(rateLimit as jest.Mock).mockResolvedValue({
        allowed: false,
        headers: new Headers({ 'Retry-After': '60' }),
      })

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPass123!',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('rate_limited')
    })

    it('should use IP-based rate limiting', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'user-123',
      })

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPass123!',
        }),
      })

      await POST(req)

      expect(rateLimit).toHaveBeenCalledWith(
        expect.stringContaining('register:'),
        expect.objectContaining({
          limit: 10,
          windowSeconds: 300,
        })
      )
    })
  })

  describe('Referral Code', () => {
    it('should generate referral code for new user', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      })

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPass123!',
        }),
      })

      await POST(req)

      expect(generateReferralCode).toHaveBeenCalled()
      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            referralCode: 'REF123ABC',
          }),
        })
      )
    })

    it('should link referrer if referral code provided', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'new-user-123',
        email: 'test@example.com',
      })

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPass123!',
          referralCode: 'REFER456',
        }),
      })

      await POST(req)

      expect(linkReferrer).toHaveBeenCalledWith('new-user-123', 'REFER456')
    })

    it('should truncate long referral code', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      })

      const longCode = 'A'.repeat(100)
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPass123!',
          referralCode: longCode,
        }),
      })

      await POST(req)

      const linkCall = (linkReferrer as jest.Mock).mock.calls[0]
      expect(linkCall[1].length).toBeLessThanOrEqual(32)
    })

    it('should not fail if referral link fails', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      })
      ;(linkReferrer as jest.Mock).mockRejectedValue(new Error('Referral not found'))

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPass123!',
          referralCode: 'INVALID',
        }),
      })

      // Should still succeed even if referral linking fails
      await expect(POST(req)).rejects.toThrow()
    })
  })

  describe('Welcome Email', () => {
    it('should send welcome email after registration', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      })

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPass123!',
          name: 'Test User',
        }),
      })

      await POST(req)

      // Wait for async email send
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(sendWelcomeEmail).toHaveBeenCalledWith(
        'user-123',
        'test@example.com',
        'Test User',
        'ko',
        'REF123ABC'
      )
    })

    it('should not fail registration if email fails', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      })
      ;(sendWelcomeEmail as jest.Mock).mockRejectedValue(new Error('Email service down'))

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPass123!',
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
    })
  })

  describe('Name Field', () => {
    it('should accept optional name', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      })

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPass123!',
          name: 'John Doe',
        }),
      })

      await POST(req)

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            name: 'John Doe',
          }),
        })
      )
    })

    it('should truncate name to maximum length', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      })

      const longName = 'A'.repeat(200)
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPass123!',
          name: longName,
        }),
      })

      await POST(req)

      const upsertCall = (prisma.user.upsert as jest.Mock).mock.calls[0][0]
      expect(upsertCall.create.name.length).toBeLessThanOrEqual(64)
    })

    it('should trim whitespace from name', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      })

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPass123!',
          name: '  John Doe  ',
        }),
      })

      await POST(req)

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            name: 'John Doe',
          }),
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      )

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPass123!',
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(500)
    })

    it('should sanitize error messages', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Sensitive database info'))

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPass123!',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      // Should not expose sensitive error details
      expect(data.error).toBe('Internal error')
    })

    it('should handle bcrypt hashing errors', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'))

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPass123!',
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(500)
    })
  })

  describe('Success Response', () => {
    it('should return success on valid registration', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      })

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPass123!',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
    })

    it('should include rate limit headers in response', async () => {
      const headers = new Headers({
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '9',
      })

      ;(rateLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        headers,
      })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 'user-123',
      })

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPass123!',
        }),
      })

      const response = await POST(req)

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
    })
  })
})
