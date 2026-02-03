import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { csrfGuard } from '@/lib/security/csrf'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { GetCircleSchema, PostCircleSchema, DeleteCircleSchema } from './validation'

// GET - List all saved people (with pagination)
export async function GET(req: NextRequest) {
  try {
    // Rate Limiting for GET
    const ip = getClientIp(req.headers)
    const rateLimitResult = await rateLimit(`circle-get:${ip}`, { limit: 60, windowSeconds: 60 })
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: rateLimitResult.headers }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    // Validate query parameters with Zod
    const { searchParams } = new URL(req.url)
    const validation = GetCircleSchema.safeParse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    })

    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      logger.warn('[me/circle GET] Validation failed', { errors: validation.error.issues })
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const { limit, offset } = validation.data

    // 총 개수 및 데이터 병렬 조회
    const [total, people] = await Promise.all([
      prisma.savedPerson.count({
        where: { userId: session.user.id },
      }),
      prisma.savedPerson.findMany({
        where: { userId: session.user.id },
        orderBy: [{ relation: 'asc' }, { name: 'asc' }],
        take: limit,
        skip: offset,
      }),
    ])

    return NextResponse.json({
      people,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + people.length < total,
      },
    })
  } catch (error) {
    logger.error('Error fetching circle:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}

// POST - Add a new person
export async function POST(req: NextRequest) {
  try {
    // CSRF Protection
    const csrfError = csrfGuard(req.headers)
    if (csrfError) {
      logger.warn('[Circle] CSRF validation failed on POST')
      return csrfError
    }

    // Rate Limiting
    const ip = getClientIp(req.headers)
    const limit = await rateLimit(`circle-post:${ip}`, { limit: 30, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    // Validate request body with Zod
    const body = await req.json()
    const validation = PostCircleSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      logger.warn('[me/circle POST] Validation failed', { errors: validation.error.issues })
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const {
      name,
      relation,
      birthDate,
      birthTime,
      gender,
      birthCity,
      latitude,
      longitude,
      tzId,
      note,
    } = validation.data

    const person = await prisma.savedPerson.create({
      data: {
        userId: session.user.id,
        name,
        relation,
        birthDate: birthDate || null,
        birthTime: birthTime || null,
        gender: gender || null,
        birthCity: birthCity || null,
        latitude: latitude != null ? latitude : null,
        longitude: longitude != null ? longitude : null,
        tzId: tzId || null,
        note: note || null,
      },
    })

    return NextResponse.json({ person })
  } catch (error) {
    logger.error('Error adding person:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}

// DELETE - Remove a person
export async function DELETE(req: NextRequest) {
  try {
    // CSRF Protection
    const csrfError = csrfGuard(req.headers)
    if (csrfError) {
      logger.warn('[Circle] CSRF validation failed on DELETE')
      return csrfError
    }

    // Rate Limiting
    const ip = getClientIp(req.headers)
    const limit = await rateLimit(`circle-delete:${ip}`, { limit: 30, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    // Validate query parameters with Zod
    const { searchParams } = new URL(req.url)
    const validation = DeleteCircleSchema.safeParse({
      id: searchParams.get('id'),
    })

    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      logger.warn('[me/circle DELETE] Validation failed', { errors: validation.error.issues })
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const { id } = validation.data

    // Verify ownership
    const person = await prisma.savedPerson.findUnique({
      where: { id },
    })

    if (!person || person.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: HTTP_STATUS.NOT_FOUND })
    }

    await prisma.savedPerson.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting person:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
