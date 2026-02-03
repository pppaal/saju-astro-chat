import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, DELETE } from '@/app/api/destiny-match/profile/route'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

// Mock rate limiting
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock request-ip
vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

// Mock CSRF
vi.mock('@/lib/security/csrf', () => ({
  csrfGuard: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock credits
vi.mock('@/lib/credits', () => ({
  checkAndConsumeCredits: vi.fn().mockResolvedValue({ success: true, remaining: 10 }),
}))

vi.mock('@/lib/credits/creditRefund', () => ({
  refundCredits: vi.fn(),
}))

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    matchProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    personalityResult: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'

describe('Profile API - GET', () => {
  const mockUserId = 'user-123'
  const mockSession = {
    user: { id: mockUserId, email: 'test@example.com' },
    expires: '2025-12-31',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
  })

  it('should return null profile if user has no profile', async () => {
    vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/destiny-match/profile', {
      method: 'GET',
    })

    const response = await GET(request, { userId: mockUserId } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.profile).toBeNull()
    expect(data.needsSetup).toBe(true)
  })

  it('should return profile with user data', async () => {
    const mockProfile = {
      id: 'profile-123',
      userId: mockUserId,
      displayName: 'Test User',
      bio: 'Test bio',
      occupation: 'Engineer',
      photos: ['photo1.jpg', 'photo2.jpg'],
      city: 'Seoul',
      latitude: 37.5665,
      longitude: 126.978,
      interests: ['reading', 'travel'],
      ageMin: 25,
      ageMax: 35,
      maxDistance: 50,
      genderPreference: 'all',
      isActive: true,
      isVisible: true,
      user: {
        birthDate: new Date('1990-01-01'),
        birthTime: '12:00',
        birthCity: 'Seoul',
        gender: 'MALE',
        image: 'avatar.jpg',
      },
    }

    vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockProfile as any)

    const request = new NextRequest('http://localhost/api/destiny-match/profile', {
      method: 'GET',
    })

    const response = await GET(request, { userId: mockUserId } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.profile).toBeDefined()
    expect(data.profile.displayName).toBe('Test User')
    expect(data.needsSetup).toBe(false)
  })

  it('should include user birth data in profile', async () => {
    const mockProfile = {
      id: 'profile-123',
      userId: mockUserId,
      displayName: 'Test User',
      user: {
        birthDate: new Date('1990-01-01'),
        birthTime: '12:00',
        birthCity: 'Seoul',
        gender: 'MALE',
        image: 'avatar.jpg',
      },
    }

    vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockProfile as any)

    const request = new NextRequest('http://localhost/api/destiny-match/profile', {
      method: 'GET',
    })

    const response = await GET(request, { userId: mockUserId } as any)
    const data = await response.json()

    expect(data.profile.user.birthDate).toBeDefined()
    expect(data.profile.user.birthTime).toBe('12:00')
    expect(data.profile.user.gender).toBe('MALE')
  })
})

describe('Profile API - POST', () => {
  const mockUserId = 'user-123'
  const mockSession = {
    user: { id: mockUserId, email: 'test@example.com' },
    expires: '2025-12-31',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
  })

  describe('Validation - Display Name', () => {
    it('should reject empty displayName', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: '' }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('2자 이상')
    })

    it('should reject displayName with only whitespace', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: '   ' }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('2자 이상')
    })

    it('should reject displayName shorter than 2 chars', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'A' }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('2자 이상')
    })

    it('should accept valid displayName', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.matchProfile.create).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        displayName: 'Test',
      } as any)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test' }),
      })

      const response = await POST(request, { userId: mockUserId } as any)

      expect(response.status).toBe(200)
    })

    it('should trim displayName whitespace', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(null)

      const mockCreate = vi.fn().mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        displayName: 'Test',
      })
      vi.mocked(prisma.matchProfile.create).mockImplementation(mockCreate)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: '  Test  ' }),
      })

      await POST(request, { userId: mockUserId } as any)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayName: 'Test',
          }),
        })
      )
    })
  })

  describe('Validation - Coordinates', () => {
    beforeEach(() => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(null)
    })

    it('should reject latitude < -90', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', latitude: -91 }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('latitude')
    })

    it('should reject latitude > 90', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', latitude: 91 }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('latitude')
    })

    it('should reject non-number latitude', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', latitude: 'invalid' }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('latitude')
    })

    it('should accept valid latitude', async () => {
      vi.mocked(prisma.matchProfile.create).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      } as any)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', latitude: 37.5665 }),
      })

      const response = await POST(request, { userId: mockUserId } as any)

      expect(response.status).toBe(200)
    })

    it('should reject longitude < -180', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', longitude: -181 }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('longitude')
    })

    it('should reject longitude > 180', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', longitude: 181 }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('longitude')
    })

    it('should accept valid longitude', async () => {
      vi.mocked(prisma.matchProfile.create).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      } as any)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', longitude: 126.978 }),
      })

      const response = await POST(request, { userId: mockUserId } as any)

      expect(response.status).toBe(200)
    })

    it('should accept coordinates at boundaries', async () => {
      vi.mocked(prisma.matchProfile.create).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      } as any)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({
          displayName: 'Test',
          latitude: -90,
          longitude: -180,
        }),
      })

      const response = await POST(request, { userId: mockUserId } as any)

      expect(response.status).toBe(200)
    })
  })

  describe('Validation - Photos', () => {
    beforeEach(() => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(null)
    })

    it('should reject non-array photos', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', photos: 'not-array' }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Photos')
    })

    it('should reject more than 10 photos', async () => {
      const photos = Array(11).fill('photo.jpg')

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', photos }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Photos')
      expect(data.error).toContain('10')
    })

    it('should accept empty photos array', async () => {
      vi.mocked(prisma.matchProfile.create).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      } as any)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', photos: [] }),
      })

      const response = await POST(request, { userId: mockUserId } as any)

      expect(response.status).toBe(200)
    })

    it('should accept exactly 10 photos', async () => {
      vi.mocked(prisma.matchProfile.create).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      } as any)

      const photos = Array(10).fill('photo.jpg')

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', photos }),
      })

      const response = await POST(request, { userId: mockUserId } as any)

      expect(response.status).toBe(200)
    })
  })

  describe('Validation - Age Range', () => {
    beforeEach(() => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(null)
    })

    it('should reject ageMin < 18', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', ageMin: 17 }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('ageMin')
    })

    it('should reject ageMin > 100', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', ageMin: 101 }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('ageMin')
    })

    it('should reject non-number ageMin', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', ageMin: 'invalid' }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('ageMin')
    })

    it('should reject ageMax < 18', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', ageMax: 17 }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('ageMax')
    })

    it('should reject ageMax > 100', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', ageMax: 101 }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('ageMax')
    })

    it('should accept valid age range', async () => {
      vi.mocked(prisma.matchProfile.create).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      } as any)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', ageMin: 25, ageMax: 35 }),
      })

      const response = await POST(request, { userId: mockUserId } as any)

      expect(response.status).toBe(200)
    })

    it('should default ageMin to 18 if not provided', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      })
      vi.mocked(prisma.matchProfile.create).mockImplementation(mockCreate)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test' }),
      })

      await POST(request, { userId: mockUserId } as any)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ageMin: 18,
          }),
        })
      )
    })

    it('should default ageMax to 99 if not provided', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      })
      vi.mocked(prisma.matchProfile.create).mockImplementation(mockCreate)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test' }),
      })

      await POST(request, { userId: mockUserId } as any)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ageMax: 99,
          }),
        })
      )
    })
  })

  describe('Validation - Max Distance', () => {
    beforeEach(() => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(null)
    })

    it('should reject maxDistance < 1', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', maxDistance: 0 }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('maxDistance')
    })

    it('should reject maxDistance > 500', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', maxDistance: 501 }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('maxDistance')
    })

    it('should reject non-number maxDistance', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', maxDistance: 'invalid' }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('maxDistance')
    })

    it('should accept valid maxDistance', async () => {
      vi.mocked(prisma.matchProfile.create).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      } as any)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', maxDistance: 50 }),
      })

      const response = await POST(request, { userId: mockUserId } as any)

      expect(response.status).toBe(200)
    })

    it('should default maxDistance to 50 if not provided', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      })
      vi.mocked(prisma.matchProfile.create).mockImplementation(mockCreate)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test' }),
      })

      await POST(request, { userId: mockUserId } as any)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            maxDistance: 50,
          }),
        })
      )
    })
  })

  describe('Profile Creation', () => {
    beforeEach(() => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(null)
    })

    it('should create new profile if none exists', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        displayName: 'Test',
      })
      vi.mocked(prisma.matchProfile.create).mockImplementation(mockCreate)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test' }),
      })

      await POST(request, { userId: mockUserId } as any)

      expect(mockCreate).toHaveBeenCalled()
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserId,
            displayName: 'Test',
          }),
        })
      )
    })

    it('should set lastActiveAt on creation', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      })
      vi.mocked(prisma.matchProfile.create).mockImplementation(mockCreate)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test' }),
      })

      await POST(request, { userId: mockUserId } as any)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastActiveAt: expect.any(Date),
          }),
        })
      )
    })

    it('should default isActive to true', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      })
      vi.mocked(prisma.matchProfile.create).mockImplementation(mockCreate)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test' }),
      })

      await POST(request, { userId: mockUserId } as any)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: true,
          }),
        })
      )
    })

    it('should default isVisible to true', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      })
      vi.mocked(prisma.matchProfile.create).mockImplementation(mockCreate)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test' }),
      })

      await POST(request, { userId: mockUserId } as any)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isVisible: true,
          }),
        })
      )
    })
  })

  describe('Profile Update', () => {
    it('should update existing profile', async () => {
      const existingProfile = {
        id: 'profile-123',
        userId: mockUserId,
        displayName: 'Old Name',
      }

      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(existingProfile as any)
      vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(null)

      const mockUpdate = vi.fn().mockResolvedValue({
        ...existingProfile,
        displayName: 'New Name',
      })
      vi.mocked(prisma.matchProfile.update).mockImplementation(mockUpdate)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'New Name' }),
      })

      await POST(request, { userId: mockUserId } as any)

      expect(mockUpdate).toHaveBeenCalled()
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId },
          data: expect.objectContaining({
            displayName: 'New Name',
          }),
        })
      )
    })

    it('should not create new profile if one exists', async () => {
      const existingProfile = {
        id: 'profile-123',
        userId: mockUserId,
        displayName: 'Old Name',
      }

      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(existingProfile as any)
      vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.matchProfile.update).mockResolvedValue(existingProfile as any)

      const mockCreate = vi.fn()
      vi.mocked(prisma.matchProfile.create).mockImplementation(mockCreate)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'New Name' }),
      })

      await POST(request, { userId: mockUserId } as any)

      expect(mockCreate).not.toHaveBeenCalled()
    })
  })

  describe('Personality Integration', () => {
    beforeEach(() => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(null)
    })

    it('should integrate personality test results if available', async () => {
      const personalityResult = {
        typeCode: 'INTJ',
        personaName: 'The Architect',
        energyScore: 75,
        cognitionScore: 80,
        decisionScore: 65,
        rhythmScore: 70,
      }

      vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(personalityResult as any)

      const mockCreate = vi.fn().mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      })
      vi.mocked(prisma.matchProfile.create).mockImplementation(mockCreate)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test' }),
      })

      await POST(request, { userId: mockUserId } as any)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            personalityType: 'INTJ',
            personalityName: 'The Architect',
            personalityScores: {
              energy: 75,
              cognition: 80,
              decision: 65,
              rhythm: 70,
            },
          }),
        })
      )
    })

    it('should not add personality fields if no test results', async () => {
      vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(null)

      const mockCreate = vi.fn().mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      })
      vi.mocked(prisma.matchProfile.create).mockImplementation(mockCreate)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test' }),
      })

      await POST(request, { userId: mockUserId } as any)

      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.data.personalityType).toBeUndefined()
      expect(callArgs.data.personalityName).toBeUndefined()
      expect(callArgs.data.personalityScores).toBeUndefined()
    })
  })

  describe('Optional Fields', () => {
    beforeEach(() => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(null)
    })

    it('should handle bio field', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      })
      vi.mocked(prisma.matchProfile.create).mockImplementation(mockCreate)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', bio: 'Test bio' }),
      })

      await POST(request, { userId: mockUserId } as any)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bio: 'Test bio',
          }),
        })
      )
    })

    it('should trim bio whitespace', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      })
      vi.mocked(prisma.matchProfile.create).mockImplementation(mockCreate)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', bio: '  Test bio  ' }),
      })

      await POST(request, { userId: mockUserId } as any)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bio: 'Test bio',
          }),
        })
      )
    })

    it('should handle occupation field', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      })
      vi.mocked(prisma.matchProfile.create).mockImplementation(mockCreate)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', occupation: 'Engineer' }),
      })

      await POST(request, { userId: mockUserId } as any)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            occupation: 'Engineer',
          }),
        })
      )
    })

    it('should handle interests array', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      })
      vi.mocked(prisma.matchProfile.create).mockImplementation(mockCreate)

      const interests = ['reading', 'travel', 'music']

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test', interests }),
      })

      await POST(request, { userId: mockUserId } as any)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            interests: ['reading', 'travel', 'music'],
          }),
        })
      )
    })

    it('should default empty arrays to empty', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
      })
      vi.mocked(prisma.matchProfile.create).mockImplementation(mockCreate)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test' }),
      })

      await POST(request, { userId: mockUserId } as any)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            interests: [],
            photos: [],
          }),
        })
      )
    })
  })

  describe('Response Format', () => {
    beforeEach(() => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(null)
    })

    it('should return created profile', async () => {
      const mockProfile = {
        id: 'profile-123',
        userId: mockUserId,
        displayName: 'Test',
      }

      vi.mocked(prisma.matchProfile.create).mockResolvedValue(mockProfile as any)

      const request = new NextRequest('http://localhost/api/destiny-match/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Test' }),
      })

      const response = await POST(request, { userId: mockUserId } as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.profile).toEqual(mockProfile)
    })
  })
})

describe('Profile API - DELETE', () => {
  const mockUserId = 'user-123'
  const mockSession = {
    user: { id: mockUserId, email: 'test@example.com' },
    expires: '2025-12-31',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
  })

  it('should deactivate profile', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      id: 'profile-123',
      userId: mockUserId,
      isActive: false,
      isVisible: false,
    })
    vi.mocked(prisma.matchProfile.update).mockImplementation(mockUpdate)

    const request = new NextRequest('http://localhost/api/destiny-match/profile', {
      method: 'DELETE',
    })

    await DELETE(request, { userId: mockUserId } as any)

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { userId: mockUserId },
      data: {
        isActive: false,
        isVisible: false,
      },
    })
  })

  it('should set both isActive and isVisible to false', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      id: 'profile-123',
      userId: mockUserId,
      isActive: false,
      isVisible: false,
    })
    vi.mocked(prisma.matchProfile.update).mockImplementation(mockUpdate)

    const request = new NextRequest('http://localhost/api/destiny-match/profile', {
      method: 'DELETE',
    })

    await DELETE(request, { userId: mockUserId } as any)

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          isActive: false,
          isVisible: false,
        },
      })
    )
  })

  it('should return success response', async () => {
    vi.mocked(prisma.matchProfile.update).mockResolvedValue({
      id: 'profile-123',
      userId: mockUserId,
      isActive: false,
      isVisible: false,
    } as any)

    const request = new NextRequest('http://localhost/api/destiny-match/profile', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { userId: mockUserId } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should not actually delete profile from database', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      id: 'profile-123',
      userId: mockUserId,
      isActive: false,
      isVisible: false,
    })
    vi.mocked(prisma.matchProfile.update).mockImplementation(mockUpdate)

    const request = new NextRequest('http://localhost/api/destiny-match/profile', {
      method: 'DELETE',
    })

    await DELETE(request, { userId: mockUserId } as any)

    // Should call update, not delete
    expect(mockUpdate).toHaveBeenCalled()
  })
})
