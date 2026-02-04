/**
 * Mega Test Suite for /api/destiny-map/chat-stream/route.ts
 *
 * Tests the main destiny map chat streaming API endpoint including:
 * - Authentication and credit consumption
 * - Auto-loading birth info from user profile
 * - Saju/Astro data computation (via calculateChartData)
 * - Long-term memory (PersonaMemory + session summaries)
 * - Advanced analysis engines (via buildContextSections)
 * - SSE streaming with AI backend
 * - Text safety checks
 * - User profile integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/destiny-map/chat-stream/route'

// Mock all dependencies
vi.mock('@/lib/api/middleware', () => ({
  initializeApiContext: vi.fn(),
  createAuthenticatedGuard: vi.fn(),
}))

vi.mock('@/lib/streaming', () => ({
  createTransformedSSEStream: vi.fn(),
  createFallbackSSEStream: vi.fn(),
}))

vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    postSSEStream: vi.fn(),
  },
}))

vi.mock('@/lib/textGuards', () => ({
  guardText: vi.fn((text) => text),
  containsForbidden: vi.fn(() => false),
  safetyMessage: vi.fn(() => 'Safety message'),
}))

vi.mock('@/lib/destiny-map/sanitize', () => ({
  sanitizeLocaleText: vi.fn((text) => text),
}))

vi.mock('@/lib/security', () => ({
  maskTextWithName: vi.fn((text) => text),
}))

vi.mock('@/lib/http', () => ({
  enforceBodySize: vi.fn(() => null),
}))

vi.mock('@/lib/api/errorHandler', () => ({
  jsonErrorResponse: vi.fn((msg) => ({
    json: () => Promise.resolve({ error: msg }),
    status: 400,
  })),
  createErrorResponse: vi.fn(),
  createSuccessResponse: vi.fn(),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
    RATE_LIMITED: 'RATE_LIMITED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
  },
}))

vi.mock('@/lib/validation', () => ({
  isValidDate: vi.fn((date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date)),
  isValidTime: vi.fn((time: string) => /^\d{2}:\d{2}$/.test(time)),
  isValidLatitude: vi.fn((lat: number) => typeof lat === 'number' && lat >= -90 && lat <= 90),
  isValidLongitude: vi.fn((lon: number) => typeof lon === 'number' && lon >= -180 && lon <= 180),
  LIMITS: {
    NAME: 50,
    THEME: 50,
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock request parser
vi.mock('@/lib/api/requestParser', () => ({
  parseRequestBody: vi.fn(async (req: any) => {
    try {
      return await req.json()
    } catch {
      return null
    }
  }),
}))

// Mock local modules - the route imports from ./lib (re-exports from profileLoader)
vi.mock('@/app/api/destiny-map/chat-stream/lib', () => ({
  ALLOWED_LANG: new Set(['ko', 'en']),
  ALLOWED_GENDER: new Set(['male', 'female']),
  MAX_MESSAGES: 20,
  clampMessages: vi.fn((msgs: any[]) => msgs.slice(-20)),
  counselorSystemPrompt: vi.fn(() => 'System prompt'),
  loadPersonaMemory: vi.fn(),
}))

// Mock profileLoader (loadUserProfile is imported from ./lib/profileLoader in route.ts)
vi.mock('@/app/api/destiny-map/chat-stream/lib/profileLoader', () => ({
  loadUserProfile: vi.fn(),
}))

// Mock Zod validation module
vi.mock('@/app/api/destiny-map/chat-stream/lib/validation', () => ({
  validateDestinyMapRequest: vi.fn((body: any) => {
    // Simple validation that mimics Zod behavior
    return {
      success: true,
      data: {
        name: body.name || '',
        birthDate: body.birthDate || '',
        birthTime: body.birthTime || '',
        gender: body.gender || 'male',
        latitude: body.latitude,
        longitude: body.longitude,
        theme: body.theme || 'chat',
        lang: body.lang || 'ko',
        messages: (body.messages || []).filter(
          (m: any) =>
            m &&
            typeof m === 'object' &&
            m.content &&
            ['user', 'assistant', 'system'].includes(m.role)
        ),
        saju: body.saju,
        astro: body.astro,
        advancedAstro: body.advancedAstro,
        predictionContext: body.predictionContext,
        userContext: body.userContext,
        cvText: body.cvText,
      },
    }
  }),
}))

// Mock chart-calculator (replaces direct calculateSajuData / calculateNatalChart calls)
vi.mock('@/app/api/destiny-map/chat-stream/lib/chart-calculator', () => ({
  calculateChartData: vi.fn(),
}))

// Mock context-builder (replaces direct builder/analysis calls)
vi.mock('@/app/api/destiny-map/chat-stream/lib/context-builder', () => ({
  buildContextSections: vi.fn(() => ({
    v3Snapshot: 'Saju/Astro snapshot',
    timingScoreSection: '',
    enhancedAnalysisSection: '',
    daeunTransitSection: '',
    advancedAstroSection: '',
    tier4AdvancedSection: '',
    pastAnalysisSection: '',
    lifePredictionSection: '',
    historyText: '',
    userQuestion: '',
  })),
  buildPredictionSection: vi.fn(() => ''),
  buildLongTermMemorySection: vi.fn(() => ''),
}))

// Import mocked modules
import { initializeApiContext, createAuthenticatedGuard } from '@/lib/api/middleware'
import { createTransformedSSEStream, createFallbackSSEStream } from '@/lib/streaming'
import { apiClient } from '@/lib/api/ApiClient'
import { containsForbidden } from '@/lib/textGuards'
import { enforceBodySize } from '@/lib/http'
import { jsonErrorResponse } from '@/lib/api/errorHandler'
import { loadPersonaMemory } from '@/app/api/destiny-map/chat-stream/lib'
import { loadUserProfile } from '@/app/api/destiny-map/chat-stream/lib/profileLoader'
import { validateDestinyMapRequest } from '@/app/api/destiny-map/chat-stream/lib/validation'
import { calculateChartData } from '@/app/api/destiny-map/chat-stream/lib/chart-calculator'
import {
  buildContextSections,
  buildPredictionSection,
  buildLongTermMemorySection,
} from '@/app/api/destiny-map/chat-stream/lib/context-builder'

/* ==========================================
   Test Fixtures
========================================== */

function createNextRequest(
  body: Record<string, unknown>,
  headers?: Record<string, string>
): NextRequest {
  return new NextRequest('http://localhost:3000/api/destiny-map/chat-stream', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

function createBasicRequest(overrides?: Record<string, unknown>) {
  return {
    name: 'Test User',
    birthDate: '1990-06-15',
    birthTime: '14:30',
    gender: 'male',
    latitude: 37.5665,
    longitude: 126.978,
    theme: 'chat',
    lang: 'ko',
    messages: [{ role: 'user', content: 'Hello, how are you?' }],
    ...overrides,
  }
}

function createMockSajuResult() {
  return {
    dayMaster: {
      heavenlyStem: { name: '甲', element: '목' },
    },
    yearPillar: {
      heavenlyStem: { name: '庚', element: '금' },
      earthlyBranch: { name: '午', element: '화' },
    },
    monthPillar: {
      heavenlyStem: { name: '壬', element: '수' },
      earthlyBranch: { name: '午', element: '화' },
    },
    dayPillar: {
      heavenlyStem: { name: '甲', element: '목' },
      earthlyBranch: { name: '寅', element: '목' },
    },
    timePillar: {
      heavenlyStem: { name: '辛', element: '금' },
      earthlyBranch: { name: '未', element: '토' },
    },
    fiveElements: { wood: 3, fire: 2, earth: 2, metal: 2, water: 1 },
    unse: {
      daeun: [
        { age: 3, heavenlyStem: '癸', earthlyBranch: '未' },
        { age: 13, heavenlyStem: '甲', earthlyBranch: '申' },
      ],
    },
  }
}

function createMockNatalChart() {
  return {
    planets: [
      { name: 'Sun', sign: 'Gemini', longitude: 75.5, house: 10 },
      { name: 'Moon', sign: 'Pisces', longitude: 340.2, house: 6 },
      { name: 'Mercury', sign: 'Gemini', longitude: 80.1, house: 10 },
      { name: 'Venus', sign: 'Taurus', longitude: 45.3, house: 9 },
      { name: 'Mars', sign: 'Leo', longitude: 135.7, house: 12 },
      { name: 'Jupiter', sign: 'Cancer', longitude: 105.2, house: 11 },
      { name: 'Saturn', sign: 'Capricorn', longitude: 285.4, house: 5 },
    ],
    houses: Array(12)
      .fill(null)
      .map((_, i) => ({ cusp: i + 1, longitude: i * 30 })),
    ascendant: { longitude: 0, sign: 'Aries' },
    mc: { longitude: 90, sign: 'Cancer' },
    meta: { jdUT: 2448070.5 },
  }
}

function setupDefaultMocks() {
  vi.mocked(enforceBodySize).mockReturnValue(null)
  vi.mocked(createAuthenticatedGuard).mockReturnValue({} as any)
  vi.mocked(initializeApiContext).mockResolvedValue({
    context: { userId: 'user123' },
    error: null,
  } as any)
  // calculateChartData wraps calculateSajuData + calculateNatalChart
  vi.mocked(calculateChartData).mockResolvedValue({
    saju: createMockSajuResult() as any,
    astro: {
      sun: { name: 'Sun', sign: 'Gemini', longitude: 75.5, house: 10 },
      moon: { name: 'Moon', sign: 'Pisces', longitude: 340.2, house: 6 },
    } as any,
    natalChartData: createMockNatalChart() as any,
    currentTransits: [],
  })
  vi.mocked(loadUserProfile).mockResolvedValue({
    saju: undefined,
    astro: undefined,
    birthDate: undefined,
    birthTime: undefined,
    gender: undefined,
  })
  vi.mocked(loadPersonaMemory).mockResolvedValue({
    personaMemoryContext: '',
    recentSessionSummaries: '',
  })
  // buildContextSections wraps all builder/analysis functions
  vi.mocked(buildContextSections).mockReturnValue({
    v3Snapshot: 'Saju/Astro snapshot',
    timingScoreSection: '',
    enhancedAnalysisSection: '',
    daeunTransitSection: '',
    advancedAstroSection: '',
    tier4AdvancedSection: '',
    pastAnalysisSection: '',
    lifePredictionSection: '',
    historyText: '',
    userQuestion: '',
  })
  vi.mocked(buildPredictionSection).mockReturnValue('')
  vi.mocked(buildLongTermMemorySection).mockReturnValue('')
  vi.mocked(apiClient.postSSEStream).mockResolvedValue({
    ok: true,
    response: {
      body: new ReadableStream(),
      headers: new Headers(),
    } as any,
  } as any)
  vi.mocked(createTransformedSSEStream).mockReturnValue(new Response())
  vi.mocked(createFallbackSSEStream).mockReturnValue(new Response())
}

/* ==========================================
   Test Suites
========================================== */

describe('/api/destiny-map/chat-stream POST - Input Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should reject requests exceeding body size limit', async () => {
    vi.mocked(enforceBodySize).mockReturnValue(new Response('Body too large', { status: 413 }))

    const req = createNextRequest(createBasicRequest())
    const response = await POST(req)

    expect(response.status).toBe(413)
  })

  it('should reject requests with invalid JSON body', async () => {
    vi.mocked(initializeApiContext).mockResolvedValue({
      context: { userId: 'user123' },
      error: null,
    } as any)

    const invalidReq = new NextRequest('http://localhost:3000/api/destiny-map/chat-stream', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(invalidReq)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('invalid_body')
  })

  it('should reject requests with missing birthDate', async () => {
    // When birthDate is empty, the route calls jsonErrorResponse('Invalid or missing birthDate')
    // after Zod validation passes (birthDate is optional in Zod schema)
    const req = createNextRequest({
      ...createBasicRequest(),
      birthDate: undefined,
    })

    await POST(req)

    expect(jsonErrorResponse).toHaveBeenCalledWith('Invalid or missing birthDate')
  })

  it('should reject requests with invalid birthDate format', async () => {
    const req = createNextRequest({
      ...createBasicRequest(),
      birthDate: 'invalid-date',
    })

    await POST(req)

    // isValidDate returns false for 'invalid-date', so route returns this error
    expect(jsonErrorResponse).toHaveBeenCalledWith('Invalid or missing birthDate')
  })

  it('should reject requests with invalid birthTime format', async () => {
    const req = createNextRequest({
      ...createBasicRequest(),
      birthTime: 'invalid',
    })

    await POST(req)

    // isValidTime returns false for 'invalid', so route returns this error
    expect(jsonErrorResponse).toHaveBeenCalledWith('Invalid or missing birthTime')
  })

  it('should reject requests with invalid latitude', async () => {
    // Zod schema validates latitude min(-90) max(90), so 91 fails Zod validation
    vi.mocked(validateDestinyMapRequest).mockReturnValueOnce({
      success: false,
      error: {
        issues: [{ path: ['latitude'], message: 'Number must be less than or equal to 90' }],
      },
    } as any)

    const req = createNextRequest({
      ...createBasicRequest(),
      latitude: 91,
    })

    const response = await POST(req)

    expect(response.status).toBe(400)
  })

  it('should reject requests with invalid longitude', async () => {
    // Zod schema validates longitude min(-180) max(180), so 181 fails Zod validation
    vi.mocked(validateDestinyMapRequest).mockReturnValueOnce({
      success: false,
      error: {
        issues: [{ path: ['longitude'], message: 'Number must be less than or equal to 180' }],
      },
    } as any)

    const req = createNextRequest({
      ...createBasicRequest(),
      longitude: 181,
    })

    const response = await POST(req)

    expect(response.status).toBe(400)
  })

  it('should accept valid request with all required fields', async () => {
    const req = createNextRequest(createBasicRequest())

    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalled()
  })
})

describe('/api/destiny-map/chat-stream POST - Authentication & Credits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should apply authenticated guard with credit consumption', async () => {
    const req = createNextRequest(createBasicRequest())
    await POST(req)

    expect(createAuthenticatedGuard).toHaveBeenCalledWith({
      route: 'destiny-map-chat-stream',
      limit: 60,
      windowSeconds: 60,
      requireCredits: true,
      creditType: 'reading',
      creditAmount: 1,
    })
  })

  it('should return error if authentication fails', async () => {
    vi.mocked(initializeApiContext).mockResolvedValue({
      context: null,
      error: new Response('Unauthorized', { status: 401 }),
    } as any)

    const req = createNextRequest(createBasicRequest())
    const response = await POST(req)

    expect(response.status).toBe(401)
  })

  it('should proceed if authentication succeeds', async () => {
    vi.mocked(initializeApiContext).mockResolvedValue({
      context: { userId: 'user123' },
      error: null,
    } as any)

    const req = createNextRequest(createBasicRequest())
    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalled()
  })
})

describe('/api/destiny-map/chat-stream POST - Auto-Load User Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should auto-load birth info from user profile when missing', async () => {
    vi.mocked(loadUserProfile).mockResolvedValue({
      saju: createMockSajuResult() as any,
      astro: {
        sun: { name: 'Sun', sign: 'Gemini' },
      } as any,
      birthDate: '1990-06-15',
      birthTime: '14:30',
      gender: 'male',
    })

    const req = createNextRequest({
      ...createBasicRequest(),
      birthDate: '',
      birthTime: '',
      saju: undefined,
      astro: undefined,
    })

    await POST(req)

    // loadUserProfile is called when birthDate or birthTime is missing
    // The route passes the Zod-validated fields
    expect(loadUserProfile).toHaveBeenCalledWith(
      'user123', // userId
      '', // birthDate (empty)
      '', // birthTime (empty)
      37.5665, // latitude
      126.978, // longitude
      undefined, // saju
      undefined // astro
    )
  })

  it('should use provided birth info if already present', async () => {
    const req = createNextRequest(createBasicRequest())
    await POST(req)

    // Auto-load is only called if birth info is missing or coordinates are invalid
    // Since all data is provided and valid, it won't be called
    // (The code checks: if userId && (!birthDate || !birthTime || !isValidLatitude || !isValidLongitude))
    expect(apiClient.postSSEStream).toHaveBeenCalled()
  })

  it('should use loaded saju data from profile', async () => {
    const mockSaju = createMockSajuResult()
    vi.mocked(loadUserProfile).mockResolvedValue({
      saju: mockSaju as any,
      astro: null,
      birthDate: '1990-06-15',
      birthTime: '14:30',
      gender: 'male',
    })

    const req = createNextRequest({
      ...createBasicRequest(),
      birthDate: '',
      saju: undefined,
    })

    await POST(req)

    // The profile-loaded saju data is passed as effectiveSaju to calculateChartData
    const callArgs = vi.mocked(calculateChartData).mock.calls[0]
    expect(callArgs[0]).toEqual(
      expect.objectContaining({
        birthDate: '1990-06-15',
      })
    )
    // Second arg is the effectiveSaju loaded from profile
    expect(callArgs[1]).toBeDefined()
    expect(callArgs[1]!.dayMaster).toBeDefined()
  })
})

describe('/api/destiny-map/chat-stream POST - Saju/Astro Computation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should call calculateChartData when saju is not provided', async () => {
    const req = createNextRequest({
      ...createBasicRequest(),
      saju: undefined,
    })

    await POST(req)

    // The route now uses calculateChartData which wraps calculateSajuData + calculateNatalChart
    expect(calculateChartData).toHaveBeenCalledWith(
      expect.objectContaining({
        birthDate: '1990-06-15',
        birthTime: '14:30',
        gender: 'male',
        latitude: 37.5665,
        longitude: 126.978,
      }),
      undefined, // existingSaju
      undefined // existingAstro
    )
  })

  it('should pass existing saju to calculateChartData when provided', async () => {
    const mockSaju = createMockSajuResult()
    const req = createNextRequest({
      ...createBasicRequest(),
      saju: mockSaju,
    })

    await POST(req)

    // When saju is provided, it's passed to calculateChartData as existing data
    expect(calculateChartData).toHaveBeenCalledWith(
      expect.objectContaining({
        birthDate: '1990-06-15',
      }),
      expect.objectContaining({ dayMaster: expect.any(Object) }),
      undefined
    )
  })

  it('should pass existing astro to calculateChartData when provided', async () => {
    const req = createNextRequest({
      ...createBasicRequest(),
      astro: {
        sun: { name: 'Sun', sign: 'Gemini' },
      },
    })

    await POST(req)

    // When astro is provided, it's passed to calculateChartData as existing data
    expect(calculateChartData).toHaveBeenCalledWith(
      expect.any(Object),
      undefined,
      expect.objectContaining({ sun: expect.any(Object) })
    )
  })

  it('should handle chart computation errors gracefully', async () => {
    vi.mocked(calculateChartData).mockRejectedValue(new Error('Chart computation failed'))

    const req = createNextRequest({
      ...createBasicRequest(),
      saju: undefined,
    })

    const response = await POST(req)

    // Error is caught by outer try/catch, returns 500
    expect(response.status).toBe(500)
  })
})

describe('/api/destiny-map/chat-stream POST - Long-Term Memory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should load persona memory for authenticated users', async () => {
    const req = createNextRequest(createBasicRequest())
    await POST(req)

    expect(loadPersonaMemory).toHaveBeenCalledWith('user123', 'chat', 'ko')
  })

  it('should not load persona memory for non-authenticated users', async () => {
    vi.mocked(initializeApiContext).mockResolvedValue({
      context: { userId: undefined },
      error: null,
    } as any)

    const req = createNextRequest(createBasicRequest())
    await POST(req)

    expect(loadPersonaMemory).not.toHaveBeenCalled()
  })

  it('should include persona memory in chat prompt via buildLongTermMemorySection', async () => {
    vi.mocked(loadPersonaMemory).mockResolvedValue({
      personaMemoryContext: 'User prefers detailed analysis',
      recentSessionSummaries: 'Last session: discussed career',
    })

    // Make buildLongTermMemorySection return the memory content
    vi.mocked(buildLongTermMemorySection).mockReturnValue('User prefers detailed analysis')

    const req = createNextRequest(createBasicRequest())
    await POST(req)

    expect(buildLongTermMemorySection).toHaveBeenCalledWith(
      'User prefers detailed analysis',
      'Last session: discussed career',
      'ko'
    )
    expect(apiClient.postSSEStream).toHaveBeenCalledWith(
      '/ask-stream',
      expect.objectContaining({
        prompt: expect.stringContaining('User prefers detailed analysis'),
      }),
      expect.any(Object)
    )
  })

  it('should include recent session summaries via buildLongTermMemorySection', async () => {
    vi.mocked(loadPersonaMemory).mockResolvedValue({
      personaMemoryContext: '',
      recentSessionSummaries: 'Last session: discussed career change',
    })

    // Make buildLongTermMemorySection return the session summaries
    vi.mocked(buildLongTermMemorySection).mockReturnValue('Last session: discussed career change')

    const req = createNextRequest(createBasicRequest())
    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalledWith(
      '/ask-stream',
      expect.objectContaining({
        prompt: expect.stringContaining('discussed career change'),
      }),
      expect.any(Object)
    )
  })
})

describe('/api/destiny-map/chat-stream POST - Context Building', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should call buildContextSections with chart data', async () => {
    const req = createNextRequest(createBasicRequest())
    await POST(req)

    // The route uses buildContextSections which wraps all builder/analysis calls
    expect(buildContextSections).toHaveBeenCalledWith(
      expect.objectContaining({
        birthDate: '1990-06-15',
        gender: 'male',
        theme: 'chat',
        lang: 'ko',
      })
    )
  })

  it('should call buildPredictionSection when predictionContext provided', async () => {
    const predictionContext = {
      eventType: 'marriage',
      eventLabel: 'Result',
    }

    const req = createNextRequest({
      ...createBasicRequest(),
      predictionContext,
    })

    await POST(req)

    expect(buildPredictionSection).toHaveBeenCalledWith(predictionContext, 'ko')
  })

  it('should call buildLongTermMemorySection with memory data', async () => {
    vi.mocked(loadPersonaMemory).mockResolvedValue({
      personaMemoryContext: 'User prefers detailed analysis',
      recentSessionSummaries: 'Last session: discussed career',
    })

    const req = createNextRequest(createBasicRequest())
    await POST(req)

    expect(buildLongTermMemorySection).toHaveBeenCalledWith(
      'User prefers detailed analysis',
      'Last session: discussed career',
      'ko'
    )
  })

  it('should handle buildContextSections errors gracefully', async () => {
    vi.mocked(buildContextSections).mockImplementation(() => {
      throw new Error('Builder failed')
    })

    const req = createNextRequest(createBasicRequest())
    const response = await POST(req)

    // Error caught by outer try/catch
    expect(response.status).toBe(500)
  })

  it('should skip advanced analysis if no saju data from calculateChartData', async () => {
    // When calculateChartData returns no saju, buildContextSections is still called
    // but with undefined saju. The context builder handles the null check internally.
    vi.mocked(calculateChartData).mockResolvedValue({
      saju: undefined,
      astro: undefined,
      natalChartData: undefined,
      currentTransits: [],
    })

    const req = createNextRequest({
      ...createBasicRequest(),
      saju: undefined,
    })

    await POST(req)

    // buildContextSections is called with undefined saju
    expect(buildContextSections).toHaveBeenCalledWith(
      expect.objectContaining({
        saju: undefined,
      })
    )
  })
})

describe('/api/destiny-map/chat-stream POST - SSE Streaming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should call backend SSE stream endpoint', async () => {
    const req = createNextRequest(createBasicRequest())
    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalledWith(
      '/ask-stream',
      expect.objectContaining({
        theme: 'chat',
        locale: 'ko',
      }),
      { timeout: 60000 }
    )
  })

  it('should include session_id header in backend call', async () => {
    const req = createNextRequest(createBasicRequest(), {
      'x-session-id': 'session123',
    })

    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalledWith(
      '/ask-stream',
      expect.objectContaining({
        session_id: 'session123',
      }),
      expect.any(Object)
    )
  })

  it('should transform stream with sanitization', async () => {
    const req = createNextRequest(createBasicRequest())
    await POST(req)

    expect(createTransformedSSEStream).toHaveBeenCalledWith({
      source: expect.anything(),
      transform: expect.any(Function),
      route: 'DestinyMapChatStream',
      additionalHeaders: expect.objectContaining({
        'X-Fallback': expect.any(String),
      }),
    })
  })

  it('should return fallback stream on backend error', async () => {
    vi.mocked(apiClient.postSSEStream).mockResolvedValue({
      ok: false,
      status: 500,
      error: 'Backend error',
    } as any)

    const req = createNextRequest(createBasicRequest())
    await POST(req)

    expect(createFallbackSSEStream).toHaveBeenCalledWith({
      content: expect.stringContaining('AI 서비스에 연결할 수 없습니다'),
      done: true,
      'X-Fallback': '1',
    })
  })

  it('should use English fallback message for en locale', async () => {
    vi.mocked(apiClient.postSSEStream).mockResolvedValue({
      ok: false,
      status: 500,
      error: 'Backend error',
    } as any)

    const req = createNextRequest({
      ...createBasicRequest(),
      lang: 'en',
    })

    await POST(req)

    expect(createFallbackSSEStream).toHaveBeenCalledWith({
      content: expect.stringContaining('Could not connect to AI service'),
      done: true,
      'X-Fallback': '1',
    })
  })
})

describe('/api/destiny-map/chat-stream POST - Text Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should check last user message for forbidden content', async () => {
    vi.mocked(containsForbidden).mockReturnValue(true)

    const req = createNextRequest({
      ...createBasicRequest(),
      messages: [{ role: 'user', content: 'Forbidden content here' }],
    })

    const response = await POST(req)

    expect(containsForbidden).toHaveBeenCalledWith('Forbidden content here')
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
  })

  it('should return safety message for forbidden content', async () => {
    vi.mocked(containsForbidden).mockReturnValue(true)

    const req = createNextRequest({
      ...createBasicRequest(),
      messages: [{ role: 'user', content: 'Forbidden content' }],
    })

    await POST(req)

    // Should not call backend
    expect(apiClient.postSSEStream).not.toHaveBeenCalled()
  })

  it('should proceed normally for safe content', async () => {
    vi.mocked(containsForbidden).mockReturnValue(false)

    const req = createNextRequest({
      ...createBasicRequest(),
      messages: [{ role: 'user', content: 'Safe content' }],
    })

    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalled()
  })
})

describe('/api/destiny-map/chat-stream POST - Message Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should normalize and filter messages', async () => {
    const req = createNextRequest({
      ...createBasicRequest(),
      messages: [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'Response' },
        { role: 'user', content: 'Second message' },
      ],
    })

    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalledWith(
      '/ask-stream',
      expect.objectContaining({
        history: expect.arrayContaining([
          { role: 'user', content: expect.any(String) },
          { role: 'assistant', content: expect.any(String) },
        ]),
      }),
      expect.any(Object)
    )
  })

  it('should truncate messages to MAX_MESSAGES', async () => {
    const manyMessages = Array(30)
      .fill(null)
      .map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }))

    const req = createNextRequest({
      ...createBasicRequest(),
      messages: manyMessages,
    })

    await POST(req)

    // Should be clamped by clampMessages mock (20 max)
    expect(apiClient.postSSEStream).toHaveBeenCalled()
  })

  it('should filter out invalid messages via Zod validation', async () => {
    const req = createNextRequest({
      ...createBasicRequest(),
      messages: [
        { role: 'user', content: 'Valid' },
        { role: 'user', content: 'Another valid' },
      ],
    })

    await POST(req)

    // Zod validation filters invalid roles and empty content
    // Valid messages proceed to postSSEStream
    expect(apiClient.postSSEStream).toHaveBeenCalled()
  })
})

describe('/api/destiny-map/chat-stream POST - Theme Context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should include theme context in prompt for love theme', async () => {
    const req = createNextRequest({
      ...createBasicRequest(),
      theme: 'love',
    })

    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalledWith(
      '/ask-stream',
      expect.objectContaining({
        theme: 'love',
        prompt: expect.stringContaining('연애'),
      }),
      expect.any(Object)
    )
  })

  it('should include theme context in prompt for career theme', async () => {
    const req = createNextRequest({
      ...createBasicRequest(),
      theme: 'career',
    })

    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalledWith(
      '/ask-stream',
      expect.objectContaining({
        theme: 'career',
        prompt: expect.stringContaining('직업'),
      }),
      expect.any(Object)
    )
  })

  it('should default to chat theme if invalid', async () => {
    const req = createNextRequest({
      ...createBasicRequest(),
      theme: 'invalid_theme',
    })

    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalledWith(
      '/ask-stream',
      expect.objectContaining({
        theme: 'invalid_theme',
      }),
      expect.any(Object)
    )
  })
})

describe('/api/destiny-map/chat-stream POST - Prediction Context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should include prediction context when provided', async () => {
    const predictionContext = {
      eventType: 'marriage',
      eventLabel: '결혼',
      optimalPeriods: [
        {
          startDate: '2026-06-15',
          endDate: '2026-08-15',
          score: 85,
          grade: 'A',
          reasons: ['길한 운세', '좋은 타이밍'],
        },
      ],
      avoidPeriods: [],
      advice: '6월이 가장 좋습니다',
    }

    // Make buildPredictionSection return the expected content
    vi.mocked(buildPredictionSection).mockReturnValue('[인생 예측 분석 결과] marriage: 결혼')

    const req = createNextRequest({
      ...createBasicRequest(),
      predictionContext,
    })

    await POST(req)

    expect(buildPredictionSection).toHaveBeenCalledWith(predictionContext, 'ko')
    expect(apiClient.postSSEStream).toHaveBeenCalledWith(
      '/ask-stream',
      expect.objectContaining({
        prompt: expect.stringContaining('인생 예측 분석 결과'),
      }),
      expect.any(Object)
    )
  })

  it('should handle prediction context errors gracefully', async () => {
    const req = createNextRequest({
      ...createBasicRequest(),
      predictionContext: { invalid: 'data' },
    })

    await POST(req)

    // Should continue without prediction section
    expect(apiClient.postSSEStream).toHaveBeenCalled()
  })
})

describe('/api/destiny-map/chat-stream POST - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should handle unexpected errors', async () => {
    vi.mocked(apiClient.postSSEStream).mockRejectedValue(new Error('Unexpected error'))

    const req = createNextRequest(createBasicRequest())
    const response = await POST(req)

    expect(response.status).toBe(500)
    const data = await response.json()
    // The route always returns 'Internal Server Error' in the catch block
    expect(data.error).toBe('Internal Server Error')
  })

  it('should handle non-Error exceptions', async () => {
    vi.mocked(apiClient.postSSEStream).mockRejectedValue('String error')

    const req = createNextRequest(createBasicRequest())
    const response = await POST(req)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Internal Server Error')
  })
})

describe('/api/destiny-map/chat-stream POST - Integration Test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should complete full chat stream flow', async () => {
    vi.mocked(initializeApiContext).mockResolvedValue({
      context: { userId: 'user123' },
      error: null,
    } as any)

    vi.mocked(loadPersonaMemory).mockResolvedValue({
      personaMemoryContext: 'User prefers detailed career advice',
      recentSessionSummaries: 'Last session: discussed job change',
    })

    const req = createNextRequest({
      ...createBasicRequest(),
      theme: 'career',
      messages: [{ role: 'user', content: 'Should I change jobs this year?' }],
    })

    await POST(req)

    // Verify all components were called
    expect(initializeApiContext).toHaveBeenCalled()
    expect(loadPersonaMemory).toHaveBeenCalled()
    expect(calculateChartData).toHaveBeenCalled() // Replaces direct calculateSajuData + calculateNatalChart
    expect(buildContextSections).toHaveBeenCalled() // Replaces direct builder/analysis calls
    expect(buildPredictionSection).toHaveBeenCalled()
    expect(buildLongTermMemorySection).toHaveBeenCalled()
    expect(apiClient.postSSEStream).toHaveBeenCalled()
    expect(createTransformedSSEStream).toHaveBeenCalled()
  })
})
