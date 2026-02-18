import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ============================================================
// Mock static dependencies (must be before route import)
// ============================================================

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock HTTP constants - use actual values to match route behaviour
vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
  },
}))

// ---------------------------------------------------------------------------
// Mock Zod validation schema
// We replicate just enough logic to test validation branching.
// ---------------------------------------------------------------------------
vi.mock('@/lib/api/zodValidation', () => ({
  precomputeChartRequestSchema: {
    safeParse: vi.fn((data: unknown) => {
      if (data === null || data === undefined || typeof data !== 'object') {
        return {
          success: false,
          error: {
            issues: [{ path: [], message: 'Expected object' }],
          },
        }
      }

      const d = data as Record<string, unknown>

      // birthDate - required, YYYY-MM-DD
      if (
        !d.birthDate ||
        typeof d.birthDate !== 'string' ||
        !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(d.birthDate)
      ) {
        return {
          success: false,
          error: {
            issues: [{ path: ['birthDate'], message: 'Date must be in YYYY-MM-DD format' }],
          },
        }
      }

      // birthTime - required, HH:MM
      if (
        !d.birthTime ||
        typeof d.birthTime !== 'string' ||
        !/^([01]?\d|2[0-3]):([0-5]\d)$/.test(d.birthTime)
      ) {
        return {
          success: false,
          error: {
            issues: [{ path: ['birthTime'], message: 'Time must be in HH:MM format' }],
          },
        }
      }

      // latitude - required, number -90..90
      if (typeof d.latitude !== 'number' || d.latitude < -90 || d.latitude > 90) {
        return {
          success: false,
          error: {
            issues: [{ path: ['latitude'], message: 'Latitude must be between -90 and 90' }],
          },
        }
      }

      // longitude - required, number -180..180
      if (typeof d.longitude !== 'number' || d.longitude < -180 || d.longitude > 180) {
        return {
          success: false,
          error: {
            issues: [{ path: ['longitude'], message: 'Longitude must be between -180 and 180' }],
          },
        }
      }

      return {
        success: true,
        data: {
          birthDate: d.birthDate as string,
          birthTime: d.birthTime as string,
          latitude: d.latitude as number,
          longitude: d.longitude as number,
          gender: d.gender !== undefined ? String(d.gender) : undefined,
          timezone: d.timezone !== undefined ? String(d.timezone) : undefined,
        },
      }
    }),
  },
}))

// ---------------------------------------------------------------------------
// Mock @/lib/Saju (dynamically imported inside the route)
// ---------------------------------------------------------------------------
const mockSajuFacts = {
  yearPillar: {
    heavenlyStem: { name: '갑', element: '목' },
    earthlyBranch: { name: '자', element: '수' },
    jijanggan: {},
  },
  monthPillar: {
    heavenlyStem: { name: '병', element: '화' },
    earthlyBranch: { name: '인', element: '목' },
    jijanggan: {},
  },
  dayPillar: {
    heavenlyStem: { name: '무', element: '토' },
    earthlyBranch: { name: '오', element: '화' },
    jijanggan: {},
  },
  timePillar: {
    heavenlyStem: { name: '경', element: '금' },
    earthlyBranch: { name: '신', element: '금' },
    jijanggan: {},
  },
  dayMaster: { name: '무', element: '토', yinYang: '양' },
}

const mockCalculateSajuData = vi.fn().mockResolvedValue(mockSajuFacts)
const mockGetDaeunCycles = vi.fn().mockReturnValue({ cycles: [{ age: 10 }] })
const mockGetAnnualCycles = vi.fn().mockReturnValue([{ year: 2026 }])
const mockGetMonthlyCycles = vi.fn().mockReturnValue([{ month: 1 }])
const mockAnalyzeExtendedSaju = vi.fn().mockReturnValue({ strength: 'strong' })
const mockDetermineGeokguk = vi.fn().mockReturnValue({ type: 'normal' })
const mockDetermineYongsin = vi.fn().mockReturnValue({ yongsin: '수' })
const mockCalculateTonggeun = vi.fn().mockReturnValue({ score: 3 })
const mockCalculateTuechul = vi.fn().mockReturnValue({ count: 2 })
const mockCalculateHoeguk = vi.fn().mockReturnValue({ type: 'none' })
const mockCalculateDeukryeong = vi.fn().mockReturnValue({ level: 'high' })
const mockAnalyzeHyeongchung = vi.fn().mockReturnValue({ interactions: [] })
const mockAnalyzeSibsinComprehensive = vi.fn().mockReturnValue({ pattern: 'balanced' })
const mockAnalyzeHealthCareer = vi.fn().mockReturnValue({ health: 'good' })
const mockCalculateComprehensiveScore = vi.fn().mockReturnValue({ total: 85 })
const mockPerformUltraAdvancedAnalysis = vi.fn().mockReturnValue({ deep: true })

vi.mock('@/lib/Saju', () => ({
  calculateSajuData: mockCalculateSajuData,
  getDaeunCycles: mockGetDaeunCycles,
  getAnnualCycles: mockGetAnnualCycles,
  getMonthlyCycles: mockGetMonthlyCycles,
  analyzeExtendedSaju: mockAnalyzeExtendedSaju,
  determineGeokguk: mockDetermineGeokguk,
  determineYongsin: mockDetermineYongsin,
  calculateTonggeun: mockCalculateTonggeun,
  calculateTuechul: mockCalculateTuechul,
  calculateHoeguk: mockCalculateHoeguk,
  calculateDeukryeong: mockCalculateDeukryeong,
  analyzeHyeongchung: mockAnalyzeHyeongchung,
  analyzeSibsinComprehensive: mockAnalyzeSibsinComprehensive,
  analyzeHealthCareer: mockAnalyzeHealthCareer,
  calculateComprehensiveScore: mockCalculateComprehensiveScore,
  performUltraAdvancedAnalysis: mockPerformUltraAdvancedAnalysis,
}))

// ---------------------------------------------------------------------------
// Mock @/lib/astrology (dynamically imported inside the route)
// ---------------------------------------------------------------------------
const mockNatalChart = {
  planets: [
    { name: 'Sun', longitude: 120.5, sign: 'Leo', house: 5, retrograde: false },
    { name: 'Moon', longitude: 60.3, sign: 'Gemini', house: 3, retrograde: false },
    { name: 'Mercury', longitude: 130.2, sign: 'Leo', house: 5, retrograde: false },
    { name: 'Venus', longitude: 150.1, sign: 'Virgo', house: 6, retrograde: false },
    { name: 'Mars', longitude: 200.7, sign: 'Libra', house: 7, retrograde: false },
    { name: 'Jupiter', longitude: 30.0, sign: 'Taurus', house: 2, retrograde: false },
    { name: 'Saturn', longitude: 340.5, sign: 'Pisces', house: 12, retrograde: true },
    { name: 'Uranus', longitude: 50.0, sign: 'Taurus', house: 2, retrograde: false },
    { name: 'Neptune', longitude: 355.0, sign: 'Pisces', house: 12, retrograde: false },
    { name: 'Pluto', longitude: 300.0, sign: 'Aquarius', house: 11, retrograde: false },
  ],
  ascendant: { longitude: 0, sign: 'Aries' },
  mc: { longitude: 270, sign: 'Capricorn' },
  houses: [
    { cusp: 0 },
    { cusp: 30 },
    { cusp: 60 },
    { cusp: 90 },
    { cusp: 120 },
    { cusp: 150 },
    { cusp: 180 },
    { cusp: 210 },
    { cusp: 240 },
    { cusp: 270 },
    { cusp: 300 },
    { cusp: 330 },
  ],
  meta: { jdUT: 2460000.5 },
}

const mockTransitChart = {
  planets: [
    { name: 'Sun', longitude: 310.0, sign: 'Aquarius', house: 11, retrograde: false },
    { name: 'Moon', longitude: 90.0, sign: 'Cancer', house: 4, retrograde: false },
    { name: 'Jupiter', longitude: 65.0, sign: 'Gemini', house: 3, retrograde: false },
    { name: 'Saturn', longitude: 345.0, sign: 'Pisces', house: 12, retrograde: false },
    { name: 'Uranus', longitude: 55.0, sign: 'Taurus', house: 2, retrograde: false },
    { name: 'Neptune', longitude: 358.0, sign: 'Pisces', house: 12, retrograde: false },
    { name: 'Pluto', longitude: 302.0, sign: 'Aquarius', house: 11, retrograde: false },
  ],
}

const mockCalculateNatalChart = vi.fn().mockResolvedValue(mockNatalChart)
const mockIsNightChart = vi.fn().mockReturnValue(false)
const mockCalculateChiron = vi.fn().mockReturnValue({ longitude: 15 })
const mockCalculateLilith = vi.fn().mockReturnValue({ longitude: 45 })
const mockCalculatePartOfFortune = vi.fn().mockReturnValue({ longitude: 300 })
const mockCalculateVertex = vi.fn().mockReturnValue({ longitude: 180 })
const mockCalculateSolarReturn = vi.fn().mockResolvedValue({ planets: [] })
const mockGetSolarReturnSummary = vi.fn().mockReturnValue('Solar return summary')
const mockCalculateLunarReturn = vi.fn().mockResolvedValue({ planets: [] })
const mockGetLunarReturnSummary = vi.fn().mockReturnValue('Lunar return summary')
const mockCalculateSecondaryProgressions = vi.fn().mockResolvedValue({
  planets: [
    { name: 'Sun', longitude: 125.0 },
    { name: 'Moon', longitude: 75.0 },
  ],
})
const mockGetProgressedMoonPhase = vi.fn().mockReturnValue('waxing gibbous')
const mockCalculateSolarArcDirections = vi.fn().mockResolvedValue({ planets: [] })
const mockGetProgressionSummary = vi.fn().mockReturnValue('Progression summary')
const mockCalculateDraconicChart = vi.fn().mockReturnValue({ planets: [] })
const mockCompareDraconicToNatal = vi.fn().mockReturnValue({ alignments: [] })
const mockCalculateHarmonicChart = vi.fn().mockReturnValue({ planets: [] })
const mockGenerateHarmonicProfile = vi.fn().mockReturnValue({ dominantHarmonic: 5 })
const mockCalculateAllAsteroids = vi.fn().mockReturnValue({
  Ceres: { longitude: 100 },
  Pallas: { longitude: 200 },
  Juno: { longitude: 150 },
  Vesta: { longitude: 250 },
})
const mockFindAllAsteroidAspects = vi.fn().mockReturnValue([])
const mockFindFixedStarConjunctions = vi.fn().mockReturnValue([{ star: 'Regulus' }])
const mockFindEclipseImpact = vi.fn().mockReturnValue([{ type: 'solar' }])
const mockGetUpcomingEclipses = vi.fn().mockReturnValue([])
const mockGetMoonPhase = vi.fn().mockReturnValue('full')
const mockCheckVoidOfCourse = vi.fn().mockReturnValue({ isVoid: false })
const mockGetRetrogradePlanets = vi.fn().mockReturnValue([])
const mockCalculateMidpoints = vi.fn().mockReturnValue([
  { planet1: 'Sun', planet2: 'Moon', longitude: 90 },
  { planet1: 'Ascendant', planet2: 'MC', longitude: 135 },
])
const mockFindMidpointActivations = vi.fn().mockReturnValue([])
const mockCalculateTransitChart = vi.fn().mockResolvedValue(mockTransitChart)
const mockFindTransitAspects = vi.fn().mockReturnValue([
  { type: 'conjunction', transitPlanet: 'Jupiter', natalPoint: 'Sun', orb: 0.5, isApplying: true },
  { type: 'trine', transitPlanet: 'Saturn', natalPoint: 'Moon', orb: 1.0, isApplying: false },
])
const mockFindMajorTransits = vi.fn().mockReturnValue([
  {
    type: 'conjunction',
    transitPlanet: 'Jupiter',
    natalPoint: 'Sun',
    orb: 0.5,
    isApplying: true,
  },
])
const mockGetTransitKeywords = vi.fn().mockReturnValue({ keywords: ['growth', 'expansion'] })

vi.mock('@/lib/astrology', () => ({
  calculateNatalChart: mockCalculateNatalChart,
  isNightChart: mockIsNightChart,
  calculateChiron: mockCalculateChiron,
  calculateLilith: mockCalculateLilith,
  calculatePartOfFortune: mockCalculatePartOfFortune,
  calculateVertex: mockCalculateVertex,
  calculateSolarReturn: mockCalculateSolarReturn,
  getSolarReturnSummary: mockGetSolarReturnSummary,
  calculateLunarReturn: mockCalculateLunarReturn,
  getLunarReturnSummary: mockGetLunarReturnSummary,
  calculateSecondaryProgressions: mockCalculateSecondaryProgressions,
  getProgressedMoonPhase: mockGetProgressedMoonPhase,
  calculateSolarArcDirections: mockCalculateSolarArcDirections,
  getProgressionSummary: mockGetProgressionSummary,
  calculateDraconicChart: mockCalculateDraconicChart,
  compareDraconicToNatal: mockCompareDraconicToNatal,
  calculateHarmonicChart: mockCalculateHarmonicChart,
  generateHarmonicProfile: mockGenerateHarmonicProfile,
  calculateAllAsteroids: mockCalculateAllAsteroids,
  findAllAsteroidAspects: mockFindAllAsteroidAspects,
  findFixedStarConjunctions: mockFindFixedStarConjunctions,
  findEclipseImpact: mockFindEclipseImpact,
  getUpcomingEclipses: mockGetUpcomingEclipses,
  getMoonPhase: mockGetMoonPhase,
  checkVoidOfCourse: mockCheckVoidOfCourse,
  getRetrogradePlanets: mockGetRetrogradePlanets,
  calculateMidpoints: mockCalculateMidpoints,
  findMidpointActivations: mockFindMidpointActivations,
  calculateTransitChart: mockCalculateTransitChart,
  findTransitAspects: mockFindTransitAspects,
  findMajorTransits: mockFindMajorTransits,
  getTransitKeywords: mockGetTransitKeywords,
}))

// ============================================================
// Import the handler AFTER all mocks are in place
// ============================================================
import { POST } from '@/app/api/precompute-chart/route'
import { logger } from '@/lib/logger'

// ============================================================
// Helpers
// ============================================================

/** Valid request body shared across tests */
const validBody = {
  birthDate: '1990-05-15',
  birthTime: '14:30',
  latitude: 37.5665,
  longitude: 126.978,
  gender: 'Male',
  timezone: 'Asia/Seoul',
}

let requestSequence = 0

function makeRequestHeaders(base: Record<string, string> = {}) {
  requestSequence += 1
  return {
    ...base,
    // Keep each request on an isolated rate-limit key during test runs.
    'x-forwarded-for': `203.0.113.${(requestSequence % 240) + 10}`,
  }
}

/** Create a NextRequest with a JSON body */
function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/precompute-chart', {
    method: 'POST',
    headers: makeRequestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
}

// ============================================================
// Tests
// ============================================================

describe('Precompute Chart API - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Restore defaults for the happy path
    mockCalculateSajuData.mockResolvedValue(mockSajuFacts)
    mockGetDaeunCycles.mockReturnValue({ cycles: [{ age: 10 }] })
    mockGetAnnualCycles.mockReturnValue([{ year: 2026 }])
    mockGetMonthlyCycles.mockReturnValue([{ month: 1 }])
    mockAnalyzeExtendedSaju.mockReturnValue({ strength: 'strong' })
    mockDetermineGeokguk.mockReturnValue({ type: 'normal' })
    mockDetermineYongsin.mockReturnValue({ yongsin: '수' })
    mockCalculateTonggeun.mockReturnValue({ score: 3 })
    mockCalculateTuechul.mockReturnValue({ count: 2 })
    mockCalculateHoeguk.mockReturnValue({ type: 'none' })
    mockCalculateDeukryeong.mockReturnValue({ level: 'high' })
    mockAnalyzeHyeongchung.mockReturnValue({ interactions: [] })
    mockAnalyzeSibsinComprehensive.mockReturnValue({ pattern: 'balanced' })
    mockAnalyzeHealthCareer.mockReturnValue({ health: 'good' })
    mockCalculateComprehensiveScore.mockReturnValue({ total: 85 })
    mockPerformUltraAdvancedAnalysis.mockReturnValue({ deep: true })
    mockCalculateNatalChart.mockResolvedValue(mockNatalChart)
    mockCalculateTransitChart.mockResolvedValue(mockTransitChart)
    mockFindTransitAspects.mockReturnValue([
      {
        type: 'conjunction',
        transitPlanet: 'Jupiter',
        natalPoint: 'Sun',
        orb: 0.5,
        isApplying: true,
      },
      { type: 'trine', transitPlanet: 'Saturn', natalPoint: 'Moon', orb: 1.0, isApplying: false },
    ])
    mockFindMajorTransits.mockReturnValue([
      {
        type: 'conjunction',
        transitPlanet: 'Jupiter',
        natalPoint: 'Sun',
        orb: 0.5,
        isApplying: true,
      },
    ])
  })

  // ================================================================
  // 1. Input Validation
  // ================================================================
  describe('Input Validation', () => {
    it('should return 400 when request body is not valid JSON', async () => {
      const request = new NextRequest('http://localhost/api/precompute-chart', {
        method: 'POST',
        headers: makeRequestHeaders({ 'Content-Type': 'application/json' }),
        body: 'this is not json{{{',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should return 400 when birthDate is missing', async () => {
      const body = { ...validBody, birthDate: undefined }
      const response = await POST(makeRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
      expect(data.details).toBeDefined()
      expect(data.details.length).toBeGreaterThan(0)
      expect(data.details[0].path).toBe('birthDate')
    })

    it('should return 400 when birthDate has invalid format', async () => {
      const body = { ...validBody, birthDate: '15-05-1990' }
      const response = await POST(makeRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
      expect(data.details[0].path).toBe('birthDate')
    })

    it('should return 400 when birthTime is missing', async () => {
      const body = { ...validBody, birthTime: undefined }
      const response = await POST(makeRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
      expect(data.details[0].path).toBe('birthTime')
    })

    it('should return 400 when birthTime has invalid format', async () => {
      const body = { ...validBody, birthTime: '25:99' }
      const response = await POST(makeRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when latitude is out of range', async () => {
      const body = { ...validBody, latitude: 100 }
      const response = await POST(makeRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
      expect(data.details[0].path).toBe('latitude')
    })

    it('should return 400 when latitude is not a number', async () => {
      const body = { ...validBody, latitude: 'not-a-number' }
      const response = await POST(makeRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when longitude is out of range', async () => {
      const body = { ...validBody, longitude: -200 }
      const response = await POST(makeRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
      expect(data.details[0].path).toBe('longitude')
    })

    it('should return 400 when longitude is not a number', async () => {
      const body = { ...validBody, longitude: 'abc' }
      const response = await POST(makeRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should map validation error details with path and message', async () => {
      const body = { ...validBody, birthDate: 'bad' }
      const response = await POST(makeRequest(body))
      const data = await response.json()

      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: expect.any(String),
            message: expect.any(String),
          }),
        ])
      )
    })

    it('should log a warning when validation fails', async () => {
      const body = { ...validBody, birthDate: 'invalid' }
      await POST(makeRequest(body))

      expect(logger.warn).toHaveBeenCalledWith(
        '[precompute-chart] validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })
  })

  // ================================================================
  // 2. Successful Full Computation (Happy Path)
  // ================================================================
  describe('Successful Full Computation', () => {
    it('should return 200 with saju, astro, and advancedAstro data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju).toBeDefined()
      expect(data.astro).toBeDefined()
      expect(data.advancedAstro).toBeDefined()
    })

    it('should include saju pillars and dayMaster', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.saju.pillars).toBeDefined()
      expect(data.saju.pillars.year).toBeDefined()
      expect(data.saju.pillars.month).toBeDefined()
      expect(data.saju.pillars.day).toBeDefined()
      expect(data.saju.pillars.time).toBeDefined()
      expect(data.saju.dayMaster).toBeDefined()
    })

    it('should include saju unse cycles (daeun, annual, monthly)', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.saju.unse).toBeDefined()
      expect(data.saju.unse.daeun).toEqual([{ age: 10 }])
      expect(data.saju.unse.annual).toEqual([{ year: 2026 }])
      expect(data.saju.unse.monthly).toEqual([{ month: 1 }])
    })

    it('should call calculateSajuData with correct arguments', async () => {
      await POST(makeRequest(validBody))

      expect(mockCalculateSajuData).toHaveBeenCalledWith(
        '1990-05-15',
        '14:30',
        'male',
        'solar',
        'Asia/Seoul'
      )
    })

    it('should include advancedAnalysis in saju data when all pillars are present', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.saju.advancedAnalysis).toBeDefined()
      expect(data.saju.advancedAnalysis.extended).toEqual({ strength: 'strong' })
      expect(data.saju.advancedAnalysis.geokguk).toEqual({ type: 'normal' })
      expect(data.saju.advancedAnalysis.yongsin).toEqual({ yongsin: '수' })
      expect(data.saju.advancedAnalysis.tonggeun).toEqual({ score: 3 })
      expect(data.saju.advancedAnalysis.tuechul).toEqual({ count: 2 })
      expect(data.saju.advancedAnalysis.hoeguk).toEqual({ type: 'none' })
      expect(data.saju.advancedAnalysis.deukryeong).toEqual({ level: 'high' })
      expect(data.saju.advancedAnalysis.hyeongchung).toEqual({ interactions: [] })
      expect(data.saju.advancedAnalysis.sibsin).toEqual({ pattern: 'balanced' })
      expect(data.saju.advancedAnalysis.healthCareer).toEqual({ health: 'good' })
      expect(data.saju.advancedAnalysis.score).toEqual({ total: 85 })
      expect(data.saju.advancedAnalysis.ultraAdvanced).toEqual({ deep: true })
    })

    it('should include basic astro chart data (sun, moon, planets, houses)', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.astro.sun).toBeDefined()
      expect(data.astro.sun.name).toBe('Sun')
      expect(data.astro.moon).toBeDefined()
      expect(data.astro.moon.name).toBe('Moon')
      expect(data.astro.planets).toBeDefined()
      expect(data.astro.houses).toBeDefined()
      expect(data.astro.ascendant).toBeDefined()
      expect(data.astro.mc).toBeDefined()
    })

    it('should call calculateNatalChart with correct input', async () => {
      await POST(makeRequest(validBody))

      expect(mockCalculateNatalChart).toHaveBeenCalledWith({
        year: 1990,
        month: 5,
        date: 15,
        hour: 14,
        minute: 30,
        latitude: 37.5665,
        longitude: 126.978,
        timeZone: 'Asia/Seoul',
      })
    })

    it('should include advancedAstro extra points', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advancedAstro.extraPoints).toBeDefined()
      expect(data.advancedAstro.extraPoints.chiron).toBeDefined()
      expect(data.advancedAstro.extraPoints.lilith).toBeDefined()
      expect(data.advancedAstro.extraPoints.partOfFortune).toBeDefined()
      expect(data.advancedAstro.extraPoints.vertex).toBeDefined()
    })

    it('should include solar and lunar return data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advancedAstro.solarReturn).toBeDefined()
      expect(data.advancedAstro.solarReturn.summary).toBe('Solar return summary')
      expect(data.advancedAstro.lunarReturn).toBeDefined()
      expect(data.advancedAstro.lunarReturn.summary).toBe('Lunar return summary')
    })

    it('should include progressions data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advancedAstro.progressions).toBeDefined()
      expect(data.advancedAstro.progressions.secondary).toBeDefined()
      expect(data.advancedAstro.progressions.secondary.moonPhase).toBe('waxing gibbous')
      expect(data.advancedAstro.progressions.solarArc).toBeDefined()
    })

    it('should include draconic chart data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advancedAstro.draconic).toBeDefined()
      expect(data.advancedAstro.draconic.chart).toBeDefined()
      expect(data.advancedAstro.draconic.comparison).toBeDefined()
    })

    it('should include harmonic analysis data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advancedAstro.harmonics).toBeDefined()
      expect(data.advancedAstro.harmonics.h5).toBeDefined()
      expect(data.advancedAstro.harmonics.h7).toBeDefined()
      expect(data.advancedAstro.harmonics.h9).toBeDefined()
      expect(data.advancedAstro.harmonics.profile).toBeDefined()
    })

    it('should include asteroid data when jdUT is present', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advancedAstro.asteroids).toBeDefined()
      expect(data.advancedAstro.asteroids.ceres).toBeDefined()
      expect(data.advancedAstro.asteroids.pallas).toBeDefined()
      expect(data.advancedAstro.asteroids.juno).toBeDefined()
      expect(data.advancedAstro.asteroids.vesta).toBeDefined()
    })

    it('should include fixed star conjunctions', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advancedAstro.fixedStars).toBeDefined()
    })

    it('should include eclipse data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advancedAstro.eclipses).toBeDefined()
      expect(data.advancedAstro.eclipses.impact).toEqual({ type: 'solar' })
    })

    it('should include electional astrology data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advancedAstro.electional).toBeDefined()
      expect(data.advancedAstro.electional.moonPhase).toBe('full')
      expect(data.advancedAstro.electional.voidOfCourse).toEqual({ isVoid: false })
      expect(data.advancedAstro.electional.retrograde).toEqual([])
    })

    it('should include midpoint data with sunMoon and ascMc', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advancedAstro.midpoints).toBeDefined()
      expect(data.advancedAstro.midpoints.sunMoon).toEqual({
        planet1: 'Sun',
        planet2: 'Moon',
        longitude: 90,
      })
      expect(data.advancedAstro.midpoints.ascMc).toEqual({
        planet1: 'Ascendant',
        planet2: 'MC',
        longitude: 135,
      })
      expect(data.advancedAstro.midpoints.all).toBeDefined()
    })

    it('should include current transit analysis', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advancedAstro.currentTransits).toBeDefined()
      expect(data.advancedAstro.currentTransits.date).toBeDefined()
      expect(data.advancedAstro.currentTransits.aspects).toBeDefined()
      expect(data.advancedAstro.currentTransits.majorTransits).toBeDefined()
      expect(data.advancedAstro.currentTransits.themes).toBeDefined()
      expect(data.advancedAstro.currentTransits.outerPlanets).toBeDefined()
      expect(data.advancedAstro.currentTransits.summary).toBeDefined()
    })

    it('should correctly compute transit summary counts', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      const summary = data.advancedAstro.currentTransits.summary
      expect(summary.activeCount).toBe(2)
      expect(summary.majorCount).toBe(1)
      expect(summary.applyingCount).toBe(1)
      expect(summary.separatingCount).toBe(1)
    })

    it('should filter outer planets from transit chart', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      const outerPlanets = data.advancedAstro.currentTransits.outerPlanets
      const names = outerPlanets.map((p: { name: string }) => p.name)
      expect(names).toContain('Jupiter')
      expect(names).toContain('Saturn')
      expect(names).toContain('Uranus')
      expect(names).toContain('Neptune')
      expect(names).toContain('Pluto')
      // Inner planets should NOT be in outerPlanets
      expect(names).not.toContain('Sun')
      expect(names).not.toContain('Moon')
    })
  })

  // ================================================================
  // 3. Gender Handling
  // ================================================================
  describe('Gender Handling', () => {
    it('should map "Male" to "male"', async () => {
      await POST(makeRequest({ ...validBody, gender: 'Male' }))
      expect(mockCalculateSajuData).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'male',
        'solar',
        expect.any(String)
      )
    })

    it('should map "male" (lowercase) to "male"', async () => {
      await POST(makeRequest({ ...validBody, gender: 'male' }))
      expect(mockCalculateSajuData).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'male',
        'solar',
        expect.any(String)
      )
    })

    it('should map "Female" to "female"', async () => {
      await POST(makeRequest({ ...validBody, gender: 'Female' }))
      expect(mockCalculateSajuData).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'female',
        'solar',
        expect.any(String)
      )
    })

    it('should map "female" (lowercase) to "female"', async () => {
      await POST(makeRequest({ ...validBody, gender: 'female' }))
      expect(mockCalculateSajuData).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'female',
        'solar',
        expect.any(String)
      )
    })

    it('should default unknown gender values to "female"', async () => {
      await POST(makeRequest({ ...validBody, gender: 'Other' }))
      expect(mockCalculateSajuData).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'female',
        'solar',
        expect.any(String)
      )
    })
  })

  // ================================================================
  // 4. Timezone Handling
  // ================================================================
  describe('Timezone Handling', () => {
    it('should default timezone to Asia/Seoul when not provided', async () => {
      const body = { ...validBody, timezone: undefined }
      await POST(makeRequest(body))

      expect(mockCalculateSajuData).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'solar',
        'Asia/Seoul'
      )
    })

    it('should use the provided timezone when given', async () => {
      const body = { ...validBody, timezone: 'America/New_York' }
      await POST(makeRequest(body))

      expect(mockCalculateSajuData).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'solar',
        'America/New_York'
      )
    })
  })

  // ================================================================
  // 5. Optional Fields
  // ================================================================
  describe('Optional Fields', () => {
    it('should succeed when gender is omitted', async () => {
      const body = { ...validBody, gender: undefined }
      const response = await POST(makeRequest(body))
      expect(response.status).toBe(200)
    })

    it('should succeed when timezone is omitted', async () => {
      const body = { ...validBody, timezone: undefined }
      const response = await POST(makeRequest(body))
      expect(response.status).toBe(200)
    })

    it('should succeed when both gender and timezone are omitted', async () => {
      const { gender: _g, timezone: _tz, ...bodyWithoutOptionals } = validBody
      const response = await POST(makeRequest(bodyWithoutOptionals))
      expect(response.status).toBe(200)
    })
  })

  // ================================================================
  // 6. Partial Failure Resilience - Saju
  // ================================================================
  describe('Partial Failure Resilience - Saju', () => {
    it('should return null saju when calculateSajuData throws', async () => {
      mockCalculateSajuData.mockRejectedValue(new Error('Saju engine failure'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju).toBeNull()
    })

    it('should return null saju when calculateSajuData returns null/falsy', async () => {
      mockCalculateSajuData.mockResolvedValue(null)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju).toBeNull()
    })

    it('should still include basic saju when cycle calculations fail', async () => {
      mockGetDaeunCycles.mockImplementation(() => {
        throw new Error('daeun fail')
      })
      mockGetAnnualCycles.mockImplementation(() => {
        throw new Error('annual fail')
      })
      mockGetMonthlyCycles.mockImplementation(() => {
        throw new Error('monthly fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju).toBeDefined()
      expect(data.saju.pillars).toBeDefined()
      // Cycles should be empty arrays when calculation fails
      expect(data.saju.unse.daeun).toEqual([])
      expect(data.saju.unse.annual).toEqual([])
      expect(data.saju.unse.monthly).toEqual([])
    })

    it('should still return saju without advancedAnalysis when analyzeExtendedSaju throws', async () => {
      mockAnalyzeExtendedSaju.mockImplementation(() => {
        throw new Error('extended fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju).toBeDefined()
      expect(data.saju.advancedAnalysis).toBeDefined()
      // extended should be absent since it failed, but the object should exist
      expect(data.saju.advancedAnalysis.extended).toBeUndefined()
    })

    it('should still return saju when determineGeokguk throws', async () => {
      mockDetermineGeokguk.mockImplementation(() => {
        throw new Error('geokguk fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju.advancedAnalysis).toBeDefined()
      expect(data.saju.advancedAnalysis.geokguk).toBeUndefined()
    })

    it('should still return saju when determineYongsin throws', async () => {
      mockDetermineYongsin.mockImplementation(() => {
        throw new Error('yongsin fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju.advancedAnalysis).toBeDefined()
      expect(data.saju.advancedAnalysis.yongsin).toBeUndefined()
    })

    it('should still return saju when tonggeun/tuechul/hoeguk/deukryeong throw', async () => {
      mockCalculateTonggeun.mockImplementation(() => {
        throw new Error('tonggeun fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju.advancedAnalysis).toBeDefined()
      // When tonggeun throws, all four in the same try block are lost
      expect(data.saju.advancedAnalysis.tonggeun).toBeUndefined()
    })

    it('should still return saju when analyzeHyeongchung throws', async () => {
      mockAnalyzeHyeongchung.mockImplementation(() => {
        throw new Error('hyeongchung fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju.advancedAnalysis.hyeongchung).toBeUndefined()
    })

    it('should still return saju when analyzeSibsinComprehensive throws', async () => {
      mockAnalyzeSibsinComprehensive.mockImplementation(() => {
        throw new Error('sibsin fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju.advancedAnalysis.sibsin).toBeUndefined()
    })

    it('should still return saju when analyzeHealthCareer throws', async () => {
      mockAnalyzeHealthCareer.mockImplementation(() => {
        throw new Error('health fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju.advancedAnalysis.healthCareer).toBeUndefined()
    })

    it('should still return saju when calculateComprehensiveScore throws', async () => {
      mockCalculateComprehensiveScore.mockImplementation(() => {
        throw new Error('score fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju.advancedAnalysis.score).toBeUndefined()
    })

    it('should still return saju when performUltraAdvancedAnalysis throws', async () => {
      mockPerformUltraAdvancedAnalysis.mockImplementation(() => {
        throw new Error('ultra fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju.advancedAnalysis.ultraAdvanced).toBeUndefined()
    })

    it('should not compute advanced saju when timePillar is missing', async () => {
      const factsWithoutTime = {
        ...mockSajuFacts,
        timePillar: null,
      }
      mockCalculateSajuData.mockResolvedValue(factsWithoutTime)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju).toBeDefined()
      // advancedAnalysis should NOT be present when timePillar is missing
      expect(data.saju.advancedAnalysis).toBeUndefined()
    })

    it('should not compute cycles when year/month/day pillars are missing', async () => {
      const factsWithoutYearPillar = {
        ...mockSajuFacts,
        yearPillar: null,
        monthPillar: null,
        dayPillar: null,
      }
      mockCalculateSajuData.mockResolvedValue(factsWithoutYearPillar)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju.unse.daeun).toEqual([])
      expect(data.saju.unse.annual).toEqual([])
      expect(data.saju.unse.monthly).toEqual([])
      expect(mockGetDaeunCycles).not.toHaveBeenCalled()
    })
  })

  // ================================================================
  // 7. Partial Failure Resilience - Astrology
  // ================================================================
  describe('Partial Failure Resilience - Astrology', () => {
    it('should return null astro data when calculateNatalChart throws', async () => {
      mockCalculateNatalChart.mockRejectedValue(new Error('Natal chart failure'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.astro).toBeNull()
      expect(data.advancedAstro).toBeNull()
    })

    it('should return null astro when natal chart returns null', async () => {
      mockCalculateNatalChart.mockResolvedValue(null)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.astro).toBeNull()
      expect(data.advancedAstro).toBeNull()
    })

    it('should still return astro when extraPoints calculation fails', async () => {
      mockCalculateChiron.mockImplementation(() => {
        throw new Error('chiron fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.astro).toBeDefined()
      expect(data.advancedAstro).toBeDefined()
      expect(data.advancedAstro.extraPoints).toBeUndefined()
    })

    it('should still return astro when solar return calculation fails', async () => {
      mockCalculateSolarReturn.mockRejectedValue(new Error('SR fail'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.advancedAstro.solarReturn).toBeUndefined()
    })

    it('should still return astro when lunar return calculation fails', async () => {
      mockCalculateLunarReturn.mockRejectedValue(new Error('LR fail'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.advancedAstro.lunarReturn).toBeUndefined()
    })

    it('should still return astro when progressions calculation fails', async () => {
      mockCalculateSecondaryProgressions.mockRejectedValue(new Error('Prog fail'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.advancedAstro.progressions).toBeUndefined()
    })

    it('should still return astro when draconic chart calculation fails', async () => {
      mockCalculateDraconicChart.mockImplementation(() => {
        throw new Error('Draconic fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.advancedAstro.draconic).toBeUndefined()
    })

    it('should still return astro when harmonic calculation fails', async () => {
      mockCalculateHarmonicChart.mockImplementation(() => {
        throw new Error('Harmonic fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.advancedAstro.harmonics).toBeUndefined()
    })

    it('should skip asteroids when jdUT is not present in meta', async () => {
      const chartWithoutJdUT = { ...mockNatalChart, meta: {} }
      mockCalculateNatalChart.mockResolvedValue(chartWithoutJdUT)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.advancedAstro.asteroids).toBeUndefined()
      expect(mockCalculateAllAsteroids).not.toHaveBeenCalled()
    })

    it('should still return astro when asteroid calculation fails', async () => {
      mockCalculateAllAsteroids.mockImplementation(() => {
        throw new Error('Asteroid fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.advancedAstro.asteroids).toBeUndefined()
    })

    it('should still return astro when fixed star calculation fails', async () => {
      mockFindFixedStarConjunctions.mockImplementation(() => {
        throw new Error('Fixed star fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.advancedAstro.fixedStars).toBeUndefined()
    })

    it('should still return astro when eclipse calculation fails', async () => {
      mockFindEclipseImpact.mockImplementation(() => {
        throw new Error('Eclipse fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.advancedAstro.eclipses).toBeUndefined()
    })

    it('should skip electional when Sun or Moon planet data is missing', async () => {
      const chartWithoutSunMoon = {
        ...mockNatalChart,
        planets: mockNatalChart.planets.filter((p) => p.name !== 'Sun' && p.name !== 'Moon'),
      }
      mockCalculateNatalChart.mockResolvedValue(chartWithoutSunMoon)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      // electional requires both sunPlanet and moonPlanet
      expect(data.advancedAstro.electional).toBeUndefined()
    })

    it('should still return astro when electional calculation fails', async () => {
      mockGetMoonPhase.mockImplementation(() => {
        throw new Error('MoonPhase fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.advancedAstro.electional).toBeUndefined()
    })

    it('should still return astro when midpoint calculation fails', async () => {
      mockCalculateMidpoints.mockImplementation(() => {
        throw new Error('Midpoint fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.advancedAstro.midpoints).toBeUndefined()
    })

    it('should still return astro when transit chart calculation fails', async () => {
      mockCalculateTransitChart.mockRejectedValue(new Error('Transit fail'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.advancedAstro.currentTransits).toBeUndefined()
    })

    it('should skip transit analysis when transit chart returns null', async () => {
      mockCalculateTransitChart.mockResolvedValue(null)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.advancedAstro.currentTransits).toBeUndefined()
    })

    it('should handle eclipse impact returning empty array', async () => {
      mockFindEclipseImpact.mockReturnValue([])

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.advancedAstro.eclipses.impact).toBeNull()
    })
  })

  // ================================================================
  // 8. Progressions Edge Cases
  // ================================================================
  describe('Progressions Edge Cases', () => {
    it('should set moonPhase to null when progressed Sun or Moon is missing', async () => {
      mockCalculateSecondaryProgressions.mockResolvedValue({
        planets: [
          // Only Sun, no Moon
          { name: 'Sun', longitude: 125.0 },
        ],
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.advancedAstro.progressions.secondary.moonPhase).toBeNull()
      expect(mockGetProgressedMoonPhase).not.toHaveBeenCalled()
    })
  })

  // ================================================================
  // 9. Top-Level Error Handling
  // ================================================================
  describe('Top-Level Error Handling', () => {
    it('should return 500 when req.json() throws', async () => {
      // Simulate a request where .json() throws (e.g., network error)
      const request = new NextRequest('http://localhost/api/precompute-chart', {
        method: 'POST',
        headers: makeRequestHeaders({ 'Content-Type': 'application/json' }),
        body: '<<<invalid>>>',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(logger.error).toHaveBeenCalled()
    })

    it('should log the error in the top-level catch block', async () => {
      const request = new NextRequest('http://localhost/api/precompute-chart', {
        method: 'POST',
        headers: makeRequestHeaders({ 'Content-Type': 'application/json' }),
        body: '<<<broken json>>>',
      })

      await POST(request)

      expect(logger.error).toHaveBeenCalledWith('[precompute-chart] Error:', expect.anything())
    })
  })

  // ================================================================
  // 10. Both Saju and Astro can fail independently
  // ================================================================
  describe('Independent Failure Modes', () => {
    it('should return saju=null but valid astro when saju fails entirely', async () => {
      mockCalculateSajuData.mockRejectedValue(new Error('Saju down'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju).toBeNull()
      expect(data.astro).toBeDefined()
      expect(data.advancedAstro).toBeDefined()
    })

    it('should return valid saju but astro=null when astro fails entirely', async () => {
      mockCalculateNatalChart.mockRejectedValue(new Error('Astro down'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju).toBeDefined()
      expect(data.astro).toBeNull()
      expect(data.advancedAstro).toBeNull()
    })

    it('should return all nulls when both saju and astro fail', async () => {
      mockCalculateSajuData.mockRejectedValue(new Error('Saju down'))
      mockCalculateNatalChart.mockRejectedValue(new Error('Astro down'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju).toBeNull()
      expect(data.astro).toBeNull()
      expect(data.advancedAstro).toBeNull()
    })
  })

  // ================================================================
  // 11. Boundary Values
  // ================================================================
  describe('Boundary Values', () => {
    it('should accept latitude at -90 (south pole)', async () => {
      const body = { ...validBody, latitude: -90 }
      const response = await POST(makeRequest(body))
      expect(response.status).toBe(200)
    })

    it('should accept latitude at 90 (north pole)', async () => {
      const body = { ...validBody, latitude: 90 }
      const response = await POST(makeRequest(body))
      expect(response.status).toBe(200)
    })

    it('should accept longitude at -180', async () => {
      const body = { ...validBody, longitude: -180 }
      const response = await POST(makeRequest(body))
      expect(response.status).toBe(200)
    })

    it('should accept longitude at 180', async () => {
      const body = { ...validBody, longitude: 180 }
      const response = await POST(makeRequest(body))
      expect(response.status).toBe(200)
    })

    it('should reject latitude at -90.01', async () => {
      const body = { ...validBody, latitude: -90.01 }
      const response = await POST(makeRequest(body))
      expect(response.status).toBe(400)
    })

    it('should reject longitude at 180.01', async () => {
      const body = { ...validBody, longitude: 180.01 }
      const response = await POST(makeRequest(body))
      expect(response.status).toBe(400)
    })

    it('should handle birthTime at midnight 00:00', async () => {
      const body = { ...validBody, birthTime: '00:00' }
      const response = await POST(makeRequest(body))
      expect(response.status).toBe(200)
    })

    it('should handle birthTime at 23:59', async () => {
      const body = { ...validBody, birthTime: '23:59' }
      const response = await POST(makeRequest(body))
      expect(response.status).toBe(200)
    })

    it('should handle birthDate at year boundary 2000-01-01', async () => {
      const body = { ...validBody, birthDate: '2000-01-01' }
      const response = await POST(makeRequest(body))
      expect(response.status).toBe(200)
    })

    it('should handle birthDate at 1900-12-31', async () => {
      const body = { ...validBody, birthDate: '1900-12-31' }
      const response = await POST(makeRequest(body))
      expect(response.status).toBe(200)
    })
  })

  // ================================================================
  // 12. Multiple Advanced Saju Failures
  // ================================================================
  describe('Multiple Advanced Saju Partial Failures', () => {
    it('should gracefully handle ALL advanced saju sub-analyses failing simultaneously', async () => {
      mockAnalyzeExtendedSaju.mockImplementation(() => {
        throw new Error('fail')
      })
      mockDetermineGeokguk.mockImplementation(() => {
        throw new Error('fail')
      })
      mockDetermineYongsin.mockImplementation(() => {
        throw new Error('fail')
      })
      mockCalculateTonggeun.mockImplementation(() => {
        throw new Error('fail')
      })
      mockCalculateTuechul.mockImplementation(() => {
        throw new Error('fail')
      })
      mockCalculateHoeguk.mockImplementation(() => {
        throw new Error('fail')
      })
      mockCalculateDeukryeong.mockImplementation(() => {
        throw new Error('fail')
      })
      mockAnalyzeHyeongchung.mockImplementation(() => {
        throw new Error('fail')
      })
      mockAnalyzeSibsinComprehensive.mockImplementation(() => {
        throw new Error('fail')
      })
      mockAnalyzeHealthCareer.mockImplementation(() => {
        throw new Error('fail')
      })
      mockCalculateComprehensiveScore.mockImplementation(() => {
        throw new Error('fail')
      })
      mockPerformUltraAdvancedAnalysis.mockImplementation(() => {
        throw new Error('fail')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju).toBeDefined()
      expect(data.saju.advancedAnalysis).toBeDefined()
      // All sub-fields should be absent/undefined
      expect(data.saju.advancedAnalysis.extended).toBeUndefined()
      expect(data.saju.advancedAnalysis.geokguk).toBeUndefined()
      expect(data.saju.advancedAnalysis.yongsin).toBeUndefined()
      expect(data.saju.advancedAnalysis.tonggeun).toBeUndefined()
    })
  })

  // ================================================================
  // 13. Multiple Advanced Astro Failures
  // ================================================================
  describe('Multiple Advanced Astro Partial Failures', () => {
    it('should gracefully handle ALL advanced astro sub-analyses failing simultaneously', async () => {
      mockCalculateChiron.mockImplementation(() => {
        throw new Error('fail')
      })
      mockCalculateSolarReturn.mockRejectedValue(new Error('fail'))
      mockCalculateLunarReturn.mockRejectedValue(new Error('fail'))
      mockCalculateSecondaryProgressions.mockRejectedValue(new Error('fail'))
      mockCalculateDraconicChart.mockImplementation(() => {
        throw new Error('fail')
      })
      mockCalculateHarmonicChart.mockImplementation(() => {
        throw new Error('fail')
      })
      mockCalculateAllAsteroids.mockImplementation(() => {
        throw new Error('fail')
      })
      mockFindFixedStarConjunctions.mockImplementation(() => {
        throw new Error('fail')
      })
      mockFindEclipseImpact.mockImplementation(() => {
        throw new Error('fail')
      })
      mockGetMoonPhase.mockImplementation(() => {
        throw new Error('fail')
      })
      mockCalculateMidpoints.mockImplementation(() => {
        throw new Error('fail')
      })
      mockCalculateTransitChart.mockRejectedValue(new Error('fail'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.astro).toBeDefined()
      expect(data.advancedAstro).toBeDefined()
      // All advanced sub-sections should be absent
      expect(data.advancedAstro.extraPoints).toBeUndefined()
      expect(data.advancedAstro.solarReturn).toBeUndefined()
      expect(data.advancedAstro.lunarReturn).toBeUndefined()
      expect(data.advancedAstro.progressions).toBeUndefined()
      expect(data.advancedAstro.draconic).toBeUndefined()
      expect(data.advancedAstro.harmonics).toBeUndefined()
      expect(data.advancedAstro.asteroids).toBeUndefined()
      expect(data.advancedAstro.fixedStars).toBeUndefined()
      expect(data.advancedAstro.eclipses).toBeUndefined()
      expect(data.advancedAstro.electional).toBeUndefined()
      expect(data.advancedAstro.midpoints).toBeUndefined()
      expect(data.advancedAstro.currentTransits).toBeUndefined()
    })
  })

  // ================================================================
  // 14. Date / Time Parsing
  // ================================================================
  describe('Date and Time Parsing', () => {
    it('should correctly parse year, month, day from birthDate', async () => {
      const body = { ...validBody, birthDate: '2005-12-25' }
      await POST(makeRequest(body))

      expect(mockCalculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({
          year: 2005,
          month: 12,
          date: 25,
        })
      )
    })

    it('should correctly parse hour, minute from birthTime', async () => {
      const body = { ...validBody, birthTime: '08:45' }
      await POST(makeRequest(body))

      expect(mockCalculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({
          hour: 8,
          minute: 45,
        })
      )
    })
  })

  // ================================================================
  // 15. getDaeunCycles return value handling
  // ================================================================
  describe('Daeun Cycles Return Value Handling', () => {
    it('should handle getDaeunCycles returning object without cycles array', async () => {
      mockGetDaeunCycles.mockReturnValue({ notCycles: 'something' })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju.unse.daeun).toEqual([])
    })

    it('should handle getDaeunCycles returning null', async () => {
      mockGetDaeunCycles.mockReturnValue(null)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju.unse.daeun).toEqual([])
    })

    it('should handle getAnnualCycles returning null', async () => {
      mockGetAnnualCycles.mockReturnValue(null)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju.unse.annual).toEqual([])
    })

    it('should handle getMonthlyCycles returning null', async () => {
      mockGetMonthlyCycles.mockReturnValue(null)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.saju.unse.monthly).toEqual([])
    })
  })

  // ================================================================
  // 16. Natal chart with missing houses/planets arrays
  // ================================================================
  describe('Natal Chart with Sparse Data', () => {
    it('should handle natal chart without houses array', async () => {
      const chartWithoutHouses = {
        ...mockNatalChart,
        houses: undefined,
      }
      mockCalculateNatalChart.mockResolvedValue(chartWithoutHouses)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.astro).toBeDefined()
    })

    it('should handle natal chart without planets array', async () => {
      const chartWithoutPlanets = {
        ...mockNatalChart,
        planets: undefined,
      }
      mockCalculateNatalChart.mockResolvedValue(chartWithoutPlanets)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.astro).toBeDefined()
      expect(data.astro.sun).toBeUndefined()
      expect(data.astro.moon).toBeUndefined()
    })

    it('should handle natal chart without ascendant', async () => {
      const chartWithoutAsc = {
        ...mockNatalChart,
        ascendant: undefined,
      }
      mockCalculateNatalChart.mockResolvedValue(chartWithoutAsc)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.astro.ascendant).toBeUndefined()
    })
  })

  // ================================================================
  // 17. Transit themes - limited to first 5
  // ================================================================
  describe('Transit Themes Limit', () => {
    it('should limit transit themes to the first 5 major transits', async () => {
      const manyTransits = Array.from({ length: 10 }, (_, i) => ({
        type: 'conjunction',
        transitPlanet: `Planet${i}`,
        natalPoint: `Point${i}`,
        orb: 0.5,
        isApplying: true,
      }))
      mockFindMajorTransits.mockReturnValue(manyTransits)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advancedAstro.currentTransits.themes.length).toBe(5)
    })

    it('should limit transit aspects to the first 20', async () => {
      const manyAspects = Array.from({ length: 30 }, (_, i) => ({
        type: 'conjunction',
        transitPlanet: `Planet${i}`,
        natalPoint: `Point${i}`,
        orb: 0.5,
        isApplying: i % 2 === 0,
      }))
      mockFindTransitAspects.mockReturnValue(manyAspects)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advancedAstro.currentTransits.aspects.length).toBe(20)
    })
  })

  // ================================================================
  // 18. Pillar Jijanggan Defaults
  // ================================================================
  describe('Pillar Jijanggan Defaults', () => {
    it('should default jijanggan to empty object when not present on pillars', async () => {
      const factsNoJijanggan = {
        ...mockSajuFacts,
        yearPillar: {
          heavenlyStem: { name: '갑', element: '목' },
          earthlyBranch: { name: '자', element: '수' },
          // jijanggan intentionally omitted
        },
        monthPillar: {
          heavenlyStem: { name: '병', element: '화' },
          earthlyBranch: { name: '인', element: '목' },
        },
        dayPillar: {
          heavenlyStem: { name: '무', element: '토' },
          earthlyBranch: { name: '오', element: '화' },
        },
        timePillar: {
          heavenlyStem: { name: '경', element: '금' },
          earthlyBranch: { name: '신', element: '금' },
        },
      }
      mockCalculateSajuData.mockResolvedValue(factsNoJijanggan)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      // The advanced analysis should still compute without error
      expect(data.saju.advancedAnalysis).toBeDefined()
    })
  })

  // ================================================================
  // 19. Saju facts with birthDate appended
  // ================================================================
  describe('Saju Facts Enrichment', () => {
    it('should include birthDate in saju facts', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.saju.facts.birthDate).toBe('1990-05-15')
    })
  })
})
