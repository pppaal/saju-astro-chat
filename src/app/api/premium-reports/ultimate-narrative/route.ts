// src/app/api/premium-reports/ultimate-narrative/route.ts
//
// Second-pass premium-report endpoint. Takes the deterministic UltimateComputed
// slice + the previously generated AIPremiumReport sections and asks Claude to
// rewrite them into a magazine-style UltimateCore with strict length and shape
// rules. The result page hydrates the `core` slot from this response, falling
// back to the legacy adapter when the call is unavailable.

import {
  apiError,
  apiSuccess,
  createAuthenticatedGuard,
  parseJsonBody,
  withApiMiddleware,
} from '@/lib/api/middleware'
import { ErrorCodes } from '@/lib/api/errorHandler'
import { logger } from '@/lib/logger'
import {
  generateUltimateNarrative,
} from '@/lib/premium-reports/ultimateNarrativeGenerator'
import type {
  UltimateComputed,
  UltimatePeriod,
} from '@/lib/premium-reports/ultimateReport'

interface UltimateNarrativeBody {
  period?: UltimatePeriod
  periodLabel?: string
  targetDate?: string
  computed?: UltimateComputed
  legacySections?: Record<string, string>
  matrixHints?: {
    overallScore?: number
    grade?: string
    topInsights?: string[]
    keyStrengths?: string[]
    keyChallenges?: string[]
  }
}

const ALLOWED_PERIODS: UltimatePeriod[] = ['monthly', 'yearly', 'comprehensive']

function isComputed(v: unknown): v is UltimateComputed {
  if (!v || typeof v !== 'object') return false
  const obj = v as Record<string, unknown>
  return (
    Array.isArray(obj.sajuPillars) &&
    Array.isArray(obj.astroPlacements) &&
    typeof obj.dayMaster === 'object' &&
    typeof obj.fiveElements === 'object'
  )
}

export const POST = withApiMiddleware(
  async (req) => {
    const body = await parseJsonBody<UltimateNarrativeBody>(req).catch(() => null)
    if (!body) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body')
    }

    if (!body.period || !ALLOWED_PERIODS.includes(body.period)) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `period must be one of ${ALLOWED_PERIODS.join(', ')}`
      )
    }
    if (!isComputed(body.computed)) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'computed (UltimateComputed) is required')
    }
    const periodLabel =
      typeof body.periodLabel === 'string' && body.periodLabel.trim().length > 0
        ? body.periodLabel.trim()
        : defaultPeriodLabel(body.period)

    const legacySections =
      body.legacySections && typeof body.legacySections === 'object'
        ? sanitiseSections(body.legacySections)
        : {}

    try {
      const result = await generateUltimateNarrative({
        period: body.period,
        periodLabel,
        targetDate: typeof body.targetDate === 'string' ? body.targetDate : undefined,
        computed: body.computed,
        legacySections,
        matrixHints: body.matrixHints,
      })

      return apiSuccess({
        core: result.core,
        modelUsed: result.modelUsed,
        tokensUsed: result.tokensUsed,
        warnings: result.warnings,
      })
    } catch (error) {
      logger.error('[premium-reports/ultimate-narrative] generation failed', {
        message: error instanceof Error ? error.message : String(error),
        period: body.period,
      })
      return apiError(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to generate ultimate narrative for the report'
      )
    }
  },
  createAuthenticatedGuard({
    route: '/api/premium-reports/ultimate-narrative',
    limit: 20,
    windowSeconds: 60,
  })
)

function defaultPeriodLabel(period: UltimatePeriod): string {
  const now = new Date()
  if (period === 'monthly') return `${now.getFullYear()}년 ${now.getMonth() + 1}월`
  if (period === 'yearly') return `${now.getFullYear()}년`
  return '인생 전체'
}

const ALLOWED_SECTION_KEYS = new Set([
  'introduction',
  'personalityDeep',
  'careerPath',
  'relationshipDynamics',
  'spouseProfile',
  'wealthPotential',
  'healthGuidance',
  'lifeMission',
  'lifeStages',
  'turningPoints',
  'futureOutlook',
  'timingAdvice',
  'actionPlan',
  'conclusion',
  'overview',
  'energy',
  'opportunities',
  'cautions',
  'career',
  'love',
  'wealth',
  'health',
  'luckyElements',
])

const MAX_SECTION_CHARS = 6000

function sanitiseSections(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_SECTION_KEYS.has(key)) continue
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (trimmed.length === 0) continue
    out[key] = trimmed.slice(0, MAX_SECTION_CHARS)
  }
  return out
}
