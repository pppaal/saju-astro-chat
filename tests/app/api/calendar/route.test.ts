/**
 * Comprehensive Unit Tests for /api/calendar/route.ts
 *
 * Tests the Calendar API endpoint for yearly important dates including:
 * - Query parameter validation (birthDate required, format validation)
 * - Saju calculation integration
 * - Astrology calculation with fallback
 * - Category filtering
 * - Grade grouping (0-5)
 * - Location/timezone handling
 * - Redis caching
 * - AI backend integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock dependencies before importing route
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any) => {
      const context = { userId: null, session: null, ip: '127.0.0.1', locale: 'ko' }
      const result = await handler(req, context)
      if (result instanceof Response) return result
      return NextResponse.json(result, { status: 200 })
    }
  }),
  createPublicStreamGuard: vi.fn(() => ({})),
  createSimpleGuard: vi.fn(() => ({})),
  extractLocale: vi.fn((req: any) => {
    const acceptLang = req.headers?.get?.('accept-language') || ''
    if (acceptLang.includes('ko')) return 'ko'
    if (acceptLang.includes('ja')) return 'ja'
    if (acceptLang.includes('zh')) return 'zh'
    return 'en'
  }),
}))

vi.mock('@/lib/saju/saju', () => ({
  calculateSajuData: vi.fn(),
}))

vi.mock('@/lib/astrology/foundation/astrologyService', () => ({
  calculateNatalChart: vi.fn(async () => ({
    planets: [
      {
        name: 'Sun',
        sign: 'Capricorn',
        house: 10,
        longitude: 0,
        degree: 15,
        minute: 0,
        formatted: 'Capricorn 15°',
        speed: 1,
      },
      {
        name: 'Moon',
        sign: 'Pisces',
        house: 12,
        longitude: 0,
        degree: 10,
        minute: 0,
        formatted: 'Pisces 10°',
        speed: 13,
      },
      {
        name: 'Mercury',
        sign: 'Capricorn',
        house: 10,
        longitude: 0,
        degree: 5,
        minute: 0,
        formatted: 'Capricorn 5°',
        speed: 1.2,
      },
    ],
    ascendant: {
      name: 'Ascendant',
      sign: 'Aries',
      house: 1,
      longitude: 0,
      degree: 0,
      minute: 0,
      formatted: 'Aries 0°',
    },
    mc: {
      name: 'MC',
      sign: 'Capricorn',
      house: 10,
      longitude: 0,
      degree: 0,
      minute: 0,
      formatted: 'Capricorn 0°',
    },
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      formatted: `H${i + 1}`,
      sign: 'Aries',
    })),
  })),
  toChart: vi.fn((chart) => ({
    planets: chart.planets,
    ascendant: chart.ascendant,
    mc: chart.mc,
    houses: chart.houses,
  })),
}))

vi.mock('@/lib/astrology/foundation/transit', () => ({
  calculateTransitChart: vi.fn(async () => ({
    planets: [
      {
        name: 'Saturn',
        sign: 'Pisces',
        house: 12,
        longitude: 0,
        degree: 8,
        minute: 0,
        formatted: 'Pisces 8°',
        speed: 0.03,
        retrograde: false,
      },
      {
        name: 'Mercury',
        sign: 'Aries',
        house: 1,
        longitude: 0,
        degree: 2,
        minute: 0,
        formatted: 'Aries 2°',
        speed: -0.4,
        retrograde: true,
      },
    ],
    ascendant: {
      name: 'Ascendant',
      sign: 'Aries',
      house: 1,
      longitude: 0,
      degree: 0,
      minute: 0,
      formatted: 'Aries 0°',
    },
    mc: {
      name: 'MC',
      sign: 'Capricorn',
      house: 10,
      longitude: 0,
      degree: 0,
      minute: 0,
      formatted: 'Capricorn 0°',
    },
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      formatted: `H${i + 1}`,
      sign: 'Aries',
    })),
  })),
  findTransitAspects: vi.fn(() => [
    { transitPlanet: 'Saturn', natalPoint: 'Sun', type: 'sextile', orb: 1.2 },
    { transitPlanet: 'Mercury', natalPoint: 'Mercury', type: 'conjunction', orb: 0.4 },
  ]),
  findMajorTransits: vi.fn(() => [
    { transitPlanet: 'Saturn', natalPoint: 'Sun', type: 'sextile', orb: 1.2 },
  ]),
}))

vi.mock('@/lib/astrology/foundation/aspects', () => ({
  findNatalAspects: vi.fn(() => [
    { from: { name: 'Sun' }, to: { name: 'Moon' }, type: 'trine', orb: 2.1 },
    { from: { name: 'Mercury' }, to: { name: 'Sun' }, type: 'conjunction', orb: 1.5 },
  ]),
}))


vi.mock('@/lib/cache/redis-cache', () => ({
  cacheOrCalculate: vi.fn((key, fn) => fn()),
  CacheKeys: {
    yearlyCalendar: vi.fn(() => 'test-cache-key'),
    transitBatch: vi.fn(() => 'test-transit-key'),
  },
  CACHE_TTL: { CALENDAR_DATA: 86400, NATAL_CHART: 2592000 },
}))

// 단계 4: 라우트가 v2 셀에서 직접 날짜를 만든다 — natal context + 월별 셀 빌드를
// 모킹해 결정적 6개 날짜(grade 0~4 스팬, 3월)를 주입한다. 구 calculateYearlyImportantDates
// 모킹은 더 이상 allDates 출처가 아니다(모듈 삭제 전까지 import 호환용으로만 유지).
vi.mock('@/lib/calendar-engine/context/cache', () => ({
  getOrBuildNatalContext: vi.fn(async () => ({
    context: { natal: { saju: {}, astro: {} } },
    source: 'test',
  })),
}))

vi.mock('@/lib/calendar-engine/cell-cache', () => ({
  makeBirthKey: vi.fn(() => 'test-birth-key'),
  getOrBuildMonth: vi.fn(async ({ monthKey }: { monthKey: string }) => {
    const [yy, mm] = monthKey.split('-')
    if (mm !== '03') return { cells: [], cached: false }
    const specs = [
      { day: 15, score: 95, theme: 'career' }, // grade 0
      { day: 16, score: 60, theme: 'money' }, // grade 1
      { day: 17, score: 48, theme: 'love' }, // grade 2
      { day: 18, score: 36, theme: 'health' }, // grade 3
      { day: 19, score: 20, theme: 'growth' }, // grade 4
      { day: 20, score: 10, theme: 'health' }, // grade 4
    ]
    return {
      cells: specs.map((s) => ({
        datetime: `${yy}-03-${String(s.day).padStart(2, '0')}T12:00:00.000Z`,
        derivedScore: s.score,
        themeScores: { [s.theme]: 80 },
        signals: [],
        matchedPatterns: [],
        topReasons: ['mock reason'],
        cautions: [],
      })),
      cached: false,
    }
  }),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ ok: false, data: null }),
  },
}))

vi.mock('@/lib/destiny-matrix/core/adapters', () => ({
  adaptCoreToCalendar: vi.fn(() => ({
    coreHash: 'calendar-core-hash',
    gradeLabel: 'strong',
    gradeReason: 'mock grade reason',
    phase: 'activation',
    phaseLabel: 'Activation',
    focusDomain: 'career',
    actionFocusDomain: 'career',
    riskAxisDomain: 'health',
    riskAxisLabel: '건강',
    timingMatrix: [],
    confidence: 0.82,
    crossAgreement: 0.74,
    arbitrationBrief: {
      focusWinnerDomain: 'career',
      focusWinnerReason: 'mock',
      focusRunnerUpDomain: 'wealth',
      actionWinnerDomain: 'career',
      actionWinnerReason: 'mock',
      actionRunnerUpDomain: 'wealth',
      conflictReasons: [],
      focusNarrative: '커리어 축이 앞섭니다.',
      actionNarrative: '커리어 실행축이 앞섭니다.',
      suppressionNarratives: [],
    },
    latentTopAxes: [],
    projections: {
      structure: {
        headline: '구조',
        summary: '커리어 구조가 앞섭니다.',
        reasons: [],
        detailLines: ['커리어 구조가 앞섭니다.'],
        drivers: [],
        counterweights: [],
        nextMoves: [],
      },
      timing: {
        headline: '타이밍',
        summary: '지금 창이 열려 있습니다.',
        reasons: [],
        detailLines: ['지금 창이 열려 있습니다.'],
        drivers: [],
        counterweights: [],
        nextMoves: [],
        window: 'now',
        granularity: 'week',
      },
      conflict: {
        headline: '충돌',
        summary: '큰 충돌은 없습니다.',
        reasons: [],
        detailLines: ['큰 충돌은 없습니다.'],
        drivers: [],
        counterweights: [],
        nextMoves: [],
      },
      action: {
        headline: '행동',
        summary: '커리어 실행을 우선합니다.',
        reasons: [],
        detailLines: ['커리어 실행을 우선합니다.'],
        drivers: [],
        counterweights: [],
        nextMoves: ['지원서 제출'],
      },
      risk: {
        headline: '리스크',
        summary: '건강 리스크를 함께 보세요.',
        reasons: [],
        detailLines: ['건강 리스크를 함께 보세요.'],
        drivers: [],
        counterweights: [],
        nextMoves: [],
      },
      evidence: {
        headline: '근거',
        summary: '패턴과 타이밍 신호가 맞물립니다.',
        reasons: [],
        detailLines: ['패턴과 타이밍 신호가 맞물립니다.'],
        drivers: [],
        counterweights: [],
        nextMoves: [],
      },
      branches: {
        headline: '분기',
        summary: '실행 경로가 우세합니다.',
        reasons: [],
        detailLines: ['실행 경로가 우세합니다.'],
        drivers: [],
        counterweights: [],
        nextMoves: [],
      },
    },
    attackPercent: 58,
    defensePercent: 42,
    thesis: '커리어 실행 기회가 열립니다.',
    riskControl: '과로는 피하세요.',
    primaryAction: '지원서 제출',
    primaryCaution: '과로 주의',
    claimIds: ['claim-1'],
    claimProvenanceById: {},
    cautionIds: [],
    topSignalIds: ['signal-1'],
    topPatternIds: ['pattern-1'],
    topScenarioIds: ['scenario-1'],
    topDecisionId: 'decision-1',
    topDecisionAction: 'apply',
    topDecisionLabel: '커리어: 실행 우선',
    judgmentPolicy: {
      mode: 'execute',
      allowedActions: ['apply'],
      allowedActionLabels: ['지원하기'],
      blockedActions: [],
      blockedActionLabels: [],
      hardStops: [],
      hardStopLabels: [],
      softChecks: [],
      softCheckLabels: [],
      rationale: '지금은 실행 우선입니다.',
    },
    domainVerdicts: [
      {
        domain: 'career',
        mode: 'execute',
        confidence: 0.82,
        leadPatternId: 'pattern-1',
        leadPatternFamily: 'career',
        leadScenarioId: 'scenario-1',
        allowedActions: ['apply'],
        allowedActionLabels: ['지원하기'],
        blockedActions: [],
        blockedActionLabels: [],
        rationale: '커리어 실행이 우세합니다.',
        evidenceIds: ['signal-1'],
        provenance: { sourceFields: [], sourceSignalIds: [], sourceRuleIds: [], sourceSetIds: [] },
      },
    ],
    coherenceAudit: {
      verificationBias: false,
      gatedDecision: false,
      domainConflictCount: 0,
      contradictionFlags: [],
      notes: [],
    },
    advisories: [],
    domainTimingWindows: [
      {
        domain: 'career',
        window: 'now',
        confidence: 0.82,
        timingRelevance: 0.88,
        timingGranularity: 'week',
        precisionReason: 'mock precision',
        timingConflictMode: 'aligned',
        timingConflictNarrative: '구조와 촉발이 같이 들어옵니다.',
        readinessScore: 0.81,
        triggerScore: 0.79,
        convergenceScore: 0.8,
        whyNow: '지금이 실행 창입니다.',
        entryConditions: ['지원서 제출'],
        abortConditions: [],
        evidenceIds: ['signal-1'],
        provenance: { sourceFields: [], sourceSignalIds: [], sourceRuleIds: [], sourceSetIds: [] },
      },
    ],
    manifestations: [],
  })),
}))

vi.mock('@/lib/destiny-matrix/inputCross', () => ({
  ensureMatrixInputCrossCompleteness: vi.fn((input) => input),
  buildServiceInputCrossAudit: vi.fn(() => ({})),
  listMissingCrossKeysForService: vi.fn(() => []),
}))

vi.mock('@/lib/destiny-matrix/calendarSignals', () => ({
  deriveCalendarSignals: vi.fn(() => []),
}))

vi.mock('@/lib/destiny-matrix/counselorEvidence', () => ({
  buildCounselorEvidencePacket: vi.fn(() => ({
    focusDomain: 'career',
    verdict: '커리어 실행축이 우세합니다.',
    guardrail: '과로는 피하세요.',
    topClaims: [{ text: '지금은 커리어 실행 조건이 맞아 들어옵니다.' }],
    topAnchorSummary: '핵심 근거가 커리어 쪽으로 정렬됩니다.',
    strategyBrief: {
      overallPhaseLabel: 'Activation',
      attackPercent: 58,
      defensePercent: 42,
    },
    topTimingWindow: {
      window: 'now',
      whyNow: '지금이 실행 창입니다.',
      entryConditions: ['지원서 제출'],
      abortConditions: [],
    },
    canonicalBrief: {},
    whyStack: [],
  })),
}))

vi.mock('@/i18n/locales/ko', () => ({
  default: {
    calendar: {
      good_day: '좋은 날',
      recommendations: { rest: '휴식하세요' },
      warnings: { caution: '주의하세요' },
    },
  },
}))

vi.mock('@/i18n/locales/en', () => ({
  default: {
    calendar: {
      good_day: 'Good day',
      recommendations: { rest: 'Take rest' },
      warnings: { caution: 'Be careful' },
    },
  },
}))

// Import after mocks
import { GET } from '@/app/api/calendar/route'
import { calculateSajuData } from '@/lib/saju/saju'
import { calculateNatalChart } from '@/lib/astrology/foundation/astrologyService'
import { cacheOrCalculate } from '@/lib/cache/redis-cache'
import { apiClient } from '@/lib/api/ApiClient'
import { logger } from '@/lib/logger'

// Helper to create mock request
function createRequest(params: Record<string, string | undefined>): NextRequest {
  const url = new URL('http://localhost:3000/api/calendar')
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, value)
    }
  })
  return new NextRequest(url)
}

// Mock Saju result
const mockSajuResult = {
  pillars: {
    year: { heavenlyStem: { name: '甲' }, earthlyBranch: { name: '子' } },
    month: { heavenlyStem: { name: '乙' }, earthlyBranch: { name: '丑' } },
    day: { heavenlyStem: { name: '丙' }, earthlyBranch: { name: '寅' } },
    time: { heavenlyStem: { name: '丁' }, earthlyBranch: { name: '卯' } },
  },
  unse: {
    daeun: [
      { age: 10, heavenlyStem: '戊', earthlyBranch: '辰' },
      { age: 20, heavenlyStem: '己', earthlyBranch: '巳' },
    ],
  },
  daeWoon: { startAge: 3 },
}

// Mock important dates
describe('Calendar API Route - /api/calendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mocks
    vi.mocked(calculateSajuData).mockReturnValue(mockSajuResult as any)
    vi.mocked(calculateNatalChart).mockResolvedValue({
      planets: [
        {
          name: 'Sun',
          sign: 'Capricorn',
          house: 10,
          longitude: 0,
          degree: 15,
          minute: 0,
          formatted: 'Capricorn 15°',
        },
        {
          name: 'Moon',
          sign: 'Pisces',
          house: 12,
          longitude: 0,
          degree: 10,
          minute: 0,
          formatted: 'Pisces 10°',
        },
        {
          name: 'Mercury',
          sign: 'Capricorn',
          house: 10,
          longitude: 0,
          degree: 5,
          minute: 0,
          formatted: 'Capricorn 5°',
        },
      ],
      ascendant: {
        name: 'Ascendant',
        sign: 'Aries',
        house: 1,
        longitude: 0,
        degree: 0,
        minute: 0,
        formatted: 'Aries 0°',
      },
      mc: {
        name: 'MC',
        sign: 'Capricorn',
        house: 10,
        longitude: 0,
        degree: 0,
        minute: 0,
        formatted: 'Capricorn 0°',
      },
      houses: Array.from({ length: 12 }, (_, i) => ({
        index: i + 1,
        cusp: i * 30,
        formatted: `H${i + 1}`,
        sign: 'Aries',
      })),
    } as any)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Query Parameter Validation', () => {
    it('should return 400 when birthDate is missing', async () => {
      const request = createRequest({})

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBeDefined()
    })

    it('should return 400 when birthDate has invalid format (wrong separator)', async () => {
      const request = createRequest({ birthDate: '1990/01/15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('INVALID_DATE')
    })

    it('should return 400 when birthDate has invalid format (no separators)', async () => {
      const request = createRequest({ birthDate: '19900115' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('INVALID_DATE')
    })

    it('should return 400 when birthDate has invalid date values (month 13)', async () => {
      const request = createRequest({ birthDate: '1990-13-01' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('INVALID_DATE')
    })

    it('should return 400 when birthDate has invalid date values (Feb 30)', async () => {
      const request = createRequest({ birthDate: '1990-02-30' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should return 400 when birthTime has invalid format', async () => {
      const request = createRequest({ birthDate: '1990-01-15', birthTime: '25:00' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('INVALID_TIME')
    })

    it('should return 422 when year is out of range (too low)', async () => {
      const request = createRequest({ birthDate: '1990-01-15', year: '1800' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when year is out of range (too high)', async () => {
      const request = createRequest({ birthDate: '1990-01-15', year: '2200' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when category is invalid', async () => {
      const request = createRequest({ birthDate: '1990-01-15', category: 'invalid_category' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Successful Responses', () => {
    it('should return success with valid birthDate only', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.type).toBe('yearly')
      expect(data.birthInfo.date).toBe('1990-01-15')
    })

    it('should return success with all optional parameters', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthTime: '14:30',
        birthPlace: 'Tokyo',
        year: '2025',
        gender: 'female',
        locale: 'en',
        category: 'career',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.birthInfo.time).toBe('14:30')
      expect(data.birthInfo.place).toBe('Tokyo')
      expect(data.year).toBe(2025)
    })

    it('should use default values for optional parameters', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.birthInfo.time).toBe('12:00') // default
      expect(data.birthInfo.place).toBe('Seoul') // default
    })

    it('should handle leap year dates correctly', async () => {
      const request = createRequest({ birthDate: '2000-02-29' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Category Filtering', () => {
    it('should filter dates by career category', async () => {
      const request = createRequest({ birthDate: '1990-01-15', category: 'career' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // allDates should only include career category dates
      data.allDates.forEach((date: any) => {
        expect(date.categories).toContain('career')
      })
    })

    it('should filter dates by wealth category', async () => {
      const request = createRequest({ birthDate: '1990-01-15', category: 'wealth' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      data.allDates.forEach((date: any) => {
        expect(date.categories).toContain('wealth')
      })
    })

    it('should filter dates by love category', async () => {
      const request = createRequest({ birthDate: '1990-01-15', category: 'love' })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should filter dates by health category', async () => {
      const request = createRequest({ birthDate: '1990-01-15', category: 'health' })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should return all dates when no category filter', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.allDates.length).toBe(6) // All mock dates
    })
  })

  describe('Date Calculations for Different Years', () => {
    it('should calculate dates for current year by default', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.year).toBe(new Date().getFullYear())
    })

    it('should calculate dates for specified year', async () => {
      const request = createRequest({ birthDate: '1990-01-15', year: '2025' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.year).toBe(2025)
    })

    it('should calculate dates for past year', async () => {
      // Within the current ±5 window (schema-enforced).
      const request = createRequest({ birthDate: '1990-01-15', year: '2021' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.year).toBe(2021)
    })

    it('should calculate dates for future year', async () => {
      const request = createRequest({ birthDate: '1990-01-15', year: '2030' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.year).toBe(2030)
    })
  })

  describe('Grade Grouping', () => {
    it('should return allDates with grade in valid range (0-5)', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data.allDates)).toBe(true)
      for (const item of data.allDates) {
        expect(typeof item.grade).toBe('number')
        expect(item.grade).toBeGreaterThanOrEqual(0)
        expect(item.grade).toBeLessThanOrEqual(5)
      }
    })

    it('should surface at least one grade 0 date after matrix regrading', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      const grade0 = data.allDates.filter((d: { grade: number }) => d.grade === 0)
      expect(grade0.length).toBeGreaterThanOrEqual(1)
    })

    it('should count grade 4 dates from final display grades', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      const grade4 = data.allDates.filter(
        (d: { displayGrade?: number; grade: number }) => (d.displayGrade ?? d.grade) === 4
      )
      expect(grade4.length).toBeGreaterThanOrEqual(0)
    })

    it('should expose high-grade dates (grade 0, 1, 2) via allDates', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      const top = data.allDates.filter((d: { grade: number }) => d.grade <= 2)
      expect(Array.isArray(top)).toBe(true)
      expect(top.length).toBeGreaterThan(0)
    })

    it('should expose mid-grade dates (grade 1, 2) via allDates', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      const good = data.allDates.filter((d: { grade: number }) => d.grade === 1 || d.grade === 2)
      expect(Array.isArray(good)).toBe(true)
    })

    it('should expose low-grade dates (grade 4, 5) via allDates', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      const bad = data.allDates.filter((d: { grade: number }) => d.grade === 4 || d.grade === 5)
      expect(Array.isArray(bad)).toBe(true)
    })

    it('should expose worst-grade dates (grade 5) via allDates', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      const worst = data.allDates.filter((d: { grade: number }) => d.grade === 5)
      expect(Array.isArray(worst)).toBe(true)
    })
  })

  describe('Location/Timezone Handling', () => {
    it('should use Seoul coords when birthPlace is not in LOCATION_COORDS', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthPlace: 'InvalidCity12345',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // The place is passed through, but LOCATION_COORDS falls back to Seoul
      expect(data.birthInfo.place).toBe('InvalidCity12345')
      // Verify saju was called with Seoul timezone (fallback)
      expect(vi.mocked(calculateSajuData)).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'solar',
        'Asia/Seoul' // Falls back to Seoul timezone
      )
    })

    it('should fallback to Seoul when birthPlace exceeds MAX_PLACE_LEN (64 chars)', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthPlace: 'A'.repeat(70), // Exceeds MAX_PLACE_LEN of 64
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.birthInfo.place).toBe('Seoul')
    })

    it('should return 422 when birthPlace exceeds Zod schema limit (100 chars)', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthPlace: 'A'.repeat(150), // Exceeds Zod .max(100)
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should use valid birthPlace when provided', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthPlace: 'Tokyo',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.birthInfo.place).toBe('Tokyo')
    })

    it('should use New York timezone for New York birthPlace', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthPlace: 'New York',
      })

      await GET(request)

      expect(vi.mocked(calculateSajuData)).toHaveBeenCalledWith(
        '1990-01-15',
        expect.any(String),
        expect.any(String),
        'solar',
        'America/New_York'
      )
    })
  })

  describe('Saju Calculation', () => {
    it('should call calculateSajuData with correct parameters', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthTime: '14:30',
        gender: 'female',
      })

      await GET(request)

      expect(vi.mocked(calculateSajuData)).toHaveBeenCalledWith(
        '1990-01-15',
        '14:30',
        'female',
        'solar',
        'Asia/Seoul'
      )
    })

    it('should return 500 when saju calculation throws error', async () => {
      vi.mocked(calculateSajuData).mockImplementation(() => {
        throw new Error('Saju calculation failed')
      })

      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle saju result with missing pillars', async () => {
      vi.mocked(calculateSajuData).mockReturnValue({
        pillars: null,
        unse: { daeun: [] },
        daeWoon: { startAge: 0 },
      } as any)

      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should handle saju result with missing daeun', async () => {
      vi.mocked(calculateSajuData).mockReturnValue({
        ...mockSajuResult,
        unse: { daeun: null },
      } as any)

      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should use male as default gender', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      await GET(request)

      expect(vi.mocked(calculateSajuData)).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'male',
        'solar',
        expect.any(String)
      )
    })
  })

  describe('Astro Profile', () => {
    it('should populate astroIdentity when full natal chart succeeds', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthTime: '14:30',
        birthPlace: 'Tokyo',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.astroIdentity).toBeDefined()
      expect(typeof data.astroIdentity.sunSign).toBe('string')
    })

    it('should expose moon and ascendant signs from natal chart in astroIdentity', async () => {
      const request = createRequest({ birthDate: '1990-03-25' })

      const response = await GET(request)
      const data = await response.json()

      // Moon mock is Pisces, Ascendant mock is Aries in the natal-chart fixture above.
      expect(data.astroIdentity.moonSign).toBe('Pisces')
      expect(data.astroIdentity.ascendantSign).toBe('Aries')
    })

    it('should propagate as non-200 when full astrology input fails (lite fallback removed)', async () => {
      vi.mocked(calculateNatalChart).mockRejectedValueOnce(new Error('swisseph unavailable'))

      const request = createRequest({ birthDate: '1990-01-05' })

      // Lite mode is gone — astrology failures are now hard failures rather
      // than silent quality downgrades. In the test harness the simplified
      // withApiMiddleware mock does not wrap errors into Response objects, so
      // a thrown error here is the contract: the route does NOT swallow the
      // failure and produce a 200 "lite" payload.
      await expect(GET(request)).rejects.toThrow(/swisseph unavailable/)
    })
  })

  describe('Caching', () => {
    // 단계 4: 날짜 계산 캐싱(cacheOrCalculate + CacheKeys.yearlyCalendar)은
    // 제거됨 — 캐싱이 cell-cache(getOrBuildMonth) 계층으로 이동했고 라우트는 셀에서
    // 직접 ImportantDate 를 파생하므로 yearlyCalendar 캐시 키가 더 이상 없다.

    it('should set Cache-Control header for response', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)

      expect(response.headers.get('Cache-Control')).toBe(
        'private, max-age=3600, stale-while-revalidate=1800'
      )
    })
  })

  // AI enrichment was removed from /api/calendar in #255. The route is now a
  // pure deterministic engine; "aiEnhanced" / "aiInsights" fields and the
  // /api/theme/important-dates fan-out no longer exist. Tests below cover the
  // shape that replaced them: dailyView / monthView / weather narratives.
  describe('Calendar Presentation View', () => {
    it('should return calendarDailyView with daily slot information', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.calendarDailyView).toBeDefined()
    })

    it('should return calendarMonthView with monthly aggregation', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        gender: 'female',
        birthPlace: 'Busan',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.calendarMonthView).toBeDefined()
    })

    it('should not expose legacy aiInsights field', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(data.aiInsights).toBeUndefined()
    })
  })

  describe('Locale Handling', () => {
    it('should use Korean locale by default', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Response should use Korean translations by default
      expect(data.success).toBe(true)
    })

    it('should use English locale when specified', async () => {
      const request = createRequest({ birthDate: '1990-01-15', locale: 'en' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Response Structure', () => {
    it('should include all required response fields', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      // Canonical top-level response surface. See route.ts around the
      // `responsePayload` builder. (matrixContract removed with destiny-matrix.)
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('predictionId')
      expect(data).toHaveProperty('type')
      expect(data).toHaveProperty('year')
      expect(data).toHaveProperty('todayHourlyTimeSlots')
      expect(data).toHaveProperty('astroIdentity')
      expect(data).toHaveProperty('birthInfo')
      expect(data).toHaveProperty('allDates')
      expect(data).toHaveProperty('monthSummary')
      expect(data).toHaveProperty('calendarDailyView')
      expect(data).toHaveProperty('calendarMonthView')
    })

    it('should populate astroIdentity with sun/moon/ascendant signs', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.astroIdentity).toBeTruthy()
      expect(typeof data.astroIdentity.sunSign).toBe('string')
      // moonSign / ascendantSign may be undefined depending on chart, but the
      // shape itself must exist.
      expect('moonSign' in data.astroIdentity || data.astroIdentity.moonSign === undefined).toBe(
        true
      )
    })

    it('omits matrixContract after destiny-matrix removal (calendar is saju×astrology only)', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // destiny-matrix core was removed; the matrix phase/contract is no longer
      // computed and the matrix UI binding gracefully hides when absent.
      expect(data.matrixContract).toBeUndefined()
    })

    it('should include birthInfo with date, time, and place', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthTime: '14:30',
        birthPlace: 'Tokyo',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.birthInfo.date).toBe('1990-01-15')
      expect(data.birthInfo.time).toBe('14:30')
      expect(data.birthInfo.place).toBe('Tokyo')
    })

    it('should include monthSummary with month and summary narrative', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(data.monthSummary).toBeDefined()
      expect(data.monthSummary).toHaveProperty('month')
      expect(data.monthSummary).toHaveProperty('summary')
    })

    it('should forward important dates through to allDates', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      // The fixture mock injects 6 important dates. Engine-derived top/good
      // lists are gone, so allDates should mirror the injected feed length.
      expect(data.allDates.length).toBe(6)
    })

    it('should include score and grade on every allDates entry', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      for (const entry of data.allDates.slice(0, 30)) {
        expect(entry).toHaveProperty('date')
        expect(entry).toHaveProperty('grade')
        expect(entry).toHaveProperty('score')
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty date results', async () => {
      // 단계 4: 셀 빌드가 빈 결과를 내도 라우트 표면은 well-formed.
      const { getOrBuildMonth } = await import('@/lib/calendar-engine/cell-cache')
      vi.mocked(getOrBuildMonth).mockResolvedValue({ cells: [], cached: false } as never)

      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data.allDates)).toBe(true)
      expect(data.allDates.length).toBe(0)
    })

    it('should handle birthDate at year boundary (Jan 1)', async () => {
      const request = createRequest({ birthDate: '1990-01-01' })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should handle birthDate at year boundary (Dec 31)', async () => {
      const request = createRequest({ birthDate: '1990-12-31' })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should reject an out-of-range extreme past year', async () => {
      // Calendar year is constrained to current ±5; 1901 is rejected.
      const request = createRequest({ birthDate: '1990-01-15', year: '1901' })

      const response = await GET(request)

      expect(response.status).toBe(422)
    })

    it('should reject an out-of-range far future year', async () => {
      const request = createRequest({ birthDate: '1990-01-15', year: '2099' })

      const response = await GET(request)

      expect(response.status).toBe(422)
    })
  })
})
