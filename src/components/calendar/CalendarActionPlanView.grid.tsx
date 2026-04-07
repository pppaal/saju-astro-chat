'use client'

import React from 'react'

import type { ActionPlanInsights } from './CalendarActionPlanAI'
import { ActionPlanInsightsPanel, ActionPlanSummaryPanels } from './CalendarActionPlanPanels'
import { CalendarActionPlanTimelinePanel } from './CalendarActionPlanTimelinePanel'
import type { CalendarActionPlanGridProps } from './CalendarActionPlanView.sectionTypes'
import styles from './DestinyCalendar.module.css'

type GridProps = CalendarActionPlanGridProps & {
  actionPlanInsights: ActionPlanInsights
}

export function CalendarActionPlanGrid(props: GridProps) {
  const {
    isKo,
    intervalMinutes,
    onIntervalChange,
    onAiRefresh,
    aiDisabled,
    aiStatus,
    aiButtonLabel,
    aiStatusText,
    hourlyRhythm,
    activeRhythmHour,
    activeRhythmInfo,
    onRhythmSelect,
    timelineInsight,
    timelineHighlights,
    timelineSlots,
    formatWhyMetaLabel,
    formatConfidenceNote,
    onSlotRef,
    todayFocus,
    todayInsight,
    todayItems,
    engineCards,
    evidenceBadges,
    evidenceLines,
    todayTiming,
    todayCaution,
    weekTitle,
    weekFocus,
    weekInsight,
    weekItems,
    topCategory,
    categoryLabel,
    actionPlanInsights,
  } = props

  return (
    <div className={styles.actionPlanGrid}>
      <CalendarActionPlanTimelinePanel
        isKo={isKo}
        intervalMinutes={intervalMinutes}
        onIntervalChange={onIntervalChange}
        onAiRefresh={onAiRefresh}
        aiDisabled={aiDisabled}
        aiStatus={aiStatus}
        aiButtonLabel={aiButtonLabel}
        aiStatusText={aiStatusText || ''}
        hourlyRhythm={hourlyRhythm}
        activeRhythmHour={activeRhythmHour}
        activeRhythmInfo={activeRhythmInfo}
        onRhythmSelect={(hour) => onRhythmSelect(hour)}
        timelineInsight={timelineInsight}
        timelineHighlights={timelineHighlights}
        timelineSlots={timelineSlots}
        formatWhyMetaLabel={formatWhyMetaLabel}
        formatConfidenceNote={formatConfidenceNote}
        onSlotRef={onSlotRef}
        onSlotClick={(hour) => onRhythmSelect(hour)}
      />
      <ActionPlanSummaryPanels
        isKo={isKo}
        todayFocus={todayFocus || ''}
        todayInsight={todayInsight}
        todayItems={todayItems}
        engineCards={engineCards}
        evidenceBadges={evidenceBadges}
        evidenceLines={evidenceLines}
        todayTiming={todayTiming || ''}
        todayCaution={todayCaution || ''}
        weekTitle={weekTitle}
        weekFocus={weekFocus || ''}
        weekInsight={weekInsight}
        weekItems={weekItems}
        topCategory={topCategory}
        categoryLabel={categoryLabel}
      />
      <ActionPlanInsightsPanel isKo={isKo} actionPlanInsights={actionPlanInsights} />
    </div>
  )
}
