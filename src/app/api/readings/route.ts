import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  parseJsonBody,
  validateRequired,
  apiError,
  apiSuccess,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { readingsSaveSchema } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'

// POST: Create a new reading
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const rawBody = await parseJsonBody<{ type: string; title?: string; content: string }>(req)

    // Validate with Zod
    const validationResult = readingsSaveSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Readings] validation failed', { errors: validationResult.error.issues })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const { type, title, content } = validationResult.data

    const reading = await prisma.reading.create({
      data: {
        userId: context.userId!,
        type,
        title: title || null,
        content,
      },
    })

    return apiSuccess({ success: true, id: reading.id })
  },
  createAuthenticatedGuard({ route: 'readings/create', limit: 20 })
)

// GET: Fetch user's readings
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const limitParam = parseInt(searchParams.get('limit') || '20', 10)

    const readings = await prisma.reading.findMany({
      where: {
        userId: context.userId!,
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limitParam, 50),
    })

    return apiSuccess({ readings })
  },
  createAuthenticatedGuard({ route: 'readings/list', limit: 30 })
)
