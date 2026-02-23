import type { ReactNode } from 'react'
import { generateMetadata } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata = generateMetadata({
  title: 'Premium AI Report',
  description: 'Premium AI report center for timing, themed, and comprehensive insights.',
  keywords: [
    'premium report',
    'ai report',
    'destiny matrix report',
    'timing report',
    'themed report',
    'comprehensive report',
  ],
  canonicalUrl: `${baseUrl}/premium-reports`,
  ogImage: '/og-image.png',
})

export default function PremiumReportsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
