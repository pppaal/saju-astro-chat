import type { ReactNode } from 'react'
import { generateMetadata } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata = generateMetadata({
  title: 'DestinyPal Features',
  description:
    'Explore the four core DestinyPal experiences and how Destiny Map, Tarot, Calendar, and Reports work together.',
  keywords: ['destinypal features', 'destiny map', 'tarot', 'calendar', 'premium reports'],
  canonicalUrl: `${baseUrl}/about/features`,
  ogImage: '/og-image.png',
})

export default function AboutFeaturesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
