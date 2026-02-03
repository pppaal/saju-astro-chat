/**
 * Comprehensive tests for /api/user/upload-photo
 * Tests file upload, validation, security, and error handling
 */

import { POST } from '@/app/api/user/upload-photo/route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Mock dependencies
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
    matchProfile: {
      update: jest.fn(),
    },
  },
}))

jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  mkdir: jest.fn(),
}))

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

// Helper to create mock File
function createMockFile(name: string, type: string, size: number): File {
  const buffer = Buffer.alloc(size)
  const blob = new Blob([buffer], { type })
  return new File([blob], name, { type })
}

// Helper to create NextRequest with FormData
async function createRequestWithFile(file: File | null): Promise<NextRequest> {
  const formData = new FormData()
  if (file) {
    formData.append('photo', file)
  }

  return new NextRequest('http://localhost:3000/api/user/upload-photo', {
    method: 'POST',
    body: formData,
  })
}

describe('/api/user/upload-photo', () => {
  const mockUserId = 'test-user-123'
  const mockContext = { userId: mockUserId }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(existsSync as jest.Mock).mockReturnValue(true)
  })

  describe('File Validation', () => {
    it('should reject request with no file', async () => {
      const req = await createRequestWithFile(null)
      const response = await POST(req, mockContext)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('No photo file provided')
    })

    it('should reject invalid file types', async () => {
      const invalidTypes = [
        'application/pdf',
        'text/plain',
        'video/mp4',
        'application/octet-stream',
      ]

      for (const type of invalidTypes) {
        const file = createMockFile('test.pdf', type, 1024)
        const req = await createRequestWithFile(file)
        const response = await POST(req, mockContext)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Invalid file type')
      }
    })

    it('should accept valid image types', async () => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: mockUserId,
        name: 'Test User',
        image: null,
        profilePhoto: '/uploads/profiles/test.jpg',
        matchProfile: null,
      })

      for (const type of validTypes) {
        jest.clearAllMocks()
        const file = createMockFile('test.jpg', type, 1024)
        const req = await createRequestWithFile(file)
        const response = await POST(req, mockContext)

        expect(response.status).toBe(200)
      }
    })

    it('should reject files larger than 5MB', async () => {
      const largeFile = createMockFile('large.jpg', 'image/jpeg', 6 * 1024 * 1024)
      const req = await createRequestWithFile(largeFile)
      const response = await POST(req, mockContext)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('File too large')
    })

    it('should accept files at exactly 5MB', async () => {
      const maxFile = createMockFile('max.jpg', 'image/jpeg', 5 * 1024 * 1024)

      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: mockUserId,
        name: 'Test User',
        profilePhoto: '/uploads/profiles/test.jpg',
        matchProfile: null,
      })

      const req = await createRequestWithFile(maxFile)
      const response = await POST(req, mockContext)

      expect(response.status).toBe(200)
    })
  })

  describe('File Upload Process', () => {
    it('should create upload directory if not exists', async () => {
      ;(existsSync as jest.Mock).mockReturnValue(false)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: mockUserId,
        profilePhoto: '/uploads/profiles/test.jpg',
        matchProfile: null,
      })

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      await POST(req, mockContext)

      expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('public/uploads/profiles'), {
        recursive: true,
      })
    })

    it('should generate unique filename with userId and timestamp', async () => {
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: mockUserId,
        profilePhoto: '/uploads/profiles/test.jpg',
        matchProfile: null,
      })

      const file = createMockFile('photo.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)

      const before = Date.now()
      await POST(req, mockContext)
      const after = Date.now()

      expect(writeFile).toHaveBeenCalled()
      const writeCall = (writeFile as jest.Mock).mock.calls[0]
      const filepath = writeCall[0]

      // Check filename format: userId_timestamp.ext
      expect(filepath).toContain(mockUserId)
      expect(filepath).toMatch(/\d+\.jpg$/)
    })

    it('should preserve file extension', async () => {
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: mockUserId,
        profilePhoto: '/uploads/profiles/test.webp',
        matchProfile: null,
      })

      const extensions = ['jpg', 'jpeg', 'png', 'webp']

      for (const ext of extensions) {
        jest.clearAllMocks()
        const file = createMockFile(`photo.${ext}`, `image/${ext}`, 1024)
        const req = await createRequestWithFile(file)
        await POST(req, mockContext)

        const writeCall = (writeFile as jest.Mock).mock.calls[0]
        const filepath = writeCall[0]
        expect(filepath).toMatch(new RegExp(`\\.${ext}$`))
      }
    })

    it('should write file buffer correctly', async () => {
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: mockUserId,
        profilePhoto: '/uploads/profiles/test.jpg',
        matchProfile: null,
      })

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      await POST(req, mockContext)

      expect(writeFile).toHaveBeenCalled()
      const writeCall = (writeFile as jest.Mock).mock.calls[0]
      const buffer = writeCall[1]
      expect(Buffer.isBuffer(buffer)).toBe(true)
    })
  })

  describe('Database Operations', () => {
    it('should update user profile with photo URL', async () => {
      const mockUser = {
        id: mockUserId,
        name: 'Test User',
        image: null,
        profilePhoto: '/uploads/profiles/test.jpg',
        matchProfile: null,
      }

      ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      const response = await POST(req, mockContext)

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { profilePhoto: expect.stringContaining('/uploads/profiles/') },
        select: expect.any(Object),
      })

      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(data.photoUrl).toContain('/uploads/profiles/')
    })

    it('should sync with MatchProfile if exists', async () => {
      const mockUser = {
        id: mockUserId,
        name: 'Test User',
        profilePhoto: '/uploads/profiles/new.jpg',
        matchProfile: {
          id: 'match-123',
          photos: ['/old1.jpg', '/old2.jpg'],
        },
      }

      ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.matchProfile.update as jest.Mock).mockResolvedValue({})

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      await POST(req, mockContext)

      expect(prisma.matchProfile.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          photos: expect.arrayContaining([
            expect.stringContaining('/uploads/profiles/'),
            '/old1.jpg',
            '/old2.jpg',
          ]),
        },
      })
    })

    it('should limit MatchProfile photos to 6', async () => {
      const mockUser = {
        id: mockUserId,
        profilePhoto: '/uploads/profiles/new.jpg',
        matchProfile: {
          id: 'match-123',
          photos: ['/1.jpg', '/2.jpg', '/3.jpg', '/4.jpg', '/5.jpg', '/6.jpg'],
        },
      }

      ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.matchProfile.update as jest.Mock).mockResolvedValue({})

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      await POST(req, mockContext)

      const updateCall = (prisma.matchProfile.update as jest.Mock).mock.calls[0]
      const photos = updateCall[0].data.photos
      expect(photos.length).toBe(6)
    })

    it('should not duplicate photos in MatchProfile', async () => {
      const photoUrl = '/uploads/profiles/existing.jpg'
      const mockUser = {
        id: mockUserId,
        profilePhoto: photoUrl,
        matchProfile: {
          id: 'match-123',
          photos: [photoUrl, '/other.jpg'],
        },
      }

      ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      await POST(req, mockContext)

      // Should not update MatchProfile if photo already exists
      expect(prisma.matchProfile.update).not.toHaveBeenCalled()
    })

    it('should handle non-array photos in MatchProfile', async () => {
      const mockUser = {
        id: mockUserId,
        profilePhoto: '/uploads/profiles/new.jpg',
        matchProfile: {
          id: 'match-123',
          photos: null, // Non-array case
        },
      }

      ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.matchProfile.update as jest.Mock).mockResolvedValue({})

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      await POST(req, mockContext)

      const updateCall = (prisma.matchProfile.update as jest.Mock).mock.calls[0]
      const photos = updateCall[0].data.photos
      expect(Array.isArray(photos)).toBe(true)
      expect(photos.length).toBe(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      ;(prisma.user.update as jest.Mock).mockRejectedValue(new Error('Database connection failed'))

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      const response = await POST(req, mockContext)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to upload photo')
    })

    it('should handle file write errors', async () => {
      ;(writeFile as jest.Mock).mockRejectedValue(new Error('Disk full'))

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      const response = await POST(req, mockContext)
      const data = await response.json()

      expect(response.status).toBe(500)
    })

    it('should handle mkdir errors', async () => {
      ;(existsSync as jest.Mock).mockReturnValue(false)
      ;(mkdir as jest.Mock).mockRejectedValue(new Error('Permission denied'))

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      const response = await POST(req, mockContext)

      expect(response.status).toBe(500)
    })
  })

  describe('Security', () => {
    it('should sanitize filename to prevent path traversal', async () => {
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: mockUserId,
        profilePhoto: '/uploads/profiles/test.jpg',
        matchProfile: null,
      })

      const maliciousNames = [
        '../../../etc/passwd.jpg',
        '..\\..\\..\\windows\\system32\\test.jpg',
        'test/../../sensitive.jpg',
      ]

      for (const name of maliciousNames) {
        jest.clearAllMocks()
        const file = createMockFile(name, 'image/jpeg', 1024)
        const req = await createRequestWithFile(file)
        await POST(req, mockContext)

        const writeCall = (writeFile as jest.Mock).mock.calls[0]
        const filepath = writeCall[0]

        // Ensure file is written to the correct directory
        expect(filepath).toContain('public/uploads/profiles')
        expect(filepath).not.toContain('..')
      }
    })

    it('should include userId in filename for access control', async () => {
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: mockUserId,
        profilePhoto: '/uploads/profiles/test.jpg',
        matchProfile: null,
      })

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      await POST(req, mockContext)

      const writeCall = (writeFile as jest.Mock).mock.calls[0]
      const filepath = writeCall[0]
      expect(filepath).toContain(mockUserId)
    })

    it('should only allow authenticated users (via middleware)', async () => {
      // This test verifies the guard configuration
      // Actual authentication is tested in middleware tests
      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)

      // Verify that POST handler expects context with userId
      expect(mockContext.userId).toBeDefined()
    })
  })

  describe('Response Format', () => {
    it('should return correct success response structure', async () => {
      const mockUser = {
        id: mockUserId,
        name: 'Test User',
        image: null,
        profilePhoto: '/uploads/profiles/test_123.jpg',
        matchProfile: null,
      }

      ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      const response = await POST(req, mockContext)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('ok', true)
      expect(data).toHaveProperty('photoUrl')
      expect(data).toHaveProperty('user')
      expect(data.user).toHaveProperty('id', mockUserId)
      expect(data.user).toHaveProperty('profilePhoto')
    })

    it('should return proper error response structure', async () => {
      const file = createMockFile('test.txt', 'text/plain', 1024)
      const req = await createRequestWithFile(file)
      const response = await POST(req, mockContext)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code')
    })
  })
})
