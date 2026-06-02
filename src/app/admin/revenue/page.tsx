import RevenueClient from './RevenueClient'

// 매출 · 크레딧 경제. 인증 가드는 layout.tsx 공통.
export const dynamic = 'force-dynamic'

export default function AdminRevenuePage() {
  return <RevenueClient />
}
