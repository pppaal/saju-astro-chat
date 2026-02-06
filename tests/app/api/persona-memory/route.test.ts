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
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  Prisma: { InputJsonValue: {}, JsonObject: {} },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/api/zodValidation', () => ({
  personaMemoryPostSchema: {
    safeParse: vi.fn((data: any) => ({ success: true, data })),
  },
  personaMemoryPatchSchema: {
    safeParse: vi.fn((data: any) => {
      if (!data.action) {
        return {
          success: false,
          error: { issues: [{ message: 'action required' }] },
        }
      }
      return { success: true, data: { action: data.action, data: data.data || {} } }
    }),
  },
}))

// ---------------------------------------------------------------------------
// Imports -- after mocks so modules receive the mocked dependencies
// ---------------------------------------------------------------------------

import { GET, POST, PATCH } from '@/app/api/persona-memory/route'
import { prisma } from '@/lib/db/prisma'
import { personaMemoryPostSchema, personaMemoryPatchSchema } from '@/lib/api/zodValidation'

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost/api/persona-memory'

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

// ---------------------------------------------------------------------------
// GET handler tests
// ---------------------------------------------------------------------------

describe('PersonaMemory API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return existing persona memory with isNewUser=false', async () => {
    vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(mockExistingMemory as any)

    const request = new NextRequest(BASE_URL, { method: 'GET' })
    const response = await GET(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    // Date objects become ISO strings after JSON serialization through NextResponse.json()
    expect(json.data.data.id).toBe(mockExistingMemory.id)
    expect(json.data.data.userId).toBe(mockExistingMemory.userId)
    expect(json.data.data.emotionalTone).toBe(mockExistingMemory.emotionalTone)
    expect(json.data.data.sessionCount).toBe(mockExistingMemory.sessionCount)
    expect(json.data.data.dominantThemes).toEqual(mockExistingMemory.dominantThemes)
    expect(json.data.data.keyInsights).toEqual(mockExistingMemory.keyInsights)
    expect(json.data.isNewUser).toBe(false)
  })

  it('should return null data with isNewUser=true when no memory exists', async () => {
    vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)

    const request = new NextRequest(BASE_URL, { method: 'GET' })
    const response = await GET(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.data).toBeNull()
    expect(json.data.isNewUser).toBe(true)
  })

  it('should query by the authenticated userId from context', async () => {
    vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)

    const request = new NextRequest(BASE_URL, { method: 'GET' })
    await GET(request)

    expect(prisma.personaMemory.findUnique).toHaveBeenCalledWith({
      where: { userId: 'test-user-id' },
    })
  })

  it('should return DATABASE_ERROR (500) when prisma throws', async () => {
    vi.mocked(prisma.personaMemory.findUnique).mockRejectedValue(
      new Error('Connection refused')
    )

    const request = new NextRequest(BASE_URL, { method: 'GET' })
    const response = await GET(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('DATABASE_ERROR')
  })
})

// ---------------------------------------------------------------------------
// POST handler tests
// ---------------------------------------------------------------------------

describe('PersonaMemory API - POST', () => {
  const validPostBody = {
    dominantThemes: ['career'],
    keyInsights: ['new-insight'],
    emotionalTone: 'anxious',
    growthAreas: ['communication'],
    lastTopics: ['relationships'],
    recurringIssues: ['money'],
    birthChart: { sun: 'Leo' },
    sajuProfile: { element: 'wood' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new persona memory when none exists', async () => {
    vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)

    const createdRecord = { id: 'memory-new', userId: 'test-user-id', ...validPostBody, sessionCount: 0 }
    vi.mocked(prisma.personaMemory.create).mockResolvedValue(createdRecord as any)

    const request = new NextRequest(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(validPostBody),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.action).toBe('created')
    expect(json.data.data).toEqual(createdRecord)

    expect(prisma.personaMemory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'test-user-id',
        dominantThemes: validPostBody.dominantThemes,
        keyInsights: validPostBody.keyInsights,
        emotionalTone: validPostBody.emotionalTone,
        sessionCount: 0,
      }),
    })
    expect(prisma.personaMemory.update).not.toHaveBeenCalled()
  })

  it('should update an existing persona memory when one exists', async () => {
    vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(mockExistingMemory as any)

    const updatedRecord = { ...mockExistingMemory, ...validPostBody }
    vi.mocked(prisma.personaMemory.update).mockResolvedValue(updatedRecord as any)

    const request = new NextRequest(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(validPostBody),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.action).toBe('updated')
    // Date objects become ISO strings after JSON serialization through NextResponse.json()
    // so we check individual fields instead of toEqual with the full record
    expect(json.data.data.id).toBe(mockExistingMemory.id)
    expect(json.data.data.userId).toBe(mockExistingMemory.userId)
    expect(json.data.data.dominantThemes).toEqual(validPostBody.dominantThemes)
    expect(json.data.data.emotionalTone).toBe(validPostBody.emotionalTone)
    expect(json.data.data.birthChart).toEqual(validPostBody.birthChart)

    expect(prisma.personaMemory.update).toHaveBeenCalledWith({
      where: { userId: 'test-user-id' },
      data: expect.objectContaining({
        dominantThemes: validPostBody.dominantThemes,
        emotionalTone: validPostBody.emotionalTone,
      }),
    })
    expect(prisma.personaMemory.create).not.toHaveBeenCalled()
  })

  it('should preserve existing fields when POST body omits them during update', async () => {
    vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(mockExistingMemory as any)

    const partialBody = { emotionalTone: 'calm' }
    vi.mocked(prisma.personaMemory.update).mockResolvedValue({
      ...mockExistingMemory,
      emotionalTone: 'calm',
    } as any)

    const request = new NextRequest(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(partialBody),
    })

    await POST(request)

    expect(prisma.personaMemory.update).toHaveBeenCalledWith({
      where: { userId: 'test-user-id' },
      data: expect.objectContaining({
        // Omitted fields should fall back to existing values
        dominantThemes: mockExistingMemory.dominantThemes,
        keyInsights: mockExistingMemory.keyInsights,
        emotionalTone: 'calm',
        growthAreas: mockExistingMemory.growthAreas,
        lastTopics: mockExistingMemory.lastTopics,
        recurringIssues: mockExistingMemory.recurringIssues,
        birthChart: mockExistingMemory.birthChart,
        sajuProfile: mockExistingMemory.sajuProfile,
      }),
    })
  })

  it('should return VALIDATION_ERROR (422) when schema validation fails', async () => {
    vi.mocked(personaMemoryPostSchema.safeParse).mockReturnValueOnce({
      success: false,
      error: { issues: [{ message: 'dominantThemes is required' }] },
    } as any)

    const request = new NextRequest(BASE_URL, {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(422)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('VALIDATION_ERROR')
    expect(json.error.message).toContain('dominantThemes is required')
  })

  it('should return DATABASE_ERROR (500) when prisma throws during create', async () => {
    vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.personaMemory.create).mockRejectedValue(new Error('Disk full'))

    const request = new NextRequest(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(validPostBody),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('DATABASE_ERROR')
  })

  it('should return DATABASE_ERROR (500) when prisma throws during update', async () => {
    vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(mockExistingMemory as any)
    vi.mocked(prisma.personaMemory.update).mockRejectedValue(new Error('Deadlock'))

    const request = new NextRequest(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(validPostBody),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('DATABASE_ERROR')
  })
})

// ---------------------------------------------------------------------------
// PATCH handler tests
// ---------------------------------------------------------------------------

describe('PersonaMemory API - PATCH', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // By default the existing memory is present; individual tests override when needed
    vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(mockExistingMemory as any)
  })

  // -- Validation -----------------------------------------------------------

  it('should return VALIDATION_ERROR (422) when action is missing', async () => {
    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ data: {} }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(422)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('VALIDATION_ERROR')
    expect(json.error.message).toContain('action required')
  })

  // -- NOT_FOUND ------------------------------------------------------------

  it('should return NOT_FOUND (404) when no existing memory for PATCH', async () => {
    vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)

    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'increment_session' }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('NOT_FOUND')
  })

  // -- add_insight ----------------------------------------------------------

  it('should add a new unique insight via add_insight action', async () => {
    const updatedRecord = {
      ...mockExistingMemory,
      keyInsights: ['insight-a', 'insight-b', 'insight-c'],
    }
    vi.mocked(prisma.personaMemory.update).mockResolvedValue(updatedRecord as any)

    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'add_insight', data: { insight: 'insight-c' } }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.action).toBe('add_insight')
    expect(json.data.changed).toBe(true)

    expect(prisma.personaMemory.update).toHaveBeenCalledWith({
      where: { userId: 'test-user-id' },
      data: {
        keyInsights: ['insight-a', 'insight-b', 'insight-c'],
      },
    })
  })

  it('should not duplicate an existing insight (changed=false)', async () => {
    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'add_insight', data: { insight: 'insight-a' } }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.changed).toBe(false)
    expect(prisma.personaMemory.update).not.toHaveBeenCalled()
  })

  // -- add_growth_area ------------------------------------------------------

  it('should add a new growth area via add_growth_area action', async () => {
    const updatedRecord = {
      ...mockExistingMemory,
      growthAreas: ['patience', 'empathy'],
    }
    vi.mocked(prisma.personaMemory.update).mockResolvedValue(updatedRecord as any)

    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'add_growth_area', data: { growthArea: 'empathy' } }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.changed).toBe(true)

    expect(prisma.personaMemory.update).toHaveBeenCalledWith({
      where: { userId: 'test-user-id' },
      data: {
        growthAreas: ['patience', 'empathy'],
      },
    })
  })

  it('should not duplicate an existing growth area (changed=false)', async () => {
    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'add_growth_area', data: { growthArea: 'patience' } }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.changed).toBe(false)
    expect(prisma.personaMemory.update).not.toHaveBeenCalled()
  })

  // -- add_recurring_issue --------------------------------------------------

  it('should add a new recurring issue via add_recurring_issue action', async () => {
    const updatedRecord = {
      ...mockExistingMemory,
      recurringIssues: ['stress', 'insomnia'],
    }
    vi.mocked(prisma.personaMemory.update).mockResolvedValue(updatedRecord as any)

    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'add_recurring_issue', data: { recurringIssue: 'insomnia' } }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.changed).toBe(true)

    expect(prisma.personaMemory.update).toHaveBeenCalledWith({
      where: { userId: 'test-user-id' },
      data: {
        recurringIssues: ['stress', 'insomnia'],
      },
    })
  })

  it('should not duplicate an existing recurring issue (changed=false)', async () => {
    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'add_recurring_issue', data: { recurringIssue: 'stress' } }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.changed).toBe(false)
    expect(prisma.personaMemory.update).not.toHaveBeenCalled()
  })

  // -- update_emotional_tone ------------------------------------------------

  it('should update emotional tone via update_emotional_tone action', async () => {
    const updatedRecord = { ...mockExistingMemory, emotionalTone: 'joyful' }
    vi.mocked(prisma.personaMemory.update).mockResolvedValue(updatedRecord as any)

    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'update_emotional_tone', data: { emotionalTone: 'joyful' } }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.changed).toBe(true)

    expect(prisma.personaMemory.update).toHaveBeenCalledWith({
      where: { userId: 'test-user-id' },
      data: { emotionalTone: 'joyful' },
    })
  })

  it('should return changed=false when emotionalTone is not provided', async () => {
    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'update_emotional_tone', data: {} }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.changed).toBe(false)
    expect(prisma.personaMemory.update).not.toHaveBeenCalled()
  })

  // -- increment_session ----------------------------------------------------

  it('should increment session count via increment_session action', async () => {
    const updatedRecord = { ...mockExistingMemory, sessionCount: 6 }
    vi.mocked(prisma.personaMemory.update).mockResolvedValue(updatedRecord as any)

    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'increment_session' }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.changed).toBe(true)

    expect(prisma.personaMemory.update).toHaveBeenCalledWith({
      where: { userId: 'test-user-id' },
      data: { sessionCount: mockExistingMemory.sessionCount + 1 },
    })
  })

  // -- update_birth_chart ---------------------------------------------------

  it('should update birth chart via update_birth_chart action', async () => {
    const newChart = { sun: 'Taurus', moon: 'Gemini' }
    const updatedRecord = { ...mockExistingMemory, birthChart: newChart }
    vi.mocked(prisma.personaMemory.update).mockResolvedValue(updatedRecord as any)

    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'update_birth_chart', data: { birthChart: newChart } }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.changed).toBe(true)

    expect(prisma.personaMemory.update).toHaveBeenCalledWith({
      where: { userId: 'test-user-id' },
      data: { birthChart: newChart },
    })
  })

  it('should return changed=false when birthChart is not provided', async () => {
    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'update_birth_chart', data: {} }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.changed).toBe(false)
    expect(prisma.personaMemory.update).not.toHaveBeenCalled()
  })

  // -- update_saju_profile --------------------------------------------------

  it('should update saju profile via update_saju_profile action', async () => {
    const newProfile = { element: 'water', pillar: 'north' }
    const updatedRecord = { ...mockExistingMemory, sajuProfile: newProfile }
    vi.mocked(prisma.personaMemory.update).mockResolvedValue(updatedRecord as any)

    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'update_saju_profile', data: { sajuProfile: newProfile } }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.changed).toBe(true)

    expect(prisma.personaMemory.update).toHaveBeenCalledWith({
      where: { userId: 'test-user-id' },
      data: { sajuProfile: newProfile },
    })
  })

  it('should return changed=false when sajuProfile is not provided', async () => {
    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'update_saju_profile', data: {} }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.changed).toBe(false)
    expect(prisma.personaMemory.update).not.toHaveBeenCalled()
  })

  // -- unknown action -------------------------------------------------------

  it('should return BAD_REQUEST (400) for an unknown action', async () => {
    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'do_something_invalid', data: {} }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('BAD_REQUEST')
  })

  // -- database error -------------------------------------------------------

  it('should return DATABASE_ERROR (500) when prisma throws during patch', async () => {
    vi.mocked(prisma.personaMemory.update).mockRejectedValue(new Error('Timeout'))

    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'increment_session' }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('DATABASE_ERROR')
  })

  // -- array actions with null existing data --------------------------------

  it('should handle null keyInsights array gracefully in add_insight', async () => {
    const memoryWithNulls = { ...mockExistingMemory, keyInsights: null }
    vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(memoryWithNulls as any)

    const updatedRecord = { ...memoryWithNulls, keyInsights: ['brand-new'] }
    vi.mocked(prisma.personaMemory.update).mockResolvedValue(updatedRecord as any)

    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'add_insight', data: { insight: 'brand-new' } }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.changed).toBe(true)

    expect(prisma.personaMemory.update).toHaveBeenCalledWith({
      where: { userId: 'test-user-id' },
      data: { keyInsights: ['brand-new'] },
    })
  })

  it('should handle null growthAreas array gracefully in add_growth_area', async () => {
    const memoryWithNulls = { ...mockExistingMemory, growthAreas: null }
    vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(memoryWithNulls as any)

    const updatedRecord = { ...memoryWithNulls, growthAreas: ['resilience'] }
    vi.mocked(prisma.personaMemory.update).mockResolvedValue(updatedRecord as any)

    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'add_growth_area', data: { growthArea: 'resilience' } }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.changed).toBe(true)

    expect(prisma.personaMemory.update).toHaveBeenCalledWith({
      where: { userId: 'test-user-id' },
      data: { growthAreas: ['resilience'] },
    })
  })

  it('should handle null recurringIssues array gracefully in add_recurring_issue', async () => {
    const memoryWithNulls = { ...mockExistingMemory, recurringIssues: null }
    vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(memoryWithNulls as any)

    const updatedRecord = { ...memoryWithNulls, recurringIssues: ['anxiety'] }
    vi.mocked(prisma.personaMemory.update).mockResolvedValue(updatedRecord as any)

    const request = new NextRequest(BASE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'add_recurring_issue', data: { recurringIssue: 'anxiety' } }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.changed).toBe(true)

    expect(prisma.personaMemory.update).toHaveBeenCalledWith({
      where: { userId: 'test-user-id' },
      data: { recurringIssues: ['anxiety'] },
    })
  })
})
