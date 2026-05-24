import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const meta = generateLocalizedMetadata(
    {
      en: {
        title: 'Interpersonal Style Assessment — AI ICP Test',
        description:
          'Understand how you relate, respond, and negotiate with others through an AI-assisted interpersonal style assessment based on the Interpersonal Circumplex (ICP) model.',
        keywords: [
          'interpersonal style assessment',
          'icp assessment',
          'interpersonal circumplex',
          'relationship style',
          'communication pattern',
          'ai personality test',
          'social style test',
        ],
      },
      ko: {
        title: '대인관계 스타일 진단 — AI ICP 테스트',
        description:
          '대인관계 원형(ICP) 모델을 기반으로 관계, 반응, 협상 스타일을 AI가 분석해주는 대인관계 스타일 진단.',
        keywords: [
          '대인관계 스타일',
          'ICP 진단',
          '대인관계 원형',
          '관계 스타일',
          '커뮤니케이션 패턴',
          'AI 성격 진단',
        ],
      },
      canonicalUrl: `${baseUrl}/icp`,
      ogImage: '/og-image.png',
    },
    locale,
  )
  // Retired from public navigation — keep the page for direct/deep links but
  // exclude it from search so the discontinued feature doesn't surface.
  return { ...meta, robots: { index: false, follow: false } }
}

export default function ICPLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Interpersonal Style Assessment - DestinyPal',
    description:
      'Understand how you relate, respond, and negotiate with others through an AI-assisted interpersonal style assessment based on the ICP model.',
    url: `${baseUrl}/icp`,
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  )
}
