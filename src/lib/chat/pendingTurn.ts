/**
 * pendingTurn — 끊긴 턴 복원용 영속 식별자.
 *
 * 서버는 연결이 끊겨도 keepGeneratingOnDisconnect 로 끝까지 생성해 turnId 로
 * result 캐시에 저장한다. 클라이언트는 마운트 시 이 turnId 를 다시 꺼내 result
 * 를 폴링해 잘린 답을 완성본으로 갈아끼운다(ChatGPT 식). 메모리(recoverableTurnRef)
 * 만으로는 크레딧 구매 등으로 페이지를 떠났다 돌아오는 풀 네비게이션을 못 견디므로
 * localStorage 에 같이 남긴다.
 *
 * TTL 은 서버 result 캐시(10분)와 맞춘다 — 그 뒤엔 캐시가 비어 복원 불가.
 */

export type PendingTurnKind = 'compat' | 'destiny'

export type PendingTurn = { turnId: string; userText: string; ts: number }

const KEY = (kind: PendingTurnKind) =>
  kind === 'destiny' ? 'destinyCounselor:pendingTurn' : 'compatCounselor:pendingTurn'
const TTL_MS = 10 * 60 * 1000

export function readPendingTurn(kind: PendingTurnKind): PendingTurn | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY(kind))
    if (!raw) return null
    const t = JSON.parse(raw) as PendingTurn
    if (!t?.turnId || typeof t.ts !== 'number') return null
    return t
  } catch {
    return null
  }
}

export function writePendingTurn(kind: PendingTurnKind, t: PendingTurn): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY(kind), JSON.stringify(t))
  } catch {
    /* 저장 실패(quota/private mode) — 영속 복원만 포기, 인메모리 경로는 유지 */
  }
}

export function clearPendingTurn(kind: PendingTurnKind): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY(kind))
  } catch {
    /* noop */
  }
}

export const PENDING_TURN_TTL_MS = TTL_MS
