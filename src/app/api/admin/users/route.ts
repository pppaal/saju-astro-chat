/**
 * Admin User Search API
 *
 * GET /api/admin/users?q=<email | name | id>
 *
 * 어드민이 특정 유저를 이메일/이름/ID 로 찾기 위한 검색. 최대 25명까지
 * 반환하고, 상세는 /api/admin/users/[id] 에서 드릴다운한다.
 */

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
import { isAdminUser } from '@/lib/auth/admin'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      if (!context.userId || !context.session?.user?.email) {
        return apiError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')
      }
      if (!(await isAdminUser(context.userId))) {
        logger.warn('[admin/users] unauthorized', { userId: context.userId })
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
      }

      const q = (new URL(req.url).searchParams.get('q') || '').trim()
      if (q.length < 2) {
        return apiError(ErrorCodes.VALIDATION_ERROR, '검색어는 2자 이상 입력하세요')
      }

      // 이메일/이름 부분일치(대소문자 무시) 또는 정확한 ID 일치.
      const where: Prisma.UserWhereInput = {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
          { id: q },
        ],
      }

      const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      })

      return apiSuccess({
        query: q,
        count: users.length,
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
        })),
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/users] search error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/admin/users',
    limit: 30,
    windowSeconds: 60,
  })
)
