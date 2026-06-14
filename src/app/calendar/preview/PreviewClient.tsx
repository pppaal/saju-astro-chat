'use client'

/* ============================================================
   destinypal/preview — client wrapper.
   서버에서 빌드한 4 tier 데이터를 받아 Shell + Tiers render-prop 와
   결합. Shell 자체가 'use client' 라 render-prop 도 같이 클라이언트
   에서 만들어야 한다 (RSC 가 함수 prop 직렬화 불가).
   ============================================================ */

import { DestinypalShell } from '@/components/calendar/shell'
import { LifetimeTier } from '@/components/calendar/tiers/LifetimeTier'
import { DecadeTier } from '@/components/calendar/tiers/DecadeTier'
import { YearTier } from '@/components/calendar/tiers/YearTier'
import { MonthTier } from '@/components/calendar/tiers/MonthTier'
import { DayTier } from '@/components/calendar/tiers/DayTier'

import type {
  DestinyUserSummary,
  DestinyLifetime,
  DestinyDecade,
  DestinyYear,
  DestinyMonth,
  DestinyDay,
} from '@/types/calendar'

export interface PreviewClientProps {
  topbar: {
    whoBirthLine: string
    place: string
    ilganHanja: string
  }
  user: DestinyUserSummary & { gyeokgukStatus?: string; rootStatus?: string }
  lifetime: DestinyLifetime
  decade: DestinyDecade & {
    crossActivations?: Array<{
      signalId: string
      name: string
      sajuLine?: string
      astroLine?: string
      polarity: number
      meaning?: string
    }>
    geokgukStatus?: string
  }
  year: DestinyYear
  month: DestinyMonth
  day: DestinyDay
}

export default function PreviewClient({
  topbar,
  user,
  lifetime,
  decade,
  year,
  month,
  day,
}: PreviewClientProps) {
  return (
    <DestinypalShell
      topbar={topbar}
      renderLife={({ onDive }) => <LifetimeTier user={user} lifetime={lifetime} onDive={onDive} />}
      renderDecade={({ onRise, onDive }) => (
        <DecadeTier user={user} decade={decade} onRise={onRise} onDive={onDive} />
      )}
      renderYear={({ onRise, onDive }) => (
        <YearTier user={user} year={year} onRise={onRise} onDive={onDive} />
      )}
      renderMonth={({ onRise, onFocusDay, canRise }) => (
        <MonthTier month={month} onRise={onRise} onDive={() => onFocusDay()} showRise={canRise} />
      )}
      renderDay={({ onRise }) => <DayTier day={day} onRise={onRise} sex={user.sex} />}
    />
  )
}
