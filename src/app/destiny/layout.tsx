/* ============================================================
   /destiny — 라우트 전용 layout.
   인생 흐름은 v9.2 종이 문서 — 운세 달력 layout 과 같이 V9Root(v9 글꼴 변수 + 토큰 +
   data-surface="paper")로 감싼다. 브라우저 UI(주소창 · 상태 막대)도 종이 색.
   ============================================================ */

import type { ReactNode } from 'react'
import type { Viewport } from 'next'
import V9Root from '@/components/v9/server/V9Root'

export const viewport: Viewport = { themeColor: '#F3EFE7' }

export default function DestinyLayout({ children }: { children: ReactNode }) {
  return <V9Root>{children}</V9Root>
}
