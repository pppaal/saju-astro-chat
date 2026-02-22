import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Premium AI Report | DestinyPal',
  description: 'Premium AI report center for timing, themed, and comprehensive insights.',
  alternates: {
    canonical: '/premium-reports',
  },
}

export default function ReportPage() {
  redirect('/premium-reports')
}
