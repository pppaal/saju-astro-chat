/**
 * Comprehensive tests for /api/counselor/session/save
 * Tests POST operations, validation, body size limits, session ownership, and database operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock functions that we can control per test
const mockEnforceBodySize = vi.fn()
const mockFindUnique = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockSafeParse = vi.fn()

// Mock withApiMiddleware to pass through with test context
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any) => {
      const context = { userId: 'test-user-id', session: { user: { id: 'test-user-id' } } }
      const result = await handler(req, context)
      if (result instanceof Response) return result
      return NextResponse.json(result, { status: 200 })
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  extractLocale: vi.fn(() => 'en'),
}))

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    counselorChatSession: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      create: (...args: any[]) => mockCreate(...args),
      update: (...args: any[]) => mockUpdate(...args),
    },
  },
}))

// Mock enforceBodySize
vi.mock('@/lib/http', () => ({
  enforceBodySize: (...args: any[]) => mockEnforceBodySize(...args),
}))

// Mock body limits
vi.mock('@/lib/constants/api-limits', () => ({
  BODY_LIMITS: { LARGE: 1024 * 1024 },
}))

// Mock Zod validation schema
vi.mock('@/lib/api/zodValidation', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    counselorSessionSaveRequestSchema: {
      safeParse: (data: any) => mockSafeParse(data),
    },
  }
})

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock HTTP status constants
vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    FORBIDDEN: 403,
    SERVER_ERROR: 500,
  },
}))

// Helper function to create a valid Zod safeParse implementation
function createValidSafeParse() {
  return (data: any) => {
    const errors: any[] = []

    // Validate sessionId - required, string, min 1, max 100
    if (!data.sessionId || typeof data.sessionId !== 'string' || data.sessionId.trim().length === 0) {
      errors.push({ path: ['sessionId'], message: 'sessionId is required' })
    } else if (data.sessionId.length > 100) {
      errors.push({ path: ['sessionId'], message: 'sessionId must be at most 100 characters' })
    }

    // Validate messages - required, array, min 1, max 200
    if (!data.messages || !Array.isArray(data.messages)) {
      errors.push({ path: ['messages'], message: 'messages is required and must be an array' })
    } else if (data.messages.length === 0) {
      errors.push({ path: ['messages'], message: 'messages must have at least 1 item' })
    } else if (data.messages.length > 200) {
      errors.push({ path: ['messages'], message: 'messages must have at most 200 items' })
    } else {
      // Validate each message
      for (let i = 0; i < data.messages.length; i++) {
        const msg = data.messages[i]
        if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
          errors.push({ path: ['messages', i, 'role'], message: 'invalid role' })
        }
        if (!msg.content || typeof msg.content !== 'string' || msg.content.length === 0) {
          errors.push({ path: ['messages', i, 'content'], message: 'content is required' })
        } else if (msg.content.length > 10000) {
          errors.push({ path: ['messages', i, 'content'], message: 'content must be at most 10000 characters' })
        }
      }
    }

    // Validate theme - optional, max 100 characters
    if (data.theme !== undefined && typeof data.theme === 'string' && data.theme.length > 100) {
      errors.push({ path: ['theme'], message: 'theme must be at most 100 characters' })
    }

    // Validate locale - optional
    if (data.locale !== undefined && !['ko', 'en', 'ja', 'zh'].includes(data.locale)) {
      errors.push({ path: ['locale'], message: 'invalid locale' })
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: { issues: errors },
      }
    }

    return {
      success: true,
      data: {
        sessionId: data.sessionId.trim(),
        theme: data.theme || 'chat',
        messages: data.messages,
        locale: data.locale || 'ko',
      },
    }
  }
}

describe('/api/counselor/session/save', () => {
  const mockUserId = 'test-user-id'

  const validSessionData = {
    sessionId: 'session-123',
    theme: 'career',
    messages: [
      { role: 'user', content: 'What should I do about my career?', timestamp: Date.now() },
      { role: 'assistant', content: 'Let me help you with that.', timestamp: Date.now() },
    ],
    locale: 'ko',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Set up default mock implementations
    mockEnforceBodySize.mockReturnValue(null)
    mockSafeParse.mockImplementation(createValidSafeParse())
  })

  describe('POST - Body Size Validation', () => {
    it('should return 413 when body is oversized', async () => {
      // Mock enforceBodySize to return a 413 response
      mockEnforceBodySize.mockReturnValue(
        NextResponse.json({ error: 'payload_too_large', limit: 1024 * 1024 }, { status: 413 })
      )

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(validSessionData),
        headers: { 'Content-Length': String(2 * 1024 * 1024) }, // 2MB
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)
      const result = await response.json()

      expect(response.status).toBe(413)
      expect(result.error).toBe('payload_too_large')
      expect(mockEnforceBodySize).toHaveBeenCalled()
    })

    it('should allow request when body size is within limits', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({
        id: 'session-123',
        userId: mockUserId,
        messages: validSessionData.messages,
      })

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(validSessionData),
        headers: { 'Content-Length': '500' },
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)

      expect(response.status).toBe(200)
    })
  })

  describe('POST - Empty Body Handling', () => {
    it('should return 400 when body is empty', async () => {
      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: '',
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error.code).toBe('BAD_REQUEST')
    })

    it('should return 400 when body is whitespace only', async () => {
      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: '   \n\t  ',
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error.code).toBe('BAD_REQUEST')
    })
  })

  describe('POST - Invalid JSON Handling', () => {
    it('should return 400 when body is invalid JSON', async () => {
      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: '{ invalid json }',
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error.code).toBe('BAD_REQUEST')
    })

    it('should return 400 when body contains syntax error', async () => {
      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: '{"sessionId": "test",}', // Trailing comma
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error.code).toBe('BAD_REQUEST')
    })
  })

  describe('POST - Zod Validation', () => {
    it('should return 422 when sessionId is missing', async () => {
      const data = { ...validSessionData, sessionId: undefined }
      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)
      const result = await response.json()

      expect(response.status).toBe(422)
      expect(result.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when sessionId is empty string', async () => {
      const data = { ...validSessionData, sessionId: '' }
      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)
      const result = await response.json()

      expect(response.status).toBe(422)
      expect(result.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when messages is missing', async () => {
      const data = { sessionId: 'session-123', theme: 'career' }
      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)
      const result = await response.json()

      expect(response.status).toBe(422)
      expect(result.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when messages array is empty', async () => {
      const data = { ...validSessionData, messages: [] }
      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)
      const result = await response.json()

      expect(response.status).toBe(422)
      expect(result.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when message has invalid role', async () => {
      const data = {
        ...validSessionData,
        messages: [{ role: 'invalid_role', content: 'Hello' }],
      }
      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)
      const result = await response.json()

      expect(response.status).toBe(422)
      expect(result.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when message content is empty', async () => {
      const data = {
        ...validSessionData,
        messages: [{ role: 'user', content: '' }],
      }
      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)
      const result = await response.json()

      expect(response.status).toBe(422)
      expect(result.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST - Session After Validation Checks', () => {
    it('should return 400 when sessionId or messages.length is falsy after validation', async () => {
      // Mock validation to return success but with empty sessionId
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          sessionId: '', // Empty after trim
          theme: 'chat',
          messages: [],
          locale: 'ko',
        },
      })

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify({ sessionId: '  ', messages: [] }),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error.code).toBe('BAD_REQUEST')
    })
  })

  describe('POST - Session Ownership', () => {
    it('should return 403 when trying to update another user session', async () => {
      // Session exists but belongs to a different user
      mockFindUnique.mockResolvedValue({
        id: 'session-123',
        userId: 'other-user-id', // Different user
      })

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(validSessionData),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error.code).toBe('FORBIDDEN')
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        select: { userId: true },
      })
    })
  })

  describe('POST - Create New Session', () => {
    it('should create new session when session does not exist', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({
        id: 'session-123',
        userId: mockUserId,
        theme: 'career',
        locale: 'ko',
        messages: validSessionData.messages,
        messageCount: 2,
        lastMessageAt: new Date(),
      })

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(validSessionData),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.sessionId).toBe('session-123')
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'session-123',
          userId: mockUserId,
          theme: 'career',
          locale: 'ko',
          messages: validSessionData.messages,
          messageCount: 2,
        }),
      })
    })

    it('should use default theme "chat" when not provided', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({
        id: 'session-456',
        userId: mockUserId,
        theme: 'chat',
      })

      const dataWithoutTheme = {
        sessionId: 'session-456',
        messages: [{ role: 'user', content: 'Hello' }],
      }

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(dataWithoutTheme),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      await POST(req)

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          theme: 'chat',
        }),
      })
    })

    it('should use default locale "ko" when not provided', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({
        id: 'session-789',
        userId: mockUserId,
        locale: 'ko',
      })

      const dataWithoutLocale = {
        sessionId: 'session-789',
        messages: [{ role: 'user', content: 'Hello' }],
      }

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(dataWithoutLocale),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      await POST(req)

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          locale: 'ko',
        }),
      })
    })
  })

  describe('POST - Update Existing Session', () => {
    it('should update existing session when owned by user', async () => {
      // Session exists and belongs to the same user
      mockFindUnique.mockResolvedValue({
        id: 'session-123',
        userId: mockUserId,
      })
      mockUpdate.mockResolvedValue({
        id: 'session-123',
        userId: mockUserId,
        messages: validSessionData.messages,
        messageCount: 2,
        lastMessageAt: new Date(),
      })

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(validSessionData),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.sessionId).toBe('session-123')
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: expect.objectContaining({
          messages: validSessionData.messages,
          messageCount: 2,
        }),
      })
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('should update lastMessageAt timestamp on update', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'session-123',
        userId: mockUserId,
      })
      mockUpdate.mockResolvedValue({
        id: 'session-123',
        userId: mockUserId,
      })

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(validSessionData),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      await POST(req)

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: expect.objectContaining({
          lastMessageAt: expect.any(Date),
        }),
      })
    })
  })

  describe('POST - Success Response', () => {
    it('should return success true and sessionId on successful create', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({
        id: 'new-session-id',
        userId: mockUserId,
      })

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(validSessionData),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result).toEqual({
        success: true,
        sessionId: 'new-session-id',
      })
    })

    it('should return success true and sessionId on successful update', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'existing-session-id',
        userId: mockUserId,
      })
      mockUpdate.mockResolvedValue({
        id: 'existing-session-id',
        userId: mockUserId,
      })

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify({ ...validSessionData, sessionId: 'existing-session-id' }),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result).toEqual({
        success: true,
        sessionId: 'existing-session-id',
      })
    })
  })

  describe('POST - Message Count Tracking', () => {
    it('should correctly track message count on create', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ id: 'session-123' })

      const messagesWithFive = {
        sessionId: 'session-123',
        messages: [
          { role: 'user', content: 'Message 1' },
          { role: 'assistant', content: 'Response 1' },
          { role: 'user', content: 'Message 2' },
          { role: 'assistant', content: 'Response 2' },
          { role: 'user', content: 'Message 3' },
        ],
      }

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(messagesWithFive),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      await POST(req)

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          messageCount: 5,
        }),
      })
    })

    it('should correctly track message count on update', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'session-123',
        userId: mockUserId,
      })
      mockUpdate.mockResolvedValue({ id: 'session-123' })

      const messagesWithThree = {
        sessionId: 'session-123',
        messages: [
          { role: 'user', content: 'Message 1' },
          { role: 'assistant', content: 'Response 1' },
          { role: 'user', content: 'Message 2' },
        ],
      }

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(messagesWithThree),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      await POST(req)

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: expect.objectContaining({
          messageCount: 3,
        }),
      })
    })
  })

  describe('POST - Edge Cases', () => {
    it('should handle very long sessionId at exactly 100 characters', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ id: 'a'.repeat(100) })

      const data = {
        sessionId: 'a'.repeat(100),
        messages: [{ role: 'user', content: 'Hello' }],
      }

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should reject sessionId over 100 characters', async () => {
      const data = {
        sessionId: 'a'.repeat(101),
        messages: [{ role: 'user', content: 'Hello' }],
      }

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should handle system role messages', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ id: 'session-sys' })

      const data = {
        sessionId: 'session-sys',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      }

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should handle messages with maximum allowed count (200)', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ id: 'session-max' })

      const messages = Array.from({ length: 200 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1}`,
      }))

      const data = {
        sessionId: 'session-max',
        messages,
      }

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should reject messages exceeding maximum count (201)', async () => {
      const messages = Array.from({ length: 201 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1}`,
      }))

      const data = {
        sessionId: 'session-over-max',
        messages,
      }

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should handle message content at maximum length (10000 chars)', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ id: 'session-long-content' })

      const data = {
        sessionId: 'session-long-content',
        messages: [{ role: 'user', content: 'a'.repeat(10000) }],
      }

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should reject message content exceeding maximum length (10001 chars)', async () => {
      const data = {
        sessionId: 'session-too-long-content',
        messages: [{ role: 'user', content: 'a'.repeat(10001) }],
      }

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)

      expect(response.status).toBe(422)
    })
  })

  describe('POST - Different Locales', () => {
    it('should accept valid locale "en"', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ id: 'session-en' })

      const data = {
        sessionId: 'session-en',
        messages: [{ role: 'user', content: 'Hello' }],
        locale: 'en',
      }

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          locale: 'en',
        }),
      })
    })

    it('should accept valid locale "ja"', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ id: 'session-ja' })

      const data = {
        sessionId: 'session-ja',
        messages: [{ role: 'user', content: 'Hello' }],
        locale: 'ja',
      }

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should reject invalid locale', async () => {
      const data = {
        sessionId: 'session-invalid-locale',
        messages: [{ role: 'user', content: 'Hello' }],
        locale: 'invalid',
      }

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)

      expect(response.status).toBe(422)
    })
  })

  describe('POST - Theme Validation', () => {
    it('should accept custom theme within length limit', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ id: 'session-custom-theme' })

      const data = {
        sessionId: 'session-custom-theme',
        messages: [{ role: 'user', content: 'Hello' }],
        theme: 'love-relationship',
      }

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          theme: 'love-relationship',
        }),
      })
    })

    it('should reject theme exceeding 100 characters', async () => {
      const data = {
        sessionId: 'session-long-theme',
        messages: [{ role: 'user', content: 'Hello' }],
        theme: 'a'.repeat(101),
      }

      const req = new NextRequest('http://localhost:3000/api/counselor/session/save', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/counselor/session/save/route')
      const response = await POST(req)

      expect(response.status).toBe(422)
    })
  })
})
