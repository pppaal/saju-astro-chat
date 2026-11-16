/* ============================================================
   /destiny/* — 라우트 전용 layout.
   인생 흐름 surface 는 캘린더와 같은 destinypal 줌 셸/티어(hanji·먹 톤)
   를 재사용하므로, 폰트 4종(Newsreader / Gowun Batang / Gowun Dodum /
   IBM Plex Mono)을 동일하게 주입한다 — /calendar/DestinypalFontsShell 을
   그대로 감싼다(폰트만; /calendar 의 metadata·JSON-LD 는 섞이지 않는다).

   SEO: 자기 canonical/hreflang(en ↔ /ko) + WebPage JSON-LD 를 낸다.
   ============================================================ */

import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import DestinypalFontsShell from '../calendar/DestinypalFontsShell'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'Life Curve — Your Life Flow and One of 8 Life Types, From Your Birth Chart',
        description:
          'A free lifetime view of your rises and dips from birth to now, computed from your birth chart and Korean Four Pillars luck cycles, plus which of 8 life types fits you and why.',
        keywords: [
          'life curve',
          'life path chart',
          'luck cycles',
          'life flow astrology',
          'four pillars luck cycle',
          'daewun',
          'life type',
          'lifetime astrology chart',
        ],
      },
      ko: {
        title: '인생 흐름 — 대운으로 보는 인생 곡선과 8가지 인생유형',
        description:
          '태어나서 지금까지 오를 때와 눌릴 때를 한 곡선으로. 사주 대운과 출생 별자리로 계산한 인생 흐름과 내 인생유형(8가지)을 무료로 확인하세요.',
        keywords: ['인생 흐름', '대운', '인생 곡선', '인생유형', '사주 대운', '평생 운세'],
      },
      canonicalUrl: `${baseUrl}/destiny`,
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

export default function DestinyLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Life Curve',
    description:
      'A lifetime view of your rises and dips computed from your birth chart and Korean Four Pillars luck cycles, with one of 8 life types.',
    url: `${baseUrl}/destiny`,
  })

  return (
    <DestinypalFontsShell>
      <JsonLd data={pageJsonLd} />
      {children}
    </DestinypalFontsShell>
  )
}
