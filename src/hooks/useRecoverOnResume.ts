'use client'

/**
 * useRecoverOnResume — 끊긴 턴 복원용 visibility/online/focus 리스너.
 *
 * 다른 앱/탭에서 돌아오거나(visible/focus) 네트워크가 복구되면(online) 끊겼던
 * 턴의 완성 답을 복원 시도. attemptRecover 자체가 (복원 대상 없음 / 문서 비가시 /
 * 이미 복원 중) 가드를 가지고 있어, 세 이벤트가 겹쳐 발화해도 중복 폴링은 안 생긴다.
 *
 * 일부 모바일 브라우저는 visibilitychange 없이 focus 만 돌아오는 케이스가 있어
 * 세 이벤트를 모두 잡는다.
 */

import { useEffect } from 'react'

export function useRecoverOnResume(attemptRecover: () => void): void {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onResume = () => {
      if (document.visibilityState === 'visible') void attemptRecover()
    }
    document.addEventListener('visibilitychange', onResume)
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onResume)
      window.addEventListener('focus', onResume)
    }
    return () => {
      document.removeEventListener('visibilitychange', onResume)
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onResume)
        window.removeEventListener('focus', onResume)
      }
    }
  }, [attemptRecover])
}
