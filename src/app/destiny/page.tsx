/* ============================================================
   /destiny — 인생 흐름 (인생 전체)
   ───────────────────────────────────────────────────────────
   운흐름 캘린더(/calendar, 월/일)와 분리된 "인생 스케일" surface.
   세션·본명 가드는 loadLifetimeData 로 캘린더와 규약을 공유하되, 빌드는
   연 cells 없는 경량 경로다 — 인생 티어는 natal + 인생곡선 + now 로 완결
   (감사: 연 풀빌드 ~8s 중 이 화면에 닿는 산출물이 없었다). 올해(세운)
   부터는 캘린더가 담당 — 인생에서 좁히면 /calendar 로 건너간다.
   ============================================================ */

import BirthRequiredFallback from '../calendar/birth-required'
import BirthGate from '@/components/birth/BirthGate'
import { loadLifetimeData, parseBirthOverride } from '../calendar/loadTierData'
import DestinyLifeClient from './DestinyLifeClient'
import CounselorCTA from '@/components/report/CounselorCTA'

// 서버 컴포넌트 — 세션/쿼리 기반이라 force-dynamic.
export const dynamic = 'force-dynamic'

type SP = Record<string, string | string[] | undefined>

export default async function DestinyLifePage({ searchParams }: { searchParams: Promise<SP> }) {
  // ?date=&time=&lat=&lng=&tz=&gender= 가 있으면 로그인 없이 그 사람 기준으로.
  const override = parseBirthOverride(await searchParams)
  const data = await loadLifetimeData(override)
  if (data.kind === 'login') return <BirthRequiredFallback reason="login" />
  if (data.kind === 'no-birth') return <BirthRequiredFallback reason="no-birth" />
  if (data.kind === 'rate-limited')
    return <BirthRequiredFallback reason="rate-limited" locale={data.lang} />
  if (data.kind === 'guest') return <BirthGate base="/destiny" locale={data.lang} />

  const { topbar, user, lifetime, lang } = data
  return (
    <>
      <DestinyLifeClient topbar={topbar} user={user} lifetime={lifetime} />
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
