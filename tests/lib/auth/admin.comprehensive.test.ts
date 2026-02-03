import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isAdminEmail, isAdminUser, checkAdminRole, requireAdminSession } from '@/lib/auth/admin'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'

vi.mock('next-auth')
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('admin.ts', () => {
  const originalEnv = process.env.ADMIN_EMAILS

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset ADMIN_EMAILS for each test
    process.env.ADMIN_EMAILS = 'admin@example.com,super@test.com'
  })

  afterEach(() => {
    process.env.ADMIN_EMAILS = originalEnv
  })

  describe('isAdminEmail', () => {
    it('should return true for valid admin email', () => {
      expect(isAdminEmail('admin@example.com')).toBe(true)
    })

    it('should return true for valid admin email with different case', () => {
      expect(isAdminEmail('ADMIN@EXAMPLE.COM')).toBe(true)
      expect(isAdminEmail('Admin@Example.Com')).toBe(true)
    })

    it('should return true for valid admin email with whitespace', () => {
      expect(isAdminEmail('  admin@example.com  ')).toBe(true)
    })

    it('should return true for second admin email', () => {
      expect(isAdminEmail('super@test.com')).toBe(true)
    })

    it('should return false for non-admin email', () => {
      expect(isAdminEmail('user@example.com')).toBe(false)
    })

    it('should return false for null email', () => {
      expect(isAdminEmail(null)).toBe(false)
    })

    it('should return false for undefined email', () => {
      expect(isAdminEmail(undefined)).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isAdminEmail('')).toBe(false)
    })

    it('should return false for whitespace only', () => {
      expect(isAdminEmail('   ')).toBe(false)
    })

    it('should handle empty ADMIN_EMAILS env var', () => {
      process.env.ADMIN_EMAILS = ''
      expect(isAdminEmail('admin@example.com')).toBe(false)
    })

    it('should handle undefined ADMIN_EMAILS env var', () => {
      delete process.env.ADMIN_EMAILS
      expect(isAdminEmail('admin@example.com')).toBe(false)
    })

    it('should handle ADMIN_EMAILS with extra commas', () => {
      process.env.ADMIN_EMAILS = 'admin@example.com,,super@test.com,'
      expect(isAdminEmail('admin@example.com')).toBe(true)
      expect(isAdminEmail('super@test.com')).toBe(true)
    })

    it('should normalize emails with mixed case in env var', () => {
      process.env.ADMIN_EMAILS = 'Admin@Example.COM'
      expect(isAdminEmail('admin@example.com')).toBe(true)
    })

    it('should trim whitespace in env var emails', () => {
      process.env.ADMIN_EMAILS = '  admin@example.com  ,  super@test.com  '
      expect(isAdminEmail('admin@example.com')).toBe(true)
      expect(isAdminEmail('super@test.com')).toBe(true)
    })
  })

  describe('isAdminUser', () => {
    it('should return true for user with admin role', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: 'admin',
        email: 'test@example.com',
      } as any)

      const result = await isAdminUser('user-123')
      expect(result).toBe(true)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { role: true, email: true },
      })
    })

    it('should return true for user with superadmin role', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: 'superadmin',
        email: 'test@example.com',
      } as any)

      const result = await isAdminUser('user-123')
      expect(result).toBe(true)
    })

    it('should return true for user in ADMIN_EMAILS (fallback)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: 'user',
        email: 'admin@example.com',
      } as any)

      const result = await isAdminUser('user-123')
      expect(result).toBe(true)
    })

    it('should return false for regular user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: 'user',
        email: 'regular@example.com',
      } as any)

      const result = await isAdminUser('user-123')
      expect(result).toBe(false)
    })

    it('should return false for non-existent user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const result = await isAdminUser('non-existent')
      expect(result).toBe(false)
    })

    it('should return false and log error on database error', async () => {
      const error = new Error('Database connection failed')
      vi.mocked(prisma.user.findUnique).mockRejectedValue(error)

      const result = await isAdminUser('user-123')
      expect(result).toBe(false)
    })

    it('should handle null email in fallback check', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: 'user',
        email: null,
      } as any)

      const result = await isAdminUser('user-123')
      expect(result).toBe(false)
    })

    it('should prioritize DB role over ADMIN_EMAILS', async () => {
      process.env.ADMIN_EMAILS = ''
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: 'admin',
        email: 'test@example.com',
      } as any)

      const result = await isAdminUser('user-123')
      expect(result).toBe(true)
    })
  })

  describe('checkAdminRole', () => {
    it('should return true for admin when admin role required', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: 'admin',
      } as any)

      const result = await checkAdminRole('user-123', 'admin')
      expect(result).toBe(true)
    })

    it('should return true for superadmin when admin role required', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: 'superadmin',
      } as any)

      const result = await checkAdminRole('user-123', 'admin')
      expect(result).toBe(true)
    })

    it('should return false for user when admin role required', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: 'user',
      } as any)

      const result = await checkAdminRole('user-123', 'admin')
      expect(result).toBe(false)
    })

    it('should return true for superadmin when superadmin role required', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: 'superadmin',
      } as any)

      const result = await checkAdminRole('user-123', 'superadmin')
      expect(result).toBe(true)
    })

    it('should return false for admin when superadmin role required', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: 'admin',
      } as any)

      const result = await checkAdminRole('user-123', 'superadmin')
      expect(result).toBe(false)
    })

    it('should return false for non-existent user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const result = await checkAdminRole('non-existent', 'admin')
      expect(result).toBe(false)
    })

    it('should default to admin role check when no role specified', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: 'admin',
      } as any)

      const result = await checkAdminRole('user-123')
      expect(result).toBe(true)
    })

    it('should handle null role', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: null,
      } as any)

      const result = await checkAdminRole('user-123', 'admin')
      expect(result).toBe(false)
    })

    it('should call prisma with correct parameters', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: 'admin',
      } as any)

      await checkAdminRole('user-456', 'superadmin')

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-456' },
        select: { role: true },
      })
    })
  })

  describe('requireAdminSession', () => {
    it('should return session for admin user', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'admin@example.com' },
        expires: '2024-12-31',
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: 'admin',
        email: 'admin@example.com',
      } as any)

      const result = await requireAdminSession()
      expect(result).toEqual(mockSession)
    })

    it('should return session for superadmin user', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'super@example.com' },
        expires: '2024-12-31',
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: 'superadmin',
        email: 'super@example.com',
      } as any)

      const result = await requireAdminSession()
      expect(result).toEqual(mockSession)
    })

    it('should return null for regular user', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'user@example.com' },
        expires: '2024-12-31',
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: 'user',
        email: 'user@example.com',
      } as any)

      const result = await requireAdminSession()
      expect(result).toBeNull()
    })

    it('should return null when no session', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const result = await requireAdminSession()
      expect(result).toBeNull()
    })

    it('should return null when session has no user', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        expires: '2024-12-31',
      } as any)

      const result = await requireAdminSession()
      expect(result).toBeNull()
    })

    it('should return null when session user has no id', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'admin@example.com' },
        expires: '2024-12-31',
      } as any)

      const result = await requireAdminSession()
      expect(result).toBeNull()
    })

    it('should return session for user in ADMIN_EMAILS (fallback)', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'admin@example.com' },
        expires: '2024-12-31',
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: 'user',
        email: 'admin@example.com',
      } as any)

      const result = await requireAdminSession()
      expect(result).toEqual(mockSession)
    })

    it('should handle database error gracefully', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'admin@example.com' },
        expires: '2024-12-31',
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('DB error'))

      const result = await requireAdminSession()
      expect(result).toBeNull()
    })

    it('should call getServerSession with authOptions', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      await requireAdminSession()

      expect(getServerSession).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    describe('normalizeEmail behavior', () => {
      it('should handle emails with multiple spaces', () => {
        process.env.ADMIN_EMAILS = 'admin@example.com'
        expect(isAdminEmail('  admin@example.com  ')).toBe(true)
      })

      it('should handle Unicode characters in email', () => {
        process.env.ADMIN_EMAILS = 'admin@例え.com'
        expect(isAdminEmail('admin@例え.com')).toBe(true)
      })
    })

    describe('getAdminEmails behavior', () => {
      it('should handle single admin email', () => {
        process.env.ADMIN_EMAILS = 'admin@example.com'
        expect(isAdminEmail('admin@example.com')).toBe(true)
      })

      it('should handle multiple admin emails', () => {
        process.env.ADMIN_EMAILS = 'admin1@example.com,admin2@example.com,admin3@example.com'
        expect(isAdminEmail('admin1@example.com')).toBe(true)
        expect(isAdminEmail('admin2@example.com')).toBe(true)
        expect(isAdminEmail('admin3@example.com')).toBe(true)
      })

      it('should filter out empty entries from comma-separated list', () => {
        process.env.ADMIN_EMAILS = ',admin@example.com,,'
        expect(isAdminEmail('admin@example.com')).toBe(true)
      })
    })

    describe('Role hierarchy', () => {
      it('should treat superadmin as higher privilege than admin', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
          role: 'superadmin',
        } as any)

        const adminCheck = await checkAdminRole('user-123', 'admin')
        const superadminCheck = await checkAdminRole('user-123', 'superadmin')

        expect(adminCheck).toBe(true)
        expect(superadminCheck).toBe(true)
      })

      it('should not allow admin to pass superadmin check', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
          role: 'admin',
        } as any)

        const adminCheck = await checkAdminRole('user-123', 'admin')
        const superadminCheck = await checkAdminRole('user-123', 'superadmin')

        expect(adminCheck).toBe(true)
        expect(superadminCheck).toBe(false)
      })
    })
  })
})
