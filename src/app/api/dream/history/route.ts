import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { dreamHistoryQuerySchema, dreamHistoryDeleteQuerySchema } from '@/lib/api/zodValidation'

export type DreamHistoryItem = {
  id: string
  createdAt: string
  summary: string
  dreamText?: string
  symbols?: string[]
  themes?: { label: string; weight: number }[]
  luckyNumbers?: number[]
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    const userId = session.user.id
    const { searchParams } = new URL(req.url)
    const queryValidation = dreamHistoryQuerySchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    })
    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'validation_failed', details: queryValidation.error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
    const { limit, offset } = queryValidation.data

    // Fetch dream consultations from ConsultationHistory
    const dreams = await prisma.consultationHistory.findMany({
      where: {
        userId,
        theme: 'dream',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        createdAt: true,
        summary: true,
        fullReport: true,
        signals: true,
        userQuestion: true,
      },
    })

    // Transform to response format
    const history: DreamHistoryItem[] = dreams.map((dream) => {
      const signals = dream.signals as Record<string, unknown> | null

      return {
        id: dream.id,
        createdAt: dream.createdAt.toISOString(),
        summary: dream.summary || '꿈 해석',
        dreamText: dream.userQuestion || undefined,
        symbols:
          (signals?.dreamSymbols as { label: string }[])?.map((s) => s.label) ||
          (signals?.symbols as string[]) ||
          undefined,
        themes: (signals?.themes as { label: string; weight: number }[]) || undefined,
        luckyNumbers:
          (signals?.luckyElements as { luckyNumbers?: number[] })?.luckyNumbers || undefined,
      }
    })

    // Get total count for pagination
    const total = await prisma.consultationHistory.count({
      where: {
        userId,
        theme: 'dream',
      },
    })

    return NextResponse.json({
      history,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    logger.error('Error fetching dream history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}

// Delete a dream history item
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    const { searchParams } = new URL(req.url)
    const deleteValidation = dreamHistoryDeleteQuerySchema.safeParse({
      id: searchParams.get('id') ?? undefined,
    })
    if (!deleteValidation.success) {
      return NextResponse.json(
        { error: 'validation_failed', details: deleteValidation.error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
    const { id } = deleteValidation.data

    // Verify ownership and delete
    const deleted = await prisma.consultationHistory.deleteMany({
      where: {
        id,
        userId: session.user.id,
        theme: 'dream',
      },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Dream not found' }, { status: HTTP_STATUS.NOT_FOUND })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting dream:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
