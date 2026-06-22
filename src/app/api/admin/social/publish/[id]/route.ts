// src/app/api/admin/social/publish/[id]/route.ts
//
// 소셜 초안 자동발행 — 설정된 플랫폼 어댑터로 실제 게시하고, 결과(URL/에러)를
// variant 에 기록한다. 하나라도 성공하면 초안 상태를 published 로.
// 키 미설정이면 어댑터가 스킵하므로 안전(수동 게시 폴백).

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
import { getDrafts, updateDraft } from '@/lib/social/draftStore'
import { publishDraft } from '@/lib/social/publish'
import type { SocialVariant } from '@/lib/social/types'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

type RouteContext = { params: Promise<{ id: string }> }

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  platforms: z.array(z.enum(['instagram', 'threads', 'youtube'])).optional(),
})

export async function POST(request: NextRequest, routeContext: RouteContext) {
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
      if (!parsed.success) return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_payload')

      const { date, platforms } = parsed.data
      const draft = (await getDrafts(date)).find((d) => d.id === id)
      if (!draft) return apiError(ErrorCodes.NOT_FOUND, 'draft_not_found')

      const results = await publishDraft(draft, platforms)

      // 결과를 variant 에 반영 — 성공 URL / 실패 사유.
      const nextVariants: SocialVariant[] = draft.variants.map((v) => {
        const r = results.find((x) => x.platform === v.platform)
        if (!r || r.skipped === 'not_configured') return v
        return r.ok
          ? { ...v, publishedUrl: r.url ?? v.publishedUrl, publishError: undefined }
          : { ...v, publishError: r.error || r.skipped || 'failed' }
      })

      const anyOk = results.some((r) => r.ok)
      const updated = await updateDraft(date, id, {
        variants: nextVariants,
        ...(anyOk ? { status: 'published' as const } : {}),
      })

      logger.info('[admin/social/publish]', {
        id,
        date,
        results: results.map((r) => ({ p: r.platform, ok: r.ok, skipped: r.skipped })),
      })
      return apiSuccess({ draft: updated, results })
    },
    createAdminGuard({ route: 'admin/social/publish' })
  )

  return handler(request)
}
