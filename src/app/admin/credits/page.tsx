import { Suspense } from 'react'
import CreditsClient from './CreditsClient'

// 크레딧 관리 — 지급(충전)과 환불을 한 페이지 탭으로. 인증 가드는 layout.tsx 공통.
export const dynamic = 'force-dynamic'

export default function AdminCreditsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-stone-500">불러오는 중…</div>}>
      <CreditsClient />
    </Suspense>
  )
}
