import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { GetCircleSchema, PostCircleSchema, DeleteCircleSchema } from './validation'

// GET - List all saved people (with pagination)
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const { searchParams } = new URL(req.url)
    // searchParams.get은 param 없을 때 null을 반환하는데, z.coerce.number()는
    // null → 0으로 coerce해서 min(1)에 걸린다. ??로 undefined로 바꿔야 .default가 먹힌다.
    const validation = GetCircleSchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    })

    if (!validation.success) {
      logger.warn('[me/circle GET] Validation failed', { errors: validation.error.issues })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validation.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const { limit, offset } = validation.data

    try {
      const [total, people] = await Promise.all([
        prisma.savedPerson.count({
          where: { userId: context.userId! },
        }),
        prisma.savedPerson.findMany({
          where: { userId: context.userId! },
          orderBy: [{ relation: 'asc' }, { name: 'asc' }],
          take: limit,
          skip: offset,
        }),
      ])

      return apiSuccess({
        people,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + people.length < total,
        },
      })
    } catch (err) {
      logger.error('Error fetching circle:', err)
      return apiError(ErrorCodes.DATABASE_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/circle',
    limit: 60,
    windowSeconds: 60,
  })
)

// POST - Add a new person
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const body = await req.json()
    const validation = PostCircleSchema.safeParse(body)

    if (!validation.success) {
      logger.warn('[me/circle POST] Validation failed', { errors: validation.error.issues })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validation.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const {
      name,
      relation,
      birthDate,
      birthTime,
      birthTimeUnknown,
      gender,
      birthCity,
      latitude,
      longitude,
      tzId,
      note,
    } = validation.data

    try {
      const person = await prisma.savedPerson.create({
        data: {
          userId: context.userId!,
          name,
          relation,
          birthDate: birthDate || null,
          birthTime: birthTime || null,
          // 명시 플래그 그대로 보존 (false = 실제 자정 출생 가능). 미전송이면 null
          // → 소비처가 '00:00'=미상 휴리스틱으로 폴백.
          birthTimeUnknown: birthTimeUnknown ?? null,
          gender: gender || null,
          birthCity: birthCity || null,
          latitude: latitude != null ? latitude : null,
          longitude: longitude != null ? longitude : null,
          tzId: tzId || null,
          note: note || null,
        },
      })

      return apiSuccess({ person })
    } catch (err) {
      logger.error('Error adding person:', err)
      return apiError(ErrorCodes.DATABASE_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/circle',
    limit: 30,
    windowSeconds: 60,
  })
)

// DELETE - Remove a person
export const DELETE = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const { searchParams } = new URL(req.url)
    const validation = DeleteCircleSchema.safeParse({
      id: searchParams.get('id'),
    })

    if (!validation.success) {
      logger.warn('[me/circle DELETE] Validation failed', { errors: validation.error.issues })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validation.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const { id } = validation.data

    try {
      // Verify ownership
      const person = await prisma.savedPerson.findUnique({
        where: { id },
      })

      if (!person || person.userId !== context.userId!) {
        return apiError(ErrorCodes.NOT_FOUND, 'Not found')
      }

      await prisma.savedPerson.delete({
        where: { id },
      })

      return apiSuccess({ success: true })
    } catch (err) {
      logger.error('Error deleting person:', err)
      return apiError(ErrorCodes.DATABASE_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/circle',
    limit: 30,
    windowSeconds: 60,
  })
)
