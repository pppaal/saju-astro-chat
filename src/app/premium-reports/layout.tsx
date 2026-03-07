import type { ReactNode } from 'react'
import { generateMetadata } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata = generateMetadata({
  title: 'Premium Reports',
  description:
    'Enter your profile once, then unlock free insights or premium themed reports for life direction, yearly timing, love, career, wealth, health, and family.',
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
