/**
 * Couple Tarot Reading Detail API
 * 특정 커플 타로 리딩 조회
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { readingIdParamSchema } from '@/lib/api/zodValidation'

// GET - 특정 커플 타로 리딩 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ readingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    const rawParams = await params
    const paramValidation = readingIdParamSchema.safeParse(rawParams)
    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: paramValidation.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
    const { readingId } = paramValidation.data

    // 리딩 조회
    const reading = await prisma.tarotReading.findUnique({
      where: { id: readingId },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    })

    if (!reading) {
      return NextResponse.json(
        { error: '리딩을 찾을 수 없습니다' },
        { status: HTTP_STATUS.NOT_FOUND }
      )
    }

    // 커플 리딩인지 확인
    if (!reading.isSharedReading) {
      return NextResponse.json(
        { error: '커플 리딩이 아닙니다' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // 접근 권한 확인 (리딩 소유자 또는 공유받은 사람)
    const isOwner = reading.userId === session.user.id
    const isSharedWith = reading.sharedWithUserId === session.user.id

    if (!isOwner && !isSharedWith) {
      return NextResponse.json(
        { error: '이 리딩에 대한 접근 권한이 없습니다' },
        { status: HTTP_STATUS.FORBIDDEN }
      )
    }

    // 파트너 정보 가져오기
    const partnerId = isOwner ? reading.sharedWithUserId : reading.userId
    let partnerInfo = null

    if (partnerId) {
      const partner = await prisma.user.findUnique({
        where: { id: partnerId },
        select: { id: true, name: true, image: true },
      })
      partnerInfo = partner
    }

    // 매치 연결 정보
    let connectionInfo = null
    if (reading.matchConnectionId) {
      const connection = await prisma.matchConnection.findUnique({
        where: { id: reading.matchConnectionId },
        select: {
          id: true,
          compatibilityScore: true,
          isSuperLikeMatch: true,
          createdAt: true,
        },
      })
      connectionInfo = connection
    }

    return NextResponse.json({
      reading: {
        id: reading.id,
        question: reading.question,
        theme: reading.theme,
        spreadId: reading.spreadId,
        spreadTitle: reading.spreadTitle,
        cards: reading.cards,
        overallMessage: reading.overallMessage,
        cardInsights: reading.cardInsights,
        guidance: reading.guidance,
        affirmation: reading.affirmation,
        createdAt: reading.createdAt,
        isMyReading: isOwner,
        isPaidByMe: reading.paidByUserId === session.user.id,
        creator: reading.user,
        partner: partnerInfo,
        connection: connectionInfo,
      },
    })
  } catch (error) {
    logger.error('[couple-reading/[id]] GET error:', { error: error })
    return NextResponse.json(
      { error: 'Failed to fetch reading' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
