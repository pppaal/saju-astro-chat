import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return {
    ...generateLocalizedMetadata(
      {
        en: {
          title: 'Payment successful — credits on the way',
          description:
            'Your DestinyPal payment was confirmed. Credits are being added to your account.',
        },
        ko: {
          title: '결제 완료 — 크레딧 지급 중',
          description: 'DestinyPal 결제가 확인되었습니다. 크레딧을 계정에 지급 중이에요.',
        },
        canonicalUrl: `${baseUrl}/success`,
      },
      locale,
    ),
    // 결제 완료 페이지는 검색 인덱스 제외 — 개인 결제 후 화면.
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  }
}

export default function SuccessLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
