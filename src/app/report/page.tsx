import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata: Metadata = {
  title: '무료 리포트',
  description:
    'AI 사주와 점성을 융합한 무료 리포트. 성격, 사랑, 커리어, 재물, 건강, 카르마, 인생 단계별 흐름을 한 페이지에서 확인하세요.',
  alternates: {
    canonical: `${baseUrl}/destiny-map/result`,
    languages: {
      'ko-KR': `${baseUrl}/destiny-map/result`,
      'en-US': `${baseUrl}/destiny-map/result`,
      'x-default': `${baseUrl}/destiny-map/result`,
    },
  },
}

export default function ReportPage() {
  redirect('/destiny-map/result')
}
