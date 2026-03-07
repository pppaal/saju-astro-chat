import type { ReactNode } from 'react'
import { generateMetadata } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata = generateMetadata({
  title: 'Destiny Fusion Matrix',
  description:
    'Learn how the Destiny Fusion Matrix connects Saju, astrology, timing, and pattern analysis into one decision framework.',
  keywords: [
    'destiny fusion matrix',
    'destiny matrix',
    'saju astrology integration',
    'timing analysis',
  ],
  canonicalUrl: `${baseUrl}/about/matrix`,
  ogImage: '/og-image.png',
})

export default function AboutMatrixLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
