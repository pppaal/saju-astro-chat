'use client'

import { useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { clearPendingChat, type PendingChatKind } from '@/lib/chat/pendingChat'

/**
 * 운명·궁합 상담사가 공유하는 "새 채팅" 세션 처리.
 *
 * 두 페이지는 화면/AI/저장 엔드포인트가 서로 다르지만, '새 채팅'을 누를 때
 * 해야 하는 세션 정리는 동일해야 한다:
 *   1) 게스트 진행 드래프트(localStorage) 정리.
 *   2) URL 의 `?session=` 제거 — 안 떼면 같은 라우트에서 직전 세션을 다시
 *      resume 해 새 채팅이 빈 화면으로 안 보인다(운명에서 났던 버그, 궁합도
 *      동일 잠재 버그). 생년월일·인물 등 다른 컨텍스트 파라미터는 보존.
 *   3) 페이지별 상태 초기화(onReset) — remount(운명) 또는 state 리셋+picker(궁합).
 *
 * 페이지마다 흩어져 어긋나던 이 로직을 한 곳으로 모아, 두 상담사의 새 채팅
 * 동작을 구조적으로 일치시킨다.
 *
 * 주의 — stripSessionParam:
 *   운명 상담사는 bare 진입 시 자동복원을 `autoResumeAttemptedRef` 로 1회만
 *   허용하도록 가드돼 있어, `?session=` 을 떼어 bare 가 돼도 직전 세션을 다시
 *   끌어오지 않는다. 반면 궁합 상담사의 resume 효과에는 그 가드가 없어, bare
 *   URL 이 되면 "가장 최근 채팅 자동 이어보기"가 발동해 방금 시작한 새 채팅을
 *   덮어쓴다. 그래서 궁합은 stripSessionParam:false 로 URL 을 건드리지 않고
 *   상태 리셋만 한다(현행 동작 유지). 두 페이지의 자동복원 가드를 일치시키면
 *   궁합도 strip 을 켤 수 있다 — 후속 과제.
 */
export function useCounselorNewChat(
  basePath: string,
  draftKey: PendingChatKind,
  options?: { stripSessionParam?: boolean }
) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stripSessionParam = options?.stripSessionParam ?? true

  return useCallback(
    (onReset?: () => void) => {
      clearPendingChat(draftKey)

      if (stripSessionParam) {
        const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []))
        if (params.has('session')) {
          params.delete('session')
          const qs = params.toString()
          router.replace(qs ? `${basePath}?${qs}` : basePath)
        }
      }

      onReset?.()
    },
    [router, searchParams, basePath, draftKey, stripSessionParam]
  )
}
