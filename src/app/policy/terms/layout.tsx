import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateMetadata } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata = generateMetadata({
  title: 'Terms of Service',
  description:
    'Read DestinyPal Terms of Service covering eligibility, billing, credits, acceptable use, and legal terms.',
  keywords: ['terms of service', 'destinypal terms', 'legal', 'user agreement'],
  canonicalUrl: `${baseUrl}/policy/terms`,
  ogImage: '/og-image.png',
})

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
