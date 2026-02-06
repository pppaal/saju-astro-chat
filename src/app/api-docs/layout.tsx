import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Documentation | Saju Astro Chat',
  description: 'Complete API documentation for Saju Astro Chat - Eastern and Western divination services including Saju, Astrology, Tarot, Dream Analysis, I Ching, and more.',
  openGraph: {
    title: 'Saju Astro Chat API Documentation',
    description: 'Comprehensive API for divination services',
  },
}

export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
