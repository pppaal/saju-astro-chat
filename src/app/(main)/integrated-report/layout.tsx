/* ============================================================
   /integrated-report — 라우트 전용 layout.
   통합 리포트(천궁도 휠·어스펙트 그리드·명식)는 IntegratedReport.module.css
   의 폰트 토큰 3 종에 의존한다:
     --sym   : 'Noto Sans Symbols 2' — 행성/별자리 글리프(☉ ☽ ♀ ♈ …)
     --serif : 'Noto Serif KR'       — 본문 한글 serif
     --mono  : 'IBM Plex Mono'       — eyebrow/좌표/범위 표기

   루트 layout 은 self-hosted next/font/local 5 종만 싣고 이 3 종은 없다.
   데스크톱은 시스템 폰트로 우연히 글리프가 떠도, 폰이엔 'Noto Sans Symbols 2'
   글리프가 없어 행성·별자리 기호가 두부(□)로 깨져 보였다. calendar/layout 과
   똑같이 runtime CDN link 만 주입해 이 라우트에서만 3 종을 올린다.
   (CSP 는 이미 fonts.googleapis.com / fonts.gstatic.com 을 허용 — src/proxy.ts.)
   ============================================================ */

import type { ReactNode } from 'react'

export default function IntegratedReportLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href={
          'https://fonts.googleapis.com/css2?' +
          [
            'family=Noto+Serif+KR:wght@400;500;600;700',
            'family=Noto+Sans+Symbols+2',
            'family=IBM+Plex+Mono:wght@400;500',
            'display=swap',
          ].join('&')
        }
      />
      {children}
    </>
  )
}
