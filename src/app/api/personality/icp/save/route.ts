import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma, Prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import type { ICPQuizAnswers } from '@/lib/icp/types'
import { HTTP_STATUS } from '@/lib/constants/http'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'

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

    const body: SaveICPRequest = await req.json()
    const {
      primaryStyle,
      secondaryStyle,
      dominanceScore,
      affiliationScore,
      octantScores,
      analysisData,
      answers,
      locale = 'en',
    } = body

    // Validate required fields
    if (
      !primaryStyle ||
      dominanceScore === undefined ||
      affiliationScore === undefined ||
      !octantScores
    ) {
      const missing = []
      if (!primaryStyle) {
        missing.push('primaryStyle')
      }
      if (dominanceScore === undefined) {
        missing.push('dominanceScore')
      }
      if (affiliationScore === undefined) {
        missing.push('affiliationScore')
      }
      if (!octantScores) {
        missing.push('octantScores')
      }

      return NextResponse.json(
        {
          error: 'missing_required_fields',
          message: `Missing required fields: ${missing.join(', ')}`,
          fields: missing,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Validate primaryStyle is a valid ICP octant
    const VALID_OCTANTS = ['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO']
    if (!VALID_OCTANTS.includes(primaryStyle)) {
      return NextResponse.json(
        {
          error: 'invalid_primary_style',
          message: `Invalid primaryStyle: "${primaryStyle}". Must be one of: ${VALID_OCTANTS.join(', ')}`,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Validate secondaryStyle if provided
    if (secondaryStyle && !VALID_OCTANTS.includes(secondaryStyle)) {
      return NextResponse.json(
        {
          error: 'invalid_secondary_style',
          message: `Invalid secondaryStyle: "${secondaryStyle}". Must be one of: ${VALID_OCTANTS.join(', ')}`,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Validate score ranges
    if (dominanceScore < 0 || dominanceScore > 100) {
      return NextResponse.json(
        {
          error: 'invalid_score_range',
          message: `dominanceScore must be between 0 and 100, got: ${dominanceScore}`,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    if (affiliationScore < 0 || affiliationScore > 100) {
      return NextResponse.json(
        {
          error: 'invalid_score_range',
          message: `affiliationScore must be between 0 and 100, got: ${affiliationScore}`,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Save ICP result to database
    const icpResult = await prisma.iCPResult.create({
      data: {
        userId: session.user.id,
        primaryStyle,
        secondaryStyle,
        dominanceScore,
        affiliationScore,
        octantScores,
        analysisData,
        answers: answers ? (answers as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
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
    const id = searchParams.get('id')

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
