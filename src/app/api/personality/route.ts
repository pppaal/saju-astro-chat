import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { enforceBodySize } from '@/lib/http'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { personalitySaveRequestSchema } from '@/lib/api/zodValidation'

import { HTTP_STATUS } from '@/lib/constants/http'
export const dynamic = 'force-dynamic'

// GET: fetch personality result
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    const result = await prisma.personalityResult.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        typeCode: true,
        personaName: true,
        avatarGender: true,
        energyScore: true,
        cognitionScore: true,
        decisionScore: true,
        rhythmScore: true,
        consistencyScore: true,
        analysisData: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!result) {
      return NextResponse.json({ saved: false })
    }

    return NextResponse.json({ saved: true, result })
  } catch (error) {
    logger.error('GET /api/personality error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}

// POST: store personality result
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    const oversized = enforceBodySize(request, 16 * 1024)
    if (oversized) {
      return oversized
    }

    const rawBody = await request.json().catch(() => null)

    // Validate with Zod
    const validationResult = personalitySaveRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Personality save] validation failed', { errors: validationResult.error.issues })
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
      typeCode,
      personaName,
      avatarGender,
      energyScore,
      cognitionScore,
      decisionScore,
      rhythmScore,
      consistencyScore,
      analysisData,
      answers,
    } = validationResult.data

    // Upsert personality result
    const result = await prisma.personalityResult.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        typeCode,
        personaName,
        avatarGender,
        energyScore: Math.round(energyScore),
        cognitionScore: Math.round(cognitionScore),
        decisionScore: Math.round(decisionScore),
        rhythmScore: Math.round(rhythmScore),
        consistencyScore:
          consistencyScore !== null && consistencyScore !== undefined
            ? Math.round(consistencyScore)
            : null,
        analysisData: analysisData as Prisma.InputJsonValue,
        answers: answers ? (answers as Prisma.InputJsonValue) : null,
      },
      update: {
        typeCode,
        personaName,
        avatarGender,
        energyScore: Math.round(energyScore),
        cognitionScore: Math.round(cognitionScore),
        decisionScore: Math.round(decisionScore),
        rhythmScore: Math.round(rhythmScore),
        consistencyScore:
          consistencyScore !== null && consistencyScore !== undefined
            ? Math.round(consistencyScore)
            : null,
        analysisData: analysisData as Prisma.InputJsonValue,
        answers: answers ? (answers as Prisma.InputJsonValue) : null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      result: {
        id: result.id,
        typeCode: result.typeCode,
        personaName: result.personaName,
      },
    })
  } catch (error) {
    logger.error('POST /api/personality error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
