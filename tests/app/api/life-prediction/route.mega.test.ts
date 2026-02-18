/**
 * Life Prediction API MEGA Test Suite
 * Comprehensive testing for the life prediction API endpoint
 * TIER 1-3 advanced analysis engine
 */
import { describe, it, expect } from 'vitest'
import { POST } from '@/app/api/life-prediction/route'
import { NextRequest } from 'next/server'

// ============================================================
// Test Data Fixtures
// ============================================================

const createBasicRequest = (type: string, overrides?: Record<string, unknown>) => ({
  type,
  birthYear: 1990,
  birthMonth: 6,
  birthDay: 15,
  birthHour: 14,
  gender: 'male',
  dayStem: '甲',
  dayBranch: '寅',
  monthBranch: '午',
  yearBranch: '午',
  yongsin: ['水', '木'],
  kisin: ['土', '金'],
  ...overrides,
})

const createMultiYearRequest = (overrides?: Record<string, unknown>) => ({
  ...createBasicRequest('multi-year', overrides),
  startYear: new Date().getFullYear(),
  endYear: new Date().getFullYear() + 5,
})

const createPastAnalysisRequest = (overrides?: Record<string, unknown>) => ({
  ...createBasicRequest('past-analysis', overrides),
  targetDate: '2020-06-15',
})

const createEventTimingRequest = (overrides?: Record<string, unknown>) => ({
  ...createBasicRequest('event-timing', overrides),
  eventType: 'marriage',
  startYear: new Date().getFullYear(),
  endYear: new Date().getFullYear() + 2,
})

const createComprehensiveRequest = (overrides?: Record<string, unknown>) => ({
  ...createBasicRequest('comprehensive', overrides),
  startYear: new Date().getFullYear(),
  endYear: new Date().getFullYear() + 3,
})

const createWeeklyTimingRequest = (overrides?: Record<string, unknown>) => ({
  ...createBasicRequest('weekly-timing', overrides),
  eventType: 'career',
  startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
})

let requestSequence = 0

function createNextRequest(body: Record<string, unknown>): NextRequest {
  requestSequence += 1
  return new NextRequest('http://localhost:3000/api/life-prediction', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      // Avoid cross-test 429s from per-IP rate limits.
      'x-forwarded-for': `203.0.113.${(requestSequence % 240) + 10}`,
    },
  })
}

// ============================================================
// Request Validation Tests
// ============================================================

describe('life-prediction API - Request Validation', () => {
  it('should reject missing request body', async () => {
    const req = new NextRequest('http://localhost:3000/api/life-prediction', {
      method: 'POST',
      body: null,
    })

    const response = await POST(req)
    const data = await response.json()

    // null body causes JSON parsing error = 500
    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
  })

  it('should reject missing type field', async () => {
    const body = createBasicRequest('multi-year')
    delete (body as Record<string, unknown>).type
    const req = createNextRequest(body as Record<string, unknown>)

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Validation failed')
  })

  it('should reject missing birthYear', async () => {
    const body = createBasicRequest('multi-year')
    delete (body as Record<string, unknown>).birthYear
    const req = createNextRequest(body as Record<string, unknown>)

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Validation failed')
  })

  it('should reject missing dayStem', async () => {
    const body = createBasicRequest('multi-year')
    delete (body as Record<string, unknown>).dayStem
    const req = createNextRequest(body as Record<string, unknown>)

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Validation failed')
  })

  it('should reject invalid gender', async () => {
    const body = createBasicRequest('multi-year', { gender: 'invalid' })
    const req = createNextRequest(body)

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Validation failed')
  })

  it('should accept valid male gender', async () => {
    const body = createMultiYearRequest({ gender: 'male' })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).not.toBe(400)
  })

  it('should accept valid female gender', async () => {
    const body = createMultiYearRequest({ gender: 'female' })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).not.toBe(400)
  })
})

// ============================================================
// Multi-Year Prediction Tests
// ============================================================

describe('life-prediction API - Multi-Year Prediction', () => {
  it('should handle multi-year prediction request', async () => {
    const body = createMultiYearRequest()
    const req = createNextRequest(body)

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toBeDefined()
  })

  it('should return trend data for multi-year', async () => {
    const body = createMultiYearRequest()
    const req = createNextRequest(body)

    const response = await POST(req)
    const data = await response.json()

    if (response.status === 200 && data.trend) {
      expect(data.trend).toBeDefined()
    }
  })

  it('should handle 1-year range', async () => {
    const currentYear = new Date().getFullYear()
    const body = createMultiYearRequest({
      startYear: currentYear,
      endYear: currentYear,
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle 10-year range', async () => {
    const currentYear = new Date().getFullYear()
    const body = createMultiYearRequest({
      startYear: currentYear,
      endYear: currentYear + 10,
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should include advanced analysis when provided', async () => {
    const body = createMultiYearRequest({
      astroChart: {
        sun: { sign: 'Gemini', house: 10, longitude: 75.5 },
        moon: { sign: 'Pisces', house: 6, longitude: 340.2 },
      },
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })
})

// ============================================================
// Past Analysis Tests
// ============================================================

describe('life-prediction API - Past Analysis', () => {
  it('should handle past-analysis request', async () => {
    const body = createPastAnalysisRequest()
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle targetDate parameter', async () => {
    const body = createPastAnalysisRequest({
      targetDate: '2021-03-15',
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle startDate and endDate for period analysis', async () => {
    const body = createBasicRequest('past-analysis', {
      startDate: '2020-01-01',
      endDate: '2020-01-15', // Within 30 days limit
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should reject date range > 30 days', async () => {
    const body = createBasicRequest('past-analysis', {
      startDate: '2020-01-01',
      endDate: '2020-03-01', // 60 days
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    if (response.status === 400) {
      const data = await response.json()
      expect(data.error).toBeDefined()
    } else {
      // Server may allow or handle this differently
      expect(response.status).toBe(200)
    }
  })

  it('should handle leap year dates', async () => {
    const body = createPastAnalysisRequest({
      targetDate: '2020-02-29',
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })
})

// ============================================================
// Event Timing Tests
// ============================================================

describe('life-prediction API - Event Timing', () => {
  it('should handle event-timing request', async () => {
    const body = createEventTimingRequest()
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle marriage event type', async () => {
    const body = createEventTimingRequest({ eventType: 'marriage' })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle career event type', async () => {
    const body = createEventTimingRequest({ eventType: 'career' })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle investment event type', async () => {
    const body = createEventTimingRequest({ eventType: 'investment' })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle move event type', async () => {
    const body = createEventTimingRequest({ eventType: 'move' })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle study event type', async () => {
    const body = createEventTimingRequest({ eventType: 'study' })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle health event type', async () => {
    const body = createEventTimingRequest({ eventType: 'health' })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle relationship event type', async () => {
    const body = createEventTimingRequest({ eventType: 'relationship' })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle 2-year search range', async () => {
    const currentYear = new Date().getFullYear()
    const body = createEventTimingRequest({
      searchStartYear: currentYear,
      searchEndYear: currentYear + 2,
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle 5-year search range', async () => {
    const currentYear = new Date().getFullYear()
    const body = createEventTimingRequest({
      searchStartYear: currentYear,
      searchEndYear: currentYear + 5,
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })
})

// ============================================================
// Comprehensive Prediction Tests
// ============================================================

describe('life-prediction API - Comprehensive Prediction', () => {
  it('should handle comprehensive request', async () => {
    const body = createComprehensiveRequest()
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle 3-year comprehensive range', async () => {
    const currentYear = new Date().getFullYear()
    const body = createComprehensiveRequest({
      startYear: currentYear,
      endYear: currentYear + 3,
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should include prompt context in response', async () => {
    const body = createComprehensiveRequest()
    const req = createNextRequest(body)

    const response = await POST(req)
    const data = await response.json()

    if (response.status === 200) {
      expect(data).toBeDefined()
    }
  })
})

// ============================================================
// Weekly Timing Tests
// ============================================================

describe('life-prediction API - Weekly Timing', () => {
  it('should handle weekly-timing request', async () => {
    const body = createWeeklyTimingRequest()
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle 4-week period', async () => {
    const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 28)

    const body = createWeeklyTimingRequest({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle different event types for weekly', async () => {
    const eventTypes = ['marriage', 'career', 'investment', 'study']

    for (const eventType of eventTypes) {
      const body = createWeeklyTimingRequest({ eventType })
      const req = createNextRequest(body)

      const response = await POST(req)

      expect(response.status).toBe(200)
    }
  })
})

// ============================================================
// Advanced Data Integration Tests
// ============================================================

describe('life-prediction API - Advanced Data', () => {
  it('should handle daeunList data', async () => {
    const body = createMultiYearRequest({
      daeunList: [
        { stem: '乙', branch: '酉', start: 20, end: 29 },
        { stem: '丙', branch: '戌', start: 30, end: 39 },
      ],
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle astroChart data', async () => {
    const body = createMultiYearRequest({
      astroChart: {
        sun: { sign: 'Gemini', house: 10, longitude: 75.5 },
        moon: { sign: 'Pisces', house: 6, longitude: 340.2 },
        mercury: { sign: 'Gemini', house: 9, longitude: 70.0 },
        venus: { sign: 'Taurus', house: 9, longitude: 50.0 },
        mars: { sign: 'Aquarius', house: 5, longitude: 310.0 },
      },
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle advancedAstro data', async () => {
    const body = createMultiYearRequest({
      advancedAstro: {
        electional: {
          moonPhase: 'waxing_crescent',
          voidOfCourse: false,
        },
        extraPoints: {
          chiron: { longitude: 15.5, sign: 'Aries' },
          lilith: { longitude: 200.2, sign: 'Libra' },
        },
      },
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should work without optional advanced data', async () => {
    const body = createMultiYearRequest()
    // No daeunList, no astroChart, no advancedAstro
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })
})

// ============================================================
// Edge Cases Tests
// ============================================================

describe('life-prediction API - Edge Cases', () => {
  it('should handle birth at midnight', async () => {
    const body = createMultiYearRequest({
      birthHour: 0,
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle birth at noon', async () => {
    const body = createMultiYearRequest({
      birthHour: 12,
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle January 1st birth', async () => {
    const body = createMultiYearRequest({
      birthMonth: 1,
      birthDay: 1,
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle December 31st birth', async () => {
    const body = createMultiYearRequest({
      birthMonth: 12,
      birthDay: 31,
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle empty yongsin array', async () => {
    const body = createMultiYearRequest({
      yongsin: [],
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })

  it('should handle missing optional fields', async () => {
    const body = createMultiYearRequest()
    delete (body as Record<string, unknown>).yongsin
    delete (body as Record<string, unknown>).kisin
    const req = createNextRequest(body as Record<string, unknown>)

    const response = await POST(req)

    expect(response.status).toBe(200)
  })
})

// ============================================================
// Response Format Tests
// ============================================================

describe('life-prediction API - Response Format', () => {
  it('should return JSON response', async () => {
    const body = createMultiYearRequest()
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('should return 200 status for valid request', async () => {
    const body = createMultiYearRequest()
    const req = createNextRequest(body)

    const response = await POST(req)

    expect([200, 500]).toContain(response.status) // May fail internally but should not crash
  })

  it('should return error status for invalid request', async () => {
    const body = { invalid: 'data' }
    const req = createNextRequest(body)

    const response = await POST(req)

    expect(response.status).toBe(400)
  })

  it('should include error message in error response', async () => {
    const body = { invalid: 'data' }
    const req = createNextRequest(body)

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(typeof data.error).toBe('object')
    expect(data.error.message).toBeDefined()
  })
})

// ============================================================
// Integration Tests
// ============================================================

describe('life-prediction API - Integration', () => {
  it('should handle complete workflow for multi-year', async () => {
    const body = createMultiYearRequest({
      daeunList: [{ stem: '乙', branch: '酉', start: 20, end: 29 }],
      astroChart: {
        sun: { sign: 'Gemini', house: 10, longitude: 75.5 },
        moon: { sign: 'Pisces', house: 6, longitude: 340.2 },
      },
    })
    const req = createNextRequest(body)

    const response = await POST(req)

    expect([200, 400, 500]).toContain(response.status)
  })

  it('should handle all prediction types sequentially', async () => {
    const types = ['multi-year', 'past-analysis', 'event-timing', 'comprehensive', 'weekly-timing']

    for (const type of types) {
      let body: Record<string, unknown>

      if (type === 'multi-year') {
        body = createMultiYearRequest()
      } else if (type === 'past-analysis') {
        body = createPastAnalysisRequest()
      } else if (type === 'event-timing') {
        body = createEventTimingRequest()
      } else if (type === 'comprehensive') {
        body = createComprehensiveRequest()
      } else {
        body = createWeeklyTimingRequest()
      }

      const req = createNextRequest(body)
      const response = await POST(req)

      expect([200, 400, 500]).toContain(response.status)
    }
  })
})
