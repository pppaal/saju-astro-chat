import FreeFunnelClient from './FreeFunnelClient'

// 무료 퍼널 (소셜 랜딩 /free → 무료 도구 → 상담사). 인증 가드는 layout.tsx 공통.
export const dynamic = 'force-dynamic'

export default function AdminFreeFunnelPage() {
  return <FreeFunnelClient />
}
