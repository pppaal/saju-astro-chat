/* ============================================================
   /destiny — 인생 흐름 (인생 · 10년 · 1년)
   ───────────────────────────────────────────────────────────
   운흐름 캘린더(/calendar, 월/일)와 분리된 "인생 스케일" surface.
   세션·본명 가드 + tier 어셈블은 loadTierData('year') 로 캘린더와 공유
   (1년 풀빌드 — 연/대운 티어가 필요로 함). 같은 줌 셸을 인생·10년·1년
   부분집합으로 재사용한다.
   ============================================================ */

import BirthRequiredFallback from '../calendar/birth-required'
import { loadTierData } from '../calendar/loadTierData'
import DestinyLifeClient from './DestinyLifeClient'

// 서버 컴포넌트 — 세션 기반이라 force-dynamic.
export const dynamic = 'force-dynamic'

export default async function DestinyLifePage() {
  // 인생/대운/년은 1년 풀빌드가 필요하다.
  const data = await loadTierData('year')
  if (data.kind === 'login') return <BirthRequiredFallback reason="login" />
  if (data.kind === 'no-birth') return <BirthRequiredFallback reason="no-birth" />

  const { topbar, user, lifetime, decade, year } = data
  return (
    <DestinyLifeClient
      topbar={topbar}
      user={user}
      lifetime={lifetime}
      decade={decade}
      year={year}
    />
  )
}
