// src/app/api/admin/social/drafts/[id]/route.ts
//
// 소셜 초안 단건 수정 — 텍스트 편집(variants/hook) 또는 상태 변경
// (승인/반려/발행). date 는 배열 키라 body 로 받는다.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiMiddleware,
  createAdminGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { updateDraft } from '@/lib/social/draftStore'
import { SOCIAL_PLATFORMS } from '@/lib/social/types'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

const variantSchema = z.object({
  platform: z.enum(['instagram', 'threads', 'youtube']),
  caption: z.string().max(4000),
  hashtags: z.array(z.string().max(60)).max(30),
  script: z.string().max(4000).optional(),
})

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['pending', 'approved', 'rejected', 'published']).optional(),
  hook: z.string().max(280).optional(),
  variants: z.array(variantSchema).max(SOCIAL_PLATFORMS.length).optional(),
})

export async function PATCH(request: NextRequest, routeContext: RouteContext) {
  const { id } = await routeContext.params

  const handler = withApiMiddleware(
    async (req: NextRequest, _context: ApiContext) => {
      if (!id) return apiError(ErrorCodes.VALIDATION_ERROR, 'id_required')
      let json: unknown
      try {
        json = await req.json()
      } catch {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_json')
      }
      const parsed = bodySchema.safeParse(json)
      if (!parsed.success) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_payload')
      }
      const { date, ...patch } = parsed.data
      const updated = await updateDraft(date, id, patch)
      if (!updated) {
        return apiError(ErrorCodes.NOT_FOUND, 'draft_not_found')
      }
      logger.info('[admin/social] draft updated', { id, date, status: updated.status })
      return apiSuccess({ draft: updated })
    },
    createAdminGuard({ route: 'admin/social/draft-update' })
  )

  return handler(request)
}
