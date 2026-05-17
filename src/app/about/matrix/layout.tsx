import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'Destiny Fusion Matrix — Saju & Astrology Decision Framework',
        description:
          'Learn how the Destiny Fusion Matrix connects Saju (Four Pillars), Western astrology, timing analysis, and pattern recognition into one AI-powered decision framework.',
        keywords: [
          'destiny fusion matrix',
          'destiny matrix',
          'saju astrology integration',
          'timing analysis',
          'decision framework',
          'four pillars astrology',
          'pattern analysis',
        ],
      },
      ko: {
        title: '운명 융합 매트릭스 — 사주·점성 의사결정 프레임워크',
        description:
          '사주(사주팔자), 서양 점성, 시기 분석, 패턴 인식을 하나의 AI 의사결정 프레임워크로 연결하는 운명 융합 매트릭스를 소개합니다.',
        keywords: [
          '운명 융합 매트릭스',
          '운명 매트릭스',
          '사주 점성 통합',
          '시기 분석',
          '의사결정 프레임워크',
          '사주 분석',
        ],
      },
      canonicalUrl: `${baseUrl}/about/matrix`,
      ogImage: '/og-image.png',
    },
    locale,
  )
}

export default function AboutMatrixLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
