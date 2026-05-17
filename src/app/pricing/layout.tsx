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
        title: 'Pricing Plans — DestinyPal AI Saju, Tarot & Astrology',
        description:
          'Choose your DestinyPal plan. Get AI-powered Saju (Four Pillars), Tarot, and astrology readings with flexible subscription and credit pack options.',
        keywords: [
          'destinypal pricing',
          'ai saju subscription',
          'tarot subscription',
          'astrology membership',
          'fortune telling plans',
          'saju credits',
          'ai reading price',
        ],
      },
      ko: {
        title: '요금제 — DestinyPal AI 사주·타로·점성',
        description:
          'DestinyPal 요금제를 선택하세요. AI 기반 사주(사주팔자), 타로, 점성 리딩을 구독 및 크레딧 팩 옵션으로 이용할 수 있습니다.',
        keywords: [
          '디스티니팔 요금제',
          'AI 사주 구독',
          '타로 구독',
          '점성 멤버십',
          '운세 가격',
          '사주 크레딧',
        ],
      },
      canonicalUrl: `${baseUrl}/pricing`,
      ogImage: '/og-image.png',
    },
    locale,
  )
}

export default function PricingLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Pricing Plans - DestinyPal',
    description:
      'Choose your DestinyPal plan. Get AI-powered Saju, Tarot, Astrology readings with flexible subscription options.',
    url: `${baseUrl}/pricing`,
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  )
}
