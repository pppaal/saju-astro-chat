/**
 * Threads(메타) 게시 헬퍼.
 *
 * 다른 알림/발송 레이어와 같은 철학: 환경변수(THREADS_USER_ID /
 * THREADS_ACCESS_TOKEN)가 없으면 throw 하지 않고
 * `{ ok: false, reason: 'not_configured' }` 를 돌려준다 — cron 이 깨지지 않게.
 *
 * Threads API 는 2단계: (1) 텍스트 컨테이너 생성 → creation_id, (2) publish.
 * 토큰 발급: Meta 개발자앱 → Threads API → 장기 토큰. THREADS_USER_ID 는
 * 토큰 발급 계정의 Threads user id (숫자).
 *
 * 참고: https://developers.facebook.com/docs/threads
 */

import { logger } from '@/lib/logger'

const GRAPH_BASE = 'https://graph.threads.net/v1.0'

// Threads 단일 텍스트 게시 상한(약 500자). 여유롭게 잘라 안전 게시.
export const THREADS_TEXT_LIMIT = 500

function readEnv(name: string): string | null {
  const value = process.env[name]
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === 'replace_me') return null
  return trimmed
}

export type ThreadsResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'not_configured' | 'create_failed' | 'publish_failed' | 'error' }

function getConfig(): { userId: string; token: string } | null {
  const userId = readEnv('THREADS_USER_ID')
  const token = readEnv('THREADS_ACCESS_TOKEN')
  if (!userId || !token) return null
  return { userId, token }
}

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
 * Threads 에 텍스트 게시. 미설정/실패해도 throw 하지 않는다.
 * 성공 시 게시물 id 반환.
 */
export async function postToThreads(text: string): Promise<ThreadsResult> {
  const config = getConfig()
  if (!config) {
    logger.warn('[social/threads] not configured — skipping post')
    return { ok: false, reason: 'not_configured' }
  }

  const safeText = truncateForThreads(text)

  try {
    // 1) 컨테이너 생성
    const created = await graphPost(`${config.userId}/threads`, {
      media_type: 'TEXT',
      text: safeText,
      access_token: config.token,
    })
    if (!created.id) {
      logger.error('[social/threads] create container failed', { error: created.error })
      return { ok: false, reason: 'create_failed' }
    }

    // 2) 게시
    const published = await graphPost(`${config.userId}/threads_publish`, {
      creation_id: created.id,
      access_token: config.token,
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

export function isThreadsConfigured(): boolean {
  return getConfig() !== null
}
