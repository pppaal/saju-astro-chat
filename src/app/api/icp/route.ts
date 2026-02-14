// src/app/api/icp/route.ts
/**
 * ICP (Interpersonal Circumplex) Analysis API
 * 대인관계 원형 모델 분석 API - 설문 기반 ICP 스타일 분석
 *
 * 8개 옥탄트:
 * - PA: Dominant-Assured (지배적-확신형)
 * - BC: Competitive-Arrogant (경쟁적-거만형)
 * - DE: Cold-Distant (냉담-거리형)
 * - FG: Submissive-Introverted (복종적-내향형)
 * - HI: Submissive-Unassured (복종적-불확신형)
 * - JK: Cooperative-Agreeable (협력적-동조형)
 * - LM: Warm-Friendly (따뜻-친화형)
 * - NO: Nurturant-Extroverted (양육적-외향형)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  extractLocale,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma, Prisma } from '@/lib/db/prisma'
import { icpSaveSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET: 저장된 ICP 결과 조회
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const latestResult = await prisma.iCPResult.findFirst({
      where: { userId: context.userId! },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        testVersion: true,
        resultId: true,
        primaryStyle: true,
        secondaryStyle: true,
        dominanceScore: true,
        affiliationScore: true,
        confidence: true,
        axes: true,
        completionSeconds: true,
        missingAnswerCount: true,
        octantScores: true,
        analysisData: true,
        answers: true,
        locale: true,
        createdAt: true,
      },
    })

    if (!latestResult) {
      return NextResponse.json({ saved: false })
    }

    return NextResponse.json({ saved: true, result: latestResult })
  },
  createAuthenticatedGuard({
    route: '/api/icp',
    limit: 60,
    windowSeconds: 60,
  })
)

// POST: ICP 결과 저장 (로그인 필요)
export const POST = withApiMiddleware(
  async (request: NextRequest, context: ApiContext) => {
    const rawBody = await request.json()
    const validationResult = icpSaveSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[ICP] validation failed', { errors: validationResult.error.issues })
      return createValidationErrorResponse(validationResult.error, {
        locale: extractLocale(request),
        route: 'icp',
      })
    }

    const icpData = validationResult.data

    // Save to database
    const result = await prisma.iCPResult.create({
      data: {
        userId: context.userId!,
        testVersion: icpData.testVersion || 'icp_v2',
        resultId: icpData.resultId || null,
        primaryStyle: icpData.primaryStyle,
        secondaryStyle: icpData.secondaryStyle,
        dominanceScore: icpData.dominanceScore,
        affiliationScore: icpData.affiliationScore,
        confidence: icpData.confidence ?? null,
        axes: (icpData.axes || {}) as Prisma.JsonObject,
        completionSeconds: icpData.completionSeconds ?? null,
        missingAnswerCount: icpData.missingAnswerCount ?? 0,
        octantScores: (icpData.octantScores || {}) as Prisma.JsonObject,
        analysisData: (icpData.analysisData || {}) as Prisma.JsonObject,
        answers: (icpData.answers || {}) as Prisma.JsonObject,
        locale: icpData.locale || 'en',
      },
    })

    return NextResponse.json({
      success: true,
      id: result.id,
      testVersion: result.testVersion,
      resultId: result.resultId,
      primaryStyle: result.primaryStyle,
      secondaryStyle: result.secondaryStyle,
      dominanceScore: result.dominanceScore,
      affiliationScore: result.affiliationScore,
      confidence: result.confidence,
      message: 'ICP result saved successfully',
    })
  },
  createAuthenticatedGuard({
    route: '/api/icp',
    limit: 30,
    windowSeconds: 60,
  })
)
