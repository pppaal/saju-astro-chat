/**
 * 삭제된 상담 세션의 "묘비(tombstone)".
 *
 * 회귀(엣지): 답변이 아직 스트리밍 중일 때 사용자가 그 채팅을 삭제하면,
 *  - realtime 의 안전망(ensureCounselorSessionRecord, onComplete)이 "행 없으면
 *    생성"으로 방금 지운 세션을 다시 만들고,
 *  - 디바운스 만료 전이던 클라 자동저장(session/save)도 같은 id 로 재생성할 수
 *    있다.
 * → 삭제한 채팅이 되살아난다.
 *
 * 세션 id 는 클라가 생성하는 `chat_<ts>_<rand>` 라 한 번 쓰인 id 는 재사용되지
 * 않는다. 그래서 삭제 직후 짧은 기간(스트림 최대 길이 maxDuration=120s 를 넉넉히
 * 덮는 5분) 동안만 같은 id 의 재생성을 막으면 충분하다. 두 생성 경로가 생성 직전
 * 이 묘비를 확인해 스킵한다.
 *
 * Redis 백엔드(서버리스에서 인스턴스 간 공유). Redis 미설정 시 in-memory
 * fallback 이라 단일 인스턴스 내에서만 유효하지만, 실패해도 best-effort 로
 * 동작을 막지 않는다(되살아날 가능성만 남고 기능은 정상).
 */

import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'

const TOMBSTONE_TTL_SEC = 300

const tombstoneKey = (sessionId: string) => `counselor:session-deleted:${sessionId}`

/** 세션 삭제 시 호출 — 짧은 기간 같은 id 의 재생성을 차단한다. best-effort. */
export async function markCounselorSessionDeleted(sessionId: string): Promise<void> {
  if (!sessionId) return
  try {
    await cacheSet(tombstoneKey(sessionId), '1', TOMBSTONE_TTL_SEC)
  } catch {
    /* best-effort — 실패해도 흐름을 막지 않는다 */
  }
}

/** create-if-missing 직전 확인 — true 면 방금 삭제된 세션이라 생성하면 안 된다. */
export async function isCounselorSessionDeleted(sessionId: string): Promise<boolean> {
  if (!sessionId) return false
  try {
    return (await cacheGet<string>(tombstoneKey(sessionId))) === '1'
  } catch {
    return false
  }
}
