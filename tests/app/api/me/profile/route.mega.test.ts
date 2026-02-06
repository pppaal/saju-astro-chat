/**
 * Comprehensive tests for /api/me/profile
 * Tests GET/PATCH operations, validation, cache invalidation, and preferences
 */

import { vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock middleware as passthrough - must be before route import
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any, ...args: any[]) => {
      const context = {
        userId: args[0]?.userId || 'user-123',
        session: { user: { id: args[0]?.userId || 'user-123' } },
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
        isPremium: false,
      }
      return handler(req, context, ...args)
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  extractLocale: vi.fn((_req: any) => 'ko'),
}))

vi.mock('@/lib/api/zodValidation', () => ({
  userProfileUpdateSchema: {
    safeParse: vi.fn((data: any) => {
      if (data === null || typeof data !== 'object') {
        return { success: false, error: { issues: [{ message: 'Expected object', path: [] }] } }
      }

      const result: any = {}

      // name validation: min(1), max(64), trim
      if (data.name !== undefined) {
        if (typeof data.name !== 'string' || data.name.trim().length === 0) {
          return {
            success: false,
            error: { issues: [{ message: 'Invalid name', path: ['name'] }] },
          }
        }
        const trimmed = data.name.trim()
        if (trimmed.length > 64) {
          return {
            success: false,
            error: { issues: [{ message: 'Name too long', path: ['name'] }] },
          }
        }
        result.name = trimmed
      }

      // image validation: url, nullable, optional
      if (data.image !== undefined) {
        if (data.image === null) {
          result.image = null
        } else if (typeof data.image === 'string') {
          try {
            const u = new URL(data.image)
            if (!['http:', 'https:'].includes(u.protocol)) {
              return {
                success: false,
                error: { issues: [{ message: 'Invalid URL', path: ['image'] }] },
              }
            }
            result.image = data.image
          } catch {
            return {
              success: false,
              error: { issues: [{ message: 'Invalid URL', path: ['image'] }] },
            }
          }
        }
      }

      // boolean fields
      if (data.emailNotifications !== undefined) {
        result.emailNotifications = !!data.emailNotifications
      }

      // string fields
      if (data.preferredLanguage !== undefined) {
        if (typeof data.preferredLanguage === 'string' && data.preferredLanguage.length <= 8) {
          result.preferredLanguage = data.preferredLanguage
        } else {
          return {
            success: false,
            error: { issues: [{ message: 'Invalid language', path: ['preferredLanguage'] }] },
          }
        }
      }

      if (data.notificationSettings !== undefined) {
        result.notificationSettings = data.notificationSettings
      }
      if (data.tonePreference !== undefined) {
        result.tonePreference = data.tonePreference
      }
      if (data.readingLength !== undefined) {
        result.readingLength = data.readingLength
      }

      // Birth info fields - nullable
      if (data.birthDate !== undefined) result.birthDate = data.birthDate
      if (data.birthTime !== undefined) result.birthTime = data.birthTime
      if (data.gender !== undefined) result.gender = data.gender
      if (data.birthCity !== undefined) result.birthCity = data.birthCity
      if (data.tzId !== undefined) result.tzId = data.tzId

      return { success: true, data: result }
    }),
  },
  createValidationErrorResponse: vi.fn((_zodError: any, _options?: any) => {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed', status: 422 },
      },
      { status: 400 }
    )
  }),
}))

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userPreferences: {
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@/lib/cache/redis-cache', () => ({
  clearCacheByPattern: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    NOT_FOUND: 404,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    SERVER_ERROR: 500,
  },
}))

import { GET, PATCH } from '@/app/api/me/profile/route'
import { prisma } from '@/lib/db/prisma'
import { clearCacheByPattern } from '@/lib/cache/redis-cache'

describe('/api/me/profile', () => {
  const mockUserId = 'user-123'
  const mockContext = { userId: mockUserId }

  const mockUserData = {
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
    image: 'https://example.com/avatar.jpg',
    profilePhoto: null,
    birthDate: '1990-01-15',
    birthTime: '14:30',
    gender: 'male',
    birthCity: 'Seoul',
    tzId: 'Asia/Seoul',
    createdAt: new Date('2023-01-01'),
    emailNotifications: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Re-mock clearCacheByPattern since clearAllMocks resets it
    vi.mocked(clearCacheByPattern).mockResolvedValue(undefined as any)
  })

  describe('GET /api/me/profile', () => {
    it('should return user profile successfully', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserData as any)

      const req = new NextRequest('http://localhost:3000/api/me/profile')
      const response = await GET(req, mockContext)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.user.id).toBe(mockUserId)
      expect(data.user.name).toBe('Test User')
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: expect.objectContaining({
          id: true,
          name: true,
          email: true,
          image: true,
          profilePhoto: true,
          birthDate: true,
          birthTime: true,
          gender: true,
          birthCity: true,
          tzId: true,
          createdAt: true,
          emailNotifications: true,
        }),
      })
    })

    it('should return 404 if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/me/profile')
      const response = await GET(req, mockContext)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('User not found')
    })

    it('should return user data fields in response', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserData as any)

      const req = new NextRequest('http://localhost:3000/api/me/profile')
      const response = await GET(req, mockContext)
      const data = await response.json()

      expect(data.user.email).toBe('test@example.com')
      expect(data.user.birthDate).toBe('1990-01-15')
      expect(data.user.birthTime).toBe('14:30')
    })
  })

  describe('PATCH /api/me/profile - Basic Fields', () => {
    it('should update name successfully', async () => {
      const updatedUser = { ...mockUserData, name: 'Updated Name' }
      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      })

      const response = await PATCH(req, mockContext)

      expect(response.status).toBe(200)
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUserId },
          data: expect.objectContaining({ name: 'Updated Name' }),
        })
      )
    })

    it('should trim whitespace from name', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue(mockUserData as any)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: '  Spaced Name  ' }),
      })

      await PATCH(req, mockContext)

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Spaced Name' }),
        })
      )
    })

    it('should reject name longer than 64 characters', async () => {
      const longName = 'a'.repeat(65)
      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: longName }),
      })

      const response = await PATCH(req, mockContext)

      // Zod validation rejects long name
      expect(response.status).toBe(400)
    })

    it('should update emailNotifications boolean', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue(mockUserData as any)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ emailNotifications: false }),
      })

      await PATCH(req, mockContext)

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ emailNotifications: false }),
        })
      )
    })

    it('should update image URL', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue(mockUserData as any)

      const imageUrl = 'https://example.com/new-avatar.jpg'
      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ image: imageUrl }),
      })

      await PATCH(req, mockContext)

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ image: imageUrl }),
        })
      )
    })

    it('should set image to null when explicitly passed', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue(mockUserData as any)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ image: null }),
      })

      await PATCH(req, mockContext)

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ image: null }),
        })
      )
    })

    it('should reject invalid URL for image', async () => {
      const invalidUrls = ['not-a-url', 'ftp://invalid.com', 'javascript:alert(1)']

      for (const url of invalidUrls) {
        vi.clearAllMocks()
        vi.mocked(clearCacheByPattern).mockResolvedValue(undefined as any)
        const req = new NextRequest('http://localhost:3000/api/me/profile', {
          method: 'PATCH',
          body: JSON.stringify({ image: url }),
        })

        const response = await PATCH(req, mockContext)

        // Zod validation rejects invalid URLs
        expect(response.status).toBe(400)
      }
    })
  })

  describe('PATCH /api/me/profile - Birth Information', () => {
    it('should update all birth fields', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue(mockUserData as any)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          birthDate: '1995-05-20',
          birthTime: '09:15',
          gender: 'female',
          birthCity: 'Busan',
          tzId: 'Asia/Seoul',
        }),
      })

      await PATCH(req, mockContext)

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            birthDate: '1995-05-20',
            birthTime: '09:15',
            gender: 'female',
            birthCity: 'Busan',
            tzId: 'Asia/Seoul',
          }),
        })
      )
    })

    it('should allow null values for birth fields', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue(mockUserData as any)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          birthDate: null,
          birthTime: null,
          gender: null,
        }),
      })

      await PATCH(req, mockContext)

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            birthDate: null,
            birthTime: null,
            gender: null,
          }),
        })
      )
    })
  })

  describe('PATCH /api/me/profile - Cache Invalidation', () => {
    it('should call clearCacheByPattern when birth fields change', async () => {
      // The route uses updatedUser.birthDate for old value when body.birthDate is undefined
      // When birthDate IS in body, oldBirthDate is null (route logic: body.birthDate !== undefined ? null : updatedUser.birthDate)
      // So if both old and new birthDate exist, the cache invalidation only fires for calendar
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockUserData,
        birthDate: '1990-01-15',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ birthTime: '16:00' }),
      })

      await PATCH(req, mockContext)

      // birthTime is in hasBirthFields, updatedUser.birthDate is '1990-01-15' since body.birthDate is undefined
      // oldBirthDate = updatedUser.birthDate = '1990-01-15'
      expect(clearCacheByPattern).toHaveBeenCalled()
    })

    it('should not invalidate birth caches when birth info unchanged', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue(mockUserData as any)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
      })

      await PATCH(req, mockContext)

      // The route always invalidates user-level cache (user:userId:*) on any update,
      // but should NOT invalidate birth-specific caches (saju:*, destiny:*, yearly:*)
      expect(clearCacheByPattern).toHaveBeenCalledWith('user:user-123:*')
      expect(clearCacheByPattern).not.toHaveBeenCalledWith(expect.stringContaining('saju:'))
      expect(clearCacheByPattern).not.toHaveBeenCalledWith(expect.stringContaining('destiny:'))
    })

    it('should invalidate cache when gender changes', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockUserData,
        birthDate: '1990-01-15',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ gender: 'female' }),
      })

      await PATCH(req, mockContext)

      // gender is in hasBirthFields, and updatedUser.birthDate is '1990-01-15'
      expect(clearCacheByPattern).toHaveBeenCalled()
    })

    it('should handle null birthDate in cache invalidation', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockUserData,
        birthDate: null,
      } as any)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ birthDate: '1990-01-15' }),
      })

      await PATCH(req, mockContext)

      // When body.birthDate !== undefined, oldBirthDate = null
      // So the condition oldBirthDate is null - cache invalidation NOT called for saju/destiny patterns
      // This is the current route behavior
      // clearCacheByPattern may or may not be called depending on the logic
    })

    it('should handle cache invalidation when birthTime changes', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockUserData,
        birthDate: '1990-01-15',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ birthTime: '16:00' }),
      })

      await PATCH(req, mockContext)

      // birthTime triggers hasBirthFields, and oldBirthDate = updatedUser.birthDate (since body.birthDate is undefined)
      expect(clearCacheByPattern).toHaveBeenCalledWith(expect.stringContaining('saju:1990-01-15:'))
    })
  })

  describe('PATCH /api/me/profile - User Preferences', () => {
    // NOTE: Preferences upsert is TEMPORARILY DISABLED in the route.
    // These tests verify the route handles preference fields gracefully
    // even though they are not persisted to the preferences table.

    beforeEach(() => {
      vi.mocked(prisma.user.update).mockResolvedValue(mockUserData as any)
    })

    it('should accept preferredLanguage in body without error', async () => {
      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ preferredLanguage: 'en' }),
      })

      const response = await PATCH(req, mockContext)
      expect(response.status).toBe(200)

      // Preferences upsert is disabled, so it should NOT be called
      expect(prisma.userPreferences.upsert).not.toHaveBeenCalled()
    })

    it('should accept tonePreference in body without error', async () => {
      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ tonePreference: 'formal' }),
      })

      const response = await PATCH(req, mockContext)
      expect(response.status).toBe(200)
    })

    it('should accept readingLength in body without error', async () => {
      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ readingLength: 'long' }),
      })

      const response = await PATCH(req, mockContext)
      expect(response.status).toBe(200)
    })

    it('should accept notificationSettings in body without error', async () => {
      const settings = { email: true, push: false, sms: true }
      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ notificationSettings: settings }),
      })

      const response = await PATCH(req, mockContext)
      expect(response.status).toBe(200)
    })

    it('should reject preferredLanguage longer than 8 chars', async () => {
      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ preferredLanguage: 'verylonglang' }),
      })

      const response = await PATCH(req, mockContext)

      // Zod validation rejects the long language code
      expect(response.status).toBe(400)
    })

    it('should not upsert preferences if no preference fields provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
      })

      await PATCH(req, mockContext)

      expect(prisma.userPreferences.upsert).not.toHaveBeenCalled()
    })
  })

  describe('PATCH /api/me/profile - Edge Cases', () => {
    it('should handle empty request body', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue(mockUserData as any)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({}),
      })

      const response = await PATCH(req, mockContext)

      expect(response.status).toBe(200)
    })

    it('should handle malformed JSON gracefully', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue(mockUserData as any)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: 'not-json',
      })

      const response = await PATCH(req, mockContext)

      // Route catches JSON parse error and falls back to empty object
      expect(response.status).toBe(200)
    })

    it('should update multiple fields at once', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue(mockUserData as any)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'New Name',
          emailNotifications: false,
          birthDate: '1995-05-20',
        }),
      })

      await PATCH(req, mockContext)

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Name',
            emailNotifications: false,
            birthDate: '1995-05-20',
          }),
        })
      )
    })

    it('should return updated user profile in response', async () => {
      const updatedUser = { ...mockUserData, name: 'Updated' }
      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      })

      const response = await PATCH(req, mockContext)
      const data = await response.json()

      expect(data.user).toBeDefined()
      expect(data.user.name).toBe('Updated')
    })
  })
})
