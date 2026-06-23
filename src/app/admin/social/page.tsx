import SocialClient from './SocialClient'

// Threads 자동게시 — 미리보기/수동 게시. 인증 가드는 layout.tsx 공통.
export const dynamic = 'force-dynamic'

export default function AdminSocialPage() {
  return <SocialClient />
}
