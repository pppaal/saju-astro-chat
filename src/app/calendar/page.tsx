/* ============================================================
   /calendar — Phase D 정식 라우트 (실 사용자 본명)
   ───────────────────────────────────────────────────────────
   세션·본명 가드 + NatalContext + cells + tier 어셈블은 loadTierData()
   로 공유한다. 이 라우트는 월/일 surface 만 렌더한다 — 인생 전체는
   /destiny 로 분리(10년·1년 티어는 제거됨).

   항상 '그 달'만 빌드한다(저비용).
   ============================================================ */

import PreviewClient from './preview/PreviewClient'
import BirthRequiredFallback from './birth-required'
import BirthGate from '@/components/birth/BirthGate'
import CounselorCTA from '@/components/report/CounselorCTA'
import DailyFortunePushBanner from '@/components/push/DailyFortunePushBanner'
import { loadTierData, parseBirthOverride } from './loadTierData'

// 서버 컴포넌트 — Swiss Ephemeris 비용 서버에서 한 번에 치름.
// 세션/쿼리 기반이므로 force-dynamic 필수 (정적 캐시 금지).
export const dynamic = 'force-dynamic'

type SP = Record<string, string | string[] | undefined>

export default async function DestinypalPage({ searchParams }: { searchParams: Promise<SP> }) {
  // ?date=&time=&lat=&lng=&tz=&gender= 가 있으면 로그인 없이 그 사람 기준으로.
  const override = parseBirthOverride(await searchParams)
  const data = await loadTierData(override)
  if (data.kind === 'login') return <BirthRequiredFallback reason="login" />
  if (data.kind === 'no-birth') return <BirthRequiredFallback reason="no-birth" />
  if (data.kind === 'rate-limited')
    return <BirthRequiredFallback reason="rate-limited" locale={data.lang} />
  if (data.kind === 'guest') return <BirthGate base="/calendar" locale={data.lang} />

  const { topbar, user, lifetime, month, day, lang } = data
  return (
    <>
      <PreviewClient topbar={topbar} user={user} lifetime={lifetime} month={month} day={day} />
      {/* 매일 아침 오늘의 운세 푸시 옵트인 — VAPID 미설정/미지원이면 스스로 숨음 */}
      <DailyFortunePushBanner locale={lang} />
      <CounselorCTA
        lang={lang}
        question={{
          ko: '이번 달 제 운 흐름을 더 자세히 봐주세요.',
          en: 'Help me read my fortune timing this month.',
        }}
      />
    </>
  )
}
