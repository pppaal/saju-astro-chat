/**
 * Comprehensive tests for /api/user/upload-photo
 * Tests file upload, validation, security, and error handling
 *
 * The route uses @vercel/blob for storage and withApiMiddleware for auth.
 * We test the inner handler logic by mocking the middleware and blob storage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// Mock @vercel/blob
const mockPut = vi.fn()
const mockDel = vi.fn()
vi.mock('@vercel/blob', () => ({
  put: mockPut,
  del: mockDel,
}))

// Mock middleware - expose the inner handler so we can test it directly
let capturedHandler: ((req: NextRequest, context: { userId: string }) => Promise<Response>) | null =
  null

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => {
    capturedHandler = handler
    return async (req: NextRequest) => {
      // Simulate authenticated middleware by calling handler with userId context
      return handler(req, { userId: 'test-user-123' })
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: any) => Response.json(data, { status: 200 })),
  apiError: vi.fn((code: string, message: string) =>
    Response.json({ error: message, code }, { status: code === 'INTERNAL_ERROR' ? 500 : 400 })
  ),
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
    matchProfile: {
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

// Helper to create mock File
function createMockFile(name: string, type: string, size: number): File {
  const buffer = new ArrayBuffer(size)
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

  beforeEach(() => {
    vi.clearAllMocks()
    mockPut.mockResolvedValue({
      url: 'https://blob.vercel-storage.com/profiles/test-user-123_1234.jpg',
    })
    mockDel.mockResolvedValue(undefined)
  })

  // Import to trigger module evaluation and capture the handler
  it('should export POST handler', async () => {
    const { POST } = await import('@/app/api/user/upload-photo/route')
    expect(POST).toBeDefined()
    expect(typeof POST).toBe('function')
  })

  describe('File Validation', () => {
    it('should reject request with no file', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      const req = await createRequestWithFile(null)
      const response = await POST(req)
      const data = await response.json()

      expect(data.error).toContain('No photo file provided')
    })

    it('should reject invalid file types', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      const invalidTypes = [
        'application/pdf',
        'text/plain',
        'video/mp4',
        'application/octet-stream',
      ]

      for (const type of invalidTypes) {
        vi.clearAllMocks()
        const file = createMockFile('test.pdf', type, 1024)
        const req = await createRequestWithFile(file)
        const response = await POST(req)
        const data = await response.json()

        expect(data.error).toContain('Invalid file type')
      }
    })

    it('should accept valid image types', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

      for (const type of validTypes) {
        vi.clearAllMocks()
        mockPut.mockResolvedValue({
          url: 'https://blob.vercel-storage.com/profiles/test.jpg',
        })
        ;(prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: mockUserId,
          name: 'Test User',
          image: null,
          profilePhoto: 'https://blob.vercel-storage.com/profiles/test.jpg',
          matchProfile: null,
        })

        const file = createMockFile('test.jpg', type, 1024)
        const req = await createRequestWithFile(file)
        const response = await POST(req)
        const data = await response.json()

        expect(data.ok).toBe(true)
      }
    })

    it('should reject files larger than 5MB', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      const largeFile = createMockFile('large.jpg', 'image/jpeg', 6 * 1024 * 1024)
      const req = await createRequestWithFile(largeFile)
      const response = await POST(req)
      const data = await response.json()

      expect(data.error).toContain('File too large')
    })

    it('should accept files at exactly 5MB', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      mockPut.mockResolvedValue({
        url: 'https://blob.vercel-storage.com/profiles/max.jpg',
      })
      ;(prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        name: 'Test User',
        profilePhoto: 'https://blob.vercel-storage.com/profiles/max.jpg',
        matchProfile: null,
      })

      const maxFile = createMockFile('max.jpg', 'image/jpeg', 5 * 1024 * 1024)
      const req = await createRequestWithFile(maxFile)
      const response = await POST(req)
      const data = await response.json()

      expect(data.ok).toBe(true)
    })
  })

  describe('File Upload Process', () => {
    it('should upload file to Vercel Blob', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      mockPut.mockResolvedValue({
        url: 'https://blob.vercel-storage.com/profiles/test.jpg',
      })
      ;(prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        profilePhoto: 'https://blob.vercel-storage.com/profiles/test.jpg',
        matchProfile: null,
      })

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      await POST(req)

      expect(mockPut).toHaveBeenCalledWith(
        expect.stringContaining(`profiles/${mockUserId}_`),
        expect.any(File),
        expect.objectContaining({ access: 'public' })
      )
    })

    it('should generate unique filename with userId and timestamp', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      mockPut.mockResolvedValue({
        url: 'https://blob.vercel-storage.com/profiles/test.jpg',
      })
      ;(prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        profilePhoto: 'https://blob.vercel-storage.com/profiles/test.jpg',
        matchProfile: null,
      })

      const file = createMockFile('photo.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      await POST(req)

      const putCall = mockPut.mock.calls[0]
      const filename = putCall[0]

      expect(filename).toContain(mockUserId)
      expect(filename).toMatch(/\d+\.jpg$/)
    })

    it('should preserve file extension', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      const extensions = ['jpg', 'png', 'webp']

      for (const ext of extensions) {
        vi.clearAllMocks()
        mockPut.mockResolvedValue({
          url: `https://blob.vercel-storage.com/profiles/test.${ext}`,
        })
        ;(prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: mockUserId,
          profilePhoto: `https://blob.vercel-storage.com/profiles/test.${ext}`,
          matchProfile: null,
        })

        const file = createMockFile(`photo.${ext}`, `image/${ext}`, 1024)
        const req = await createRequestWithFile(file)
        await POST(req)

        const putCall = mockPut.mock.calls[0]
        const filename = putCall[0]
        expect(filename).toMatch(new RegExp(`\\.${ext}$`))
      }
    })
  })

  describe('Database Operations', () => {
    it('should update user profile with photo URL', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      const blobUrl = 'https://blob.vercel-storage.com/profiles/test.jpg'
      mockPut.mockResolvedValue({ url: blobUrl })

      const mockUser = {
        id: mockUserId,
        name: 'Test User',
        image: null,
        profilePhoto: blobUrl,
        matchProfile: null,
      }
      ;(prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      const response = await POST(req)
      const data = await response.json()

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUserId },
          data: { profilePhoto: blobUrl },
        })
      )
      expect(data.ok).toBe(true)
    })

    it('should sync with MatchProfile if exists', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      const blobUrl = 'https://blob.vercel-storage.com/profiles/new.jpg'
      mockPut.mockResolvedValue({ url: blobUrl })

      const mockUser = {
        id: mockUserId,
        name: 'Test User',
        profilePhoto: blobUrl,
        matchProfile: {
          id: 'match-123',
          photos: ['/old1.jpg', '/old2.jpg'],
        },
      }
      ;(prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
      ;(prisma.matchProfile.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      await POST(req)

      expect(prisma.matchProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId },
          data: {
            photos: expect.arrayContaining([blobUrl]),
          },
        })
      )
    })

    it('should limit MatchProfile photos to 6', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      const blobUrl = 'https://blob.vercel-storage.com/profiles/new.jpg'
      mockPut.mockResolvedValue({ url: blobUrl })

      const mockUser = {
        id: mockUserId,
        profilePhoto: blobUrl,
        matchProfile: {
          id: 'match-123',
          photos: ['/1.jpg', '/2.jpg', '/3.jpg', '/4.jpg', '/5.jpg', '/6.jpg'],
        },
      }
      ;(prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
      ;(prisma.matchProfile.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      await POST(req)

      const updateCall = (prisma.matchProfile.update as ReturnType<typeof vi.fn>).mock.calls[0]
      const photos = updateCall[0].data.photos
      expect(photos.length).toBeLessThanOrEqual(6)
    })

    it('should not duplicate photos in MatchProfile', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      const blobUrl = 'https://blob.vercel-storage.com/profiles/existing.jpg'
      mockPut.mockResolvedValue({ url: blobUrl })

      const mockUser = {
        id: mockUserId,
        profilePhoto: blobUrl,
        matchProfile: {
          id: 'match-123',
          photos: [blobUrl, '/other.jpg'],
        },
      }
      ;(prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      await POST(req)

      // Should not update MatchProfile if photo already exists
      expect(prisma.matchProfile.update).not.toHaveBeenCalled()
    })

    it('should handle non-array photos in MatchProfile', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      const blobUrl = 'https://blob.vercel-storage.com/profiles/new.jpg'
      mockPut.mockResolvedValue({ url: blobUrl })

      const mockUser = {
        id: mockUserId,
        profilePhoto: blobUrl,
        matchProfile: {
          id: 'match-123',
          photos: null, // Non-array case
        },
      }
      ;(prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
      ;(prisma.matchProfile.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      await POST(req)

      const updateCall = (prisma.matchProfile.update as ReturnType<typeof vi.fn>).mock.calls[0]
      const photos = updateCall[0].data.photos
      expect(Array.isArray(photos)).toBe(true)
      expect(photos.length).toBe(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      const blobUrl = 'https://blob.vercel-storage.com/profiles/test.jpg'
      mockPut.mockResolvedValue({ url: blobUrl })
      ;(prisma.user.update as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database connection failed')
      )

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      const response = await POST(req)
      const data = await response.json()

      expect(data.error).toContain('Failed to upload photo')
    })

    it('should clean up blob on database error', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      const blobUrl = 'https://blob.vercel-storage.com/profiles/test.jpg'
      mockPut.mockResolvedValue({ url: blobUrl })
      ;(prisma.user.update as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database error')
      )

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      await POST(req)

      expect(mockDel).toHaveBeenCalledWith(blobUrl)
    })

    it('should handle blob upload errors', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      mockPut.mockRejectedValue(new Error('Blob storage unavailable'))

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      const response = await POST(req)
      const data = await response.json()

      expect(data.error).toContain('Failed to upload photo')
    })
  })

  describe('Security', () => {
    it('should include userId in blob filename for access control', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      mockPut.mockResolvedValue({
        url: 'https://blob.vercel-storage.com/profiles/test.jpg',
      })
      ;(prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        profilePhoto: 'https://blob.vercel-storage.com/profiles/test.jpg',
        matchProfile: null,
      })

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      await POST(req)

      const putCall = mockPut.mock.calls[0]
      const filename = putCall[0]
      expect(filename).toContain(mockUserId)
    })

    it('should only allow authenticated users (via middleware guard)', async () => {
      // createAuthenticatedGuard is called at module evaluation time.
      // Re-import with fresh module to capture the guard call.
      vi.resetModules()
      const { createAuthenticatedGuard } = await import('@/lib/api/middleware')
      await import('@/app/api/user/upload-photo/route')
      expect(createAuthenticatedGuard).toHaveBeenCalledWith(
        expect.objectContaining({ route: 'user/upload-photo' })
      )
    })
  })

  describe('Response Format', () => {
    it('should return correct success response structure', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      const blobUrl = 'https://blob.vercel-storage.com/profiles/test_123.jpg'
      mockPut.mockResolvedValue({ url: blobUrl })

      const mockUser = {
        id: mockUserId,
        name: 'Test User',
        image: null,
        profilePhoto: blobUrl,
        matchProfile: null,
      }
      ;(prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)

      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const req = await createRequestWithFile(file)
      const response = await POST(req)
      const data = await response.json()

      expect(data).toHaveProperty('ok', true)
      expect(data).toHaveProperty('photoUrl')
      expect(data).toHaveProperty('user')
      expect(data.user).toHaveProperty('id', mockUserId)
      expect(data.user).toHaveProperty('profilePhoto')
    })

    it('should return proper error response structure', async () => {
      const { POST } = await import('@/app/api/user/upload-photo/route')
      const file = createMockFile('test.txt', 'text/plain', 1024)
      const req = await createRequestWithFile(file)
      const response = await POST(req)
      const data = await response.json()

      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code')
    })
  })
})
