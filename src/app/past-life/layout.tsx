import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Past Life Reading | DestinyPal',
  description: 'Discover your soul\'s journey through past lives and karmic patterns using Eastern Saju and Western Astrology.',
  openGraph: {
    title: 'Past Life Reading | DestinyPal',
    description: 'Discover your soul\'s journey through past lives and karmic patterns.',
    images: ['/og-past-life.png'],
  },
};

export default function PastLifeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
