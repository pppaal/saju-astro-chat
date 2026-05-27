/**
 * 공용 채팅 타입 — destiny / compat / followup 세 화면이 공통으로 쓰는
 * "메시지 한 줄" 모양. 이전엔 각 화면이 자체 타입(Message / ChatMessage /
 * Turn) 으로 같은 데이터를 약간씩 다르게 정의해 IDE 자동완성·새 화면 추가
 * 시 혼란이 있었음.
 *
 * 각 화면 고유 필드(예: destiny 의 streaming flag, followup 의 pending)는
 * 옵션으로 두고 필요한 곳만 채워 쓴다.
 */

export interface ChatTurn {
  role: 'user' | 'assistant' | 'system'
  content: string
  /** UI 키 / 피드백 매핑용 — destiny 가 사용. */
  id?: string
  /** Streaming 중 placeholder turn 표시 — followup 의 typing indicator 용. */
  pending?: boolean
}
