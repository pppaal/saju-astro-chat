import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { csrfGuard } from '@/lib/security/csrf'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { calendarSaveRequestSchema, calendarQuerySchema, dateSchema } from '@/lib/api/zodValidation'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// POST - 날짜 저장
export async function POST(req: NextRequest) {
  try {
    // CSRF Protection
    const csrfError = csrfGuard(req.headers)
    if (csrfError) {
      logger.warn('[CalendarSave] CSRF validation failed')
      return csrfError
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    const ip = getClientIp(req.headers)
    const limit = await rateLimit(`calendar-save:${ip}`, { limit: 30, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    const rawBody = await req.json()

    // Validate request body with Zod
    const validationResult = calendarSaveRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[CalendarSave] validation failed', { errors: validationResult.error.issues })
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
      date,
      year,
      grade,
      score,
      title,
      description,
      summary,
      categories,
      bestTimes,
      sajuFactors,
      astroFactors,
      recommendations,
      warnings,
      birthDate,
      birthTime,
      birthPlace,
      locale = 'ko',
    } = body

    // Upsert - 이미 있으면 업데이트, 없으면 생성
    const savedDate = await prisma.savedCalendarDate.upsert({
      where: {
        userId_date: {
          userId: session.user.id,
          date,
        },
      },
      update: {
        year: year || new Date(date).getFullYear(),
        grade,
        score,
        title,
        description: description || '',
        summary: summary || '',
        categories: categories || [],
        bestTimes: bestTimes && bestTimes.length > 0 ? bestTimes : [],
        sajuFactors: sajuFactors ? (sajuFactors as Prisma.InputJsonValue) : {},
        astroFactors: astroFactors ? (astroFactors as Prisma.InputJsonValue) : {},
        recommendations: recommendations || '',
        warnings: warnings || '',
        birthDate: birthDate || '',
        birthTime: birthTime || '',
        birthPlace: birthPlace || '',
        locale,
      },
      create: {
        userId: session.user.id,
        date,
        year: year || new Date(date).getFullYear(),
        grade,
        score,
        title,
        description: description || '',
        summary: summary || '',
        categories: categories || [],
        bestTimes: bestTimes && bestTimes.length > 0 ? bestTimes : [],
        sajuFactors: sajuFactors ? (sajuFactors as Prisma.InputJsonValue) : {},
        astroFactors: astroFactors ? (astroFactors as Prisma.InputJsonValue) : {},
        recommendations: recommendations || '',
        warnings: warnings || '',
        birthDate: birthDate || '',
        birthTime: birthTime || '',
        birthPlace: birthPlace || '',
        locale,
      },
    })

    return NextResponse.json({ success: true, id: savedDate.id }, { headers: limit.headers })
  } catch (error) {
    logger.error('Failed to save calendar date:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}

// DELETE - 저장된 날짜 삭제
export async function DELETE(req: NextRequest) {
  try {
    // CSRF Protection
    const csrfError = csrfGuard(req.headers)
    if (csrfError) {
      logger.warn('[CalendarSave] CSRF validation failed on DELETE')
      return csrfError
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    // Rate Limiting
    const ip = getClientIp(req.headers)
    const limit = await rateLimit(`calendar-delete:${ip}`, { limit: 20, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    const { searchParams } = new URL(req.url)
    const rawDate = searchParams.get('date')

    // Validate date parameter
    const dateValidation = dateSchema.safeParse(rawDate)
    if (!dateValidation.success) {
      logger.warn('[CalendarSave] Invalid date parameter', { date: rawDate })
      return NextResponse.json(
        { error: 'Invalid date format. Expected YYYY-MM-DD' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const date = dateValidation.data

    await prisma.savedCalendarDate.delete({
      where: {
        userId_date: {
          userId: session.user.id,
          date,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to delete calendar date:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}

// GET - 저장된 날짜 조회
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    const { searchParams } = new URL(req.url)

    // Validate query parameters
    const queryValidation = calendarQuerySchema.safeParse({
      date: searchParams.get('date'),
      year: searchParams.get('year'),
      limit: searchParams.get('limit') || '50',
    })

    if (!queryValidation.success) {
      logger.warn('[CalendarSave] Invalid query parameters', {
        errors: queryValidation.error.issues,
      })
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const { date, year, limit: limitParam } = queryValidation.data

    const where: Record<string, unknown> = { userId: session.user.id }

    if (date) {
      where.date = date
    } else if (year) {
      where.year = year
    }

    const savedDates = await prisma.savedCalendarDate.findMany({
      where,
      select: {
        id: true,
        date: true,
        year: true,
        grade: true,
        score: true,
        title: true,
        summary: true,
        categories: true,
        createdAt: true,
      },
      orderBy: { date: 'asc' },
      take: Math.min(limitParam, 365),
    })

    return NextResponse.json({ savedDates })
  } catch (error) {
    logger.error('Failed to fetch saved calendar dates:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
