// src/app/api/past-life/save/route.ts
/**
 * Past Life Result Save API
 * 전생 리딩 결과 저장 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, extractLocale, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { pastLifeSaveRequestSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'

/**
 * POST /api/past-life/save
 * 전생 리딩 결과 저장 (로그인 필요)
 */
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const rawBody = await req.json().catch(() => null)
    if (!rawBody) {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
        locale: extractLocale(req),
        route: 'past-life/save',
      })
    }

    // Validate with Zod
    const validationResult = pastLifeSaveRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Past Life save] validation failed', { errors: validationResult.error.issues })
      return createValidationErrorResponse(validationResult.error, {
        locale: extractLocale(req),
        route: 'past-life/save',
      })
    }

    const {
      birthDate,
      birthTime,
      latitude,
      longitude,
      timezone,
      karmaScore,
      analysisData,
      locale = 'ko',
    } = validationResult.data

    try {
      // Save to database
      const result = await prisma.pastLifeResult.create({
        data: {
          userId: context.userId!,
          birthDate,
          birthTime: birthTime || null,
          latitude: latitude || null,
          longitude: longitude || null,
          timezone: timezone || null,
          karmaScore,
          analysisData: analysisData as never,
          locale,
        },
      })

      logger.info('[PastLife Save] Saved successfully', {
        userId: context.userId,
        resultId: result.id,
        karmaScore,
      })

      return NextResponse.json({
        success: true,
        id: result.id,
        message: 'Past life result saved successfully',
      })
    } catch (error) {
      logger.error('[PastLife Save] Failed to save:', error)
      return createErrorResponse({
        code: ErrorCodes.DATABASE_ERROR,
        message: 'Failed to save past life result',
        route: 'past-life/save',
        originalError: error instanceof Error ? error : new Error(String(error)),
      })
    }
  },
  createAuthenticatedGuard({
    route: '/api/past-life/save',
    limit: 30,
    windowSeconds: 60,
  })
)

/**
 * GET /api/past-life/save
 * 최근 저장된 전생 리딩 결과 조회
 */
export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    try {
      const latestResult = await prisma.pastLifeResult.findFirst({
        where: { userId: context.userId! },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          birthDate: true,
          birthTime: true,
          karmaScore: true,
          analysisData: true,
          locale: true,
          createdAt: true,
        },
      })

      if (!latestResult) {
        return NextResponse.json({ saved: false })
      }

      return NextResponse.json({
        saved: true,
        result: latestResult,
      })
    } catch (error) {
      logger.error('[PastLife Save] Failed to fetch:', error)
      return createErrorResponse({
        code: ErrorCodes.DATABASE_ERROR,
        message: 'Failed to fetch result',
        route: 'past-life/save',
        originalError: error instanceof Error ? error : new Error(String(error)),
      })
    }
  },
  createAuthenticatedGuard({
    route: '/api/past-life/save',
    limit: 60,
    windowSeconds: 60,
  })
)
