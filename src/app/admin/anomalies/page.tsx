import AnomaliesClient from './AnomaliesClient'

// 이상징후 탐지 (과다 소비·과다 무료지급). 인증 가드는 layout.tsx 공통.
export const dynamic = 'force-dynamic'

export default function AdminAnomaliesPage() {
  return <AnomaliesClient />
}
