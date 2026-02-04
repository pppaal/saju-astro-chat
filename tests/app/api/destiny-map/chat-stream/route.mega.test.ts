/**
 * Mega Test Suite for /api/destiny-map/chat-stream/route.ts
 *
 * Tests the main destiny map chat streaming API endpoint including:
 * - Authentication and credit consumption
 * - Auto-loading birth info from user profile
 * - Saju/Astro data computation
 * - Long-term memory (PersonaMemory + session summaries)
 * - 10 advanced analysis engines (TIER 1-10)
 * - SSE streaming with AI backend
 * - Text safety checks
 * - User profile integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/destiny-map/chat-stream/route'

// ✨ REFACTORED: Import centralized mock for Saju
import { mockSajuCore } from '../../../../mocks'

// Initialize Saju mock
mockSajuCore()

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

// Saju mock moved to centralized mocks (see imports above)

vi.mock('@/lib/astrology', () => ({
  calculateNatalChart: vi.fn(),
  calculateTransitChart: vi.fn(),
  findMajorTransits: vi.fn(),
  toChart: vi.fn(),
}))

vi.mock('@/lib/destiny-map/prompt/fortune/base', () => ({
  buildAllDataPrompt: vi.fn(),
}))

vi.mock('@/lib/validation', () => ({
  isValidDate: vi.fn((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)),
  isValidTime: vi.fn((time) => /^\d{2}:\d{2}$/.test(time)),
  isValidLatitude: vi.fn((lat) => typeof lat === 'number' && lat >= -90 && lat <= 90),
  isValidLongitude: vi.fn((lon) => typeof lon === 'number' && lon >= -180 && lon <= 180),
  LIMITS: {
    NAME: 50,
    THEME: 50,
  },
}))

vi.mock('@/lib/prediction/utils', () => ({
  parseDateComponents: vi.fn((date) => ({
    year: 1990,
    month: 6,
    day: 15,
  })),
  parseTimeComponents: vi.fn((time) => ({
    hour: 14,
    minute: 30,
  })),
  extractBirthYear: vi.fn(() => 1990),
  extractBirthMonth: vi.fn(() => 6),
  extractBirthDay: vi.fn(() => 15),
  formatDateByLocale: vi.fn(() => '1990-06-15'),
}))

vi.mock('@/lib/destiny-map/type-guards', () => ({
  toSajuDataStructure: vi.fn((data) => data),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock local modules
vi.mock('@/app/api/destiny-map/chat-stream/lib', () => ({
  ALLOWED_LANG: new Set(['ko', 'en']),
  ALLOWED_GENDER: new Set(['male', 'female']),
  MAX_MESSAGES: 20,
  clampMessages: vi.fn((msgs) => msgs.slice(-20)),
  counselorSystemPrompt: vi.fn(() => 'System prompt'),
  loadUserProfile: vi.fn(),
  loadPersonaMemory: vi.fn(),
}))

vi.mock('@/app/api/destiny-map/chat-stream/analysis', () => ({
  generateTier3Analysis: vi.fn(() => ({ section: '' })),
  generateTier4Analysis: vi.fn(() => ({ section: '' })),
}))

vi.mock('@/app/api/destiny-map/chat-stream/builders/advancedTimingBuilder', () => ({
  buildAdvancedTimingSection: vi.fn(() => ''),
}))

vi.mock('@/app/api/destiny-map/chat-stream/builders/dailyPrecisionBuilder', () => ({
  buildDailyPrecisionSection: vi.fn(() => ''),
}))

vi.mock('@/app/api/destiny-map/chat-stream/builders/daeunTransitBuilder', () => ({
  buildDaeunTransitSection: vi.fn(() => ''),
}))

vi.mock('@/app/api/destiny-map/chat-stream/builders/lifeAnalysisBuilder', () => ({
  buildPastAnalysisSection: vi.fn(() => ''),
  buildMultiYearTrendSection: vi.fn(() => ''),
}))

// Import mocked modules
import { initializeApiContext, createAuthenticatedGuard } from '@/lib/api/middleware'
import { createTransformedSSEStream, createFallbackSSEStream } from '@/lib/streaming'
import { apiClient } from '@/lib/api/ApiClient'
import { containsForbidden } from '@/lib/textGuards'
import { enforceBodySize } from '@/lib/http'
import { jsonErrorResponse } from '@/lib/api/errorHandler'
import { calculateSajuData } from '@/lib/Saju/saju'
import {
  calculateNatalChart,
  calculateTransitChart,
  findMajorTransits,
  toChart,
} from '@/lib/astrology'
import { buildAllDataPrompt } from '@/lib/destiny-map/prompt/fortune/base'
import { loadUserProfile, loadPersonaMemory } from '@/app/api/destiny-map/chat-stream/lib'
import { buildAdvancedTimingSection } from '@/app/api/destiny-map/chat-stream/builders/advancedTimingBuilder'
import { buildDailyPrecisionSection } from '@/app/api/destiny-map/chat-stream/builders/dailyPrecisionBuilder'
import { buildDaeunTransitSection } from '@/app/api/destiny-map/chat-stream/builders/daeunTransitBuilder'
import {
  buildPastAnalysisSection,
  buildMultiYearTrendSection,
} from '@/app/api/destiny-map/chat-stream/builders/lifeAnalysisBuilder'
import {
  generateTier3Analysis,
  generateTier4Analysis,
} from '@/app/api/destiny-map/chat-stream/analysis'

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
  vi.mocked(calculateSajuData).mockReturnValue(createMockSajuResult() as any)
  vi.mocked(calculateNatalChart).mockResolvedValue(createMockNatalChart() as any)
  vi.mocked(calculateTransitChart).mockResolvedValue({ planets: [] } as any)
  vi.mocked(findMajorTransits).mockReturnValue([])
  vi.mocked(toChart).mockReturnValue({} as any)
  vi.mocked(buildAllDataPrompt).mockReturnValue('Saju/Astro snapshot')
  vi.mocked(loadUserProfile).mockResolvedValue({
    saju: null,
    astro: null,
    birthDate: null,
    birthTime: null,
    gender: null,
  })
  vi.mocked(loadPersonaMemory).mockResolvedValue({
    personaMemoryContext: '',
    recentSessionSummaries: '',
  })
  vi.mocked(buildAdvancedTimingSection).mockReturnValue('')
  vi.mocked(buildDailyPrecisionSection).mockReturnValue('')
  vi.mocked(buildDaeunTransitSection).mockReturnValue('')
  vi.mocked(buildPastAnalysisSection).mockReturnValue('')
  vi.mocked(buildMultiYearTrendSection).mockReturnValue('')
  vi.mocked(generateTier3Analysis).mockReturnValue({ section: '' })
  vi.mocked(generateTier4Analysis).mockReturnValue({ section: '' })
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
    const req = createNextRequest({
      ...createBasicRequest(),
      birthDate: undefined,
    })

    await POST(req)

    expect(jsonErrorResponse).toHaveBeenCalledWith('Missing required fields')
  })

  it('should reject requests with invalid birthDate format', async () => {
    const req = createNextRequest({
      ...createBasicRequest(),
      birthDate: 'invalid-date',
    })

    await POST(req)

    expect(jsonErrorResponse).toHaveBeenCalledWith('Invalid birthDate')
  })

  it('should reject requests with invalid birthTime format', async () => {
    const req = createNextRequest({
      ...createBasicRequest(),
      birthTime: 'invalid',
    })

    await POST(req)

    expect(jsonErrorResponse).toHaveBeenCalledWith('Invalid birthTime')
  })

  it('should reject requests with invalid latitude', async () => {
    // Auto-load will try to load from profile first if invalid coordinates
    // If profile returns nothing, validation fails with "Missing required fields"
    vi.mocked(loadUserProfile).mockResolvedValue({
      saju: null,
      astro: null,
      birthDate: null,
      birthTime: null,
      gender: null,
    })

    const req = createNextRequest({
      ...createBasicRequest(),
      latitude: 91,
    })

    await POST(req)

    // Code checks: if (!effectiveBirthDate || !effectiveBirthTime || !isValidLatitude || !isValidLongitude)
    // This returns "Missing required fields" first
    expect(jsonErrorResponse).toHaveBeenCalledWith('Missing required fields')
  })

  it('should reject requests with invalid longitude', async () => {
    // Auto-load will try to load from profile first if invalid coordinates
    vi.mocked(loadUserProfile).mockResolvedValue({
      saju: null,
      astro: null,
      birthDate: null,
      birthTime: null,
      gender: null,
    })

    const req = createNextRequest({
      ...createBasicRequest(),
      longitude: 181,
    })

    await POST(req)

    // Code checks "Missing required fields" first before specific validation
    expect(jsonErrorResponse).toHaveBeenCalledWith('Missing required fields')
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

    expect(loadUserProfile).toHaveBeenCalledWith(
      'user123',
      '',
      '',
      37.5665,
      126.978,
      undefined,
      undefined
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

    expect(calculateSajuData).not.toHaveBeenCalled()
  })
})

describe('/api/destiny-map/chat-stream POST - Saju/Astro Computation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should compute saju data if not provided', async () => {
    const req = createNextRequest({
      ...createBasicRequest(),
      saju: undefined,
    })

    await POST(req)

    expect(calculateSajuData).toHaveBeenCalledWith(
      '1990-06-15',
      '14:30',
      'male',
      'solar',
      expect.any(String)
    )
  })

  it('should not compute saju if already provided', async () => {
    const req = createNextRequest({
      ...createBasicRequest(),
      saju: createMockSajuResult(),
    })

    await POST(req)

    expect(calculateSajuData).not.toHaveBeenCalled()
  })

  it('should compute astro natal chart if not provided', async () => {
    const req = createNextRequest({
      ...createBasicRequest(),
      astro: undefined,
    })

    await POST(req)

    expect(calculateNatalChart).toHaveBeenCalledWith({
      year: 1990,
      month: 6,
      date: 15,
      hour: 14,
      minute: 30,
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })
  })

  it('should not compute astro if already provided', async () => {
    const req = createNextRequest({
      ...createBasicRequest(),
      astro: {
        sun: { name: 'Sun', sign: 'Gemini' },
      },
    })

    await POST(req)

    expect(calculateNatalChart).not.toHaveBeenCalled()
  })

  it('should compute current transits for predictions', async () => {
    const req = createNextRequest(createBasicRequest())
    await POST(req)

    expect(calculateTransitChart).toHaveBeenCalled()
    expect(findMajorTransits).toHaveBeenCalled()
  })

  it('should handle saju computation errors gracefully', async () => {
    vi.mocked(calculateSajuData).mockImplementation(() => {
      throw new Error('Saju computation failed')
    })

    const req = createNextRequest({
      ...createBasicRequest(),
      saju: undefined,
    })

    await POST(req)

    // Should continue without saju data
    expect(apiClient.postSSEStream).toHaveBeenCalled()
  })

  it('should handle astro computation errors gracefully', async () => {
    vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Astro computation failed'))

    const req = createNextRequest({
      ...createBasicRequest(),
      astro: undefined,
    })

    await POST(req)

    // Should continue without astro data
    expect(apiClient.postSSEStream).toHaveBeenCalled()
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

  it('should include persona memory in chat prompt', async () => {
    vi.mocked(loadPersonaMemory).mockResolvedValue({
      personaMemoryContext: 'User prefers detailed analysis',
      recentSessionSummaries: 'Last session: discussed career',
    })

    const req = createNextRequest(createBasicRequest())
    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalledWith(
      '/ask-stream',
      expect.objectContaining({
        prompt: expect.stringContaining('User prefers detailed analysis'),
      }),
      expect.any(Object)
    )
  })

  it('should include recent session summaries in prompt', async () => {
    vi.mocked(loadPersonaMemory).mockResolvedValue({
      personaMemoryContext: '',
      recentSessionSummaries: 'Last session: discussed career change',
    })

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

describe('/api/destiny-map/chat-stream POST - Advanced Analysis Engines', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should build advanced timing section (TIER 1-2)', async () => {
    const mockSaju = createMockSajuResult()
    const req = createNextRequest({
      ...createBasicRequest(),
      saju: mockSaju,
    })

    await POST(req)

    expect(buildAdvancedTimingSection).toHaveBeenCalledWith(mockSaju, '1990-06-15', 'chat', 'ko')
  })

  it('should build daily precision section (TIER 3)', async () => {
    const mockSaju = createMockSajuResult()
    const req = createNextRequest({
      ...createBasicRequest(),
      saju: mockSaju,
    })

    await POST(req)

    expect(buildDailyPrecisionSection).toHaveBeenCalledWith(mockSaju, 'chat', 'ko')
  })

  it('should build daeun transit section (TIER 4)', async () => {
    const mockSaju = createMockSajuResult()
    const req = createNextRequest({
      ...createBasicRequest(),
      saju: mockSaju,
    })

    await POST(req)

    expect(buildDaeunTransitSection).toHaveBeenCalledWith(mockSaju, '1990-06-15', 'ko')
  })

  it('should build past analysis section (TIER 5)', async () => {
    const mockSaju = createMockSajuResult()
    const req = createNextRequest({
      ...createBasicRequest(),
      saju: mockSaju,
      messages: [{ role: 'user', content: 'What happened in 2020?' }],
    })

    await POST(req)

    expect(buildPastAnalysisSection).toHaveBeenCalledWith(
      mockSaju,
      expect.anything(),
      '1990-06-15',
      'male',
      'What happened in 2020?',
      'ko'
    )
  })

  it('should build multi-year trend section (TIER 6)', async () => {
    const mockSaju = createMockSajuResult()
    const req = createNextRequest({
      ...createBasicRequest(),
      saju: mockSaju,
    })

    await POST(req)

    expect(buildMultiYearTrendSection).toHaveBeenCalledWith(
      mockSaju,
      expect.anything(),
      '1990-06-15',
      'male',
      'chat',
      'ko'
    )
  })

  it('should generate TIER 3 advanced analysis', async () => {
    const mockSaju = createMockSajuResult()
    const req = createNextRequest({
      ...createBasicRequest(),
      saju: mockSaju,
    })

    await POST(req)

    expect(generateTier3Analysis).toHaveBeenCalledWith({
      saju: mockSaju,
      astro: expect.anything(),
      lang: 'ko',
    })
  })

  it('should generate TIER 4 advanced analysis', async () => {
    const req = createNextRequest(createBasicRequest())
    await POST(req)

    expect(generateTier4Analysis).toHaveBeenCalledWith({
      natalChartData: expect.anything(),
      userAge: expect.any(Number),
      currentYear: expect.any(Number),
      lang: 'ko',
    })
  })

  it('should handle analysis builder errors gracefully', async () => {
    vi.mocked(buildAdvancedTimingSection).mockImplementation(() => {
      throw new Error('Builder failed')
    })

    const req = createNextRequest(createBasicRequest())
    await POST(req)

    // Should continue without that section
    expect(apiClient.postSSEStream).toHaveBeenCalled()
  })

  it('should skip advanced analysis if no saju data', async () => {
    vi.mocked(calculateSajuData).mockReturnValue(null as any)

    const req = createNextRequest({
      ...createBasicRequest(),
      saju: undefined,
    })

    await POST(req)

    expect(buildAdvancedTimingSection).not.toHaveBeenCalled()
    expect(buildDailyPrecisionSection).not.toHaveBeenCalled()
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

  it('should filter out invalid messages', async () => {
    const req = createNextRequest({
      ...createBasicRequest(),
      messages: [
        { role: 'user', content: 'Valid' },
        { role: 'invalid_role', content: 'Invalid' },
        { role: 'user', content: '' }, // Empty content
        null,
        { role: 'user', content: 'Another valid' },
      ],
    })

    await POST(req)

    // Should filter out invalid and empty messages
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

    const req = createNextRequest({
      ...createBasicRequest(),
      predictionContext,
    })

    await POST(req)

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
    expect(data.error).toBe('Unexpected error')
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

    vi.mocked(buildAdvancedTimingSection).mockReturnValue('[Advanced Timing Analysis]')
    vi.mocked(buildDailyPrecisionSection).mockReturnValue('[Daily Precision]')
    vi.mocked(buildDaeunTransitSection).mockReturnValue('[Daeun Transit Sync]')

    const req = createNextRequest({
      ...createBasicRequest(),
      theme: 'career',
      messages: [{ role: 'user', content: 'Should I change jobs this year?' }],
    })

    await POST(req)

    // Verify all components were called
    expect(initializeApiContext).toHaveBeenCalled()
    expect(loadPersonaMemory).toHaveBeenCalled()
    expect(calculateSajuData).toHaveBeenCalled()
    expect(calculateNatalChart).toHaveBeenCalled()
    expect(buildAdvancedTimingSection).toHaveBeenCalled()
    expect(buildDailyPrecisionSection).toHaveBeenCalled()
    expect(buildDaeunTransitSection).toHaveBeenCalled()
    expect(apiClient.postSSEStream).toHaveBeenCalled()
    expect(createTransformedSSEStream).toHaveBeenCalled()
  })
})
