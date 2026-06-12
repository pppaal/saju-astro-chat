'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * 익명 방문 비콘 — 페이지 전환마다 /api/track/visit 로 pathname 을 보낸다.
 * 서버가 일별 회전 해시로 익명 집계(쿠키·PII 없음)하므로 동의와 무관하게
 * 동작한다. best-effort: 실패해도 무시.
 *
 * GA/Clarity 와 달리 1st-party 라 어드민 '방문자' 탭에서 직접 본다.
 */
export function VisitorBeacon() {
  const pathname = usePathname()
  const lastSent = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return
    // /admin 은 내부 도구라 집계 제외(서버에서도 막지만 호출 자체를 아낀다).
    if (pathname.startsWith('/admin')) return
    // 같은 경로 중복 전송 방지(리렌더 가드).
    if (lastSent.current === pathname) return
    lastSent.current = pathname

    const referrer = typeof document !== 'undefined' ? document.referrer : ''
    try {
      void fetch('/api/track/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathname, referrer }),
        keepalive: true,
        cache: 'no-store',
      }).catch(() => {})
    } catch {
      /* noop — tracking is non-critical */
    }
  }, [pathname])

  return null
}
