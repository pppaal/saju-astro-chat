import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { initializeApiContext, createAuthenticatedGuard, ErrorCodes } from '@/lib/api/middleware'
import { createErrorResponse } from '@/lib/api/errorHandler'
import { HTTP_STATUS } from '@/lib/constants/http'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { context, error } = await initializeApiContext(
    req,
    createAuthenticatedGuard({ route: 'readings/get', limit: 30 })
  )
  if (error) return error

  const { id } = await params

  const reading = await prisma.reading.findFirst({
    where: {
      id,
      userId: context.userId!,
    },
  })

  if (!reading) {
    return createErrorResponse({
      code: ErrorCodes.NOT_FOUND,
      message: 'Reading not found',
      locale: context.locale,
      route: 'readings/get',
    })
  }

  return NextResponse.json({ reading }, { status: HTTP_STATUS.OK })
}
