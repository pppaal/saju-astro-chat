import type { ReactNode } from 'react'
import { generateMetadata } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata = generateMetadata({
  title: 'Destiny Map Counselor',
  description:
    '1:1 AI counselor chat with Saju + Astrology based destiny insights and action guidance.',
  keywords: [
    'destiny map counselor',
    'ai counselor',
    'saju counselor',
    'astrology counseling',
    'fortune counseling',
  ],
  canonicalUrl: `${baseUrl}/destiny-map/counselor`,
  ogImage: '/og-image.png',
})

export default function DestinyMapCounselorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
