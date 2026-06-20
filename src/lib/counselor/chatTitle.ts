/**
 * 상담 채팅 세션 제목 도출 — 사이드바가 보여주는 30자 제목 규칙의 단일 출처.
 *
 * 같은 규칙이 여러 곳(chat-history 라우트, ensureSessionRecord 안전망,
 * session/list fallback)에 흩어져 있었다. 새 생성 경로(session/save)가 제목을
 * 안 박으면, 자동저장이 안전망보다 먼저 행을 만들 때 title 이 NULL 로 남아
 * 사이드바가 매 로드마다 fallback 쿼리로 제목을 다시 뽑는다. 여기로 통일한다.
 */

const CHAT_TITLE_MAX = 30

/** 임의 텍스트를 사이드바용 30자 제목으로 정규화. 비면 null. */
export function truncateChatTitle(raw: string | null | undefined): string | null {
  const cleaned = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return null
  return cleaned.length <= CHAT_TITLE_MAX
    ? cleaned
    : `${cleaned.slice(0, CHAT_TITLE_MAX - 1).trim()}…`
}

interface TitleMessage {
  role?: string
  content?: string | null
}

/** 첫 user 메시지에서 제목을 뽑는다(없으면 null). */
export function deriveChatTitleFromMessages(
  messages: TitleMessage[] | undefined | null
): string | null {
  if (!Array.isArray(messages)) return null
  const firstUser = messages.find((m) => m && m.role === 'user')?.content
  return truncateChatTitle(typeof firstUser === 'string' ? firstUser : '')
}
