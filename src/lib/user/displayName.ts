import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// 사용자가 메인페이지 BirthInfoModal 에서 저장한 이름을 DB 에서 직접 읽어
// AI 응답 호명("준영님...")에 사용한다. NextAuth JWT 의 session.user.name 은
// 로그인 시점 OAuth 페이로드 기준이라 메인페이지에서 이름을 바꿔도
// 갱신되지 않음 (src/lib/auth/authOptions.ts:299 session callback 은 id/email
// 만 동기화). → 매 호출마다 User.name 을 1쿼리로 가져온다 (단일 컬럼,
// PK 조회라 비용 무시할 수준).
export async function getUserDisplayName(
  userId: string | null | undefined
): Promise<string | null> {
  if (!userId) return null
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })
    return u?.name?.trim() || null
  } catch (err) {
    // 이름 조회 실패는 AI 응답 흐름을 막아선 안 됨 — 이름 없이 진행.
    logger.warn('[getUserDisplayName] lookup failed', { userId, err })
    return null
  }
}

// AI 시스템 컨텍스트에 주입할 표준 호명 디렉티브 (한/영 공용 폼).
export function buildCallerDirective(name: string | null, language: 'ko' | 'en'): string {
  if (!name) return ''
  return language === 'ko'
    ? `# 호출자\n${name} — 한국어로 답할 때 '${name}님'으로 정중히 호명하라.\n`
    : `# Caller\n${name} — address as 'Hi ${name},' naturally.\n`
}
