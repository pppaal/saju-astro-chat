/**
 * Comprehensive tests for /api/me/profile
 * Tests GET/PATCH operations, validation, cache invalidation, and preferences
 */

import { GET, PATCH } from '@/app/api/me/profile/route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { clearCacheByPattern } from '@/lib/cache/redis-cache'

// Mock dependencies
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userPreferences: {
      upsert: jest.fn(),
    },
  },
}))

jest.mock('@/lib/cache/redis-cache', () => ({
  clearCacheByPattern: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

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
    preferences: {
      preferredLanguage: 'ko',
      notificationSettings: null,
      tonePreference: 'casual',
      readingLength: 'medium',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/me/profile', () => {
    it('should return user profile successfully', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserData)

      const req = new NextRequest('http://localhost:3000/api/me/profile')
      const response = await GET(req, mockContext)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toEqual(mockUserData)
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
          preferences: expect.any(Object),
        }),
      })
    })

    it('should return 404 if user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/me/profile')
      const response = await GET(req, mockContext)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should include preferences in response', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserData)

      const req = new NextRequest('http://localhost:3000/api/me/profile')
      const response = await GET(req, mockContext)
      const data = await response.json()

      expect(data.user.preferences).toBeDefined()
      expect(data.user.preferences).toEqual({
        preferredLanguage: 'ko',
        notificationSettings: null,
        tonePreference: 'casual',
        readingLength: 'medium',
      })
    })
  })

  describe('PATCH /api/me/profile - Basic Fields', () => {
    it('should update name successfully', async () => {
      const updatedUser = { ...mockUserData, name: 'Updated Name' }
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(updatedUser)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      })

      const response = await PATCH(req, mockContext)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { name: 'Updated Name' },
        select: { id: true },
      })
    })

    it('should trim whitespace from name', async () => {
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserData)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: '  Spaced Name  ' }),
      })

      await PATCH(req, mockContext)

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'Spaced Name' },
        })
      )
    })

    it('should reject name longer than 64 characters', async () => {
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserData)

      const longName = 'a'.repeat(65)
      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: longName }),
      })

      await PATCH(req, mockContext)

      // Should not include name in update
      expect(prisma.user.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: longName }),
        })
      )
    })

    it('should update emailNotifications boolean', async () => {
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserData)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ emailNotifications: false }),
      })

      await PATCH(req, mockContext)

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { emailNotifications: false },
        })
      )
    })

    it('should update image URL', async () => {
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserData)

      const imageUrl = 'https://example.com/new-avatar.jpg'
      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ image: imageUrl }),
      })

      await PATCH(req, mockContext)

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { image: imageUrl },
        })
      )
    })

    it('should set image to null when explicitly passed', async () => {
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserData)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ image: null }),
      })

      await PATCH(req, mockContext)

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { image: null },
        })
      )
    })

    it('should reject invalid URL for image', async () => {
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserData)

      const invalidUrls = ['not-a-url', 'ftp://invalid.com', 'javascript:alert(1)']

      for (const url of invalidUrls) {
        jest.clearAllMocks()
        const req = new NextRequest('http://localhost:3000/api/me/profile', {
          method: 'PATCH',
          body: JSON.stringify({ image: url }),
        })

        await PATCH(req, mockContext)

        // Should not include invalid image in update
        expect(prisma.user.update).not.toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ image: url }),
          })
        )
      }
    })
  })

  describe('PATCH /api/me/profile - Birth Information', () => {
    it('should update all birth fields', async () => {
      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          birthDate: '1990-01-15',
          birthTime: '14:30',
          gender: 'male',
        })
        .mockResolvedValueOnce(mockUserData)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })

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
      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          birthDate: '1990-01-15',
          birthTime: '14:30',
          gender: 'male',
        })
        .mockResolvedValueOnce(mockUserData)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })

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
    it('should invalidate caches when birthDate changes', async () => {
      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          birthDate: '1990-01-15',
          birthTime: '14:30',
          gender: 'male',
        })
        .mockResolvedValueOnce(mockUserData)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ birthDate: '1995-05-20' }),
      })

      await PATCH(req, mockContext)

      expect(clearCacheByPattern).toHaveBeenCalledWith(expect.stringContaining('saju:1990-01-15:'))
      expect(clearCacheByPattern).toHaveBeenCalledWith(
        expect.stringContaining('destiny:1990-01-15:')
      )
      expect(clearCacheByPattern).toHaveBeenCalledWith(
        expect.stringContaining('yearly:v2:1990-01-15:')
      )
    })

    it('should invalidate calendar caches when birth changes', async () => {
      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          birthDate: '1990-01-15',
          birthTime: '14:30',
          gender: 'male',
        })
        .mockResolvedValueOnce(mockUserData)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ birthTime: '16:00' }),
      })

      await PATCH(req, mockContext)

      expect(clearCacheByPattern).toHaveBeenCalledWith(
        expect.stringContaining(`cal:*:*:${mockUserId}`)
      )
    })

    it('should not invalidate cache when birth info unchanged', async () => {
      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          birthDate: '1990-01-15',
          birthTime: '14:30',
          gender: 'male',
        })
        .mockResolvedValueOnce(mockUserData)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
      })

      await PATCH(req, mockContext)

      expect(clearCacheByPattern).not.toHaveBeenCalled()
    })

    it('should invalidate cache when gender changes', async () => {
      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          birthDate: '1990-01-15',
          birthTime: '14:30',
          gender: 'male',
        })
        .mockResolvedValueOnce(mockUserData)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ gender: 'female' }),
      })

      await PATCH(req, mockContext)

      expect(clearCacheByPattern).toHaveBeenCalled()
    })

    it('should handle null birthDate in cache invalidation', async () => {
      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          birthDate: null,
          birthTime: null,
          gender: null,
        })
        .mockResolvedValueOnce(mockUserData)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ birthDate: '1990-01-15' }),
      })

      await PATCH(req, mockContext)

      // Should still invalidate calendar caches
      expect(clearCacheByPattern).toHaveBeenCalledWith(
        expect.stringContaining(`cal:*:*:${mockUserId}`)
      )
    })
  })

  describe('PATCH /api/me/profile - User Preferences', () => {
    beforeEach(() => {
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserData)
    })

    it('should upsert preferredLanguage', async () => {
      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ preferredLanguage: 'en' }),
      })

      await PATCH(req, mockContext)

      expect(prisma.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        update: { preferredLanguage: 'en' },
        create: expect.objectContaining({
          userId: mockUserId,
          preferredLanguage: 'en',
        }),
      })
    })

    it('should upsert tonePreference', async () => {
      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ tonePreference: 'formal' }),
      })

      await PATCH(req, mockContext)

      expect(prisma.userPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { tonePreference: 'formal' },
          create: expect.objectContaining({ tonePreference: 'formal' }),
        })
      )
    })

    it('should upsert readingLength', async () => {
      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ readingLength: 'long' }),
      })

      await PATCH(req, mockContext)

      expect(prisma.userPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { readingLength: 'long' },
        })
      )
    })

    it('should upsert notificationSettings', async () => {
      const settings = { email: true, push: false, sms: true }
      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ notificationSettings: settings }),
      })

      await PATCH(req, mockContext)

      expect(prisma.userPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { notificationSettings: settings },
        })
      )
    })

    it('should create preferences with defaults if not exist', async () => {
      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ preferredLanguage: 'ko' }),
      })

      await PATCH(req, mockContext)

      const upsertCall = (prisma.userPreferences.upsert as jest.Mock).mock.calls[0][0]
      expect(upsertCall.create).toMatchObject({
        userId: mockUserId,
        preferredLanguage: 'ko',
        notificationSettings: null,
        tonePreference: 'casual',
        readingLength: 'medium',
      })
    })

    it('should reject preferredLanguage longer than 8 chars', async () => {
      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ preferredLanguage: 'verylonglang' }),
      })

      await PATCH(req, mockContext)

      expect(prisma.userPreferences.upsert).not.toHaveBeenCalled()
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
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserData)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({}),
      })

      const response = await PATCH(req, mockContext)

      expect(response.status).toBe(200)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {},
        select: { id: true },
      })
    })

    it('should handle malformed JSON', async () => {
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserData)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: 'not-json',
      })

      const response = await PATCH(req, mockContext)

      // Should gracefully handle and return empty update
      expect(response.status).toBe(200)
    })

    it('should update multiple fields at once', async () => {
      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          birthDate: '1990-01-15',
          birthTime: '14:30',
          gender: 'male',
        })
        .mockResolvedValueOnce(mockUserData)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'New Name',
          emailNotifications: false,
          birthDate: '1995-05-20',
          preferredLanguage: 'en',
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

      expect(prisma.userPreferences.upsert).toHaveBeenCalled()
    })

    it('should return full updated user profile', async () => {
      const updatedUser = { ...mockUserData, name: 'Updated' }
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockUserId })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(updatedUser)

      const req = new NextRequest('http://localhost:3000/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      })

      const response = await PATCH(req, mockContext)
      const data = await response.json()

      expect(data.user).toEqual(updatedUser)
    })
  })
})
