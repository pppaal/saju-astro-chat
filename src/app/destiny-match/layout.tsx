import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateMetadata } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata = generateMetadata({
  title: 'Destiny Match',
  description:
    'Find your cosmic connection with AI-powered matching based on Saju and astrology compatibility.',
  keywords: [
    'destiny match',
    'saju matching',
    'astrology compatibility',
    'cosmic connection',
    'relationship matching',
    'zodiac matching',
  ],
  canonicalUrl: `${baseUrl}/destiny-match`,
  ogImage: '/og-image.png',
})

export default function DestinyMatchLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Destiny Match',
    description:
      'Find your cosmic connection with AI-powered matching based on Saju and astrology compatibility.',
    url: `${baseUrl}/destiny-match`,
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  )
}
