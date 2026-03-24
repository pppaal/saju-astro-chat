import type { ImportantDate } from './types'

type TimelineTone = 'neutral' | 'best' | 'caution'

type TimelineSlotLike = {
  hour: number
  minute: number
  label: string
  tone: TimelineTone
  confidence?: number | null
  note?: string
}

type ActionPlanInsights = {
  ifThenRules: string[]
  situationTriggers: string[]
  actionFramework: {
    do: string[]
    dont: string[]
    alternative: string[]
  }
  riskTriggers: string[]
  successKpi: string[]
  deltaToday: string
}

type HourlyRhythmItem = {
  hour: number
  tone: TimelineTone
  note: string
}

export function buildTimelineHighlights(input: {
  isKo: boolean
  timelineSlots: TimelineSlotLike[]
  clampConfidence: (value: number) => number
}): string[] {
  const { isKo, timelineSlots, clampConfidence } = input
  const bestCount = timelineSlots.filter((slot) => slot.tone === 'best').length
  const cautionCount = timelineSlots.filter((slot) => slot.tone === 'caution').length
  const avgConfidence =
    timelineSlots.length > 0
      ? clampConfidence(
          timelineSlots.reduce((sum, slot) => sum + (slot.confidence ?? 60), 0) /
            timelineSlots.length
        )
      : 60
  const leadBest = timelineSlots.find((slot) => slot.tone === 'best')
  const leadCaution = timelineSlots.find((slot) => slot.tone === 'caution')

  return [
    isKo ? `핵심 슬롯 ${bestCount}개` : `${bestCount} core slots`,
    isKo ? `주의 슬롯 ${cautionCount}개` : `${cautionCount} caution slots`,
    isKo ? `평균 신뢰도 ${avgConfidence}%` : `Avg confidence ${avgConfidence}%`,
    leadBest
      ? isKo
        ? `첫 실행 ${leadBest.label}`
        : `First push ${leadBest.label}`
      : leadCaution
        ? isKo
          ? `속도 조절 ${leadCaution.label}`
          : `Pace at ${leadCaution.label}`
        : isKo
          ? '기본 리듬 유지'
          : 'Keep a steady rhythm',
  ]
}

export function buildHourlyRhythm(input: {
  timelineSlots: TimelineSlotLike[]
  cleanText: (value: string) => string
}): HourlyRhythmItem[] {
  const { timelineSlots, cleanText } = input
  return Array.from({ length: 24 }, (_, hour) => {
    const hourSlots = timelineSlots.filter((slot) => slot.hour === hour)
    let tone: TimelineTone = 'neutral'

    if (hourSlots.some((slot) => slot.tone === 'caution')) {
      tone = 'caution'
    } else if (hourSlots.some((slot) => slot.tone === 'best')) {
      tone = 'best'
    }

    const primarySlot =
      hourSlots.find((slot) => slot.tone === tone && slot.note) ||
      hourSlots.find((slot) => slot.note) ||
      hourSlots[0]

    return {
      hour,
      tone,
      note: cleanText(primarySlot?.note || ''),
    }
  })
}

export function getPreferredRhythmHour(timelineSlots: TimelineSlotLike[]): number {
  return (
    timelineSlots.find((slot) => slot.tone === 'best')?.hour ??
    timelineSlots.find((slot) => slot.tone === 'neutral')?.hour ??
    9
  )
}

export function findPreferredRhythmSlot(input: {
  timelineSlots: TimelineSlotLike[]
  hour: number
}): TimelineSlotLike | undefined {
  const { timelineSlots, hour } = input
  return (
    timelineSlots.find((slot) => slot.hour === hour && slot.tone === 'best') ||
    timelineSlots.find((slot) => slot.hour === hour && slot.tone === 'neutral') ||
    timelineSlots.find((slot) => slot.hour === hour)
  )
}

export function buildFallbackActionPlanInsights(input: {
  aiInsights: ActionPlanInsights | null
  isKo: boolean
  timelineSlots: TimelineSlotLike[]
  todayItems: string[]
  warnings?: string[]
  clampConfidence: (value: number) => number
}): ActionPlanInsights {
  const { aiInsights, isKo, timelineSlots, todayItems, warnings, clampConfidence } = input
  if (aiInsights) {
    return aiInsights
  }

  const bestSlot = timelineSlots.find((slot) => slot.tone === 'best')
  const cautionSlot = timelineSlots.find((slot) => slot.tone === 'caution')
  const cautionCount = timelineSlots.filter((slot) => slot.tone === 'caution').length
  const avgConfidence =
    timelineSlots.length > 0
      ? clampConfidence(
          timelineSlots.reduce((sum, slot) => sum + (slot.confidence ?? 60), 0) /
            timelineSlots.length
        )
      : 60
  const formatSlot = (slot?: TimelineSlotLike) =>
    slot ? `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}` : '-'

  return {
    ifThenRules: [
      bestSlot
        ? isKo
          ? `IF ${formatSlot(bestSlot)} 시작 THEN 25분 내 초안 1개 저장`
          : `IF start at ${formatSlot(bestSlot)} THEN save one draft within 25 minutes.`
        : isKo
          ? 'IF 시작 지연 THEN 우선순위 1개만 먼저 실행'
          : 'IF start is delayed THEN execute one top priority first.',
      cautionSlot
        ? isKo
          ? `IF ${formatSlot(cautionSlot)} 결정 요청 THEN 10분 유예 + 체크리스트 3항목 확인`
          : `IF decision requested at ${formatSlot(cautionSlot)} THEN delay 10m + validate 3 checklist items.`
        : isKo
          ? 'IF 피로 누적 THEN 큰 결정 보류'
          : 'IF fatigue accumulates THEN hold major decisions.',
    ],
    situationTriggers: [
      isKo
        ? '피로 7/10 이상: 신규 결정 중단, 20분 회복'
        : 'Fatigue >= 7/10: pause new decisions and recover for 20m',
      isKo
        ? '10분 내 요청 3건 이상: 즉답 금지, 우선순위 재정렬'
        : '3+ requests within 10m: no instant replies, reprioritize first',
      isKo
        ? '지출 유혹 발생: 총액·한도·대안 확인 전 집행 금지'
        : 'Spending urge: do not execute before amount-limit-alternative check',
    ],
    actionFramework: {
      do: todayItems.slice(0, 3),
      dont: [
        ...(warnings?.slice(0, 2) || []),
        isKo ? '근거 없는 즉흥 결정 금지' : 'No impulsive decision without evidence',
      ].slice(0, 3),
      alternative: [
        isKo ? '주의 슬롯: 결정보다 초안/검증 작업' : 'Caution slot: draft/validation instead of decisions',
        isKo ? '집중 슬롯: 핵심 1건 완료 후 로그' : 'Best slot: finish one key task and log outcome',
      ],
    },
    riskTriggers: [
      cautionCount > 0
        ? isKo
          ? `주의 슬롯 ${cautionCount}개: 확정 결정보다 검증 우선`
          : `${cautionCount} caution slots: validate before finalizing`
        : isKo
          ? '주의 슬롯이 적어도 피로 신호 우선 점검'
          : 'Even with fewer caution slots, check fatigue signal first',
      isKo
        ? '응답 지연 + 기준 불명확 + 멀티태스킹 동시 발생: 즉시 속도 조절'
        : 'Delay + unclear criteria + multitasking together: reduce pace immediately',
    ],
    successKpi: [
      isKo
        ? `평균 슬롯 신뢰도 ${avgConfidence}% 이상`
        : `Average slot confidence >= ${avgConfidence}%`,
      isKo ? '핵심 액션 2건 이상 완료' : 'Complete at least 2 core actions',
      isKo ? '주의 슬롯 확정 결정 0건' : 'Zero final decisions in caution slots',
    ],
    deltaToday:
      cautionCount > 1
        ? isKo
          ? '오늘은 신규 확정보다 리스크 제거가 우선입니다.'
          : 'Today prioritizes risk removal over new commitments.'
        : isKo
          ? '오늘은 속도는 좋고, 검증 규칙을 붙이면 성과가 커집니다.'
          : 'Momentum is good today; stricter validation improves outcomes.',
  }
}

export function buildWeekItems(input: {
  isKo: boolean
  bestDayLabels: string[]
  cautionDayLabels: string[]
  weekRangeLabel: string
  goalLabel: string
  weekAction?: string | null
  bestRecommendation?: string | null
  fallbackItems: string[]
  cleanText: (value: string) => string
}): string[] {
  const {
    isKo,
    bestDayLabels,
    cautionDayLabels,
    weekRangeLabel,
    goalLabel,
    weekAction,
    bestRecommendation,
    fallbackItems,
    cleanText,
  } = input
  const items: string[] = []

  const pushItem = (item: string | null | undefined) => {
    if (!item) return
    if (!items.includes(item)) {
      items.push(item)
    }
  }

  if (bestDayLabels.length > 0) {
    const labels = bestDayLabels.join(', ')
    pushItem(isKo ? `중요 일정은 ${labels}에 배치` : `Schedule key tasks on ${labels}`)
  }

  pushItem(
    isKo
      ? `${weekRangeLabel} ${goalLabel} 중심 목표 1개 설정`
      : `Focus on one ${goalLabel} goal ${weekRangeLabel}`
  )
  pushItem(weekAction)
  pushItem(bestRecommendation)

  if (cautionDayLabels.length > 0) {
    const labels = cautionDayLabels.join(', ')
    pushItem(isKo ? `검토/조정일: ${labels}` : `Review/adjust days: ${labels}`)
    pushItem(isKo ? '위험한 일은 실행 우선일로 이동' : 'Move risky tasks to execute-first days')
  }

  let fallbackIndex = 0
  while (items.length < 4 && fallbackIndex < fallbackItems.length) {
    pushItem(fallbackItems[fallbackIndex])
    fallbackIndex += 1
  }

  return items
    .slice(0, 4)
    .map((item) => cleanText(item))
    .filter(Boolean)
}

export function buildTimelineInsight(input: {
  isKo: boolean
  peakText: string
  hasWarnings: boolean
  precisionText?: string | null
}): string {
  const { isKo, peakText, hasWarnings, precisionText } = input
  const cautionText = hasWarnings
    ? isKo
      ? '주의 슬롯 포함'
      : 'Caution slots included'
    : isKo
      ? '주의 슬롯 없음'
      : 'No caution slots'

  return isKo
    ? `${peakText} 기준 타임라인 · ${cautionText}${precisionText ? ` · ${precisionText}` : ''}`
    : `${peakText} timeline · ${cautionText}${precisionText ? ` · ${precisionText}` : ''}`
}

export function buildTodayInsight(input: { isKo: boolean; evidenceLines: string[] }): string {
  const { isKo, evidenceLines } = input
  if (evidenceLines[0]) {
    return evidenceLines[0]
  }
  return isKo
    ? '교차 신호를 바탕으로 오늘 실행 우선순위를 압축했습니다.'
    : 'Today priorities are compressed from cross-signals.'
}

export function buildWeekInsight(input: {
  isKo: boolean
  bestCount: number
  cautionCount: number
  focusLabel: string
}): string {
  const { isKo, bestCount, cautionCount, focusLabel } = input
  return isKo
    ? `실행/활용일 ${bestCount}회 · 검토/조정일 ${cautionCount}회 · ${focusLabel} 중심 배치`
    : `${bestCount} execute/leverage slots · ${cautionCount} review/adjust slots · ${focusLabel} focus`
}

export function buildActionPlanShareText(input: {
  isKo: boolean
  baseDate: Date
  formatDateLabel: (date: Date) => string
  bestDays: Array<{ date: Date; info: ImportantDate }>
  cautionDays: Array<{ date: Date; info: ImportantDate }>
  todayItems: string[]
  todayTiming: string | null
  todayCaution: string | null
  weekTitle: string
  weekItems: string[]
  topCategoryLabel: string | null
}): string {
  const {
    isKo,
    baseDate,
    formatDateLabel,
    bestDays,
    cautionDays,
    todayItems,
    todayTiming,
    todayCaution,
    weekTitle,
    weekItems,
    topCategoryLabel,
  } = input

  const lines: string[] = []
  lines.push(isKo ? `행동 플랜 (${formatDateLabel(baseDate)})` : `Action Plan (${formatDateLabel(baseDate)})`)
  if (bestDays.length > 0) {
    lines.push(
      `${isKo ? '실행/활용일' : 'Execute/Leverage days'}: ${bestDays
        .map((chip) => formatDateLabel(chip.date))
        .join(', ')}`
    )
  }
  if (cautionDays.length > 0) {
    lines.push(
      `${isKo ? '검토/조정일' : 'Review/Adjust days'}: ${cautionDays
        .map((chip) => formatDateLabel(chip.date))
        .join(', ')}`
    )
  }
  lines.push(isKo ? '오늘 체크리스트' : 'Today Checklist')
  todayItems.forEach((item) => lines.push(`- ${item}`))
  if (todayTiming) {
    lines.push(isKo ? `추천 시간: ${todayTiming}` : `Best timing: ${todayTiming}`)
  }
  if (todayCaution) {
    lines.push(isKo ? `주의: ${todayCaution}` : `Caution: ${todayCaution}`)
  }
  lines.push(weekTitle)
  weekItems.forEach((item) => lines.push(`- ${item}`))
  if (topCategoryLabel) {
    lines.push(isKo ? `주간 포커스: ${topCategoryLabel}` : `Weekly focus: ${topCategoryLabel}`)
  }
  return lines.join('\n')
}
