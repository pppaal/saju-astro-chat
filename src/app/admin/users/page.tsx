import UsersClient from './UsersClient'

// 유저 검색 + 드릴다운 — 인증 가드는 /admin/layout.tsx 에서 공통 처리.
export const dynamic = 'force-dynamic'

export default function AdminUsersPage() {
  return <UsersClient />
}
