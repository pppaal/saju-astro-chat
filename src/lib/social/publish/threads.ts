// src/lib/social/publish/threads.ts
//
// Threads Graph API 발행 — 2단계: (1) 미디어 컨테이너 생성 (2) 게시.
// env: THREADS_USER_ID, THREADS_ACCESS_TOKEN. 텍스트 전용 게시.
// 문서: https://developers.facebook.com/docs/threads

import { logger } from '@/lib/logger'
import { getThreadsAccessToken } from '../threadsToken'
import type { PublishAdapter, PublishInput, PublishResult } from './types'
import { composeTextForThreads } from './types'

const GRAPH = 'https://graph.threads.net/v1.0'

// 컨테이너 생성 → 게시 사이 서버 처리 대기. 텍스트는 보통 즉시지만 이미지는
// 지연이 있어, 게시가 "media not ready" 로 실패하면 짧게 backoff 후 재시도.
const PUBLISH_RETRY_DELAYS_MS = [1500, 4000, 8000]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 설정 여부는 env 기준(동기) — 실제 토큰은 발행 시점에 Redis(자동 갱신본)
// 우선으로 읽는다 (threadsToken.ts).
function envUserId(): string | null {
  const userId = (process.env.THREADS_USER_ID || '').trim()
  return userId || null
}

function isEnvConfigured(): boolean {
  return envUserId() !== null && (process.env.THREADS_ACCESS_TOKEN || '').trim() !== ''
}

async function creds(): Promise<{ userId: string; token: string } | null> {
  const userId = envUserId()
  const token = await getThreadsAccessToken()
  return userId && token ? { userId, token } : null
}

async function postForm(url: string, params: Record<string, string>): Promise<Response> {
  const body = new URLSearchParams(params)
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
}

export const threadsAdapter: PublishAdapter = {
  platform: 'threads',
  isConfigured: () => isEnvConfigured(),

  async publish(input: PublishInput): Promise<PublishResult> {
    const c = await creds()
    if (!c) return { ok: false, platform: 'threads', skipped: 'not_configured' }

    // 해시태그는 *본문에 넣지 않는다* — 본문 끝 "#koreanastrology" 는 Threads
    // 에서 어색한 꼬리 줄로 렌더된다. 대신 첫 태그를 API 의 topic_tag 로 넘겨
    // 토픽 칩(계정명 옆)만 달고 본문은 깨끗하게 유지한다.
    const topicTag = (input.hashtags[0] || '').replace(/^#/, '').trim()
    // 500자 상한에 맞춰 안전 조립 — 초과 시 캡션 트림.
    const { text, trimmed } = composeTextForThreads({ ...input, hashtags: [] })
    if (trimmed) logger.warn('[publish/threads] text trimmed to fit 500-char limit')
    try {
      // 1) 컨테이너 생성 (이미지 있으면 IMAGE, 없으면 TEXT).
      const containerParams: Record<string, string> = input.imageUrl
        ? { media_type: 'IMAGE', image_url: input.imageUrl, text, access_token: c.token }
        : { media_type: 'TEXT', text, access_token: c.token }
      if (topicTag) containerParams.topic_tag = topicTag
      const createRes = await postForm(`${GRAPH}/${c.userId}/threads`, containerParams)
      if (!createRes.ok) {
        const t = await createRes.text().catch(() => '')
        return {
          ok: false,
          platform: 'threads',
          error: `container: ${createRes.status} ${t.slice(0, 200)}`,
        }
      }
      const { id: creationId } = (await createRes.json()) as { id?: string }
      if (!creationId) return { ok: false, platform: 'threads', error: 'no creation id' }

      // 2) 게시 — 컨테이너가 아직 준비 전이면 Meta 가 실패를 준다. 짧은
      //    backoff 로 재시도(특히 이미지). 마지막 시도까지 실패하면 에러 반환.
      let lastErr = ''
      for (let attempt = 0; attempt <= PUBLISH_RETRY_DELAYS_MS.length; attempt++) {
        if (attempt > 0) await sleep(PUBLISH_RETRY_DELAYS_MS[attempt - 1])
        const pubRes = await postForm(`${GRAPH}/${c.userId}/threads_publish`, {
          creation_id: creationId,
          access_token: c.token,
        })
        if (pubRes.ok) {
          const { id } = (await pubRes.json()) as { id?: string }
          logger.info('[publish/threads] published', { id, attempt })
          return {
            ok: true,
            platform: 'threads',
            externalId: id,
            url: id ? `https://www.threads.net/t/${id}` : undefined,
          }
        }
        lastErr = `${pubRes.status} ${(await pubRes.text().catch(() => '')).slice(0, 200)}`
        // 4xx(잘못된 요청·중복 등)는 재시도해도 소용없으니 즉시 중단.
        if (pubRes.status >= 400 && pubRes.status < 500 && pubRes.status !== 429) break
      }
      return { ok: false, platform: 'threads', error: `publish: ${lastErr}` }
    } catch (error) {
      logger.error('[publish/threads] failed', { error })
      return {
        ok: false,
        platform: 'threads',
        error: error instanceof Error ? error.message : 'unknown',
      }
    }
  },
}
