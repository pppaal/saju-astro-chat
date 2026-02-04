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
    const validation = GetCircleSchema.safeParse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
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
