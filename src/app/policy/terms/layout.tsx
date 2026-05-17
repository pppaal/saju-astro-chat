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
        title: 'Terms of Service',
        description:
          'DestinyPal Terms of Service covering eligibility, billing, credits, acceptable use, and legal terms.',
        keywords: ['terms of service', 'destinypal terms', 'legal terms', 'user agreement'],
      },
      ko: {
        title: '이용 약관',
        description:
          'DestinyPal 이용 약관. 가입 조건, 결제, 크레딧, 허용 사용, 법적 조항을 안내합니다.',
        keywords: ['이용약관', '서비스 약관', '디스티니팔 약관', '사용자 동의'],
      },
      canonicalUrl: `${baseUrl}/policy/terms`,
      ogImage: '/og-image.png',
    },
    locale,
  )
}

export default function TermsLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Terms of Service - DestinyPal',
    description:
      'DestinyPal Terms of Service covering account use, billing, subscriptions, credits, and legal terms.',
    url: `${baseUrl}/policy/terms`,
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  )
}
