import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { csrfGuard } from '@/lib/security/csrf'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { idParamSchema } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

// GET - 특정 저장된 날짜 상세 조회
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    const rawParams = await params
    const paramValidation = idParamSchema.safeParse(rawParams)
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: 'Invalid id parameter' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
    const { id } = paramValidation.data

    const savedDate = await prisma.savedCalendarDate.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!savedDate) {
      return NextResponse.json({ error: 'Not found' }, { status: HTTP_STATUS.NOT_FOUND })
    }

    return NextResponse.json({ savedDate })
  } catch (error) {
    logger.error('Failed to fetch saved calendar date:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}

// DELETE - 특정 저장된 날짜 삭제
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // CSRF Protection
    const csrfError = csrfGuard(req.headers)
    if (csrfError) {
      logger.warn('[CalendarSave/id] CSRF validation failed on DELETE')
      return csrfError
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    // Rate Limiting
    const ip = getClientIp(req.headers)
    const limit = await rateLimit(`calendar-delete-id:${ip}`, { limit: 20, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    const rawParams = await params
    const paramValidation = idParamSchema.safeParse(rawParams)
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: 'Invalid id parameter' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
    const { id } = paramValidation.data

    // 본인의 데이터만 삭제 가능
    const existingDate = await prisma.savedCalendarDate.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingDate) {
      return NextResponse.json({ error: 'Not found' }, { status: HTTP_STATUS.NOT_FOUND })
    }

    await prisma.savedCalendarDate.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to delete saved calendar date:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
