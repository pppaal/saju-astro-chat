// app/api/fortune/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { HTTP_STATUS } from '@/lib/constants/http'
import { fortuneSaveSchema } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const rawBody = await req.json()

    // Validate with Zod
    const validationResult = fortuneSaveSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Fortune] validation failed', { errors: validationResult.error.issues })
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

    const { date, kind, title, content } = validationResult.data

    const d = new Date(date)
    const normalized = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

    const saved = await prisma.fortune.upsert({
      where: {
        userId_date_kind: {
          userId: context.userId!,
          date: normalized,
          kind,
        },
      },
      update: { title: title ?? null, content },
      create: {
        userId: context.userId!,
        date: normalized,
        kind,
        title: title ?? null,
        content,
      },
    })

    return NextResponse.json(saved)
  },
  createAuthenticatedGuard({
    route: '/api/fortune',
    limit: 60,
    windowSeconds: 60,
  })
)

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const kind = searchParams.get('kind') || 'daily'
    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: HTTP_STATUS.BAD_REQUEST })
    }

    const d = new Date(date)
    const normalized = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

    const row = await prisma.fortune.findUnique({
      where: {
        userId_date_kind: {
          userId: context.userId!,
          date: normalized,
          kind,
        },
      },
    })
    return NextResponse.json({ fortune: row ?? null })
  },
  createAuthenticatedGuard({
    route: '/api/fortune',
    limit: 120,
    windowSeconds: 60,
  })
)
