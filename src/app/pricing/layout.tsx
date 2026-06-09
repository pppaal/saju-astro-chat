import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import {
  generateJsonLd,
  generateLocalizedMetadata,
  getServerLocale,
  SERVICE_FAQS,
} from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'Pricing — DestinyPal AI Saju, Tarot & Astrology Credits',
        description:
          'Pay only for what you use. One-time credit packs for AI Saju, Tarot, Compatibility, and Fortune Calendar — no subscription, no auto-renewal.',
        keywords: [
          'destinypal pricing',
          'ai saju credits',
          'tarot credits',
          'no subscription',
          'fortune telling price',
          'saju pack',
          'one-time payment',
        ],
      },
      ko: {
        title: '가격 안내 — DestinyPal AI 사주·타로·점성 크레딧',
        description:
          '사용한 만큼만 결제하세요. 구독·자동결제 없이 일회성 크레딧 팩으로 AI 사주·타로·궁합·운세 캘린더를 이용할 수 있습니다.',
        keywords: [
          '디스티니팔 가격',
          'AI 사주 크레딧',
          '타로 크레딧',
          '구독 없음',
          '운세 가격',
          '사주 크레딧 팩',
          '일회성 결제',
        ],
      },
      canonicalUrl: `${baseUrl}/pricing`,
      ogImage: '/og-image.png',
    },
    locale
  )
}

export default function PricingLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Pricing - DestinyPal',
    description:
      'One-time credit packs for AI Saju, Tarot, Compatibility, and Fortune Calendar — no subscription, no auto-renewal.',
    url: `${baseUrl}/pricing`,
  })
  const faqJsonLd = generateJsonLd({ type: 'FAQPage', faqs: SERVICE_FAQS.pricing })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={faqJsonLd} />
      {children}
    </>
  )
}
