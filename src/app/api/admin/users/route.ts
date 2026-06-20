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
  createAdminGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { realUserWhere } from '@/lib/admin/realUser'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export const GET = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    try {
      const q = (new URL(req.url).searchParams.get('q') || '').trim()
      if (q.length < 2) {
        return apiError(ErrorCodes.VALIDATION_ERROR, '검색어는 2자 이상 입력하세요')
      }

      // 이메일/이름 부분일치(대소문자 무시) 또는 정확한 ID 일치.
      // 이름/이메일 검색은 realUserWhere(=가입 회원: OAuth Account 또는
      // passwordHash 보유)로 제한한다. 안 그러면 출처불명 셀 행(~41,500개)이
      // 흔한 조각 검색에 잔뜩 잡혀 25건 cap 을 잡아먹고 진짜 회원을 가린다(클릭해도
      // 빈 상세). 정확한 ID 조회는 셀 행 포함 누구든 찾도록 예외(과금 조사 등에서
      // raw id 로 찾는 케이스).
      const where: Prisma.UserWhereInput = {
        OR: [
          { id: q },
          {
            AND: [
              realUserWhere,
              {
                OR: [
                  { email: { contains: q, mode: 'insensitive' } },
                  { name: { contains: q, mode: 'insensitive' } },
                ],
              },
            ],
          },
        ],
      }

      // take: 26 으로 한 건 더 받아 "25건 초과" 여부(capped)를 판별한다. 이전엔
      // take: 25 + count=users.length 라 200명이 매칭돼도 "25명"으로 표시돼
      // 어드민이 전부 본 줄 착각했다. 초과 시 UI 가 "검색어를 좁히라"고 안내한다.
      const PAGE = 25
      const rows = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: PAGE + 1,
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      })
      const capped = rows.length > PAGE
      const users = capped ? rows.slice(0, PAGE) : rows

      return apiSuccess({
        query: q,
        count: users.length,
        capped,
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
  createAdminGuard({
    route: '/api/admin/users',
    limit: 30,
    windowSeconds: 60,
  })
)
