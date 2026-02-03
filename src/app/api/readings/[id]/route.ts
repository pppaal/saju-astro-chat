import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { idParamSchema } from '@/lib/api/zodValidation'

export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext, ...args: unknown[]) => {
    // Extract id from dynamic route params
    const { params } = args[0] as { params: Promise<{ id: string }> }
    const rawParams = await params
    const paramValidation = idParamSchema.safeParse(rawParams)
    if (!paramValidation.success) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid id parameter')
    }
    const { id } = paramValidation.data

    const reading = await prisma.reading.findFirst({
      where: {
        id,
        userId: context.userId!,
      },
    })

    if (!reading) {
      return apiError(ErrorCodes.NOT_FOUND, 'Reading not found')
    }

    return NextResponse.json({ reading }, { status: 200 })
  },
  createAuthenticatedGuard({ route: 'readings/get', limit: 30 })
)
