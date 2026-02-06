import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============ Mocks (must be before route import) ============

// Mock rate limiting
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}))

// Mock request-ip
vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(() => '192.168.1.1'),
}))

// Mock telemetry
vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}))

// Mock public token auth
vi.mock('@/lib/auth/publicToken', () => ({
  requirePublicToken: vi.fn(),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock HTTP_STATUS
vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
  },
}))

// Mock Zod validation schema
const mockSafeParse = vi.fn()
vi.mock('@/lib/api/astrology-validation', () => ({
  RectificationRequestSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}))

// Mock astrology functions
const mockRectificationResult = {
  bestCandidate: {
    time: new Date('1990-05-15T08:30:00.000Z'),
    ascendantSign: 'Cancer',
    ascendantDegree: 15.5,
    mcSign: 'Pisces',
    mcDegree: 25.3,
    confidence: 0.85,
    matchingEvents: [
      { type: 'marriage', date: new Date('2015-06-20'), matched: true },
      { type: 'career_change', date: new Date('2018-03-15'), matched: true },
    ],
  },
  confidenceLevel: 'high' as const,
  candidates: [
    {
      time: new Date('1990-05-15T08:30:00.000Z'),
      ascendantSign: 'Cancer',
      ascendantDegree: 15.5,
      mcSign: 'Pisces',
      mcDegree: 25.3,
      confidence: 0.85,
      matchingEvents: [],
    },
    {
      time: new Date('1990-05-15T09:00:00.000Z'),
      ascendantSign: 'Cancer',
      ascendantDegree: 22.1,
      mcSign: 'Pisces',
      mcDegree: 28.7,
      confidence: 0.72,
      matchingEvents: [],
    },
  ],
  methodology: 'Event-based rectification using primary directions and transits',
  recommendations: ['Consider professional consultation for final verification'],
}

const mockRectificationGuide = {
  steps: ['Provide more life events for higher accuracy', 'Consider appearance-based estimation'],
  minimumEventsRecommended: 3,
  optimalEventsCount: 5,
}

const mockAscAppearance = {
  physicalTraits: ['oval face', 'medium build'],
  personalityTraits: ['nurturing', 'emotional'],
  generalDescription: 'Cancer rising gives a soft, rounded appearance',
}

const mockSajuHourRange = { start: 7, end: 9 }

vi.mock('@/lib/astrology', () => ({
  performRectification: vi.fn(),
  estimateAscendantByAppearance: vi.fn(),
  getAscendantAppearance: vi.fn(),
  getSajuHourRange: vi.fn(),
  generateRectificationGuide: vi.fn(),
}))

// ============ Imports (after all mocks) ============

import { POST, GET } from '@/app/api/astrology/advanced/rectification/route'
import { rateLimit } from '@/lib/rateLimit'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { captureServerError } from '@/lib/telemetry'
import {
  performRectification,
  estimateAscendantByAppearance,
  getAscendantAppearance,
  getSajuHourRange,
  generateRectificationGuide,
} from '@/lib/astrology'
import { logger } from '@/lib/logger'

// ============ Helpers ============

function makePostRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/astrology/advanced/rectification', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function makeGetRequest(params?: Record<string, string>): Request {
  const url = new URL('http://localhost/api/astrology/advanced/rectification')
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new Request(url.toString(), {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  })
}

const validBody = {
  birthDate: '1990-05-15',
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
  events: [
    { date: '2015-06-20', type: 'marriage', description: 'Wedding day' },
    { date: '2018-03-15', type: 'career_change', description: 'New job', importance: 'major' },
  ],
}

const defaultRateLimitHeaders = new Headers({
  'X-RateLimit-Limit': '10',
  'X-RateLimit-Remaining': '9',
})

/**
 * Set up all mocks for a successful rectification flow.
 */
function setupSuccessfulFlow() {
  vi.mocked(rateLimit).mockResolvedValue({
    allowed: true,
    headers: defaultRateLimitHeaders,
  } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
  vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
  mockSafeParse.mockReturnValue({ success: true, data: validBody })
  vi.mocked(performRectification).mockResolvedValue(mockRectificationResult)
  vi.mocked(generateRectificationGuide).mockReturnValue(mockRectificationGuide)
  vi.mocked(estimateAscendantByAppearance).mockReturnValue(undefined)
  vi.mocked(getSajuHourRange).mockReturnValue(null)
}

// ============ Tests - POST Endpoint ============

describe('Rectification API - POST /api/astrology/advanced/rectification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---- Rate Limiting ----
  describe('Rate Limiting', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        headers: new Headers({ 'Retry-After': '60' }),
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)

      const response = await POST(makePostRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Too many requests. Try again soon.')
    })

    it('should include rate limit headers in rate-limited response', async () => {
      const retryHeaders = new Headers({ 'Retry-After': '30' })
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        headers: retryHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)

      const response = await POST(makePostRequest(validBody))

      expect(response.status).toBe(429)
    })

    it('should allow request when rate limit is not exceeded', async () => {
      setupSuccessfulFlow()

      const response = await POST(makePostRequest(validBody))

      expect(response.status).toBe(200)
    })

    it('should use correct rate limit key with client IP', async () => {
      setupSuccessfulFlow()

      await POST(makePostRequest(validBody))

      expect(rateLimit).toHaveBeenCalledWith('astro-rectification:192.168.1.1', { limit: 10, windowSeconds: 60 })
    })
  })

  // ---- Token Authentication ----
  describe('Token Authentication', () => {
    beforeEach(() => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
    })

    it('should return 401 when public token is invalid', async () => {
      vi.mocked(requirePublicToken).mockReturnValue({
        valid: false,
        reason: 'Invalid or missing token',
      })

      const response = await POST(makePostRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should proceed when public token is valid', async () => {
      setupSuccessfulFlow()

      const response = await POST(makePostRequest(validBody))

      expect(response.status).toBe(200)
    })
  })

  // ---- Input Validation ----
  describe('Input Validation', () => {
    beforeEach(() => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
      vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
    })

    it('should return 400 when Zod validation fails for missing birthDate', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['birthDate'], message: 'Birth date must be in YYYY-MM-DD format' }],
        },
      })

      const response = await POST(makePostRequest({}))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toContain('birthDate')
    })

    it('should return 400 with multiple validation errors', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['birthDate'], message: 'Birth date must be in YYYY-MM-DD format' },
            { path: ['latitude'], message: 'Latitude must be >= -90' },
            { path: ['events'], message: 'At least one event is required' },
          ],
        },
      })

      const response = await POST(makePostRequest({}))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.issues).toHaveLength(3)
    })

    it('should return 400 for invalid latitude out of range', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['latitude'], message: 'Latitude must be <= 90' }],
        },
      })

      const response = await POST(makePostRequest({ ...validBody, latitude: 100 }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toContain('latitude')
    })

    it('should return 400 for invalid longitude out of range', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['longitude'], message: 'Longitude must be <= 180' }],
        },
      })

      const response = await POST(makePostRequest({ ...validBody, longitude: 200 }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toContain('longitude')
    })

    it('should return 400 for missing timezone', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['timeZone'], message: 'Timezone is required' }],
        },
      })

      const response = await POST(makePostRequest({ ...validBody, timeZone: '' }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toContain('timeZone')
    })

    it('should return 400 for empty events array', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['events'], message: 'At least one event is required' }],
        },
      })

      const response = await POST(makePostRequest({ ...validBody, events: [] }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toContain('events')
    })

    it('should log validation warnings', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['birthDate'], message: 'Required' }],
        },
      })

      await POST(makePostRequest({}))

      expect(logger.warn).toHaveBeenCalledWith(
        '[Rectification API] Validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })
  })

  // ---- Event Type Validation ----
  describe('Event Type Validation', () => {
    beforeEach(() => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
      vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
    })

    it('should return 400 for invalid event type', async () => {
      const invalidEventBody = {
        ...validBody,
        events: [{ date: '2015-06-20', type: 'invalid_event_type', description: 'Test' }],
      }
      mockSafeParse.mockReturnValue({ success: true, data: invalidEventBody })

      const response = await POST(makePostRequest(invalidEventBody))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid event type: invalid_event_type')
      expect(data.error).toContain('Valid types:')
    })

    it('should accept all valid event types', async () => {
      const validEventTypes = [
        'marriage',
        'divorce',
        'birth_of_child',
        'death_of_parent_mother',
        'death_of_parent_father',
        'career_change',
        'career_peak',
        'job_loss',
        'major_move',
        'accident',
        'surgery',
        'graduation',
        'major_relationship_start',
        'major_relationship_end',
        'financial_gain',
        'financial_loss',
        'spiritual_awakening',
        'health_crisis',
        'other',
      ]

      for (const eventType of validEventTypes) {
        vi.clearAllMocks()
        setupSuccessfulFlow()

        const bodyWithEventType = {
          ...validBody,
          events: [{ date: '2015-06-20', type: eventType, description: 'Test event' }],
        }
        mockSafeParse.mockReturnValue({ success: true, data: bodyWithEventType })

        const response = await POST(makePostRequest(bodyWithEventType))

        expect(response.status).toBe(200)
      }
    })
  })

  // ---- Successful Rectification ----
  describe('Successful Rectification', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should return 200 with rectification result', async () => {
      const response = await POST(makePostRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result).toBeDefined()
      expect(data.result.bestCandidate).toBeDefined()
      expect(data.result.confidenceLevel).toBe('high')
    })

    it('should include best candidate with formatted data', async () => {
      const response = await POST(makePostRequest(validBody))
      const data = await response.json()

      const bestCandidate = data.result.bestCandidate
      expect(bestCandidate.time).toBe('1990-05-15T08:30:00.000Z')
      expect(bestCandidate.ascendantSign).toBe('Cancer')
      expect(bestCandidate.ascendantDegree).toBe('15.50')
      expect(bestCandidate.mcSign).toBe('Pisces')
      expect(bestCandidate.mcDegree).toBe('25.30')
      expect(bestCandidate.confidence).toBe(0.85)
      expect(bestCandidate.matchingEvents).toBe(2)
    })

    it('should include candidates list limited to 5', async () => {
      const manyCandidates = Array.from({ length: 10 }, (_, i) => ({
        time: new Date(`1990-05-15T0${i}:00:00.000Z`),
        ascendantSign: 'Cancer',
        ascendantDegree: 15 + i,
        mcSign: 'Pisces',
        mcDegree: 25 + i,
        confidence: 0.9 - i * 0.05,
        matchingEvents: [],
      }))

      vi.mocked(performRectification).mockResolvedValue({
        ...mockRectificationResult,
        candidates: manyCandidates,
      })

      const response = await POST(makePostRequest(validBody))
      const data = await response.json()

      expect(data.result.candidates).toHaveLength(5)
    })

    it('should include guide and input summary', async () => {
      const response = await POST(makePostRequest(validBody))
      const data = await response.json()

      expect(data.guide).toEqual(mockRectificationGuide)
      expect(data.inputSummary).toBeDefined()
      expect(data.inputSummary.birthDate).toBe('1990-05-15')
      expect(data.inputSummary.eventsCount).toBe(2)
    })

    it('should call performRectification with correct parameters', async () => {
      await POST(makePostRequest(validBody))

      expect(performRectification).toHaveBeenCalledWith(
        {
          year: 1990,
          month: 5,
          date: 15,
          latitude: 37.5665,
          longitude: 126.978,
          timeZone: 'Asia/Seoul',
        },
        expect.arrayContaining([
          expect.objectContaining({
            type: 'marriage',
            description: 'Wedding day',
            importance: 'moderate',
          }),
        ]),
        expect.objectContaining({
          startHour: 0,
          endHour: 23,
          intervalMinutes: 30,
        })
      )
    })

    it('should include rate limit headers in successful response', async () => {
      const response = await POST(makePostRequest(validBody))

      expect(response.status).toBe(200)
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9')
    })

    it('should set Cache-Control to no-store', async () => {
      const response = await POST(makePostRequest(validBody))

      expect(response.headers.get('Cache-Control')).toBe('no-store')
    })
  })

  // ---- Time Range Options ----
  describe('Time Range Options', () => {
    beforeEach(() => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
      vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
      vi.mocked(performRectification).mockResolvedValue(mockRectificationResult)
      vi.mocked(generateRectificationGuide).mockReturnValue(mockRectificationGuide)
    })

    it('should use approximateTimeRange when provided', async () => {
      const bodyWithTimeRange = {
        ...validBody,
        approximateTimeRange: { startHour: 6, endHour: 12, intervalMinutes: 15 },
      }
      mockSafeParse.mockReturnValue({ success: true, data: bodyWithTimeRange })

      const response = await POST(makePostRequest(bodyWithTimeRange))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.inputSummary.timeRange.startHour).toBe(6)
      expect(data.inputSummary.timeRange.endHour).toBe(12)
      expect(data.inputSummary.timeRange.intervalMinutes).toBe(15)
    })

    it('should use sajuSijin to narrow time range', async () => {
      vi.mocked(getSajuHourRange).mockReturnValue(mockSajuHourRange)

      const bodyWithSajuSijin = {
        ...validBody,
        sajuSijin: '진시',
      }
      mockSafeParse.mockReturnValue({ success: true, data: bodyWithSajuSijin })

      const response = await POST(makePostRequest(bodyWithSajuSijin))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(getSajuHourRange).toHaveBeenCalledWith('진시')
      expect(data.inputSummary.timeRange.startHour).toBe(7)
      expect(data.inputSummary.timeRange.endHour).toBe(9)
    })

    it('should handle 자시 (crossing midnight) correctly', async () => {
      vi.mocked(getSajuHourRange).mockReturnValue({ start: 23, end: 1 })

      const bodyWithJasi = {
        ...validBody,
        sajuSijin: '자시',
      }
      mockSafeParse.mockReturnValue({ success: true, data: bodyWithJasi })

      const response = await POST(makePostRequest(bodyWithJasi))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.inputSummary.timeRange.startHour).toBe(23)
      expect(data.inputSummary.timeRange.endHour).toBe(1)
    })
  })

  // ---- Appearance Profile ----
  describe('Appearance Profile', () => {
    beforeEach(() => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
      vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
      vi.mocked(performRectification).mockResolvedValue(mockRectificationResult)
      vi.mocked(generateRectificationGuide).mockReturnValue(mockRectificationGuide)
    })

    it('should estimate ascendant signs from appearance profile', async () => {
      const estimatedSigns = ['Cancer', 'Pisces', 'Scorpio'] as const
      vi.mocked(estimateAscendantByAppearance).mockReturnValue([...estimatedSigns])

      const bodyWithAppearance = {
        ...validBody,
        appearanceProfile: { faceShape: 'round', build: 'soft' },
      }
      mockSafeParse.mockReturnValue({ success: true, data: bodyWithAppearance })

      const response = await POST(makePostRequest(bodyWithAppearance))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(estimateAscendantByAppearance).toHaveBeenCalledWith({ faceShape: 'round', build: 'soft' })
      expect(data.estimatedAscSigns).toEqual(estimatedSigns)
    })

    it('should pass estimated asc signs to performRectification', async () => {
      const estimatedSigns = ['Leo', 'Aries'] as const
      vi.mocked(estimateAscendantByAppearance).mockReturnValue([...estimatedSigns])

      const bodyWithAppearance = {
        ...validBody,
        appearanceProfile: { personality: 'confident' },
      }
      mockSafeParse.mockReturnValue({ success: true, data: bodyWithAppearance })

      await POST(makePostRequest(bodyWithAppearance))

      expect(performRectification).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Array),
        expect.objectContaining({
          estimatedAscSigns: estimatedSigns,
        })
      )
    })
  })

  // ---- Null Best Candidate ----
  describe('Null Best Candidate', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should handle null bestCandidate gracefully', async () => {
      vi.mocked(performRectification).mockResolvedValue({
        ...mockRectificationResult,
        bestCandidate: null,
      })

      const response = await POST(makePostRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result.bestCandidate).toBeNull()
    })
  })

  // ---- Error Handling ----
  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
      vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
      mockSafeParse.mockReturnValue({ success: true, data: validBody })
    })

    it('should return 500 when performRectification throws', async () => {
      vi.mocked(performRectification).mockRejectedValue(new Error('Rectification calculation failed'))

      const response = await POST(makePostRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
      expect(captureServerError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ route: '/api/astrology/advanced/rectification' })
      )
    })

    it('should return 500 when generateRectificationGuide throws', async () => {
      vi.mocked(performRectification).mockResolvedValue(mockRectificationResult)
      vi.mocked(generateRectificationGuide).mockImplementation(() => {
        throw new Error('Guide generation failed')
      })

      const response = await POST(makePostRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
    })

    it('should return 500 when request.json() throws (malformed body)', async () => {
      const badRequest = new Request('http://localhost/api/astrology/advanced/rectification', {
        method: 'POST',
        body: 'not-json{{',
        headers: { 'content-type': 'application/json' },
      })

      const response = await POST(badRequest)

      // When JSON parsing fails, body becomes {}, validation should still run
      expect([400, 500]).toContain(response.status)
    })

    it('should capture server errors via telemetry', async () => {
      vi.mocked(performRectification).mockRejectedValue(new Error('Something broke'))

      await POST(makePostRequest(validBody))

      expect(captureServerError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Something broke' }),
        { route: '/api/astrology/advanced/rectification' }
      )
    })
  })

  // ---- Edge Cases ----
  describe('Edge Cases', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should handle minimum valid latitude (-90)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, latitude: -90 },
      })

      const response = await POST(makePostRequest({ ...validBody, latitude: -90 }))

      expect(response.status).toBe(200)
      expect(performRectification).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: -90 }),
        expect.any(Array),
        expect.any(Object)
      )
    })

    it('should handle maximum valid latitude (90)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, latitude: 90 },
      })

      const response = await POST(makePostRequest({ ...validBody, latitude: 90 }))

      expect(response.status).toBe(200)
    })

    it('should handle minimum valid longitude (-180)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, longitude: -180 },
      })

      const response = await POST(makePostRequest({ ...validBody, longitude: -180 }))

      expect(response.status).toBe(200)
    })

    it('should handle maximum valid longitude (180)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, longitude: 180 },
      })

      const response = await POST(makePostRequest({ ...validBody, longitude: 180 }))

      expect(response.status).toBe(200)
    })

    it('should handle event with default importance when not provided', async () => {
      const bodyWithDefaultImportance = {
        ...validBody,
        events: [{ date: '2015-06-20', type: 'marriage' }],
      }
      mockSafeParse.mockReturnValue({ success: true, data: bodyWithDefaultImportance })

      await POST(makePostRequest(bodyWithDefaultImportance))

      expect(performRectification).toHaveBeenCalledWith(
        expect.any(Object),
        expect.arrayContaining([
          expect.objectContaining({
            importance: 'moderate',
          }),
        ]),
        expect.any(Object)
      )
    })

    it('should handle concurrent requests without state leaking', async () => {
      const requests = Array.from({ length: 3 }, (_, i) =>
        makePostRequest({
          ...validBody,
          birthDate: `199${i}-05-15`,
        })
      )

      vi.mocked(performRectification).mockImplementation(async (input) => ({
        ...mockRectificationResult,
        bestCandidate: {
          ...mockRectificationResult.bestCandidate!,
          time: new Date(`${input.year}-05-15T08:30:00.000Z`),
        },
      }))

      const responses = await Promise.all(requests.map((r) => POST(r)))

      responses.forEach((r) => {
        expect(r.status).toBe(200)
      })
      expect(performRectification).toHaveBeenCalledTimes(3)
    })

    it('should handle many events', async () => {
      const manyEvents = Array.from({ length: 20 }, (_, i) => ({
        date: `${2000 + i}-01-15`,
        type: 'career_change',
        description: `Event ${i}`,
        importance: 'moderate' as const,
      }))

      const bodyWithManyEvents = {
        ...validBody,
        events: manyEvents,
      }
      mockSafeParse.mockReturnValue({ success: true, data: bodyWithManyEvents })

      const response = await POST(makePostRequest(bodyWithManyEvents))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.inputSummary.eventsCount).toBe(20)
    })
  })
})

// ============ Tests - GET Endpoint ============

describe('Rectification API - GET /api/astrology/advanced/rectification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAscendantAppearance).mockReturnValue(mockAscAppearance)
  })

  // ---- Rate Limiting ----
  describe('Rate Limiting', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        headers: new Headers({ 'Retry-After': '60' }),
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)

      const response = await GET(makeGetRequest())
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Too many requests.')
    })

    it('should use correct rate limit key for GET requests', async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)

      await GET(makeGetRequest())

      expect(rateLimit).toHaveBeenCalledWith('astro-rectification-get:192.168.1.1', { limit: 30, windowSeconds: 60 })
    })
  })

  // ---- Get All Appearances ----
  describe('Get All Appearances', () => {
    beforeEach(() => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
    })

    it('should return all ascendant appearances when no sign specified', async () => {
      const response = await GET(makeGetRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.validEventTypes).toBeDefined()
      expect(data.ascendantAppearances).toBeDefined()
      expect(data.sajuHours).toBeDefined()
    })

    it('should include all valid event types', async () => {
      const response = await GET(makeGetRequest())
      const data = await response.json()

      expect(data.validEventTypes).toContain('marriage')
      expect(data.validEventTypes).toContain('divorce')
      expect(data.validEventTypes).toContain('career_change')
      expect(data.validEventTypes).toContain('health_crisis')
      expect(data.validEventTypes).toContain('other')
    })

    it('should include all saju hours', async () => {
      const response = await GET(makeGetRequest())
      const data = await response.json()

      const expectedSajuHours = [
        '자시', '축시', '인시', '묘시', '진시', '사시',
        '오시', '미시', '신시', '유시', '술시', '해시',
      ]
      expect(data.sajuHours).toEqual(expectedSajuHours)
    })

    it('should call getAscendantAppearance for all 12 signs', async () => {
      await GET(makeGetRequest())

      expect(getAscendantAppearance).toHaveBeenCalledTimes(12)
      expect(getAscendantAppearance).toHaveBeenCalledWith('Aries')
      expect(getAscendantAppearance).toHaveBeenCalledWith('Taurus')
      expect(getAscendantAppearance).toHaveBeenCalledWith('Gemini')
      expect(getAscendantAppearance).toHaveBeenCalledWith('Cancer')
      expect(getAscendantAppearance).toHaveBeenCalledWith('Leo')
      expect(getAscendantAppearance).toHaveBeenCalledWith('Virgo')
      expect(getAscendantAppearance).toHaveBeenCalledWith('Libra')
      expect(getAscendantAppearance).toHaveBeenCalledWith('Scorpio')
      expect(getAscendantAppearance).toHaveBeenCalledWith('Sagittarius')
      expect(getAscendantAppearance).toHaveBeenCalledWith('Capricorn')
      expect(getAscendantAppearance).toHaveBeenCalledWith('Aquarius')
      expect(getAscendantAppearance).toHaveBeenCalledWith('Pisces')
    })
  })

  // ---- Get Specific Sign Appearance ----
  describe('Get Specific Sign Appearance', () => {
    beforeEach(() => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
    })

    it('should return specific sign appearance when valid sign provided', async () => {
      const response = await GET(makeGetRequest({ sign: 'Cancer' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sign).toBe('Cancer')
      expect(data.appearance).toEqual(mockAscAppearance)
    })

    it('should handle all valid zodiac signs', async () => {
      const validSigns = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
      ]

      for (const sign of validSigns) {
        vi.clearAllMocks()
        vi.mocked(rateLimit).mockResolvedValue({
          allowed: true,
          headers: defaultRateLimitHeaders,
        } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
        vi.mocked(getAscendantAppearance).mockReturnValue(mockAscAppearance)

        const response = await GET(makeGetRequest({ sign }))
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.sign).toBe(sign)
        expect(getAscendantAppearance).toHaveBeenCalledWith(sign)
      }
    })

    it('should return all appearances when invalid sign provided', async () => {
      const response = await GET(makeGetRequest({ sign: 'InvalidSign' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.validEventTypes).toBeDefined()
      expect(data.ascendantAppearances).toBeDefined()
    })
  })

  // ---- Error Handling ----
  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
    })

    it('should return 500 when getAscendantAppearance throws', async () => {
      vi.mocked(getAscendantAppearance).mockImplementation(() => {
        throw new Error('Appearance lookup failed')
      })

      const response = await GET(makeGetRequest())
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
      expect(captureServerError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ route: '/api/astrology/advanced/rectification GET' })
      )
    })

    it('should capture server errors via telemetry for GET endpoint', async () => {
      vi.mocked(getAscendantAppearance).mockImplementation(() => {
        throw new Error('Something broke in GET')
      })

      await GET(makeGetRequest())

      expect(captureServerError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Something broke in GET' }),
        { route: '/api/astrology/advanced/rectification GET' }
      )
    })
  })

  // ---- Rate Limit Headers ----
  describe('Rate Limit Headers', () => {
    it('should include rate limit headers in successful response', async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)

      const response = await GET(makeGetRequest())

      expect(response.status).toBe(200)
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9')
    })
  })
})
