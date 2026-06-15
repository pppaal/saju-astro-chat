/* ============================================================
   /calendar/* — 라우트 전용 layout.
   destinypal 5-tier UI 는 hanji + 먹 톤이라 root layout 의 다크
   cosmic 폰트(Montserrat / Noto Sans KR) 와 별개로 4 종 필요:
     - Newsreader   (serif headline / 영문 lead)
     - Gowun Batang (한글 serif — 본문)
     - Gowun Dodum  (한글 sans  — chrome, chip, label)
     - IBM Plex Mono (mono — eyebrow, range, scale 표기)

   루트 layout 은 self-hosted next/font/local 만 쓴다 (CI 가
   fonts.googleapis.com 빌드 페치에 실패해 막힌 적이 있어). 여기서는
   runtime CDN link 만 주입해 destinypal 라우트에서만 4 종이 깨끗하게
   적용되도록 한다. preconnect 2 줄로 1st paint cost 도 최소화.
   ============================================================ */

import type { ReactNode } from 'react'

export default function DestinypalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href={
          'https://fonts.googleapis.com/css2?' +
          [
            'family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400',
            'family=Gowun+Batang:wght@400;700',
            'family=Gowun+Dodum',
            'family=IBM+Plex+Mono:wght@400;500;600',
            'display=swap',
          ].join('&')
        }
      />
      {children}
    </>
  )
}
