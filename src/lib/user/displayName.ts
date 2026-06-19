import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

const MAX_DISPLAY_NAME_LEN = 50

// LLM 프롬프트에 박힐 표시 이름 정규화용 control-char 제거 패턴.
// 직접 literal regex 에 escape 시퀀스 넣어 두면 파일 편집 도구가 byte
// 보존을 깨뜨릴 위험이 있어 RegExp 생성자 + 문자열 escape 으로 안전하게.
// 범위: C0 (U+0000-U+001F) + DEL (U+007F) + C1 (U+0080-U+009F) + LS/PS
// (U+2028/2029 — JSON serialization 위험 / prompt 라인 분리 우회).
const CTRL_OR_LINE_SEP_RE = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029]+', 'g')

/**
 * LLM 프롬프트에 안전하게 박을 수 있게 사용자 이름을 정규화한다:
 *   - 줄바꿈/탭/제어문자 제거 (개행 뒤 `[SYSTEM]` 같은 prompt injection 차단)
 *   - 길이 50자로 cap (User.name 컬럼은 임의 길이 가능)
 *   - 양끝 공백 trim, 내부 다중 공백 단일 공백으로 축약
 *
 * 정규화 후 빈 문자열이면 null 반환 (호명 생략).
 */
export function sanitizeDisplayName(raw: string | null | undefined): string | null {
  if (!raw) return null
  const cleaned = raw
    .replace(CTRL_OR_LINE_SEP_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DISPLAY_NAME_LEN)
    .trim()
  return cleaned || null
}

// 사용자가 메인페이지 BirthInfoModal 에서 저장한 이름을 DB 에서 직접 읽어
// AI 응답 호명("준영님...")에 사용한다. NextAuth JWT 의 session.user.name 은
// 로그인 시점 OAuth 페이로드 기준이라 메인페이지에서 이름을 바꿔도
// 갱신되지 않음 (src/lib/auth/authOptions.ts:299 session callback 은 id/email
// 만 동기화). → 매 호출마다 User.name 을 1쿼리로 가져온다 (단일 컬럼,
// PK 조회라 비용 무시할 수준).
//
// 리턴 값은 sanitizeDisplayName 으로 prompt-safe 정규화됨 — 호출처가 LLM
// 프롬프트에 그대로 박아도 개행/제어문자 injection 위험 없음.
export async function getUserDisplayName(
  userId: string | null | undefined
): Promise<string | null> {
  if (!userId) return null
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })
    return sanitizeDisplayName(u?.name)
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
