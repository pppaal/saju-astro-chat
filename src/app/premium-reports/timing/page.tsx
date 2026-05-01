'use client'

/**
 * Deprecated — Timing 리포트는 Themed 리포트의 시기 옵션 (yearly/monthly)으로
 * 흡수되었습니다. 기존 URL은 themed로 redirect.
 */

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import UnifiedServiceLoading from '@/components/ui/UnifiedServiceLoading'

function TimingRedirectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // period 매핑 — daily는 themed에 없으므로 monthly로 fallback
    const periodRaw = searchParams?.get('period') || 'yearly'
    const period = periodRaw === 'yearly' || periodRaw === 'monthly' ? periodRaw : 'monthly'
    const tier = searchParams?.get('tier') || 'premium'
    router.replace(`/premium-reports/themed?period=${period}&tier=${tier}`)
  }, [router, searchParams])

  return <UnifiedServiceLoading kind="aiReport" locale="ko" />
}

export default function TimingReportPage() {
  return (
    <Suspense fallback={<UnifiedServiceLoading kind="aiReport" locale="ko" />}>
      <TimingRedirectContent />
    </Suspense>
  )
}
