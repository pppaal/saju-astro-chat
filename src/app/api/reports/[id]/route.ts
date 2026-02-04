// src/app/api/reports/[id]/route.ts
// 저장된 AI 프리미엄 리포트 조회 API

import { NextRequest, NextResponse } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { idParamSchema } from '@/lib/api/zodValidation'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET - 리포트 조회
export async function GET(request: Request, routeContext: RouteContext) {
  const rawParams = await routeContext.params
  const paramValidation = idParamSchema.safeParse(rawParams)
  if (!paramValidation.success) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }
  const reportId = paramValidation.data.id

  const handler = withApiMiddleware(
    async (_req: NextRequest, context: ApiContext) => {
      try {
        const report = await prisma.destinyMatrixReport.findFirst({
          where: {
            id: reportId,
            userId: context.userId!,
          },
          select: {
            id: true,
            reportType: true,
            period: true,
            theme: true,
            reportData: true,
            title: true,
            summary: true,
            overallScore: true,
            grade: true,
            pdfGenerated: true,
            pdfUrl: true,
            locale: true,
            createdAt: true,
            updatedAt: true,
          },
        })

        if (!report) {
          return apiError(ErrorCodes.NOT_FOUND, '리포트를 찾을 수 없습니다.')
        }

        const reportData = report.reportData as Record<string, unknown>

        return apiSuccess({
          report: {
            id: report.id,
            type: report.reportType,
            period: report.period,
            theme: report.theme,
            title: report.title,
            summary: report.summary || reportData?.summary,
            score: report.overallScore,
            grade: report.grade,
            createdAt: report.createdAt.toISOString(),
            sections: reportData?.sections || [],
            keywords: reportData?.keywords || [],
            insights: reportData?.insights || [],
            actionItems: reportData?.actionItems || [],
            fullData: reportData,
          },
        })
      } catch (error) {
        logger.error('Report Fetch Error:', error)
        return apiError(ErrorCodes.DATABASE_ERROR, '리포트 조회 중 오류가 발생했습니다.')
      }
    },
    createAuthenticatedGuard({
      route: '/api/reports/[id]',
      limit: 60,
      windowSeconds: 60,
    })
  )

  return handler(request as unknown as NextRequest)
}

// DELETE - 리포트 삭제
export async function DELETE(request: NextRequest, routeContext: RouteContext) {
  const rawParams = await routeContext.params
  const paramValidation = idParamSchema.safeParse(rawParams)
  if (!paramValidation.success) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }
  const reportId = paramValidation.data.id

  const handler = withApiMiddleware(
    async (_req: NextRequest, context: ApiContext) => {
      try {
        const deleted = await prisma.destinyMatrixReport.deleteMany({
          where: {
            id: reportId,
            userId: context.userId!,
          },
        })

        if (deleted.count === 0) {
          return apiError(ErrorCodes.NOT_FOUND, '리포트를 찾을 수 없습니다.')
        }

        return apiSuccess({ message: '리포트가 삭제되었습니다.' })
      } catch (error) {
        logger.error('Report Delete Error:', error)
        return apiError(ErrorCodes.DATABASE_ERROR, '리포트 삭제 중 오류가 발생했습니다.')
      }
    },
    createAuthenticatedGuard({
      route: '/api/reports/[id]',
      limit: 20,
      windowSeconds: 60,
    })
  )

  return handler(request)
}
