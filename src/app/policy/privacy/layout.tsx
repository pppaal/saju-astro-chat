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
        title: 'Privacy Policy',
        description:
          'DestinyPal Privacy Policy on data collection, processing, security safeguards, cookies, and user rights.',
        keywords: ['privacy policy', 'destinypal privacy', 'data protection', 'cookie policy'],
      },
      ko: {
        title: '개인정보 처리방침',
        description:
          'DestinyPal 개인정보 처리방침. 데이터 수집, 처리, 보안 조치, 쿠키, 이용자 권리를 안내합니다.',
        keywords: ['개인정보 처리방침', '개인정보 보호', '디스티니팔 개인정보', '쿠키 정책'],
      },
      canonicalUrl: `${baseUrl}/policy/privacy`,
      ogImage: '/og-image.png',
    },
    locale,
  )
}

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Privacy Policy - DestinyPal',
    description:
      'DestinyPal Privacy Policy covering personal data use, retention, cookies, and privacy rights.',
    url: `${baseUrl}/policy/privacy`,
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  )
}
