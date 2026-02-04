import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { idParamSchema } from '@/lib/api/zodValidation'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rawParams = await params
    const paramValidation = idParamSchema.safeParse(rawParams)
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
    const { id } = paramValidation.data

    const sharedResult = await prisma.sharedResult.findUnique({
      where: { id },
    })

    if (!sharedResult) {
      return NextResponse.json(
        { error: 'Shared result not found' },
        { status: HTTP_STATUS.NOT_FOUND }
      )
    }

    // Check if expired
    if (sharedResult.expiresAt && sharedResult.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Shared result has expired' }, { status: 410 })
    }

    // Increment view count
    await prisma.sharedResult.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })

    return NextResponse.json({
      type: sharedResult.resultType,
      title: sharedResult.title,
      description: sharedResult.description,
      data: sharedResult.resultData,
      createdAt: sharedResult.createdAt,
    })
  } catch (error) {
    logger.error('Error fetching shared result:', { error })
    return NextResponse.json(
      { error: 'Failed to fetch shared result' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
