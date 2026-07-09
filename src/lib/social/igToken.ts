// src/lib/social/igToken.ts
//
// Instagram 장기 토큰 자동 갱신 — threadsToken.ts 와 동일한 패턴. Instagram
// Login 발급 장기 토큰도 60일 만료라, 주간 크론이 refresh_access_token
// (grant_type=ig_refresh_token) 을 호출해 새 토큰을 받고 AES-256-GCM 으로
// 암호화해 Redis 에 저장한다. 발행 코드는 Redis 토큰 우선, 없으면 env 폴백.
//
// Meta 제약: 갱신하려는 토큰은 발급 24시간 이후 + 만료 전이어야 한다 —
// 주 1회 크론이면 항상 안전 범위.
//
// 서버 전용.

import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'
import { encryptToken, decryptToken } from '@/lib/security/tokenCrypto'
import { logger } from '@/lib/logger'

const GRAPH = 'https://graph.instagram.com'
const STORE_KEY = 'social:ig:token'
// 토큰 수명(60일)보다 넉넉히 — 크론이 죽어도 토큰 자체 만료 전까진 유지.
const STORE_TTL_SECONDS = 75 * 24 * 60 * 60

interface StoredToken {
  /** encryptToken() 결과 (prod 에선 항상 암호문). */
  enc: string
  refreshedAt: string
  /** ISO — Meta expires_in 기준 예상 만료 시각. */
  expiresAt: string
}

function envToken(): string | null {
  const t = (process.env.IG_ACCESS_TOKEN || '').trim()
  return t || null
}

/**
 * 현재 유효 토큰 — Redis(갱신본) 우선, 없으면 env(초기 발급본).
 * Redis 복호화 실패(키 교체 등) 시에도 env 로 폴백해 발행이 멈추지 않게 한다.
 */
export async function getIgAccessToken(): Promise<string | null> {
  const stored = await cacheGet<StoredToken>(STORE_KEY)
  if (stored?.enc) {
    const token = decryptToken(stored.enc)
    if (token) return token
    logger.warn('[social/igToken] stored token decrypt failed — falling back to env')
  }
  return envToken()
}

/** 저장된 갱신 상태(만료 예정일 표시용). 갱신본이 없으면 null. */
export async function getIgTokenStatus(): Promise<{
  refreshedAt: string
  expiresAt: string
} | null> {
  const stored = await cacheGet<StoredToken>(STORE_KEY)
  return stored ? { refreshedAt: stored.refreshedAt, expiresAt: stored.expiresAt } : null
}

/**
 * 토큰 갱신 — 현재 토큰으로 refresh_access_token 호출, 새 60일 토큰을 암호화
 * 저장. 성공 시 만료 예정일을 돌려준다.
 */
export async function refreshIgToken(): Promise<
  { ok: true; expiresAt: string } | { ok: false; error: string }
> {
  const current = await getIgAccessToken()
  if (!current) return { ok: false, error: 'not_configured' }

  try {
    const res = await fetch(
      `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(current)}`,
      { cache: 'no-store' }
    )
    const body = (await res.json().catch(() => null)) as {
      access_token?: string
      expires_in?: number
      error?: { message?: string }
    } | null

    if (!res.ok || !body?.access_token) {
      const msg = body?.error?.message || `HTTP ${res.status}`
      logger.error('[social/igToken] refresh failed', { error: msg })
      return { ok: false, error: msg }
    }

    const enc = encryptToken(body.access_token)
    if (!enc) return { ok: false, error: 'encrypt_failed' }

    const expiresAt = new Date(
      Date.now() + (body.expires_in ?? 60 * 24 * 60 * 60) * 1000
    ).toISOString()
    const stored: StoredToken = {
      enc,
      refreshedAt: new Date().toISOString(),
      expiresAt,
    }
    const saved = await cacheSet(STORE_KEY, stored, STORE_TTL_SECONDS)
    if (!saved) return { ok: false, error: 'store_failed' }

    logger.info('[social/igToken] refreshed', { expiresAt })
    return { ok: true, expiresAt }
  } catch (error) {
    logger.error('[social/igToken] refresh error', { error })
    return { ok: false, error: error instanceof Error ? error.message : 'network_error' }
  }
}
