import UsageClient from './UsageClient'

// 사용량 분석 — 인증 가드는 /admin/layout.tsx 에서 공통 처리.
export const dynamic = 'force-dynamic'

export default function UsagePage() {
  return <UsageClient />
}
