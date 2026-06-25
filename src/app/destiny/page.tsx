/* ============================================================
   /destiny — 인생 흐름 (인생 · 10년 · 1년)
   ───────────────────────────────────────────────────────────
   운흐름 캘린더(/calendar, 월/일)와 분리된 "인생 스케일" surface.
   세션·본명 가드 + tier 어셈블은 loadTierData('year') 로 캘린더와 공유
   (1년 풀빌드 — 연/대운 티어가 필요로 함). 같은 줌 셸을 인생·10년·1년
   부분집합으로 재사용한다.
   ============================================================ */

import BirthRequiredFallback from '../calendar/birth-required'
import BirthGate from '@/components/birth/BirthGate'
import { loadTierData, parseBirthOverride } from '../calendar/loadTierData'
import DestinyLifeClient from './DestinyLifeClient'
import CounselorCTA from '@/components/report/CounselorCTA'

// 서버 컴포넌트 — 세션/쿼리 기반이라 force-dynamic.
export const dynamic = 'force-dynamic'

type SP = Record<string, string | string[] | undefined>

export default async function DestinyLifePage({ searchParams }: { searchParams: Promise<SP> }) {
  // ?date=&time=&lat=&lng=&tz=&gender= 가 있으면 로그인 없이 그 사람 기준으로.
  const override = parseBirthOverride(await searchParams)
  // 인생/대운/년은 1년 풀빌드가 필요하다.
  const data = await loadTierData('year', override)
  if (data.kind === 'login') return <BirthRequiredFallback reason="login" />
  if (data.kind === 'no-birth') return <BirthRequiredFallback reason="no-birth" />
  if (data.kind === 'guest') return <BirthGate base="/destiny" locale={data.lang} />

  const { topbar, user, lifetime, decade, year, lang } = data
  return (
    <>
      <DestinyLifeClient
        topbar={topbar}
        user={user}
        lifetime={lifetime}
        decade={decade}
        year={year}
      />
      <CounselorCTA
        lang={lang}
        question={{
          ko: '제 인생 큰 흐름(대운)을 더 깊이 짚어주세요.',
          en: 'Walk me through my life’s larger flow and luck cycles.',
        }}
      />
    </>
  )
}
