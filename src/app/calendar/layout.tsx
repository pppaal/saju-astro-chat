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

   SEO: page.tsx 가 세션/쿼리 기반 서버 컴포넌트라 metadata 를 여기(layout)
   에서 낸다 — 자기 canonical/hreflang(en ↔ /ko) + WebPage JSON-LD. 이게 없으면
   루트 layout 의 기본 title 만 받아 "홈의 복제" 로 색인된다.
   ============================================================ */

import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import DestinypalFontsShell from './DestinypalFontsShell'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'Personal Timing Calendar — Good Days This Month From Your Birth Chart',
        description:
          'A free day-by-day timing calendar computed from your birth chart and Korean Four Pillars: which days this month favor decisions, meetings, rest and money, with the factors behind each grade.',
        keywords: [
          'timing calendar',
          'good days this month',
          'lucky days calendar',
          'astrology calendar',
          'personal fortune calendar',
          'daily transit calendar',
          'auspicious dates',
          'four pillars calendar',
        ],
      },
      ko: {
        title: '운흐름 캘린더 — 이번 달 좋은 날, 내 사주로 보는 일별 흐름',
        description:
          '사주와 출생 별자리로 계산한 나만의 타이밍 캘린더. 이번 달 어떤 날이 결정·만남·휴식·금전에 유리한지 일별 등급과 근거를 함께 보여드립니다.',
        keywords: ['운세 캘린더', '이번달 좋은 날', '길일', '사주 캘린더', '오늘의 운세', '일진'],
      },
      canonicalUrl: `${baseUrl}/calendar`,
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

export default function DestinypalLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Personal Timing Calendar',
    description:
      'A day-by-day timing calendar computed from your birth chart and Korean Four Pillars, with the factors behind each grade.',
    url: `${baseUrl}/calendar`,
  })

  return (
    <DestinypalFontsShell>
      <JsonLd data={pageJsonLd} />
      {children}
    </DestinypalFontsShell>
  )
}
