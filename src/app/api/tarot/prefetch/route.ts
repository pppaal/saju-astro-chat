// src/app/api/tarot/prefetch/route.ts
// Prefetch RAG context while user is selecting cards

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createSimpleGuard, type ApiContext } from '@/lib/api/middleware'
import { apiClient } from '@/lib/api/ApiClient'
import { TarotPrefetchSchema } from '@/lib/api/validator'

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }

    const parsed = TarotPrefetchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ') },
        { status: 400 }
      )
    }

    const { categoryId, spreadId } = parsed.data

    // Fire-and-forget prefetch to backend
    apiClient
      .post(
        '/api/tarot/prefetch',
        {
          categoryId,
          spreadId,
        },
        { timeout: 10000 }
      )
      .catch(() => {}) // Ignore errors silently

    return NextResponse.json({ status: 'prefetching' })
  },
  createSimpleGuard({
    route: 'tarot-prefetch',
    limit: 30,
    windowSeconds: 60,
  })
)
