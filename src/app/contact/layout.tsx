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
        title: 'Contact Us — DestinyPal Support',
        description:
          "Get in touch with DestinyPal. We're here to help with questions about our AI-powered Saju, astrology, and tarot guidance services.",
        keywords: [
          'contact destinypal',
          'customer support',
          'help center',
          'feedback',
          'destinypal contact',
          'saju support',
        ],
      },
      ko: {
        title: '문의하기 — DestinyPal 고객 지원',
        description:
          'DestinyPal에 문의하세요. AI 기반 사주, 점성, 타로 서비스에 대한 궁금증을 도와드립니다.',
        keywords: [
          '디스티니팔 문의',
          '고객 지원',
          '도움말',
          '피드백',
          'DestinyPal 연락처',
          '사주 문의',
        ],
      },
      canonicalUrl: `${baseUrl}/contact`,
      ogImage: '/og-image.png',
    },
    locale,
  )
}

export default function ContactLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Contact Us',
    description: 'Get in touch with DestinyPal for questions and support.',
    url: `${baseUrl}/contact`,
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  )
}
