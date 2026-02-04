import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Mocks - must be before route import
// ============================================================

// Mock middleware as passthrough that injects auth context
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any, ...args: any[]) => {
      const { getServerSession } = await import('next-auth')
      let session: any = null
      try {
        session = await (getServerSession as any)()
      } catch {
        return NextResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' } },
          { status: 500 }
        )
      }

      if (!session?.user) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'not_authenticated' } },
          { status: 401 }
        )
      }

      const context = {
        userId: session.user.id,
        session,
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
        isPremium: false,
      }

      const result = await handler(req, context, ...args)

      if (result instanceof Response) {
        return result
      }

      if (result.error) {
        const statusMap: Record<string, number> = {
          BAD_REQUEST: 400,
          VALIDATION_ERROR: 422,
          FORBIDDEN: 403,
          NOT_FOUND: 404,
          DATABASE_ERROR: 500,
          INTERNAL_ERROR: 500,
        }
        return NextResponse.json(
          { success: false, error: { code: result.error.code, message: result.error.message } },
          { status: statusMap[result.error.code] || 500 }
        )
      }

      return NextResponse.json(
        { success: true, data: result.data },
        { status: result.status || 200 }
      )
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: any, options?: any) => ({
    data,
    status: options?.status,
    meta: options?.meta,
  })),
  apiError: vi.fn((code: string, message?: string, details?: any) => ({
    error: { code, message, details },
  })),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    DATABASE_ERROR: 'DATABASE_ERROR',
  },
}))

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
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

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    matchConnection: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    matchMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    userBlock: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Mock push notifications
vi.mock('@/lib/notifications/pushService', () => ({
  sendPushNotification: vi.fn().mockResolvedValue({ success: true, sent: 1, failed: 0 }),
}))

// Mock sanitizers
vi.mock('@/lib/api/sanitizers', () => ({
  sanitizeHtml: vi.fn((content: string, _maxLen?: number) => content),
}))

// Mock Zod validation schemas
vi.mock('@/lib/api/zodValidation', () => ({
  destinyMatchChatSchema: {
    safeParse: vi.fn((data: any) => {
      if (!data || typeof data !== 'object') {
        return { success: false, error: { issues: [{ message: 'Expected object' }] } }
      }
      if (
        !data.connectionId ||
        typeof data.connectionId !== 'string' ||
        data.connectionId.trim().length === 0
      ) {
        return { success: false, error: { issues: [{ message: 'connectionId is required' }] } }
      }
      if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
        return { success: false, error: { issues: [{ message: 'content is required' }] } }
      }
      if (data.content.length > 2000) {
        return { success: false, error: { issues: [{ message: 'content too long' }] } }
      }
      return {
        success: true,
        data: {
          connectionId: data.connectionId.trim(),
          content: data.content.trim(),
          messageType: data.messageType || 'text',
        },
      }
    }),
  },
  destinyMatchChatGetQuerySchema: {
    safeParse: vi.fn((data: any) => {
      if (
        !data?.connectionId ||
        typeof data.connectionId !== 'string' ||
        data.connectionId.trim().length === 0
      ) {
        return { success: false, error: { issues: [{ message: 'connectionId is required' }] } }
      }
      return {
        success: true,
        data: {
          connectionId: data.connectionId,
          cursor: data.cursor || undefined,
          limit: data.limit ? Number(data.limit) : 50,
        },
      }
    }),
  },
}))

// Mock rate limiting (used by middleware internals)
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9 }),
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('@/lib/security/csrf', () => ({
  csrfGuard: vi.fn().mockReturnValue(null),
}))

vi.mock('@/lib/credits', () => ({
  checkAndConsumeCredits: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}))

vi.mock('@/lib/credits/creditRefund', () => ({
  refundCredits: vi.fn(),
}))

// ============================================================
// Import route AFTER all mocks
// ============================================================
import { GET, POST, DELETE } from '@/app/api/destiny-match/chat/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { sendPushNotification } from '@/lib/notifications/pushService'

// ============================================================
// Helpers
// ============================================================
const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  expires: '2025-12-31',
}

const mockConnection = {
  id: 'conn-1',
  status: 'active',
  chatStarted: false,
  lastInteractionAt: null,
  user1Profile: { userId: 'user-123', displayName: 'User 1' },
  user2Profile: { userId: 'user-456', displayName: 'User 2' },
}

function createGetRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/destiny-match/chat')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url.toString(), { method: 'GET' })
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/destiny-match/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createDeleteRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/destiny-match/chat', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ============================================================
// Tests: GET
// ============================================================
describe('Destiny Match Chat API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
  })

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const req = createGetRequest({ connectionId: 'conn-1' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('Input Validation', () => {
    it('should return error when connectionId is missing', async () => {
      const req = createGetRequest({})
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Authorization', () => {
    it('should return NOT_FOUND when connection does not exist', async () => {
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(null)

      const req = createGetRequest({ connectionId: 'nonexistent' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should return FORBIDDEN when user is not part of connection', async () => {
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue({
        ...mockConnection,
        user1Profile: { userId: 'other-user-1' },
        user2Profile: { userId: 'other-user-2' },
      } as any)

      const req = createGetRequest({ connectionId: 'conn-1' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })
  })

  describe('Successful Retrieval', () => {
    it('should return messages for user1', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          connectionId: 'conn-1',
          senderId: 'user-123',
          content: 'Hello!',
          createdAt: new Date(),
          sender: { id: 'user-123', name: 'User 1', image: null },
        },
        {
          id: 'msg-2',
          connectionId: 'conn-1',
          senderId: 'user-456',
          content: 'Hi there!',
          createdAt: new Date(),
          sender: { id: 'user-456', name: 'User 2', image: null },
        },
      ]

      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnection as any)
      vi.mocked(prisma.matchMessage.findMany).mockResolvedValue(mockMessages as any)
      vi.mocked(prisma.matchMessage.updateMany).mockResolvedValue({ count: 1 } as any)

      const req = createGetRequest({ connectionId: 'conn-1' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.messages).toHaveLength(2)
      expect(data.data.hasMore).toBe(false)
    })

    it('should return messages for user2', async () => {
      const sessionUser2 = { user: { id: 'user-456', name: 'User 2' }, expires: '2025-12-31' }
      vi.mocked(getServerSession).mockResolvedValue(sessionUser2 as any)

      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnection as any)
      vi.mocked(prisma.matchMessage.findMany).mockResolvedValue([])
      vi.mocked(prisma.matchMessage.updateMany).mockResolvedValue({ count: 0 } as any)

      const req = createGetRequest({ connectionId: 'conn-1' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.messages).toHaveLength(0)
    })

    it('should indicate hasMore when there are more messages', async () => {
      // Create limit+1 messages (default limit = 50, so 51)
      const manyMessages = Array.from({ length: 51 }, (_, i) => ({
        id: `msg-${i}`,
        connectionId: 'conn-1',
        senderId: 'user-123',
        content: `Message ${i}`,
        createdAt: new Date(),
        sender: { id: 'user-123', name: 'User 1', image: null },
      }))

      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnection as any)
      vi.mocked(prisma.matchMessage.findMany).mockResolvedValue(manyMessages as any)
      vi.mocked(prisma.matchMessage.updateMany).mockResolvedValue({ count: 0 } as any)

      const req = createGetRequest({ connectionId: 'conn-1' })
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.hasMore).toBe(true)
      expect(data.data.messages).toHaveLength(50)
      expect(data.data.nextCursor).toBeDefined()
    })

    it('should mark unread messages as read', async () => {
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnection as any)
      vi.mocked(prisma.matchMessage.findMany).mockResolvedValue([])
      vi.mocked(prisma.matchMessage.updateMany).mockResolvedValue({ count: 3 } as any)

      const req = createGetRequest({ connectionId: 'conn-1' })
      await GET(req)

      expect(prisma.matchMessage.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            connectionId: 'conn-1',
            senderId: { not: 'user-123' },
            isRead: false,
          }),
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should return DATABASE_ERROR on prisma failure', async () => {
      vi.mocked(prisma.matchConnection.findUnique).mockRejectedValue(
        new Error('Database connection failed')
      )

      const req = createGetRequest({ connectionId: 'conn-1' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
    })
  })
})

// ============================================================
// Tests: POST
// ============================================================
describe('Destiny Match Chat API - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
  })

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const req = createPostRequest({ connectionId: 'conn-1', content: 'Hello' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
    })
  })

  describe('Input Validation', () => {
    it('should return error when connectionId is missing', async () => {
      const req = createPostRequest({ content: 'Hello' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
    })

    it('should return error when content is missing', async () => {
      const req = createPostRequest({ connectionId: 'conn-1' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
    })

    it('should return error when content is empty string', async () => {
      const req = createPostRequest({ connectionId: 'conn-1', content: '' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
    })

    it('should return error when content exceeds 2000 characters', async () => {
      const longContent = 'a'.repeat(2001)
      const req = createPostRequest({ connectionId: 'conn-1', content: longContent })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
    })
  })

  describe('Authorization', () => {
    it('should return NOT_FOUND when connection does not exist', async () => {
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(null)

      const req = createPostRequest({ connectionId: 'nonexistent', content: 'Hello' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(404)
    })

    it('should return FORBIDDEN when user is not part of connection', async () => {
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue({
        ...mockConnection,
        user1Profile: { userId: 'other-1' },
        user2Profile: { userId: 'other-2' },
      } as any)

      const req = createPostRequest({ connectionId: 'conn-1', content: 'Hello' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(403)
    })

    it('should return BAD_REQUEST for blocked connection', async () => {
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue({
        ...mockConnection,
        status: 'blocked',
      } as any)

      const req = createPostRequest({ connectionId: 'conn-1', content: 'Hello' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should return BAD_REQUEST for expired connection', async () => {
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue({
        ...mockConnection,
        status: 'expired',
      } as any)

      const req = createPostRequest({ connectionId: 'conn-1', content: 'Hello' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should return BAD_REQUEST for unmatched connection', async () => {
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue({
        ...mockConnection,
        status: 'unmatched',
      } as any)

      const req = createPostRequest({ connectionId: 'conn-1', content: 'Hello' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should return FORBIDDEN when users have blocked each other', async () => {
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnection as any)
      vi.mocked(prisma.userBlock.findFirst).mockResolvedValue({
        id: 'block-1',
        blockerId: 'user-123',
        blockedId: 'user-456',
      } as any)

      const req = createPostRequest({ connectionId: 'conn-1', content: 'Hello' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(403)
    })
  })

  describe('Successful Message Sending', () => {
    const mockCreatedMessage = {
      id: 'msg-new',
      connectionId: 'conn-1',
      senderId: 'user-123',
      content: 'Hello!',
      messageType: 'text',
      createdAt: new Date(),
      sender: { id: 'user-123', name: 'Test User', image: null },
    }

    beforeEach(() => {
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnection as any)
      vi.mocked(prisma.userBlock.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.$transaction).mockResolvedValue([mockCreatedMessage, {}])
    })

    it('should create message and update connection', async () => {
      const req = createPostRequest({ connectionId: 'conn-1', content: 'Hello!' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.message).toBeDefined()
      expect(data.data.message.id).toBe('msg-new')
    })

    it('should send push notification to the recipient', async () => {
      const req = createPostRequest({ connectionId: 'conn-1', content: 'Hello!' })
      await POST(req)

      expect(sendPushNotification).toHaveBeenCalledWith(
        'user-456',
        expect.objectContaining({
          title: expect.stringContaining('Test User'),
          message: 'Hello!',
        })
      )
    })

    it('should truncate long messages in push notification', async () => {
      const longContent = 'A'.repeat(80)
      vi.mocked(prisma.$transaction).mockResolvedValue([
        { ...mockCreatedMessage, content: longContent },
        {},
      ])

      const req = createPostRequest({ connectionId: 'conn-1', content: longContent })
      await POST(req)

      expect(sendPushNotification).toHaveBeenCalledWith(
        'user-456',
        expect.objectContaining({
          message: expect.stringContaining('...'),
        })
      )
    })

    it('should handle push notification failure gracefully', async () => {
      vi.mocked(sendPushNotification).mockRejectedValue(new Error('Push service down'))

      const req = createPostRequest({ connectionId: 'conn-1', content: 'Hello!' })
      const response = await POST(req)

      // Should still succeed despite push failure
      expect(response.status).toBe(200)
    })

    it('should allow user2 to send messages', async () => {
      const session2 = { user: { id: 'user-456', name: 'User 2' }, expires: '2025-12-31' }
      vi.mocked(getServerSession).mockResolvedValue(session2 as any)
      vi.mocked(prisma.$transaction).mockResolvedValue([
        { ...mockCreatedMessage, senderId: 'user-456' },
        {},
      ])

      const req = createPostRequest({ connectionId: 'conn-1', content: 'Hi from user2' })
      const response = await POST(req)

      expect(response.status).toBe(200)
      // Notification should go to user1
      expect(sendPushNotification).toHaveBeenCalledWith('user-123', expect.anything())
    })

    it('should default messageType to text', async () => {
      const req = createPostRequest({ connectionId: 'conn-1', content: 'Hello!' })
      await POST(req)

      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should return DATABASE_ERROR on transaction failure', async () => {
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnection as any)
      vi.mocked(prisma.userBlock.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Transaction failed'))

      const req = createPostRequest({ connectionId: 'conn-1', content: 'Hello!' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
    })
  })
})

// ============================================================
// Tests: DELETE
// ============================================================
describe('Destiny Match Chat API - DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
  })

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const req = createDeleteRequest({ messageId: 'msg-1' })
      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(401)
    })
  })

  describe('Input Validation', () => {
    it('should return error when messageId is missing', async () => {
      const req = createDeleteRequest({})
      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(422)
    })

    it('should return error when messageId is empty string', async () => {
      const req = createDeleteRequest({ messageId: '' })
      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(422)
    })
  })

  describe('Authorization', () => {
    it('should return NOT_FOUND when message does not exist', async () => {
      vi.mocked(prisma.matchMessage.findUnique).mockResolvedValue(null)

      const req = createDeleteRequest({ messageId: 'nonexistent' })
      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should return FORBIDDEN when trying to delete another users message', async () => {
      vi.mocked(prisma.matchMessage.findUnique).mockResolvedValue({
        id: 'msg-1',
        senderId: 'other-user',
        content: 'Not my message',
        isDeleted: false,
      } as any)

      const req = createDeleteRequest({ messageId: 'msg-1' })
      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })
  })

  describe('Already Deleted', () => {
    it('should return BAD_REQUEST when message is already deleted', async () => {
      vi.mocked(prisma.matchMessage.findUnique).mockResolvedValue({
        id: 'msg-1',
        senderId: 'user-123',
        content: '삭제된 메시지입니다',
        isDeleted: true,
      } as any)

      const req = createDeleteRequest({ messageId: 'msg-1' })
      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('BAD_REQUEST')
    })
  })

  describe('Successful Deletion', () => {
    it('should soft-delete the message', async () => {
      vi.mocked(prisma.matchMessage.findUnique).mockResolvedValue({
        id: 'msg-1',
        senderId: 'user-123',
        content: 'My message',
        isDeleted: false,
      } as any)
      vi.mocked(prisma.matchMessage.update).mockResolvedValue({
        id: 'msg-1',
        content: '삭제된 메시지입니다',
        isDeleted: true,
      } as any)

      const req = createDeleteRequest({ messageId: 'msg-1' })
      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.deleted).toBe(true)
    })

    it('should replace message content with deletion text', async () => {
      vi.mocked(prisma.matchMessage.findUnique).mockResolvedValue({
        id: 'msg-1',
        senderId: 'user-123',
        content: 'Original content',
        isDeleted: false,
      } as any)
      vi.mocked(prisma.matchMessage.update).mockResolvedValue({} as any)

      const req = createDeleteRequest({ messageId: 'msg-1' })
      await DELETE(req)

      expect(prisma.matchMessage.update).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
        data: {
          content: '삭제된 메시지입니다',
          isDeleted: true,
        },
      })
    })
  })

  describe('Error Handling', () => {
    it('should return DATABASE_ERROR on prisma failure', async () => {
      vi.mocked(prisma.matchMessage.findUnique).mockRejectedValue(new Error('Database error'))

      const req = createDeleteRequest({ messageId: 'msg-1' })
      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
    })

    it('should handle session errors gracefully', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('Session error'))

      const req = createDeleteRequest({ messageId: 'msg-1' })
      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(500)
    })
  })

  describe('Edge Cases', () => {
    it('should handle sequential delete attempts where second finds already-deleted message', async () => {
      // First call finds the message as not deleted
      vi.mocked(prisma.matchMessage.findUnique).mockResolvedValueOnce({
        id: 'msg-1',
        senderId: 'user-123',
        content: 'My message',
        isDeleted: false,
      } as any)
      vi.mocked(prisma.matchMessage.update).mockResolvedValue({} as any)

      const req1 = createDeleteRequest({ messageId: 'msg-1' })
      const res1 = await DELETE(req1)
      expect(res1.status).toBe(200)

      // Second call finds the message is already deleted
      vi.mocked(prisma.matchMessage.findUnique).mockResolvedValueOnce({
        id: 'msg-1',
        senderId: 'user-123',
        content: '삭제된 메시지입니다',
        isDeleted: true,
      } as any)

      const req2 = createDeleteRequest({ messageId: 'msg-1' })
      const res2 = await DELETE(req2)
      const data2 = await res2.json()

      // Second attempt should return BAD_REQUEST (already deleted)
      expect(res2.status).toBe(400)
      expect(data2.error.code).toBe('BAD_REQUEST')
    })
  })
})
