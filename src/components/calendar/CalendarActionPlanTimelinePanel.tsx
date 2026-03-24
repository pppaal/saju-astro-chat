import styles from './DestinyCalendar.module.css'

type RhythmTone = 'best' | 'caution' | 'neutral'

type HourlyRhythmItem = {
  hour: number
  tone: RhythmTone
  note: string
}

type TimelineSlotView = {
  hour: number
  minute: number
  label: string
  note: string
  tone: RhythmTone
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

type TimelinePanelProps = {
  isKo: boolean
  intervalMinutes: 30 | 60
  onIntervalChange: (value: 30 | 60) => void
  onAiRefresh: () => void
  aiDisabled: boolean
  aiStatus: string
  aiButtonLabel: string
  aiStatusText: string
  hourlyRhythm: HourlyRhythmItem[]
  activeRhythmHour: number | null
  activeRhythmInfo: HourlyRhythmItem | null
  onRhythmSelect: (hour: number) => void
  timelineInsight: string
  timelineHighlights: string[]
  timelineSlots: TimelineSlotView[]
  formatWhyMetaLabel: (slot: TimelineSlotView) => string | null
  formatConfidenceNote: (reasons?: string[]) => string
  onSlotRef: (key: string, node: HTMLDivElement | null) => void
  onSlotClick: (hour: number) => void
}

export function CalendarActionPlanTimelinePanel({
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
  onSlotClick,
}: TimelinePanelProps) {
  return (
    <div className={`${styles.actionPlanCard} ${styles.actionPlanTimeline}`}>
      <div className={styles.actionPlanTimelineHeader}>
        <div>
          <span className={styles.actionPlanCardTitle}>
            {isKo ? '24시간 타임라인' : '24-Hour Timeline'}
          </span>
          <span className={styles.actionPlanCardFocus}>
            {intervalMinutes === 30
              ? isKo
                ? '30분 단위로 오늘의 리듬 정리'
                : '30-minute rhythm for today'
              : isKo
                ? '1시간 단위로 오늘의 리듬 정리'
                : 'Hourly rhythm for today'}
          </span>
        </div>
        <div className={styles.actionPlanTimelineMeta}>
          <div className={styles.actionPlanTimelineActions}>
            <div className={styles.actionPlanRange}>
              <button
                type="button"
                className={`${styles.actionPlanRangeBtn} ${intervalMinutes === 30 ? styles.actionPlanRangeBtnActive : ''}`}
                aria-pressed={intervalMinutes === 30}
                onClick={() => onIntervalChange(30)}
              >
                {isKo ? '30분' : '30m'}
              </button>
              <button
                type="button"
                className={`${styles.actionPlanRangeBtn} ${intervalMinutes === 60 ? styles.actionPlanRangeBtnActive : ''}`}
                aria-pressed={intervalMinutes === 60}
                onClick={() => onIntervalChange(60)}
              >
                {isKo ? '1시간' : '1h'}
              </button>
            </div>
            <button
              type="button"
              className={styles.actionPlanTimelineAiBtn}
              onClick={onAiRefresh}
              disabled={aiDisabled || aiStatus === 'loading'}
              aria-label={isKo ? '정밀 타임라인 생성' : 'Generate precision timeline'}
            >
              {aiButtonLabel}
            </button>
            {aiStatus === 'loading' && (
              <span className={styles.actionPlanTimelineSpinner} aria-hidden="true" />
            )}
            <span
              className={`${styles.actionPlanTimelineStatus} ${
                aiStatus === 'error' ? styles.actionPlanTimelineStatusError : ''
              }`}
            >
              {aiStatusText}
            </span>
          </div>
          <div className={styles.actionPlanTimelineLegend}>
            <span className={styles.actionPlanTimelineLegendItem}>
              <span
                className={`${styles.actionPlanTimelineDot} ${styles.actionPlanTimelineDotBest}`}
              />
              {isKo ? '좋은 시간' : 'Best'}
            </span>
            <span className={styles.actionPlanTimelineLegendItem}>
              <span
                className={`${styles.actionPlanTimelineDot} ${styles.actionPlanTimelineDotCaution}`}
              />
              {isKo ? '주의 시간' : 'Caution'}
            </span>
          </div>
        </div>
      </div>
      <div className={styles.actionPlanRhythmWrap}>
        <div className={styles.actionPlanRhythmHeader}>
          <span className={styles.actionPlanCardTitle}>
            {isKo ? '원형 하루 리듬' : 'Circular Day Rhythm'}
          </span>
          <span className={styles.actionPlanCardFocus}>
            {isKo ? '시간대를 누르면 아래 상세 슬롯으로 이동' : 'Tap an hour to jump to detailed slots'}
          </span>
        </div>
        <div
          className={styles.actionPlanRhythmRing}
          role="list"
          aria-label={isKo ? '하루 시간대 리듬' : 'Daily rhythm by hour'}
        >
          {hourlyRhythm.map((item) => {
            const angle = (item.hour / 24) * 360
            const isActive = activeRhythmHour === item.hour
            return (
              <button
                key={`rhythm-${item.hour}`}
                type="button"
                role="listitem"
                className={`${styles.actionPlanRhythmSector} ${
                  item.tone === 'best'
                    ? styles.actionPlanRhythmSectorBest
                    : item.tone === 'caution'
                      ? styles.actionPlanRhythmSectorCaution
                      : styles.actionPlanRhythmSectorNeutral
                } ${isActive ? styles.actionPlanRhythmSectorActive : ''}`}
                style={{
                  transform: `rotate(${angle}deg) translateY(calc(-1 * var(--action-plan-ring-radius))) rotate(${-angle}deg)`,
                }}
                aria-label={`${item.hour}:00`}
                onClick={() => onRhythmSelect(item.hour)}
              >
                {String(item.hour).padStart(2, '0')}
              </button>
            )
          })}
          <div className={styles.actionPlanRhythmCenter}>
            <div className={styles.actionPlanRhythmHour}>
              {activeRhythmHour !== null
                ? `${String(activeRhythmHour).padStart(2, '0')}:00`
                : isKo
                  ? '시간 선택'
                  : 'Select hour'}
            </div>
            <div className={styles.actionPlanRhythmNote}>
              {activeRhythmInfo?.note ||
                (isKo ? '원형에서 시간대를 선택하세요.' : 'Select an hour from the ring.')}
            </div>
          </div>
        </div>
      </div>
      <p className={styles.actionPlanInsightLine}>{timelineInsight}</p>
      <div className={styles.actionPlanTimelineHighlights}>
        {timelineHighlights.map((item) => (
          <span key={item} className={styles.actionPlanTimelineHighlightChip}>
            {item}
          </span>
        ))}
      </div>
      <div className={styles.actionPlanTimelineGrid} role="list">
        {timelineSlots.map((slot) => {
          const whyMetaLabel = formatWhyMetaLabel(slot)
          const isExpandedSlot = slot.tone !== 'neutral' || activeRhythmHour === slot.hour
          const hasDetailPanel = Boolean(
            isExpandedSlot &&
              (whyMetaLabel ||
                (slot.confidenceReason && slot.confidenceReason.length > 0) ||
                (slot.evidenceSummary && slot.evidenceSummary.length > 0))
          )

          return (
            <div
              key={`${slot.hour}-${slot.minute ?? 0}`}
              role="listitem"
              ref={(node) => {
                onSlotRef(`${slot.hour}-${slot.minute ?? 0}`, node)
              }}
              className={`${styles.actionPlanTimelineSlot} ${
                !isExpandedSlot ? styles.actionPlanTimelineSlotCompact : ''
              } ${
                slot.tone === 'best'
                  ? styles.actionPlanTimelineSlotBest
                  : slot.tone === 'caution'
                    ? styles.actionPlanTimelineSlotCaution
                    : ''
              } ${activeRhythmHour === slot.hour ? styles.actionPlanTimelineSlotLinked : ''}`}
              onClick={() => onSlotClick(slot.hour)}
            >
              <div className={styles.actionPlanTimelineTime}>
                <div className={styles.actionPlanTimelineTimeMain}>
                  <span className={styles.actionPlanTimelineClock}>{slot.label}</span>
                  <span className={styles.actionPlanTimelineTone}>
                    {slot.tone === 'best'
                      ? isKo
                        ? '집중'
                        : 'Focus'
                      : slot.tone === 'caution'
                        ? isKo
                          ? '주의'
                          : 'Caution'
                        : isKo
                          ? '기본'
                          : 'Base'}
                  </span>
                </div>
                {slot.badge && (
                  <span className={styles.actionPlanTimelineBadge}>{slot.badge}</span>
                )}
              </div>
              <div className={styles.actionPlanTimelineMetaRow}>
                {typeof slot.confidence === 'number' && isExpandedSlot && (
                  <div className={styles.actionPlanTimelineConfidence}>
                    {isKo ? '신뢰도' : 'Confidence'} {slot.confidence}%
                  </div>
                )}
                {slot.slotTypes && slot.slotTypes.length > 0 && (
                  <div className={styles.actionPlanTimelineSlotTypes}>
                    {slot.slotTypes.map((slotType) => (
                      <span
                        key={`${slot.label}-${slotType}`}
                        className={styles.actionPlanTimelineSlotTypeChip}
                      >
                        {slotType}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.actionPlanTimelineNote}>{slot.note}</div>
              {slot.whySummary && isExpandedSlot && (
                <div className={styles.actionPlanTimelineWhy}>
                  <span className={styles.actionPlanTimelineWhyLabel}>
                    {isKo ? '왜 이 시간대인가' : 'Why this slot'}
                  </span>
                  <span>{slot.whySummary}</span>
                </div>
              )}
              {slot.guardrail && isExpandedSlot && (
                <div className={styles.actionPlanTimelineGuardrail}>
                  <span className={styles.actionPlanTimelineGuardrailLabel}>
                    {isKo ? '안전장치' : 'Guardrail'}
                  </span>
                  <span>{slot.guardrail}</span>
                </div>
              )}
              {!isExpandedSlot && slot.evidenceSummary && slot.evidenceSummary.length > 0 && (
                <div className={styles.actionPlanTimelineCompactHint}>
                  {slot.evidenceSummary[0]}
                </div>
              )}
              {hasDetailPanel && (
                <details className={styles.actionPlanTimelineDetails}>
                  <summary className={styles.actionPlanTimelineDetailsSummary}>
                    {isKo ? '근거 보기' : 'Why this works'}
                  </summary>
                  <div className={styles.actionPlanTimelineDetailsBody}>
                    {whyMetaLabel && (
                      <div className={styles.actionPlanTimelineWhyMeta}>{whyMetaLabel}</div>
                    )}
                    {slot.confidenceReason && slot.confidenceReason.length > 0 && (
                      <div className={styles.actionPlanTimelineConfidenceReason}>
                        {formatConfidenceNote(slot.confidenceReason)}
                      </div>
                    )}
                    {slot.evidenceSummary && slot.evidenceSummary.length > 0 && (
                      <ul className={styles.actionPlanTimelineEvidenceList}>
                        {slot.evidenceSummary.map((line) => (
                          <li key={`${slot.hour}-${slot.minute}-${line}`}>{line}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
