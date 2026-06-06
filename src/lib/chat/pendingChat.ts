/**
 * pendingChat — 비로그인(게스트) 또는 크레딧 소진 사용자가 진행 중이던 채팅/리딩을
 * localStorage 에 임시 저장했다가, 로그인 / 크레딧 구매로 페이지가 풀 리로드된 뒤
 * "직전 채팅창"으로 복원하기 위한 공용 드래프트 저장소.
 *
 * 왜 localStorage 인가: 로그인(OAuth) 은 외부 도메인을 거쳐 돌아오는 풀 네비게이션
 * 이라 sessionStorage 가 탭/컨텍스트에 따라 날아갈 수 있다. localStorage 는 그 왕복을
 * 견딘다. 대신 무한 보존을 막으려고 TTL 을 두고, 복원에 쓰인 뒤엔 명시적으로 지운다.
 */

export type PendingChatKind = 'compat' | 'destiny' | 'tarot'

interface PendingEnvelope<T> {
  savedAt: number
  payload: T
}

const KEY = (kind: PendingChatKind) => `pending_chat:${kind}`
// 한도 도달 → 로그인/구매 왕복은 보통 수 분 내. 2시간이면 충분하고, 오래된
// 드래프트가 엉뚱하게 되살아나는 일도 막는다.
const TTL_MS = 2 * 60 * 60 * 1000

export function savePendingChat<T>(kind: PendingChatKind, payload: T): void {
  if (typeof window === 'undefined') return
  try {
    const env: PendingEnvelope<T> = { savedAt: Date.now(), payload }
    window.localStorage.setItem(KEY(kind), JSON.stringify(env))
  } catch {
    /* quota / 비공개모드 — 복원 실패해도 기능 자체는 동작 */
  }
}

export function loadPendingChat<T>(kind: PendingChatKind): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY(kind))
    if (!raw) return null
    const env = JSON.parse(raw) as PendingEnvelope<T>
    if (!env || typeof env.savedAt !== 'number' || Date.now() - env.savedAt > TTL_MS) {
      window.localStorage.removeItem(KEY(kind))
      return null
    }
    return env.payload ?? null
  } catch {
    return null
  }
}

export function clearPendingChat(kind: PendingChatKind): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY(kind))
  } catch {
    /* noop */
  }
}
