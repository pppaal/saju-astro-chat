import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'DestinyPal Features — Destiny Counselor, Tarot, Calendar & Compatibility',
        description:
          'Explore the core DestinyPal experiences and how the Destiny Counselor, AI Tarot, Calendar, and Compatibility Counselor work together for AI Saju and astrology guidance.',
        keywords: [
          'destinypal features',
          'destiny counselor',
          'ai tarot',
          'fortune calendar',
          'compatibility counselor',
          'saju features',
          'astrology features',
        ],
      },
      ko: {
        title: 'DestinyPal 기능 — 운명 상담사, 타로, 캘린더, 궁합',
        description:
          'DestinyPal의 핵심 경험을 소개합니다. 운명 상담사, AI 타로, 캘린더, 궁합 상담사가 어떻게 연결되는지 확인하세요.',
        keywords: [
          'DestinyPal 기능',
          '운명 상담사',
          'AI 타로',
          '캘린더',
          '궁합 상담사',
          '사주 기능',
        ],
      },
      canonicalUrl: `${baseUrl}/about/features`,
      ogImage: '/og-image.png',
    },
    locale,
  )
}

export default function AboutFeaturesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
