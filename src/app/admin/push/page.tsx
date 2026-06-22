import { Suspense } from 'react'
import PushClient from './PushClient'

// 푸시 진단 — 알림이 안 올 때 원인(설정/구독/크론)을 좁히고 테스트 발송. 가드는 layout.tsx 공통.
export const dynamic = 'force-dynamic'

export default function AdminPushPage() {
  return (
    <Suspense
      fallback={<div className="p-10 text-center text-sm text-stone-500">불러오는 중…</div>}
    >
      <PushClient />
    </Suspense>
  )
}
