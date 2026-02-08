import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateMetadata } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata = generateMetadata({
  title: 'About DestinyPal',
  description:
    'Diagnose with Fate, Analyze with Psychology, Heal with Spirituality. AI-powered self-understanding platform integrating Eastern & Western wisdom.',
  keywords: [
    'about destinypal',
    'ai fortune telling',
    'spiritual platform',
    'saju',
    'astrology',
    'tarot',
  ],
  canonicalUrl: `${baseUrl}/about`,
  ogImage: '/og-image.png',
})

export default function AboutLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'About DestinyPal',
    description:
      'Diagnose with Fate, Analyze with Psychology, Heal with Spirituality. AI-powered self-understanding platform.',
    url: `${baseUrl}/about`,
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  )
}
