import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'DestinyPal Features — Destiny Map, Tarot, Calendar & Reports',
        description:
          'Explore the four core DestinyPal experiences and how Destiny Map, AI Tarot, Cosmic Calendar, and Premium Reports work together for AI Saju and astrology guidance.',
        keywords: [
          'destinypal features',
          'destiny map',
          'ai tarot',
          'cosmic calendar',
          'premium reports',
          'saju features',
          'astrology features',
        ],
      },
      ko: {
        title: 'DestinyPal 기능 — 운명 지도, 타로, 캘린더, 리포트',
        description:
          'DestinyPal의 네 가지 핵심 경험을 소개합니다. 운명 지도, AI 타로, 코스믹 캘린더, 프리미엄 리포트가 어떻게 연결되는지 확인하세요.',
        keywords: [
          'DestinyPal 기능',
          '운명 지도',
          'AI 타로',
          '코스믹 캘린더',
          '프리미엄 리포트',
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
