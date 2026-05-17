import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import {
  generateJsonLd,
  generateLocalizedMetadata,
  generateServiceSchema,
  getServerLocale,
  SERVICE_FAQS,
} from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'AI Tarot Reading — Free Online Tarot Cards & Spreads',
        description:
          'AI tarot readings with 78 Rider-Waite cards and curated spreads for love, career, and life guidance. Get an instant online tarot reading powered by AI.',
        keywords: [
          'ai tarot reading',
          'free tarot reading',
          'online tarot',
          'tarot cards',
          'tarot spread',
          'love tarot',
          'career tarot',
          'rider waite tarot',
          'daily tarot',
        ],
      },
      ko: {
        title: 'AI 타로 — 무료 온라인 타로 카드 리딩',
        description:
          '78장 라이더-웨이트 카드와 엄선된 스프레드로 연애, 커리어, 인생 가이드를 제공하는 AI 타로 리딩. 지금 바로 온라인에서 타로점을 받아보세요.',
        keywords: [
          'AI 타로',
          '무료 타로',
          '온라인 타로',
          '타로 카드',
          '타로 스프레드',
          '연애 타로',
          '커리어 타로',
          '타로점',
        ],
      },
      canonicalUrl: `${baseUrl}/tarot`,
      ogImage: '/og-image.png',
    },
    locale,
  )
}

export default function TarotLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'AI Tarot Reading',
    description:
      'AI tarot readings with 78 cards and curated spreads for love, career, and life guidance.',
    url: `${baseUrl}/tarot`,
  })
  const serviceJsonLd = generateServiceSchema('tarot')
  const faqJsonLd = generateJsonLd({ type: 'FAQPage', faqs: SERVICE_FAQS.tarot })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={faqJsonLd} />
      {children}
    </>
  )
}
