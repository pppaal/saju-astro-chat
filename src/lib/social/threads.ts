/**
 * Threads(메타) 게시 + 토큰 갱신 저수준 클라이언트.
 *
 * 자격증명(userId/token)은 인자로 주입받는다 — 토큰 출처(DB/env)는
 * threadsToken.ts 가 결정하고, 이 파일은 순수하게 HTTP 만 담당해 테스트가 쉽다.
 *
 * Threads 게시는 2단계: (1) 텍스트 컨테이너 생성 → creation_id, (2) publish.
 * 토큰 갱신: GET /refresh_access_token (장기 토큰을 다시 ~60일 연장).
 *
 * 참고: https://developers.facebook.com/docs/threads
 */

import { logger } from '@/lib/logger'

const GRAPH_BASE = 'https://graph.threads.net/v1.0'
const GRAPH_ROOT = 'https://graph.threads.net'

// Threads 단일 텍스트 게시 상한(약 500자). 여유롭게 잘라 안전 게시.
export const THREADS_TEXT_LIMIT = 500

export interface ThreadsCreds {
  userId: string
  token: string
}

export type ThreadsResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'create_failed' | 'publish_failed' | 'error' }

/** 500자 상한에 맞춰 안전하게 자른다(단어 경계 우선, 말줄임 추가). */
export function truncateForThreads(text: string, limit = THREADS_TEXT_LIMIT): string {
  if (text.length <= limit) return text
  const slice = text.slice(0, limit - 1)
  const lastSpace = slice.lastIndexOf(' ')
  const cut = lastSpace > limit * 0.6 ? slice.slice(0, lastSpace) : slice
  return `${cut.trimEnd()}…`
}

async function graphPost(
  path: string,
  params: Record<string, string>
): Promise<{ id?: string; error?: unknown }> {
  const url = new URL(`${GRAPH_BASE}/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), { method: 'POST' })
  const body = (await res.json().catch(() => ({}))) as { id?: string; error?: unknown }
  if (!res.ok) return { error: body?.error ?? { status: res.status } }
  return { id: body?.id }
}

/**
 * Threads 에 텍스트 게시. 실패해도 throw 하지 않는다. 성공 시 게시물 id 반환.
 */
export async function postToThreads(text: string, creds: ThreadsCreds): Promise<ThreadsResult> {
  const safeText = truncateForThreads(text)
  try {
    // 1) 컨테이너 생성
    const created = await graphPost(`${creds.userId}/threads`, {
      media_type: 'TEXT',
      text: safeText,
      access_token: creds.token,
    })
    if (!created.id) {
      logger.error('[social/threads] create container failed', { error: created.error })
      return { ok: false, reason: 'create_failed' }
    }

    // 2) 게시
    const published = await graphPost(`${creds.userId}/threads_publish`, {
      creation_id: created.id,
      access_token: creds.token,
    })
    if (!published.id) {
      logger.error('[social/threads] publish failed', { error: published.error })
      return { ok: false, reason: 'publish_failed' }
    }

    return { ok: true, id: published.id }
  } catch (err) {
    logger.error('[social/threads] threw', err)
    return { ok: false, reason: 'error' }
  }
}

export interface RefreshedToken {
  token: string
  expiresInSec: number
}

/**
 * 장기 토큰 갱신. 토큰이 24시간 이상 됐고 유효해야 메타가 갱신을 허용한다.
 * 실패 시 null (throw 하지 않음).
 */
export async function refreshLongLivedToken(token: string): Promise<RefreshedToken | null> {
  try {
    const url = new URL(`${GRAPH_ROOT}/refresh_access_token`)
    url.searchParams.set('grant_type', 'th_refresh_token')
    url.searchParams.set('access_token', token)
    const res = await fetch(url.toString(), { method: 'GET' })
    const body = (await res.json().catch(() => ({}))) as {
      access_token?: string
      expires_in?: number
      error?: unknown
    }
    if (!res.ok || !body.access_token) {
      logger.error('[social/threads] token refresh failed', {
        status: res.status,
        error: body?.error,
      })
      return null
    }
    return { token: body.access_token, expiresInSec: body.expires_in ?? 60 * 24 * 60 * 60 }
  } catch (err) {
    logger.error('[social/threads] token refresh threw', err)
    return null
  }
}
