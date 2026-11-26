/* ============================================================
   /calendar — v9.2 운세 달력(실 사용자 본명)
   ───────────────────────────────────────────────────────────
   세션·본명 가드 + NatalContext + cells + tier 어셈블은 loadTierData()
   로 공유한다. 이 라우트는 월간 · 일간 두 탭을 한 종이 문서로 렌더한다 — 인생 전체는
   /destiny 로 분리. 항상 '그 달'만 빌드한다(저비용).

   뷰모델(buildMonthViewModel · buildDayViewModel)은 여기(서버)서 만든다 — 천체력 캐시·
   절기표를 끌고 오므로 클라이언트 번들에 넣지 않는다. 상담사 CTA 는 각 탭 흐름 안에 있고,
   아침 푸시 배너만 푸터 아래에 둔다(오너 결정).
   ============================================================ */

import CalendarClient from './CalendarClient'
import BirthRequiredFallback from './birth-required'
import BirthGate from '@/components/birth/BirthGate'
import DailyFortunePushBanner from '@/components/push/DailyFortunePushBanner'
import { loadTierData, parseBirthOverride } from './loadTierData'
import { buildMonthViewModel } from '@/lib/calendar-view/monthViewModel'
import { buildDayViewModel } from '@/lib/calendar-view/dayViewModel'
import { formatBirthStamp } from '@/lib/birth/format'
import { shareDomain } from '@/lib/share/site'
import { KO_TO_SAJU_ELEMENT } from '@/lib/saju/elementBridge'
import { getStemElement } from '@/lib/saju/stemBranchUtils'

// 서버 컴포넌트 — Swiss Ephemeris 비용 서버에서 한 번에 치름.
// 세션/쿼리 기반이므로 force-dynamic 필수 (정적 캐시 금지).
export const dynamic = 'force-dynamic'

type SP = Record<string, string | string[] | undefined>

export default async function DestinypalPage({ searchParams }: { searchParams: Promise<SP> }) {
  // ?date=&time=&lat=&lng=&tz=&gender= 가 있으면 로그인 없이 그 사람 기준으로.
  const override = parseBirthOverride(await searchParams)
  const data = await loadTierData(override)
  if (data.kind === 'no-birth') return <BirthRequiredFallback reason="no-birth" />
  if (data.kind === 'rate-limited')
    return <BirthRequiredFallback reason="rate-limited" locale={data.lang} />
  if (data.kind === 'guest') return <BirthGate base="/calendar" locale={data.lang} />

  const { topbar, user, month, day, lang, birthStamp } = data
  const monthVm = buildMonthViewModel(month, day, { lang, isMinor: !!day.isMinor })
  const dayVm = buildDayViewModel(day, { lang, sex: user.sex, isToday: true })
  const stem = user.ilgan?.hanja || topbar.ilganHanja
  const element = stem ? KO_TO_SAJU_ELEMENT[getStemElement(stem)] : undefined
  return (
    <>
      <CalendarClient
        locale={lang}
        monthVm={monthVm}
        dayVm={dayVm}
        chipStamp={formatBirthStamp(birthStamp, lang, { time: false })}
        folioStamp={formatBirthStamp(birthStamp, lang)}
        folioRight={shareDomain()}
        dayMaster={stem && element ? { stem, element } : undefined}
      />
      {/* 매일 아침 오늘의 운세 푸시 옵트인 — VAPID 미설정/미지원이면 스스로 숨음 */}
      <DailyFortunePushBanner locale={lang} />
    </>
  )
}
