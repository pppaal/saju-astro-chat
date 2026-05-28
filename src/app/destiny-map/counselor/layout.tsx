import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'Destiny Counselor — 1:1 AI Saju & Astrology Chat',
        description:
          '1:1 AI counselor chat that reads your Saju (Four Pillars) and natal astrology together, with practical action guidance for life decisions.',
        keywords: [
          'destiny counselor',
          'ai counselor',
          'saju counselor',
          'astrology counseling',
          'ai fortune teller',
          'birth chart counsel',
          'life guidance chat',
        ],
      },
      ko: {
        title: '운명 상담사 — 1:1 AI 사주·점성 상담',
        description: '사주와 점성을 함께 풀어 실행 가능한 조언까지 제시하는 1:1 AI 운명 상담 채팅.',
        keywords: ['운명 상담', 'AI 상담', '사주 상담', '점성 상담', 'AI 운명 상담사', '운세 상담'],
      },
      canonicalUrl: `${baseUrl}/destiny-map/counselor`,
      ogImage: '/og-image.png',
    },
    locale
  )
}

export default function DestinyMapCounselorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
