/**
 * Threads 자격증명 출처/저장/갱신.
 *
 * 우선순위: DB(SocialCredential, 복호화) > env(THREADS_ACCESS_TOKEN).
 *   - 최초엔 env 토큰으로 시작 → 첫 갱신 때 DB 에 저장 → 이후 DB 가 SSOT.
 *   - 토큰은 tokenCrypto(AES-256-GCM)로 암호화 저장. 평문 저장 안 함.
 *
 * userId 는 항상 env(THREADS_USER_ID) — 바뀌지 않는 식별자라 굳이 DB 불필요.
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { encryptToken, decryptToken } from '@/lib/security/tokenCrypto'
import { refreshLongLivedToken, type ThreadsCreds } from '@/lib/social/threads'

const PLATFORM = 'threads'

function readEnv(name: string): string | null {
  const value = process.env[name]
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === 'replace_me') return null
  return trimmed
}

/** DB 에 저장된 토큰(복호화) — 없으면 env 시드 토큰. 둘 다 없으면 null. */
export async function getThreadsToken(): Promise<string | null> {
  try {
    const row = await prisma.socialCredential.findUnique({ where: { platform: PLATFORM } })
    if (row?.accessToken) {
      const decrypted = decryptToken(row.accessToken)
      if (decrypted) return decrypted
    }
  } catch (err) {
    // DB 문제 시 env 로 폴백 — 게시는 best-effort.
    logger.warn('[social/threadsToken] DB read failed, falling back to env', { err })
  }
  return readEnv('THREADS_ACCESS_TOKEN')
}

/** 게시에 필요한 자격증명 전체. userId(env) 또는 token 이 없으면 null. */
export async function getThreadsCreds(): Promise<ThreadsCreds | null> {
  const userId = readEnv('THREADS_USER_ID')
  if (!userId) return null
  const token = await getThreadsToken()
  if (!token) return null
  return { userId, token }
}

export function isThreadsConfiguredSync(): boolean {
  // 환경변수 기준 빠른 점검(시드 토큰 또는 userId 만으로 UI 가 상태 표시).
  return Boolean(readEnv('THREADS_USER_ID')) && Boolean(readEnv('THREADS_ACCESS_TOKEN'))
}

/** 새 토큰을 암호화해 upsert. expiresInSec 으로 만료시각 계산. */
export async function storeThreadsToken(token: string, expiresInSec: number): Promise<void> {
  const enc = encryptToken(token)
  if (!enc) {
    logger.error('[social/threadsToken] encrypt returned null — not storing')
    return
  }
  const expiresAt = new Date(Date.now() + expiresInSec * 1000)
  await prisma.socialCredential.upsert({
    where: { platform: PLATFORM },
    update: { accessToken: enc, expiresAt },
    create: { platform: PLATFORM, accessToken: enc, expiresAt },
  })
}

export type RefreshOutcome =
  | { status: 'refreshed'; expiresAt: string }
  | { status: 'skipped'; reason: 'no_token' | 'refresh_failed' }

/**
 * 현재 토큰을 갱신해 DB 에 저장. cron(threads-token-refresh)이 주기 호출.
 * 토큰이 없으면 'no_token', 메타가 갱신 거부(<24h 등)하면 'refresh_failed'.
 */
export async function refreshThreadsTokenAndStore(): Promise<RefreshOutcome> {
  const token = await getThreadsToken()
  if (!token) return { status: 'skipped', reason: 'no_token' }

  const refreshed = await refreshLongLivedToken(token)
  if (!refreshed) return { status: 'skipped', reason: 'refresh_failed' }

  await storeThreadsToken(refreshed.token, refreshed.expiresInSec)
  const expiresAt = new Date(Date.now() + refreshed.expiresInSec * 1000).toISOString()
  logger.warn('[social/threadsToken] token refreshed', { expiresAt })
  return { status: 'refreshed', expiresAt }
}
