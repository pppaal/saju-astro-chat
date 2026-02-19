import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateMetadata } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata = generateMetadata({
  title: 'Refund and Payment Policy',
  description:
    'Read DestinyPal Refund and Payment Policy for credit packs, subscriptions, non-refundable AI readings, and exception handling.',
  keywords: ['refund policy', 'payment policy', 'destinypal refund', 'credits'],
  canonicalUrl: `${baseUrl}/policy/refund`,
  ogImage: '/og-image.png',
})

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
