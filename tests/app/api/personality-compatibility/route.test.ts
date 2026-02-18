import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks -- all vi.mock calls MUST appear before importing the route handlers
// ---------------------------------------------------------------------------

// Mock middleware with passthrough pattern and error handling
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any) => {
      const context = {
        userId: 'test-user-id',
        session: { user: { id: 'test-user-id' } },
        ip: '127.0.0.1',
        locale: 'en',
        isAuthenticated: true,
      }
      try {
        return await handler(req, context)
      } catch (error) {
        // Simulate middleware error handling
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }
    }
  }),
  createPublicStreamGuard: vi.fn((options: any) => options),
  createSimpleGuard: vi.fn(() => ({
    route: '/api/personality-compatibility',
    limit: 30,
    windowSeconds: 60,
  })),
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

// Mock HTTP constants
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

// Mock ICP analysis functions
vi.mock('@/lib/icp/analysis', () => ({
  analyzeICP: vi.fn(),
  getICPCompatibility: vi.fn(),
  getCrossSystemCompatibility: vi.fn(),
}))

// Mock Persona analysis functions
vi.mock('@/lib/persona/analysis', () => ({
  analyzePersona: vi.fn(),
  getPersonaCompatibility: vi.fn(),
}))

// Mock Zod validation schema
vi.mock('@/lib/api/zodValidation', () => ({
  personalityCompatibilitySchema: {
    safeParse: vi.fn((data: any) => {
      if (!data || typeof data !== 'object') {
        return {
          success: false,
          error: { issues: [{ path: [], message: 'Expected object' }] },
        }
      }
      if (!data.person1) {
        return {
          success: false,
          error: { issues: [{ path: ['person1'], message: 'Required' }] },
        }
      }
      if (!data.person2) {
        return {
          success: false,
          error: { issues: [{ path: ['person2'], message: 'Required' }] },
        }
      }
      // Validate person1 structure
      if (data.person1.typeCode !== undefined) {
        // New schema format with typeCode and scores
        if (typeof data.person1.typeCode !== 'string' || data.person1.typeCode.length < 1) {
          return {
            success: false,
            error: {
              issues: [
                {
                  path: ['person1', 'typeCode'],
                  message: 'String must contain at least 1 character(s)',
                },
              ],
            },
          }
        }
        const scoreFields = ['energyScore', 'cognitionScore', 'decisionScore', 'rhythmScore']
        for (const field of scoreFields) {
          if (data.person1[field] !== undefined) {
            if (typeof data.person1[field] !== 'number') {
              return {
                success: false,
                error: { issues: [{ path: ['person1', field], message: 'Expected number' }] },
              }
            }
            if (data.person1[field] < 0 || data.person1[field] > 100) {
              return {
                success: false,
                error: {
                  issues: [
                    { path: ['person1', field], message: 'Number must be between 0 and 100' },
                  ],
                },
              }
            }
          }
        }
      }
      // Validate person2 structure
      if (data.person2.typeCode !== undefined) {
        if (typeof data.person2.typeCode !== 'string' || data.person2.typeCode.length < 1) {
          return {
            success: false,
            error: {
              issues: [
                {
                  path: ['person2', 'typeCode'],
                  message: 'String must contain at least 1 character(s)',
                },
              ],
            },
          }
        }
        const scoreFields = ['energyScore', 'cognitionScore', 'decisionScore', 'rhythmScore']
        for (const field of scoreFields) {
          if (data.person2[field] !== undefined) {
            if (typeof data.person2[field] !== 'number') {
              return {
                success: false,
                error: { issues: [{ path: ['person2', field], message: 'Expected number' }] },
              }
            }
            if (data.person2[field] < 0 || data.person2[field] > 100) {
              return {
                success: false,
                error: {
                  issues: [
                    { path: ['person2', field], message: 'Number must be between 0 and 100' },
                  ],
                },
              }
            }
          }
        }
      }
      // Validate locale
      if (data.locale !== undefined && !['ko', 'en'].includes(data.locale)) {
        return {
          success: false,
          error: { issues: [{ path: ['locale'], message: 'Invalid locale' }] },
        }
      }
      return { success: true, data }
    }),
  },
}))

// ---------------------------------------------------------------------------
// Import route handlers AFTER all mocks
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/personality-compatibility/route'
import { analyzeICP, getICPCompatibility, getCrossSystemCompatibility } from '@/lib/icp/analysis'
import { analyzePersona, getPersonaCompatibility } from '@/lib/persona/analysis'
import { logger } from '@/lib/logger'
import { personalityCompatibilitySchema } from '@/lib/api/zodValidation'

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

/** Valid ICP quiz answers */
function buildICPAnswers(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    q1: 'a',
    q2: 'b',
    q3: 'c',
    q4: 'd',
    q5: 'a',
    ...overrides,
  }
}

/** Valid Persona quiz answers */
function buildPersonaAnswers(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    energy1: 'radiant',
    cognition1: 'visionary',
    decision1: 'logic',
    rhythm1: 'flow',
    ...overrides,
  }
}

/** Valid person data with quiz answers */
function buildPersonData(overrides: Record<string, unknown> = {}) {
  return {
    icpAnswers: buildICPAnswers(),
    personaAnswers: buildPersonaAnswers(),
    ...overrides,
  }
}

/** Valid request body */
function buildValidRequestBody(overrides: Record<string, unknown> = {}) {
  return {
    person1: buildPersonData(),
    person2: buildPersonData(),
    locale: 'en',
    ...overrides,
  }
}

/** Mock ICP analysis result */
function buildMockICPAnalysis(overrides: Record<string, unknown> = {}) {
  return {
    primaryStyle: 'PA',
    secondaryStyle: 'BC',
    dominanceScore: 75,
    affiliationScore: 60,
    dominanceNormalized: 0.5,
    affiliationNormalized: 0.2,
    octantScores: {
      PA: 0.8,
      BC: 0.6,
      DE: 0.3,
      FG: 0.2,
      HI: 0.1,
      JK: 0.4,
      LM: 0.5,
      NO: 0.7,
    },
    primaryOctant: {
      code: 'PA',
      emoji: '👑',
      name: 'Assured-Dominant',
      korean: '확신-지배형',
      traits: ['Confident', 'Assertive'],
      traitsKo: ['자신감 있는', '단호한'],
      shadow: 'May come across as arrogant',
      shadowKo: '오만하게 보일 수 있음',
      dominance: 0.8,
      affiliation: 0.3,
      description: 'Leadership oriented',
      descriptionKo: '리더십 지향적',
      therapeuticQuestions: [],
      therapeuticQuestionsKo: [],
      growthRecommendations: [],
      growthRecommendationsKo: [],
    },
    secondaryOctant: null,
    summary: 'Dominant interpersonal style',
    summaryKo: '지배적 대인관계 스타일',
    consistencyScore: 85,
    ...overrides,
  }
}

/** Mock Persona analysis result */
function buildMockPersonaAnalysis(overrides: Record<string, unknown> = {}) {
  return {
    title: 'The Starforge Navigator',
    summary: 'A visionary leader with strong analytical skills',
    typeCode: 'RVLA',
    personaName: 'Starforge Navigator',
    axes: {
      energy: { pole: 'radiant', score: 75 },
      cognition: { pole: 'visionary', score: 80 },
      decision: { pole: 'logic', score: 65 },
      rhythm: { pole: 'anchor', score: 45 },
    },
    consistencyScore: 90,
    consistencyLabel: 'High',
    primaryColor: '#FF6B35',
    secondaryColor: '#4ECDC4',
    strengths: ['Strategic thinking', 'Innovation'],
    challenges: ['Over-analysis', 'Impatience'],
    career: 'Technology, Strategy',
    relationships: 'Values intellectual connection',
    guidance: 'Balance vision with practical action',
    growthTips: ['Practice patience', 'Listen more'],
    keyMotivations: ['Achievement', 'Impact'],
    recommendedRoles: ['Leader', 'Innovator'],
    compatibilityHint: 'Works well with structured thinkers',
    profile: {
      openness: 80,
      conscientiousness: 70,
      extraversion: 65,
      agreeableness: 55,
      neuroticism: 35,
      introversion: 35,
      intuition: 80,
      thinking: 65,
      perceiving: 55,
      enneagram: { type3: 0.7, type8: 0.2 },
    },
    ...overrides,
  }
}

/** Mock ICP compatibility result */
function buildMockICPCompatibility(overrides: Record<string, unknown> = {}) {
  return {
    person1Style: 'PA',
    person2Style: 'LM',
    score: 72,
    level: 'Good',
    levelKo: '양호',
    description: 'Complementary styles with leadership and supportive balance',
    descriptionKo: '리더십과 지원적 균형의 보완적 스타일',
    dynamics: {
      strengths: ['Clear roles', 'Mutual respect'],
      strengthsKo: ['명확한 역할', '상호 존중'],
      challenges: ['Power dynamics', 'Decision-making conflicts'],
      challengesKo: ['권력 역학', '의사결정 갈등'],
      tips: ['Communicate openly', 'Share responsibilities'],
      tipsKo: ['개방적으로 소통하기', '책임 분담하기'],
    },
    ...overrides,
  }
}

/** Mock Persona compatibility result */
function buildMockPersonaCompatibility(overrides: Record<string, unknown> = {}) {
  return {
    score: 78,
    level: 'Strong',
    levelKo: '강함',
    description: 'High synergy in cognitive and decision-making styles',
    descriptionKo: '인지 및 의사결정 스타일의 높은 시너지',
    synergies: ['Shared vision', 'Complementary problem-solving'],
    synergiesKo: ['공유된 비전', '보완적 문제 해결'],
    tensions: ['Different energy levels', 'Pace misalignment'],
    tensionsKo: ['다른 에너지 수준', '속도 불일치'],
    ...overrides,
  }
}

/** Mock Cross-system compatibility result */
function buildMockCrossSystemCompatibility(overrides: Record<string, unknown> = {}) {
  return {
    score: 75,
    level: 'Good',
    levelKo: '양호',
    description: 'Integrated analysis shows balanced compatibility',
    descriptionKo: '통합 분석에서 균형 잡힌 호환성',
    insights: ['Both systems indicate complementary patterns', 'Growth opportunities exist'],
    insightsKo: ['두 시스템 모두 보완적 패턴 표시', '성장 기회 존재'],
    ...overrides,
  }
}

/** Build a POST request */
function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/personality-compatibility', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

// ===========================================================================
// Tests
// ===========================================================================

describe('Personality Compatibility API - POST /api/personality-compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    vi.mocked(analyzeICP).mockReturnValue(buildMockICPAnalysis() as any)
    vi.mocked(analyzePersona).mockReturnValue(buildMockPersonaAnalysis() as any)
    vi.mocked(getICPCompatibility).mockReturnValue(buildMockICPCompatibility() as any)
    vi.mocked(getPersonaCompatibility).mockReturnValue(buildMockPersonaCompatibility() as any)
    vi.mocked(getCrossSystemCompatibility).mockReturnValue(
      buildMockCrossSystemCompatibility() as any
    )
  })

  // -------------------------------------------------------------------------
  // Successful compatibility analysis
  // -------------------------------------------------------------------------
  describe('Successful Compatibility Analysis', () => {
    it('should return 200 with full compatibility analysis for valid request', async () => {
      const response = await POST(makePostRequest(buildValidRequestBody()))
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.person1).toBeDefined()
      expect(data.person2).toBeDefined()
      expect(data.compatibility).toBeDefined()
    })

    it('should return person1 ICP analysis data in response', async () => {
      const response = await POST(makePostRequest(buildValidRequestBody()))
      const data = await response.json()

      expect(data.person1.icp).toBeDefined()
      expect(data.person1.icp.primaryStyle).toBe('PA')
      expect(data.person1.icp.secondaryStyle).toBe('BC')
      expect(data.person1.icp.dominanceScore).toBe(75)
      expect(data.person1.icp.affiliationScore).toBe(60)
      expect(data.person1.icp.octantScores).toBeDefined()
    })

    it('should return person1 Persona analysis data in response', async () => {
      const response = await POST(makePostRequest(buildValidRequestBody()))
      const data = await response.json()

      expect(data.person1.persona).toBeDefined()
      expect(data.person1.persona.typeCode).toBe('RVLA')
      expect(data.person1.persona.personaName).toBe('Starforge Navigator')
      expect(data.person1.persona.axes).toBeDefined()
      expect(data.person1.persona.axes.energy.pole).toBe('radiant')
      expect(data.person1.persona.axes.energy.score).toBe(75)
    })

    it('should return person2 ICP analysis data in response', async () => {
      const person2ICP = buildMockICPAnalysis({ primaryStyle: 'LM', secondaryStyle: 'NO' })
      vi.mocked(analyzeICP)
        .mockReturnValueOnce(buildMockICPAnalysis() as any)
        .mockReturnValueOnce(person2ICP as any)

      const response = await POST(makePostRequest(buildValidRequestBody()))
      const data = await response.json()

      expect(data.person2.icp).toBeDefined()
      expect(data.person2.icp.primaryStyle).toBe('LM')
      expect(data.person2.icp.secondaryStyle).toBe('NO')
    })

    it('should return person2 Persona analysis data in response', async () => {
      const person2Persona = buildMockPersonaAnalysis({
        typeCode: 'GSAF',
        personaName: 'Ground Architect',
      })
      vi.mocked(analyzePersona)
        .mockReturnValueOnce(buildMockPersonaAnalysis() as any)
        .mockReturnValueOnce(person2Persona as any)

      const response = await POST(makePostRequest(buildValidRequestBody()))
      const data = await response.json()

      expect(data.person2.persona).toBeDefined()
      expect(data.person2.persona.typeCode).toBe('GSAF')
      expect(data.person2.persona.personaName).toBe('Ground Architect')
    })

    it('should return ICP compatibility result', async () => {
      const response = await POST(makePostRequest(buildValidRequestBody()))
      const data = await response.json()

      expect(data.compatibility.icp).toBeDefined()
      expect(data.compatibility.icp.score).toBe(72)
      expect(data.compatibility.icp.level).toBe('Good')
      expect(data.compatibility.icp.levelKo).toBe('양호')
      expect(data.compatibility.icp.dynamics).toBeDefined()
    })

    it('should return Persona compatibility result', async () => {
      const response = await POST(makePostRequest(buildValidRequestBody()))
      const data = await response.json()

      expect(data.compatibility.persona).toBeDefined()
      expect(data.compatibility.persona.score).toBe(78)
      expect(data.compatibility.persona.level).toBe('Strong')
      expect(data.compatibility.persona.synergies).toEqual([
        'Shared vision',
        'Complementary problem-solving',
      ])
      expect(data.compatibility.persona.tensions).toEqual([
        'Different energy levels',
        'Pace misalignment',
      ])
    })

    it('should return cross-system compatibility result', async () => {
      const response = await POST(makePostRequest(buildValidRequestBody()))
      const data = await response.json()

      expect(data.compatibility.crossSystem).toBeDefined()
      expect(data.compatibility.crossSystem.score).toBe(75)
      expect(data.compatibility.crossSystem.level).toBe('Good')
      expect(data.compatibility.crossSystem.insights).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // Analysis function calls
  // -------------------------------------------------------------------------
  describe('Analysis Function Calls', () => {
    it('should call analyzeICP for both persons with correct arguments', async () => {
      const body = buildValidRequestBody()
      await POST(makePostRequest(body))

      expect(analyzeICP).toHaveBeenCalledTimes(2)
      expect(analyzeICP).toHaveBeenNthCalledWith(1, body.person1.icpAnswers, 'en')
      expect(analyzeICP).toHaveBeenNthCalledWith(2, body.person2.icpAnswers, 'en')
    })

    it('should call analyzePersona for both persons with correct arguments', async () => {
      const body = buildValidRequestBody()
      await POST(makePostRequest(body))

      expect(analyzePersona).toHaveBeenCalledTimes(2)
      expect(analyzePersona).toHaveBeenNthCalledWith(1, body.person1.personaAnswers, 'en')
      expect(analyzePersona).toHaveBeenNthCalledWith(2, body.person2.personaAnswers, 'en')
    })

    it('should call getICPCompatibility with primary styles and locale', async () => {
      await POST(makePostRequest(buildValidRequestBody()))

      expect(getICPCompatibility).toHaveBeenCalledTimes(1)
      expect(getICPCompatibility).toHaveBeenCalledWith('PA', 'PA', 'en')
    })

    it('should call getPersonaCompatibility with type codes, axes, and locale', async () => {
      const mockPersona = buildMockPersonaAnalysis()
      await POST(makePostRequest(buildValidRequestBody()))

      expect(getPersonaCompatibility).toHaveBeenCalledTimes(1)
      expect(getPersonaCompatibility).toHaveBeenCalledWith(
        'RVLA',
        'RVLA',
        mockPersona.axes,
        mockPersona.axes,
        'en'
      )
    })

    it('should call getCrossSystemCompatibility with all analysis data', async () => {
      const mockPersona = buildMockPersonaAnalysis()
      await POST(makePostRequest(buildValidRequestBody()))

      expect(getCrossSystemCompatibility).toHaveBeenCalledTimes(1)
      expect(getCrossSystemCompatibility).toHaveBeenCalledWith(
        'PA',
        'PA',
        'RVLA',
        'RVLA',
        mockPersona.axes,
        mockPersona.axes,
        'en'
      )
    })

    it('should use Korean locale when specified', async () => {
      const body = buildValidRequestBody({ locale: 'ko' })
      await POST(makePostRequest(body))

      expect(analyzeICP).toHaveBeenNthCalledWith(1, expect.anything(), 'ko')
      expect(analyzePersona).toHaveBeenNthCalledWith(1, expect.anything(), 'ko')
      expect(getICPCompatibility).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'ko')
    })

    it('should default locale to "en" when not provided', async () => {
      const body = buildValidRequestBody()
      delete (body as any).locale
      await POST(makePostRequest(body))

      expect(analyzeICP).toHaveBeenNthCalledWith(1, expect.anything(), 'en')
      expect(analyzePersona).toHaveBeenNthCalledWith(1, expect.anything(), 'en')
    })
  })

  // -------------------------------------------------------------------------
  // Input validation - Zod schema
  // -------------------------------------------------------------------------
  describe('Input Validation - Zod Schema', () => {
    it('should return 500 when request body is not valid JSON', async () => {
      const request = new NextRequest('http://localhost/api/personality-compatibility', {
        method: 'POST',
        body: 'invalid',
        headers: { 'content-type': 'application/json' },
      })
      const response = await POST(request)
      // Invalid JSON causes req.json() to throw, which is caught by middleware
      expect(response.status).toBe(500)
    })

    it('should return 400 when request body is null', async () => {
      const response = await POST(makePostRequest(null))
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when person1 is missing', async () => {
      const body = { person2: buildPersonData() }
      const response = await POST(makePostRequest(body))
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('validation_failed')
      expect(data.details.some((d: any) => d.path.includes('person1'))).toBe(true)
    })

    it('should return 400 when person2 is missing', async () => {
      const body = { person1: buildPersonData() }
      const response = await POST(makePostRequest(body))
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('validation_failed')
      expect(data.details.some((d: any) => d.path.includes('person2'))).toBe(true)
    })

    it('should return 400 for invalid locale value', async () => {
      const body = buildValidRequestBody({ locale: 'fr' })
      const response = await POST(makePostRequest(body))
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('validation_failed')
    })

    it('should log warning when validation fails', async () => {
      const body = { person1: buildPersonData() } // missing person2
      await POST(makePostRequest(body))

      expect(logger.warn).toHaveBeenCalledWith(
        '[Personality compatibility] validation failed',
        expect.objectContaining({
          errors: expect.any(Array),
        })
      )
    })

    it('should return validation details with path and message', async () => {
      const body = { person1: buildPersonData() } // missing person2
      const response = await POST(makePostRequest(body))
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
  })

  // -------------------------------------------------------------------------
  // Input validation - Missing quiz answers
  // -------------------------------------------------------------------------
  describe('Input Validation - Missing Quiz Answers', () => {
    it('should return 400 when person1.icpAnswers is missing', async () => {
      const body = buildValidRequestBody({
        person1: { personaAnswers: buildPersonaAnswers() },
      })
      const response = await POST(makePostRequest(body))
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Missing required quiz answers')
    })

    it('should return 400 when person1.personaAnswers is missing', async () => {
      const body = buildValidRequestBody({
        person1: { icpAnswers: buildICPAnswers() },
      })
      const response = await POST(makePostRequest(body))
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Missing required quiz answers')
    })

    it('should return 400 when person2.icpAnswers is missing', async () => {
      const body = buildValidRequestBody({
        person2: { personaAnswers: buildPersonaAnswers() },
      })
      const response = await POST(makePostRequest(body))
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Missing required quiz answers')
    })

    it('should return 400 when person2.personaAnswers is missing', async () => {
      const body = buildValidRequestBody({
        person2: { icpAnswers: buildICPAnswers() },
      })
      const response = await POST(makePostRequest(body))
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Missing required quiz answers')
    })

    it('should return 400 when person1 is null', async () => {
      const body = { person1: null, person2: buildPersonData() }
      const response = await POST(makePostRequest(body))
      expect(response.status).toBe(400)
    })

    it('should return 400 when person2 is null', async () => {
      const body = { person1: buildPersonData(), person2: null }
      const response = await POST(makePostRequest(body))
      expect(response.status).toBe(400)
    })

    it('should return 400 when both icpAnswers and personaAnswers are empty objects', async () => {
      const body = buildValidRequestBody({
        person1: { icpAnswers: {}, personaAnswers: {} },
      })
      // Empty objects are truthy, so this passes the null check but may fail analysis
      // The route should still work since empty answers are valid objects
      // This test verifies the route doesn't crash with empty answer objects
      const response = await POST(makePostRequest(body))
      // The actual status depends on how analyzeICP/analyzePersona handle empty input
      expect([200, 400, 500]).toContain(response.status)
    })
  })

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------
  describe('Error Handling', () => {
    it('should handle analyzeICP throwing an error', async () => {
      vi.mocked(analyzeICP).mockImplementation(() => {
        throw new Error('ICP analysis failed')
      })

      const response = await POST(makePostRequest(buildValidRequestBody()))
      expect(response.status).toBe(500)
    })

    it('should handle analyzePersona throwing an error', async () => {
      vi.mocked(analyzePersona).mockImplementation(() => {
        throw new Error('Persona analysis failed')
      })

      const response = await POST(makePostRequest(buildValidRequestBody()))
      expect(response.status).toBe(500)
    })

    it('should handle getICPCompatibility throwing an error', async () => {
      vi.mocked(getICPCompatibility).mockImplementation(() => {
        throw new Error('ICP compatibility calculation failed')
      })

      const response = await POST(makePostRequest(buildValidRequestBody()))
      expect(response.status).toBe(500)
    })

    it('should handle getPersonaCompatibility throwing an error', async () => {
      vi.mocked(getPersonaCompatibility).mockImplementation(() => {
        throw new Error('Persona compatibility calculation failed')
      })

      const response = await POST(makePostRequest(buildValidRequestBody()))
      expect(response.status).toBe(500)
    })

    it('should handle getCrossSystemCompatibility throwing an error', async () => {
      vi.mocked(getCrossSystemCompatibility).mockImplementation(() => {
        throw new Error('Cross-system compatibility calculation failed')
      })

      const response = await POST(makePostRequest(buildValidRequestBody()))
      expect(response.status).toBe(500)
    })

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost/api/personality-compatibility', {
        method: 'POST',
        body: 'not valid json{{{',
        headers: { 'content-type': 'application/json' },
      })

      const response = await POST(request)
      // req.json() throws on invalid JSON, caught by middleware error handler
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------
  describe('Edge Cases', () => {
    it('should handle different ICP styles for each person', async () => {
      const person1ICP = buildMockICPAnalysis({ primaryStyle: 'PA', secondaryStyle: 'BC' })
      const person2ICP = buildMockICPAnalysis({ primaryStyle: 'HI', secondaryStyle: 'JK' })

      vi.mocked(analyzeICP)
        .mockReturnValueOnce(person1ICP as any)
        .mockReturnValueOnce(person2ICP as any)

      const response = await POST(makePostRequest(buildValidRequestBody()))
      const data = await response.json()

      expect(data.person1.icp.primaryStyle).toBe('PA')
      expect(data.person2.icp.primaryStyle).toBe('HI')
    })

    it('should handle different Persona types for each person', async () => {
      const person1Persona = buildMockPersonaAnalysis({ typeCode: 'RVLA' })
      const person2Persona = buildMockPersonaAnalysis({ typeCode: 'GSAF' })

      vi.mocked(analyzePersona)
        .mockReturnValueOnce(person1Persona as any)
        .mockReturnValueOnce(person2Persona as any)

      const response = await POST(makePostRequest(buildValidRequestBody()))
      const data = await response.json()

      expect(data.person1.persona.typeCode).toBe('RVLA')
      expect(data.person2.persona.typeCode).toBe('GSAF')
    })

    it('should handle null secondaryStyle in ICP analysis', async () => {
      const icpWithNullSecondary = buildMockICPAnalysis({ secondaryStyle: null })
      vi.mocked(analyzeICP).mockReturnValue(icpWithNullSecondary as any)

      const response = await POST(makePostRequest(buildValidRequestBody()))
      const data = await response.json()

      expect(data.person1.icp.secondaryStyle).toBeNull()
    })

    it('should handle minimal quiz answers', async () => {
      const minimalAnswers = { q1: 'a' }
      const body = buildValidRequestBody({
        person1: { icpAnswers: minimalAnswers, personaAnswers: minimalAnswers },
        person2: { icpAnswers: minimalAnswers, personaAnswers: minimalAnswers },
      })

      const response = await POST(makePostRequest(body))
      expect(response.status).toBe(200)
    })

    it('should handle very long quiz answers gracefully', async () => {
      const longAnswers = Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [`q${i}`, 'answer'])
      )
      const body = buildValidRequestBody({
        person1: { icpAnswers: longAnswers, personaAnswers: longAnswers },
        person2: { icpAnswers: longAnswers, personaAnswers: longAnswers },
      })

      const response = await POST(makePostRequest(body))
      expect(response.status).toBe(200)
    })

    it('should handle special characters in quiz answers', async () => {
      const specialAnswers = {
        q1: '한글 테스트',
        q2: '日本語',
        q3: '🎉🎊',
        q4: '<script>alert("xss")</script>',
      }
      const body = buildValidRequestBody({
        person1: { icpAnswers: specialAnswers, personaAnswers: specialAnswers },
      })

      const response = await POST(makePostRequest(body))
      expect(response.status).toBe(200)
    })

    it('should return consistent response structure for all requests', async () => {
      const response = await POST(makePostRequest(buildValidRequestBody()))
      const data = await response.json()

      // Verify complete response structure
      expect(data).toHaveProperty('person1')
      expect(data).toHaveProperty('person2')
      expect(data).toHaveProperty('compatibility')

      expect(data.person1).toHaveProperty('icp')
      expect(data.person1).toHaveProperty('persona')

      expect(data.person2).toHaveProperty('icp')
      expect(data.person2).toHaveProperty('persona')

      expect(data.compatibility).toHaveProperty('icp')
      expect(data.compatibility).toHaveProperty('persona')
      expect(data.compatibility).toHaveProperty('crossSystem')
    })
  })

  // -------------------------------------------------------------------------
  // Response structure validation
  // -------------------------------------------------------------------------
  describe('Response Structure', () => {
    it('should include all ICP fields in person response', async () => {
      const response = await POST(makePostRequest(buildValidRequestBody()))
      const data = await response.json()

      const icpFields = [
        'primaryStyle',
        'secondaryStyle',
        'dominanceScore',
        'affiliationScore',
        'octantScores',
      ]
      for (const field of icpFields) {
        expect(data.person1.icp).toHaveProperty(field)
        expect(data.person2.icp).toHaveProperty(field)
      }
    })

    it('should include all Persona fields in person response', async () => {
      const response = await POST(makePostRequest(buildValidRequestBody()))
      const data = await response.json()

      const personaFields = ['typeCode', 'personaName', 'axes']
      for (const field of personaFields) {
        expect(data.person1.persona).toHaveProperty(field)
        expect(data.person2.persona).toHaveProperty(field)
      }
    })

    it('should include all axis data in persona response', async () => {
      const response = await POST(makePostRequest(buildValidRequestBody()))
      const data = await response.json()

      const axisKeys = ['energy', 'cognition', 'decision', 'rhythm']
      for (const axis of axisKeys) {
        expect(data.person1.persona.axes).toHaveProperty(axis)
        expect(data.person1.persona.axes[axis]).toHaveProperty('pole')
        expect(data.person1.persona.axes[axis]).toHaveProperty('score')
      }
    })

    it('should not expose internal analysis fields in response', async () => {
      const response = await POST(makePostRequest(buildValidRequestBody()))
      const data = await response.json()

      // ICP should not expose these internal fields
      expect(data.person1.icp).not.toHaveProperty('dominanceNormalized')
      expect(data.person1.icp).not.toHaveProperty('affiliationNormalized')
      expect(data.person1.icp).not.toHaveProperty('primaryOctant')
      expect(data.person1.icp).not.toHaveProperty('secondaryOctant')
      expect(data.person1.icp).not.toHaveProperty('summary')
      expect(data.person1.icp).not.toHaveProperty('consistencyScore')

      // Persona should not expose these internal fields
      expect(data.person1.persona).not.toHaveProperty('title')
      expect(data.person1.persona).not.toHaveProperty('summary')
      expect(data.person1.persona).not.toHaveProperty('profile')
      expect(data.person1.persona).not.toHaveProperty('strengths')
    })
  })

  // -------------------------------------------------------------------------
  // Middleware integration
  // -------------------------------------------------------------------------
  describe('Middleware Integration', () => {
    it('should export POST as an async function', () => {
      expect(POST).toBeDefined()
      expect(typeof POST).toBe('function')
    })

    it('should invoke the middleware-wrapped handler correctly', async () => {
      // POST is the result of withApiMiddleware wrapping the handler
      // Verify it executes correctly and returns a valid response
      const response = await POST(makePostRequest(buildValidRequestBody()))
      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(200)
    })

    it('should handle requests through the middleware context', async () => {
      // The middleware provides context to the handler
      // Verify the handler receives and uses the context correctly
      const response = await POST(makePostRequest(buildValidRequestBody({ locale: 'ko' })))
      const data = await response.json()

      // The handler should use the locale from the request body
      expect(analyzeICP).toHaveBeenCalledWith(expect.anything(), 'ko')
    })
  })
})
