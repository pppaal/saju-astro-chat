import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata: Metadata = {
  title: 'Premium AI Report',
  description: 'Premium AI report center for timing, themed, and comprehensive insights.',
  alternates: {
    canonical: `${baseUrl}/premium-reports`,
    languages: {
      'ko-KR': `${baseUrl}/premium-reports`,
      'en-US': `${baseUrl}/premium-reports`,
      'x-default': `${baseUrl}/premium-reports`,
    },
  },
}

export default function ReportPage() {
  redirect('/premium-reports')
}
