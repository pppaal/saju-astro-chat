'use client'

import dynamic from 'next/dynamic'

import BrandSplash from '@/components/branding/BrandSplash'

const TarotHistoryClient = dynamic(() => import('./TarotHistoryClient'), {
  ssr: false,
  loading: () => <BrandSplash />,
})

export default function TarotHistoryPage() {
  return <TarotHistoryClient />
}
