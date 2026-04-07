'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { ActionPlanInsights } from './CalendarActionPlanAI'
import type { EventCategory } from './types'

export type DayChip = { label: string; emoji: string }

export type HourlyRhythmItem = {
  hour: number
  tone: 'best' | 'caution' | 'neutral'
  note: string
}

export type TimelineSlotView = {
  hour: number
  minute: number
  label: string
  note: string
  tone: 'neutral' | 'best' | 'caution'
  badge: string | null
  slotTypes?: string[]
  whySummary?: string | null
  whySignalIds?: string[]
  whyAnchorIds?: string[]
  whyPatterns?: string[]
  guardrail?: string | null
  evidenceSummary?: string[]
  confidence?: number | null
  confidenceReason?: string[]
}

export type ActionPlanEngineCard = {
  key: 'action' | 'risk' | 'window' | 'agreement' | 'branch'
  label: string
  summary: string
  tag?: string
  details?: string[]
  visual?:
    | {
        kind: 'agreement'
        agreementPercent: number
        contradictionPercent: number
        leadLagState: 'structure-ahead' | 'trigger-ahead' | 'balanced'
      }
    | {
        kind: 'branch'
        rows: Array<{ label: string; text: string }>
      }
}

export type CalendarActionPlanHeaderProps = {
  isKo: boolean
  formatDateLabel: (date: Date) => string
  baseDate: Date
  baseInfo: { categories?: EventCategory[] } | null
  resolvedPeakLevel?: 'peak' | 'high' | 'normal' | null
  categoryLabel: (category: EventCategory) => string
  commitDate: (date: Date) => void
  inputDateValue: string
  rangeDays: 7 | 14
  setRangeDays: Dispatch<SetStateAction<7 | 14>>
  handleShare: () => void | Promise<void>
  handlePrint: () => void
  shareMessage: string | null
}

export type CalendarActionPlanChipsProps = {
  isKo: boolean
  bestDayChips: DayChip[]
  cautionDayChips: DayChip[]
}

export type CalendarActionPlanGridProps = {
  isKo: boolean
  intervalMinutes: 30 | 60
  onIntervalChange: Dispatch<SetStateAction<30 | 60>>
  onAiRefresh: () => void | Promise<void>
  aiDisabled: boolean
  aiStatus: string
  aiButtonLabel: string
  aiStatusText: string | null
  hourlyRhythm: HourlyRhythmItem[]
  activeRhythmHour: number | null
  activeRhythmInfo: HourlyRhythmItem | null
  onRhythmSelect: (hour: number | null) => void
  timelineInsight: string
  timelineHighlights: string[]
  timelineSlots: TimelineSlotView[]
  formatWhyMetaLabel: (slot: TimelineSlotView) => string | null
  formatConfidenceNote: (reasons?: string[]) => string
  onSlotRef: (key: string, node: HTMLDivElement | null) => void
  todayFocus: string | null
  todayInsight: string
  todayItems: string[]
  engineCards: ActionPlanEngineCard[]
  evidenceBadges: string[]
  evidenceLines: string[]
  todayTiming: string | null
  todayCaution: string | null
  weekTitle: string
  weekFocus: string | null
  weekInsight: string
  weekItems: string[]
  topCategory: EventCategory | null
  categoryLabel: (category: EventCategory) => string
  actionPlanInsights: ActionPlanInsights
}
