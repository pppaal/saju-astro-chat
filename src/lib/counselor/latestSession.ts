import { logger } from '@/lib/logger'
import { apiFetch } from '@/lib/api'

/**
 * 가장 최근 저장된 상담 세션 id 를 가져온다 — ChatGPT 처럼 상담사 페이지를
 * (세션/폼 파라미터 없이) "맨몸" 으로 열었을 때 새 빈 채팅 대신 마지막 채팅을
 * 바로 이어서 띄우기 위함. 비로그인이면 list API 가 401 → null 반환.
 *
 * 사이드바의 list fetch 와 동일한 응답 shape({ sessions: [...] } 또는 배열)을
 * 그대로 받아 첫 row 의 id 만 추린다.
 */
export async function fetchLatestSessionId(
  type: 'destiny' | 'compat'
): Promise<string | null> {
  try {
    // apiFetch — credentials:'include' 로 세션 쿠키를 항상 실어, 모바일 인앱
    // 브라우저에서 쿠키 누락으로 401 → null(폼만 뜸) 되던 회귀를 막는다.
    const res = await apiFetch(`/api/counselor/session/list?limit=1&type=${type}`)
    if (!res.ok) return null
    const data = await res.json()
    const list = Array.isArray(data?.sessions)
      ? data.sessions
      : Array.isArray(data)
        ? data
        : []
    const id = list[0]?.id
    return typeof id === 'string' ? id : null
  } catch (e) {
    logger.warn('[latestSession] fetch failed', { type, e })
    return null
  }
}
