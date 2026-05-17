import type { Metadata } from 'next'
import DestinyMapPageClient from '@/app/destiny-map/DestinyMapPageClient'
import { getServerI18n } from '@/i18n/server'
import { generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'Destiny Counselor — AI Saju & Astrology Chat',
        description:
          'Chat with an AI destiny counselor that reads your Saju (Four Pillars) and natal astrology together. Get grounded answers to career, relationship, and timing questions.',
        keywords: [
          'ai destiny counselor',
          'ai life counselor',
          'saju chat',
          'astrology chat',
          'ai fortune teller',
          'birth chart counsel',
          'life guidance chat',
        ],
      },
      ko: {
        title: '운명 상담사 — AI 사주·점성 채팅',
        description:
          '사주와 점성을 한 흐름으로 읽어주는 AI 운명 상담사. 직장, 관계, 시기에 대한 질문에 데이터 기반으로 답해드려요.',
        keywords: [
          '운명 상담',
          'AI 사주 상담',
          'AI 점성 상담',
          '사주 채팅',
          'AI 운명 상담사',
        ],
      },
      canonicalUrl: `${baseUrl}/destiny-counselor`,
      ogImage: '/og-image.png',
    },
    locale,
  )
}

export default async function DestinyCounselorPage() {
  const { locale, messages } = await getServerI18n()
  return <DestinyMapPageClient initialLocale={locale} initialMessages={messages} />
}
