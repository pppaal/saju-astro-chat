import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma, Prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import type { ICPQuizAnswers } from '@/lib/icp/types'
import { HTTP_STATUS } from '@/lib/constants/http'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { icpSaveRequestSchema, personalityIcpSaveGetQuerySchema } from '@/lib/api/zodValidation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SaveICPRequest {
  primaryStyle: string
  secondaryStyle: string | null
  dominanceScore: number
  affiliationScore: number
  octantScores: Record<string, number>
  analysisData: {
    description: string
    descriptionKo?: string
    strengths: string[]
    strengthsKo?: string[]
    challenges: string[]
    challengesKo?: string[]
    tips?: string[]
    tipsKo?: string[]
    compatibleStyles?: string[]
  }
  answers?: ICPQuizAnswers
  locale?: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    const ip = getClientIp(req.headers)
    const limit = await rateLimit(`icp-save:${ip}`, { limit: 20, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again soon.' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    const rawBody: SaveICPRequest = await req.json()

    // Validate with Zod
    const validationResult = icpSaveRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[ICP save] validation failed', { errors: validationResult.error.issues })
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
      primaryStyle,
      secondaryStyle,
      dominanceScore,
      affiliationScore,
      octantScores,
      analysisData,
      answers,
      locale = 'en',
    } = validationResult.data

    // Save ICP result to database
    const icpResult = await prisma.iCPResult.create({
      data: {
        userId: session.user.id,
        primaryStyle,
        secondaryStyle,
        dominanceScore,
        affiliationScore,
        octantScores: octantScores as Prisma.InputJsonValue,
        analysisData,
        answers: answers ? (answers as Prisma.InputJsonValue) : Prisma.JsonNull,
        locale,
      },
    })

    logger.info('ICP result saved', { userId: session.user.id, id: icpResult.id })

    const res = NextResponse.json({
      success: true,
      id: icpResult.id,
      createdAt: icpResult.createdAt,
    })
    limit.headers.forEach((value, key) => res.headers.set(key, value))
    return res
  } catch (error) {
    logger.error('Error saving ICP result:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}

// GET endpoint to retrieve ICP result by ID
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    const { searchParams } = new URL(req.url)
    const queryValidation = personalityIcpSaveGetQuerySchema.safeParse({
      id: searchParams.get('id') || undefined,
    })
    const id = queryValidation.success ? queryValidation.data.id : null

    if (!id) {
      return NextResponse.json(
        { error: 'Missing id parameter' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const icpResult = await prisma.iCPResult.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!icpResult) {
      return NextResponse.json({ error: 'ICP result not found' }, { status: HTTP_STATUS.NOT_FOUND })
    }

    return NextResponse.json({
      result: icpResult,
    })
  } catch (error) {
    logger.error('Error retrieving ICP result:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
