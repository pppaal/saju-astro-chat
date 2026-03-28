'use client'

import dynamic from 'next/dynamic'

import PageLoading from '@/components/ui/PageLoading'

const TarotHistoryClient = dynamic(() => import('./TarotHistoryClient'), {
  ssr: false,
  loading: () => <PageLoading variant="card" />,
})

export default function TarotHistoryPage() {
  return <TarotHistoryClient />
}
