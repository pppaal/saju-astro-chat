import FunnelClient from './FunnelClient'

// 전환 퍼널 (가입→첫 리딩→첫 결제). 인증 가드는 layout.tsx 공통.
export const dynamic = 'force-dynamic'

export default function AdminFunnelPage() {
  return <FunnelClient />
}
