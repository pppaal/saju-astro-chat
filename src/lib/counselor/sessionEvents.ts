// 세션 삭제를 컴포넌트 간에 알리는 경량 이벤트 버스.
//
// 문제: 상담사 화면엔 세션 목록을 들고 있는 곳이 둘이다 —
//   (1) CounselorSidebar (3단바 드로어) 의 자체 `sessions` state
//   (2) Chat 의 useChatSession `sessionHistory` state
// 한쪽에서 삭제해도 다른 쪽은 모른 채 stale 목록을 그대로 보여준다
// (특히 보던 세션을 지우면 사이드바가 activeSessionId 로 그 행을 되살림).
//
// 해결: 삭제 시 window CustomEvent 를 쏘고, 목록을 든 컴포넌트가 구독해
// 즉시 그 id 를 목록에서 제거 + 재주입 차단. destiny·compat 공용 경로라
// 한 번 고치면 둘 다 반영된다.

export const SESSION_DELETED_EVENT = 'counselor:session-deleted'

export function emitSessionDeleted(id: string): void {
  if (typeof window === 'undefined' || !id) return
  window.dispatchEvent(new CustomEvent(SESSION_DELETED_EVENT, { detail: { id } }))
}

/** 구독. cleanup 함수를 반환하므로 useEffect 에서 그대로 return 하면 된다. */
export function onSessionDeleted(cb: (id: string) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (e: Event) => {
    const id = (e as CustomEvent<{ id?: string }>).detail?.id
    if (id) cb(id)
  }
  window.addEventListener(SESSION_DELETED_EVENT, handler)
  return () => window.removeEventListener(SESSION_DELETED_EVENT, handler)
}
