import { Metadata } from 'next'
import DestinyCalendar from '@/components/calendar/DestinyCalendar'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata: Metadata = {
  title: 'Destiny Calendar',
  description:
    'Plan important dates with AI-powered timing insights from Saju and Astrology, including strong windows, caution windows, and daily action guidance.',
  openGraph: {
    title: 'Destiny Calendar | DestinyPal',
    description:
      'Plan important dates with AI-powered timing insights from Saju and Astrology, including strong windows, caution windows, and daily action guidance.',
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
        alt: 'Destiny Calendar | DestinyPal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Destiny Calendar | DestinyPal',
    description:
      'Plan important dates with AI-powered timing insights from Saju and Astrology, including strong windows, caution windows, and daily action guidance.',
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
