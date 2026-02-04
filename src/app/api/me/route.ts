import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  type ApiContext,
} from '@/lib/api/middleware'

export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    const name = context.session?.user?.name || context.session?.user?.email || null
    return apiSuccess({ name })
  },
  createAuthenticatedGuard({
    route: '/api/me',
    limit: 60,
    windowSeconds: 60,
  })
)
