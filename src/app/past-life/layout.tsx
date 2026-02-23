import { Metadata } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com';

export const metadata: Metadata = {
  title: 'Past Life Reading',
  description: 'Discover your soul\'s journey through past lives and karmic patterns using Eastern Saju and Western Astrology.',
  openGraph: {
    title: 'Past Life Reading | DestinyPal',
    description: 'Discover your soul\'s journey through past lives and karmic patterns.',
    locale: 'ko_KR',
    alternateLocale: ['en_US'],
    url: `${baseUrl}/past-life`,
    images: ['/og-past-life.png'],
  },
  alternates: {
    canonical: `${baseUrl}/past-life`,
    languages: {
      'ko-KR': `${baseUrl}/past-life`,
      'en-US': `${baseUrl}/past-life`,
      'x-default': `${baseUrl}/past-life`,
    },
  },
};

export default function PastLifeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
