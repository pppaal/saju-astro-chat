import type { ReactNode } from 'react'
import { v9FontVars } from '@/app/fonts/v9'
import tokens from '@/styles/v9/tokens.module.css'

// v9 paper 화면(홈 / · 인생 흐름 /destiny · 캘린더 /calendar)의 토큰 루트.
// - v9 폰트 변수 클래스와 토큰 클래스(.root)를 같은 요소에 붙여야
//   --sans/--mono/--serif 가 next/font 변수를 해석한다.
// - data-surface="paper" 는 globals.css 의 html:has([data-surface='paper'])
//   규칙을 켠다: 이 루트가 DOM 에 있는 동안만 html·body 배경(오버스크롤·
//   safe-area 영역)과 color-scheme 이 paper/light 로 바뀐다.
// 서버 컴포넌트 — next/font 정의(src/app/fonts/v9.ts)가 server-only 다.
export default function V9Root({ children }: { children: ReactNode }) {
  return (
    <div className={`${v9FontVars} ${tokens.root}`} data-surface="paper">
      {children}
    </div>
  )
}
