// src/lib/social/publish/threadsToken.ts
//
// Threads 장기 액세스 토큰 보관·갱신. Threads 의 long-lived 토큰은 약 60일
// 뒤 만료되므로, 그냥 env 에 박아두면 두 달 뒤 자동 게시가 멈춘다. 그래서:
//
//   - 활성 토큰을 Redis(threads:access_token)에 보관. 발행은 항상 여기서
//     최신 토큰을 읽는다(없으면 env 초기 시드로 폴백).
//   - 매일 도는 갱신 cron(/api/cron/threads-refresh-token)이 Threads refresh
//     엔드포인트로 새 60일 토큰을 받아 Redis 에 다시 쓴다. 하루 한 번만 돌아도
//     매번 만료가 60일 뒤로 밀려 영구히 살아있다.
//
// 문서: https://developers.facebook.com/docs/threads/get-started/long-lived-tokens
// 서버 전용.

import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'

const TOKEN_KEY = 'threads:access_token'
const GRAPH = 'https://graph.threads.net'
const DEFAULT_TTL_SECONDS = 60 * 24 * 60 * 60 // 60일 — Threads long-lived 기본
const REFRESH_HEADROOM_SECONDS = 24 * 60 * 60 // 만료 하루 전 교체 여유

/** 발행에 쓸 활성 토큰 — 자동 갱신된 Redis 값 우선, 없으면 env 초기 시드. */
export async function getActiveThreadsToken(): Promise<string> {
  const cached = await cacheGet<string>(TOKEN_KEY)
  if (cached && typeof cached === 'string') return cached
  return (process.env.THREADS_ACCESS_TOKEN || '').trim()
}

/** 갱신된 토큰을 Redis 에 보관(TTL = 유효기간). */
export async function setActiveThreadsToken(token: string, ttlSeconds: number): Promise<void> {
  await cacheSet(TOKEN_KEY, token, ttlSeconds)
}

export interface RefreshResult {
  ok: boolean
  expiresIn?: number
  error?: string
}

/**
 * 장기 토큰을 새 60일 토큰으로 교체한다. Threads 규칙상 토큰은 유효하고
 * 24시간 이상 된 것이어야 한다(갓 발급분은 그 전까진 거절될 수 있음).
 * 성공 시 새 토큰을 Redis 에 보관하고 expiresIn 을 돌려준다.
 */
export async function refreshThreadsToken(): Promise<RefreshResult> {
  const current = await getActiveThreadsToken()
  if (!current) return { ok: false, error: 'no_token' }

  const url =
    `${GRAPH}/refresh_access_token?grant_type=th_refresh_token` +
    `&access_token=${encodeURIComponent(current)}`
  try {
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, error: `${res.status} ${body.slice(0, 200)}` }
    }
    const data = (await res.json()) as { access_token?: string; expires_in?: number }
    if (!data.access_token) return { ok: false, error: 'no_access_token_in_response' }

    const expiresIn = data.expires_in ?? DEFAULT_TTL_SECONDS
    // 만료 직전 교체 여유를 두고 살짝 짧게 보관(최소 1시간).
    const ttl = Math.max(expiresIn - REFRESH_HEADROOM_SECONDS, 3600)
    await setActiveThreadsToken(data.access_token, ttl)
    return { ok: true, expiresIn }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' }
  }
}
