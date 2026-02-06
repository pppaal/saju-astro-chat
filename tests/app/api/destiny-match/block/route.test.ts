import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock withApiMiddleware before importing the route
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any, ...args: any[]) => {
      const context = {
        userId: args[0]?.userId || 'test-user-id',
        session: { user: { id: args[0]?.userId || 'test-user-id' } },
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
        isPremium: false,
      }
      const result = await handler(req, context)
      if (result instanceof Response) return result
      return NextResponse.json(result, { status: 200 })
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
}))

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock authOptions
vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

// Mock rate limiting
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 29 }),
}))

// Mock request-ip
vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

// Mock CSRF
vi.mock('@/lib/security/csrf', () => ({
  csrfGuard: vi.fn().mockReturnValue(null),
}))

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    userBlock: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    matchProfile: {
      findUnique: vi.fn(),
    },
    matchConnection: {
      updateMany: vi.fn(),
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

// Mock HTTP_STATUS
vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
  },
}))

// Mock zodValidation - use actual schema behavior simulation
const mockSafeParseSuccess = (data: any) => ({
  success: true,
  data,
})

const mockSafeParseError = (errors: Array<{ path: string[]; message: string }>) => ({
  success: false,
  error: {
    issues: errors,
  },
})

const mockPickedSchema = {
  safeParse: vi.fn(),
}

vi.mock('@/lib/api/zodValidation', () => ({
  destinyMatchBlockSchema: {
    safeParse: vi.fn(),
    pick: vi.fn(() => mockPickedSchema),
  },
}))

import { POST, DELETE } from '@/app/api/destiny-match/block/route'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { destinyMatchBlockSchema } from '@/lib/api/zodValidation'

describe('Destiny Match Block API - POST (Block User)', () => {
  const mockUserId = 'test-user-id'
  const mockBlockedUserId = 'blocked-user-id'

  const mockMyProfile = {
    id: 'my-profile-id',
    userId: mockUserId,
  }

  const mockBlockedProfile = {
    id: 'blocked-profile-id',
    userId: mockBlockedUserId,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Validation', () => {
    it('should return 400 when validation fails - missing blockedUserId', async () => {
      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseError([
          { path: ['blockedUserId'], message: 'Required' },
        ])
      )

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
      expect(data.details).toEqual([
        { path: 'blockedUserId', message: 'Required' },
      ])
    })

    it('should return 400 when validation fails - blockedUserId too long', async () => {
      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseError([
          { path: ['blockedUserId'], message: 'String must contain at most 200 character(s)' },
        ])
      )

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({ blockedUserId: 'a'.repeat(201) }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
      expect(logger.warn).toHaveBeenCalledWith(
        '[Destiny match block] validation failed',
        expect.any(Object)
      )
    })

    it('should return 400 when validation fails - reason too long', async () => {
      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseError([
          { path: ['reason'], message: 'String must contain at most 500 character(s)' },
        ])
      )

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({ blockedUserId: mockBlockedUserId, reason: 'a'.repeat(501) }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })
  })

  describe('Self-Blocking Prevention', () => {
    it('should return 400 when trying to block self', async () => {
      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseSuccess({ blockedUserId: mockUserId })
      )

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({ blockedUserId: mockUserId }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('자기 자신을 차단할 수 없습니다')
    })
  })

  describe('Idempotent Blocking', () => {
    it('should return success with message when user already blocked (idempotent)', async () => {
      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseSuccess({ blockedUserId: mockBlockedUserId })
      )

      vi.mocked(prisma.userBlock.findUnique).mockResolvedValue({
        id: 'existing-block-id',
        blockerId: mockUserId,
        blockedId: mockBlockedUserId,
        reason: null,
        createdAt: new Date(),
      } as any)

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({ blockedUserId: mockBlockedUserId }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('이미 차단된 사용자입니다')
      // Should not create new block
      expect(prisma.userBlock.create).not.toHaveBeenCalled()
    })
  })

  describe('Successful Blocking', () => {
    it('should create block and update matchConnection status when both profiles exist', async () => {
      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseSuccess({ blockedUserId: mockBlockedUserId })
      )

      vi.mocked(prisma.userBlock.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.userBlock.create).mockResolvedValue({
        id: 'new-block-id',
        blockerId: mockUserId,
        blockedId: mockBlockedUserId,
        reason: null,
        createdAt: new Date(),
      } as any)

      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockBlockedProfile as any)

      vi.mocked(prisma.matchConnection.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({ blockedUserId: mockBlockedUserId }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify block was created
      expect(prisma.userBlock.create).toHaveBeenCalledWith({
        data: {
          blockerId: mockUserId,
          blockedId: mockBlockedUserId,
          reason: null,
        },
      })

      // Verify matchConnection was updated
      expect(prisma.matchConnection.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { user1Id: mockMyProfile.id, user2Id: mockBlockedProfile.id },
            { user1Id: mockBlockedProfile.id, user2Id: mockMyProfile.id },
          ],
          status: 'active',
        },
        data: { status: 'blocked' },
      })

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith(
        '[destiny-match/block] User blocked',
        expect.objectContaining({
          blockerId: mockUserId,
          blockedId: mockBlockedUserId,
        })
      )
    })

    it('should create block without updating matchConnection when my profile does not exist', async () => {
      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseSuccess({ blockedUserId: mockBlockedUserId })
      )

      vi.mocked(prisma.userBlock.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.userBlock.create).mockResolvedValue({
        id: 'new-block-id',
        blockerId: mockUserId,
        blockedId: mockBlockedUserId,
        reason: null,
        createdAt: new Date(),
      } as any)

      // My profile is null
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockBlockedProfile as any)

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({ blockedUserId: mockBlockedUserId }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify block was created
      expect(prisma.userBlock.create).toHaveBeenCalled()

      // Verify matchConnection was NOT updated
      expect(prisma.matchConnection.updateMany).not.toHaveBeenCalled()
    })

    it('should create block without updating matchConnection when blocked profile does not exist', async () => {
      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseSuccess({ blockedUserId: mockBlockedUserId })
      )

      vi.mocked(prisma.userBlock.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.userBlock.create).mockResolvedValue({
        id: 'new-block-id',
        blockerId: mockUserId,
        blockedId: mockBlockedUserId,
        reason: null,
        createdAt: new Date(),
      } as any)

      // Blocked profile is null
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({ blockedUserId: mockBlockedUserId }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify block was created
      expect(prisma.userBlock.create).toHaveBeenCalled()

      // Verify matchConnection was NOT updated
      expect(prisma.matchConnection.updateMany).not.toHaveBeenCalled()
    })

    it('should create block without updating matchConnection when neither profile exists', async () => {
      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseSuccess({ blockedUserId: mockBlockedUserId })
      )

      vi.mocked(prisma.userBlock.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.userBlock.create).mockResolvedValue({
        id: 'new-block-id',
        blockerId: mockUserId,
        blockedId: mockBlockedUserId,
        reason: null,
        createdAt: new Date(),
      } as any)

      // Neither profile exists
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({ blockedUserId: mockBlockedUserId }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify block was created
      expect(prisma.userBlock.create).toHaveBeenCalled()

      // Verify matchConnection was NOT updated
      expect(prisma.matchConnection.updateMany).not.toHaveBeenCalled()
    })

    it('should include reason when provided', async () => {
      const blockReason = 'Inappropriate behavior'

      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseSuccess({ blockedUserId: mockBlockedUserId, reason: blockReason })
      )

      vi.mocked(prisma.userBlock.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.userBlock.create).mockResolvedValue({
        id: 'new-block-id',
        blockerId: mockUserId,
        blockedId: mockBlockedUserId,
        reason: blockReason,
        createdAt: new Date(),
      } as any)

      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockBlockedProfile as any)

      vi.mocked(prisma.matchConnection.updateMany).mockResolvedValue({ count: 0 })

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({ blockedUserId: mockBlockedUserId, reason: blockReason }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify block was created with reason
      expect(prisma.userBlock.create).toHaveBeenCalledWith({
        data: {
          blockerId: mockUserId,
          blockedId: mockBlockedUserId,
          reason: blockReason,
        },
      })
    })

    it('should store null reason when reason is undefined', async () => {
      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseSuccess({ blockedUserId: mockBlockedUserId, reason: undefined })
      )

      vi.mocked(prisma.userBlock.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.userBlock.create).mockResolvedValue({
        id: 'new-block-id',
        blockerId: mockUserId,
        blockedId: mockBlockedUserId,
        reason: null,
        createdAt: new Date(),
      } as any)

      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({ blockedUserId: mockBlockedUserId }),
      })

      await POST(request, { userId: mockUserId })

      // Verify block was created with null reason
      expect(prisma.userBlock.create).toHaveBeenCalledWith({
        data: {
          blockerId: mockUserId,
          blockedId: mockBlockedUserId,
          reason: null,
        },
      })
    })
  })

  describe('Database Query Verification', () => {
    it('should query userBlock with correct composite key', async () => {
      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseSuccess({ blockedUserId: mockBlockedUserId })
      )

      vi.mocked(prisma.userBlock.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.userBlock.create).mockResolvedValue({
        id: 'new-block-id',
        blockerId: mockUserId,
        blockedId: mockBlockedUserId,
        reason: null,
        createdAt: new Date(),
      } as any)

      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({ blockedUserId: mockBlockedUserId }),
      })

      await POST(request, { userId: mockUserId })

      expect(prisma.userBlock.findUnique).toHaveBeenCalledWith({
        where: {
          blockerId_blockedId: { blockerId: mockUserId, blockedId: mockBlockedUserId },
        },
      })
    })

    it('should query matchProfile with correct userId values', async () => {
      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseSuccess({ blockedUserId: mockBlockedUserId })
      )

      vi.mocked(prisma.userBlock.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.userBlock.create).mockResolvedValue({
        id: 'new-block-id',
        blockerId: mockUserId,
        blockedId: mockBlockedUserId,
        reason: null,
        createdAt: new Date(),
      } as any)

      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockBlockedProfile as any)

      vi.mocked(prisma.matchConnection.updateMany).mockResolvedValue({ count: 0 })

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({ blockedUserId: mockBlockedUserId }),
      })

      await POST(request, { userId: mockUserId })

      // Verify both matchProfile queries
      expect(prisma.matchProfile.findUnique).toHaveBeenNthCalledWith(1, {
        where: { userId: mockUserId },
      })
      expect(prisma.matchProfile.findUnique).toHaveBeenNthCalledWith(2, {
        where: { userId: mockBlockedUserId },
      })
    })
  })
})

describe('Destiny Match Block API - DELETE (Unblock User)', () => {
  const mockUserId = 'test-user-id'
  const mockBlockedUserId = 'blocked-user-id'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Validation', () => {
    it('should return 400 when validation fails - missing blockedUserId', async () => {
      mockPickedSchema.safeParse.mockReturnValue(
        mockSafeParseError([
          { path: ['blockedUserId'], message: 'Required' },
        ])
      )

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'DELETE',
        body: JSON.stringify({}),
      })

      const response = await DELETE(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
      expect(data.details).toEqual([
        { path: 'blockedUserId', message: 'Required' },
      ])
    })

    it('should return 400 when validation fails - invalid blockedUserId format', async () => {
      mockPickedSchema.safeParse.mockReturnValue(
        mockSafeParseError([
          { path: ['blockedUserId'], message: 'String must contain at least 1 character(s)' },
        ])
      )

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'DELETE',
        body: JSON.stringify({ blockedUserId: '' }),
      })

      const response = await DELETE(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })
  })

  describe('Successful Unblocking', () => {
    it('should successfully unblock user', async () => {
      mockPickedSchema.safeParse.mockReturnValue(
        mockSafeParseSuccess({ blockedUserId: mockBlockedUserId })
      )

      vi.mocked(prisma.userBlock.deleteMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'DELETE',
        body: JSON.stringify({ blockedUserId: mockBlockedUserId }),
      })

      const response = await DELETE(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify deleteMany was called with correct parameters
      expect(prisma.userBlock.deleteMany).toHaveBeenCalledWith({
        where: {
          blockerId: mockUserId,
          blockedId: mockBlockedUserId,
        },
      })

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith(
        '[destiny-match/block] User unblocked',
        expect.objectContaining({
          blockerId: mockUserId,
          blockedId: mockBlockedUserId,
        })
      )
    })

    it('should return success even when no block existed (idempotent)', async () => {
      mockPickedSchema.safeParse.mockReturnValue(
        mockSafeParseSuccess({ blockedUserId: mockBlockedUserId })
      )

      // deleteMany returns count: 0 when no records deleted
      vi.mocked(prisma.userBlock.deleteMany).mockResolvedValue({ count: 0 })

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'DELETE',
        body: JSON.stringify({ blockedUserId: mockBlockedUserId }),
      })

      const response = await DELETE(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should use pick schema with only blockedUserId', async () => {
      mockPickedSchema.safeParse.mockReturnValue(
        mockSafeParseSuccess({ blockedUserId: mockBlockedUserId })
      )

      vi.mocked(prisma.userBlock.deleteMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'DELETE',
        body: JSON.stringify({ blockedUserId: mockBlockedUserId }),
      })

      await DELETE(request, { userId: mockUserId })

      // Verify pick was called with blockedUserId only
      expect(destinyMatchBlockSchema.pick).toHaveBeenCalledWith({ blockedUserId: true })
    })
  })
})

describe('Destiny Match Block API - Edge Cases', () => {
  const mockUserId = 'test-user-id'
  const mockBlockedUserId = 'blocked-user-id'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST - Multiple validation errors', () => {
    it('should return all validation errors', async () => {
      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseError([
          { path: ['blockedUserId'], message: 'Required' },
          { path: ['reason'], message: 'String must contain at most 500 character(s)' },
        ])
      )

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({ reason: 'a'.repeat(501) }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toHaveLength(2)
      expect(data.details).toEqual([
        { path: 'blockedUserId', message: 'Required' },
        { path: 'reason', message: 'String must contain at most 500 character(s)' },
      ])
    })
  })

  describe('POST - Connection update edge cases', () => {
    it('should handle matchConnection update when no active connections exist', async () => {
      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseSuccess({ blockedUserId: mockBlockedUserId })
      )

      vi.mocked(prisma.userBlock.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.userBlock.create).mockResolvedValue({
        id: 'new-block-id',
        blockerId: mockUserId,
        blockedId: mockBlockedUserId,
        reason: null,
        createdAt: new Date(),
      } as any)

      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce({ id: 'my-profile-id', userId: mockUserId } as any)
        .mockResolvedValueOnce({ id: 'blocked-profile-id', userId: mockBlockedUserId } as any)

      // No connections were updated
      vi.mocked(prisma.matchConnection.updateMany).mockResolvedValue({ count: 0 })

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({ blockedUserId: mockBlockedUserId }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should update multiple connections when multiple exist', async () => {
      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseSuccess({ blockedUserId: mockBlockedUserId })
      )

      vi.mocked(prisma.userBlock.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.userBlock.create).mockResolvedValue({
        id: 'new-block-id',
        blockerId: mockUserId,
        blockedId: mockBlockedUserId,
        reason: null,
        createdAt: new Date(),
      } as any)

      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce({ id: 'my-profile-id', userId: mockUserId } as any)
        .mockResolvedValueOnce({ id: 'blocked-profile-id', userId: mockBlockedUserId } as any)

      // Multiple connections updated
      vi.mocked(prisma.matchConnection.updateMany).mockResolvedValue({ count: 2 })

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({ blockedUserId: mockBlockedUserId }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Request context handling', () => {
    it('should use correct userId from context for POST', async () => {
      const customUserId = 'custom-user-123'
      const customBlockedUserId = 'blocked-user-456'

      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseSuccess({ blockedUserId: customBlockedUserId })
      )

      vi.mocked(prisma.userBlock.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.userBlock.create).mockResolvedValue({
        id: 'new-block-id',
        blockerId: customUserId,
        blockedId: customBlockedUserId,
        reason: null,
        createdAt: new Date(),
      } as any)

      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({ blockedUserId: customBlockedUserId }),
      })

      await POST(request, { userId: customUserId })

      expect(prisma.userBlock.create).toHaveBeenCalledWith({
        data: {
          blockerId: customUserId,
          blockedId: customBlockedUserId,
          reason: null,
        },
      })
    })

    it('should use correct userId from context for DELETE', async () => {
      const customUserId = 'custom-user-123'
      const customBlockedUserId = 'blocked-user-456'

      mockPickedSchema.safeParse.mockReturnValue(
        mockSafeParseSuccess({ blockedUserId: customBlockedUserId })
      )

      vi.mocked(prisma.userBlock.deleteMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'DELETE',
        body: JSON.stringify({ blockedUserId: customBlockedUserId }),
      })

      await DELETE(request, { userId: customUserId })

      expect(prisma.userBlock.deleteMany).toHaveBeenCalledWith({
        where: {
          blockerId: customUserId,
          blockedId: customBlockedUserId,
        },
      })
    })
  })

  describe('POST - Nested path handling in validation errors', () => {
    it('should handle deeply nested validation error paths', async () => {
      vi.mocked(destinyMatchBlockSchema.safeParse).mockReturnValue(
        mockSafeParseError([
          { path: ['nested', 'deeply', 'field'], message: 'Invalid value' },
        ])
      )

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'POST',
        body: JSON.stringify({ blockedUserId: mockBlockedUserId }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toEqual([
        { path: 'nested.deeply.field', message: 'Invalid value' },
      ])
    })
  })

  describe('DELETE - Nested path handling in validation errors', () => {
    it('should handle nested validation error paths', async () => {
      mockPickedSchema.safeParse.mockReturnValue(
        mockSafeParseError([
          { path: ['some', 'nested', 'path'], message: 'Invalid' },
        ])
      )

      const request = new NextRequest('http://localhost/api/destiny-match/block', {
        method: 'DELETE',
        body: JSON.stringify({}),
      })

      const response = await DELETE(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toEqual([
        { path: 'some.nested.path', message: 'Invalid' },
      ])
    })
  })
})
