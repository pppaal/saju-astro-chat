import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma, Prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import type {
  TimingAIPremiumReport,
  ThemedAIPremiumReport,
} from '@/lib/destiny-matrix/ai-report/types'
import { HTTP_STATUS } from '@/lib/constants/http'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { destinyMatrixSaveRequestSchema } from '@/lib/api/zodValidation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SaveDestinyMatrixRequest {
  reportType: 'timing' | 'themed'
  period?: 'daily' | 'monthly' | 'yearly' | 'comprehensive'
  theme?: 'love' | 'career' | 'wealth' | 'health' | 'family'
  reportData: TimingAIPremiumReport | ThemedAIPremiumReport
  title: string
  summary?: string
  overallScore?: number
  grade?: string
  locale?: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    const ip = getClientIp(req.headers)
    const limit = await rateLimit(`matrix-save:${ip}`, { limit: 20, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again soon.' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    const rawBody = await req.json()

    // Validate request body with Zod
    const validationResult = destinyMatrixSaveRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[DestinyMatrixSave] validation failed', {
        errors: validationResult.error.issues,
      })
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

    const body = validationResult.data
    const {
      reportType,
      period,
      theme,
      reportData,
      title,
      summary,
      overallScore,
      grade,
      locale = 'ko',
    } = body

    // Save Destiny Matrix report to database
    const matrixReport = await prisma.destinyMatrixReport.create({
      data: {
        userId: session.user.id,
        reportType,
        period: period || null,
        theme: theme || null,
        reportData: reportData as unknown as Prisma.InputJsonValue,
        title,
        summary: summary || null,
        overallScore: overallScore || null,
        grade: grade || null,
        pdfGenerated: false,
        locale,
      },
    })

    logger.info('Destiny Matrix report saved', {
      userId: session.user.id,
      id: matrixReport.id,
      reportType,
      period: period || null,
      theme: theme || null,
    })

    const res = NextResponse.json({
      success: true,
      id: matrixReport.id,
      createdAt: matrixReport.createdAt,
    })
    limit.headers.forEach((value, key) => res.headers.set(key, value))
    return res
  } catch (error) {
    logger.error('Error saving Destiny Matrix report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}

// GET endpoint to retrieve Destiny Matrix report by ID
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing id parameter' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const matrixReport = await prisma.destinyMatrixReport.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!matrixReport) {
      return NextResponse.json(
        { error: 'Destiny Matrix report not found' },
        { status: HTTP_STATUS.NOT_FOUND }
      )
    }

    return NextResponse.json({
      result: matrixReport,
    })
  } catch (error) {
    logger.error('Error retrieving Destiny Matrix report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
