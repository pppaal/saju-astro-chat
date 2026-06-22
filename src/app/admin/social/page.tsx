import { Suspense } from 'react'
import SocialClient from './SocialClient'

// 소셜 자동화 — 매일 "오늘의 카드" 초안을 검토·편집·승인. 인증 가드는 layout.tsx 공통.
export const dynamic = 'force-dynamic'

export default function AdminSocialPage() {
  return (
    <Suspense
      fallback={<div className="p-10 text-center text-sm text-stone-500">불러오는 중…</div>}
    >
      <SocialClient />
    </Suspense>
  )
}
