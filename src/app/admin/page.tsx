import AdminOverviewClient from './AdminOverviewClient'

// /admin 루트 — 어드민 개요. 인증 가드·셸은 layout.tsx 에서 공통 처리.
// (이전엔 이 page 가 없어 /admin 진입 시 404 가 났다.)
export const dynamic = 'force-dynamic'

export default function AdminHomePage() {
  return <AdminOverviewClient />
}
