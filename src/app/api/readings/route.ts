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

// POST: Create a new reading
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const body = await parseJsonBody<{ type: string; title?: string; content: string }>(req)
    const validation = validateRequired(body, ['type', 'content'])

    if (!validation.valid) {
      return apiError(ErrorCodes.VALIDATION_ERROR, `Missing: ${validation.missing.join(', ')}`)
    }

    const reading = await prisma.reading.create({
      data: {
        userId: context.userId!,
        type: body.type,
        title: body.title || null,
        content: body.content,
      },
    });

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
    });

    return apiSuccess({ readings })
  },
  createAuthenticatedGuard({ route: 'readings/list', limit: 30 })
)
