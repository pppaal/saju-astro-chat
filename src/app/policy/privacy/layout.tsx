import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateMetadata } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata = generateMetadata({
  title: 'Privacy Policy',
  description:
    'Read DestinyPal Privacy Policy on data collection, processing, security safeguards, cookies, and user rights.',
  keywords: ['privacy policy', 'destinypal privacy', 'data protection', 'cookies'],
  canonicalUrl: `${baseUrl}/policy/privacy`,
  ogImage: '/og-image.png',
})

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
