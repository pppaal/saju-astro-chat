// src/lib/social/publish/threads.ts
//
// Threads Graph API 발행 — 2단계: (1) 미디어 컨테이너 생성 (2) 게시.
// env: THREADS_USER_ID, THREADS_ACCESS_TOKEN. 텍스트 전용 게시.
// 문서: https://developers.facebook.com/docs/threads

import { logger } from '@/lib/logger'
import { getThreadsAccessToken } from '../threadsToken'
import type { PublishAdapter, PublishInput, PublishResult } from './types'
import { composeText } from './types'

const GRAPH = 'https://graph.threads.net/v1.0'

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

    const text = composeText(input)
    try {
      // 1) 컨테이너 생성 (이미지 있으면 IMAGE, 없으면 TEXT).
      const containerParams: Record<string, string> = input.imageUrl
        ? { media_type: 'IMAGE', image_url: input.imageUrl, text, access_token: c.token }
        : { media_type: 'TEXT', text, access_token: c.token }
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

      // 2) 게시.
      const pubRes = await postForm(`${GRAPH}/${c.userId}/threads_publish`, {
        creation_id: creationId,
        access_token: c.token,
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
