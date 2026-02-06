import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { idParamSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rawParams = await params
    const paramValidation = idParamSchema.safeParse(rawParams)
    if (!paramValidation.success) {
      return createValidationErrorResponse(paramValidation.error, {
        locale: extractLocale(req),
        route: 'share/[id]',
      })
    }
    const { id } = paramValidation.data

    const sharedResult = await prisma.sharedResult.findUnique({
      where: { id },
    })

    if (!sharedResult) {
      return createErrorResponse({
        code: ErrorCodes.NOT_FOUND,
        message: 'Shared result not found',
        locale: extractLocale(req),
        route: 'share/[id]',
      })
    }

    // Check if expired
    if (sharedResult.expiresAt && sharedResult.expiresAt < new Date()) {
      return createErrorResponse({
        code: ErrorCodes.NOT_FOUND,
        message: 'Shared result has expired',
        locale: extractLocale(req),
        route: 'share/[id]',
      })
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
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      route: 'share/[id]',
      originalError: error instanceof Error ? error : new Error(String(error)),
    })
  }
}
