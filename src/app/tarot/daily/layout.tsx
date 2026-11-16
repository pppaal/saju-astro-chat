/* ============================================================
   /tarot/daily — 라우트 전용 layout (SEO metadata).
   page.tsx 는 'use client' 라 metadata 를 낼 수 없고, 부모 /tarot/layout 의
   canonical(/tarot) 을 그대로 상속하면 이 페이지가 /tarot 의 복제로 취급된다.
   여기서 자기 canonical/hreflang(en ↔ /ko) + WebPage JSON-LD 를 낸다.
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
        title: "Today's Free Tarot Card — One Card a Day",
        description:
          "Draw one free tarot card for today and get a short reading: the card's meaning, today's flow and one thing to try. A new card every day, no login needed.",
        keywords: [
          'free daily tarot',
          'tarot card of the day',
          'today tarot card',
          'one card tarot',
          'daily tarot reading',
          'free tarot online',
        ],
      },
      ko: {
        title: '오늘의 타로 — 하루 한 장 무료 타로 카드',
        description:
          '오늘의 타로 카드 한 장을 무료로 뽑고 짧은 해석을 받아보세요. 카드의 의미, 오늘의 흐름, 해볼 행동 하나. 매일 새로, 로그인 없이.',
        keywords: ['오늘의 타로', '무료 타로', '타로 한 장', '데일리 타로', '오늘의 카드'],
      },
      canonicalUrl: `${baseUrl}/tarot/daily`,
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

export default function TarotDailyLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: "Today's Free Tarot Card",
    description:
      "One free tarot card a day with a short reading: the card's meaning, today's flow and one thing to try.",
    url: `${baseUrl}/tarot/daily`,
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  )
}
