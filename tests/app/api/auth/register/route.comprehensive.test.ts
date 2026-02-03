import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/auth/register/route'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { generateReferralCode, linkReferrer } from '@/lib/referral'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { enforceBodySize } from '@/lib/http'
import { sendWelcomeEmail } from '@/lib/email'

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock('bcryptjs')
vi.mock('@/lib/referral')
vi.mock('@/lib/rateLimit')
vi.mock('@/lib/request-ip')
vi.mock('@/lib/http')
vi.mock('@/lib/email')

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@/lib/security/errorSanitizer', () => ({
  sanitizeError: vi.fn((err) => ({ error: 'internal_error' })),
}))

describe('/api/auth/register', () => {
  const mockRateLimitHeaders = {
    'X-RateLimit-Limit': '10',
    'X-RateLimit-Remaining': '9',
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    vi.mocked(getClientIp).mockReturnValue('127.0.0.1')
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: true,
      remaining: 9,
      headers: mockRateLimitHeaders,
    } as any)
    vi.mocked(enforceBodySize).mockReturnValue(null)
    vi.mocked(generateReferralCode).mockReturnValue('REF123456')
    vi.mocked(sendWelcomeEmail).mockResolvedValue(undefined)
  })

  describe('Successful Registration', () => {
    it('should register a new user successfully', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword123' as never)
      vi.mocked(prisma.user.upsert).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        referralCode: 'REF123456',
      } as any)

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10)
      expect(prisma.user.upsert).toHaveBeenCalled()
    })

    it('should register user without name', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword' as never)
      vi.mocked(prisma.user.upsert).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      } as any)

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
    })

    it('should handle referral code linking', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword' as never)
      vi.mocked(prisma.user.upsert).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        referralCode: 'REF123456',
      } as any)
      vi.mocked(linkReferrer).mockResolvedValue(undefined)

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          referralCode: 'REFERRER123',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(linkReferrer).toHaveBeenCalledWith('user-123', 'REFERRER123')
    })

    it('should send welcome email', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword' as never)
      vi.mocked(prisma.user.upsert).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        referralCode: 'REF123456',
      } as any)

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      })

      await POST(req)

      expect(sendWelcomeEmail).toHaveBeenCalledWith(
        'user-123',
        'test@example.com',
        'Test User',
        'ko',
        'REF123456'
      )
    })

    it('should not fail if welcome email fails', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword' as never)
      vi.mocked(prisma.user.upsert).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        referralCode: 'REF123456',
      } as any)
      vi.mocked(sendWelcomeEmail).mockRejectedValue(new Error('Email service down'))

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
    })
  })

  describe('Validation', () => {
    it('should return error when email is missing', async () => {
      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'password123',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('missing_fields')
    })

    it('should return error when password is missing', async () => {
      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('missing_fields')
    })

    it('should return error for invalid email format', async () => {
      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_email')
    })

    it('should return error for email too long', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com'

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: longEmail,
          password: 'password123',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_email')
    })

    it('should return error for password too short', async () => {
      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'short',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_password')
    })

    it('should return error for password too long', async () => {
      const longPassword = 'a'.repeat(129)

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

    it('should trim email whitespace', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword' as never)
      vi.mocked(prisma.user.upsert).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        referralCode: 'REF123456',
      } as any)

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '  test@example.com  ',
          password: 'password123',
        }),
      })

      await POST(req)

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
    })

    it('should trim name whitespace', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword' as never)
      vi.mocked(prisma.user.upsert).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        referralCode: 'REF123456',
      } as any)

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: '  Test User  ',
        }),
      })

      await POST(req)

      const upsertCall = vi.mocked(prisma.user.upsert).mock.calls[0][0]
      expect(upsertCall.create.name).toBe('Test User')
    })

    it('should truncate name to max length', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword' as never)
      vi.mocked(prisma.user.upsert).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        referralCode: 'REF123456',
      } as any)

      const longName = 'a'.repeat(200)

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: longName,
        }),
      })

      await POST(req)

      const upsertCall = vi.mocked(prisma.user.upsert).mock.calls[0][0]
      expect(upsertCall.create.name?.length).toBeLessThanOrEqual(100)
    })

    it('should trim and truncate referral code', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword' as never)
      vi.mocked(prisma.user.upsert).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        referralCode: 'REF123456',
      } as any)
      vi.mocked(linkReferrer).mockResolvedValue(undefined)

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          referralCode: '  REF123  ',
        }),
      })

      await POST(req)

      expect(linkReferrer).toHaveBeenCalledWith('user-123', 'REF123')
    })
  })

  describe('User Conflicts', () => {
    it('should return error when user already exists with password', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
        passwordHash: 'existingHash',
      } as any)

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('user_exists')
    })

    it('should allow registration if user exists without password (OAuth user)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'oauth-user',
        email: 'test@example.com',
        passwordHash: null,
        name: 'OAuth User',
      } as any)
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword' as never)
      vi.mocked(prisma.user.upsert).mockResolvedValue({
        id: 'oauth-user',
        email: 'test@example.com',
        referralCode: 'REF123456',
      } as any)

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'New Name',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limiting', async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        retryAfter: 60,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'Retry-After': '60',
        },
      } as any)

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('rate_limited')
      expect(response.headers.get('Retry-After')).toBe('60')
    })

    it('should use IP-based rate limiting', async () => {
      vi.mocked(getClientIp).mockReturnValue('192.168.1.1')

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      await POST(req)

      expect(rateLimit).toHaveBeenCalledWith('register:192.168.1.1', {
        limit: 10,
        windowSeconds: 300,
      })
    })
  })

  describe('Body Size Enforcement', () => {
    it('should enforce body size limit', async () => {
      const oversizedResponse = new Response(JSON.stringify({ error: 'payload_too_large' }), {
        status: 413,
      })
      vi.mocked(enforceBodySize).mockReturnValue(oversizedResponse)

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(413)
    })

    it('should check body size with 32KB limit', async () => {
      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      await POST(req)

      expect(enforceBodySize).toHaveBeenCalledWith(req, 32 * 1024, mockRateLimitHeaders)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database connection failed'))

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('internal_error')
    })

    it('should handle bcrypt errors', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(bcrypt.hash).mockRejectedValue(new Error('Bcrypt error'))

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('internal_error')
    })

    it('should sanitize error messages', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(
        new Error('Sensitive database error with connection string')
      )

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      // Error should be sanitized
      expect(data.error).toBe('internal_error')
      expect(data.error).not.toContain('connection string')
    })
  })

  describe('Security', () => {
    it('should hash password with bcrypt', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword' as never)
      vi.mocked(prisma.user.upsert).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        referralCode: 'REF123456',
      } as any)

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'mySecretPassword',
        }),
      })

      await POST(req)

      expect(bcrypt.hash).toHaveBeenCalledWith('mySecretPassword', 10)
    })

    it('should generate unique referral code', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword' as never)
      vi.mocked(generateReferralCode).mockReturnValue('UNIQUE123')
      vi.mocked(prisma.user.upsert).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        referralCode: 'UNIQUE123',
      } as any)

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      await POST(req)

      expect(generateReferralCode).toHaveBeenCalled()
      const upsertCall = vi.mocked(prisma.user.upsert).mock.calls[0][0]
      expect(upsertCall.create.referralCode).toBe('UNIQUE123')
    })

    it('should not expose user ID in response', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword' as never)
      vi.mocked(prisma.user.upsert).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        referralCode: 'REF123456',
      } as any)

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data).not.toHaveProperty('id')
      expect(data).not.toHaveProperty('userId')
    })
  })
})
