import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateMetadata } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata = generateMetadata({
  title: 'Interpersonal Style Assessment',
  description:
    'Understand how you relate, respond, and negotiate with others through an AI-assisted interpersonal style assessment based on the ICP model.',
  keywords: [
    'interpersonal style assessment',
    'icp assessment',
    'relationship style',
    'communication pattern',
    'interpersonal circumplex',
  ],
  canonicalUrl: `${baseUrl}/icp`,
  ogImage: '/og-image.png',
})

export default function ICPLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Interpersonal Style Assessment - DestinyPal',
    description:
      'Understand how you relate, respond, and negotiate with others through an AI-assisted interpersonal style assessment based on the ICP model.',
    url: `${baseUrl}/icp`,
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  )
}
