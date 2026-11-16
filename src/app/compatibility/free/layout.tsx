/* ============================================================
   /compatibility/free — 라우트 전용 layout (SEO metadata).
   page.tsx 는 'use client' 라 metadata 를 낼 수 없고, 부모 /compatibility/layout
   의 canonical(/compatibility) 을 상속하면 무료 궁합이 유료 허브의 복제로 취급된다.
   여기서 자기 canonical/hreflang(en ↔ /ko) + WebPage JSON-LD 를 낸다.
   ============================================================ */

import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'Free Compatibility Report — Two Birth Dates, No Login',
        description:
          'Enter two birth dates for a free compatibility report: a score with a breakdown, where you click and where you rub, from Western synastry and Korean Four Pillars read together. Works for partners, friends and colleagues.',
        keywords: [
          'free compatibility report',
          'compatibility by birth date',
          'birth date compatibility',
          'relationship compatibility test',
          'synastry report free',
          'love compatibility calculator',
        ],
      },
      ko: {
        title: '무료 궁합 — 두 사람 생년월일로 바로 보는 궁합 리포트',
        description:
          '두 사람의 생년월일만 넣으면 로그인 없이 궁합 점수와 세부 분석을 바로. 사주와 서양 점성 시너스트리를 함께 읽어 잘 맞는 지점과 부딪히는 지점을 보여드립니다.',
        keywords: [
          '무료 궁합',
          '생년월일 궁합',
          '궁합 테스트',
          '사주 궁합',
          '별자리 궁합',
          '연애 궁합',
        ],
      },
      canonicalUrl: `${baseUrl}/compatibility/free`,
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

export default function FreeCompatibilityLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Free Compatibility Report',
    description:
      'A free compatibility report for two birth dates, from Western synastry and Korean Four Pillars read together.',
    url: `${baseUrl}/compatibility/free`,
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  )
}
