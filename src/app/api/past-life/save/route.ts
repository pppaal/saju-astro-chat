// src/app/api/past-life/save/route.ts
/**
 * Past Life Result Save API
 * 전생 리딩 결과 저장 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { pastLifeSaveRequestSchema } from '@/lib/api/zodValidation'
import { HTTP_STATUS } from '@/lib/constants/http'

/**
 * POST /api/past-life/save
 * 전생 리딩 결과 저장 (로그인 필요)
 */
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const rawBody = await req.json().catch(() => null)
    if (!rawBody) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Validate with Zod
    const validationResult = pastLifeSaveRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Past Life save] validation failed', { errors: validationResult.error.issues })
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: validationResult.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
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
      return NextResponse.json({ error: 'Failed to save past life result' }, { status: 500 })
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
      return NextResponse.json({ saved: false, error: 'Failed to fetch result' }, { status: 500 })
    }
  },
  createAuthenticatedGuard({
    route: '/api/past-life/save',
    limit: 60,
    windowSeconds: 60,
  })
)
