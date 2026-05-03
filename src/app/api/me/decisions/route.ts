/**
 * /api/me/decisions — Decision Tracker (Tier 2B)
 *
 * GET   : 사용자 결정 history + pending review 목록
 * POST  : 새 결정 기록 (logUserDecision)
 * PATCH : 기존 결정 outcome 평가 업데이트 (evaluateUserDecision)
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { logger } from '@/lib/logger'
import {
  logUserDecision,
  evaluateUserDecision,
  getDecisionHistory,
  getPendingReviews,
  type DecisionType,
  type DecisionOutcome,
} from '@/lib/ai/decisionTracker'

const DecisionTypeSchema = z.enum([
  'career_change',
  'marriage',
  'move',
  'investment',
  'health',
  'other',
])
const OutcomeSchema = z.enum(['good', 'mixed', 'bad', 'pending'])

const PostSchema = z.object({
  decisionType: DecisionTypeSchema,
  context: z.string().min(1).max(500),
  recommendedAction: z.string().max(500).optional(),
  tookAction: z.boolean().optional(),
  decidedAt: z.string().datetime().optional(),
  reviewMonthsLater: z.number().int().min(1).max(24).optional(),
  signalAtDecision: z
    .object({
      sajuConfidence: z.number().min(0).max(1).optional(),
      astroConfidence: z.number().min(0).max(1).optional(),
      crossBand: z.enum(['high', 'medium', 'low', 'conflict']).optional(),
    })
    .optional(),
})

const PatchSchema = z.object({
  decisionId: z.string().min(1),
  outcome: OutcomeSchema,
  outcomeNote: z.string().max(1000).optional(),
})

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const { searchParams } = new URL(req.url)
      const limit = Math.min(Number(searchParams.get('limit') || 10), 30)
      const [history, pending] = await Promise.all([
        getDecisionHistory(context.userId!, limit),
        getPendingReviews(context.userId!),
      ])
      return apiSuccess({ history, pending })
    } catch (err) {
      logger.error('[me/decisions GET]', err)
      return apiError(ErrorCodes.DATABASE_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/decisions',
    limit: 60,
    windowSeconds: 60,
  })
)

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const body = await req.json().catch(() => ({}))
    const parsed = PostSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${parsed.error.issues.map((e) => e.message).join(', ')}`
      )
    }
    try {
      const created = await logUserDecision({
        userId: context.userId!,
        decisionType: parsed.data.decisionType as DecisionType,
        context: parsed.data.context,
        recommendedAction: parsed.data.recommendedAction,
        tookAction: parsed.data.tookAction,
        decidedAt: parsed.data.decidedAt ? new Date(parsed.data.decidedAt) : undefined,
        reviewMonthsLater: parsed.data.reviewMonthsLater,
        signalAtDecision: parsed.data.signalAtDecision,
      })
      if (!created) {
        return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to log decision')
      }
      return apiSuccess({ id: created.id })
    } catch (err) {
      logger.error('[me/decisions POST]', err)
      return apiError(ErrorCodes.DATABASE_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/decisions',
    limit: 30,
    windowSeconds: 60,
  })
)

export const PATCH = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const body = await req.json().catch(() => ({}))
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${parsed.error.issues.map((e) => e.message).join(', ')}`
      )
    }
    try {
      const ok = await evaluateUserDecision({
        decisionId: parsed.data.decisionId,
        userId: context.userId!,
        outcome: parsed.data.outcome as DecisionOutcome,
        outcomeNote: parsed.data.outcomeNote,
      })
      if (!ok) {
        return apiError(ErrorCodes.NOT_FOUND, 'Decision not found')
      }
      return apiSuccess({ ok: true })
    } catch (err) {
      logger.error('[me/decisions PATCH]', err)
      return apiError(ErrorCodes.DATABASE_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/decisions',
    limit: 30,
    windowSeconds: 60,
  })
)
