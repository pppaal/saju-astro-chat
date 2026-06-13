import { getServerSession } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

import { prisma } from '@/lib/db/prisma'

function normalizeEmail(email?: string | null) {
  return (email || '').trim().toLowerCase()
}

function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || ''
  const list = raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
  return new Set(list)
}

// 🔒 이메일 기반 Admin 체크 (레거시, 마이그레이션 중)
export function isAdminEmail(email?: string | null) {
  const normalized = normalizeEmail(email)
  if (!normalized) {
    return false
  }
  return getAdminEmails().has(normalized)
}

// ✨ DB 기반 Role 체크 (권장) — 이메일 allowlist 를 먼저 확인해 DB 가
// 일시적으로 흔들려도(타임아웃·커넥션 오류) allowlist 어드민은 막히지 않는다.
// 이전엔 DB 조회 실패를 catch 에서 무조건 false 로 처리해 멀쩡한 어드민이
// 간헐적으로 403(Forbidden) 을 맞는 버그가 있었다. sessionEmail 을 받으면
// DB 없이도 판정 가능 + DB role 체크는 1회 재시도한다.
export async function isAdminUser(userId: string, sessionEmail?: string | null): Promise<boolean> {
  // 1) 이메일 allowlist — DB 불필요. 일시 DB 오류/세션 id 불일치에도 견고.
  if (isAdminEmail(sessionEmail)) {
    return true
  }

  // 2) DB role 체크 — 일시 오류 시 1회 재시도(간헐 false-deny 방지).
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, email: true },
      })

      if (!user) {
        return false
      }

      if (user.role === 'admin' || user.role === 'superadmin') {
        return true
      }

      // 폴백: 유저 레코드 이메일이 allowlist 인지.
      return isAdminEmail(user.email)
    } catch (error) {
      if (attempt === 0) {
        logger.warn('[isAdminUser] DB check failed — retrying once', {
          userId,
          message: error instanceof Error ? error.message : String(error),
        })
        continue
      }
      logger.error('Error checking admin status:', error)
      return false
    }
  }
  return false
}

// ✨ NEW: Role과 권한 레벨 체크
export async function checkAdminRole(
  userId: string,
  requiredRole: 'admin' | 'superadmin' = 'admin'
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (!user) {
    return false
  }

  if (requiredRole === 'superadmin') {
    return user.role === 'superadmin'
  }

  return user.role === 'admin' || user.role === 'superadmin'
}

export async function requireAdminSession() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return null
  }

  // DB 기반 체크 사용 (이메일 allowlist 우선)
  const isAdmin = await isAdminUser(session.user.id, session.user.email)
  return isAdmin ? session : null
}
