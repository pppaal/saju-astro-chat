'use client'

/* ============================================================
   /destiny — 인생 흐름 client wrapper.
   서버(loadTierData)에서 빌드한 tier 데이터 중 인생·10년·1년만 골라
   기존 줌 셸로 렌더한다. 월/일은 운흐름 캘린더(/calendar)가 담당 —
   1년에서 더 좁히면(YearTier dive) 캘린더로 건너간다.
   ============================================================ */

import { useRouter } from 'next/navigation'
import { DestinypalShell } from '@/components/calendar/shell'
import { LifetimeTier } from '@/components/calendar/tiers/LifetimeTier'
import { DecadeTier } from '@/components/calendar/tiers/DecadeTier'
import { YearTier } from '@/components/calendar/tiers/YearTier'

import type {
  DestinyUserSummary,
  DestinyLifetime,
  DestinyDecade,
  DestinyYear,
} from '@/types/calendar'

export interface DestinyLifeClientProps {
  topbar: { whoBirthLine: string; place: string; ilganHanja: string }
  user: DestinyUserSummary & { gyeokgukStatus?: string; rootStatus?: string }
  lifetime: DestinyLifetime
  decade: DestinyDecade & { geokgukStatus?: string }
  year: DestinyYear
}

export default function DestinyLifeClient({
  topbar,
  user,
  lifetime,
  decade,
  year,
}: DestinyLifeClientProps) {
  const router = useRouter()
  return (
    <DestinypalShell
      topbar={topbar}
      tierIds={['life', 'decade', 'year']}
      storageKey="dp_tier_life"
      // 현재 대운(10년)으로 착지 — 위로 인생 전체, 아래로 올해.
      initialTier={1}
      renderLife={({ onDive }) => <LifetimeTier user={user} lifetime={lifetime} onDive={onDive} />}
      renderDecade={({ onRise, onDive }) => (
        <DecadeTier user={user} decade={decade} onRise={onRise} onDive={onDive} />
      )}
      renderYear={({ onRise }) => (
        // 1년에서 더 좁히면 일·월 운흐름 캘린더로 건너간다(두 surface 를 잇는다).
        <YearTier user={user} year={year} onRise={onRise} onDive={() => router.push('/calendar')} />
      )}
    />
  )
}
