import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateMetadata } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata = generateMetadata({
  title: 'Contact Us',
  description:
    "Get in touch with DestinyPal. We're here to help with any questions about our AI-powered spiritual guidance services.",
  keywords: ['contact destinypal', 'customer support', 'help', 'feedback', 'questions'],
  canonicalUrl: `${baseUrl}/contact`,
  ogImage: '/og-image.png',
})

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
