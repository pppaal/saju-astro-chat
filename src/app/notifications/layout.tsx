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
          title: 'Notifications',
          description: 'Your DestinyPal notifications — reading updates, replies, and reminders.',
        },
        ko: {
          title: '알림',
          description: 'DestinyPal 알림 — 운세 업데이트, 답변, 리마인더를 한곳에서.',
        },
        canonicalUrl: `${baseUrl}/notifications`,
      },
      locale,
    ),
    // 로그인 사용자 전용 화면 — 검색 인덱스 제외.
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

export default function NotificationsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
