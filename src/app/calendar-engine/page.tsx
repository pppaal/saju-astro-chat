import type { Metadata } from 'next'
import CalendarEngineClient from './CalendarEngineClient'

export const metadata: Metadata = {
  title: 'Signal Calendar (v2 Preview) | DestinyPal',
  description:
    'Signal-based calendar preview powered by the new active-signal engine — saju + astrology activations across decadal / yearly / monthly / daily layers.',
  robots: { index: false, follow: false },   // 프리뷰 라우트 검색 차단
}

export default function CalendarEnginePreviewPage() {
  return <CalendarEngineClient />
}
