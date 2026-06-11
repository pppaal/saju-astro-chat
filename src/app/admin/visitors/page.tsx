import VisitorsClient from './VisitorsClient'

// 방문자 (비로그인 포함 트래픽). 인증 가드는 layout.tsx 공통.
export const dynamic = 'force-dynamic'

export default function AdminVisitorsPage() {
  return <VisitorsClient />
}
