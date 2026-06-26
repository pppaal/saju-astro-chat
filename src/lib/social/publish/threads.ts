// src/lib/social/publish/threads.ts
//
// Threads Graph API 발행 — 2단계: (1) 미디어 컨테이너 생성 (2) 게시.
// env: THREADS_USER_ID, THREADS_ACCESS_TOKEN(초기 시드). 토큰은 발행 시점에
// 항상 최신값(자동 갱신된 Redis 값 우선)을 읽는다 — threadsToken 참고.
// 문서: https://developers.facebook.com/docs/threads

import { logger } from '@/lib/logger'
import type { PublishAdapter, PublishInput, PublishResult } from './types'
import { composeText } from './types'
import { getActiveThreadsToken } from './threadsToken'

const GRAPH = 'https://graph.threads.net/v1.0'

// userId 는 안정값이라 env 에서, 토큰은 만료·갱신되므로 발행 시점에 별도 조회.
function envUserId(): string {
  return (process.env.THREADS_USER_ID || '').trim()
}

// isConfigured 게이트용 — 초기 시드(userId + env 토큰)가 있는지. 실제 발행
// 토큰은 getActiveThreadsToken() 이 Redis 갱신본을 우선해 돌려준다.
function hasSeedCreds(): boolean {
  return envUserId() !== '' && (process.env.THREADS_ACCESS_TOKEN || '').trim() !== ''
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
  isConfigured: () => hasSeedCreds(),

  async publish(input: PublishInput): Promise<PublishResult> {
    const userId = envUserId()
    const token = await getActiveThreadsToken()
    if (!userId || !token) return { ok: false, platform: 'threads', skipped: 'not_configured' }

    const text = composeText(input)
    try {
      // 1) 컨테이너 생성 (이미지 있으면 IMAGE, 없으면 TEXT).
      const containerParams: Record<string, string> = input.imageUrl
        ? { media_type: 'IMAGE', image_url: input.imageUrl, text, access_token: token }
        : { media_type: 'TEXT', text, access_token: token }
      const createRes = await postForm(`${GRAPH}/${userId}/threads`, containerParams)
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

      // 2) 게시.
      const pubRes = await postForm(`${GRAPH}/${userId}/threads_publish`, {
        creation_id: creationId,
        access_token: token,
      })
      if (!pubRes.ok) {
        const t = await pubRes.text().catch(() => '')
        return {
          ok: false,
          platform: 'threads',
          error: `publish: ${pubRes.status} ${t.slice(0, 200)}`,
        }
      }
      const { id } = (await pubRes.json()) as { id?: string }
      logger.info('[publish/threads] published', { id })
      return {
        ok: true,
        platform: 'threads',
        externalId: id,
        url: id ? `https://www.threads.net/t/${id}` : undefined,
      }
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
