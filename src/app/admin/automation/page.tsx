import { Suspense } from 'react'
import AutomationClient from './AutomationClient'

// 자동화 상태 — 각 자동화가 지금 운영에서 켜졌는지 한 표로. 가드는 layout.tsx 공통.
export const dynamic = 'force-dynamic'

export default function AdminAutomationPage() {
  return (
    <Suspense
      fallback={<div className="p-10 text-center text-sm text-stone-500">불러오는 중…</div>}
    >
      <AutomationClient />
    </Suspense>
  )
}
