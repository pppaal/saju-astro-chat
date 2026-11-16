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

   SEO: page.tsx 가 쿼리/쿠키 기반 서버 컴포넌트라 metadata 를 여기에서 낸다 —
   자기 canonical/hreflang(en ↔ /ko) + WebPage JSON-LD.
   ============================================================ */

import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'Free Birth Chart + Four Pillars Report — Natal Chart Calculator',
        description:
          'Enter your birth date, time and place for a free natal chart (planets, houses, aspects) and a Korean Four Pillars (Saju) chart side by side, with a plain-English report on personality, strengths and blind spots. No login.',
        keywords: [
          'free birth chart',
          'birth chart calculator',
          'natal chart',
          'natal chart report',
          'four pillars chart',
          'saju chart',
          'bazi calculator',
          'astrology report free',
        ],
      },
      ko: {
        title: '무료 통합 명식 리포트 — 사주 네 기둥 + 출생 천궁도',
        description:
          '생년월일시와 출생지로 사주 명식과 출생 천궁도(행성·하우스·어스펙트)를 한 장에. 성격·강점·약점을 함께 읽는 무료 리포트, 로그인 없이.',
        keywords: [
          '무료 사주',
          '사주 명식',
          '출생 천궁도',
          '네이탈 차트',
          '사주 점성술 통합',
          '무료 리포트',
        ],
      },
      canonicalUrl: `${baseUrl}/integrated-report`,
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

export default function IntegratedReportLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Free Birth Chart + Four Pillars Report',
    description:
      'A free natal chart and Korean Four Pillars chart from birth date, time and place, with a plain-English report.',
    url: `${baseUrl}/integrated-report`,
  })

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
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  )
}
