import { Metadata } from 'next'
import DestinyCalendar from '@/components/calendar/DestinyCalendar'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata: Metadata = {
  title: 'Fortune Calendar',
  description: 'Plan important dates with AI-powered timing insights from Saju and Astrology.',
  openGraph: {
    title: 'Fortune Calendar | DestinyPal',
    description: 'Plan important dates with AI-powered timing insights from Saju and Astrology.',
    type: 'website',
    locale: 'ko_KR',
    alternateLocale: ['en_US'],
    url: `${baseUrl}/calendar`,
    siteName: 'DestinyPal',
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Fortune Calendar | DestinyPal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fortune Calendar | DestinyPal',
    description: 'Plan important dates with AI-powered timing insights from Saju and Astrology.',
    images: [`${baseUrl}/og-image.png`],
  },
  alternates: {
    canonical: `${baseUrl}/calendar`,
    languages: {
      'ko-KR': `${baseUrl}/calendar`,
      'en-US': `${baseUrl}/calendar`,
      'x-default': `${baseUrl}/calendar`,
    },
  },
}

export default function CalendarPage() {
  // Force single unified calendar view only.
  return <DestinyCalendar />
}
