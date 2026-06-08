// src/lib/counselor/errorMessage.ts
// Shared counselor error-message localizer. Used by both 운명상담사
// (destiny-map) and 궁합상담사 (compatibility) so the user-visible copy for
// 429/5xx/timeout/auth/credit branches is identical and the raw error
// string (e.g. "Failed (500): RateLimitError: …") never leaks into a chat
// bubble.
//
// Previously this lived in `src/components/destiny-map/chat-utils.ts` and
// 궁합상담사 had its own ad-hoc `${base}\n[${errMsg}]` concat that exposed
// the raw stack tag to end users. Promoting it here keeps a single source
// of truth; the original path re-exports for backward compatibility.

export type CounselorErrorLang = 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'pt' | 'ru'

/**
 * Localize a chat/counselor error into user-friendly copy.
 *
 * @param error    The thrown Error (or unknown — we'll coerce safely).
 * @param lang     Locale key. Only 'ko' has full translations; everything
 *                 else falls back to English copy (same behavior as the
 *                 original destiny-map implementation).
 * @param fallback Generic "something went wrong" string to use when no
 *                 branch matches. Callers pass their already-localized
 *                 copy (e.g. `tr.error` or `isKo ? '오류…' : 'An error…'`).
 */
export function getErrorMessage(
  error: unknown,
  lang: CounselorErrorLang,
  fallback: string
): string {
  const message = error instanceof Error ? error.message || '' : String(error ?? '')

  if (
    message.includes('API_ERROR:401') ||
    message.toLowerCase().includes('unauthorized') ||
    message.toLowerCase().includes('authentication required')
  ) {
    // "만료" 라고 단정하면 한 번도 로그인 안 한 비회원에게 어색함. 회원가입
    // 인센티브(무료 크레딧)도 같이 안내해서 비회원이 다음 행동을 알게 함.
    return lang === 'ko'
      ? '상담사 이용에는 로그인이 필요해요. 회원가입 시 무료 크레딧 2개로 시작할 수 있어요.'
      : 'Sign-in required to use the counselor. New accounts get 2 free credits to start.'
  }

  if (message.includes('API_ERROR:403') || message.toLowerCase().includes('csrf')) {
    return lang === 'ko'
      ? '보안 검증에 실패했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.'
      : 'Security validation failed. Refresh the page and try again.'
  }

  if (message.includes('INSUFFICIENT_CREDITS') || message.includes('API_ERROR:402')) {
    return lang === 'ko'
      ? '크레딧이 부족합니다. 충전 후 다시 시도해 주세요.'
      : 'Insufficient credits. Please recharge and try again.'
  }

  if (message.includes('timeout') || message.includes('connection')) {
    return lang === 'ko'
      ? '연결이 원활하지 않습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.'
      : 'Connection issue detected. Please check your internet and try again.'
  }

  if (message.includes('429') || message.includes('rate limit')) {
    return lang === 'ko'
      ? '요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해 주세요.'
      : 'Please try again in a moment. (Rate limit)'
  }

  if (message.includes('500') || message.includes('502') || message.includes('503')) {
    return lang === 'ko'
      ? '상담 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.'
      : 'Temporary server issue. Please try again shortly.'
  }

  // "Failed (5xx): …" 패턴 — 궁합 라우트가 응답 body 에서 만든 string.
  // 위 500/502/503 분기에서 못 잡힌 다른 5xx 도 같은 친절 카피로.
  if (/^Failed \(5\d\d\)/i.test(message)) {
    return lang === 'ko'
      ? '상담 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.'
      : 'Temporary server issue. Please try again shortly.'
  }

  if (message.includes('API_ERROR:')) {
    return lang === 'ko'
      ? '상담 서버 응답에 문제가 있습니다. 잠시 후 다시 시도해 주세요.'
      : 'The counselor server returned an error. Please try again shortly.'
  }

  return fallback
}
