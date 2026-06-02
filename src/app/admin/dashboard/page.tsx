import ServicesClient from './ServicesClient'

// 상세 지표 — 서비스 3개(사주·궁합·타로) 중심 재구성.
// 인증 가드는 /admin/layout.tsx 에서 공통 처리.
export const dynamic = 'force-dynamic'

export default function AdminDashboardPage() {
  return <ServicesClient />
}
