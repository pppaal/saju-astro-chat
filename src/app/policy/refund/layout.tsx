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
        title: 'Refund and Payment Policy',
        description:
          'DestinyPal Refund and Payment Policy for credit packs, subscriptions, non-refundable AI readings, and exception handling.',
        keywords: ['refund policy', 'payment policy', 'destinypal refund', 'credits refund'],
      },
      ko: {
        title: '환불 및 결제 정책',
        description:
          'DestinyPal의 환불 및 결제 정책. 크레딧 팩, 구독, 비환불 AI 리딩, 예외 처리 안내.',
        keywords: ['환불 정책', '결제 정책', '디스티니팔 환불', '크레딧 환불'],
      },
      canonicalUrl: `${baseUrl}/policy/refund`,
      ogImage: '/og-image.png',
    },
    locale,
  )
}

export default function RefundLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Refund and Payment Policy - DestinyPal',
    description:
      'DestinyPal Refund and Payment Policy for subscriptions, credit packs, and exception refund scenarios.',
    url: `${baseUrl}/policy/refund`,
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  )
}
