// src/lib/social/publish/instagram.ts
//
// Instagram API(Instagram Login) 발행 — 2단계: (1) 미디어 컨테이너(이미지 URL
// 필수) (2) media_publish. env: IG_USER_ID, IG_ACCESS_TOKEN. 이미지가 없으면
// 자동발행 불가(IG 는 텍스트 전용 게시 미지원) → unsupported.
//
// 호스트는 graph.instagram.com — Instagram Login 으로 발급한 토큰은
// graph.facebook.com 에서 동작하지 않는다. 실제 토큰은 발행 시점에
// Redis(주간 자동 갱신본) 우선으로 읽는다 (igToken.ts).
// 문서: https://developers.facebook.com/docs/instagram-platform/content-publishing

import { logger } from '@/lib/logger'
import { getIgAccessToken } from '../igToken'
import type { PublishAdapter, PublishInput, PublishResult } from './types'
import { composeText } from './types'

const GRAPH = 'https://graph.instagram.com/v21.0'

// 컨테이너 생성 → 게시 사이 이미지 처리 대기 — 준비 전이면 Meta 가 실패를
// 주므로 짧은 backoff 후 재시도(threads 어댑터와 동일 패턴).
const PUBLISH_RETRY_DELAYS_MS = [1500, 4000, 8000]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 설정 여부는 env 기준(동기) — UI 버튼 노출/크론 게이트 판단용.
function envUserId(): string | null {
  const userId = (process.env.IG_USER_ID || '').trim()
  return userId || null
}

function isEnvConfigured(): boolean {
  return envUserId() !== null && (process.env.IG_ACCESS_TOKEN || '').trim() !== ''
}

async function creds(): Promise<{ userId: string; token: string } | null> {
  const userId = envUserId()
  const token = await getIgAccessToken()
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
  isConfigured: () => isEnvConfigured(),

  async publish(input: PublishInput): Promise<PublishResult> {
    const c = await creds()
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

      // 2) 게시 — 이미지 처리 전이면 Meta 가 HTTP 400 + code 9007("Media ID is
      //    not available")을 주므로 그 경우만 backoff 재시도. 그 외 4xx(권한 등)
      //    는 재시도해도 소용없으니 즉시 중단.
      let lastErr = ''
      for (let attempt = 0; attempt <= PUBLISH_RETRY_DELAYS_MS.length; attempt++) {
        if (attempt > 0) await sleep(PUBLISH_RETRY_DELAYS_MS[attempt - 1])
        const pubRes = await postForm(`${GRAPH}/${c.userId}/media_publish`, {
          creation_id: creationId,
          access_token: c.token,
        })
        if (pubRes.ok) {
          const { id } = (await pubRes.json()) as { id?: string }
          logger.info('[publish/instagram] published', { id, attempt })
          return { ok: true, platform: 'instagram', externalId: id }
        }
        const bodyText = (await pubRes.text().catch(() => '')).slice(0, 300)
        lastErr = `${pubRes.status} ${bodyText.slice(0, 200)}`
        const mediaNotReady = bodyText.includes('9007') || /not available/i.test(bodyText)
        if (pubRes.status >= 400 && pubRes.status < 500 && pubRes.status !== 429 && !mediaNotReady)
          break
      }
      return { ok: false, platform: 'instagram', error: `publish: ${lastErr}` }
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
