'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { analytics } from './GoogleAnalytics'

/**
 * GA 로그인 이벤트 추적 — 세션이 *실제로* unauthenticated → authenticated 로
 * 바뀌는 순간(=방금 로그인)에만 발화한다. 새로고침/일반 로드는 loading →
 * authenticated 라 직전 상태가 'unauthenticated' 가 아니어서 발화하지 않는다.
 *
 * 동의(CMP) 전엔 gtag 가 전송하지 않으므로 호출 자체는 안전.
 *
 * signup(신규) vs login(재방문) 구분은 서버가 세션에 isNewUser 를 실어줘야
 * 정확해서, 지금은 모든 로그인 성공을 login 으로 집계한다(추후 분리 여지).
 */
export default function AuthEventTracker() {
  const { status } = useSession()
  const prevStatus = useRef<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated' && prevStatus.current === 'unauthenticated') {
      analytics.login()
    }
    if (status !== 'loading') prevStatus.current = status
  }, [status])

  return null
}
