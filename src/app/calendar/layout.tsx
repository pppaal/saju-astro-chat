/* ============================================================
   /calendar/* — 라우트 전용 layout.
   운세 달력은 v9.2 종이 문서 — V9Root(v9 글꼴 변수 + 토큰 + data-surface="paper")로 감싼다.
   글꼴은 루트처럼 self-hosted next/font/local(src/app/fonts/v9.ts)만 쓴다 — 옛 줌 셸의
   런타임 Google Fonts CDN <link>(Newsreader · Gowun · IBM Plex Mono)는 걷어냈다(그 글꼴을
   이름으로 부르던 CSS 는 이 단계에서 모두 지워지거나 v9 토큰으로 바뀌었다). 브라우저
   UI(주소창 · 상태 막대)도 종이 색.
   ============================================================ */

import type { ReactNode } from 'react'
import type { Viewport } from 'next'
import V9Root from '@/components/v9/server/V9Root'

export const viewport: Viewport = { themeColor: '#F3EFE7' }

export default function CalendarLayout({ children }: { children: ReactNode }) {
  return <V9Root>{children}</V9Root>
}
