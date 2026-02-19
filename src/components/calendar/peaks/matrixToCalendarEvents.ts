import type { DomainKey, DomainScore, MonthlyOverlapPoint } from '@/lib/destiny-matrix/types'

export type CalendarEvent = {
  id: string
  month: string
  startDate: string
  endDate: string
  title: string
  subtitle: string
  notes: string[]
  level: 'peak' | 'high'
  domain: DomainKey | 'global'
}

type MatrixSummaryLike = {
  domainScores?: Record<DomainKey, DomainScore>
  overlapTimeline?: MonthlyOverlapPoint[]
  overlapTimelineByDomain?: Record<DomainKey, MonthlyOverlapPoint[]>
  calendarSignals?: Array<{
    level: 'high' | 'medium' | 'caution'
    trigger: string
    score: number
  }>
  confidenceScore?: number
  drivers?: string[]
  cautions?: string[]
  alignmentScore?: number
  timeOverlapWeight?: number
}

type CandidateEvent = CalendarEvent & {
  priority: number
}

type EventLocale = 'ko' | 'en'

const DOMAIN_LABELS: Record<DomainKey, string> = {
  career: 'Career',
  love: 'Love',
  money: 'Money',
  health: 'Health',
  move: 'Move',
}

const DOMAIN_LABELS_KO: Record<DomainKey, string> = {
  career: '커리어',
  love: '연애',
  money: '재물',
  health: '건강',
  move: '이동',
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function clampTimeWeight(value: number): number {
  return Math.max(1, Math.min(1.3, value))
}

function toDateWindow(month: string): { startDate: string; endDate: string } {
  return {
    startDate: `${month}-01`,
    endDate: `${month}-07`,
  }
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0
  }
  return values.reduce((sum, n) => sum + n, 0) / values.length
}

function buildGlobalNotes(summary: MatrixSummaryLike, locale: EventLocale): string[] {
  const drivers = (summary.drivers || []).slice(0, 2)
  const cautions = (summary.cautions || []).slice(0, 1)
  const metrics =
    locale === 'ko'
      ? `정렬 ${(summary.alignmentScore ?? 0).toFixed(2)} (전체 조화도) / 타이밍 ${(summary.timeOverlapWeight ?? 1).toFixed(2)} (시기 상승값)`
      : `Align ${(summary.alignmentScore ?? 0).toFixed(2)} (overall harmony) / Time ${(summary.timeOverlapWeight ?? 1).toFixed(2)} (timing boost)`

  return [
    ...drivers,
    ...cautions.map((c) => (locale === 'ko' ? `주의: ${c}` : `Caution: ${c}`)),
    metrics,
  ]
}

function buildDomainNotes(score: DomainScore, locale: EventLocale): string[] {
  const drivers = (score.drivers || []).slice(0, 2)
  const caution = (score.cautions || [])[0]
  const metrics =
    locale === 'ko'
      ? `정렬 ${score.alignmentScore.toFixed(2)} (해당 영역 조화도) / 타이밍 ${score.timeOverlapWeight.toFixed(2)} (시기 상승값)`
      : `Align ${score.alignmentScore.toFixed(2)} (domain harmony) / Time ${score.timeOverlapWeight.toFixed(2)} (timing boost)`

  const notes = [...drivers]
  if (caution) {
    notes.push(locale === 'ko' ? `주의: ${caution}` : `Caution: ${caution}`)
  }
  notes.push(metrics)
  return notes
}

function getTopDomains(domainScores: Record<DomainKey, DomainScore> | undefined): DomainKey[] {
  if (!domainScores) {
    return []
  }

  const entries = Object.entries(domainScores) as Array<[DomainKey, DomainScore]>
  entries.sort((a, b) => {
    if (b[1].finalScoreAdjusted !== a[1].finalScoreAdjusted) {
      return b[1].finalScoreAdjusted - a[1].finalScoreAdjusted
    }
    if (b[1].alignmentScore !== a[1].alignmentScore) {
      return b[1].alignmentScore - a[1].alignmentScore
    }
    return a[0].localeCompare(b[0])
  })

  return entries.slice(0, 2).map(([domain]) => domain)
}

function deriveDomainTimeline(
  domain: DomainKey,
  summary: MatrixSummaryLike,
  globalTimelineMap: Map<string, MonthlyOverlapPoint>
): MonthlyOverlapPoint[] {
  const existing = summary.overlapTimelineByDomain?.[domain]
  if (existing && existing.length > 0) {
    return existing
  }

  const domainScore = summary.domainScores?.[domain]
  const finalAdjusted = domainScore?.finalScoreAdjusted ?? 5
  const domainIntensity = clamp01((finalAdjusted - 5) / 5)

  return Array.from(globalTimelineMap.values()).map((globalPoint) => {
    const overlapStrength = clamp01(globalPoint.overlapStrength * (0.7 + 0.6 * domainIntensity))
    const timeOverlapWeight = clampTimeWeight(1 + 0.3 * overlapStrength)
    return {
      month: globalPoint.month,
      overlapStrength,
      timeOverlapWeight,
      peakLevel: overlapStrength >= 0.75 ? 'peak' : overlapStrength >= 0.6 ? 'high' : 'normal',
    }
  })
}

function buildTimelineFromDomainTimelines(
  byDomain: Record<DomainKey, MonthlyOverlapPoint[]> | undefined
): MonthlyOverlapPoint[] {
  if (!byDomain) {
    return []
  }

  const monthMap = new Map<string, MonthlyOverlapPoint>()
  const domainLists = Object.values(byDomain)
  for (const list of domainLists) {
    for (const point of list || []) {
      const current = monthMap.get(point.month)
      if (!current) {
        monthMap.set(point.month, { ...point })
        continue
      }
      if (point.overlapStrength > current.overlapStrength) {
        monthMap.set(point.month, { ...point })
      }
    }
  }

  return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month))
}

export function matrixSummaryToCalendarEvents(
  summary: MatrixSummaryLike,
  startYearMonth?: string,
  locale: EventLocale = 'en'
): CalendarEvent[] {
  const timeline = (
    (summary.overlapTimeline && summary.overlapTimeline.length > 0
      ? summary.overlapTimeline
      : buildTimelineFromDomainTimelines(summary.overlapTimelineByDomain)) || []
  )
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month))
  if (timeline.length === 0) {
    return []
  }

  const confidenceScore = summary.confidenceScore ?? 0
  const lowConfidencePrefix = confidenceScore < 0.5 ? '(Explore) ' : ''

  const peakMonths = timeline.filter((point) => point.peakLevel === 'peak')
  const highMonths =
    confidenceScore >= 0.7
      ? timeline
          .filter((point) => point.peakLevel === 'high')
          .sort((a, b) => b.overlapStrength - a.overlapStrength || a.month.localeCompare(b.month))
          .slice(0, 2)
      : []

  const selectedMonthsMap = new Map<
    string,
    { month: string; level: 'peak' | 'high'; overlapStrength: number }
  >()

  for (const point of peakMonths) {
    selectedMonthsMap.set(point.month, {
      month: point.month,
      level: 'peak',
      overlapStrength: point.overlapStrength,
    })
  }

  for (const point of highMonths) {
    if (!selectedMonthsMap.has(point.month)) {
      selectedMonthsMap.set(point.month, {
        month: point.month,
        level: 'high',
        overlapStrength: point.overlapStrength,
      })
    }
  }

  if (selectedMonthsMap.size === 0) {
    const fallbackMonths = timeline
      .slice()
      .sort((a, b) => b.overlapStrength - a.overlapStrength || a.month.localeCompare(b.month))
      .slice(0, Math.min(3, timeline.length))

    for (const point of fallbackMonths) {
      selectedMonthsMap.set(point.month, {
        month: point.month,
        level: 'high',
        overlapStrength: point.overlapStrength,
      })
    }
  }

  const selectedMonths = Array.from(selectedMonthsMap.values()).sort((a, b) =>
    a.month.localeCompare(b.month)
  )
  const globalTimelineMap = new Map<string, MonthlyOverlapPoint>(timeline.map((p) => [p.month, p]))

  const topDomains = getTopDomains(summary.domainScores)
  const candidates: CandidateEvent[] = []

  for (const monthInfo of selectedMonths) {
    if (startYearMonth && monthInfo.month < startYearMonth) {
      continue
    }

    const window = toDateWindow(monthInfo.month)
    const globalNotes = buildGlobalNotes(summary, locale)
    const globalTitle =
      locale === 'ko'
        ? monthInfo.level === 'peak'
          ? '피크 집중 구간'
          : '고집중 구간'
        : monthInfo.level === 'peak'
          ? 'Peak Convergence Window'
          : 'High Convergence Window'

    candidates.push({
      id: `global-${monthInfo.month}-${monthInfo.level}`,
      month: monthInfo.month,
      startDate: window.startDate,
      endDate: window.endDate,
      title: `${lowConfidencePrefix}${globalTitle}`,
      subtitle: `${monthInfo.month} | ${window.startDate} - ${window.endDate}`,
      notes: globalNotes,
      level: monthInfo.level,
      domain: 'global',
      priority: monthInfo.level === 'peak' ? 0 : 3,
    })

    topDomains.forEach((domain, domainRank) => {
      const domainTimeline = deriveDomainTimeline(domain, summary, globalTimelineMap)
      const domainPoint = domainTimeline.find((point) => point.month === monthInfo.month)
      if (!domainPoint || domainPoint.peakLevel !== 'peak') {
        return
      }

      const domainScore = summary.domainScores?.[domain]
      if (!domainScore) {
        return
      }

      const notes = buildDomainNotes(
        {
          ...domainScore,
          overlapStrength: clamp01(
            average([domainScore.overlapStrength, domainPoint.overlapStrength])
          ),
          timeOverlapWeight: clampTimeWeight(
            average([domainScore.timeOverlapWeight, domainPoint.timeOverlapWeight])
          ),
        },
        locale
      )

      const domainLabel = locale === 'ko' ? DOMAIN_LABELS_KO[domain] : DOMAIN_LABELS[domain]

      candidates.push({
        id: `${domain}-${monthInfo.month}`,
        month: monthInfo.month,
        startDate: window.startDate,
        endDate: window.endDate,
        title: `${lowConfidencePrefix}${
          locale === 'ko' ? `${domainLabel} 피크 구간` : `Peak ${domainLabel} Window`
        }`,
        subtitle: `${monthInfo.month} | ${window.startDate} - ${window.endDate}`,
        notes,
        level: 'peak',
        domain,
        priority: 1 + domainRank,
      })
    })
  }

  candidates.sort((a, b) => {
    if (a.month !== b.month) {
      return a.month.localeCompare(b.month)
    }
    if (a.priority !== b.priority) {
      return a.priority - b.priority
    }
    return a.title.localeCompare(b.title)
  })

  const capped: CalendarEvent[] = []
  const perMonthCount = new Map<string, number>()

  for (const candidate of candidates) {
    if (capped.length >= 18) {
      break
    }

    const monthCount = perMonthCount.get(candidate.month) ?? 0
    if (monthCount >= 2) {
      continue
    }

    perMonthCount.set(candidate.month, monthCount + 1)
    const { priority: _priority, ...event } = candidate
    capped.push(event)
  }

  return capped
}
