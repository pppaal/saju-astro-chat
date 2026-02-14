import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createSimpleGuard } from '@/lib/api/middleware'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = withApiMiddleware(
  async (req: NextRequest, context) => {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    logger.info('[ICP Analytics]', {
      userId: context.userId || 'anonymous',
      ip: context.ip,
      ...(body as Record<string, unknown>),
    })

    return NextResponse.json({ ok: true })
  },
  createSimpleGuard({ route: '/api/icp/analytics', limit: 120, windowSeconds: 60 })
)
