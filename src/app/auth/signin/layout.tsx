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
          title: 'Sign in to DestinyPal',
          description:
            'Sign in to DestinyPal to save your saju, tarot, and astrology readings and pick up where you left off.',
          keywords: ['destinypal sign in', 'login', 'google login', 'saju account'],
        },
        ko: {
          title: 'DestinyPal 로그인',
          description:
            'DestinyPal에 로그인해 사주·타로·점성 결과를 저장하고 이전 대화를 이어가세요.',
          keywords: ['로그인', '디스티니팔 로그인', '구글 로그인', '사주 계정'],
        },
        canonicalUrl: `${baseUrl}/auth/signin`,
      },
      locale,
    ),
    // 로그인 화면은 검색 결과에 띄울 가치가 없음 + 가짜 로그인 페이지 phishing 방지.
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    },
  }
}

export default function SignInLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
