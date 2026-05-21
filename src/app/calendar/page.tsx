import { Metadata } from 'next'
import DestinyMatrixPlannerClient from '@/components/calendar/DestinyMatrixPlannerClient'
import { generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'Destiny Calendar — AI Saju & Astrology Timing',
        description:
          'Plan important dates with AI-powered timing insights from Saju and natal astrology — strong windows, caution windows, and daily action guidance.',
        keywords: [
          'destiny calendar',
          'fortune calendar',
          'auspicious date',
          'electional astrology',
          'saju timing',
          'best day to start',
          'lucky day calculator',
        ],
      },
      ko: {
        title: '데스티니 캘린더 — AI 사주·점성 타이밍',
        description:
          '사주와 점성술을 AI가 통합해 중요한 날을 잡아드립니다. 길일·주의일·시간대별 액션 가이드까지 한눈에.',
        keywords: [
          '운세 캘린더',
          '길일',
          '택일',
          '사주 길일',
          '오늘의 운세',
          '시간대별 운세',
        ],
      },
      canonicalUrl: `${baseUrl}/calendar`,
    },
    locale,
  )
}

export default async function CalendarPage() {
  // The planner is a full-screen client app that renders no heading of its own,
  // leaving the page with no h1 (an a11y/SEO gap, and a public-smoke failure).
  // Provide an accessible page title without altering the visual layout.
  const locale = await getServerLocale()
  const heading = locale === 'ko' ? '데스티니 캘린더' : 'Destiny Calendar'
  return (
    <>
      <h1 className="sr-only">{heading}</h1>
      <DestinyMatrixPlannerClient />
    </>
  )
}
