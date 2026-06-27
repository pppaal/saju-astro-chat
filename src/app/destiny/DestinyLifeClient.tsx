'use client'

/* ============================================================
   /destiny — 인생 흐름 client wrapper.
   서버(loadTierData)에서 빌드한 tier 데이터 중 *인생 전체·세운(1년)* 만 골라
   기존 줌 셸로 렌더한다. 10년(대운) 티어는 무료 화면이 너무 길어져 네비에서
   제외(데이터는 빌드되지만 세운 재중심 등 내부에서만 쓰임). 월/일은 운흐름
   캘린더(/calendar)가 담당 — 1년에서 더 좁히면(YearTier dive) 캘린더로 건너간다.
   ============================================================ */

import { useRouter } from 'next/navigation'
import { DestinypalShell } from '@/components/calendar/shell'
import { LifetimeTier } from '@/components/calendar/tiers/LifetimeTier'
import { YearTier } from '@/components/calendar/tiers/YearTier'

import type { DestinyUserSummary, DestinyLifetime, DestinyYear } from '@/types/calendar'

export interface DestinyLifeClientProps {
  topbar: { whoBirthLine: string; place: string; ilganHanja: string }
  user: DestinyUserSummary & { gyeokgukStatus?: string; rootStatus?: string }
  lifetime: DestinyLifetime
  year: DestinyYear
}

export default function DestinyLifeClient({
  topbar,
  user,
  lifetime,
  year,
}: DestinyLifeClientProps) {
  const router = useRouter()
  return (
    <DestinypalShell
      topbar={topbar}
      tierIds={['life', 'year']}
      storageKey="dp_tier_life"
      // 인생 전체로 착지 — 아래로 올해(세운).
      initialTier={0}
      renderLife={({ onDive }) => <LifetimeTier user={user} lifetime={lifetime} onDive={onDive} />}
      renderYear={({ onRise }) => (
        // 1년에서 더 좁히면 일·월 운흐름 캘린더로 건너간다(두 surface 를 잇는다).
        <YearTier user={user} year={year} onRise={onRise} onDive={() => router.push('/calendar')} />
      )}
    />
  )
}
