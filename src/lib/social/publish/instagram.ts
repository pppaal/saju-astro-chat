// src/lib/social/publish/instagram.ts
//
// Instagram Graph API 발행 — 2단계: (1) 미디어 컨테이너(이미지 URL 필수)
// (2) media_publish. env: IG_USER_ID, IG_ACCESS_TOKEN. 이미지가 없으면
// 자동발행 불가(IG 는 텍스트 전용 게시 미지원) → unsupported.
// 문서: https://developers.facebook.com/docs/instagram-api/guides/content-publishing

import { logger } from '@/lib/logger'
import type { PublishAdapter, PublishInput, PublishResult } from './types'
import { composeText } from './types'

const GRAPH = 'https://graph.facebook.com/v21.0'

function creds() {
  const userId = (process.env.IG_USER_ID || '').trim()
  const token = (process.env.IG_ACCESS_TOKEN || '').trim()
  return userId && token ? { userId, token } : null
}

async function postForm(url: string, params: Record<string, string>): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })
}

export const instagramAdapter: PublishAdapter = {
  platform: 'instagram',
  isConfigured: () => creds() !== null,

  async publish(input: PublishInput): Promise<PublishResult> {
    const c = creds()
    if (!c) return { ok: false, platform: 'instagram', skipped: 'not_configured' }
    if (!input.imageUrl) {
      // IG 피드는 미디어가 필수 — 이미지 없으면 자동발행 불가.
      return { ok: false, platform: 'instagram', skipped: 'unsupported', error: 'image required' }
    }

    const caption = composeText(input)
    try {
      // 1) 컨테이너 생성.
      const createRes = await postForm(`${GRAPH}/${c.userId}/media`, {
        image_url: input.imageUrl,
        caption,
        access_token: c.token,
      })
      if (!createRes.ok) {
        const t = await createRes.text().catch(() => '')
        return {
          ok: false,
          platform: 'instagram',
          error: `container: ${createRes.status} ${t.slice(0, 200)}`,
        }
      }
      const { id: creationId } = (await createRes.json()) as { id?: string }
      if (!creationId) return { ok: false, platform: 'instagram', error: 'no creation id' }

      // 2) 게시.
      const pubRes = await postForm(`${GRAPH}/${c.userId}/media_publish`, {
        creation_id: creationId,
        access_token: c.token,
      })
      if (!pubRes.ok) {
        const t = await pubRes.text().catch(() => '')
        return {
          ok: false,
          platform: 'instagram',
          error: `publish: ${pubRes.status} ${t.slice(0, 200)}`,
        }
      }
      const { id } = (await pubRes.json()) as { id?: string }
      logger.info('[publish/instagram] published', { id })
      return { ok: true, platform: 'instagram', externalId: id }
    } catch (error) {
      logger.error('[publish/instagram] failed', { error })
      return {
        ok: false,
        platform: 'instagram',
        error: error instanceof Error ? error.message : 'unknown',
      }
    }
  },
}
