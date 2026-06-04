'use client'

/**
 * useBodyScrollLock — 채팅(100dvh 레이아웃) 마운트 동안 html/body 스크롤 잠금.
 *
 * 모바일에서 페이지 자체가 따라 스크롤되면 rubber-band / pull-to-refresh /
 * 주소창 collapse 시 jump 회귀가 생긴다. 채팅 안쪽 messages 패널은 자기 컨테이너
 * 안에서만 스크롤하므로, 페이지 chrome(html/body) 만 핀해도 충분.
 *
 * unmount 시 진입 전 값으로 복원 — 다른 화면이 본인의 overflow 설정을 갖고 있는
 * 경우(예: 모달 스크롤 가두기) 그것을 덮어쓰지 않게 한다.
 */

import { useEffect } from 'react'

export function useBodyScrollLock(): void {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const prevBodyOverscroll = body.style.overscrollBehavior
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'contain'
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      body.style.overscrollBehavior = prevBodyOverscroll
    }
  }, [])
}
