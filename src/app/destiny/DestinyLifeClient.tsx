'use client'

/* ============================================================
   /destiny — 인생 흐름 client wrapper.
   서버(loadLifetimeData — 연 셀 없는 경량 로더)가 빌드한 인생 티어만 렌더한다.
   올해(세운)·월/일은 운흐름 캘린더(/calendar)가 담당 — 인생에서 더 좁히면
   캘린더로 건너간다(YearTier 는 연 풀빌드가 필요해 이 화면에서 제거하고,
   "올해 미리보기"는 캘린더 쪽으로 옮기는 중 — 감사 리팩터 ③).
   ============================================================ */

import { useRouter } from 'next/navigation'
import { DestinypalShell } from '@/components/calendar/shell'
import { LifetimeTier } from '@/components/calendar/tiers/LifetimeTier'

import type { DestinyUserSummary, DestinyLifetime } from '@/types/calendar'

export interface DestinyLifeClientProps {
  topbar: { whoBirthLine: string; place: string; ilganHanja: string }
  user: DestinyUserSummary & { gyeokgukStatus?: string; rootStatus?: string }
  lifetime: DestinyLifetime
}

export default function DestinyLifeClient({ topbar, user, lifetime }: DestinyLifeClientProps) {
  const router = useRouter()
  return (
    <DestinypalShell
      topbar={topbar}
      tierIds={['life']}
      storageKey="dp_tier_life"
      initialTier={0}
      // 인생에서 좁히면(다이브) 올해·월·일을 담당하는 캘린더로 건너간다.
      renderLife={() => (
        <LifetimeTier user={user} lifetime={lifetime} onDive={() => router.push('/calendar')} />
      )}
    />
  )
}
