import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks -- must be declared BEFORE importing the route handlers
// ---------------------------------------------------------------------------

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any) => {
      const context = {
        userId: 'test-user-id',
        session: { user: { id: 'test-user-id', email: 'test@example.com' } },
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
      }
      const result = await handler(req, context)
      if (result instanceof Response) return result
      if (result?.error) {
        const statusMap: Record<string, number> = {
          VALIDATION_ERROR: 422,
          NOT_FOUND: 404,
          BAD_REQUEST: 400,
          DATABASE_ERROR: 500,
          INTERNAL_ERROR: 500,
        }
        return NextResponse.json(
          { success: false, error: result.error },
          { status: statusMap[result.error.code] || 500 }
        )
      }
      return NextResponse.json({ success: true, data: result.data }, { status: 200 })
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: any) => ({ data })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    DATABASE_ERROR: 'DATABASE_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    personaMemory: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    counselorChatSession: {
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/ai/summarize', () => ({
  summarizeConversation: vi.fn(),
}))

vi.mock('@/lib/api/zodValidation', () => ({
  personaMemoryUpdateSchema: {
    safeParse: vi.fn((data: any) => {
      // Basic validation - check required fields
      if (!data.sessionId || !data.theme || !data.locale || !data.messages) {
        return {
          success: false,
          error: {
            issues: [
              { message: 'sessionId is required' },
              { message: 'theme is required' },
              { message: 'locale is required' },
              { message: 'messages is required' },
            ].filter((issue) => {
              if (issue.message.includes('sessionId') && data.sessionId) return false
              if (issue.message.includes('theme') && data.theme) return false
              if (issue.message.includes('locale') && data.locale) return false
              if (issue.message.includes('messages') && data.messages) return false
              return true
            }),
          },
        }
      }
      if (data.messages && data.messages.length === 0) {
        return {
          success: false,
          error: {
            issues: [{ message: 'messages must have at least 1 item' }],
          },
        }
      }
      return { success: true, data }
    }),
  },
}))

// ---------------------------------------------------------------------------
// Imports -- after mocks so modules receive the mocked dependencies
// ---------------------------------------------------------------------------

import { POST } from '@/app/api/persona-memory/update-from-chat/route'
import { prisma } from '@/lib/db/prisma'
import { summarizeConversation } from '@/lib/ai/summarize'
import { personaMemoryUpdateSchema } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost/api/persona-memory/update-from-chat'

const mockExistingMemory = {
  id: 'memory-1',
  userId: 'test-user-id',
  dominantThemes: ['career', 'love'],
  keyInsights: ['insight-a', 'insight-b'],
  emotionalTone: 'hopeful',
  growthAreas: ['patience'],
  lastTopics: ['work'],
  recurringIssues: ['stress'],
  sessionCount: 5,
  birthChart: { sun: 'Aries' },
  sajuProfile: { element: 'fire' },
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-06-01'),
}

const mockSummary = {
  summary: 'Test conversation about career goals and 2025 plans',
  keyTopics: ['career', '2025'],
  emotionalTone: 'hopeful',
  keyInsights: ['Focus on networking', 'Build portfolio'],
  growthAreas: ['communication'],
  recurringIssues: ['work-life balance'],
}

const validRequestBody = {
  sessionId: 'session-123',
  theme: 'career',
  locale: 'ko',
  messages: [
    { role: 'user', content: 'What is my career outlook for 2025?' },
    { role: 'assistant', content: 'Based on your saju, 2025 looks promising for career growth.' },
    { role: 'user', content: 'Should I consider changing jobs?' },
    { role: 'assistant', content: 'The timing appears favorable for new opportunities.' },
  ],
}

// ---------------------------------------------------------------------------
// POST handler tests
// ---------------------------------------------------------------------------

describe('PersonaMemory update-from-chat API - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: summarize returns a valid summary
    vi.mocked(summarizeConversation).mockResolvedValue(mockSummary)
  })

  // --------------------------------------------------------------------------
  // Successful Updates
  // --------------------------------------------------------------------------

  describe('Successful updates', () => {
    it('should create new persona memory when none exists', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)

      const upsertedRecord = {
        id: 'memory-new',
        userId: 'test-user-id',
        sessionCount: 1,
        dominantThemes: ['career', '2025'],
        keyInsights: mockSummary.keyInsights,
        emotionalTone: 'hopeful',
        growthAreas: ['communication'],
        lastTopics: ['career'],
        recurringIssues: ['work-life balance'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue(upsertedRecord as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.data.sessionCount).toBe(1)
      expect(json.data.data.dominantThemes).toEqual(['career', '2025'])
      expect(json.data.data.emotionalTone).toBe('hopeful')
      expect(json.data.summary).toBe(mockSummary.summary)
    })

    it('should update existing persona memory and increment session count', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(mockExistingMemory as any)

      const updatedRecord = {
        ...mockExistingMemory,
        sessionCount: 6,
        dominantThemes: ['career', 'love', '2025'],
        keyInsights: [...mockExistingMemory.keyInsights, ...mockSummary.keyInsights],
      }
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue(updatedRecord as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.data.sessionCount).toBe(6)

      // Verify upsert was called with correct structure
      expect(prisma.personaMemory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id' },
          create: expect.objectContaining({
            userId: 'test-user-id',
            sessionCount: 1,
          }),
          update: expect.objectContaining({
            sessionCount: { increment: 1 },
          }),
        })
      )
    })

    it('should merge topics and insights from existing memory', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(mockExistingMemory as any)

      const updatedRecord = {
        ...mockExistingMemory,
        sessionCount: 6,
        keyInsights: ['insight-a', 'insight-b', 'Focus on networking', 'Build portfolio'],
      }
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue(updatedRecord as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(200)

      // Verify the upsert update contains merged arrays
      const upsertCall = vi.mocked(prisma.personaMemory.upsert).mock.calls[0][0]
      expect(upsertCall.update.keyInsights).toEqual(
        expect.arrayContaining(['insight-a', 'insight-b', 'Focus on networking', 'Build portfolio'])
      )
    })

    it('should update lastTopics with current theme at front', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(mockExistingMemory as any)

      const updatedRecord = {
        ...mockExistingMemory,
        sessionCount: 6,
        lastTopics: ['career', 'work'],
      }
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue(updatedRecord as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      await POST(request)

      const upsertCall = vi.mocked(prisma.personaMemory.upsert).mock.calls[0][0]
      // Current theme 'career' should be first in lastTopics
      expect(upsertCall.create.lastTopics[0]).toBe('career')
      expect(upsertCall.update.lastTopics[0]).toBe('career')
    })

    it('should update counselor chat session with summary', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(mockExistingMemory as any)
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue({
        ...mockExistingMemory,
        sessionCount: 6,
      } as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      await POST(request)

      expect(prisma.counselorChatSession.updateMany).toHaveBeenCalledWith({
        where: { id: 'session-123', userId: 'test-user-id' },
        data: {
          summary: mockSummary.summary,
          keyTopics: mockSummary.keyTopics,
        },
      })
    })

    it('should include saju profile when provided', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)

      const updatedRecord = {
        id: 'memory-new',
        userId: 'test-user-id',
        sessionCount: 1,
        dominantThemes: ['career'],
        sajuProfile: { dayMaster: 'fire', element: 'wood' },
      }
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue(updatedRecord as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const requestWithSaju = {
        ...validRequestBody,
        saju: { dayMaster: 'fire', element: 'wood' },
      }

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(requestWithSaju),
      })

      await POST(request)

      const upsertCall = vi.mocked(prisma.personaMemory.upsert).mock.calls[0][0]
      expect(upsertCall.create.sajuProfile).toEqual({ dayMaster: 'fire', element: 'wood' })
      expect(upsertCall.update.sajuProfile).toEqual({ dayMaster: 'fire', element: 'wood' })
    })

    it('should include astro/birth chart when provided', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)

      const updatedRecord = {
        id: 'memory-new',
        userId: 'test-user-id',
        sessionCount: 1,
        dominantThemes: ['career'],
        birthChart: { sun: 'Leo', moon: 'Pisces' },
      }
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue(updatedRecord as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const requestWithAstro = {
        ...validRequestBody,
        astro: { sun: 'Leo', moon: 'Pisces' },
      }

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(requestWithAstro),
      })

      await POST(request)

      const upsertCall = vi.mocked(prisma.personaMemory.upsert).mock.calls[0][0]
      expect(upsertCall.create.birthChart).toEqual({ sun: 'Leo', moon: 'Pisces' })
      expect(upsertCall.update.birthChart).toEqual({ sun: 'Leo', moon: 'Pisces' })
    })

    it('should filter messages to only include user and assistant roles', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue({
        id: 'memory-new',
        userId: 'test-user-id',
        sessionCount: 1,
        dominantThemes: ['career'],
        emotionalTone: 'neutral',
        lastTopics: ['career'],
      } as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const requestWithSystemMessage = {
        ...validRequestBody,
        messages: [
          { role: 'system', content: 'System prompt here' },
          { role: 'user', content: 'User question' },
          { role: 'assistant', content: 'Assistant response' },
        ],
      }

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(requestWithSystemMessage),
      })

      await POST(request)

      // Verify summarizeConversation was called with filtered messages (no system)
      expect(summarizeConversation).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user' }),
          expect.objectContaining({ role: 'assistant' }),
        ]),
        'career',
        'ko'
      )

      // Verify system messages were filtered out
      const summaryCall = vi.mocked(summarizeConversation).mock.calls[0][0]
      expect(summaryCall.every((m: any) => m.role !== 'system')).toBe(true)
    })
  })

  // --------------------------------------------------------------------------
  // Validation Errors
  // --------------------------------------------------------------------------

  describe('Validation errors', () => {
    it('should return BAD_REQUEST for invalid JSON body', async () => {
      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: 'not valid json',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('BAD_REQUEST')
    })

    it('should return VALIDATION_ERROR when sessionId is missing', async () => {
      vi.mocked(personaMemoryUpdateSchema.safeParse).mockReturnValueOnce({
        success: false,
        error: { issues: [{ message: 'sessionId is required' }] },
      } as any)

      const invalidBody = {
        theme: 'career',
        locale: 'ko',
        messages: [{ role: 'user', content: 'Hello' }],
      }

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(invalidBody),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(422)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
      expect(json.error.message).toContain('sessionId is required')
    })

    it('should return VALIDATION_ERROR when theme is missing', async () => {
      vi.mocked(personaMemoryUpdateSchema.safeParse).mockReturnValueOnce({
        success: false,
        error: { issues: [{ message: 'theme is required' }] },
      } as any)

      const invalidBody = {
        sessionId: 'session-123',
        locale: 'ko',
        messages: [{ role: 'user', content: 'Hello' }],
      }

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(invalidBody),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(422)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
      expect(json.error.message).toContain('theme is required')
    })

    it('should return VALIDATION_ERROR when locale is missing', async () => {
      vi.mocked(personaMemoryUpdateSchema.safeParse).mockReturnValueOnce({
        success: false,
        error: { issues: [{ message: 'locale is required' }] },
      } as any)

      const invalidBody = {
        sessionId: 'session-123',
        theme: 'career',
        messages: [{ role: 'user', content: 'Hello' }],
      }

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(invalidBody),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(422)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return VALIDATION_ERROR when messages array is empty', async () => {
      vi.mocked(personaMemoryUpdateSchema.safeParse).mockReturnValueOnce({
        success: false,
        error: { issues: [{ message: 'messages must have at least 1 item' }] },
      } as any)

      const invalidBody = {
        sessionId: 'session-123',
        theme: 'career',
        locale: 'ko',
        messages: [],
      }

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(invalidBody),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(422)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
      expect(json.error.message).toContain('messages must have at least 1 item')
    })

    it('should return VALIDATION_ERROR when messages is missing', async () => {
      vi.mocked(personaMemoryUpdateSchema.safeParse).mockReturnValueOnce({
        success: false,
        error: { issues: [{ message: 'messages is required' }] },
      } as any)

      const invalidBody = {
        sessionId: 'session-123',
        theme: 'career',
        locale: 'ko',
      }

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(invalidBody),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(422)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should log validation errors', async () => {
      vi.mocked(personaMemoryUpdateSchema.safeParse).mockReturnValueOnce({
        success: false,
        error: { issues: [{ message: 'Invalid input' }] },
      } as any)

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify({ invalid: 'data' }),
      })

      await POST(request)

      expect(logger.warn).toHaveBeenCalledWith(
        '[Persona memory update] validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })
  })

  // --------------------------------------------------------------------------
  // Summary handling
  // --------------------------------------------------------------------------

  describe('Summary handling', () => {
    it('should handle null summary from summarizeConversation', async () => {
      vi.mocked(summarizeConversation).mockResolvedValue(null)
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(mockExistingMemory as any)

      const updatedRecord = {
        ...mockExistingMemory,
        sessionCount: 6,
        emotionalTone: 'hopeful', // existing tone preserved
      }
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue(updatedRecord as any)

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.summary).toBeUndefined()

      // Chat session should NOT be updated when summary is null
      expect(prisma.counselorChatSession.updateMany).not.toHaveBeenCalled()
    })

    it('should use default emotionalTone when summary returns null', async () => {
      vi.mocked(summarizeConversation).mockResolvedValue(null)
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null) // No existing memory

      const updatedRecord = {
        id: 'memory-new',
        userId: 'test-user-id',
        sessionCount: 1,
        dominantThemes: [],
        emotionalTone: 'neutral',
        lastTopics: ['career'],
      }
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue(updatedRecord as any)

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      await POST(request)

      const upsertCall = vi.mocked(prisma.personaMemory.upsert).mock.calls[0][0]
      expect(upsertCall.create.emotionalTone).toBe('neutral')
    })

    it('should preserve existing emotionalTone when summary has no tone', async () => {
      vi.mocked(summarizeConversation).mockResolvedValue({
        ...mockSummary,
        emotionalTone: undefined as any,
      })
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(mockExistingMemory as any)

      const updatedRecord = {
        ...mockExistingMemory,
        sessionCount: 6,
      }
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue(updatedRecord as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      await POST(request)

      const upsertCall = vi.mocked(prisma.personaMemory.upsert).mock.calls[0][0]
      // Should fall back to existing emotionalTone or 'neutral'
      expect(upsertCall.update.emotionalTone).toBe('hopeful') // existing value
    })
  })

  // --------------------------------------------------------------------------
  // Database error handling
  // --------------------------------------------------------------------------

  describe('Database error handling', () => {
    it('should return INTERNAL_ERROR when findUnique throws', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockRejectedValue(new Error('Connection refused'))

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
    })

    it('should return INTERNAL_ERROR when upsert throws', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personaMemory.upsert).mockRejectedValue(new Error('Disk full'))

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
    })

    it('should return INTERNAL_ERROR when counselorChatSession.updateMany throws', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(mockExistingMemory as any)
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue({
        ...mockExistingMemory,
        sessionCount: 6,
      } as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockRejectedValue(
        new Error('Foreign key violation')
      )

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
    })

    it('should log errors when database operations fail', async () => {
      const testError = new Error('Database timeout')
      vi.mocked(prisma.personaMemory.findUnique).mockRejectedValue(testError)

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      await POST(request)

      expect(logger.error).toHaveBeenCalledWith(
        '[PersonaMemory update-from-chat error]',
        testError
      )
    })
  })

  // --------------------------------------------------------------------------
  // Edge cases
  // --------------------------------------------------------------------------

  describe('Edge cases', () => {
    it('should handle empty existing arrays gracefully', async () => {
      const memoryWithEmptyArrays = {
        ...mockExistingMemory,
        dominantThemes: [],
        keyInsights: [],
        recurringIssues: [],
        growthAreas: [],
        lastTopics: [],
      }
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(memoryWithEmptyArrays as any)

      const updatedRecord = {
        ...memoryWithEmptyArrays,
        sessionCount: 6,
        dominantThemes: mockSummary.keyTopics,
      }
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue(updatedRecord as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should handle null existing arrays gracefully', async () => {
      const memoryWithNullArrays = {
        ...mockExistingMemory,
        dominantThemes: null,
        keyInsights: null,
        recurringIssues: null,
        growthAreas: null,
        lastTopics: null,
      }
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(memoryWithNullArrays as any)

      const updatedRecord = {
        ...memoryWithNullArrays,
        sessionCount: 6,
        dominantThemes: mockSummary.keyTopics,
        lastTopics: ['career'],
      }
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue(updatedRecord as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should limit merged arrays to maximum sizes', async () => {
      // Create existing memory with many items
      const memoryWithManyItems = {
        ...mockExistingMemory,
        dominantThemes: Array(15).fill('theme'),
        keyInsights: Array(15).fill('insight'),
        recurringIssues: Array(15).fill('issue'),
        growthAreas: Array(10).fill('area'),
        lastTopics: Array(10).fill('topic'),
      }
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(memoryWithManyItems as any)

      const updatedRecord = {
        ...memoryWithManyItems,
        sessionCount: 6,
      }
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue(updatedRecord as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      await POST(request)

      const upsertCall = vi.mocked(prisma.personaMemory.upsert).mock.calls[0][0]
      // Verify arrays are limited (keyInsights max 10, growthAreas max 5, lastTopics max 5)
      expect(upsertCall.update.keyInsights.length).toBeLessThanOrEqual(10)
      expect(upsertCall.update.growthAreas.length).toBeLessThanOrEqual(5)
      expect(upsertCall.update.lastTopics.length).toBeLessThanOrEqual(5)
    })

    it('should deduplicate merged arrays', async () => {
      const memoryWithDuplicates = {
        ...mockExistingMemory,
        keyInsights: ['insight-a', 'insight-b', 'Focus on networking'],
      }
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(memoryWithDuplicates as any)

      // Summary returns an insight that already exists
      vi.mocked(summarizeConversation).mockResolvedValue({
        ...mockSummary,
        keyInsights: ['Focus on networking', 'New insight'],
      })

      const updatedRecord = {
        ...memoryWithDuplicates,
        sessionCount: 6,
      }
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue(updatedRecord as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      await POST(request)

      const upsertCall = vi.mocked(prisma.personaMemory.upsert).mock.calls[0][0]
      // 'Focus on networking' should only appear once
      const networkingCount = upsertCall.update.keyInsights.filter(
        (i: string) => i === 'Focus on networking'
      ).length
      expect(networkingCount).toBe(1)
    })

    it('should not duplicate theme in lastTopics', async () => {
      const memoryWithThemeInTopics = {
        ...mockExistingMemory,
        lastTopics: ['career', 'love', 'health'],
      }
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(memoryWithThemeInTopics as any)

      const updatedRecord = {
        ...memoryWithThemeInTopics,
        sessionCount: 6,
      }
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue(updatedRecord as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody), // theme is 'career'
      })

      await POST(request)

      const upsertCall = vi.mocked(prisma.personaMemory.upsert).mock.calls[0][0]
      // 'career' should appear only once and be at position 0
      const careerCount = upsertCall.update.lastTopics.filter((t: string) => t === 'career').length
      expect(careerCount).toBe(1)
      expect(upsertCall.update.lastTopics[0]).toBe('career')
    })

    it('should handle summarizeConversation throwing an error', async () => {
      vi.mocked(summarizeConversation).mockRejectedValue(new Error('AI service unavailable'))
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(mockExistingMemory as any)

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
    })

    it('should calculate dominant themes by frequency', async () => {
      const memoryWithRepeatedThemes = {
        ...mockExistingMemory,
        dominantThemes: ['career', 'career', 'love', 'career'],
      }
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(memoryWithRepeatedThemes as any)

      // Summary adds more career topics
      vi.mocked(summarizeConversation).mockResolvedValue({
        ...mockSummary,
        keyTopics: ['career', 'money'],
      })

      const updatedRecord = {
        ...memoryWithRepeatedThemes,
        sessionCount: 6,
        dominantThemes: ['career', 'love', 'money'],
      }
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue(updatedRecord as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      await POST(request)

      const upsertCall = vi.mocked(prisma.personaMemory.upsert).mock.calls[0][0]
      // 'career' should be first as it appears most frequently
      expect(upsertCall.update.dominantThemes[0]).toBe('career')
    })
  })

  // --------------------------------------------------------------------------
  // Authentication context
  // --------------------------------------------------------------------------

  describe('Authentication context', () => {
    it('should use userId from context for database operations', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(mockExistingMemory as any)
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue({
        ...mockExistingMemory,
        sessionCount: 6,
      } as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      await POST(request)

      // findUnique should query by userId
      expect(prisma.personaMemory.findUnique).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
      })

      // upsert should use userId
      expect(prisma.personaMemory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id' },
          create: expect.objectContaining({ userId: 'test-user-id' }),
        })
      )

      // counselorChatSession update should include userId filter
      expect(prisma.counselorChatSession.updateMany).toHaveBeenCalledWith({
        where: { id: 'session-123', userId: 'test-user-id' },
        data: expect.any(Object),
      })
    })
  })

  // --------------------------------------------------------------------------
  // Response structure
  // --------------------------------------------------------------------------

  describe('Response structure', () => {
    it('should return correct response structure on success', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(mockExistingMemory as any)

      const updatedRecord = {
        ...mockExistingMemory,
        sessionCount: 6,
        dominantThemes: ['career', 'love', '2025'],
        emotionalTone: 'hopeful',
        lastTopics: ['career', 'work'],
      }
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue(updatedRecord as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toHaveProperty('data')
      expect(json.data).toHaveProperty('summary')
      expect(json.data.data).toHaveProperty('sessionCount')
      expect(json.data.data).toHaveProperty('dominantThemes')
      expect(json.data.data).toHaveProperty('emotionalTone')
      expect(json.data.data).toHaveProperty('lastTopics')
    })

    it('should include summary in response when available', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(mockExistingMemory as any)
      vi.mocked(prisma.personaMemory.upsert).mockResolvedValue({
        ...mockExistingMemory,
        sessionCount: 6,
      } as any)
      vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.data.summary).toBe(mockSummary.summary)
    })
  })
})

// ---------------------------------------------------------------------------
// Export verification
// ---------------------------------------------------------------------------

describe('PersonaMemory update-from-chat API - Exports', () => {
  it('should export POST as a function', () => {
    expect(typeof POST).toBe('function')
  })

  it('should handle async request processing', async () => {
    vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(mockExistingMemory as any)
    vi.mocked(prisma.personaMemory.upsert).mockResolvedValue({
      ...mockExistingMemory,
      sessionCount: 6,
    } as any)
    vi.mocked(prisma.counselorChatSession.updateMany).mockResolvedValue({ count: 1 })

    const request = new NextRequest(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    // POST should return a Promise
    const result = POST(request)
    expect(result).toBeInstanceOf(Promise)

    // Should resolve to a Response
    const response = await result
    expect(response).toBeInstanceOf(Response)
  })
})
