import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateMetadata } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata = generateMetadata({
  title: 'Personality Test',
  description:
    'Map your core personality pattern with an AI-assisted assessment focused on decision style, pressure response, and practical self-understanding.',
  keywords: [
    'personality test',
    'personality type',
    'decision style',
    'self understanding',
    'behavior pattern',
    'personality assessment',
  ],
  canonicalUrl: `${baseUrl}/personality`,
  ogImage: '/og-image.png',
})

export default function PersonalityLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Personality Test - DestinyPal',
    description:
      'Map your core personality pattern with an AI-assisted assessment focused on decision style, pressure response, and practical self-understanding.',
    url: `${baseUrl}/personality`,
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  )
}
