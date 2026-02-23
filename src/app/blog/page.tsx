import { Metadata } from 'next'
import BlogClient from './BlogClient'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata: Metadata = {
  title: 'Blog - Insights on Astrology, Saju, Tarot & More',
  description:
    'Explore articles on Eastern and Western divination systems including Saju, Astrology, Tarot, I Ching, and Dream interpretation.',
  keywords: [
    'astrology blog',
    'saju articles',
    'tarot guide',
    'fortune telling',
    'divination',
    'i ching',
    'dream interpretation',
    'destiny',
    'horoscope',
  ],
  openGraph: {
    title: 'DestinyPal Blog - Insights & Guides',
    description: 'Explore the wisdom of Eastern and Western divination systems',
    type: 'website',
    locale: 'ko_KR',
    alternateLocale: ['en_US'],
    url: `${baseUrl}/blog`,
    siteName: 'DestinyPal',
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'DestinyPal Blog - Insights & Guides',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DestinyPal Blog',
    description: 'Explore the wisdom of Eastern and Western divination systems',
    images: [`${baseUrl}/og-image.png`],
  },
  alternates: {
    canonical: `${baseUrl}/blog`,
    languages: {
      'ko-KR': `${baseUrl}/blog`,
      'en-US': `${baseUrl}/blog`,
      'x-default': `${baseUrl}/blog`,
    },
  },
}

export default function BlogPage() {
  return <BlogClient />
}
